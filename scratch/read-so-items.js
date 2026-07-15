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
    const sos = await helpers.queryTable('crm_sales_orders', { limit: 10 });
    console.log('--- crm_sales_orders ---');
    console.log(JSON.stringify(sos.rows, null, 2));

    const ests = await helpers.queryTable('crm_estimates', { limit: 10 });
    console.log('--- crm_estimates ---');
    console.log(JSON.stringify(ests.rows, null, 2));

    const items = await helpers.queryTable('crm_estimate_items', { limit: 20 });
    console.log('--- crm_estimate_items ---');
    console.log(JSON.stringify(items.rows, null, 2));
  } catch (err) {
    console.error('에러:', err);
  }
}

main();
