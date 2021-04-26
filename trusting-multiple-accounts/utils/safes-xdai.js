const Web3 = require("web3");
const Safe = require('@circles/safe-contracts/build/contracts/GnosisSafe.json');
const ProxyFactory = require('@circles/safe-contracts/build/contracts/ProxyFactory.json');
const Token = require('circles-contracts/build/contracts/Token.json');
const EstimateGas = require("./estimateGas.js");

const Config = require('../config.json');
const TypedData = require("./typedData.js");

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const CALL_OP = 0;
const organizationTrustLimit = 100;

const provider = new Web3.providers.WebsocketProvider(Config.ETHEREUM_NODE_WS);
const web3 = new Web3(provider);

async function execTransaction(account, safeInstance, { to, from, value = 0, txData }) {
    const operation = 0; // CALL
    // const safeTxGas = '1000000000'; // based on data // @TODO: CHANGE
    // const baseGas = '10000000'; // general transaction // @TODO: CHANGE
    // const gasPrice = 0; // no refund
    //const safeTxGas = '100000'; // based on data // @TODO: CHANGE
    //const baseGas = '100000'; // general transaction // @TODO: CHANGE
    
    const gasPrice = 1; // no refund
    const gasToken = ZERO_ADDRESS; // Paying in Eth
    const refundReceiver = ZERO_ADDRESS;
    const nonce = await safeInstance.methods.nonce().call();
    const safeAddress = safeInstance.options.address;

    const safeTxGas = await web3.eth.estimateGas({to, from: safeInstance.options.address, value, data: txData});
    //await EstimateGas.estimateTxGas(safeInstance, to, value, txData, operation);
    const baseGas = await EstimateGas.estimateBaseGas(safeInstance, to, value, txData, operation,
      safeTxGas, gasToken, refundReceiver, 1, nonce);

    console.log({safeTxGas});
    console.log({baseGas});

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

    const data = safeInstance.methods
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
        .encodeABI();
        //.send({ from, gas: '100000000000' }); // @TODO: '1266349' ?  Need to change gas, safeTxGase, baseGas
        //.send({ from, gas: '100000' }); // @TODO: '1266349' ?  Need to change gas, safeTxGase, baseGas

    const ethNonce = await web3.eth.getTransactionCount(account.address, 'pending')
    const max = Math.floor(Math.max((safeTxGas * 64) / 63, safeTxGas + 2500) + 500);
    const gasLimit = safeTxGas + baseGas + max;
    const payload = {
      nonce: ethNonce,
      data,
      gas: gasLimit,
      from: account.address,
      to: safeAddress
    };

    const signedTx = await web3.eth.accounts.signTransaction(payload, account.privateKey);
    console.log({signedTx});
    const { rawTransaction } = signedTx;
    const response = await web3.eth.sendSignedTransaction(rawTransaction);

    console.log({response});
    return response;

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
    trustAccount,
    orgSignup
  };