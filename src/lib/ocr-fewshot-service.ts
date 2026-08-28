import { queryTable, insertRows, executeSQL } from '../../egdesk-helpers';

export interface OcrCorrectionParams {
  tenantId?: string;
  documentType: 'sales_order' | 'estimate' | 'statement' | 'purchase_order' | 'receipt' | 'business_card' | 'license' | string;
  partnerName?: string;
  businessNumber?: string;
  rawData: any;
  correctedData: any;
  operatorName?: string;
}

export interface FewShotQueryParams {
  tenantId?: string;
  documentType: string;
  partnerName?: string;
  businessNumber?: string;
  limit?: number;
}

/**
 * 테이블 생성 및 7종 감사 컬럼 자동 보장
 */
async function ensureFeedbackTableExists() {
  try {
    await executeSQL(`
      CREATE TABLE IF NOT EXISTS ai_ocr_feedback_corrections (
        id TEXT PRIMARY KEY,
        tenant_id TEXT,
        document_type TEXT,
        partner_name TEXT,
        business_number TEXT,
        raw_data TEXT,
        corrected_data TEXT,
        diff_summary TEXT,
        created_by TEXT,
        created_at TEXT,
        uuid TEXT,
        updated_at TEXT,
        updated_by TEXT,
        deleted_at TEXT,
        deleted_by TEXT,
        restored_at TEXT,
        restored_by TEXT
      )
    `);
  } catch (e) {
    // 이미 존재하는 경우 무시
  }
}

/**
 * 원본 OCR 판독값과 사용자 최종 수정값 간의 차이점(Diff) 분석
 */
function computeDiffSummary(raw: any, corrected: any): string[] {
  const diffs: string[] = [];
  if (!raw || !corrected) return diffs;

  // 거래처 메타 필드 비교
  if (raw.partner_name && corrected.partner_name && raw.partner_name !== corrected.partner_name) {
    diffs.push(`[거래처 상호] 원본 '${raw.partner_name}' ➔ 교정 '${corrected.partner_name}'`);
  }
  if (raw.business_number && corrected.business_number && raw.business_number !== corrected.business_number) {
    diffs.push(`[사업자번호] 원본 '${raw.business_number}' ➔ 교정 '${corrected.business_number}'`);
  }
  if (raw.representative && corrected.representative && raw.representative !== corrected.representative) {
    diffs.push(`[대표자명] 원본 '${raw.representative}' ➔ 교정 '${corrected.representative}'`);
  }
  if (raw.document_number && corrected.document_number && raw.document_number !== corrected.document_number) {
    diffs.push(`[문서번호] 원본 '${raw.document_number}' ➔ 교정 '${corrected.document_number}'`);
  }
  if (raw.address && corrected.address && raw.address !== corrected.address) {
    diffs.push(`[주소] 원본 '${raw.address}' ➔ 교정 '${corrected.address}'`);
  }

  // 품목 리스트 비교
  const rawItems = Array.isArray(raw.items) ? raw.items : [];
  const correctedItems = Array.isArray(corrected.items) ? corrected.items : [];

  correctedItems.forEach((cItem: any, idx: number) => {
    const rItem = rawItems[idx];
    const cName = cItem.product_name || cItem.itemName || '';
    const rName = rItem ? (rItem.product_name || rItem.itemName || '') : '';

    if (rName && cName && rName !== cName) {
      diffs.push(`[품목명 #${idx + 1}] 원본 '${rName}' ➔ 교정 '${cName}'`);
    }

    const cCode = cItem.item_code || cItem.itemCode || cItem.validItemCode || '';
    const rCode = rItem ? (rItem.item_code || rItem.itemCode || rItem.validItemCode || '') : '';
    if (rCode && cCode && rCode !== cCode) {
      diffs.push(`[품목코드 #${idx + 1}] 원본 '${rCode}' ➔ 교정 '${cCode}'`);
    }

    const cPrice = Number(cItem.unit_price || cItem.unitPrice || 0);
    const rPrice = Number(rItem ? (rItem.unit_price || rItem.unitPrice || 0) : 0);
    if (rPrice > 0 && cPrice > 0 && rPrice !== cPrice) {
      diffs.push(`[단가 #${idx + 1}] 원본 ${rPrice.toLocaleString()}원 ➔ 교정 ${cPrice.toLocaleString()}원`);
    }
  });

  return diffs;
}

/**
 * 1. 사용자 수정 이력(교정 지식) 적재 API
 */
export async function recordOcrCorrection(params: OcrCorrectionParams): Promise<{ success: boolean; recorded: boolean; diffCount: number }> {
  try {
    await ensureFeedbackTableExists();

    const {
      tenantId = 'default',
      documentType,
      partnerName = '',
      businessNumber = '',
      rawData,
      correctedData,
      operatorName = '사용자'
    } = params;

    if (!rawData || !correctedData) {
      return { success: true, recorded: false, diffCount: 0 };
    }

    const diffs = computeDiffSummary(rawData, correctedData);

    // 수정 사항이 없는 완벽 일치 판독인 경우 학습 레코드 생략
    if (diffs.length === 0) {
      return { success: true, recorded: false, diffCount: 0 };
    }

    const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);
    const recordId = `FDB-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const uuid = `UUID-${recordId}`;

    await insertRows('ai_ocr_feedback_corrections', [{
      id: recordId,
      tenant_id: tenantId,
      document_type: documentType,
      partner_name: partnerName,
      business_number: businessNumber,
      raw_data: typeof rawData === 'string' ? rawData : JSON.stringify(rawData),
      corrected_data: typeof correctedData === 'string' ? correctedData : JSON.stringify(correctedData),
      diff_summary: JSON.stringify(diffs),
      created_by: operatorName,
      created_at: nowStr,
      uuid,
      updated_at: nowStr,
      updated_by: operatorName,
      _version: 1
    }]);

    console.log(`🤖 [AI OCR Few-shot Feedback Recorded]: ${diffs.length}건의 교정 규칙 저장 완료 (ID: ${recordId}, 거래처: ${partnerName})`);
    return { success: true, recorded: true, diffCount: diffs.length };
  } catch (e: any) {
    console.error('OCR 교정 이력 저장 실패:', e.message);
    return { success: false, recorded: false, diffCount: 0 };
  }
}

/**
 * 2. OCR 프롬프트용 Few-shot 교정 지침 생성 API
 */
export async function getFewShotPromptContext(params: FewShotQueryParams): Promise<string> {
  try {
    await ensureFeedbackTableExists();

    const {
      tenantId = 'default',
      documentType,
      partnerName = '',
      businessNumber = '',
      limit = 5
    } = params;

    // 해당 테넌트 및 문서 유형에 대한 최근 교정 이력 조회
    const filters: any = {
      tenant_id: tenantId,
      document_type: documentType
    };

    const res = await queryTable('ai_ocr_feedback_corrections', {
      filters,
      orderBy: 'created_at',
      orderDirection: 'DESC',
      limit: 20
    });

    const rows = (res?.rows || []).filter((r: any) => !r.deleted_at);
    if (rows.length === 0) {
      return '';
    }

    // 동일 거래처 우선 정렬
    const cleanComp = (s: string) => (s || '').replace(/[^가-힣a-zA-Z0-9]/g, '');
    const targetComp = cleanComp(partnerName);

    const relevantRows = rows.filter((r: any) => {
      if (!targetComp) return true;
      const rowComp = cleanComp(r.partner_name);
      return !rowComp || rowComp.includes(targetComp) || targetComp.includes(rowComp);
    }).slice(0, limit);

    if (relevantRows.length === 0) return '';

    const instructionItems: string[] = [];
    relevantRows.forEach((row: any) => {
      try {
        const diffs = JSON.parse(row.diff_summary || '[]');
        if (Array.isArray(diffs) && diffs.length > 0) {
          const partnerTag = row.partner_name ? `[거래처: ${row.partner_name}] ` : '';
          diffs.forEach((d: string) => {
            instructionItems.push(`- ${partnerTag}${d}`);
          });
        }
      } catch (e) {}
    });

    if (instructionItems.length === 0) return '';

    return `
### 💡 [과거 사용자 교정 및 자율 학습 규칙 (Few-Shot In-Context Learning)]
다음은 과거 동일/유사 문서에서 사용자가 직접 수정한 교정 이력입니다. 이번 이미지 판독 및 구조화 시 아래 교정 규칙을 최우선으로 반영하여 정확한 값을 도출하세요:
${instructionItems.slice(0, 10).join('\n')}
`;
  } catch (e: any) {
    console.warn('Few-shot 프롬프트 컨텍스트 생성 실패:', e.message);
    return '';
  }
}
