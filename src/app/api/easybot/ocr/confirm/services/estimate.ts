import { insertRows, queryTable } from '../../../../../../../egdesk-helpers';

export async function handleInboundEstimate(reqBody: any, nowStr: string) {
  const { partnerName, partnerPhone, estimateDate, items = [], pdfFilePath } = reqBody;

  if (!partnerName) {
    throw new Error('등록할 견적서의 거래처/공급처명(partnerName)이 누락되었습니다.');
  }

  if (items.length === 0) {
    throw new Error('등록할 견적 품목 정보가 없습니다.');
  }

  // 1. 총 합계 금액 산정
  let total_amount = 0;
  const itemRows = items.map((item: any) => {
    const qty = parseInt(item.quantity) || 0;
    const price = parseInt(item.unitPrice || item.unit_price) || 0;
    const amount = qty * price;
    total_amount += amount;

    return {
      product_name: item.productName || item.product_name || item.itemName || '',
      quantity: qty,
      unit_price: price,
      amount: amount,
      matched_item_id: item.matched_item_id ? Number(item.matched_item_id) : null
    };
  });

  // 2. 견적서 고유 식별 마스터 ID 생성 및 UUID 부여
  const estimateId = `EST-${Date.now()}`;
  const uuid = `EST-UUID-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  // 3. crm_estimates 마스터 테이블 삽입
  await insertRows('crm_estimates', [{
    type: 'INBOUND',
    direction_status: 'RECEIVED',
    partner_name: partnerName,
    partner_phone: partnerPhone || '',
    total_amount,
    file_url: pdfFilePath || '',
    ai_parsed: 1,
    uuid,
    created_at: nowStr
  }]);

  // 실제 정수 id 가져오기
  const insertedEstRes = await queryTable('crm_estimates', { filters: { uuid }, limit: 1 });
  const insertedEst = insertedEstRes.rows && insertedEstRes.rows.length > 0 ? insertedEstRes.rows[0] : null;
  const realEstimateId = insertedEst ? String(insertedEst.id) : estimateId;

  // 4. crm_estimate_items 디테일 테이블 품목 삽입
  const detailRows = itemRows.map((row: any, idx: number) => ({
    id: Date.now() + idx,
    estimate_id: realEstimateId,
    product_id: row.matched_item_id ? String(row.matched_item_id) : '',
    product_name: row.product_name,
    quantity: row.quantity,
    unit_price: row.unit_price,
    amount: row.amount
  }));

  await insertRows('crm_estimate_items', detailRows);

  return {
    action: 'inbound_estimate_completed',
    estimateId: realEstimateId,
    message: `받은 견적서 등록 완료: 거래처 [${partnerName}]로부터 총 ${items.length}개 품목(총액 ${total_amount.toLocaleString()}원)의 견적을 정상 연동 접수하였습니다.`,
    auditPrompt: `[이지봇 AI 이미지 OCR 자율 대행] 공급처 [${partnerName}]로부터 접수한 견적서(총 ${items.length}개 품목)를 견적 대장에 등록 대행하였습니다.`
  };
}
