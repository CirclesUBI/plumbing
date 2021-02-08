const CirclesCore = require("@circles/core");
const TokenContract = require("circles-contracts/build/contracts/Token.json");
const Web3 = require("web3");
const chalk = require("chalk");

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// ===========================
// Configuration
// ===========================
const config = {
  daysThreshold: 30,
  batchSize: 50,
  batchStartIndex: 0,
  batchEndIndex: 8000,
};

const privateKey = "secret";
// ===========================

const provider = new Web3.providers.WebsocketProvider("wss://rpc.xdaichain.com/wss");
const web3 = new Web3(provider);
const account = web3.eth.accounts.privateKeyToAccount(privateKey);

const core = new CirclesCore(web3, {
  hubAddress: "0x29b9a7fBb8995b2423a71cC17cf9810798F6C543",
  proxyFactoryAddress: "0x8b4404DE0CaECE4b966a9959f134f0eFDa636156",
  safeMasterAddress: "0x2CB0ebc503dE87CFD8f0eCEED8197bF7850184ae",
  apiServiceEndpoint: "https://api.circles.garden",
  graphNodeEndpoint: "https://api.thegraph.com",
  relayServiceEndpoint: "https://relay.circles.garden",
  subgraphName: "circlesubi/circles",
});

class TaskRunner {
  constructor() {
    this.tasks = [];
  }

  add(tokenAddress) {
    this.tasks.push({
      tokenAddress,
      isDone: false,
      isError: false,
      error: null,
    });
  }

  update(tokenAddress, fields = {}) {
    const index = this.tasks.findIndex((task) => {
      return task.tokenAddress === tokenAddress;
    });

    this.tasks[index] = Object.assign({}, this.tasks[index], fields);
  }

  getNextPending() {
    return this.tasks.find((task) => {
      return !task.isDone && !task.isError;
    });
  }

  getAllPending() {
    return this.tasks.filter((task) => {
      return task.isError;
    });
  }

  getStats() {
    return this.tasks.reduce(({ error, pending, done }, task) => {
      return {
        error: task.isError ? error + 1 : error,
        pending: !task.isDone && !task.isError ? pending + 1 : pending,
        done: task.isDone ? done + 1 : done,
      };
    }, {
      error: 0,
      pending: 0,
      done: 0,
    });
  }

  isEmpty() {
    return !this.getNextPending();
  }
}

const tasks = new TaskRunner();

async function fetchTokenAddresses(offset = 0) {
  console.log(`Get tokens from ${chalk.bold(offset)} - ${chalk.bold(offset + config.batchSize)}`);

  try {
    const { tokens } = await core.utils.requestGraph({
      query: `{
        tokens(first: ${config.batchSize}, skip: ${offset}) {
          id
        }
      }`,
    });

    return tokens.map(({ id }) => web3.utils.toChecksumAddress(id));
  } catch (error) {
    console.error(
      chalk.red(
        `Could not fetch addresses from ${offset} from graph: ${chalk.bold(
          error
        )}`
      )
    );
  }
}

async function requestUBI(tokenAddress) {
  try {
    // Get Token contract
    const token = new web3.eth.Contract(TokenContract.abi, tokenAddress);

    // Request UBI payout
    const txData = await token.methods.update().encodeABI();

    const tx = {
      from: account.address,
      to: tokenAddress,
      gas: "1000000",
      data: txData,
    };

    const txHash = await new Promise((resolve, reject) => {
      web3.eth.accounts.signTransaction(tx, privateKey).then((signed) => {
        const transaction = web3.eth.sendSignedTransaction(signed.rawTransaction); 

        transaction.on("confirmation", (confirmationNumber, { transactionHash }) => {
          resolve(transactionHash);
        });

        transaction.on("error", (error) => {
          reject(error);
        });
      });
    });

    console.log(chalk.green(`Requested UBI for token=${chalk.bold(tokenAddress)}, txHash=${chalk.bold(txHash)}`));
  } catch (error) {
    console.error(chalk.red(`Could not request UBI for Token ${tokenAddress}: ${chalk.bold(error)}`));
    throw error;
  }
}

async function checkUBI(tokenAddress) {
  try {
    // Get Token contract
    const token = new web3.eth.Contract(TokenContract.abi, tokenAddress);

    // Check if UBI was already issued some days ago
    const lastTouched = await token.methods.lastTouched().call();
    const lastTouchedFromNow = Date.now() - parseInt(`${lastTouched}000`, 10);
    const isWithinThreshold = lastTouchedFromNow > 1000 * 60 * 60 * 24 * config.daysThreshold;
    const days = (lastTouchedFromNow / 86400000).toFixed(2);
    if (!isWithinThreshold) {
      throw new Error(`Token was paid out recently (${days} days ago)`);
    }

    // Check if contract was already stopped
    const isStopped = await token.methods.stopped().call();
    if (isStopped) {
      throw new Error("Is already stopped");
    }

    // UBI can be requested
    console.log(chalk.blue(`Found token ${chalk.bold(tokenAddress)}, not stopped and last touched ${chalk.bold(days)} ago`));
    return true;
  } catch (error) {
    console.error(`Could not check UBI for Token ${chalk.bold(tokenAddress)}: ${error}`);
  }

  return false;
}

async function processBatch(index = 0) {
  console.log("==================================");
  console.log(`Process batch ${chalk.bold(index)}`);

  try {
    const tokenAddresses = await fetchTokenAddresses(index * config.batchSize);

    if (tokenAddresses.length === 0) {
      console.log('No tokens given ..');
      return true;
    }

    await Promise.all(
      tokenAddresses.map(async (tokenAddress) => {
        const isUBIRequested = await checkUBI(tokenAddress);
        if (isUBIRequested) {
          tasks.add(tokenAddress);
        }
      })
    );
  } catch (error) {
    console.error(`Could not process batch ${index}: ${error}`);
  }

  return false;
}

let currentPromise = null;
async function nextTask() {
  // Print task queue statistics
  const { done, pending, error } = tasks.getStats();
  console.log(chalk.yellow(`Queue: done=${chalk.bold(done)}, pending=${chalk.bold(pending)}, error=${chalk.bold(error)}, processing=${chalk.bold(currentPromise ? "true" : "false")}`));

  if (tasks.isEmpty()) {
    console.log(chalk.yellow("Queue is empty"));
  } else if (!currentPromise) {
    currentPromise = new Promise((resolve, reject) => {
      const currentTask = tasks.getNextPending();
      console.log(chalk.yellow("Pick up new task"));

      requestUBI(currentTask.tokenAddress)
        .then(() => {
          tasks.update(currentTask.tokenAddress, {
            isDone: true,
          });

          console.error(chalk.yellow(`Finished task for ${currentTask.tokenAddress}`));
          currentPromise = null;
          resolve();
        })
        .catch((error) => {
          tasks.update(currentTask.tokenAddress, {
            isError: true,
            error,
          });

          console.error(chalk.yellow(`Failed task for ${currentTask.tokenAddress}`));
          currentPromise = null;
          reject(error);
        });
    });
  }

  return currentPromise;
}

async function finishPendingTasks() {
  if (tasks.isEmpty()) {
    console.log("Nothing to do anymore! Done!");
    return;
  }

  await nextTask();
  finishPendingTasks();
}

let batchIndex;
async function nextBatch() {
  const isDone = await processBatch(batchIndex);

  if (isDone || batchIndex > config.batchEndIndex) {
    console.log("Done with fetching tokens, process last tasks ...");
    finishPendingTasks();
  } else {
    batchIndex += 1;
    nextTask();
    nextBatch();
  }
}

async function run() {
  batchIndex = config.batchStartIndex;
  console.log(`Start script\naccount=${chalk.bold(account.address)}`);
  nextBatch();
}

run();
