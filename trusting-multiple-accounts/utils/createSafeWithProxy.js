const Safe = require('@circles/safe-contracts/build/contracts/GnosisSafe.json');
const { ZERO_ADDRESS } = require('./constants');
const signAndSendRawTransaction = require('./signAndSendRawTransaction');
const web3 = require('./web3');

const createSafeWithProxy = async (proxy, safe, owner) => {
  const proxyData = safe.methods.setup([owner.address], 1, ZERO_ADDRESS, '0x', ZERO_ADDRESS, ZERO_ADDRESS, 0, ZERO_ADDRESS)
    .encodeABI();

  const data = proxy.methods.createProxy(safe.options.address, proxyData).encodeABI();

  const tx = await signAndSendRawTransaction(owner, proxy.options.address, data)

  const { logs } = tx;

  const userSafeAddress = `0x${logs[1].data.substring(26, 66)}`;

  return new web3.eth.Contract(Safe.abi, userSafeAddress);
};

module.exports = createSafeWithProxy;