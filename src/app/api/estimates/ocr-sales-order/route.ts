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
    try {
      const debugDocs = await queryTable('crm_knowledge_documents', {});
      console.log('🔍 [DEBUG RAG DOCUMENTS]:', JSON.stringify(debugDocs.rows || [], null, 2));
    } catch (e: any) {
      console.log('🔍 [DEBUG RAG FAILURE]:', e.message);
    }

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

    console.log(`📌 [AI OCR SCAN (SalesOrder)]: 수신 파일명='${file.name}', 바이너리 크기=${buffer.byteLength} bytes, Base64 길이=${base64Image.length}`);

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
당신은 B2B 전문 AI 수발주 오퍼레이터입니다. 제공된 수주서(받은 발주서) 파일에서 정보를 정밀하게 추출하여 지침에 따라 정제된 최종 JSON 데이터만 반환하세요. 문서에 없는 항목은 '문서 내에 기재되어 있지 않음' 또는 빈 값("")으로 처리합니다.

다음은 발주서 이미지에서 1차 판독된 명세 리포트 텍스트입니다:
---
${responseTextPass1}
---

[정제 및 비즈니스 룰]
1. 거래처 식별: 공급 주체(수주처) 정보는 'supplier'에, 구매/발주 주체(발주처) 정보는 'buyer' 객체에 정확히 분리 매핑하세요. 담당자 정보나 전화번호가 교차 오인되지 않게 주의하세요. 
2. 날짜 정규화: 문서 작성일(orderDate)과 납기일(deliveryDate)은 표준 ISO 형식(YYYY-MM-DD)으로 출력하세요. 연도가 생략된 경우 작성일 기준으로 연도를 추론하되, 납기 월이 작성일보다 이전 달인 경우에만 해를 넘긴 것으로 판단하여 +1년을 적용하세요.
3. 품목 및 금액 정밀 정합성 검증:
   - 품명에 표 헤더(품명, 품목코드 등)가 섞이지 않게 하세요.
   - 품명 옆 규격 정보를 분리하지 말고 하나의 품목 및 규격('spec')으로 통합하세요. 수량/단가가 0인 유령 품목은 제외합니다.
   - 수량(quantity), 단가(unitPrice), 금액(amount)은 원화 기호나 쉼표를 제외한 정수형태로 추출하세요. 단가와 수량을 최우선 기준으로 삼고, 총액에 오독이나 공백이 발견되면 반드시 [금액 = 수량 * 단가] 수식으로 직접 계산하여 보정하세요.
   - 품목 정보 내에서 'X로 시작하고 뒤에 6자리 숫자가 구성된 패턴(예: X123456)'이 발견되면 'validItemCode'에 기재하고, 없으면 빈 문자열("")을 반환하세요.
4. 비고 및 결재선: 모든 특기사항, 지불조건 등은 줄바꿈(\n)을 포함하여 원본 그대로 'memo'에 전사하고, 결재선 성명은 'approvers' 배열에 담으세요.

최종 JSON 응답 포맷: (Markdown 코드 블록 없이 순수 JSON만 반환)
{
  "supplier": {
    "company_name": "공급 주체 상호명",
    "business_number": "공급 주체 사업자번호 (XXX-XX-XXXXX 형식)",
    "representative": "공급 주체 대표자 성명",
    "address": "공급 주체 주소",
    "phone": "공급 주체 회사 대표 전화번호",
    "fax": "공급 주체 회사 팩스번호",
    "manager_name": "공급 주체 담당자명",
    "manager_phone": "공급 주체 담당자 연락처"
  },
  "buyer": {
    "company_name": "구매/발주 주체 상호명",
    "business_number": "구매/발주 주체 사업자번호 (XXX-XX-XXXXX 형식)",
    "representative": "구매/발주 주체 대표자 성명",
    "address": "구매/발주 주체 주소",
    "phone": "구매/발주 주체 회사 대표 전화번호",
    "fax": "구매/발주 주체 회사 팩스번호",
    "manager_name": "구매/발주 주체 담당자명",
    "manager_phone": "구매/발주 주체 담당자 연락처"
  },
  "picName": "문서 전체 대표 담당자명",
  "picPhone": "문서 전체 대표 담당자 연락처",
  "orderNo": "발주번호",
  "orderDate": "발주일 (YYYY-MM-DD)",
  "deliveryDate": "전체 납기일 (YYYY-MM-DD)",
  "memo": "발주서 비고 및 특이사항 (줄바꿈 포함 전사)",
  "approvers": [
    "결재선 성명 목록"
  ],
  "originalTotalAmount": 0,
  "originalTotalQuantity": 0,
  "items": [
    {
      "itemCode": "품목코드",
      "itemName": "품명",
      "spec": "규격",
      "quantity": 0,
      "unitPrice": 0,
      "amount": 0,
      "deliveryDate": "품목별 납기일 (YYYY-MM-DD)",
      "validItemCode": "X123456 패턴 매핑 코드"
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
          temperature: 0.7
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
    let partnerFax = '';
    
    // 2단계: 자사 역할 비교를 통한 상대방 바이어 정보 추출
    if (isSupplierMyCompany) {
      partnerName = parsedData.buyer?.company_name || '';
      partnerBizNo = parsedData.buyer?.business_number || '';
      partnerRepresentative = parsedData.buyer?.representative || '';
      partnerAddress = parsedData.buyer?.address || '';
      partnerFax = parsedData.buyer?.fax || '';
      
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
      partnerFax = parsedData.supplier?.fax || '';

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
        partnerFax = parsedData.supplier?.fax || '';

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
        partnerFax = parsedData.buyer?.fax || '';

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
      partner_fax: partnerFax || '',
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
      file_url: fileDataUri,
      debug_raw_pass1: responseTextPass1,
      debug_raw_pass2: responseTextPass2
    });

  } catch (error: any) {

    console.error('OCR Sales Order error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
