const path = require('path');
const Database = require('better-sqlite3');

const dbPaths = [
  'C:/Users/CHARISMA/AppData/Roaming/EGDesk/database/user_data.db',
  'C:/Users/CHARISMA/AppData/Roaming/EGDesk/user-data/development/projects/49a59fa4-40b6-40f4-8c3d-0231be79c7f9/user_data.db',
  'C:/Users/CHARISMA/AppData/Roaming/EGDesk/user-data/production/projects/49a59fa4-40b6-40f4-8c3d-0231be79c7f9/user_data.db',
  'C:/Users/CHARISMA/AppData/Roaming/egdesk/database/user_data.db',
  'C:/Users/CHARISMA/AppData/Roaming/egdesk/user-data/development/projects/49a59fa4-40b6-40f4-8c3d-0231be79c7f9/user_data.db',
  'C:/Users/CHARISMA/AppData/Roaming/egdesk/user-data/production/projects/49a59fa4-40b6-40f4-8c3d-0231be79c7f9/user_data.db'
];

function runCleanup() {
  console.log('=== Starting Direct SQLite DB Cleanup (using better-sqlite3) ===');

  const tables = [
    'crm_estimate_items',
    'crm_estimates',
    'crm_purchase_orders',
    'crm_sales_orders',
    'inventory_logs',
    'message_logs'
  ];

  for (const dbPath of dbPaths) {
    const fs = require('fs');
    if (!fs.existsSync(dbPath)) {
      console.log(`- DB Path does not exist, skipping: ${dbPath}`);
      continue;
    }

    console.log(`Processing DB Path: ${dbPath}`);
    let db;
    try {
      db = new Database(dbPath, { fileMustExist: true });
      console.log('✓ Successfully connected.');

      // 트랜잭션으로 일괄 실행
      const transaction = db.transaction(() => {
        for (const table of tables) {
          try {
            // 테이블 존재 여부 확인
            const checkTable = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(table);
            if (!checkTable) {
              console.log(`- Table [${table}] does not exist in this DB.`);
              continue;
            }

            // 테이블 데이터 삭제
            const deleteStmt = db.prepare(`DELETE FROM ${table}`);
            const info = deleteStmt.run();
            console.log(`✓ Table [${table}]: deleted ${info.changes} rows.`);

            // sqlite_sequence 초기화
            try {
              const seqStmt = db.prepare(`DELETE FROM sqlite_sequence WHERE name = ?`);
              seqStmt.run(table);
              console.log(`✓ Table [${table}]: reset sqlite_sequence.`);
            } catch (seqErr) {
              // ignore
            }
          } catch (tableErr) {
            console.warn(`⚠️ Error processing table [${table}]:`, tableErr.message);
          }
        }
      });

      transaction();
      console.log(`✓ Finished processing: ${dbPath}`);

    } catch (err) {
      console.error(`Fatal DB error on ${dbPath}:`, err.message);
    } finally {
      if (db) {
        db.close();
        console.log('✓ Connection closed.\n');
      }
    }
  }

  console.log('=== All DB Cleanup Completed ===');
}

runCleanup();
