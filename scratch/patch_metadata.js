const Database = require('better-sqlite3');
const dbPath = 'C:\\Users\\CHARISMA\\AppData\\Roaming\\egdesk\\database\\user_data.db';
const db = new Database(dbPath);

// 8대 핵심 감사 테이블 목록
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

// 추가할 7대 필수 감사 컬럼 객체들
const AUDIT_FIELDS = [
  { name: 'uuid', type: 'TEXT' },
  { name: 'updated_at', type: 'TEXT' },
  { name: 'updated_by', type: 'TEXT' },
  { name: 'deleted_at', type: 'TEXT' },
  { name: 'deleted_by', type: 'TEXT' },
  { name: 'restored_at', type: 'TEXT' },
  { name: 'restored_by', type: 'TEXT' }
];

async function patchMetadata() {
  console.log('🚀 [Metadata Forensic Patch] (Better-sqlite3 Mode) 시작합니다...');
  
  try {
    const updateStmt = db.prepare('UPDATE user_tables SET schema_json = ?, column_count = ? WHERE table_name = ?;');
    
    const transaction = db.transaction(() => {
      for (const tableName of TARGET_TABLES) {
        console.log(`\n- 테이블 [${tableName}] 메타데이터 분석 중...`);
        
        // 1. user_tables에서 기존 레코드 정보 획득
        const row = db.prepare('SELECT schema_json FROM user_tables WHERE table_name = ?;').get(tableName);
        
        if (!row) {
          console.log(`  ⚠ 경고: user_tables에 [${tableName}] 명세가 등록되어 있지 않습니다. 패스를 건너뜁니다.`);
          continue;
        }
        
        let schemaArray = JSON.parse(row.schema_json);
        const existingNames = schemaArray.map(col => col.name);
        
        let addedCount = 0;
        
        // 2. 누락 감사 컬럼 밀어넣기
        for (const field of AUDIT_FIELDS) {
          if (!existingNames.includes(field.name)) {
            schemaArray.push(field);
            addedCount++;
          }
        }
        
        if (addedCount > 0) {
          const newSchemaJson = JSON.stringify(schemaArray);
          const newCount = schemaArray.length;
          
          updateStmt.run(newSchemaJson, newCount, tableName);
          console.log(`  └ 성공: ${addedCount}개의 감사 컬럼이 schema_json에 등록되었습니다. (총 컬럼 수: ${newCount})`);
        } else {
          console.log(`  └ 보존: 모든 감사 컬럼이 이미 schema_json 레지스트리에 존재하여 무결합니다.`);
        }
      }
    });
    
    transaction();
    console.log('\n🎉 [Metadata Forensic Patch] 이지데스크 user_tables 스키마 레지스트리 패치가 완벽히 완료되었습니다!');
    
  } catch (err) {
    console.error('\n❌ 패치 중 에러 발생:', err.message);
  } finally {
    db.close();
    console.log('💾 데이터베이스 연결 해제 완료.');
  }
}

patchMetadata();
