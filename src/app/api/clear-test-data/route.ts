export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { NextResponse } from 'next/server';
import { queryTable, deleteRows } from '../../../../egdesk-helpers';

const tables = [
  'inventory_logs',
  'crm_inventory_inbounds',
  'crm_inventory_inbound_items',
  'inventory_items',
  'crm_estimates',
  'crm_estimate_items',
  'crm_purchase_orders',
  'crm_sales_orders'
];

export async function GET() {
  try {
    console.log("=== API clear-test-data: Starting reset using egdesk-helpers.ts ===");
    const results: Record<string, any> = {};

    for (const table of tables) {
      console.log(`Processing table [${table}]...`);
      const qRes = await queryTable(table, { limit: 10000 });
      const rows = qRes.rows || [];
      
      if (rows.length === 0) {
        results[table] = { status: 'already_empty', count: 0 };
        console.log(`Table [${table}] is already empty.`);
        continue;
      }

      const ids = rows.map((r: any) => r.id || r.uuid).filter(Boolean);
      console.log(`Found ${ids.length} rows to delete in [${table}].`);
      
      if (ids.length > 0) {
        const delRes = await deleteRows(table, { ids });
        results[table] = { status: 'deleted', count: ids.length, result: delRes };
        console.log(`Successfully deleted ${ids.length} rows from [${table}].`);
      } else {
        results[table] = { status: 'no_valid_ids', count: 0 };
      }
    }

    return NextResponse.json({
      success: true,
      message: "B2B and Inventory test data wiped successfully via egdesk-helpers.ts!",
      details: results
    });

  } catch (error: any) {
    console.error("API clear-test-data error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to wipe test data"
    }, { status: 500 });
  }
}
