import { deleteTable, executeSQL } from '../egdesk-helpers';
import { setupDatabase } from '../src/lib/setup-db';
import { TABLE_NAMES } from '../egdesk.config';

async function fixDb() {
  console.log('Fixing database state...');
  
  // 1. Manually remove from user_tables metadata if needed
  try {
    for (const tableName of Object.values(TABLE_NAMES)) {
      try {
        console.log(`Deleting table: ${tableName}`);
        await deleteTable(tableName);
      } catch (e: any) {
        console.log(`Failed to delete via deleteTable: ${e.message}`);
        try {
          await executeSQL(`DELETE FROM user_tables WHERE table_name = '${tableName}'`);
          console.log(`Cleaned up ${tableName} from user_tables metadata directly.`);
        } catch(e2: any) {
          console.log(`Failed to clean up metadata: ${e2.message}`);
        }
      }
    }

    // Don't forget coupons table
    try {
      await deleteTable('coupons');
    } catch(e) {
      await executeSQL(`DELETE FROM user_tables WHERE table_name = 'coupons'`);
    }

  } catch(e) {
    console.error(e);
  }

  // 2. Re-run setup
  await setupDatabase();
  
  // 3. Create coupons table
  const { createTable } = require('../egdesk-helpers');
  try {
    await createTable('할인 쿠폰', [
      { name: 'id', type: 'TEXT', notNull: true },
      { name: 'code', type: 'TEXT', notNull: true },
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'discount_type', type: 'TEXT', notNull: true },
      { name: 'discount_value', type: 'INTEGER', notNull: true },
      { name: 'min_order_amount', type: 'INTEGER', notNull: true },
      { name: 'status', type: 'TEXT', notNull: true },
      { name: 'created_at', type: 'TEXT', notNull: true }
    ], { tableName: 'coupons', uniqueKeyColumns: ['id'], duplicateAction: 'update' });
    console.log('Coupons table recreated.');
  } catch(e: any) {
    console.error('Error creating coupons table:', e.message);
  }
}

fixDb();
