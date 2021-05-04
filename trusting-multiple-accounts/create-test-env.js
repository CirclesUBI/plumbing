const Web3 = require('web3');
const fs = require('fs');
const Hub = require('circles-contracts/build/contracts/Hub.json');

const config = require('./config.json');
const keys = require('./keys.json');
const safeUtils = require('./utils/safes-local.js');

const provider = new Web3.providers.HttpProvider(config.ETHEREUM_NODE_RPC_URL);
const web3 = new Web3(provider);
const private_keys = keys.private_keys;

console.log({private_keys});

hubContract = new web3.eth.Contract(Hub.abi, process.env.HUB_ADDRESS);
let hub;

const NUM_ACCOUNTS = 4;

const decimalsMultiplier = (new web3.utils.BN(10)).pow( new web3.utils.BN(18));

const convertToBaseUnit = number => {
    return new web3.utils.BN(number).mul(decimalsMultiplier);
}

function getWeb3Account(accountAddress) {
    const privateKey = private_keys[accountAddress.toLowerCase()];
    return web3.eth.accounts.privateKeyToAccount(privateKey);    
}

async function prepareContracts(){

    // Get the ganache accounts
    const accountAddresses = await web3.eth.getAccounts();
    accounts = accountAddresses.slice(0, NUM_ACCOUNTS).map(getWeb3Account);
    orgAccount = getWeb3Account(accountAddresses[NUM_ACCOUNTS]);
    adminAccount = getWeb3Account(accountAddresses[accountAddresses.length - 1]);

    // Deploy the Hub contract
    hub = await hubContract
      .deploy({
        data: Hub.bytecode,
        arguments: [
          107,
          31556952,
          'CRC',
          'Circles',
          convertToBaseUnit(34),
          '92592592592592',
          '7776000',
        ],
      })
      .send({
        from: adminAccount.address,
        gas: 10000000,
      });
    
    // Write the hub address in the config.json file
    config.HUB_ADDR = hub.options.address;
    fs.writeFile('./config.json', JSON.stringify(config, null, 2), err => {
      // Checking for errors
      if (err) throw err; 
      console.log('Done writing HUB_ADDR to config file'); // Success
    });

    // Create the Safes for the user accounts and the Org account
    const allAccounts = accounts.concat(new Array(orgAccount));
    const allSsafes = await safeUtils.createSafes(
      adminAccount.address,
      allAccounts.map(({ address }) => address),
    );

    // Get only the user Safes
    safeAddresses = allSsafes.safeAddresses.slice(0, NUM_ACCOUNTS);
    safeInstances = allSsafes.safeInstances.slice(0, NUM_ACCOUNTS);

    fs.writeFile(config.USR_SAFE_ADDRS_PATH, '', (err) => {
      console.log(config.USR_SAFE_ADDRS_PATH, ' is empty now');
      // In case of a error throw err.
      if (err) throw err;
    })
    safeAddresses.forEach( function(addr) {
        data = addr + '\n';
        fs.appendFile(config.USR_SAFE_ADDRS_PATH, data, (err) => {
          console.log({addr});
          // In case of a error throw err.
          if (err) throw err;
        })
      }
    );

    // Get the Org Safe
    const orgSafeAddress = allSsafes.safeAddresses[NUM_ACCOUNTS];
    const orgSafeInstance = allSsafes.safeInstances[NUM_ACCOUNTS];

    fs.writeFile(config.ORG_SAFE_OWNER_PRIVATE_KEY_PATH, private_keys[orgAccount.address.toLowerCase()], (err) => {
      console.log({orgSafeAddress});
      // In case of a error throw err.
      if (err) throw err;
    })

    // Write the Org Safe address in the config.json file
    config.ORG_SAFE_ADDR = orgSafeAddress;
    fs.writeFile('./config.json', JSON.stringify(config, null, 2), err => {
      // Checking for errors
      if (err) throw err; 
      console.log('Done writing ORG_SAFE_ADDR to config file'); // Success
    });
   
    // One Token is created per Safe account (only for user accounts)
    const { tokenInstances, tokenAddresses } = 
      await safeUtils.createTokens(accounts, safeInstances, hub, adminAccount.address);
    
    const balance = await tokenInstances[0].methods.balanceOf(safeAddresses[0]).call();
    console.log({balance});

    // Organization signup
    try {
      await safeUtils.orgSignup(orgAccount, orgSafeInstance, hub);
      // Check that the org has signedup as an organization
      const isOrgSignedup = await hub.methods.organizations(orgSafeAddress).call();
      console.log('The org has been signed up as an ORG: ', isOrgSignedup);
    } catch (err) {
      console.error(err);
    }
}

prepareContracts();