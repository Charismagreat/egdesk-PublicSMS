const Database = require('better-sqlite3');
const crypto = require('crypto');

// 💾 AppData 내의 실제 이지데스크 가동용 SQLite3 물리 데이터베이스 절대 경로 설정
const dbPath = 'C:\\Users\\CHARISMA\\AppData\\Roaming\\egdesk\\database\\user_data.db';
console.log(`💾 [Direct DB Access] 실제 이지데스크 물리 DB 연결 시도: ${dbPath}`);
const db = new Database(dbPath);

// 감사추적에 필요한 7대 메타 컬럼 정의
const AUDIT_COLUMNS = [
  'uuid',
  'updated_at',
  'updated_by',
  'deleted_at',
  'deleted_by',
  'restored_at',
  'restored_by'
];

// 대상이 되는 핵심 비즈니스 테이블 목록 (지출 프로젝트 관리 확장 편입)
const TARGET_TABLES = [
  'crm_expenses',
  'crm_operators',
  'crm_customers',
  'crm_partners',
  'crm_estimates',
  'crm_orders',
  'products',
  'expense_projects'
];

async function runMigration() {
  console.log('🚀 [Audit Trail Migration] (Direct Driver AppData Mode) 시작합니다...');
  
  try {
    for (const tableName of TARGET_TABLES) {
      console.log(`\n--- 테이블 [${tableName}] 마이그레이션 분석 중 ---`);
      
      // 1. 해당 테이블의 현재 컬럼 정보 가져오기 (PRAGMA table_info 사용)
      const tableInfo = db.prepare(`PRAGMA table_info("${tableName}");`).all();
      const existingColumns = tableInfo.map(col => col.name);
      
      // PK 컬럼 이름 식별 (보통 'id')
      const pkCol = tableInfo.find(col => col.pk === 1 || col.pk === true)?.name || 'id';
      console.log(`- 식별된 기본키(PK) 컬럼: "${pkCol}"`);

      // 2. 누락된 감사 컬럼 ADD COLUMN (다이렉트 실행)
      for (const col of AUDIT_COLUMNS) {
        if (!existingColumns.includes(col)) {
          console.log(`- 누락 컬럼 감지: "${col}" 컬럼 추가 중...`);
          try {
            db.prepare(`ALTER TABLE "${tableName}" ADD COLUMN "${col}" TEXT;`).run();
            console.log(`  └ 성공: "${col}" 컬럼 추가 완료.`);
          } catch (alterErr) {
            console.error(`  ❌ 실패: "${col}" 컬럼 추가 중 오류:`, alterErr.message);
          }
        } else {
          console.log(`- 컬럼 보존: "${col}" 컬럼이 이미 존재합니다.`);
        }
      }

      // 3. 기존 레코드의 빈 uuid 값을 UUIDv4 고유값으로 일괄 보정 채워넣기
      console.log(`- UUID 무결성 보정 스캔 중...`);
      const rows = db.prepare(`SELECT "${pkCol}", "uuid" FROM "${tableName}";`).all();
      
      let patchedCount = 0;
      
      // 트랜잭션 처리로 고속 보정 진행
      const updateStmt = db.prepare(`UPDATE "${tableName}" SET "uuid" = ? WHERE "${pkCol}" = ?;`);
      
      const transaction = db.transaction((rowsToUpdate) => {
        for (const r of rows) {
          if (!r.uuid || r.uuid === 'null' || r.uuid.trim() === '') {
            const generatedUuid = crypto.randomUUID();
            updateStmt.run(generatedUuid, r[pkCol]);
            patchedCount++;
          }
        }
      });
      
      transaction(rows);

      if (patchedCount > 0) {
        console.log(`  └ 보정 완료: 총 ${patchedCount}개의 레코드에 고유 UUIDv4가 동적 부여되었습니다.`);
      } else {
        console.log(`  └ 보정 생략: 모든 레코드에 고유 UUID가 존재하여 무결합니다.`);
      }
    }

    console.log('\n🎉 [Audit Trail Migration] 7대 주요 비즈니스 테이블 마이그레이션이 완벽히 종료되었습니다!');
    
  } catch (err) {
    console.error('\n❌ 마이그레이션 중 치명적인 오류가 발생했습니다:', err.message);
  } finally {
    db.close();
    console.log('💾 데이터베이스 연결 안전 해제 완료.');
  }
}

runMigration();
