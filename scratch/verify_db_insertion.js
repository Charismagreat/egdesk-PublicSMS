// 데이터베이스 적재 최종 확인 스크립트
// 한국어로 주석 작성

const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

function getDbConnection() {
  const homeDir = os.homedir();
  const appData = process.env.APPDATA || path.join(homeDir, 'AppData/Roaming');
  const dbPath = path.join(appData, 'EGDesk/database/user_data.db');
  return new Database(dbPath);
}

try {
  const db = getDbConnection();
  console.log("로컬 user_data.db에 성공적으로 연결되었습니다.\n");

  // 1. system_mail_logs 조회
  console.log("=== 1. system_mail_logs 테이블 데이터 ===");
  const mailLogs = db.prepare("SELECT id, sender, subject, intent, risk_level, action_type FROM system_mail_logs").all();
  console.log(`총 ${mailLogs.length}개의 메일 로그가 존재합니다.`);
  mailLogs.forEach(row => {
    console.log(`- [${row.risk_level}] ${row.sender}: ${row.subject} (${row.action_type})`);
  });

  // 2. crm_estimates 조회
  console.log("\n=== 2. crm_estimates (견적/발주서) 연동 데이터 ===");
  const estimates = db.prepare("SELECT id, partner_name, total_amount, created_at FROM crm_estimates WHERE id LIKE 'EST-AUTO-%'").all();
  console.log(`자동 생성된 견적서: ${estimates.length}건`);
  estimates.forEach(row => {
    console.log(`- [ID: ${row.id}] ${row.partner_name} - 금액: ${row.total_amount.toLocaleString()}원 (등록일: ${row.created_at})`);
  });

  // 3. crm_snaptasks 조회
  console.log("\n=== 3. crm_snaptasks (품질/협업 스냅태스크) 연동 데이터 ===");
  const tasks = db.prepare("SELECT id, title, status, created_at FROM crm_snaptasks WHERE id LIKE 'TSK-AUTO-%'").all();
  console.log(`자동 생성된 스냅태스크: ${tasks.length}건`);
  tasks.forEach(row => {
    console.log(`- [ID: ${row.id}] ${row.title} - 상태: ${row.status} (등록일: ${row.created_at})`);
  });

  // 4. ai_token_usage_logs 조회 (토큰 사용량 기록 확인)
  console.log("\n=== 4. ai_token_usage_logs (AI 토큰 사용 감사로그) ===");
  const tokenLogs = db.prepare("SELECT purpose, model, total_tokens, created_at FROM ai_token_usage_logs ORDER BY created_at DESC LIMIT 5").all();
  console.log("최근 5개 토큰 로그:");
  tokenLogs.forEach(row => {
    console.log(`- [목적: ${row.purpose}] 모델: ${row.model} | 사용 토큰: ${row.total_tokens} (등록일: ${row.created_at})`);
  });

  db.close();
} catch (err) {
  console.error("데이터베이스 검증 에러:", err);
}
