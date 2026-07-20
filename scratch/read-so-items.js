const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
}

const helpers = require('../egdesk-helpers.js');

async function main() {
  try {
    const tasks = await helpers.queryTable('crm_snaptasks', { limit: 10 });
    console.log('--- crm_snaptasks ---');
    console.log(JSON.stringify(tasks.rows, null, 2));
  } catch (err) {
    console.error('에러:', err);
  }
}

main();
