require('dotenv').config({ path: '.env.development.local' });
const { executeSQL, queryTable } = require('../egdesk-helpers');

async function main() {
  try {
    console.log("Connecting to DB, NEXT_PUBLIC_EGDESK_API_URL:", process.env.NEXT_PUBLIC_EGDESK_API_URL);
    
    // 테이블 스키마 확인
    const tables = await executeSQL("SELECT name FROM sqlite_master WHERE type='table' AND name='crm_operators'");
    console.log("crm_operators table exists:", tables.rows);
    
    if (tables.rows.length > 0) {
      const result = await queryTable('crm_operators');
      console.log("crm_operators rows count:", result.rows ? result.rows.length : 0);
      if (result.rows) {
        result.rows.forEach(r => {
          console.log(`ID: ${r.id}, Username: ${r.username}, Name: ${r.name}, Role: ${r.role}, PassHash: ${r.password_hash ? 'exists' : 'null'}`);
        });
      }
    }
  } catch (error) {
    console.error("Error occurred:", error);
  }
}

main();
