import { createTable } from '../egdesk-helpers';

async function setupCoupons() {
  try {
    await createTable('쿠폰 관리', [
      { name: 'id', type: 'TEXT' },
      { name: 'code', type: 'TEXT' },
      { name: 'name', type: 'TEXT' },
      { name: 'discount_type', type: 'TEXT' }, // 'amount' or 'percent'
      { name: 'discount_value', type: 'INTEGER' },
      { name: 'min_order_amount', type: 'INTEGER' },
      { name: 'status', type: 'TEXT' }, // 'active', 'expired', 'used'
      { name: 'created_at', type: 'TEXT' }
    ], { tableName: 'coupons', uniqueKeyColumns: ['id'] });
    console.log("Coupons table created successfully.");
  } catch (e: any) {
    console.error("Error creating coupons table:", e.message);
  }
}

setupCoupons();
