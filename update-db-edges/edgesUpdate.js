const Web3 = require('web3');
const HubContract = require('@circles/circles-contracts/build/contracts/Hub.json');
const TokenContract = require('@circles/circles-contracts/build/contracts/Token.json');
const { getTokenAddressFromGraph } = require('./graph.js')
const { upsertEdge, destroyEdge, getOldestEdges, getUserEdges } = require('./edgesDatabase.js');
const config = require('./config.json');

const day = 1000 * 60 * 60 * 24;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const web3 = new Web3(
    new Web3.providers.WebsocketProvider(config.ETHEREUM_NODE_WS),
);


const hubContract = new web3.eth.Contract(
    HubContract.abi,
    config.HUB_ADDRESS,
);


function minNumberString(a, b) {
    // Which one is shorter?
    if (a.length < b.length) {
        return a;
    } else if (b.length < a.length) {
        return b;
    }

    // It does not matter, its the same string:
    if (a === b) {
        return a;
    }

    // If they have the same length, we can actually do this:
    return a < b ? a : b;
};


const getKey = (from, to, token) => {
    return [from, to, token].join('');
};


class EdgeUpdateManager {
    constructor() {
        this.checkedEdges = {};
    }

    checkDuplicate(edge) {
        const key = getKey(edge.from, edge.to, edge.token);
        if (key in this.checkedEdges) {
            return true;
        }
        this.checkedEdges[key] = true;
        return false;
    }

    async updateEdge(edge, tokenAddress) {
        // Don't store edges from relayer
        if (edge.from === config.TX_SENDER_ADDRESS_OLD || edge.from === config.TX_SENDER_ADDRESS_NEW) {
            console.log("****Don't store edges from relayer");
            await destroyEdge(edge);
            return;
        }

        // Don't store edges to or from zero address
        if (edge.to === ZERO_ADDRESS || edge.from === ZERO_ADDRESS) {
            console.log("****Don't store edges to or from zero address");
            await destroyEdge(edge);
            return;
        }

        // Ignore self-referential edges
        if (edge.from === edge.to) {
            console.log("****Ignore self-referential edges");
            await destroyEdge(edge);
            return;
        }

        // Ignore duplicates
        if (this.checkDuplicate(edge)) {
            console.log("****Ignore duplicates");
            return;
        }

        // Update edge capacity
        try {
            console.log({ edge });
            // Get send limit
            const limit = await hubContract.methods
                .checkSendLimit(edge.token, edge.from, edge.to)
                .call();
            // Get Token balance
            const tokenContract = new web3.eth.Contract(
                TokenContract.abi,
                tokenAddress,
            );
            const balance = await tokenContract.methods.balanceOf(edge.from).call();

            // Update edge capacity
            edge.capacity = minNumberString(limit, balance);
            console.log("edge.capacity: ", edge.capacity);
            await upsertEdge({
                from: edge.from,
                to: edge.to,
                token: edge.token,
                capacity: edge.capacity
            });
        } catch (error) {
            console.log(
                `Found error with checking sending limit for token of ${edge.token} from ${edge.from} to ${edge.to} [${error}]`
            );
        }
    }
}

// Helper method to wait for a few milliseconds before we move on
async function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function updateEdges(edges) {
    const edgeUpdateManager = new EdgeUpdateManager();
    for await (const edge of edges) {
        const tokenAddress = await hubContract.methods.userToToken(edge.token).call();
        console.log("Token address: ", tokenAddress, "edge token: ", edge.token);
        //const result = await getTokenAddressFromGraph(edge.token.toLocaleLowerCase())
        //const tokenAddress = web3.utils.toChecksumAddress(result[0].id)
        await edgeUpdateManager.updateEdge(
            {
                ...edge,
            },
            tokenAddress
        );
        await wait(123);
    }
}


async function updateAllEdges(address = "") {
    // Retrieve all the edges from the db in batches
    // This function iterates over all the edges sorted by updatedAt
    // The stop condition of the loop is when the last updated edge
    // is updated in the present date (same day as today)
    const limit = 10000
    let isOld = true
    let count = 0
    while (isOld) {
        // Here you can choose between updating all the edges or only the edge of one specific user
        const action = !!address ? getUserEdges : getOldestEdges;
        const edges = await action(limit, address); // Example of Safe address
        console.log("Edges.length: ", edges.length);
        console.log("updatedAt of oldest: ", edges[0].updatedAt);
        await updateEdges(edges);
        count++
        const date1 = edges[0].updatedAt;
        const date2 = new Date(Date.now());
        const date1utc = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate());
        const date2utc = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate());
        const difference = (date2utc - date1utc) / day;
        isOld = difference > 0
    }
}

module.exports = {
    updateAllEdges,
}
