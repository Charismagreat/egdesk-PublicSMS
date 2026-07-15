const helpers = require('../egdesk-helpers');

async function check() {
  try {
    const res = await helpers.queryTable('crm_operators', { filters: { username: 'admin' } });
    console.log("=== CRM OPERATOR 'admin' QUERY ===");
    console.log(JSON.stringify(res, null, 2));
  } catch (err) {
    console.error("Query failed:", err);
  }
}

check();
