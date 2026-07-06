const { listTables } = require('../egdesk-helpers');
const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const fs = require('fs');

async function main() {
  console.log('=== EGDesk Server Tables (via listTables) ===');
  try {
    const res = await listTables();
    console.log('listTables 결과 타입:', typeof res);
    if (res && res.tables) {
      console.log('테이블 개수:', res.tables.length);
      console.log('테이블명 목록:', res.tables.map(t => t.tableName));
    } else {
      console.log('res 전체 데이터:', res);
    }
  } catch (err) {
    console.error('listTables 실패:', err.message);
  }

  // 우리가 확인해야 하는 5개 메뉴 관련 테이블 목록
  const targetTables = [
    // 1. 공급망 관리 AI
    'crm_scm_shipments',
    'crm_scm_suppliers',
    // 2. 지원금 관리 AI
    'crm_grant_announcements',
    'crm_grant_bookmarks',
    'crm_grant_company_profile',
    'crm_grant_rnd_plans',
    // 3. 노무 관리 AI
    'crm_labor_stats',
    'crm_labor_contracts',
    // 4. 채권 관리 AI
    'crm_partners',
    'crm_partner_credit_risks',
    // 5. 비밀번호관리 AI (Credential Vault)
    'crm_credential_vault',
    'crm_credential_emergency_requests',
    'crm_credential_audit_logs'
  ];

  console.log('\n=== Local user_data.db Tables ===');
  try {
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
    
    if (dbPath) {
      console.log('DB 경로 발견:', dbPath);
      const db = new Database(dbPath);
      const existingTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);
      
      console.log('\n--- 대상 테이블 생성 확인 결과 ---');
      targetTables.forEach(tableName => {
        const exists = existingTables.includes(tableName);
        console.log(`[${exists ? '생성됨' : '미생성'}] ${tableName}`);
      });
      
      db.close();
    } else {
      console.log('user_data.db를 찾을 수 없습니다.');
    }
  } catch (err) {
    console.error('user_data.db 조회 실패:', err.message);
  }
}

main();
