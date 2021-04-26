const Safe = require('@circles/safe-contracts/build/contracts/GnosisSafe.json');
const ProxyFactory = require('@circles/safe-contracts/build/contracts/ProxyFactory.json');
const Token = require('circles-contracts/build/contracts/Token.json');
const EstimateGas = require("./estimateGas.js");
const { ZERO_ADDRESS, CALL_OP, organizationTrustLimit } = require('./constants');
const web3 = require('./web3');
const signAndSendRawTransaction = require('./signAndSendRawTransaction');

const Config = require('../config.json');
const TypedData = require("./typedData.js");

async function execTransaction(account, safeInstance, { to, value = 0, txData }) {
    const operation = CALL_OP;
    const gasPrice = 0; // no refund
    const gasToken = ZERO_ADDRESS; // Paying in Eth
    const refundReceiver = ZERO_ADDRESS;
    const nonce = await safeInstance.methods.nonce().call();
    const safeAddress = safeInstance.options.address;

    const safeTxGas = await web3.eth.estimateGas({to, from: safeInstance.options.address, value, data: txData});
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

    const max = Math.floor(Math.max((safeTxGas * 64) / 63, safeTxGas + 2500) + 500);
    const gasLimit = safeTxGas + baseGas + max;
    
    const tx = await signAndSendRawTransaction(account, safeInstance.options.address, data, gas=gasLimit);
    return tx;
}

module.exports = execTransaction;