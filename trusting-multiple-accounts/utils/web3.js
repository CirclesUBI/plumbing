const Web3 = require("web3");
const Config = require('../config.json');

const provider = new Web3.providers.WebsocketProvider(Config.ETHEREUM_NODE_WS);
const web3 = new Web3(provider);

module.exports = web3

