const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const dbPath = 'C:\\Users\\CHARISMA\\AppData\\Roaming\\egdesk\\database\\user_data.db';
const db = new Database(dbPath);

async function seedAdmin() {
  console.log('🚀 [Seed Admin Account] (Better-sqlite3 Mode) 시작합니다...');
  
  try {
    // 1. 기존 crm_operators에 admin 계정이 존재하는지 확인 (문자열 리터럴 홑따옴표 'admin' 사용!)
    const existing = db.prepare("SELECT id FROM crm_operators WHERE username = 'admin';").get();
    
    if (existing) {
      console.log('- 최고관리자(admin) 계정이 이미 물리 DB 상에 존재합니다.');
    } else {
      console.log('- 최고관리자(admin) 계정 소멸 감지: 초기화 생성을 집행합니다...');
      
      const password_hash = await bcrypt.hash('admin123', 10);
      const dateStr = new Date().toISOString();
      const generatedUuid = crypto.randomUUID();
      
      db.prepare(`
        INSERT INTO crm_operators 
        (id, username, password_hash, name, role, created_at, uuid, updated_at, updated_by, deleted_at, deleted_by, restored_at, restored_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, null, null, null, null, null, null);
      `).run(1, 'admin', password_hash, '최고관리자', 'SUPER_ADMIN', dateStr, generatedUuid);
      
      console.log('  └ 성공: 기본 최고관리자 계정(admin / admin123)이 정식 부활 및 무결 복구되었습니다!');
    }
  } catch (err) {
    console.error('❌ 시딩 중 에러 발생:', err.message);
  } finally {
    db.close();
    console.log('💾 데이터베이스 연결 해제 완료.');
  }
}

seedAdmin();
