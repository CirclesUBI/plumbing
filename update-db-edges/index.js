const { performance } = require('perf_hooks');

const { updateAllEdges } = require('./edgesUpdate.js');

async function runScript(){
    const startTime = performance.now();

    await updateAllEdges();

    const endTime = performance.now();
    const milliseconds = Math.round(endTime - startTime);
    console.log(
        `Updated ... edges in ${milliseconds} ms`,
      );
}

runScript();