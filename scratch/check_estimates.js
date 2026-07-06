const { executeSQL } = require('../egdesk-helpers');

async function check() {
  try {
    const result = await executeSQL('SELECT * FROM crm_estimates LIMIT 1');
    console.log('crm_estimates columns (from select *):', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Error executing query:', err);
  }
}

check();
