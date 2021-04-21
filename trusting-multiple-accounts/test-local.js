const Web3 = require("web3");
const Fs = require("fs");
const Hub = require('circles-contracts/build/contracts/Hub.json');
const Safe = require('@circles/safe-contracts/build/contracts/GnosisSafe.json');

const Config = require('./config.json');
const keys = require('./keys.json');
const SafeUtils = require("./utils/safes.js");



const provider = new Web3.providers.HttpProvider(Config.ETHEREUM_NODE_RPC_URL);
const web3 = new Web3(provider);
const private_keys = keys.private_keys;

console.log({private_keys});

hubContract = new web3.eth.Contract(Hub.abi, process.env.HUB_ADDRESS);


async function runScript(){

    // Get the organization owner's account from a private key
    const orgOwnerPrivateKey = Fs.readFileSync(Config.ORG_SAFE_OWNER_PRIVATE_KEY_PATH).toString();
    const orgOwnerAccount = web3.eth.accounts.privateKeyToAccount(orgOwnerPrivateKey);

    // Get the Hub
    const hubContract = new web3.eth.Contract(Hub.abi, Config.HUB_ADDR);

    try {
      // Check that the Gnosis Safe address has signedup as an organization in the Hub
      const isOrgSignedup = await hubContract.methods.organizations(Config.ORG_SAFE_ADDR).call();
      console.log("Check Safe is org: ", isOrgSignedup);
      
      // Check the owner of the Gnosis Safe
      // Get Safe at given address
      const orgSafe = new web3.eth.Contract(Safe.abi, Config.ORG_SAFE_ADDR);
      // Call 'getOwners' method and return list of owners
      const owners = await orgSafe.methods.getOwners().call();
      console.log({owners});
      const isOwner = await orgSafe.methods.isOwner(orgOwnerAccount.address).call();
      console.log("Is owner of the Org: ", isOwner);

      try {
        // read contents of the file with the Safe addresses to be trusted
        const accountsToTrust = Fs.readFileSync(Config.USR_SAFE_ADDRS_PATH,'UTF-8').split(/\r?\n/);

        // Make sure the transactions are not executed in paralel.
        // We need need to wait for the tx to succed for getting a new nonce.
        for (let userAddr of accountsToTrust) {
          if(!userAddr){
            continue;
          }
          console.log("Trusting the user address: ", userAddr);

          // Trust from the organization Gnosis Safe
          await SafeUtils.trustAccount(
            hubContract,
            orgOwnerAccount, // web3 account, owner of the organization Safe
            orgSafe, // the Safe of the Org
            userAddr, // the address of the Safe account to be trusted
            );
          // TODO: Verify the trust connection
        }
      } catch (err) {
          console.error(err);
      }
    } catch (err) {
        console.error(err);
    }
}

runScript();
