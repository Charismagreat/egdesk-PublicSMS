import { queryTable, updateRows, insertRows } from '../../../../../../../egdesk-helpers';

export async function handlePurchaseInvoice(reqBody: any, nowStr: string) {
  const { items = [] } = reqBody;
  
  if (items.length === 0) {
    throw new Error('등록할 매입 품목 정보가 없습니다.');
  }

  const trackedItemsRes = await queryTable('tracked_items', {});
  const allTrackedItems = trackedItemsRes.rows || [];
  let maxItemId = allTrackedItems.length > 0 ? Math.max(...allTrackedItems.map((i: any) => Number(i.item_id) || 0)) : 0;

  let updatedCount = 0;
  let insertedCount = 0;

  for (const item of items) {
    const price = Number(item.unitPrice) || 0;
    const itemName = item.itemName || '';
    const spec = item.spec || '';
    
    let targetItemId = item.matched_item_id ? Number(item.matched_item_id) : null;

    if (!targetItemId) {
      const match = allTrackedItems.find((t: any) => 
        t.item_name && t.item_name.trim() === itemName.trim()
      );
      if (match) {
        targetItemId = match.item_id;
      }
    }

    if (targetItemId) {
      await updateRows('tracked_items', {
        base_price: price,
        spec: spec || undefined
      }, { filters: { item_id: String(targetItemId) } });
      updatedCount++;
    } else {
      maxItemId++;
      await insertRows('tracked_items', [{
        item_id: maxItemId,
        item_code: `RAW-AUTO-${Date.now()}-${insertedCount}`,
        item_name: itemName,
        category: 'RAW_MATERIAL',
        spec: spec || '',
        base_price: price,
        target_margin_rate: 10.0,
        created_at: nowStr
      }]);
      insertedCount++;
    }
  }

  return {
    action: 'purchase_invoice_completed',
    updatedCount,
    insertedCount,
    message: `매입 명세서 확정 완료: 총 ${items.length}건 중 기존 원가 갱신 ${updatedCount}건, 신규 품목 자율 등록 ${insertedCount}건이 수행되었습니다.`,
    auditPrompt: `[이지봇 AI 이미지 OCR 자율 대행] 매입 명세서(총 ${items.length}건)를 분석하여 자재 단가 갱신 및 신규 품목 등록을 대행하였습니다.`
  };
}
