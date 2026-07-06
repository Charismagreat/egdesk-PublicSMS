import { queryTable, listTables } from '../egdesk-helpers';

async function main() {
  console.log('--- DB Table List ---');
  const tables = await listTables();
  console.log(tables);

  console.log('\n--- Products Query Test ---');
  try {
    const productsRes = await queryTable('products', {});
    console.log('SUCCESS! Products table exists.');
    console.log(`Row count: ${productsRes.rows ? productsRes.rows.length : 0}`);
  } catch (error: any) {
    console.error('FAILED to query products table:', error.message);
  }

  console.log('\n--- Instagram Settings Query Test ---');
  try {
    const settingsRes = await queryTable('instagram_marketing_settings', {});
    console.log('SUCCESS! instagram_marketing_settings table exists.');
    console.log(`Row count: ${settingsRes.rows ? settingsRes.rows.length : 0}`);
    console.log('Seeded data:', settingsRes.rows);
  } catch (error: any) {
    console.error('FAILED to query settings table:', error.message);
  }
}

main();
