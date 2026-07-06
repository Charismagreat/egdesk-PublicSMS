export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { createTable, deleteTable } = require('../../../../egdesk-helpers');
    
    // First try to delete the corrupted table
    try {
      await deleteTable('crm_orders');
      console.log('Deleted corrupted crm_orders table');
    } catch (e) {
      console.log('Failed to delete crm_orders, it might not exist:', e);
    }

    await createTable('주문 내역', [
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
      { name: 'customer_memo', type: 'TEXT' },
      { name: 'order_date', type: 'TEXT' },
      { name: 'status', type: 'TEXT' },
    ], { tableName: 'crm_orders', uniqueKeyColumns: ['id'], duplicateAction: 'update' });
    
    return NextResponse.json({ success: true, message: 'crm_orders recreated successfully' });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
