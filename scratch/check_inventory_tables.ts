import { listTables, queryTable } from '../egdesk-helpers';

async function run() {
  try {
    console.log('Listing tables...');
    const tables = await listTables();
    console.log(tables);
    
    console.log('\nQuerying inventory_items...');
    const items = await queryTable('inventory_items');
    console.log(items);
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}
run();
