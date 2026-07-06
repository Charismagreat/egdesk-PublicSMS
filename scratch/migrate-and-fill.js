const Database = require('better-sqlite3');
const os = require('os');
const path = require('path');
const fs = require('fs');

function getDirectDB() {
  const homeDir = os.homedir();
  const appData = process.env.APPDATA || path.join(homeDir, 'AppData/Roaming');
  const paths = [
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

  const normalizedPath = targetPath.replace(/\\/g, '/');
  return new Database(normalizedPath);
}

try {
  const db = getDirectDB();
  
  // 1. employee_number 컬럼 추가 (없을 경우)
  const schema = db.prepare('PRAGMA table_info("crm_operators")').all();
  const colNames = schema.map(c => c.name);
  
  if (!colNames.includes('employee_number')) {
    db.exec('ALTER TABLE "crm_operators" ADD COLUMN "employee_number" TEXT');
    console.log('✓ employee_number 컬럼이 성공적으로 추가되었습니다.');
  } else {
    console.log('✓ employee_number 컬럼이 이미 존재합니다.');
  }

  // 2. 사원번호 없는 대상 조회 및 보정
  const allOps = db.prepare('SELECT * FROM "crm_operators"').all();
  const yy = new Date().getFullYear().toString().slice(-2);
  const prefix = `${yy}-`;
  
  const seqList = allOps
    .filter(op => op.employee_number && op.employee_number.startsWith(prefix))
    .map(op => {
      const numPart = op.employee_number.replace(prefix, '');
      return Number(numPart) || 0;
    });
    
  let maxSeq = seqList.length > 0 ? Math.max(...seqList) : 0;
  
  const emptyOps = allOps.filter(op => !op.employee_number || op.employee_number.trim() === '');
  
  if (emptyOps.length > 0) {
    console.log(`➡️ 사원번호가 없는 직원 ${emptyOps.length}명 감지. 보정을 시작합니다.`);
    const stmt = db.prepare('UPDATE "crm_operators" SET "employee_number" = ? WHERE "id" = ?');
    
    db.transaction(() => {
      for (const op of emptyOps) {
        maxSeq += 1;
        const newEmpNum = `${prefix}${String(maxSeq).padStart(3, '0')}`;
        stmt.run(newEmpNum, op.id);
        console.log(`   [ID: ${op.id}] ${op.name} (${op.username}) ➡️ 사번: ${newEmpNum} 주입 완료`);
      }
    })();
    console.log('✓ 기존 무사번 직원 대상 일괄 사번 주입 성공.');
  } else {
    console.log('✓ 사원번호가 없는 직원이 없습니다.');
  }
  
  db.close();
} catch (e) {
  console.error('에러 발생:', e.message);
}
