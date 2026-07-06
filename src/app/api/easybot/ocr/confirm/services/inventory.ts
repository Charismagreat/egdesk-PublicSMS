import { queryTable, insertRows, updateRows } from '../../../../../../../egdesk-helpers';

export async function handleInventoryInbound(reqBody: any, nowStr: string) {
  const {
    partnerName,
    inboundDate,
    items = [],
    pdfFilePath,
    operator,
    fileHash
  } = reqBody;

  if (!inboundDate) {
    throw new Error('입고 일자(inboundDate) 정보가 누락되었습니다.');
  }

  // 1) crm_inventory_inbounds 레코드 생성
  const inboundId = 'INB-' + Date.now();
  let totalAmount = 0;

  for (const item of items) {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.price) || 0;
    totalAmount += qty * price;
  }

  await insertRows('crm_inventory_inbounds', [{
    id: inboundId,
    partner_name: partnerName || '',
    inbound_date: inboundDate,
    total_amount: totalAmount,
    pdf_file_path: pdfFilePath || '',
    file_hash: fileHash || '',
    created_at: nowStr,
    updated_at: nowStr
  }]);

  // 2) crm_inventory_inbound_items 상세 품목 추가 및 실제 재고 반영
  const existingItemsRes = await queryTable('inventory_items', {});
  const existingItems = existingItemsRes.rows || [];
  let maxItemId = existingItems.length > 0 ? Math.max(...existingItems.map((i: any) => Number(i.id) || 0)) : 0;

  const existingLogsRes = await queryTable('inventory_logs', {});
  const existingLogs = existingLogsRes.rows || [];
  let maxLogId = existingLogs.length > 0 ? Math.max(...existingLogs.map((l: any) => Number(l.id) || 0)) : 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const inboundItemId = `INB-ITEM-${Date.now()}-${i}`;
    const qty = Number(item.quantity) || 0;
    const price = Number(item.price) || 0;
    const barcode = item.barcode || '';
    const itemName = item.itemName || '';
    const spec = item.spec || '';
    
    let finalMatchedItemId: number | null = null;

    if (item.matchedItemId && item.matchedItemId !== 'NEW') {
      // 2-A. 기존 재고 품목에 가산
      finalMatchedItemId = Number(item.matchedItemId);
      
      const matchCheck = await queryTable('inventory_items', { filters: { id: String(finalMatchedItemId) } });
      if (matchCheck.rows && matchCheck.rows.length > 0) {
        const currentItem = matchCheck.rows[0];
        const newStock = (Number(currentItem.stock) || 0) + qty;
        const rawType = item.itemType || currentItem.type || '자재';
        const normType = (rawType === 'material' || rawType === '자재' || rawType === '원자재' || rawType === '원부자재') ? '원부자재' : '완제품';
        
        // 기존 품목 구분과 입고 승인하려는 구분 간의 일치성 검증
        if (currentItem.type && currentItem.type !== normType) {
          throw new Error(`이미 '${currentItem.type}'으로 등록된 기존 품목('${itemName}', 코드: ITEM-${finalMatchedItemId})에 대해, 다른 구분인 '${normType}'으로의 입고 등록은 불가합니다.`);
        }

        await updateRows('inventory_items', {
          type: normType,
          category: item.category || currentItem.category || '기타',
          stock: newStock,
          price: price > 0 ? price : currentItem.price,
          description: [currentItem.description, item.note].filter(Boolean).join(' | '),
          updated_at: nowStr
        }, { filters: { id: String(finalMatchedItemId) } });


      }
    } else {
      // 2-B. 신규 품목 등록 처리
      maxItemId++;
      finalMatchedItemId = maxItemId;
      const rawType = item.itemType || '자재';
      const normType = (rawType === 'material' || rawType === '자재' || rawType === '원자재' || rawType === '원부자재') ? '원부자재' : '완제품';

      // 동일 품목명 중복 검사 및 타입 일치성 검증
      const sameNameCheck = await queryTable('inventory_items', { filters: { name: itemName } });
      const sameNameRows = (sameNameCheck.rows || []).filter((r: any) => !r.deleted_at);
      if (sameNameRows.length > 0) {
        const existingItem = sameNameRows[0];
        if (existingItem.type !== normType) {
          throw new Error(`이미 '${existingItem.type}'으로 등록된 동일 품목명('${itemName}')이 존재하므로, 다른 구분인 '${normType}'으로의 등록이 불가합니다.`);
        }
      }

      await insertRows('inventory_items', [{
        id: finalMatchedItemId,
        type: normType,
        name: itemName,
        category: item.category || '기타',
        price: price,
        partner: partnerName || '',
        stock: qty,
        safeStock: 0,
        location: item.location || '자율입고창고',
        spec: spec,
        unitType: item.unitType || '개',
        unitValue: '1',
        boxContains: Number(item.boxContains) || 1,
        description: item.note || 'AI 이지봇 자율 입고 OCR 등록 품목',
        barcode: barcode,
        createdAt: nowStr,
        uuid: `ITEM-${Date.now()}-${i}`
      }]);


    }

    await insertRows('crm_inventory_inbound_items', [{
      id: inboundItemId,
      inbound_id: inboundId,
      item_name: itemName,
      spec: spec,
      quantity: qty,
      price: price,
      barcode: barcode,
      matched_item_id: finalMatchedItemId,
      created_at: nowStr
    }]);

    const rawType = item.itemType || '자재';
    const normType = (rawType === 'material' || rawType === '자재' || rawType === '원자재' || rawType === '원부자재') ? '원부자재' : '완제품';
    maxLogId++;
    const logNote = `${partnerName || '미지정 공급처'} | 품목 입고 완료 (inboundId: ${inboundId})` + (pdfFilePath ? ` (증빙: ${pdfFilePath})` : '');
    await insertRows('inventory_logs', [{
      id: maxLogId,
      itemId: finalMatchedItemId,
      itemName: itemName,
      itemType: normType,
      changeType: 'in',
      quantity: qty,
      price: price,
      operator: operator || '최고관리자',
      note: logNote,
      createdAt: nowStr
    }]);
  }

  // 요약 로그 적재는 생략 (루프 내부에서 개별 낱개 로그 적재 완료)

  return {
    action: 'inbound_completed',
    inboundId,
    message: `거래처 [${partnerName || '미지정'}]의 총 ${items.length}개 품목에 대한 자율 입고 처리가 성공적으로 완료되었습니다.`,
    auditPrompt: `[이지봇 AI 이미지 OCR 자율 대행] 거래처 [${partnerName || '미지정'}]의 총 ${items.length}개 품목에 대한 자율 입고 처리를 대행하였습니다.`
  };
}
