import { listTables, getTableSchema, queryTable } from '../egdesk-helpers';

async function testList() {
  try {
    console.log('🧪 [테스트 시작] MY DB action=list 에뮬레이션 가동...');
    const tablesRes = await listTables();
    const tablesList = tablesRes.tables || [];
    console.log(`- 전체 테이블 개수: ${tablesList.length}개`);

    for (const t of tablesList.slice(0, 15)) {
      const name = t.tableName || t.name;
      try {
        const schemaInfo = await getTableSchema(name);
        const columns = schemaInfo.schema || [];
        const hasDeletedCol = columns.some((col: any) => col.name === 'deleted_at');
        const hasTenantIdCol = columns.some((col: any) => col.name === 'tenant_id');

        const queryFilters: any = {};
        if (hasTenantIdCol) {
          queryFilters.tenant_id = 'tenant-guest-id-2222';
        }

        let rows: any[] = [];
        let currentOffset = 0;
        const batchSize = 1000;
        
        while (true) {
          const queryRes = await queryTable(name, { 
            limit: batchSize, 
            offset: currentOffset,
            filters: queryFilters 
          });
          const batchRows = queryRes.rows || [];
          rows = rows.concat(batchRows);
          
          if (batchRows.length < batchSize) break;
          currentOffset += batchSize;
        }

        if (hasDeletedCol) {
          rows = rows.filter((r: any) => r.deleted_at === null || r.deleted_at === undefined || r.deleted_at === '');
        }
        console.log(`   ✔ [${name}]: 행 개수 = ${rows.length}개`);
      } catch (err: any) {
        console.error(`   ❌ [${name}] 에러 발생:`, err.message || err);
      }
    }
  } catch (error: any) {
    console.error('❌ 전체 에뮬레이션 실패:', error.message);
  }
}

testList();
