const { cleanUnusedImagesS3 } = require('./aws-service.js');

async function runScript() {
  await cleanUnusedImagesS3();
  process.exit(0);
}

runScript();
