const CirclesCore = require("@circles/core");
const TokenContract = require("@circles/circles-contracts/build/contracts/Token.json");
const Web3 = require("web3");

const LOOP_INTERVAL = 1000;
const MAX_ATTEMPTS = 60;
const SAFE_DEPLOYMENT_GAS = Web3.utils.toWei('0.01', 'ether');

const privateKeys = [
  "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d",
  "0x6cbed15c793ce57650b9877cf6fa156fbef513c4e6134f022a85b1ffdd59b2a1",
  "0x6370fd033278c143179d81c5526140625662b8daa446c22ee2d73db3707e620c",
  "0x646f1ce2fdad0e6deeeb5c7e8e5543bdde65e86029e2fd9fc169899c440a7913",
  "0xadd53f9a7e588d003326d1cbf9e4a43c061aadd9bc938c843a79e7b4fd2ad743",
  "0x395df67f0c2d2d9fe1ad08d1bc8b6627011959b79c53d7dd6a3536a33ab8a4fd",
  "0xe485d098507f54e7733a205420dfddbe58db035fa577fc294ebd14db90767a52",
  "0xa453611d9419d0e56f499079478fd72c37b251a94bfde4d19872c44cf65386e3",
  "0x829e924fdf021ba3dbbc4225edfece9aca04b929d6e75613329ca6f1d31c0bb4",
  "0xb0057716d5917badaf911b193b12b910811c1497b5bada8d7711f758981c3773"
];

const provider = new Web3.providers.HttpProvider("http://localhost:8545");
const web3 = new Web3(provider);

const core = new CirclesCore(web3, {
  hubAddress: "0xCfEB869F69431e42cdB54A4F4f105C19C080A601",
  proxyFactoryAddress: "0x9b1f7F645351AF3631a656421eD2e40f2802E6c0",
  safeMasterAddress: "0x2612Af3A521c2df9EAF28422Ca335b04AdF3ac66",
  apiServiceEndpoint: "http://api.circles.lan",
  graphNodeEndpoint: "http://graph.circles.lan",
  relayServiceEndpoint: "http://relay.circles.lan",
  subgraphName: "circlesubi/circles-subgraph",
  fallbackHandlerAddress:"0x67B5656d60a809915323Bf2C40A8bEF15A152e3e"
});

function getAccount(accountIndex = 0) {
  return web3.eth.accounts.privateKeyToAccount(privateKeys[accountIndex]);
}

function isContractDeployed(code) {
  return code !== '0x';
}

async function loop(
  label,
  request,
  condition = isContractDeployed,
) {
  return new Promise((resolve, reject) => {
    let attempt = 0;

    const interval = setInterval(async () => {
      try {
        const response = await request();

        attempt += 1;

        if (condition(response)) {
          clearInterval(interval);
          resolve(response);
        } else if (attempt > MAX_ATTEMPTS) {
          throw new Error(
            `Tried too many times waiting for condition "${label}"`,
          );
        }
      } catch (error) {
        clearInterval(interval);
        reject(error);
      }
    }, LOOP_INTERVAL);
  });
}

async function fundSafe(account, safeAddress) {
  return await web3.eth.sendTransaction({
    from: account.address,
    to: safeAddress,
    value: SAFE_DEPLOYMENT_GAS,
  });
}

async function deploySafe(account) {
  const safeAddress = await core.safe.prepareDeploy(account, {
    nonce: parseInt(`${Math.round(Math.random() * 1000000)}`, 10),
  });

  await fundSafe(account, safeAddress);

  await core.safe.deploy(account, {
    safeAddress,
  });

  await loop(`Wait until Safe ${safeAddress} got deployed`, () =>
    web3.eth.getCode(safeAddress),
  );

  return safeAddress;
}

async function run(count) {
  for (let i = 0; i < count; i += 1) {
    // Pick a random account
    const account = getAccount(Math.floor(Math.random() * privateKeys.length));
    // Deploy a Safe
    try {
      const safeAddress = await deploySafe(account);
      console.log(`${i}: Deployed ${safeAddress} for ${account.address} with key ${account.privateKey}`);
    } catch(error) {
      console.log(`${i}: Failed deployment for ${account.address} with "${error}"`);
    }
  }
}

// Run mass deployment of new Safes
run(1000);