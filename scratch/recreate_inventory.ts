import { createTable, deleteTable } from '../egdesk-helpers';

async function setupInventory() {
  try {
    console.log('🔄 Cleaning up old metadata...');
    await deleteTable('inventory_items').catch(() => {});
    await deleteTable('inventory_logs').catch(() => {});

    console.log('🔄 Creating inventory_items table...');
    await createTable(
      '재고 품목',
      [
        { name: 'type', type: 'TEXT', notNull: true }, // 'material' (자재) 또는 'product' (제품)
        { name: 'name', type: 'TEXT', notNull: true }, // 품목명
        { name: 'category', type: 'TEXT', notNull: true }, // 카테고리
        { name: 'price', type: 'REAL', notNull: true }, // 자재는 매입가, 제품은 판매가
        { name: 'partner', type: 'TEXT' }, // 매입 거래처 (자재 전용)
        { name: 'stock', type: 'INTEGER', notNull: true }, // 현재 재고량
        { name: 'safeStock', type: 'INTEGER', notNull: true }, // 안전 재고량
        { name: 'location', type: 'TEXT' }, // 창고 보관 위치
        { name: 'spec', type: 'TEXT' }, // 규격
        { name: 'unitType', type: 'TEXT' }, // 단위 구분 (count, weight, box)
        { name: 'unitValue', type: 'TEXT' }, // 단위 세부 단위명 (g, kg, 등)
        { name: 'boxContains', type: 'INTEGER' }, // 박스당 입수량
        { name: 'description', type: 'TEXT' }, // 품목 설명
        { name: 'tags', type: 'TEXT' }, // 커스텀 멀티 태그 콤마 구분값
        { name: 'barcode', type: 'TEXT' }, // 바코드 번호 (리더기용)
        { name: 'createdAt', type: 'TEXT', notNull: true } // 등록 일자
      ],
      { tableName: 'inventory_items' }
    );
    console.log('✅ inventory_items table created.');

    console.log('🔄 Creating inventory_logs table...');
    await createTable(
      '재고 변동 이력',
      [
        { name: 'itemId', type: 'INTEGER', notNull: true }, // 품목 ID
        { name: 'itemName', type: 'TEXT', notNull: true }, // 품목명
        { name: 'itemType', type: 'TEXT', notNull: true }, // 품목 구분 ('material' / 'product')
        { name: 'changeType', type: 'TEXT', notNull: true }, // 변동 유형 ('in' 입고, 'out' 출고, 'adjust' 실사조정)
        { name: 'quantity', type: 'INTEGER', notNull: true }, // 변동 수량 (실사조정의 경우 조정 후의 최종 수량)
        { name: 'price', type: 'REAL', notNull: true }, // 당시 단가
        { name: 'operator', type: 'TEXT', notNull: true }, // 담당자
        { name: 'note', type: 'TEXT' }, // 변동 사유 / 메모
        { name: 'createdAt', type: 'TEXT', notNull: true } // 발생 시간
      ],
      { tableName: 'inventory_logs' }
    );
    console.log('✅ inventory_logs table created.');

  } catch (error) {
    console.error('❌ Error creating tables:', error);
  }
}

setupInventory();
