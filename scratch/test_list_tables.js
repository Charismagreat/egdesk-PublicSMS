const { listTables } = require('../egdesk-helpers');

async function check() {
  try {
    const res = await listTables();
    console.log('TABLES:', res.tables ? res.tables.map(t => t.tableName) : res);
  } catch (err) {
    console.error('ERROR:', err);
  }
}

check();
