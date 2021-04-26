const Web3 = require("web3");
const Fs = require("fs");
const Safe = require('@circles/safe-contracts/build/contracts/GnosisSafe.json');
const Hub = require('circles-contracts/build/contracts/Hub.json');
const SafeUtils = require("./utils/safes-xdai.js");
const Config = require('./config.json');

const provider = new Web3.providers.WebsocketProvider(Config.ETHEREUM_NODE_WS);
const web3 = new Web3(provider);


async function run(){
    // Get the organization owner's account from a private key
    const orgOwnerPrivateKey = Fs.readFileSync(Config.ORG_SAFE_OWNER_PRIVATE_KEY_PATH).toString().split(/\r?\n/)[0];
    const orgOwnerAccount = web3.eth.accounts.privateKeyToAccount(orgOwnerPrivateKey);

    // Get the Hub
    const hubContract = new web3.eth.Contract(Hub.abi, Config.HUB_ADDR);
    
    try {
        // Check that the Gnosis Safe address has signedup as an organization in the Hub
        const isOrgSignedup = await hubContract.methods.organizations(Config.ORG_SAFE_ADDR).call();
        console.log("Check Safe", Config.ORG_SAFE_ADDR, "is an organization: ", isOrgSignedup);

        // Check the owner of the Gnosis Safe
        // Get Safe at given address        
        const orgSafe = new web3.eth.Contract(Safe.abi, Config.ORG_SAFE_ADDR);
        // Call 'getOwners' method and return list of owners
        const owners = await orgSafe.methods.getOwners().call();
        console.log("Owners of the Safe:", owners);
        const isOwner = await orgSafe.methods.isOwner(orgOwnerAccount.address).call();
        console.log("Is", orgOwnerAccount.address, "owner of the Safe: ", isOwner);

        // Log the version of the Safes lib we are using
        const version = await orgSafe.methods.VERSION().call();
        console.log({version});
        // Organization signup
        await SafeUtils.orgSignup(orgOwnerAccount, orgSafe, hubContract);
        // // Check that the org has signedup as an organization
        const isOrgSignedup2 = await hub.methods.organizations(Config.ORG_SAFE_ADDR).call();
        console.log("The org has been signed up as an ORG: ", isOrgSignedup2);

    } catch (err) {
        console.error(err);
    }
}

run();