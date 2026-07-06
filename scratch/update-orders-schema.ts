import { createTable, deleteTable } from '../egdesk-helpers';

async function updateSchema() {
  try {
    await deleteTable('crm_orders');
    console.log('Old table deleted.');
    const res = await createTable('주문 내역', [
      { name: 'id', type: 'TEXT', notNull: true },
      { name: 'customer_name', type: 'TEXT', notNull: true },
      { name: 'customer_phone', type: 'TEXT', notNull: true },
      { name: 'product_name', type: 'TEXT', notNull: true },
      { name: 'quantity', type: 'TEXT' },
      { name: 'total_price', type: 'TEXT' },
      { name: 'delivery_method', type: 'TEXT' },
      { name: 'shipping_address', type: 'TEXT' },
      { name: 'tracking_number', type: 'TEXT' },
      { name: 'attachment_url', type: 'TEXT' },
      { name: 'order_date', type: 'TEXT' },
      { name: 'status', type: 'TEXT' },
    ], { tableName: 'crm_orders', uniqueKeyColumns: ['id'], duplicateAction: 'update' });
    console.log('Schema updated successfully:', res);
  } catch (e: any) {
    console.error('Failed to update schema:', e.message);
  }
}

updateSchema();
