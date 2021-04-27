const Web3 = require("web3");
const Fs = require("fs");
const Hub = require('circles-contracts/build/contracts/Hub.json');
const Safe = require('@circles/safe-contracts/build/contracts/GnosisSafe.json');
const ProxyFactory = require('@circles/safe-contracts/build/contracts/ProxyFactory.json');
const Config = require('./config.json');

async function runScript(environment){
  
  const createSafeWithProxy = environment == "prod"
  ? require('./utils/createSafeWithProxy'): null;
  
  const SafeUtils =
  environment == "prod"
  ? require("./utils/safes-xdai.js")
  : require("./utils/safes-local.js");

  const provider =
    environment == "prod"
    ? new Web3.providers.WebsocketProvider(Config.ETHEREUM_NODE_WS)
    : new Web3.providers.HttpProvider(Config.ETHEREUM_NODE_RPC_URL);

  const web3 = new Web3(provider);

  // Get the organization owner's account from a private key
  const orgOwnerPrivateKey = Config.SAFE_OWNER_PRIVATE_KEY || Fs.readFileSync(Config.ORG_SAFE_OWNER_PRIVATE_KEY_PATH).toString().split(/\r?\n/)[0];
  const orgOwnerAccount = web3.eth.accounts.privateKeyToAccount(orgOwnerPrivateKey);

  // Get the Hub
  const hubContract = new web3.eth.Contract(Hub.abi, Config.HUB_ADDR);

  let totalAccounts = 0;
  let newTrustedAccounts = 0;
  let alreadyTrustedAccounts = 0;
  let orgSafe;

  // create a safe, if we haven't already
  if (!Config.ORG_SAFE_ADDR) {
    try {
      console.log('Creating safe ...');
      const safe = new web3.eth.Contract(Safe.abi, Config.SAFE_MASTER_COPY);
      const proxy = new web3.eth.Contract(ProxyFactory.abi, Config.PROXY_FACTORY);
      orgSafe = await createSafeWithProxy(proxy, safe, orgOwnerAccount)
      console.log('Created safe at: ', orgSafe.options.address);
    } catch (err) {
      console.error(err);
    }
  } else {
    orgSafe = new web3.eth.Contract(Safe.abi, Config.ORG_SAFE_ADDR);
  }

  // Check that the Gnosis Safe address has signedup as an organization in the Hub
  const isOrgSignedup = await hubContract.methods.organizations(Config.ORG_SAFE_ADDR).call();
  console.log("Check Safe", Config.ORG_SAFE_ADDR, "is an organization: ", isOrgSignedup);

  if (!isOrgSignedup) {
    console.log('Signing up as organization ...');
    await SafeUtils.orgSignup(orgOwnerAccount, orgSafe, hubContract);
  }

  try {
    // Check the owner of the Gnosis Safe
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

        // Check whether the trust connection already existed
        const alreadyTrusted = await hubContract.methods.limits(orgSafe.options.address , userAddr).call() == 0 ? false : true;
        if (!alreadyTrusted){
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
            newTrustedAccounts++;
          }
        }else{
          alreadyTrustedAccounts++;
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
  console.log("Total accounts already trusted:", alreadyTrustedAccounts);
  console.log("Total new accounts successfully trusted:", newTrustedAccounts);
}

module.exports = {
  runScript
};