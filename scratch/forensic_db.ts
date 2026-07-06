import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

function run() {
  const dbPath = `C:\\Users\\CHARISMA\\.gemini\\antigravity\\conversations\\65db2edf-45de-41ef-ad4b-55c28a7d7105.db`;
  if (!fs.existsSync(dbPath)) {
    console.log(`DB file not found: ${dbPath}`);
    return;
  }

  console.log(`Opening database: ${dbPath}`);
  const db = new Database(dbPath);

  // steps 테이블 구조 확인
  const columns = db.prepare("PRAGMA table_info(steps)").all();
  console.log('Columns in steps table:', columns.map((c: any) => c.name));

  // RAW-ALUM-02 관련 쿼리
  console.log('Querying for tracked_items seeding...');
  const rows = db.prepare(`
    SELECT step_index, type, content, tool_calls 
    FROM steps 
    WHERE content LIKE '%RAW-ALUM-02%' 
       OR tool_calls LIKE '%RAW-ALUM-02%'
  `).all();

  console.log(`Found ${rows.length} rows.`);

  for (const row of rows as any[]) {
    console.log(`\n================ Step ${row.step_index} (${row.type}) ================`);
    if (row.tool_calls) {
      console.log('--- Tool Calls ---');
      try {
        const parsed = JSON.parse(row.tool_calls);
        console.log(JSON.stringify(parsed, null, 2));
      } catch (e) {
        console.log(row.tool_calls);
      }
    }
    if (row.content) {
      console.log('--- Content ---');
      console.log(row.content);
    }
  }

  db.close();
}

run();
