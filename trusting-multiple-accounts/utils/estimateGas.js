
// https://github.com/gnosis/safe-contracts/blob/development/test/utils/execution.js
const Config = require('../config.json');
const Web3 = require("web3");
const provider = new Web3.providers.WebsocketProvider(Config.ETHEREUM_NODE_WS);
const web3 = new Web3(provider);

const BigNumber = web3.utils.BN;
const GAS_PRICE = web3.utils.toWei(new BigNumber(100), 'gwei');

const baseGasValue = (hexValue) => {
  switch (hexValue) {
    case '0x': return 0;
    case '00': return 4;
    default: return 68;
  }
};

const estimatebaseGasCosts = (dataString) => {
  const reducer = (accumulator, currentValue) => accumulator += baseGasValue(currentValue); // eslint-disable-line

  return dataString.match(/.{2}/g).reduce(reducer, 0);
};

const estimateBaseGas = async (safe, to, value, data, operation,
  txGasEstimate, gasToken, refundReceiver, signatureCount, nonce) => {
  // numbers < 256 are 192 -> 31 * 4 + 68
  // numbers < 65k are 256 -> 30 * 4 + 2 * 68
  // For signature array length and baseGasEstimate we already calculated 
  // the 0 bytes so we just add 64 for each non-zero byte
  // (array count (3 -> r, s, v) + ecrecover costs) * signature count
  const signatureCost = signatureCount * (68 + 2176 + 2176 + 6000);
  const payload = await safe.methods.execTransaction(
    to, value, data, operation, txGasEstimate, 0, GAS_PRICE.toNumber(), gasToken, refundReceiver, '0x',
  ).encodeABI();
  const baseGasEstimate = estimatebaseGasCosts(payload) + signatureCost + (nonce > 0
    ? 5000
    : 20000) + 1500; // 1500 -> hash generation costs
  return baseGasEstimate + 32000; // Add aditional gas costs (e.g. base tx costs, transfer costs)
};

const parseRevert = message => new BigNumber(message.substring(67), 16);

const estimateTxGas = async (safe, to, value, data, operation) => {
  let txGasEstimate;
  try {
    console.log("estimateTxGas()", to, value, data, operation, safe.options.address);
    txGasEstimate = await safe.methods
      .requiredTxGas(to, value, data, operation).call({ from: safe.options.address, gas: 0xBEBC20 });
  } catch (err) {
    // requiredTxRevert returns the gas estimate in the revert message
    // Add 10k else we will fail in case of nested calls
    console.log({err});
    txGasEstimate = parseRevert(err.message);
    console.log("err.message: ",err.message);
    console.log("txGasEstimate ",txGasEstimate.toNumber());
    txGasEstimate = txGasEstimate.toNumber() + 10000;
    console.log("txGasEstimate ",txGasEstimate);
    return txGasEstimate;
  }
};

module.exports = {
  estimateBaseGas,
  estimateTxGas,
};
