import { deleteTable, createTable, insertRows, queryTable } from '../egdesk-helpers';

async function runProperFix() {
  console.log('🔄 [egdesk-helpers 전용 복구] 테이블 메타 정리 및 재생성 가동...\n');

  // 1. 기존에 꼬여있던 프록시 메타 테이블 정보 강제 삭제 (UNIQUE 제약조건 충돌 원천 해결)
  const tablesToReset = ['inventory_items', 'inventory_logs'];
  for (const table of tablesToReset) {
    try {
      console.log(`• [메타 청소] deleteTable("${table}") 실행...`);
      await deleteTable(table);
      console.log(` ✓ "${table}" 메타 데이터 정리 완료.`);
    } catch (e: any) {
      console.log(` ℹ️ "${table}" 메타 정리 건너뜀: ${e.message}`);
    }
  }

  console.log('\n--------------------------------------------------');

  // 2. egdesk-helpers 표준 createTable을 통한 물리 및 메타 테이블 정식 재생성
  try {
    console.log('• [물리 생성] inventory_items 테이블 생성...');
    await createTable(
      '재고 품목',
      [
        { name: 'type', type: 'TEXT', notNull: true },
        { name: 'name', type: 'TEXT', notNull: true },
        { name: 'category', type: 'TEXT', notNull: true },
        { name: 'price', type: 'REAL', notNull: true },
        { name: 'partner', type: 'TEXT' },
        { name: 'stock', type: 'INTEGER', notNull: true },
        { name: 'safeStock', type: 'INTEGER', notNull: true },
        { name: 'location', type: 'TEXT' },
        { name: 'spec', type: 'TEXT' },
        { name: 'unitType', type: 'TEXT' },
        { name: 'unitValue', type: 'TEXT' },
        { name: 'boxContains', type: 'INTEGER' },
        { name: 'description', type: 'TEXT' },
        { name: 'tags', type: 'TEXT' },
        { name: 'barcode', type: 'TEXT' },
        { name: 'createdAt', type: 'TEXT', notNull: true }
      ],
      { tableName: 'inventory_items', uniqueKeyColumns: ['name'], duplicateAction: 'skip' }
    );
    console.log(' ✓ inventory_items 테이블 정식 복원 완료!');
  } catch (e: any) {
    console.error(' ✗ inventory_items 생성 실패:', e.message);
  }

  try {
    console.log('• [물리 생성] inventory_logs 테이블 생성...');
    await createTable(
      '재고 변동 이력',
      [
        { name: 'itemId', type: 'INTEGER', notNull: true },
        { name: 'itemName', type: 'TEXT', notNull: true },
        { name: 'itemType', type: 'TEXT', notNull: true },
        { name: 'changeType', type: 'TEXT', notNull: true },
        { name: 'quantity', type: 'INTEGER', notNull: true },
        { name: 'price', type: 'REAL', notNull: true },
        { name: 'operator', type: 'TEXT', notNull: true },
        { name: 'note', type: 'TEXT' },
        { name: 'createdAt', type: 'TEXT', notNull: true }
      ],
      { tableName: 'inventory_logs' }
    );
    console.log(' ✓ inventory_logs 테이블 정식 복원 완료!');
  } catch (e: any) {
    console.error(' ✗ inventory_logs 생성 실패:', e.message);
  }

  // 3. 정합성 검증 및 기초 더미 데이터 적재
  console.log('\n--------------------------------------------------');
  try {
    const testQuery = await queryTable('inventory_items', { limit: 1 });
    const count = testQuery.rows ? testQuery.rows.length : 0;
    
    if (count === 0) {
      console.log('• [시딩] egdesk-helpers를 통한 안전한 SCM 더미 데이터 적재...');
      const nowStr = new Date().toISOString();
      await insertRows('inventory_items', [
        {
          type: 'material',
          name: '초경량 모터 V2',
          category: '전동부품',
          price: 12500,
          partner: '한성정밀(주)',
          stock: 50,
          safeStock: 15,
          location: 'A홀 3번 선반',
          spec: '15mm',
          unitType: 'count',
          unitValue: '개',
          boxContains: 10,
          description: '고효율 BLDC 모터',
          tags: '사용중',
          barcode: '880123456789',
          createdAt: nowStr
        },
        {
          type: 'product',
          name: '써모글로우 텀블러 500ml',
          category: '리빙웨어',
          price: 8700,
          partner: '글로벌 트레이딩',
          stock: 120,
          safeStock: 30,
          location: 'B홀 12번 적재함',
          spec: '고진공',
          unitType: 'count',
          unitValue: '개',
          boxContains: null,
          description: '진공 텀블러',
          tags: '판매중',
          barcode: '880987654321',
          createdAt: nowStr
        }
      ]);
      console.log(' ✓ 더미 자재 및 완제품 적재 완료!');
    } else {
      console.log(` ✓ 이미 ${count}개의 품목 데이터가 안전하게 존재합니다. 시딩 생략.`);
    }
  } catch (e: any) {
    console.error(' ✗ 데이터 검증 및 적재 실패:', e.message);
  }

  console.log('\n🎉 [egdesk-helpers 복구 성공] 모든 DDL 및 메타 바인딩 완료!');
}

runProperFix();
