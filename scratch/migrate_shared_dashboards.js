// C:\dev\egdesk-FreeSMS\scratch\migrate_shared_dashboards.js
const { queryTable, deleteTable, createTable, insertRows, getTableSchema } = require('../egdesk-helpers.js');

async function migrate() {
  console.log("=== [1] shared_dashboards 기존 데이터 백업 중 ===");
  let backupRows = [];
  try {
    const res = await queryTable('shared_dashboards', {});
    backupRows = res.rows || [];
    console.log(`✓ 백업 성공: 총 ${backupRows.length}개의 데이터 백업 완료.`);
  } catch (err) {
    console.error("✗ 백업 실패:", err.message);
    return;
  }

  // 1.5. 데이터를 백엔드가 알고 있는 기존 스키마에 맞게 안전 가공
  const processedRows = backupRows.map((row, idx) => {
    return {
      share_id: row.share_id,
      title: row.title,
      sql_query: row.sql_query,
      table_name: row.table_name || '',
      display_name: row.display_name || '',
      chart_spec_json: row.chart_spec_json || '',
      briefing_markdown: row.briefing_markdown || '',
      refresh_interval: row.refresh_interval || 'NONE',
      last_refreshed_at: row.last_refreshed_at || '',
      created_at: row.created_at,
      is_active: row.is_active !== undefined ? Number(row.is_active) : 1,
      // 신규 필드 주입
      sort_order: idx * 10,
      is_pinned: 1, // AI 브리핑 전수 표출용으로 1 설정
      custom_title: row.title // 타이틀을 기본 커스텀 타이틀로 채움
    };
  });

  console.log("=== [2] 기존 shared_dashboards 테이블 삭제 중 ===");
  try {
    await deleteTable('shared_dashboards');
    console.log("✓ 테이블 삭제 완료.");
  } catch (err) {
    console.error("✗ 테이블 삭제 실패:", err.message);
    return;
  }

  console.log("=== [3] 신규 3대 컬럼 확장 스키마로 테이블 재생성 중 ===");
  try {
    await createTable('공유 대시보드 관리', [
      { name: 'share_id', type: 'TEXT', notNull: true },
      { name: 'title', type: 'TEXT', notNull: true },
      { name: 'sql_query', type: 'TEXT', notNull: true },
      { name: 'table_name', type: 'TEXT' },
      { name: 'display_name', type: 'TEXT' },
      { name: 'chart_spec_json', type: 'TEXT' },
      { name: 'briefing_markdown', type: 'TEXT' },
      { name: 'refresh_interval', type: 'TEXT', defaultValue: 'NONE' },
      { name: 'last_refreshed_at', type: 'TEXT' },
      { name: 'created_at', type: 'TEXT', notNull: true },
      { name: 'is_active', type: 'INTEGER', defaultValue: 1 },
      { name: 'sort_order', type: 'INTEGER', defaultValue: 0 },
      { name: 'is_pinned', type: 'INTEGER', defaultValue: 1 },
      { name: 'custom_title', type: 'TEXT' }
    ], { tableName: 'shared_dashboards', uniqueKeyColumns: ['share_id'] });
    console.log("✓ 테이블 재생성 완료.");
  } catch (err) {
    console.error("✗ 테이블 재생성 실패:", err.message);
    return;
  }

  console.log("=== [4] 가공된 백업 데이터 복원 및 인서트 중 ===");
  try {
    if (processedRows.length > 0) {
      await insertRows('shared_dashboards', processedRows);
      console.log(`✓ 복원 완료: 총 ${processedRows.length}개의 행이 새 스키마에 안전 인서트되었습니다.`);
    } else {
      console.log("• 복원할 데이터가 존재하지 않습니다.");
    }
  } catch (err) {
    console.error("✗ 복원 인서트 실패:", err.message);
    return;
  }

  console.log("=== [5] 최종 스키마 정보 정밀 체크 ===");
  try {
    const schemaRes = await getTableSchema('shared_dashboards');
    console.log("✓ 신규 등록된 스키마 컬럼 목록:");
    console.log(JSON.stringify(schemaRes.schema.map(c => `${c.name} (${c.type})`), null, 2));
  } catch (err) {
    console.error("✗ 최종 스키마 체크 실패:", err.message);
  }
  
  console.log("=== 마이그레이션 및 힐링 완료 ===");
}

migrate();
