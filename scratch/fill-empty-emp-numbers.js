const Database = require('better-sqlite3');
const os = require('os');
const path = require('path');
const fs = require('fs');

const homeDir = os.homedir();
const appData = process.env.APPDATA || path.join(homeDir, 'AppData/Roaming');
const paths = [
  path.join(appData, 'EGDesk/database/user_data.db'),
  path.join(appData, 'egdesk/database/user_data.db')
];

let dbPath = '';
for (const p of paths) {
  if (fs.existsSync(p)) {
    dbPath = p;
    break;
  }
}

if (!dbPath) {
  console.log("❌ DB 파일을 찾을 수 없습니다.");
  process.exit(1);
}

console.log(`📂 DB 연결 성공: ${dbPath}`);
const db = new Database(dbPath);

try {
  // 0. employee_number 컬럼 존재 여부 체크 및 추가 (Auto-Migration)
  const colInfo = db.prepare("PRAGMA table_info(crm_operators);").all();
  const colNames = colInfo.map(c => c.name);
  if (!colNames.includes('employee_number')) {
    console.log("⚠️ crm_operators 테이블에 employee_number 컬럼이 없습니다. 컬럼을 생성합니다.");
    db.prepare("ALTER TABLE crm_operators ADD COLUMN employee_number TEXT;").run();
    console.log("✅ 컬럼 생성 완료.");
  }

  // 1. 모든 직원을 가져옴
  const allOps = db.prepare("SELECT id, username, name, employee_number FROM crm_operators").all();
  
  // 2. 현재 연도 앞 2자리 구함
  const yy = new Date().getFullYear().toString().slice(-2);
  const prefix = `${yy}-`;
  
  // 3. 현재 이미 존재하는 사원번호 중 prefix로 시작하는 일련번호 추출
  const seqList = allOps
    .filter(op => op.employee_number && op.employee_number.startsWith(prefix))
    .map(op => {
      const numPart = op.employee_number.replace(prefix, '');
      return Number(numPart) || 0;
    });
    
  let maxSeq = seqList.length > 0 ? Math.max(...seqList) : 0;
  
  console.log(`ℹ️ 현재 연도 접두사: ${prefix}, 현재 최대 일련번호: ${maxSeq}`);
  
  // 4. 사번이 없는 직원 필터링 (null, undefined, 공백문자)
  const emptyOps = allOps.filter(op => !op.employee_number || op.employee_number.trim() === '');
  
  if (emptyOps.length === 0) {
    console.log("✅ 사원번호가 누락된 직원이 존재하지 않습니다.");
  } else {
    console.log(`➡️ 사원번호가 없는 직원 ${emptyOps.length}명을 발견했습니다. 강제 주입을 시작합니다.`);
    
    // 트랜잭션 처리
    const updateStmt = db.prepare("UPDATE crm_operators SET employee_number = ? WHERE id = ?");
    const runUpdate = db.transaction((opsToUpdate) => {
      for (const op of opsToUpdate) {
        maxSeq += 1;
        const newEmpNum = `${prefix}${String(maxSeq).padStart(3, '0')}`;
        updateStmt.run(newEmpNum, op.id);
        console.log(`   [ID: ${op.id}] ${op.name} (${op.username}) ➡️ 사번: ${newEmpNum} 부여 완료`);
      }
    });
    
    runUpdate(emptyOps);
    console.log("🎉 모든 누락된 직원에 사원번호가 성공적으로 주입되었습니다.");
  }
  
} catch (err) {
  console.error("❌ DB 작업 중 오류 발생:", err.message);
} finally {
  db.close();
}
