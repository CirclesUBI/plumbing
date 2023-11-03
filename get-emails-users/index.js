const { getEmails } = require('./getEmails.js');

async function runScript() {

  await getEmails();

  process.exit(0);
}

runScript();
