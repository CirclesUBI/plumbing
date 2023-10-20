const pg = require('pg')
const fs = require('fs');
const { Web3 } = require('web3');
// const Safe = require('@circles/safe-contracts/build/contracts/GnosisSafe.json');
const Safe = require('@gnosis.pm/safe-contracts/build/artifacts/contracts/GnosisSafeL2.sol/GnosisSafeL2.json');
const Hub = require('@circles/circles-contracts/build/contracts/Hub.json');

const config = require('./config.json');

const ETHEREUM_NODE_WS = 'wss://rpc.gnosischain.com/wss';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

async function runScript() {
    // Get safe addresses from relayer db
    const pool = new pg.Pool({
        connectionString: config.DB_CONNECTION,
        ssl: {
            require: true,
            rejectUnauthorized: false,
          },
    });
    await pool.connect();
    const result = await pool.query('SELECT safe_id FROM relay_safecreation2 where tx_hash is not null');
    const rows = result.rows;
    pool.end()

    const web3 = new Web3(ETHEREUM_NODE_WS);
    // Get the Hub
    const hubContract = new web3.eth.Contract(Hub.abi, config.HUB_ADDR);

    // Check that each safe is deployed
    let deployedIndividualWallets = 0;
    let deployedSharedWallets = 0;
    console.log(`Rows: ${rows.length}`);

    await Promise.all(rows.map(async (item) => {
        if (await hubContract.methods.organizations(item.safe_id).call()) {
            ++deployedSharedWallets;
        } else {
            const tokenAddress = await hubContract.methods.userToToken(item.safe_id).call()
            if (tokenAddress != ZERO_ADDRESS) {
                ++deployedIndividualWallets;
            }
        }
    }));
    console.log(`Deployed individual wallets through garden: ${deployedIndividualWallets}`);
    console.log(`Deployed shared wallets through garden: ${deployedSharedWallets}`);
    process.exit(0);
}

runScript();
