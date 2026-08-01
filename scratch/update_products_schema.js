const { createTable } = require('../egdesk-helpers');

async function updateSchema() {
  try {
    const fullSchema = [
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
      { name: 'inventory_item_id', type: 'INTEGER' },
      { name: 'tenant_id', type: 'TEXT' }
    ];

    console.log('Sending createTable schema update to EGDesk Gateway...');
    const res = await createTable('Products', fullSchema, {
      tableName: 'products',
      duplicateAction: 'update'
    });
    console.log('Schema Update Result:', JSON.stringify(res, null, 2));
  } catch (err) {
    console.error('Schema Update Error:', err);
  }
}

updateSchema();
