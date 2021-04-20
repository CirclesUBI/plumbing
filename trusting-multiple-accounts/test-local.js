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
          accountsToTrust.forEach(async (userAddr) => {
            if (userAddr.length > 3) {
              console.log(userAddr);
              // Trust from the organization Gnosis Safe
              // Get Safe at given address
              const userSafe = new web3.eth.Contract(Safe.abi, userAddr);
              //console.log({orgSafe});
              console.log("orgOwnerAccount.privateKey: ", orgOwnerAccount.privateKey);
              await SafeUtils.trustAccount(
                hubContract,
                orgOwnerAccount, // owner of the org 
                orgSafe, // the Safe of the Org
                userSafe, // the Safe account to be trusted
                );
            }
              
          });
      } catch (err) {
          console.error(err);
      }
    } catch (err) {
        console.error(err);
    }
}

runScript();

