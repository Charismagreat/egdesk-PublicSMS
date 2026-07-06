const { executeQuery } = require('../egdesk-helpers');

async function alterTable() {
  try {
    await executeQuery('ALTER TABLE products ADD COLUMN category TEXT;');
    console.log('Added category column');
  } catch(e) {
    console.log('Category column might already exist', e);
  }
  
  try {
    await executeQuery('ALTER TABLE products ADD COLUMN available_methods TEXT;');
    console.log('Added available_methods column');
  } catch(e) {
    console.log('Available_methods column might already exist', e);
  }
}

alterTable().catch(console.error);
