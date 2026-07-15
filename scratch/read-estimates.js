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
    const res = await helpers.queryTable('crm_estimates', { limit: 10 });
    console.log('--- crm_estimates 데이터 목록 ---');
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('에러:', err);
  }
}

main();
