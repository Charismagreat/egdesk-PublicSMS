const Database = require('better-sqlite3');
const dbPath = 'C:\\Users\\CHARISMA\\AppData\\Roaming\\egdesk\\database\\user_data.db';
const db = new Database(dbPath);

const INITIAL_PROJECTS = [
  {
    id: 'proj-01',
    name: 'FreeSMS 서비스 고도화',
    created_at: '2026-05-29 19:08:17',
    uuid: 'bdd5331d-33da-40fd-8f43-bc65728d2f94'
  },
  {
    id: 'proj-02',
    name: 'B2B 유통 플랫폼 개발',
    created_at: '2026-05-29 19:08:17',
    uuid: 'd1074fa7-98d2-4860-b088-a913b9bdd9b6'
  },
  {
    id: 'proj-03',
    name: 'SCM 자율 관제 시스템',
    created_at: '2026-05-29 19:08:17',
    uuid: '48976fdd-085f-4bfe-b720-6b591130dde9'
  },
  {
    id: 'proj-04',
    name: '오프라인 매장 POS 연동',
    created_at: '2026-05-29 19:08:17',
    uuid: 'f08dba0b-f8fb-4330-bf41-5cbbe6d65ce9'
  },
  {
    id: 'proj-05',
    name: '고객 마일리지 부스터 프로젝트',
    created_at: '2026-05-29 19:08:17',
    uuid: '334af89c-3e5b-468f-abe5-f95df86d828b'
  }
];

async function healAndRestore() {
  console.log('🚀 [Heal and Restore Projects] (Better-sqlite3 Mode) 시작합니다...');
  
  try {
    // 1. 물리 DB에 10대 컬럼 구조의 expense_projects 테이블 강제 생성 (CREATE TABLE)
    console.log('- 10대 컬럼 구성의 물리 expense_projects 테이블 생성 중...');
    db.prepare(`
      CREATE TABLE IF NOT EXISTS "expense_projects" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT NOT NULL,
        "created_at" TEXT NOT NULL,
        "uuid" TEXT,
        "updated_at" TEXT,
        "updated_by" TEXT,
        "deleted_at" TEXT,
        "deleted_by" TEXT,
        "restored_at" TEXT,
        "restored_by" TEXT
      );
    `).run();
    console.log('  └ 물리 테이블 생성/확인 완료.');

    // 2. 기존 프로젝트 데이터 5개 원형 복구 주입 (INSERT OR IGNORE)
    console.log('- 5대 기존 지출 프로젝트 데이터 복구 주입 중...');
    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO "expense_projects" 
      (id, name, created_at, uuid, updated_at, updated_by, deleted_at, deleted_by, restored_at, restored_by)
      VALUES (?, ?, ?, ?, null, null, null, null, null, null);
    `);

    const transaction = db.transaction(() => {
      let restoredCount = 0;
      for (const p of INITIAL_PROJECTS) {
        const info = insertStmt.run(p.id, p.name, p.created_at, p.uuid);
        if (info.changes > 0) restoredCount++;
      }
      console.log(`  └ 성공: ${restoredCount}개의 기존 프로젝트 레코드가 완벽하게 원형 복구되었습니다.`);
    });

    transaction();
    console.log('\n🎉 [Heal and Restore] 물리 테이블 복원 및 데이터 구조 동기화가 완벽히 종료되었습니다!');

  } catch (err) {
    console.error('\n❌ 복원 작업 중 에러 발생:', err.message);
  } finally {
    db.close();
    console.log('💾 데이터베이스 연결 해제 완료.');
  }
}

healAndRestore();
