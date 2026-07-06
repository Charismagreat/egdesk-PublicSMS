const helpers = require('../egdesk-helpers.js');

async function checkSchema(tableName) {
  try {
    const result = await helpers.getTableSchema(tableName);
    console.log(`\n=== Table Schema: ${tableName} ===`);
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(`Error checking schema for ${tableName}:`, err);
  }
}

async function main() {
  const tables = [
    'crm_operators',
    'crm_attendance',
    'products',
    'crm_expenses',
    'crm_snaptasks',
    'crm_snaptask_items',
    'coupons',
    'crm_customers'
  ];
  
  for (const t of tables) {
    await checkSchema(t);
  }
}

main();
