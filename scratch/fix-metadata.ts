import { executeSQL } from '../egdesk-helpers';

async function fix() {
  const schemaJson = JSON.stringify([
    { name: 'id', type: 'TEXT', notNull: true },
    { name: 'name', type: 'TEXT', notNull: true },
    { name: 'price', type: 'TEXT' },
    { name: 'url', type: 'TEXT' },
    { name: 'description', type: 'TEXT' },
    { name: 'main_image_url', type: 'TEXT' },
    { name: 'detail_image_url', type: 'TEXT' },
    { name: 'available_methods', type: 'TEXT' },
    { name: 'category', type: 'TEXT' }
  ]);

  await executeSQL(`UPDATE user_tables SET schema_json = '${schemaJson}', column_count = 9 WHERE table_name = 'products'`);
  console.log('Fixed user_tables metadata for products!');
}

fix().catch(console.error);
