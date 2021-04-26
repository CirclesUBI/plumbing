const Web3 = require("web3");
const Safe = require('@circles/safe-contracts/build/contracts/GnosisSafe.json');
const ProxyFactory = require('@circles/safe-contracts/build/contracts/ProxyFactory.json');
const Token = require('circles-contracts/build/contracts/Token.json');
const Config = require('../config.json');
const TypedData = require("./typedData.js");

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const CALL_OP = 0;
const organizationTrustLimit = 100;

const provider = new Web3.providers.HttpProvider(Config.ETHEREUM_NODE_RPC_URL);
const web3 = new Web3(provider);

async function execTransaction(account, safeInstance, { to, from, value = 0, txData }) {
  const operation = 0; // CALL
    const safeTxGas = '1000000000'; // based on data // @TODO: CHANGE
    const baseGas = '10000000'; // general transaction // @TODO: CHANGE
    const gasPrice = 0; // no refund
    const gasToken = ZERO_ADDRESS; // Paying in Eth
    const refundReceiver = ZERO_ADDRESS;
    const nonce = await safeInstance.methods.nonce().call();
    const safeAddress = safeInstance.options.address;

    const typedData = TypedData.formatTypedData({
        to,
        value,
        txData,
        operation,
        safeTxGas,
        baseGas,
        gasPrice,
        gasToken,
        refundReceiver,
        nonce,
        verifyingContract: safeAddress,
    });
    const signature = TypedData.signTypedData(account.privateKey, typedData);
    const signatures = signature;

    return await safeInstance.methods
        .execTransaction(
        to,
        value,
        txData,
        operation,
        safeTxGas,
        baseGas,
        gasPrice,
        gasToken,
        refundReceiver,
        signatures,
        )
        .send({ from, gas: '100000000000' }); // @TODO: '1266349' ?  Need to change gas, safeTxGase, baseGas
}

async function createSafes(adminAccountAddress, accountAddresses) {
    const safeContract = new web3.eth.Contract(Safe.abi);
    const proxyFactoryContract = new web3.eth.Contract(ProxyFactory.abi);
  
    // Deploy Proxy factory
    let proxyFactory = await proxyFactoryContract
      .deploy({
        data: ProxyFactory.bytecode,
      })
      .send({
        from: adminAccountAddress,
        gas: 10000000,
      });

    // Create Safe Master Copy
    let safeMaster = await safeContract
    .deploy({
        data: Safe.bytecode,
    })
    .send({
        from: adminAccountAddress,
        gas: 10000000,
    });

    let safeInstances = [];
    let safeAddresses = [];

    for (let i = 0; i < accountAddresses.length; i++) {
        // Create Gnosis Safe Data
        let gnosisSafeData = await safeMaster.methods
        .setup(
            [accountAddresses[i]],
            1,
            ZERO_ADDRESS,
            '0x',
            ZERO_ADDRESS,
            0,
            ZERO_ADDRESS,
        )
        .encodeABI();

    let proxyCreated = await proxyFactory.methods
      .createProxy(safeMaster.options.address, gnosisSafeData)
      .send({
        from: adminAccountAddress,
        gas: 10000000,
      });

    safeAddresses[i] =
      proxyCreated.events['ProxyCreation'].returnValues['proxy'];

    safeInstances[i] = new web3.eth.Contract(Safe.abi, safeAddresses[i]);
  }
  return { safeInstances, safeAddresses };
}

async function createTokens(accounts, safeInstances, hub, adminAccountAddress) {
    let tokenInstances = [];
    let tokenAddresses = [];
  
    for (let i = 0; i < accounts.length; i++) {
      await execTransaction(accounts[i], safeInstances[i], {
        to: hub.options.address,
        from: adminAccountAddress,
        txData: hub.methods.signup().encodeABI(),
      });
      tokenAddresses[i] = await hub.methods
        .userToToken(safeInstances[i].options.address)
        .call();
      tokenInstances[i] = new web3.eth.Contract(Token.abi, tokenAddresses[i]);
    }
    return { tokenInstances, tokenAddresses };
}

async function trustAccount(
    hub,
    orgOwnerAccount, // web3 instance, owner of the organization Safe
    orgSafe, // the Safe of the Organization
    userSafeAddr, // the address of the Safe account to be trusted
    ){
  
    const txDataAddConnection = await hub.methods.trust(userSafeAddr, organizationTrustLimit).encodeABI();
    const result = await execTransaction(orgOwnerAccount, orgSafe, {
        to: hub.options.address,
        from: orgOwnerAccount.address,
        txData: txDataAddConnection,
    });
    return result.status;
}

async function orgSignup(orgAccount, orgSafeInstance, hub){
    await execTransaction(orgAccount, orgSafeInstance, {
        to: hub.options.address,
        from: orgAccount.address,
        txData: hub.methods.organizationSignup().encodeABI(),
        });
}


module.exports = {
    createTokens,
    createSafes,
    trustAccount,
    orgSignup
  };