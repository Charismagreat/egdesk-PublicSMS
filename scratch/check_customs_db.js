const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const fs = require('fs');

function getDirectDB() {
  const homeDir = os.homedir();
  const appData = process.env.APPDATA || path.join(homeDir, 'AppData/Roaming');
  const paths = [
    path.join(process.cwd(), 'user_data.db'),
    path.join(process.cwd(), 'crm_data.db'),
    path.join(appData, 'EGDesk/database/user_data.db'),
    path.join(appData, 'egdesk/database/user_data.db')
  ];
  
  let targetPath = '';
  for (const p of paths) {
    if (fs.existsSync(p)) {
      targetPath = p;
      break;
    }
  }
  
  if (!targetPath) {
    targetPath = paths[0];
  }
  return new Database(targetPath.replace(/\\/g, '/'));
}

try {
  const db = getDirectDB();
  console.log("=== SQLite ERP 수입 통관 검증 쿼리 실행 ===");
  
  // 디버깅: 현재 데이터베이스의 모든 테이블 목록 조회
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log("현재 DB 내 테이블 목록:", tables.map(t => t.name).join(", "));
  
  const query = `
    SELECT 
      m.po_number AS "PO번호",
      i.description AS "품명",
      i.part_number AS "규격",
      f.total_invoice_value AS "총금액",
      f.payment_due_date AS "결제마감일",
      CASE WHEN f.is_paid = 1 THEN '지급완료' ELSE '미송금' END AS "송금여부"
    FROM import_master m
    JOIN import_items i ON m.so_number = i.so_number
    LEFT JOIN import_finance f ON m.so_number = f.so_number
    WHERE m.deleted_at IS NULL AND i.deleted_at IS NULL
  `;
  
  const rows = db.prepare(query).all();
  console.log("조회 결과 수:", rows.length);
  console.table(rows);
  
  db.close();
} catch (err) {
  console.error("검증 쿼리 실행 에러:", err);
}
