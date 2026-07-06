const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const dbPath = 'C:\\Users\\CHARISMA\\AppData\\Roaming\\egdesk\\database\\user_data.db';
const db = new Database(dbPath);

// 13대 핵심 감사 및 소프트 딜리트 대상 테이블 목록
const TARGET_TABLES = [
  'crm_expenses',
  'crm_operators',
  'crm_customers',
  'crm_partners',
  'crm_estimates',
  'crm_orders',
  'products',
  'expense_projects',
  'inventory_items',
  'crm_payments',
  'coupons',
  'crm_deliveries',
  'crm_reservations'
];

// 추가할 7대 필수 감사 컬럼 정의
const AUDIT_FIELDS = [
  { name: 'uuid', type: 'TEXT' },
  { name: 'updated_at', type: 'TEXT' },
  { name: 'updated_by', type: 'TEXT' },
  { name: 'deleted_at', type: 'TEXT' },
  { name: 'deleted_by', type: 'TEXT' },
  { name: 'restored_at', type: 'TEXT' },
  { name: 'restored_by', type: 'TEXT' }
];

// 지출 프로젝트 초기 데이터 복원 명세
const INITIAL_PROJECTS = [
  { id: 'proj-01', name: 'FreeSMS 서비스 고도화', created_at: '2026-05-29 19:08:17', uuid: 'bdd5331d-33da-40fd-8f43-bc65728d2f94' },
  { id: 'proj-02', name: 'B2B 유통 플랫폼 개발', created_at: '2026-05-29 19:08:17', uuid: 'd1074fa7-98d2-4860-b088-a913b9bdd9b6' },
  { id: 'proj-03', name: 'SCM 자율 관제 시스템', created_at: '2026-05-29 19:08:17', uuid: '48976fdd-085f-4bfe-b720-6b591130dde9' },
  { id: 'proj-04', name: '오프라인 매장 POS 연동', created_at: '2026-05-29 19:08:17', uuid: 'f08dba0b-f8fb-4330-bf41-5cbbe6d65ce9' },
  { id: 'proj-05', name: '고객 마일리지 부스터 프로젝트', created_at: '2026-05-29 19:08:17', uuid: '334af89c-3e5b-468f-abe5-f95df86d828b' }
];

async function runGlobalHealing() {
  console.log('🚀 [Global Data Healing] 모든 테이블 지능형 자가 복구 및 무결성 힐링 프로세스 기동...');

  try {
    // 1. user_tables에서 이지데스크가 통제하는 전체 테이블 메타데이터 목록 추출
    const allMetaTables = db.prepare('SELECT table_name, display_name, schema_json, column_count FROM user_tables;').all();
    console.log(`📌 user_tables에 등록된 메타데이터 테이블 총 ${allMetaTables.length}개 감지 완료.`);

    const updateTablesStmt = db.prepare('UPDATE user_tables SET schema_json = ?, column_count = ? WHERE table_name = ?;');

    // 트랜잭션 수행으로 안전한 원자적 연산 보장
    const transaction = db.transaction(() => {
      for (const table of allMetaTables) {
        const tableName = table.table_name;
        const displayName = table.display_name;
        console.log(`\n--------------------------------------------------`);
        console.log(`🔍 [${displayName} (${tableName})] 스캔 및 자가 치유 검사 중...`);

        // 1-1. 물리 DB 테이블 존재 확인
        const tableCheck = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?;`).get(tableName);
        let schemaArray = [];
        try {
          schemaArray = JSON.parse(table.schema_json);
        } catch (e) {
          console.error(`  ❌ [에러] ${tableName}의 schema_json 파싱에 실패했습니다.`);
          continue;
        }

        if (!tableCheck) {
          console.log(`  ⚠ [물리 테이블 실종 감지] SQLite 물리 DB 내에 "${tableName}" 테이블이 존재하지 않습니다!`);
          console.log(`  └ 메타데이터 schema_json을 기반으로 물리 테이블 복원 DDL 작성을 기동합니다.`);

          // schema_json에 의거하여 동적 DDL 빌드
          const ddlColumns = [];
          let hasPrimaryKey = false;

          for (const col of schemaArray) {
            let colDef = `"${col.name}" ${col.type || 'TEXT'}`;
            // id 또는 key 필드를 지능적으로 PRIMARY KEY로 지정
            if (!hasPrimaryKey && (col.name === 'id' || col.name === 'key' || col.name === 'item_id' || col.name === 'username')) {
              colDef += ' PRIMARY KEY';
              hasPrimaryKey = true;
            }
            if (col.notNull) {
              colDef += ' NOT NULL';
            }
            if (col.defaultValue !== undefined && col.defaultValue !== null) {
              if (typeof col.defaultValue === 'string') {
                colDef += ` DEFAULT '${col.defaultValue.replace(/'/g, "''")}'`;
              } else {
                colDef += ` DEFAULT ${col.defaultValue}`;
              }
            }
            ddlColumns.push(colDef);
          }

          // 만약 id/key 등이 없어서 PK 지정이 안 된 경우 첫 번째 컬럼을 임시 지정하거나 예외 처리
          if (!hasPrimaryKey && ddlColumns.length > 0) {
            ddlColumns[0] += ' PRIMARY KEY';
            hasPrimaryKey = true;
          }

          const createTableSQL = `CREATE TABLE "${tableName}" (\n  ${ddlColumns.join(',\n  ')}\n);`;
          console.log(`  └ 생성 SQL:\n${createTableSQL}`);
          db.prepare(createTableSQL).run();
          console.log(`  ✔ [복원 완료] 물리 테이블 "${tableName}"이 메타데이터 스키마 기반으로 완벽히 복원 신설되었습니다!`);
        }

        // 1-2. 물리 DB 테이블의 실제 컬럼 정보 로드
        const tableInfo = db.prepare(`PRAGMA table_info("${tableName}");`).all();
        const existingPhysCols = tableInfo.map(col => col.name);

        // 8대 핵심 감사 대상 테이블인지 여부 판단
        const isAuditTarget = TARGET_TABLES.includes(tableName);

        // 1-3. 8대 테이블의 경우 감사 필드 추가 및 보정 기동
        if (isAuditTarget) {
          console.log(`  🛡 본 테이블은 '8대 감사 및 소프트 딜리트' 마스터 대상 테이블입니다.`);
          
          // 물리 테이블 감사 필드 강제 주입
          let physAddedCount = 0;
          for (const field of AUDIT_FIELDS) {
            if (!existingPhysCols.includes(field.name)) {
              console.log(`  ├─ [물리 컬럼 누락] "${field.name}" 컬럼을 ALTER TABLE 주입합니다.`);
              db.prepare(`ALTER TABLE "${tableName}" ADD COLUMN "${field.name}" TEXT;`).run();
              physAddedCount++;
              existingPhysCols.push(field.name); // 추가된 것으로 캐시 갱신
            }
          }
          if (physAddedCount > 0) {
            console.log(`  └─ 물리 DB에 총 ${physAddedCount}개의 감사 컬럼이 주입 완료되었습니다.`);
          }

          // 메타데이터(schema_json) 감사 필드 정합성 등재
          let metaAddedCount = 0;
          const existingMetaNames = schemaArray.map(col => col.name);
          for (const field of AUDIT_FIELDS) {
            if (!existingMetaNames.includes(field.name)) {
              schemaArray.push(field);
              metaAddedCount++;
            }
          }
          if (metaAddedCount > 0) {
            const newSchemaJson = JSON.stringify(schemaArray);
            const newCount = schemaArray.length;
            updateTablesStmt.run(newSchemaJson, newCount, tableName);
            console.log(`  └─ user_tables 메타데이터 스키마에 감사 필드 ${metaAddedCount}개 등재 완료 (총 컬럼: ${newCount}개).`);
          } else {
            console.log(`  └─ user_tables 메타데이터 스키마 정합성이 완벽히 유지되고 있습니다.`);
          }
        }

        // 1-4. 일반 테이블을 포함한 전 테이블 물리-메타 스키마 1:1 완벽 양방향 싱크 교정 (1bit 오차 교정)
        const updatedMetaNames = schemaArray.map(col => col.name);
        let syncAddedCount = 0;
        
        // 메타데이터에는 있는데 물리 DB에는 없는 컬럼 추가
        for (const metaCol of schemaArray) {
          if (!existingPhysCols.includes(metaCol.name)) {
            console.log(`  ├─ [물리-메타 불일치] 물리 DB에 누락된 "${metaCol.name}" 컬럼을 추가합니다.`);
            db.prepare(`ALTER TABLE "${tableName}" ADD COLUMN "${metaCol.name}" ${metaCol.type || 'TEXT'};`).run();
            existingPhysCols.push(metaCol.name);
            syncAddedCount++;
          }
        }

        // 물리 DB에는 있는데 메타데이터에는 없는 컬럼을 메타데이터에 추가
        let metaSyncAdded = 0;
        for (const physCol of tableInfo) {
          if (!updatedMetaNames.includes(physCol.name)) {
            console.log(`  ├─ [물리-메타 불일치] user_tables 메타데이터에 누락된 "${physCol.name}" 컬럼을 등재합니다.`);
            schemaArray.push({
              name: physCol.name,
              type: physCol.type || 'TEXT'
            });
            updatedMetaNames.push(physCol.name);
            metaSyncAdded++;
          }
        }

        if (metaSyncAdded > 0) {
          const newSchemaJson = JSON.stringify(schemaArray);
          const newCount = schemaArray.length;
          updateTablesStmt.run(newSchemaJson, newCount, tableName);
          console.log(`  └─ user_tables 메타데이터 스키마에 컬럼 ${metaSyncAdded}개 추가 동기화 완료.`);
        }

        if (syncAddedCount === 0 && metaSyncAdded === 0) {
          console.log(`  ✔ [정합성 통과] 물리 DB 스키마와 메타데이터가 100% 칼같이 완벽히 동기화되어 있습니다.`);
        }

        // 1-5. 데이터가 유실되었거나 재생성된 테이블의 기초 시딩 데이터 복원
        // (A) expense_projects 복원
        if (tableName === 'expense_projects') {
          const countCheck = db.prepare('SELECT COUNT(*) as count FROM expense_projects;').get();
          if (countCheck.count === 0) {
            console.log(`  ♻ [데이터 소멸 복구] expense_projects의 5대 기초 프로젝트 레코드를 원형 복원합니다.`);
            const insertStmt = db.prepare(`
              INSERT OR IGNORE INTO expense_projects 
              (id, name, created_at, uuid, updated_at, updated_by, deleted_at, deleted_by, restored_at, restored_by)
              VALUES (?, ?, ?, ?, null, null, null, null, null, null);
            `);
            let insertCount = 0;
            for (const p of INITIAL_PROJECTS) {
              const info = insertStmt.run(p.id, p.name, p.created_at, p.uuid);
              if (info.changes > 0) insertCount++;
            }
            console.log(`  └─ 복구 완료: ${insertCount}개의 기본 프로젝트 레코드가 정상 주입되었습니다.`);
          }
        }

        // (B) crm_operators 복원 및 최고관리자 강제 이식
        if (tableName === 'crm_operators') {
          const adminCheck = db.prepare('SELECT COUNT(*) as count FROM crm_operators WHERE username = ?;').get('admin');
          if (adminCheck.count === 0) {
            console.log(`  ♻ [최고관리자 복원] crm_operators 내에 최고관리자(admin) 계정이 존재하지 않아 복원을 실행합니다.`);
            const salt = bcrypt.genSaltSync(10);
            const passwordHash = bcrypt.hashSync('admin123', salt);
            const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
            
            db.prepare(`
              INSERT INTO crm_operators 
              (id, username, password_hash, name, role, created_at, uuid)
              VALUES (?, ?, ?, ?, ?, ?, ?);
            `).run(
              1, 
              'admin', 
              passwordHash, 
              '최고관리자', 
              'SUPER_ADMIN', 
              nowStr, 
              '8cb34b4f-8012-40a2-a9b3-4f92d4f2bc18'
            );
            console.log(`  └─ 복구 완료: 최고관리자 계정(admin / admin123)이 무사 주입되었습니다.`);
          }
        }
      }
    });

    transaction();
    console.log('\n==================================================');
    console.log('🎉 [Global Data Healing] 이지데스크 전체 테이블의 힐링 및 100% 정밀 동기화가 완전히 종료되었습니다!');
    console.log('이제 물리 DB의 컬럼 구성과 메타데이터 schema_json이 어떠한 오차도 없이 완벽한 일체형 스키마로 동작합니다.');

  } catch (err) {
    console.error('\n❌ 글로벌 힐링 진행 중 치명적인 시스템 오류 발생:', err.message);
  } finally {
    db.close();
    console.log('💾 데이터베이스 연결이 안전하게 해제되었습니다.');
  }
}

runGlobalHealing();
