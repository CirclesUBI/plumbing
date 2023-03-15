const Web3 = require('web3');
const CirclesCore = require('@circles/core');
const config = require('./config.json');

const web3 = new Web3(
  new Web3.providers.WebsocketProvider(config.ETHEREUM_NODE_WS),
);

const core = new CirclesCore(web3, {
  apiServiceEndpoint: config.API_SERVICE_ENDPOINT,
  fallbackHandlerAddress: config.SAFE_DEFAULT_CALLBACK_HANDLER,
  graphNodeEndpoint: config.GRAPH_NODE_ENDPOINT,
  hubAddress: config.HUB_ADDRESS,
  proxyFactoryAddress: config.PROXY_FACTORY_ADDRESS,
  relayServiceEndpoint: config.RELAY_SERVICE_ENDPOINT,
  safeMasterAddress: config.SAFE_ADDRESS,
  subgraphName: config.SUBGRAPH_NAME,
});

async function requestGraph(query) {
  // Strip newlines in query before doing request
  return await core.utils.requestGraph({
    query: query.replace(/(\r\n|\n|\r)/gm, ' '),
  });
}


async function getTokenAddressFromGraph(tokenAddress) {
  const query = `{
      tokens( where: {owner:  "${tokenAddress}"}) {
        id
      }
    }`;
  const data = await requestGraph(query);
  if (!data) {
    logger.error(`Error requesting graph with query: ${query}`)
    return false;
  }
  return data.tokens;
}

module.exports = {
  getTokenAddressFromGraph,
}
