const Database = require('better-sqlite3');
const dbPath = 'C:\\Users\\CHARISMA\\AppData\\Roaming\\egdesk\\database\\user_data.db';

try {
  const db = new Database(dbPath);
  console.log("=== USER_DATA.DB DYNAMIC MIGRATION START ===");

  // 날짜 변환 헬퍼 함수
  function convertToKst(val) {
    if (!val) return val;
    
    // ISO 포맷 판별
    if (val.includes('T') || val.includes('Z')) {
      try {
        const date = new Date(val);
        if (!isNaN(date.getTime())) {
          return new Date(date.getTime() + 9 * 60 * 60 * 1000)
            .toISOString()
            .replace('T', ' ')
            .substring(0, 19);
        }
      } catch (e) {
        console.error(`ISO parsing error for value: ${val}`, e.message);
      }
    }
    
    // YYYY-MM-DD HH:mm:ss 포맷이고 UTC 시간인 경우
    const dateRegex = /^(\d{4})-(\d{2})-(\d{2})\s(\d{2}):(\d{2}):(\d{2})$/;
    if (dateRegex.test(val)) {
      try {
        const [_, year, month, day, hour, minute, second] = val.match(dateRegex).map(Number);
        const utcDate = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
        return new Date(utcDate.getTime() + 9 * 60 * 60 * 1000)
          .toISOString()
          .replace('T', ' ')
          .substring(0, 19);
      } catch (e) {
        console.error(`Datetime parsing error for value: ${val}`, e.message);
      }
    }
    
    return val;
  }

  const tablesToMigrate = [
    { name: 'crm_estimates', cols: ['created_at', 'updated_at'] },
    { name: 'crm_purchase_orders', cols: ['created_at', 'completed_at'] },
    { name: 'crm_sales_orders', cols: ['created_at'] },
    { name: 'coupons', cols: ['created_at'] },
    { name: 'crm_customers', cols: ['created_at'] },
    { name: 'crm_deliveries', cols: ['created_at'] }, // created_at이 없으므로 건너뛰어질 것
    { name: 'ecount_sync_schedules', cols: ['created_at', 'next_run_at', 'last_run_at'] }
  ];

  // 트랜잭션 구동
  const runMigration = db.transaction(() => {
    tablesToMigrate.forEach(({ name: tableName, cols }) => {
      // 1. 테이블 존재 여부 확인
      const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?").get(tableName);
      if (!tableExists) {
        console.log(`Table ${tableName} does not exist. Skipping.`);
        return;
      }

      // 2. 테이블 컬럼 정보 조회
      const pragma = db.prepare(`PRAGMA table_info(${tableName})`).all();
      const existingCols = pragma.map(p => p.name);
      
      // 존재하는 컬럼만 선별
      const targetCols = cols.filter(c => existingCols.includes(c));
      if (targetCols.length === 0) {
        console.log(`Table ${tableName} has no target time columns. Skipping.`);
        return;
      }

      console.log(`Migrating Table: ${tableName} (Columns: ${targetCols.join(', ')})`);

      // 3. 데이터 일괄 조회 후 보정
      const selectCols = targetCols.map(c => `"${c}"`).join(', ');
      const rows = db.prepare(`SELECT id, ${selectCols} FROM "${tableName}"`).all();
      
      rows.forEach(row => {
        const updates = {};
        let needsUpdate = false;
        
        targetCols.forEach(col => {
          const originalVal = row[col];
          const kstVal = convertToKst(originalVal);
          if (originalVal !== kstVal) {
            updates[col] = kstVal;
            needsUpdate = true;
          }
        });

        if (needsUpdate) {
          const setClause = Object.keys(updates).map(k => `"${k}" = ?`).join(', ');
          const bindValues = Object.values(updates);
          bindValues.push(row.id);
          
          db.prepare(`UPDATE "${tableName}" SET ${setClause} WHERE id = ?`).run(bindValues);
          console.log(`  Updated ${tableName} ID ${row.id}:`, updates);
        }
      });
    });
  });

  runMigration();
  console.log("=== DYNAMIC MIGRATION COMPLETED SUCCESSFULLY ===");
  db.close();

} catch (err) {
  console.error("Migration failed, rolled back:", err.message);
}
