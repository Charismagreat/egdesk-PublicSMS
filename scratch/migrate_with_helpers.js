const { createTable } = require('../egdesk-helpers');

const productsSchema = [
  { name: 'id', type: 'TEXT', notNull: true },
  { name: 'name', type: 'TEXT', notNull: true },
  { name: 'price', type: 'TEXT' },
  { name: 'brand', type: 'TEXT' },
  { name: 'url', type: 'TEXT' },
  { name: 'description', type: 'TEXT' },
  { name: 'main_image_url', type: 'TEXT' },
  { name: 'detail_image_url', type: 'TEXT' },
  { name: 'available_methods', type: 'TEXT' },
  { name: 'category', type: 'TEXT' },
  { name: 'menu_category', type: 'TEXT' },
  { name: 'is_coupon_excludable', type: 'INTEGER' },
  { name: 'is_estimate_price', type: 'INTEGER' },
  { name: 'status', type: 'TEXT' },
  { name: 'inventory_item_id', type: 'INTEGER' }
];

async function migrate() {
  try {
    console.log('Running createTable with brand schema via egdesk-helpers...');
    const result = await createTable('Products', productsSchema, {
      tableName: 'products',
      duplicateAction: 'update'
    });
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Migration error:', err);
  }
}

migrate();
