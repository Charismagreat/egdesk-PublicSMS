import { NextResponse } from 'next/server';
import { fetchGeminiWithFallback, repairJson } from '../../../../lib/gemini-fallback';
import { executeSQL, insertRows, queryTable, listBusinessIdentitySnapshots, listKnowledgeDocuments, getKnowledgeDocument, getGeminiApiKey } from '../../../../../egdesk-helpers';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';

// 최고 관리자(SUPER_ADMIN/PRESIDENT) 권한 검증 헬퍼
async function verifyAdminRole() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return { isAuthorized: false, role: 'SUB_OPERATOR', username: '' };
  try {
    const payload = decodeJwt(token);
    const role = (payload.role as string || '').toUpperCase();
    const username = payload.username as string || '';
    const isAuthorized = role === 'SUPER_ADMIN' || role === 'PRESIDENT';
    return { isAuthorized, role, username };
  } catch {
    return { isAuthorized: false, role: 'SUB_OPERATOR', username: '' };
  }
}

export const maxDuration = 60; // 60초 타임아웃
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'analyze';

    if (action === 'save') {
      const body = await req.json();
      const { 
        partner_name, partner_phone, partner_manager, items = [], file_url, 
        business_number, representative, address, document_number, document_date, 
        delivery_date, document_memo, approvers = [],
        force_bypass = false, bypass_reason = ''
      } = body;

      const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);

      let bypassApprovedBy = '';
      if (force_bypass) {
        const auth = await verifyAdminRole();
        if (!auth.isAuthorized) {
          return NextResponse.json({ success: false, error: '🔒 권한 차단: 수신인 불일치 문서의 강제 등록 승인은 최고관리자(SUPER_ADMIN)만 가능합니다.' }, { status: 403 });
        }
        bypassApprovedBy = auth.username || auth.role;
      }

      const soId = `SO-${Date.now()}`;
      const nowObj = new Date();
      const yy = String(nowObj.getFullYear()).slice(-2);
      const mm = String(nowObj.getMonth() + 1).padStart(2, '0');
      const dd = String(nowObj.getDate()).padStart(2, '0');
      const hh = String(nowObj.getHours()).padStart(2, '0');
      const min = String(nowObj.getMinutes()).padStart(2, '0');
      const ss = String(nowObj.getSeconds()).padStart(2, '0');
      const estimateId = `ORD-${yy}${mm}${dd}-${hh}${min}${ss}`;
      const uuid = `ORD-UUID-${yy}${mm}${dd}-${hh}${min}${ss}-${Math.random().toString(36).substring(2, 9)}`;

      const tagsObj: any = {
        business_number: business_number || '',
        representative: representative || '',
        address: address || '',
        document_number: document_number || '',
        document_date: document_date || '',
        document_memo: document_memo || '',
        delivery_date: delivery_date || '',
        approvers: approvers || []
      };

      if (force_bypass) {
        tagsObj.bypass_matching = true;
        tagsObj.bypass_approved_by = bypassApprovedBy;
        tagsObj.bypass_reason = bypass_reason;
      }

      const resEst = await insertRows('crm_estimates', [{
        id: estimateId,
        type: 'OUTBOUND',
        direction_status: 'RECEIVED',
        partner_name,
        partner_phone: partner_phone || '',
        partner_manager: partner_manager || '',
        total_amount: items.reduce((acc: number, curr: any) => acc + (curr.quantity * curr.unit_price), 0),
        file_url: file_url || '',
        ai_parsed: 1,
        uuid,
        tags: JSON.stringify(tagsObj),
        sales_order_number: document_number || soId,
        created_at: nowStr
      }]);

      if (!resEst.success) {
        throw new Error('견적서 섀도우 적재에 실패했습니다.');
      }

      const insertedEstRes = await queryTable('crm_estimates', { filters: { uuid }, limit: 1 });
      const insertedEst = insertedEstRes.rows && insertedEstRes.rows.length > 0 ? insertedEstRes.rows[0] : null;
      const realEstimateId = insertedEst ? String(insertedEst.id) : estimateId;

      const detailRows = items.map((row: any, idx: number) => ({
        id: Date.now() + idx,
        estimate_id: realEstimateId,
        product_id: '',
        item_code: row.item_code || '',
        product_name: row.product_name,
        spec: row.spec || '',
        quantity: row.quantity,
        unit_price: row.unit_price,
        amount: row.quantity * row.unit_price,
        delivery_date: row.delivery_date || '',
        valid_item_code: row.valid_item_code || ''
      }));
      await insertRows('crm_estimate_items', detailRows);

      await insertRows('crm_sales_orders', [{
        id: soId,
        estimate_id: realEstimateId,
        client_order_no: document_number || '',
        customer_name: partner_name,
        customer_phone: partner_phone || '',
        customer_manager: partner_manager || '',
        status: 'REGISTERED',
        total_amount: items.reduce((acc: number, curr: any) => acc + (curr.quantity * curr.unit_price), 0),
        delivery_date: delivery_date || '',
        order_date: document_date 
          ? (document_date.trim().replace(/[\.\/]/g, '-').length === 10 
              ? `${document_date.trim().replace(/[\.\/]/g, '-')} ${nowStr.substring(11)}` 
              : document_date.trim().replace(/[\.\/]/g, '-'))
          : nowStr,
        created_at: nowStr
      }]);

      return NextResponse.json({
        success: true,
        message: '발주서 스캔 및 수주 등록이 완료되었습니다.',
        estimateId: realEstimateId,
        soId
      });
    }

    const data = await req.formData();
    const file = data.get('file') as File;
    if (!file) {
      return NextResponse.json({ success: false, error: '파일이 없습니다.' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const base64Image = Buffer.from(buffer).toString('base64');
    const mimeType = file.type || 'image/jpeg';
    const fileDataUri = `data:${mimeType};base64,${base64Image}`;

    const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);

    // 1. DB에서 구글 AI 설정 정보 로드 및 이지데스크 연동 키 조회
    const settingsRes = await queryTable('system_settings', { filters: { key: 'google_ai_api_key' } });
    let googleApiKey = settingsRes.rows && settingsRes.rows.length > 0 ? settingsRes.rows[0].value : null;

    // 만약 DB에 키가 없거나 실물 구글 API 키 형식이 아닌 경우 (SaaS 환경 / ai-caller 활용 등)
    // 이지데스크 프록시를 통해 복호화된 키를 수신하여 구동합니다.
    if (!googleApiKey || !googleApiKey.startsWith('AIzaSy')) {
      try {
        const decryptedKeyRes = await getGeminiApiKey({ name: googleApiKey || '' });
        if (decryptedKeyRes && decryptedKeyRes.success && decryptedKeyRes.apiKey) {
          googleApiKey = decryptedKeyRes.apiKey;
        }
      } catch (keyErr: any) {
        console.error('⚠️ EGDesk에서 실제 구글 API 키를 해독해오는 데 실패했습니다:', keyErr.message);
      }
    }

    // 여전히 키가 없다면 이지데스크가 중계할 수 있도록 'wonconduct'로 폴백 세팅합니다.
    const apiKey = googleApiKey || 'wonconduct';

    const modelRes = await queryTable('system_settings', { filters: { key: 'google_ai_model' } });
    const selectedModel = modelRes.rows && modelRes.rows.length > 0 && modelRes.rows[0].value
      ? modelRes.rows[0].value
      : 'gemini-3.5-flash';

    // RAG 지식 규정 마이닝
    let rlsRulesText = '';
    try {
      let snapshotId = 'default_snapshot';
      const snapshotListRes = await listBusinessIdentitySnapshots();
      const snapshots = snapshotListRes?.snapshots || snapshotListRes || [];
      if (snapshots && snapshots.length > 0) {
        snapshotId = snapshots[0].id || snapshots[0].uuid || snapshotId;
      }
      
      const docsRes = await listKnowledgeDocuments(snapshotId);
      const rawDocs = docsRes?.documents || docsRes || [];
      
      const fullDocs = await Promise.all(
        rawDocs.map(async (d: any) => {
          const docId = d.id || d.document_id || d.uuid;
          if (!d.content && docId) {
            try {
              const detail = await getKnowledgeDocument(docId);
              return { ...d, ...detail };
            } catch (e) {
              return d;
            }
          }
          return d;
        })
      );

      // 승인된 문서 중 '품목코드' 또는 '유효' 등의 키워드가 포함된 문서를 RAG 컨텍스트로 취합
      const approvedRules = fullDocs.filter((d: any) => {
        const contentStr = d.content || '';
        const isApproved = contentStr.includes('**결재상태**: APPROVED') || contentStr.includes('**결재상태**: APPROVED_AUTO') || d.status === 'APPROVED' || d.status === 'APPROVED_AUTO';
        const hasKeyword = contentStr.includes('품목코드') || contentStr.includes('유효') || contentStr.includes('추출') || d.title.includes('품목') || d.title.includes('코드');
        return isApproved && hasKeyword;
      });

      if (approvedRules.length > 0) {
        rlsRulesText = approvedRules.map((d: any, idx: number) => {
          const content = d.content || '';
          const dividerIndex = content.lastIndexOf('\n\n--- \n*   **작성자**:');
          const cleanBody = dividerIndex !== -1 ? content.substring(0, dividerIndex).trim() : content;
          return `[지식규칙 #${idx + 1}] ${d.title}\n${cleanBody}`;
        }).join('\n\n');
      }
    } catch (e) {
      console.error('RAG 지식 마이닝 실패:', e);
    }

    // 본사 프로필 로드 (기본값 주식회사 원컨덕터트레이딩/2428700357)
    let myCompanyProfile = { companyName: '주식회사 원컨덕터트레이딩', businessNumber: '2428700357' };
    try {
      const myCompanySetting = await queryTable('system_settings', { filters: { key: 'my_company_profile' } });
      if (myCompanySetting && myCompanySetting.rows && myCompanySetting.rows.length > 0) {
        const parsed = JSON.parse(myCompanySetting.rows[0].value);
        if (parsed.companyName) myCompanyProfile.companyName = parsed.companyName;
        if (parsed.businessNumber) myCompanyProfile.businessNumber = parsed.businessNumber;
      }
    } catch (e) {
      console.error('본사 프로필 조회 실패:', e);
    }

    // 1차 호출: Pass 1 (Vision OCR - 리스트형 자연어 텍스트 추출)
    const promptPass1 = `
제시된 발주서(수주서) 이미지에서 다음의 정보를 누락 없이 꼼꼼하게 추출하여 마크다운 리포트(Key-Value 목록) 형태로 정확히 작성해 주세요. 
단, 문서 내에 명시되지 않은 항목은 명확하게 '문서 내에 기재되어 있지 않음' 또는 '미식별' 등으로 표기해 주십시오.

### 📌 추출 대상 정보 목록:
1. 발주번호
2. 발주일
3. 바이어 회사명
4. 바이어 회사 대표명
5. 바이어 회사 사업자등록번호
6. 바이어회사 주소
7. 바이어회사 전화번호
8. 바이어회사 팩스번호
9. 바이어 회사 담당자명
10. 바이어회사 담당자 연락처
11. 공급처 회사명
12. 공급처 회사 대표명
13. 공급처 회사 사업자등록번호
14. 공급처회사 주소
15. 공급처회사 전화번호
16. 공급처회사 팩스번호
17. 공급처 회사 담당자명
18. 공급처회사 담당자 연락처
19. 총 수주액
20. 총 수량 (문서 전체 품목의 합계 수량, 만약 문서에 명시되어 있지 않다면 품목 수량을 모두 합산한 값을 기재)
21. 전체납기일
22. 품목 리스트 (각 품목별 순번, 품목코드, 품목명, 규격, 수량, 단가, 금액, 품목별납기일을 테이블 또는 목록 형태로 명확히 기술)
23. 납품장소
24. 상세비고 (위 사항 이외의 모든 주의사항, 특기사항, 지불조건 등 텍스트 전체를 원본 문구와 줄바꿈 그대로 빠짐없이 전사)
25. 결재선 (작성/검토/승인 등 서명 또는 도장 칸에 기재된 성명 목록)
`;

    
const geminiUrlPass1 = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;

    const responsePass1 = await fetchGeminiWithFallback(geminiUrlPass1, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: promptPass1 },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Image
                }
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "text/plain"
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
      })
    });

    if (!responsePass1.ok) {
      throw new Error(`Gemini OCR Pass 1 API 통신 실패: HTTP ${responsePass1.status}`);
    }

    const aiDataPass1 = await responsePass1.json();
    const responseTextPass1 = aiDataPass1.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    if (!responseTextPass1) {
      throw new Error('1차 AI 판독 결과 텍스트가 비어 있습니다.');
    }

    // 2차 호출: Pass 2 (NLP Structuring + RAG 규칙 연동 - 최종 JSON 빌드)
    const promptPass2 = `
당신은 B2B 전문 AI 수발주 오퍼레이터입니다.
다음은 발주서 이미지에서 1차 판독된 명세 리포트 텍스트입니다:
---
${responseTextPass1}
---

### 📌 최종 정제 및 B2B 비즈니스 룰 적용 지침:
1. **자사 매칭 및 상대방 바이어(buyer) / 공급사(supplier) 정보 추출**:
   - 본사 정보: 회사명 "${myCompanyProfile.companyName}", 사업자번호 "${myCompanyProfile.businessNumber}".
   - 1차 판독된 명세 리포트에서 본사 정보와 일치(또는 유사)하는 쪽이 자사(공급받는자 또는 공급자)입니다.
   - 자사가 공급사(수주처)일 경우, 상대 거래처인 바이어(buyer) 정보를 최종 'buyer' 객체에 담으십시오.
   - 자사가 구매사(바이어)일 경우, 상대 거래처인 공급사(supplier) 정보를 최종 'buyer' 객체에 담으십시오. (본 API는 수주등록용이므로 상대방 정보를 최종 'buyer' 객체에 매핑합니다)
   - 둘 다 매치되지 않으면, 발주처(buyer_raw)를 'buyer' 객체에 매핑하고, 공급처(supplier_raw)를 'supplier' 객체에 매핑하십시오.
    - **[거래처 상호명 강제 교정 지침]**:
      * 한글 인쇄 뭉침 등으로 인해 1차 판독에서 자사 혹은 파트너의 회사명이 오독되었다면, 실제 프로필에 준해 올바른 상호명으로 강제 교정하여 출력하십시오.
   - **[담당자 교차 오인 방지]**: 각 업체의 '담당자' 정보를 서로 덮어쓰거나 오인 대입해서는 안 됩니다. 각 소속에 맞게 분리 매핑하십시오. 연락처 없이 이름만 기재되어 있더라도 절대 누락하지 마십시오.
   - **[일반 전화번호와 팩스 번호 분리]**: 전화번호 필드에 팩스(FAX) 번호는 절대 추출하지 마십시오. 접두사에 "FAX", "팩스", "F"가 붙은 번호는 철저히 배제하고, 대표번호나 핸드폰 번호만 선택하여 매핑하십시오.
    - **[설명조 괄호 문구 필터링]**: 1차 판독 리포트 텍스트 내에 위치나 상태를 설명하는 구문(예: "(지상현 정보 아래)", "(체크됨)", "(체크 안됨)", "미식별" 등)이 포함되어 있다면, 최종 JSON에 배정할 때(특히 대표자명, 비고/memo 필드 등) 이를 깨끗이 필터링하여 순수 데이터(예: "금강컨트롤", "지상현")만 추출하십시오. 설명용 안내 문구를 데이터에 그대로 끼워 넣지 마십시오.

2. **날짜 정규화 및 추론**:
   - 문서의 작성일(orderDate)과 품목별 납기일(deliveryDate)을 반드시 표준 ISO 형식인 "YYYY-MM-DD" 형태로 출력하십시오.
   - **[지능형 연도 추론 지침]**:
     - 연도가 생략되어 월/일만 표기된 경우(예: '11/05'), 문서 작성일의 연도를 기준으로 연도를 매핑합니다.
     - 작성일(예: 2025-10-29) 기준으로 납기가 당해 연도 내에 도래하면 당해 연도(2025-11-05)를 그대로 부여하고, 작성일보다 납기 월이 이전 달이어서 해를 넘어가야 하는 경우에만 연도에 +1년을 하십시오. (예: 작성일 2025-10-29, 납기일 01/05 -> 2026-01-05)
     - 당해 연도 내에 있는 납기(예: 10월 작성, 11월 납기)를 임의로 다음 해로 넘겨 판독(예: 2026-11-05)하지 마십시오.

3. **품목 및 수량/단가 정제 (중요)**:
   - 각 품목의 수량(quantity), 단가(unitPrice), 금액(amount)은 숫자로 변환 가능한 정수형태로만 추출(원화 기호, 쉼표 등 제외)하십시오.
   - **[지능형 단가/금액 정합성 수식 검증]**: 발주서 내에 기재된 품목의 단가(unitPrice)와 수량(quantity)을 최우선 기준으로 삼습니다. 발주서의 금액/합계 금액란이 비어 있거나 오독(예: 단가 30000, 수량 8인데 총액이 30000 또는 다른 값으로 꼬여 있는 경우)이 감지되면, **반드시 금액(amount) = 수량(quantity) * 단가(unitPrice) 로 직접 계산하여 보정**하십시오. 단가를 임의로 쪼개어 단가 3750, 금액 30000으로 변조하지 마십시오. 단가 30000과 수량 8이 우선하며, 이 경우 금액은 반드시 240000이 되어야 합니다.
   - **[품명 헤더 혼입 금지]**: 품명 필드에 표 헤더 텍스트(예: '품명', '품목코드' 등)가 섞여 들어가지 않게 배제하십시오.
   - **[독립 품목 중복 방지 및 유령 품목 필터링 지침]**:
     * 표에서 한 행(row)은 하나의 품목을 의미합니다. 순번(No)이 1개만 매겨져 있다면 1개의 품목으로만 추출하십시오.
     * 품명 옆 열에 적힌 명칭(예: 'BAND8')은 독립된 품목이 아닙니다. 해당 품목의 규격('spec') 정보입니다.
     * 예컨대, 품명은 'VI_JOINT'이고 규격은 'BAND8' 및 'S035/0.20/30B'를 조합한 'BAND8 (S035/0.20/30B)'로 매핑하여 단 하나의 품목만 추출해야 합니다.
     * 수량이나 단가가 기재되지 않았거나 0인 유령 품목(예: 수량 0, 단가 0인 품목)을 절대 독립된 품목으로 생성하지 마십시오.
   - **[유효품목코드 (validItemCode)]**: 
${rlsRulesText ? `
   - 다음은 승인된 사내 지식에 근거한 품목코드 변환 규정입니다. 아래 규칙을 엄격히 적용하여 유효품목코드를 판단 및 추출해 주십시오.
${rlsRulesText}
   - 규칙에 부합하는 코드가 식별될 경우 'validItemCode' 필드에 기재하고, 발견되지 않으면 빈 문자열("")로 기재하십시오.
` : `
   - 각 품목의 품명, 규격, 비고 등을 탐색하여 "X로 시작하고 뒤에 6자리 숫자로 구성된 패턴" (예: X123456)을 지닌 사내 실제 품목코드가 발견될 경우, 이를 validItemCode 필드에 기재해 주십시오. 발견되지 않으면 빈 문자열("")을 반환하십시오.
`}

4. **상세비고 (memo) 및 결재자 (approvers)**:
   - 1차 판독된 리포트의 모든 특기사항, 주의사항 등의 원본 텍스트를 줄바꿈('\\n')을 포함해 인쇄된 원본 글자 그대로 전사하십시오. 임의로 문장을 요약하거나 존재하지 않는 텍스트를 창작(환각)하지 마십시오.
   - 결재선에 판독된 결재선 성명 목록을 문자열 배열 형태로 정확히 담아 반환하십시오.

최종 JSON 응답 포맷: (Markdown 코드 블록 없이 순수 JSON만 반환)
{
  "supplier": {
    "company_name": "공급 주체 상호명",
    "business_number": "공급 주체 사업자번호 (XXX-XX-XXXXX 형식, 없으면 \"\")",
    "representative": "공급 주체 대표자 성명",
    "address": "공급 주체 주소",
    "phone": "공급 주체 회사 대표 전화번호 (팩스 제외)",
    "manager_name": "공급 주체 담당자명",
    "manager_phone": "공급 주체 담당자 연락처 (팩스 제외)"
  },
  "buyer": {
    "company_name": "구매/발주 주체 상호명 (상대방 바이어)",
    "business_number": "구매/발주 주체 사업자번호 (XXX-XX-XXXXX 형식, 없으면 \"\")",
    "representative": "구매/발주 주체 대표자 성명",
    "address": "구매/발주 주체 주소",
    "phone": "구매/발주 주체 회사 대표 전화번호 (팩스 제외)",
    "manager_name": "구매/발주 주체 담당자명",
    "manager_phone": "구매/발주 주체 담당자 연락처 (팩스 제외)"
  },
  "picName": "문서 전체 대표 담당자명",
  "picPhone": "문서 전체 대표 담당자 연락처 (팩스 제외)",
  "orderNo": "수주번호 또는 발주번호",
  "orderDate": "수주일 (YYYY-MM-DD 형식)",
  "deliveryDate": "납기일 (YYYY-MM-DD 형식)",
  "memo": "발주서 비고 및 특이사항 (주의사항, 지불조건 등 포함 줄바꿈 전사)",
  "approvers": ["결재선 성명 목록"],
  "originalTotalAmount": 문서상에 적힌 총 금액 (숫자만, 없으면 0),
  "originalTotalQuantity": 문서상에 적힌 총 수량 (숫자만, 없으면 0),
  "items": [
    {
      "itemCode": "품목코드",
      "itemName": "품명",
      "spec": "규격",
      "quantity": 100,
      "unitPrice": 15000,
      "amount": 1500000,
      "deliveryDate": "품목별 납기일 (YYYY-MM-DD 형식)",
      "validItemCode": "사내 지식 규칙(RAG) 또는 패턴에 부합하여 매핑된 품목코드"
    }
  ]
}
Do NOT format or pretty-print the JSON. Return a single-line, compact JSON string without any line breaks or unnecessary spaces. Make it as short as possible to prevent truncation. Do NOT wrap it in markdown code blocks.
`;

    const geminiUrlPass2 = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;

    const responsePass2 = await fetchGeminiWithFallback(geminiUrlPass2, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: promptPass2 }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "text/plain",
          temperature: 0.1
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
      })
    });

    if (!responsePass2.ok) {
      throw new Error(`Gemini OCR Pass 2 API 통신 실패: HTTP ${responsePass2.status}`);
    }

    const aiDataPass2 = await responsePass2.json();
    const responseTextPass2 = aiDataPass2.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    // AI 토큰 사용량 로깅
    try {
      const prompt_tokens = (aiDataPass1.usageMetadata?.promptTokenCount || 0) + (aiDataPass2.usageMetadata?.promptTokenCount || 0);
      const completion_tokens = (aiDataPass1.usageMetadata?.candidatesTokenCount || 0) + (aiDataPass2.usageMetadata?.candidatesTokenCount || 0);
      const total_tokens = prompt_tokens + completion_tokens;
      const logId = `TKC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const logTime = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
      await insertRows('ai_token_usage_logs', [{
        id: logId,
        model: selectedModel || 'gemini-3.5-flash',
        purpose: 'DIRECT_SO_OCR_2PASS',
        prompt_tokens,
        completion_tokens,
        total_tokens,
        created_at: logTime
      }]);
    } catch (e: any) {
      console.error('AI 토큰 로깅 실패:', e.message);
    }

    let parsedData;
    let innerErrMsg = '';
    try {
      const cleanJson = responseTextPass2.replace(/```json/g, '').replace(/```/g, '').trim();
      
      // text/plain 수신에 맞춰 단일 JSON 구문 수리 및 파싱 실행
      try {
        parsedData = JSON.parse(cleanJson);
      } catch (err) {
        console.warn('JSON 파싱 실패, repairJson 작동 시도...');
        try {
          const repaired = repairJson(cleanJson);
          parsedData = JSON.parse(repaired);
        } catch (repairErr: any) {
          innerErrMsg = repairErr.message;
          console.error('JSON Repair 복구 실패:', repairErr.message);
          throw err;
        }
      }
      
    } catch (e: any) {
      console.error('Failed to parse Gemini Pass 2 response:', responseTextPass2);
      throw new Error(`최종 AI 정제 결과를 JSON으로 변환하는 데 실패했습니다. (원인: ${e.message})`);
    }
    
    const { orderNo, orderDate, deliveryDate, items, picName, picPhone } = parsedData;
    if (!items || items.length === 0) {
      console.error('Gemini Pass 2 Response Text:', responseTextPass2);
      throw new Error(`품목을 인식하지 못했습니다. (AI 원본 응답: ${responseTextPass2.substring(0, 70)}... 파싱오류: ${innerErrMsg || '없음'})`);
    }
    
    // 회사명에서 법인 유형(주식회사, (주) 등) 및 특수문자를 제거하여 순수 상호명만 추출하는 헬퍼 함수
    const cleanCompanyName = (name: string): string => {
      if (!name) return '';
      return name
        .replace(/\(주\)/g, '')
        .replace(/주식회사/g, '')
        .replace(/\(유\)/g, '')
        .replace(/유한회사/g, '')
        .replace(/\(합\)/g, '')
        .replace(/합자회사/g, '')
        .replace(/[^가-힣a-zA-Z0-9]/g, '');
    };

    const myBizNum = myCompanyProfile.businessNumber.replace(/\D/g, '');
    const myCompName = cleanCompanyName(myCompanyProfile.companyName);

    const supBiz = (parsedData.supplier?.business_number || '').replace(/\D/g, '');
    const supName = cleanCompanyName(parsedData.supplier?.company_name || '');

    const buyBiz = (parsedData.buyer?.business_number || '').replace(/\D/g, '');
    const buyName = cleanCompanyName(parsedData.buyer?.company_name || '');

    // 1단계: 자사 매칭 판별
    let isSupplierMyCompany = (supBiz && supBiz === myBizNum);
    let isBuyerMyCompany = (buyBiz && buyBiz === myBizNum);

    if (!isSupplierMyCompany && !isBuyerMyCompany) {
      isSupplierMyCompany = (supName && (supName.includes(myCompName) || myCompName.includes(supName)));
      isBuyerMyCompany = (buyName && (buyName.includes(myCompName) || myCompName.includes(buyName)));
    }

    let partnerName = '';
    let partnerBizNo = '';
    let partnerRepresentative = '';
    let partnerAddress = '';
    let partnerManager = '';
    let partnerPhone = '';
    
    // 2단계: 자사 역할 비교를 통한 상대방 바이어 정보 추출
    if (isSupplierMyCompany) {
      partnerName = parsedData.buyer?.company_name || '';
      partnerBizNo = parsedData.buyer?.business_number || '';
      partnerRepresentative = parsedData.buyer?.representative || '';
      partnerAddress = parsedData.buyer?.address || '';
      
      // 공급사(자사) 담당자 정보가 picName/picPhone과 겹치면 상대방 정보로 차용하지 않음 (교차 오염 방지)
      const isPicBelongsToSupplier = 
        (parsedData.supplier?.manager_name && parsedData.supplier?.manager_name === picName) ||
        (parsedData.supplier?.manager_phone && parsedData.supplier?.manager_phone === picPhone);

      partnerManager = parsedData.buyer?.manager_name || (isPicBelongsToSupplier ? '' : picName) || '';
      partnerPhone = parsedData.buyer?.manager_phone || parsedData.buyer?.phone || (isPicBelongsToSupplier ? '' : picPhone) || '';
    } else if (isBuyerMyCompany) {
      partnerName = parsedData.supplier?.company_name || '';
      partnerBizNo = parsedData.supplier?.business_number || '';
      partnerRepresentative = parsedData.supplier?.representative || '';
      partnerAddress = parsedData.supplier?.address || '';

      // 바이어(자사) 담당자 정보가 picName/picPhone과 겹치면 상대방 정보로 차용하지 않음
      const isPicBelongsToBuyer = 
        (parsedData.buyer?.manager_name && parsedData.buyer?.manager_name === picName) ||
        (parsedData.buyer?.manager_phone && parsedData.buyer?.manager_phone === picPhone);

      partnerManager = parsedData.supplier?.manager_name || (isPicBelongsToBuyer ? '' : picName) || '';
      partnerPhone = parsedData.supplier?.manager_phone || parsedData.supplier?.phone || (isPicBelongsToBuyer ? '' : picPhone) || '';
    } else {
      // 자사 정보가 둘 다 불일치하는 경우 (폴백)
      const hasSupBiz = !!supBiz;
      const hasBuyBiz = !!buyBiz;

      // 수주등록용 API이므로 기본 상대방(바이어)은 발주처(buyer)입니다.
      if (hasSupBiz && !hasBuyBiz) {
        partnerName = parsedData.supplier?.company_name || '';
        partnerBizNo = parsedData.supplier?.business_number || '';
        partnerRepresentative = parsedData.supplier?.representative || '';
        partnerAddress = parsedData.supplier?.address || '';

        // 상대방이 공급사이므로, 발주사(buyer) 담당자 정보가 picName/picPhone과 겹치면 차용하지 않음
        const isPicBelongsToBuyer = 
          (parsedData.buyer?.manager_name && parsedData.buyer?.manager_name === picName) ||
          (parsedData.buyer?.manager_phone && parsedData.buyer?.manager_phone === picPhone);

        partnerManager = parsedData.supplier?.manager_name || (isPicBelongsToBuyer ? '' : picName) || '';
        partnerPhone = parsedData.supplier?.manager_phone || parsedData.supplier?.phone || (isPicBelongsToBuyer ? '' : picPhone) || '';
      } else {
        partnerName = parsedData.buyer?.company_name || '';
        partnerBizNo = parsedData.buyer?.business_number || '';
        partnerRepresentative = parsedData.buyer?.representative || '';
        partnerAddress = parsedData.buyer?.address || '';

        // 상대방이 발주사(buyer)이므로, 공급사(supplier) 담당자 정보가 picName/picPhone과 겹치면 차용하지 않음
        const isPicBelongsToSupplier = 
          (parsedData.supplier?.manager_name && parsedData.supplier?.manager_name === picName) ||
          (parsedData.supplier?.manager_phone && parsedData.supplier?.manager_phone === picPhone);

        partnerManager = parsedData.buyer?.manager_name || (isPicBelongsToSupplier ? '' : picName) || '';
        partnerPhone = parsedData.buyer?.manager_phone || parsedData.buyer?.phone || (isPicBelongsToSupplier ? '' : picPhone) || '';
      }
    }

    if (!partnerName) {
      partnerName = parsedData.partnerName || '미확인 바이어';
    }

    // 총 금액 계산
    let total_amount = 0;
    const itemRows = items.map((item: any) => {
      const qty = parseInt(item.quantity) || 0;
      const price = parseInt(item.unitPrice) || 0;
      const amount = qty * price;
      total_amount += amount;

      return {
        item_code: item.itemCode || '',
        product_name: item.itemName || '',
        spec: item.spec || '',
        quantity: qty,
        unit_price: price,
        amount: amount,
        delivery_date: item.deliveryDate || deliveryDate || '', // 품목별 개별 납기일이 파싱되면 쓰고, 없으면 마스터 납기일 폴백
        valid_item_code: item.validItemCode || ''
      };
    });

    // 2. 스키마 자동 마이그레이션 (필요한 컬럼이 없을 경우 대비)
    try {
      await executeSQL('ALTER TABLE crm_sales_orders ADD COLUMN client_order_no TEXT');
    } catch(e) {}
    try {
      await executeSQL('ALTER TABLE crm_sales_orders ADD COLUMN delivery_date TEXT');
    } catch(e) {}
    try {
      await executeSQL('ALTER TABLE crm_sales_orders ADD COLUMN customer_manager TEXT');
    } catch(e) {}
    try {
      await executeSQL('ALTER TABLE crm_estimates ADD COLUMN partner_manager TEXT');
    } catch(e) {}
    try {
      await executeSQL('ALTER TABLE crm_estimate_items ADD COLUMN item_code TEXT');
    } catch(e) {}
    try {
      await executeSQL('ALTER TABLE crm_estimate_items ADD COLUMN spec TEXT');
    } catch(e) {}
    try {
      await executeSQL('ALTER TABLE crm_estimate_items ADD COLUMN delivery_date TEXT');
    } catch(e) {}

    const bypassCheckRes = await queryTable('system_settings', { filters: { key: 'bypass_ocr_receiver_check' } });
    const bypassCheck = bypassCheckRes.rows && bypassCheckRes.rows.length > 0 ? bypassCheckRes.rows[0].value : '0';
    const receiverMatched = (bypassCheck === '1') ? true : (isSupplierMyCompany || isBuyerMyCompany);
    return NextResponse.json({
      success: true,
      receiver_matched: receiverMatched,
      my_company_name: myCompanyProfile.companyName,
      partner_name: partnerName,
      partner_phone: partnerPhone || '',
      partner_manager: partnerManager || '',
      business_number: partnerBizNo,
      representative: partnerRepresentative,
      address: partnerAddress,
      document_number: orderNo || '',
      document_date: orderDate || '',
      delivery_date: deliveryDate || '',
      document_memo: parsedData.memo || '',
      approvers: parsedData.approvers || [],
      originalTotalAmount: Number(parsedData.originalTotalAmount) || total_amount || 0,
      originalTotalQuantity: Number(parsedData.originalTotalQuantity) || itemRows.reduce((sum, it) => sum + it.quantity, 0),
      items: itemRows,
      file_url: fileDataUri
    });

  } catch (error: any) {

    console.error('OCR Sales Order error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
