const Safe = require('@circles/safe-contracts/build/contracts/GnosisSafe.json');
const ProxyFactory = require('@circles/safe-contracts/build/contracts/ProxyFactory.json');
const Token = require('circles-contracts/build/contracts/Token.json');
const EstimateGas = require("./estimateGas.js");
const { ZERO_ADDRESS, CALL_OP, organizationTrustLimit } = require('./constants');
const web3 = require('./web3');
const { signAndSendRawTransaction } = require('./signAndSendRawTransaction');
const execTransaction = require('./execSafeTransaction');

const Config = require('../config.json');
const TypedData = require("./typedData.js");

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
    txData: hub.methods.organizationSignup().encodeABI(),
  });
}


module.exports = {
    trustAccount,
    orgSignup
  };