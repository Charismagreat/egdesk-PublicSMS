const Database = require('better-sqlite3');
const dbPath = 'C:\\Users\\CHARISMA\\AppData\\Roaming\\egdesk\\database\\user_data.db';
const db = new Database(dbPath);

const AUDIT_FIELDS = [
  'uuid',
  'updated_at',
  'updated_by',
  'deleted_at',
  'deleted_by',
  'restored_at',
  'restored_by'
];

async function scanAuditColumns() {
  console.log('🔍 [Audit Columns Scanner] 물리 DB 전수조사를 시작합니다...');

  try {
    // 1. sqlite_master에서 모든 사용자 정의 테이블 조회 (시스템 테이블 제외)
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
        AND name NOT LIKE 'sqlite_%' 
        AND name NOT LIKE '_cf_%'
      ORDER BY name ASC;
    `).all();

    console.log(`📌 스캔 대상 물리 테이블 총 ${tables.length}개 발견.`);

    const report = [];

    for (const row of tables) {
      const tableName = row.name;

      // 2. 각 테이블의 한글 표시명 user_tables에서 매핑 조회
      const meta = db.prepare('SELECT display_name FROM user_tables WHERE table_name = ?;').get(tableName);
      const displayName = meta ? meta.display_name : '시스템 관리 테이블 (메타데이터 미등록)';

      // 3. 물리 테이블 컬럼 정보 조회
      const tableInfo = db.prepare(`PRAGMA table_info("${tableName}");`).all();
      const existingCols = tableInfo.map(col => col.name.toLowerCase());

      // 4. 감사 컬럼 누락 여부 확인
      const missingFields = [];
      const presentFields = [];

      for (const field of AUDIT_FIELDS) {
        if (!existingCols.includes(field)) {
          missingFields.push(field);
        } else {
          presentFields.push(field);
        }
      }

      report.push({
        tableName,
        displayName,
        totalColumns: tableInfo.length,
        missingCount: missingFields.length,
        missingFields,
        presentFields
      });
    }

    // 5. 결과 콘솔 출력 및 정리
    console.log('\n==================================================');
    console.log('📊 [조사 완료] 감사 컬럼 부재 테이블 목록:\n');

    const missingAll = report.filter(r => r.missingCount === AUDIT_FIELDS.length);
    const missingPartial = report.filter(r => r.missingCount > 0 && r.missingCount < AUDIT_FIELDS.length);
    const complete = report.filter(r => r.missingCount === 0);

    console.log(`✅ 감사 컬럼 완벽 구비 테이블: ${complete.length}개`);
    console.log(`⚠ 일부 누락 테이블: ${missingPartial.length}개`);
    console.log(`❌ 전면 누락 (7대 컬럼 모두 없음) 테이블: ${missingAll.length}개\n`);

    console.log(JSON.stringify({
      complete: complete.map(r => `${r.displayName} (${r.tableName})`),
      partial: missingPartial.map(r => ({ table: `${r.displayName} (${r.tableName})`, missing: r.missingFields })),
      missingAll: missingAll.map(r => `${r.displayName} (${r.tableName})`)
    }, null, 2));

  } catch (err) {
    console.error('❌ 조사 중 에러 발생:', err.message);
  } finally {
    db.close();
    console.log('\n💾 데이터베이스 연결 안전 해제.');
  }
}

scanAuditColumns();
