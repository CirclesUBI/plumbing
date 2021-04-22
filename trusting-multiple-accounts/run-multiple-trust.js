const Web3 = require("web3");
const Fs = require("fs");
const Hub = require('circles-contracts/build/contracts/Hub.json');
const Safe = require('@circles/safe-contracts/build/contracts/GnosisSafe.json');

const Config = require('./config.json');
const keys = require('./keys.json');
const SafeUtils = require("./utils/safes.js");


const provider = new Web3.providers.HttpProvider(Config.ETHEREUM_NODE_RPC_URL);
const web3 = new Web3(provider);

hubContract = new web3.eth.Contract(Hub.abi, process.env.HUB_ADDRESS);


async function runScript(){

    // Get the organization owner's account from a private key
    const orgOwnerPrivateKey = Fs.readFileSync(Config.ORG_SAFE_OWNER_PRIVATE_KEY_PATH).toString().split(/\r?\n/)[0];
    const orgOwnerAccount = web3.eth.accounts.privateKeyToAccount(orgOwnerPrivateKey);

    // Get the Hub
    const hubContract = new web3.eth.Contract(Hub.abi, Config.HUB_ADDR);

    let totalAccounts = 0;
    let totalTrustedAccounts = 0;

    try {
      // Check that the Gnosis Safe address has signedup as an organization in the Hub
      const isOrgSignedup = await hubContract.methods.organizations(Config.ORG_SAFE_ADDR).call();
      console.log("Check Safe", Config.ORG_SAFE_ADDR, "is an organization: ", isOrgSignedup);
      
      // Check the owner of the Gnosis Safe
      // Get Safe at given address
      const orgSafe = new web3.eth.Contract(Safe.abi, Config.ORG_SAFE_ADDR);
      // Call 'getOwners' method and return list of owners
      const owners = await orgSafe.methods.getOwners().call();
      console.log("Owners of the organization:", owners);
      const isOwner = await orgSafe.methods.isOwner(orgOwnerAccount.address).call();
      console.log("Is", orgOwnerAccount.address, "owner of the Org: ", isOwner);

      try {
        // read contents of the file with the Safe addresses to be trusted
        const accountsToTrust = Fs.readFileSync(Config.USR_SAFE_ADDRS_PATH,'UTF-8').split(/\r?\n/);

        // Make sure the transactions are not executed in paralel.
        // We need need to wait for the tx to succed for getting a new nonce.
        for (let userAddr of accountsToTrust) {
          if(!userAddr.startsWith("0x")){
            continue;
          }

          // Count the number of accounts we receive in the input
          totalAccounts++;

          // Trust from the organization Gnosis Safe
          const status = await SafeUtils.trustAccount(
            hubContract,
            orgOwnerAccount, // web3 account, owner of the organization Safe
            orgSafe, // the Safe of the Org
            userAddr, // the address of the Safe account to be trusted
            );
          // Verify the trust connection
          console.log("Trusting the user ", userAddr, "- Transaction was successful:", status);

          // Counting the successful transactions
          if(status){
            totalTrustedAccounts++;
          }

        }
      } catch (err) {
          console.error(err);
      }
    } catch (err) {
        console.error(err);
    }

    // Print reports
    console.log("Total accounts received as input:", totalAccounts);
    console.log("Total accounts successfully trusted:", totalTrustedAccounts);

}

module.exports = {
  runScript
};