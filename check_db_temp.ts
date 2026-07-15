process.env.NEXT_PUBLIC_EGDESK_API_URL = 'http://localhost:8080';
process.env.NEXT_PUBLIC_EGDESK_API_KEY = 'a67ddc0f-7e2b-4997-9a0b-9667a74c89d0';
process.env.NEXT_PUBLIC_EGDESK_PROJECT_ID = '678d54e8-dd25-4586-aa98-191ec54289e8';
process.env.NEXT_PUBLIC_EGDESK_ENV = 'development';

const { executeSQL } = require('./egdesk-helpers');

async function main() {
  try {
    console.log("=== Running DB Migration: Add purchasePrice ===");
    try {
      await executeSQL("ALTER TABLE inventory_items ADD COLUMN purchasePrice REAL DEFAULT 0");
      console.log("Migration Successful: purchasePrice column added.");
    } catch (alterErr) {
      console.log("Migration Skipped (Probably column already exists):", alterErr.message);
    }
    
    // 테이블 정보 검증
    const tableInfo = await executeSQL("PRAGMA table_info(inventory_items)");
    console.log("=== inventory_items schema ===");
    console.log(tableInfo.rows.map(r => `${r.name} (${r.type})`));
  } catch (err) {
    console.error("오류:", err);
  }
}

main();
