const { performance } = require('perf_hooks');

async function runScript(){
    const startTime = performance.now();

    

    const endTime = performance.now();
    const milliseconds = Math.round(endTime - startTime);
    console.log(
        `Updated ... edges in ${milliseconds} ms`,
      );
}

runScript();