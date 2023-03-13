const { performance } = require('perf_hooks');
const { argv } = require('node:process');
let address = argv[2]

const { updateAllEdges } = require('./edgesUpdate.js');

async function runScript() {
  const startTime = performance.now();

  await updateAllEdges(address);

  const endTime = performance.now();
  const milliseconds = Math.round(endTime - startTime);
  console.log(
    `Updated ... edges in ${milliseconds} ms`,
  );
  process.exit(0);
}

runScript();