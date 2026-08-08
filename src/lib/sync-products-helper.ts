import { queryTable, insertRows, updateRows } from '../../egdesk-helpers';

/**
 * 재고 완제품의 변경 사항을 상품 테이블(products)에 동기화합니다.
 * @param item 재고 품목 정보 (inventory_items 레코드)
 * @param action CRUD 성격 ('INSERT' | 'UPDATE' | 'DELETE')
 */
export async function syncInventoryToProduct(item: any, action: 'INSERT' | 'UPDATE' | 'DELETE') {
  try {
    // 완제품 판별 (타입 값은 '완제품' 또는 'product' 등 하위 호환성 감안)
    const isFinishedGood = item.type === '완제품' || item.type === 'product';

    // 1. DELETE 액션이거나, UPDATE 시 완제품이 아닌 타입으로 변경된 경우 -> 연동 상품 소프트 삭제
    if (action === 'DELETE' || (action === 'UPDATE' && !isFinishedGood)) {
      const existing = await queryTable('products', { 
        filters: { inventory_item_id: String(item.id) } 
      });
      const rows = existing.rows || [];
      const activeRows = rows.filter((r: any) => !r.deleted_at);

      if (activeRows.length > 0) {
        const ids = activeRows.map((r: any) => r.id);
        const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
        await updateRows('products', { 
          deleted_at: nowStr,
          deleted_by: 'system_sync'
        }, { ids });
        console.log(`[Sync] Soft deleted product(s) linked to inventory item ID: ${item.id}`);
      }
      return;
    }

    // 2. INSERT 또는 UPDATE 이면서 완제품인 경우 -> products에 동기화
    if (isFinishedGood) {
      const existing = await queryTable('products', { 
        filters: { inventory_item_id: String(item.id) } 
      });
      const rows = existing.rows || [];

      const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
      const productPayload: any = {
        tenant_id: item.tenant_id || 'default',
        name: item.name || '',
        price: item.price !== undefined && item.price !== null ? String(item.price) : '0',
        brand: item.brand || '',
        spec: item.spec || '',
        unit: item.unitValue || '',
        description: item.description || '',
        category: item.category || '',
        updated_at: nowStr,
        updated_by: 'system_sync'
      };

      if (rows.length > 0) {
        // 이미 연동된 상품이 있는 경우 -> 정보 업데이트
        const ids = rows.map((r: any) => r.id);
        
        // 만약 기존 상품이 소프트 삭제 처리되어 있었다면 복원
        const deletedRows = rows.filter((r: any) => r.deleted_at);
        if (deletedRows.length > 0) {
          productPayload.deleted_at = null;
          productPayload.deleted_by = null;
          productPayload.restored_at = nowStr;
          productPayload.restored_by = 'system_sync';
        }

        await updateRows('products', productPayload, { ids });
        console.log(`[Sync] Updated existing product linked to inventory item ID: ${item.id}`);
      } else {
        // 연동된 상품이 없는 경우 -> 신규 등록 (DRAFT 상태)
        const newProductId = `PROD-${item.id}`;
        
        // ID 충돌 방지 체크
        const checkDuplicate = await queryTable('products', { filters: { id: newProductId } });
        if (checkDuplicate.rows && checkDuplicate.rows.length > 0) {
          productPayload.id = `${newProductId}-${Math.random().toString(36).substring(2, 6)}`;
        } else {
          productPayload.id = newProductId;
        }

        productPayload.status = 'DRAFT';
        productPayload.inventory_item_id = item.id;
        productPayload.uuid = item.uuid || null;
        productPayload.is_estimate_price = 0;
        productPayload.is_coupon_excludable = 1; // 기본값: 쿠폰 적용 제외(비활성화)

        await insertRows('products', [productPayload]);
        console.log(`[Sync] Created new DRAFT product linked to inventory item ID: ${item.id}`);
      }
    }
  } catch (error) {
    console.error(`[Sync Error] Failed to sync inventory item ${item.id} to products:`, error);
  }
}

/**
 * 기존 모든 완제품 품목(inventory_items)을 products 테이블에 일괄 백필 동기화합니다.
 */
export async function backfillFinishedGoodsToProducts() {
  try {
    const invRes = await queryTable('inventory_items', { limit: 10000 });
    const invItems = invRes.rows || [];
    const finishedGoods = invItems.filter((i: any) => !i.deleted_at && (i.type === '완제품' || i.type === 'product'));
    
    console.log(`[Backfill] Found ${finishedGoods.length} finished goods in inventory_items.`);
    for (const item of finishedGoods) {
      await syncInventoryToProduct(item, 'UPDATE');
    }
  } catch (err: any) {
    console.error('[Backfill Error] Failed to backfill products:', err.message);
  }
}
