const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('C:\\dev\\egdesk-FreeSMS\\crm_data.db');

db.serialize(() => {
  // 테이블 스키마 확인
  db.all("PRAGMA table_info(ai_token_usage_logs)", (err, columns) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log("Schema of ai_token_usage_logs:", columns);

    // 데이터 조회 (최근 50개 혹은 어제 날짜 2026-06-15 기준)
    db.all("SELECT * FROM ai_token_usage_logs WHERE created_at LIKE '2026-06-15%' OR created_at LIKE '2026-06-16%' ORDER BY created_at DESC", (err, rows) => {
      if (err) {
        console.error(err);
        return;
      }
      console.log("\nData (2026-06-15 ~ 2026-06-16):");
      console.log(JSON.stringify(rows, null, 2));
    });
  });
});

db.close();
