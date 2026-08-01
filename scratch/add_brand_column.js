const { executeSQL } = require('../egdesk-helpers');

async function run() {
  try {
    const res = await executeSQL('ALTER TABLE products ADD COLUMN brand TEXT');
    console.log('ALTER RESULT:', res);
  } catch (err) {
    console.error('ALTER ERROR:', err);
  }
}

run();
