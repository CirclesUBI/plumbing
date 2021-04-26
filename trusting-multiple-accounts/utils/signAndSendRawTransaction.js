const web3 = require('./web3');
const { extraGas } = require('./constants');

const signAndSendRawTransaction = async (account, to, data, gas=0) => {
  const nonce = await web3.eth.getTransactionCount(account.address, 'pending')
  const payload = {
    nonce,
    data,
    from: account.address,
    to,
    gas,
    gasPrice: 0x3B9ACA00,
    value: 0,
  };
  if (gas == 0) {
    payload.gas = await web3.eth.estimateGas(payload);
  } else {
    payload.gas = gas;
  }

  const signedTx = await web3.eth.accounts.signTransaction(payload, account.privateKey);
  const { rawTransaction } = signedTx;

  return web3.eth.sendSignedTransaction(rawTransaction);
};

module.exports = signAndSendRawTransaction;