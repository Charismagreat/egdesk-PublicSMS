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
    const sos = await helpers.executeSQL('SELECT id, estimate_id, tenant_id FROM crm_sales_orders');
    console.log('--- raw crm_sales_orders ---');
    console.log(JSON.stringify(sos, null, 2));

    const ests = await helpers.executeSQL('SELECT id, type, tenant_id FROM crm_estimates');
    console.log('--- raw crm_estimates ---');
    console.log(JSON.stringify(ests, null, 2));

    const items = await helpers.executeSQL('SELECT id, estimate_id, tenant_id FROM crm_estimate_items');
    console.log('--- raw crm_estimate_items ---');
    console.log(JSON.stringify(items, null, 2));
  } catch (err) {
    console.error('에러:', err);
  }
}

main();
