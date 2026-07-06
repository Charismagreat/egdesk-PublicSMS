const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

function run() {
  const dbPath = `C:\\Users\\CHARISMA\\.gemini\\antigravity\\conversations\\65db2edf-45de-41ef-ad4b-55c28a7d7105.db`;
  if (!fs.existsSync(dbPath)) {
    console.log(`DB file not found: ${dbPath}`);
    return;
  }

  const db = new Database(dbPath);

  console.log('Querying first few steps to inspect payload...');
  const rows = db.prepare(`
    SELECT idx, step_type, step_payload, step_format 
    FROM steps 
    LIMIT 3
  `).all();

  for (const row of rows) {
    console.log(`\n================ Step ${row.idx} ================`);
    console.log('Type of step_payload:', typeof row.step_payload);
    console.log('Is buffer?', Buffer.isBuffer(row.step_payload));
    console.log('Step format:', row.step_format);
    
    if (Buffer.isBuffer(row.step_payload)) {
      console.log('Buffer length:', row.step_payload.length);
      console.log('First 50 bytes (hex):', row.step_payload.slice(0, 50).toString('hex'));
      console.log('First 100 chars (utf8):', row.step_payload.slice(0, 100).toString('utf8'));
      
      // 혹시 zlib 압출인지 확인 (gzip signature: 1f 8b or zlib: 78 9c)
      const header = row.step_payload.slice(0, 2).toString('hex');
      console.log('Header hex:', header);
      if (header === '789c' || header === '1f8b') {
        console.log('Detected compressed stream!');
      }
    } else {
      console.log('Payload string (first 200 chars):', row.step_payload.substring(0, 200));
    }
  }

  db.close();
}

run();
