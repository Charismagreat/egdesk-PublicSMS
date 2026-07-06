export const dynamic = 'force-dynamic';

import { fetchGeminiWithFallback } from '../../../../lib/gemini-fallback';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { queryTable, insertRows, executeSQL } from '../../../../../egdesk-helpers';
import fs from 'fs';
import path from 'path';

/**
 * 사용자 세션 검증 및 사용자명 반환 헬퍼 (최고관리자 및 직원 모두 허용)
 */
async function verifyUserSession(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) {
    // 데모 환경 지원을 위해 첫 번째 직원의 계정명을 반환하여 시연 편의성 제공
    const allOps = await queryTable('crm_operators', { limit: 1 });
    if (allOps.rows && allOps.rows.length > 0) {
      return allOps.rows[0].username;
    }
    return 'admin@egdesk.com';
  }

  try {
    const payload = decodeJwt(token);
    return payload.username as string || 'admin@egdesk.com';
  } catch (err) {
    return 'admin@egdesk.com';
  }
}

/**
 * 사업자등록번호 포맷 정제 헬퍼 ("000-00-00000")
 */
function normalizeBusinessNumber(num: string): string {
  if (!num) return '';
  const digits = num.replace(/\D/g, '');
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
  }
  return num;
}

/**
 * 전화번호 포맷 정규화 헬퍼 (대시 포함)
 */
function normalizePhone(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  } else if (digits.length === 10) {
    if (digits.startsWith('02')) {
      return `02-${digits.slice(2, 6)}-${digits.slice(6)}`;
    } else {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
  } else if (digits.length === 9 && digits.startsWith('02')) {
    return `02-${digits.slice(2, 5)}-${digits.slice(5)}`;
  }
  return phone;
}

/**
 * 🛡️ 대한민국 표준 사업자등록번호 10자리 로컬 체크섬 검증 헬퍼 (Modulo 10)
 */
function validateBusinessNumberChecksum(num: string): boolean {
  if (!num) return false;
  const clean = num.replace(/\D/g, '');
  if (clean.length !== 10) return false;
  
  const keys = [1, 3, 7, 1, 3, 7, 1, 3, 5];
  let sum = 0;
  // 9번째 자리(인덱스 8)는 하단에서 별도 처리되므로, 8번째 자리(인덱스 7)까지만 가중치 곱을 합산합니다.
  for (let i = 0; i < 8; i++) {
    sum += parseInt(clean[i]) * keys[i];
  }
  
  const lastVar = parseInt(clean[8]) * 5;
  sum += Math.floor(lastVar / 10) + (lastVar % 10);
  
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(clean[9]);
}

export async function POST(req: Request) {
  try {
    // 1. 사용자 세션 검증
    const username = await verifyUserSession();

    const { image, action, selectedTypes } = await req.json();

    if (!image) {
      return NextResponse.json({
        success: false,
        error: '분석할 문서 이미지 또는 PDF 데이터(Base64)가 누락되었습니다.'
      }, { status: 400 });
    }

    // Base64 데이터에서 mimeType과 순수 데이터 분리
    let mimeType = 'image/png';
    let base64Data = image;

    if (image.startsWith('data:')) {
      const parts = image.split(';base64,');
      mimeType = parts[0].replace('data:', '');
      base64Data = parts[1];
    }
    // 1.5. 물리 파일 쓰기 제거 및 이미지 데이터 바인딩
    const pdfFilePath = image;

    // 2. DB에서 AI 설정 정보 로드
    const settingsRes = await queryTable('system_settings', { filters: { key: 'google_ai_api_key' } });
    const apiKey = settingsRes.rows && settingsRes.rows.length > 0 ? settingsRes.rows[0].value : null;

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: '구글 AI API 키가 시스템에 등록되지 않았습니다. [시스템 설정 > AI 설정]에서 API 키를 먼저 입력해 주세요.'
      }, { status: 400 });
    }

    const modelRes = await queryTable('system_settings', { filters: { key: 'google_ai_model' } });
    const selectedModel = modelRes.rows && modelRes.rows.length > 0 && modelRes.rows[0].value
      ? modelRes.rows[0].value
      : 'gemini-3.5-flash';

    // 2-1. 1차 작업 종류 추천 모드 지원
    if (action === 'detect_actions') {
      const detectPrompt = `제공된 문서 이미지나 PDF를 분석하여 다음 13가지 작업 타입 중 "가장 매칭 적합도가 높은" 처리 가능한 작업 목록을 추천해 주세요.
적합한 것이 여러 개 있을 수 있으므로, 적합한 타입들을 정렬하여 JSON 배열로 반환해 주세요.

가능한 13가지 작업 타입:
1. "BUSINESS_CARD" (명함 등록)
2. "BUSINESS_LICENSE" (사업자등록증 등록)
3. "RECEIPT" (영수증 지출 품의)
4. "FINANCIAL_STATEMENT" (재무제표 등록)
5. "INVENTORY_INBOUND" (거래명세서 입고)
6. "RESUME" (이력서 분석)
7. "MEDICAL_CERTIFICATE" (병원 진단서/처방전)
8. "PURCHASE_INVOICE" (매입 명세서)
9. "COMPETITOR_PRICE_CAPTURE" (경쟁사 가격 캡처)
10. "FACILITY_PLATE" (설비 제조 명판)
11. "FACILITY_CHECKLIST" (설비 수기 점검표)
12. "LEGAL_DOCUMENT" (소송/법률 문서)
13. "INBOUND_ESTIMATE" (받은 견적서/발주서)

응답 스키마는 반드시 아래 JSON 규격을 준수하여 다른 텍스트 없이 순수 JSON 문자열로만 응답해 주세요.
{
  "suggestedTypes": ["RECEIPT", "BUSINESS_CARD"]
}
`;

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;
      const response = await fetchGeminiWithFallback(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: detectPrompt },
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: base64Data
                  }
                }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini 작업 감지 API 통신 실패: HTTP ${response.status}`);
      }

      const aiData = await response.json();
      const rawText = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error('Gemini AI로부터 작업 감지 응답을 수신하지 못했습니다.');
      }

      const parsedResult = JSON.parse(rawText.trim());
      return NextResponse.json({
        success: true,
        suggestedTypes: parsedResult.suggestedTypes || []
      });
    }

    // RAG 매칭 소스로 쓰일 등록 정보 조회
    const partnersResForRag = await queryTable('crm_partners', {});
    const partnersListForRag = (partnersResForRag.rows || []).map((p: any) => ({ id: p.id, name: p.company_name || p.name }));
    const trackedItemsResForRag = await queryTable('tracked_items', {});
    const trackedItemsListForRag = (trackedItemsResForRag.rows || []).map((t: any) => ({ id: t.item_id, name: t.item_name, code: t.item_code, category: t.category, basePrice: t.base_price }));
    const facilitiesResForRag = await queryTable('crm_facilities', {});
    const facilitiesListForRag = (facilitiesResForRag.rows || []).map((f: any) => ({ id: f.id, name: f.name, model: f.model_name, serial: f.serial_number }));

    // 사용자가 선택한 특정 타입들만 추출하도록 프롬프트 지시 추가
    let typeFilterInstruction = '';
    if (selectedTypes && Array.isArray(selectedTypes) && selectedTypes.length > 0) {
      typeFilterInstruction = `\n[중요 제약 조건] 반드시 사용자가 최종 선택한 다음 작업 타입들만 분석하여 detectedItems 배열 안에 채워주세요: ${JSON.stringify(selectedTypes)}\n그 외의 타입은 분석 대상에서 완전히 제외하고 출력하지 마십시오.\n`;
    }

    const geminiPrompt = `${typeFilterInstruction}제공된 문서 이미지나 PDF 속에는 여러 장의 명함, 사업자등록증, 영수증(지출 증빙), 재무제표, 거래명세서, 이력서(PDF/이미지), 병원 진단서/처방전, 매입 명세서(원가 청구서), 경쟁사 가격 캡처 화면, 설비 제조 명판, 설비 수기 점검표, 또는 법원 소장/송달장/판결문 등의 소송 법률 문서가 혼재되어 있을 수 있습니다.
각 문서들을 지능적으로 개별 검출하여 detectedItems 배열 안에 순서대로 담아 응답해 주세요.

각 아이템은 다음 13가지 타입 중 하나여야 합니다:
1. 명함 ("BUSINESS_CARD"):
   - data 객체에 name (성명), position (직급/직책), phone (전화번호), fax (팩스번호), email (이메일), companyName (회사명/소속) 추출.
2. 사업자등록증 ("BUSINESS_LICENSE"):
   - data 객체에 businessNumber ("000-00-00000" 형태), companyName (상호명), representative (대표자명), address (주소), phone (전화번호), fax (팩스번호), managerName (담당자명), openingDate (개업일 "YYYY-MM-DD"), businessType (업태), businessItem (종목) 추출.
3. 영수증 ("RECEIPT"):
   - data 객체에 title (상호명과 구매품 요약, 예: "CU - 음료 구매"), category (아래 7대 비목 중 가장 잘 어울리는 중분류 하나만 선택: "복리후생비", "여비교통비", "소모품비", "접대비", "임차료", "세금공과금", "기타"), amount (최종 결제 금액, 숫자로만), expense_date (결제일 "YYYY-MM-DD"), payment_method (결제 수단, 예: "법인카드", "개인카드", "현금", "계좌이체" 등), memo (세부 사항 메모), payee (가맹점명 또는 상호명), card_approval_no (신용카드 결제일 경우 영수증 상에 기재된 승인번호 8자리 내외의 숫자 문자열, 현금이나 계좌이체 등 승인번호가 없을 때는 null로 설정) 추출.
4. 재무제표 ("FINANCIAL_STATEMENT"):
   - data 객체에 companyName (회사명), fiscalYear (회계 연도, 숫자로만), fiscalQuarter (분기, 기본값 "YR"), totalAssets (자산총계, 숫자로만), totalLiabilities (부채총계, 숫자로만), totalEquity (자본총계, 숫자로만), revenue (매출액, 숫자로만), operatingIncome (영업이익, 숫자로만), netIncome (당기순이익, 숫자로만) 추출.
   - 또한, data 객체 내부의 parsedRawJson 속성에 대차대조표 and 손익계산서의 세부 계정과목 및 금액 정보를 담은 계층형 트리 JSON 객체를 정밀 추출해 주세요. 이 JSON 객체는 PDF에 기재된 모든 세부 계정과목(예: 현금및현금성자산, 매출채권, 여비교통비, 급여, 임차료 등)의 계층 구조와 원화 단위를 정확히 반영해야 합니다.
5. 거래명세서/바코드 라벨 ("INVENTORY_INBOUND"):
   - data 객체에 partnerName (명세서상의 공급자 상호명 또는 거래처명, 예: "주식회사 원컨덕터"), inboundDate (입고일자 또는 작성일자 "YYYY-MM-DD", 기재되어 있지 않다면 오늘 날짜)와 items 배열을 추출해 주세요.
   - items 배열의 각 요소는 itemName (품명, 예: "구리 와이어"), spec (규격/스펙, 예: "Ø2.0mm", 없을 시 공백), quantity (수량, 숫자로만, 예: 250), price (단가, 숫자로만, 없을 시 0, 예: 12000), barcode (바코드 번호 또는 라벨 식별 번호, 바코드의 기호나 텍스트가 식별되면 기입, 없을 시 공백)를 포함해야 합니다.
6. 이력서 ("RESUME"):
   - data 객체에 name (성명), age (연령/나이, 예: "29세" 또는 "1997년생" 등), phone (전화번호), experience (주요 경력사항 요약 텍스트), motivation (지원동기 요약 텍스트), tech_stacks (보유 기술 스택 목록, 예: "React, Node.js, TypeScript"), matching_score (AI 역량 매칭 점수, 0~100 사이의 정수. 회사의 일반적인 개발/관리 직무 역량 대비 이력서 스펙의 적합도 점수) 추출.
7. 병원 진단서/처방전 ("MEDICAL_CERTIFICATE"):
   - data 객체에 patientName (환자명), diagnosis (진단명/병명), startDate (병가 시작일 "YYYY-MM-DD"), endDate (병가 종료일 "YYYY-MM-DD"), daysSpent (사용 일수, 숫자로만, 예: 3.0) 추출.
8. 매입 명세서 ("PURCHASE_INVOICE"):
   - data 객체에 companyName (매입처/거래처명, 예: "한양철강"), invoiceDate (매입/작성일자 "YYYY-MM-DD", 없으면 오늘)와 items 배열을 추출해 주세요.
   - items 배열의 각 요소는 itemName (품목명, 예: "구리 강선 B형"), spec (규격, 예: "5.0T"), quantity (매입 수량, 숫자로만, 예: 100), unitPrice (매입 단가, 숫자로만, 예: 8200), amount (공급 총액, 숫자로만, 예: 820000)를 포함해야 합니다.
9. 경쟁 가격 캡처 ("COMPETITOR_PRICE_CAPTURE"):
   - data 객체에 competitorName (경쟁사명 또는 수집 사이트명, 예: "LME 시세 정보" 또는 "마켓컬리"), itemName (캡처 화면 속 경쟁 제품/상품명, 예: "구리 전기동"), capturedPrice (경쟁사 판매가, 숫자로만, 예: 8450), captureUrl (매핑용 출처 URL, 있으면 기입) 추출.
10. 설비 제조 명판 ("FACILITY_PLATE"):
    - data 객체에 manufacturer (제조사, 예: "대진중공업"), modelName (모델명/설비명, 예: "M-500"), serialNumber (일련번호/시리얼번호, 예: "SN-M500-9988"), manufactureYear (제조년도, 숫자로만, 예: 2022), specifications (사양 설명 텍스트, 예: "Press Force: 500Ton, Stroke: 400mm") 추출.
11. 설비 수기 점검표 ("FACILITY_CHECKLIST"):
    - data 객체에 equipmentId (점검 대상 설비 ID, 예: "EQ-PRESS-01" 또는 "EQ-PRESS-02" 등), inspector (점검자 성함), checkDate (점검일자 "YYYY-MM-DD", 없으면 오늘)와 checks 배열을 추출해 주세요.
    - checks 배열의 각 요소는 checkItem (점검 항목명, 예: "가열 압력 상태" 또는 "비상 정지 장치 작동"), status (점검 상태 배지, 양호일 시 "PASS", 불량/조치필요 시 "FAIL"), comment (점검 특이사항 코멘트, 없으면 공백)를 포함해야 합니다.
12. 소송/법률 문서 ("LEGAL_DOCUMENT"):
    - data 객체에 documentType (문서 구분, 예: "소장", "지급명령 송달장", "판결문" 등), caseNumber (사건번호, 예: "2026가소12345"), summary (사건 및 서류 핵심 요약), deadline (답변서 기한 및 법적 마감일 "YYYY-MM-DD" 혹은 없을 시 null), actions (권장 즉시 행동 조치 목록 배열) 추출.
13. 받은 견적서 및 바이어 발주서 ("INBOUND_ESTIMATE"):
    - data 객체에 partnerName (견적서/발주서를 발행한 거래처/공급처명, 예: "태백유통(주)"), partnerPhone (연락처, 없으면 빈 문자열 ""), buyerName (수신인/공급받는자/주문처리자 상호명, 없으면 빈 문자열 ""), buyerBusinessNumber (수신인/공급받는자 사업자번호, 없으면 ""), items 배열 추출.
    - items 배열의 각 요소는 productName (품목명, 예: "친환경 생분해 컵"), quantity (수량, 숫자로만, 예: 50), unitPrice (단가, 숫자로만, 예: 1500), amount (공급 금액, 수량 * 단가, 숫자로만, 예: 75000)를 포함해야 합니다.

사내 등록된 거래처 정보(RAG):
${JSON.stringify(partnersListForRag)}

사내 등록된 가격 추적 품목 정보(RAG):
${JSON.stringify(trackedItemsListForRag)}

사내 등록된 설비 정보(RAG):
${JSON.stringify(facilitiesListForRag)}

추출한 값들은 반드시 아래 JSON 스키마 규격을 빈틈없이 준수하여 순수 JSON 문자열로만 응답해 주세요. 다른 마크다운 백틱(\`\`\`) 기호나 텍스트는 절대 포함하지 마세요.

응답 JSON 스펙 예시:
{
  "detectedItems": [
    {
      "itemType": "LEGAL_DOCUMENT",
      "data": {
        "documentType": "지급명령 송달장",
        "caseNumber": "2026차단98765",
        "summary": "원고 주식회사 한성철강이 대금 미지급 건으로 제기한 지급명령서입니다.",
        "deadline": "2026-06-28",
        "actions": [
          "송달일로부터 2주 이내에 이의신청서를 법원에 제출해야 합니다.",
          "계약서 및 세금계산서 발행 내역을 취합하십시오."
        ]
      }
    },
    {
      "itemType": "FINANCIAL_STATEMENT",
      "data": {
        "companyName": "대선기공",
        "fiscalYear": 2025,
        "fiscalQuarter": "YR",
        "totalAssets": 120000000,
        "totalLiabilities": 80000000,
        "totalEquity": 40000000,
        "revenue": 150000000,
        "operatingIncome": 12000000,
        "netIncome": 9000000,
        "parsedRawJson": {
          "재무상태표": {
            "자산": {
              "유동자산": {
                "현금및현금성자산": 30000000,
                "매출채권": 50000000
              },
              "비유동자산": {
                "유형자산": 40000000
              }
            },
            "부채": {
              "유동부채": 80000000
            },
            "자본": {
              "자본금": 40000000
            }
          },
          "손익계산서": {
            "매출액": 150000000,
            "매출원가": 100000000,
            "판매비와관리비": {
              "급여": 20000000,
              "여비교통비": 5000000,
              "복리후생비": 13000000
            },
            "영업이익": 12000000,
            "당기순이익": 9000000
          }
        }
      }
    }
  ]
}
`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;
    const response = await fetchGeminiWithFallback(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: geminiPrompt },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Data
                }
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          maxOutputTokens: 8192,
          temperature: 0.7
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini 하이브리드 OCR API 통신 실패: HTTP ${response.status}`);
    }

    const aiData = await response.json();
    const rawText = aiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      throw new Error('Gemini AI로부터 분석 응답을 수신하지 못했습니다.');
    }

    // 🛡️ AI API 토큰 실시간 모니터링 및 호출 토큰 감사록 기록 적재
    try {
      const u = aiData.usageMetadata || {};
      const promptTokens = u.promptTokenCount || 0;
      const completionTokens = u.candidatesTokenCount || 0;
      const totalTokens = u.totalTokenCount || 0;

      if (totalTokens > 0) {
        const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
        await insertRows('ai_token_usage_logs', [{
          id: `TKC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          model: selectedModel,
          purpose: 'EASYBOT_OCR_SCAN',
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: totalTokens,
          created_at: nowStr
        }]);
      }
    } catch (logErr) {
      console.error('이지봇 OCR AI 토큰 사용량 감사 로그 적재 실패:', logErr);
    }

    // AI 추출 데이터 JSON 파싱
    let parsedResult;
    try {
      parsedResult = JSON.parse(rawText.trim());
    } catch (err) {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0].trim());
      } else {
        throw new Error('AI 하이브리드 분석 응답 포맷이 올바르지 않습니다.');
      }
    }

    // 4. 멀티 엔티티 데이터 파싱 및 보정 루프 처리
    let detectedItems = parsedResult.detectedItems || [];
    
    // 레거시 단일 응답에 대한 하위 호환성 보장
    if (detectedItems.length === 0 && parsedResult.fileType) {
      if (parsedResult.fileType === 'BUSINESS_CARD') {
        detectedItems.push({
          itemType: 'BUSINESS_CARD',
          data: parsedResult.cardData || {}
        });
      } else if (parsedResult.fileType === 'BUSINESS_LICENSE') {
        detectedItems.push({
          itemType: 'BUSINESS_LICENSE',
          data: parsedResult.licenseData || {}
        });
      }
    }

    // 국세청 검증용 API 키 로드
    const ntsKeyRes = await queryTable('system_settings', { filters: { key: 'nts_api_key' } });
    let ntsApiKey = ntsKeyRes.rows && ntsKeyRes.rows.length > 0 ? ntsKeyRes.rows[0].value : null;
    if (!ntsApiKey) {
      ntsApiKey = process.env.NTS_BUSINESS_API_KEY || null;
    }

    const inventoryItemsRes = await queryTable('inventory_items', {});
    const allInventoryItems = inventoryItemsRes.rows || [];

    const trackedItemsRes = await queryTable('tracked_items', {});
    const allTrackedItems = trackedItemsRes.rows || [];

    // 본사 프로필 로드 (기본값 주식회사 원컨덕터트레이딩/2428700357)
    let myCompanyName = '주식회사 원컨덕터트레이딩';
    let myCompanyBizNo = '2428700357';
    try {
      const myCompanySetting = await queryTable('system_settings', { filters: { key: 'my_company_profile' } });
      if (myCompanySetting.rows && myCompanySetting.rows.length > 0) {
        const parsed = JSON.parse(myCompanySetting.rows[0].value);
        if (parsed.companyName) myCompanyName = parsed.companyName;
        if (parsed.businessNumber) myCompanyBizNo = parsed.businessNumber;
      }
    } catch (e) {
      console.error('본사 정보 설정 조회 실패:', e);
    }

    const processedItems = [];

    for (const item of detectedItems) {
      // 명함 처리 분기
      if (item.itemType === 'BUSINESS_CARD') {
        const cardData = item.data || {};
        const cleanedPhone = normalizePhone(cardData.phone || '');
        const cleanedFax = normalizePhone(cardData.fax || '');

        const parsedCard = {
          name: cardData.name ? cardData.name.trim() : '',
          position: cardData.position ? cardData.position.trim() : '',
          phone: cleanedPhone,
          fax: cleanedFax,
          email: cardData.email ? cardData.email.trim() : '',
          companyName: cardData.companyName ? cardData.companyName.trim() : ''
        };

        const partnerRes = await queryTable('crm_partners', { filters: { company_name: parsedCard.companyName } });
        let partnerId = partnerRes.rows && partnerRes.rows.length > 0 ? partnerRes.rows[0].id : null;

        if (!partnerId && parsedCard.companyName) {
          const fuzzyRes = await queryTable('crm_partners', {});
          const match = fuzzyRes.rows.find((p: any) => p.company_name.includes(parsedCard.companyName) || parsedCard.companyName.includes(p.company_name));
          if (match) partnerId = match.id;
        }

        let actionType = 'new_contact';
        let existingContactId = null;
        let existingContact = null;

        const contactsRes = await queryTable('crm_partner_contacts', { filters: { name: parsedCard.name, is_active: '1' } });
        const activeContacts = contactsRes.rows || [];

        if (activeContacts.length > 0) {
          const contact = activeContacts[0];
          existingContact = contact;
          const contactPartnerRes = await queryTable('crm_partners', { filters: { id: contact.partner_id } });
          const currentCompanyName = contactPartnerRes.rows && contactPartnerRes.rows.length > 0 ? contactPartnerRes.rows[0].company_name : '';

          if (currentCompanyName === parsedCard.companyName) {
            actionType = 'update_info';
            existingContactId = contact.id;
          } else {
            actionType = 'career_transition';
            existingContactId = contact.id;
          }
        }

        processedItems.push({
          itemType: 'BUSINESS_CARD',
          data: parsedCard,
          partnerId,
          actionType,
          existingContactId,
          existingContact
        });

      // 사업자등록증 처리 분기
      } else if (item.itemType === 'BUSINESS_LICENSE') {
        const licenseData = item.data || {};
        const cleanedBizNumber = normalizeBusinessNumber(licenseData.businessNumber || '');
        const cleanedLicensePhone = normalizePhone(licenseData.phone || '');
        const cleanedLicenseFax = normalizePhone(licenseData.fax || '');

        const ocrInfo = {
          businessNumber: cleanedBizNumber,
          companyName: licenseData.companyName ? licenseData.companyName.trim() : '',
          representative: licenseData.representative ? licenseData.representative.trim() : '',
          address: licenseData.address ? licenseData.address.trim() : '',
          phone: cleanedLicensePhone,
          fax: cleanedLicenseFax,
          managerName: licenseData.managerName ? licenseData.managerName.trim() : '',
          openingDate: licenseData.openingDate || '',
          businessType: licenseData.businessType || '',
          businessItem: licenseData.businessItem || ''
        };

        const isChecksumValid = validateBusinessNumberChecksum(ocrInfo.businessNumber);

        let ntsVerification = {
          isValidated: false,
          status: 'UNKNOWN',
          statusText: '국세청 실시간 조회 보류 (API 키 미등록)',
          taxType: '',
          closedDate: ''
        };

        if (ntsApiKey && isChecksumValid) {
          try {
            const rawNum = ocrInfo.businessNumber.replace(/\D/g, '');
            const ntsUrl = `https://api.odcloud.kr/api/nts-businessman/v1/status?serviceKey=${ntsApiKey}`;
            const ntsRes = await fetch(ntsUrl, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify({ b_no: [rawNum] })
            });

            if (ntsRes.ok) {
              const ntsResData = await ntsRes.json();
              const bizStatus = ntsResData.data?.[0];

              if (bizStatus) {
                let status = 'NOT_FOUND';
                let statusText = '국세청 미등록 사업자';
                if (bizStatus.b_stt_cd === '01') {
                  status = 'ACTIVE';
                  statusText = '정상 계속사업자 (가동중)';
                } else if (bizStatus.b_stt_cd === '02') {
                  status = 'SUSPENDED';
                  statusText = `휴업 사업자 (휴업일: ${bizStatus.end_dt || '미상'})`;
                } else if (bizStatus.b_stt_cd === '03') {
                  status = 'CLOSED';
                  statusText = `폐업 사업자 (폐업일자: ${bizStatus.end_dt || '미상'})`;
                }

                ntsVerification = {
                  isValidated: true,
                  status,
                  statusText,
                  taxType: bizStatus.tax_type || '',
                  closedDate: bizStatus.end_dt || ''
                };
              }
            }
          } catch (ntsErr) {
            console.error('NTS API Error in loop:', ntsErr);
            ntsVerification.statusText = '국세청 API 호출 실패 (서버 연결 불안정)';
          }
        }

        const cleanBizNoForMatch = ocrInfo.businessNumber.replace(/\D/g, '');
        let rows: any[] = [];
        try {
          const allPartnersRes = await queryTable('crm_partners', {});
          const allPartners = allPartnersRes.rows || [];
          rows = allPartners.filter((p: any) => 
            !p.deleted_at && 
            (p.business_number || '').replace(/\D/g, '') === cleanBizNoForMatch
          );
        } catch (dbErr) {
          console.error('DB 중복 조회 실패:', dbErr);
        }

        const checksumResult = {
          isValid: isChecksumValid,
          message: isChecksumValid ? '체크섬 공식 통과' : '잘못된 사업자번호 형식'
        };

        if (rows.length === 0) {
          processedItems.push({
            itemType: 'BUSINESS_LICENSE',
            status: 'NEW_PARTNER',
            data: ocrInfo,
            checksum: checksumResult,
            nts: ntsVerification
          });
        } else {
          const existingPartner = rows[0];
          const dbCompanyName = (existingPartner.company_name || '').trim();
          const dbRepresentative = (existingPartner.representative || '').trim();
          const dbAddress = (existingPartner.address || '').trim();

          const isCompanyNameChanged = ocrInfo.companyName !== '' && dbCompanyName !== ocrInfo.companyName;
          const isRepresentativeChanged = ocrInfo.representative !== '' && dbRepresentative !== ocrInfo.representative;
          const isAddressChanged = ocrInfo.address !== '' && dbAddress !== ocrInfo.address;

          const isChanged = isCompanyNameChanged || isRepresentativeChanged || isAddressChanged;

          if (isChanged) {
            const diff = {
              companyName: { old: dbCompanyName, new: ocrInfo.companyName, changed: isCompanyNameChanged },
              representative: { old: dbRepresentative, new: ocrInfo.representative, changed: isRepresentativeChanged },
              address: { old: dbAddress, new: ocrInfo.address, changed: isAddressChanged }
            };

            processedItems.push({
              itemType: 'BUSINESS_LICENSE',
              status: 'UPDATE_PARTNER',
              data: ocrInfo,
              existingId: existingPartner.id,
              existingType: existingPartner.type,
              diff,
              checksum: checksumResult,
              nts: ntsVerification
            });
          } else {
            processedItems.push({
              itemType: 'BUSINESS_LICENSE',
              status: 'ALREADY_REGISTERED',
              data: ocrInfo,
              existingId: existingPartner.id,
              existingType: existingPartner.type,
              checksum: checksumResult,
              nts: ntsVerification
            });
          }
        }

      // 영수증 처리 분기
      } else if (item.itemType === 'RECEIPT') {
        const receiptData = item.data || {};
        processedItems.push({
          itemType: 'RECEIPT',
          data: {
            title: receiptData.title || '',
            category: receiptData.category || '복리후생비',
            amount: Number(receiptData.amount) || 0,
            expense_date: receiptData.expense_date || new Date().toISOString().slice(0, 10),
            payment_method: receiptData.payment_method || '법인카드',
            memo: receiptData.memo || '',
            payee: receiptData.payee || receiptData.merchant || '',
            card_approval_no: receiptData.card_approval_no || null
          }
        });

      } else if (item.itemType === 'FINANCIAL_STATEMENT') {
        const finData = item.data || {};
        const ocrInfo = {
          companyName: finData.companyName ? finData.companyName.trim() : '',
          fiscalYear: Number(finData.fiscalYear) || new Date().getFullYear() - 1,
          fiscalQuarter: finData.fiscalQuarter || 'YR',
          totalAssets: Number(finData.totalAssets) || 0,
          totalLiabilities: Number(finData.totalLiabilities) || 0,
          totalEquity: Number(finData.totalEquity) || 0,
          revenue: Number(finData.revenue) || 0,
          operatingIncome: Number(finData.operatingIncome) || 0,
          netIncome: Number(finData.netIncome) || 0,
          parsedRawJson: finData.parsedRawJson || {}
        };

        // 본사 및 거래처 매칭 판별
        let partnerId = null;
        let companyType = 'PARTNER';
        let matchedCompanyName = '';

        const myCompanySetting = await queryTable('system_settings', { filters: { key: 'my_company_profile' } });
        let myCompanyName = '';
        if (myCompanySetting.rows && myCompanySetting.rows.length > 0) {
          try {
            const profile = JSON.parse(myCompanySetting.rows[0].value);
            myCompanyName = profile.companyName || '';
          } catch (e) {}
        }

        if (ocrInfo.companyName && myCompanyName && (ocrInfo.companyName.includes(myCompanyName) || myCompanyName.includes(ocrInfo.companyName))) {
          partnerId = 'MY-COMPANY';
          companyType = 'MY_COMPANY';
          matchedCompanyName = myCompanyName;
        } else if (ocrInfo.companyName) {
          const partnerRes = await queryTable('crm_partners', { filters: { company_name: ocrInfo.companyName } });
          if (partnerRes.rows && partnerRes.rows.length > 0) {
            partnerId = partnerRes.rows[0].id;
            companyType = 'PARTNER';
            matchedCompanyName = partnerRes.rows[0].company_name;
          } else {
            const fuzzyRes = await queryTable('crm_partners', {});
            const match = fuzzyRes.rows.find((p) => 
              p.company_name && (p.company_name.includes(ocrInfo.companyName) || ocrInfo.companyName.includes(p.company_name))
            );
            if (match) {
              partnerId = match.id;
              companyType = 'PARTNER';
              matchedCompanyName = match.company_name;
            }
          }
        }

        processedItems.push({
          itemType: 'FINANCIAL_STATEMENT',
          status: partnerId ? 'MATCHED' : 'UNMATCHED',
          data: ocrInfo,
          partnerId,
          companyType,
          matchedCompanyName,
          pdfFilePath
        });

      } else if (item.itemType === 'INVENTORY_INBOUND') {
        const inboundData = item.data || {};
        const parsedItems = [];
        
        for (const rawItem of (inboundData.items || [])) {
          let matchedItemId = null;
          // 1. 바코드 기준으로 매칭
          if (rawItem.barcode) {
            const match = allInventoryItems.find((it: any) => it.barcode && String(it.barcode).trim() === String(rawItem.barcode).trim());
            if (match) {
              matchedItemId = match.id;
            }
          }
          // 2. 바코드 매칭 실패 시 이름으로 매칭 (Fuzzy)
          if (!matchedItemId && rawItem.itemName) {
            const cleanName = rawItem.itemName.trim().toLowerCase();
            const match = allInventoryItems.find((it: any) => 
              it.name && (it.name.trim().toLowerCase().includes(cleanName) || cleanName.includes(it.name.trim().toLowerCase()))
            );
            if (match) {
              matchedItemId = match.id;
            }
          }

          parsedItems.push({
            itemName: rawItem.itemName || '',
            spec: rawItem.spec || '',
            quantity: Number(rawItem.quantity) || 0,
            price: Number(rawItem.price) || 0,
            barcode: rawItem.barcode || '',
            matched_item_id: matchedItemId
          });
        }

        processedItems.push({
          itemType: 'INVENTORY_INBOUND',
          data: {
            partnerName: inboundData.partnerName || '',
            inboundDate: inboundData.inboundDate || new Date().toISOString().slice(0, 10),
            items: parsedItems,
            pdfFilePath
          }
        });
      } else if (item.itemType === 'RESUME') {
        const resumeData = item.data || {};
        const cleanedPhone = normalizePhone(resumeData.phone || '');
        processedItems.push({
          itemType: 'RESUME',
          data: {
            name: resumeData.name ? resumeData.name.trim() : '',
            age: resumeData.age ? resumeData.age.trim() : '',
            phone: cleanedPhone,
            experience: resumeData.experience ? resumeData.experience.trim() : '',
            motivation: resumeData.motivation ? resumeData.motivation.trim() : '',
            tech_stacks: resumeData.tech_stacks ? resumeData.tech_stacks.trim() : '',
            matching_score: Number(resumeData.matching_score) || 0,
            resume_file_path: pdfFilePath
          }
        });
      } else if (item.itemType === 'MEDICAL_CERTIFICATE') {
        const certData = item.data || {};
        const patientName = certData.patientName ? certData.patientName.trim() : '';

        // crm_operators에서 직원명 매칭 시도
        const operatorsRes = await queryTable('crm_operators', {});
        const operators = operatorsRes.rows || [];
        let matchedOperatorId = null;
        let matchedOperatorName = '';

        if (patientName) {
          const match = operators.find((op: any) =>
            op.name && (op.name.trim() === patientName || op.name.trim().includes(patientName) || patientName.includes(op.name.trim()))
          );
          if (match) {
            matchedOperatorId = match.id;
            matchedOperatorName = match.name;
          }
        }

        processedItems.push({
          itemType: 'MEDICAL_CERTIFICATE',
          data: {
            patientName,
            diagnosis: certData.diagnosis ? certData.diagnosis.trim() : '',
            startDate: certData.startDate || '',
            endDate: certData.endDate || '',
            daysSpent: Number(certData.daysSpent) || 0.0,
            medical_certificate_path: pdfFilePath
          },
          matchedOperatorId,
          matchedOperatorName,
          operatorsList: operators.map((op: any) => ({ id: op.id, name: op.name }))
        });
      } else if (item.itemType === 'INBOUND_ESTIMATE') {
        const estimateData = item.data || {};
        const partnerName = estimateData.partnerName ? estimateData.partnerName.trim() : '';
        const buyerName = estimateData.buyerName ? estimateData.buyerName.trim() : '';
        const buyerBizNo = (estimateData.buyerBusinessNumber || '').replace(/\D/g, '');
        
        // 1. 거래처 매핑
        let partnerId = null;
        if (partnerName) {
          const partnerRes = await queryTable('crm_partners', { filters: { company_name: partnerName } });
          if (partnerRes.rows && partnerRes.rows.length > 0) {
            partnerId = partnerRes.rows[0].id;
          } else {
            const fuzzyRes = await queryTable('crm_partners', {});
            const match = fuzzyRes.rows.find((p: any) => 
              p.company_name && (p.company_name.includes(partnerName) || partnerName.includes(p.company_name))
            );
            if (match) partnerId = match.id;
          }
        }

        // 2. 개별 견적 품목 매핑 (자사 품목 대장과 Fuzzy 매칭)
        const parsedItems = (estimateData.items || []).map((rawItem: any) => {
          let matchedItemId = null;
          let matchedItemName = '';
          
          if (rawItem.productName) {
            const cleanName = rawItem.productName.trim().toLowerCase();
            const match = allTrackedItems.find((it: any) => 
              it.item_name && (it.item_name.trim().toLowerCase().includes(cleanName) || cleanName.includes(it.item_name.trim().toLowerCase()))
            );
            if (match) {
              matchedItemId = match.item_id;
              matchedItemName = match.item_name;
            }
          }

          return {
            productName: rawItem.productName || '',
            spec: rawItem.spec || '',
            quantity: Number(rawItem.quantity) || 0,
            unitPrice: Number(rawItem.unitPrice) || 0,
            amount: Number(rawItem.amount) || 0,
            matched_item_id: matchedItemId,
            matched_item_name: matchedItemName
          };
        });

        // 3. 수신인/공급자 본사 정보 대조 검증
        let receiverMatched = true; // 수신자가 명시되어 있지 않은 견적서는 유연하게 승인 허용
        if (buyerName) {
          const cleanExtBuyer = buyerName.replace(/[^가-힣a-zA-Z0-9]/g, '');
          const cleanMyCompName = myCompanyName.replace(/[^가-힣a-zA-Z0-9]/g, '');
          const hasMyName = cleanExtBuyer.includes(cleanMyCompName) || cleanMyCompName.includes(cleanExtBuyer);
          const hasMyBiz = buyerBizNo && myCompanyBizNo.replace(/\D/g, '') === buyerBizNo;
          
          if (!hasMyName && !hasMyBiz) {
            receiverMatched = false;
          }
        }

        processedItems.push({
          itemType: 'INBOUND_ESTIMATE',
          data: {
            partnerName,
            partnerPhone: estimateData.partnerPhone || '010-0000-0000',
            estimateDate: estimateData.estimateDate || new Date().toISOString().slice(0, 10),
            buyerName,
            buyerBusinessNumber: estimateData.buyerBusinessNumber || '',
            receiver_matched: receiverMatched,
            items: parsedItems,
            pdfFilePath
          },
          partnerId,
          trackedItemsList: allTrackedItems.map((it: any) => ({ id: it.item_id, name: it.item_name })),
          partnersList: partnersListForRag
        });
      } else if (item.itemType === 'PURCHASE_INVOICE') {
        const invoiceData = item.data || {};
        const companyName = invoiceData.companyName ? invoiceData.companyName.trim() : '';
        
        // 1. 거래처 매핑
        let partnerId = null;
        if (companyName) {
          const partnerRes = await queryTable('crm_partners', { filters: { company_name: companyName } });
          if (partnerRes.rows && partnerRes.rows.length > 0) {
            partnerId = partnerRes.rows[0].id;
          } else {
            const fuzzyRes = await queryTable('crm_partners', {});
            const match = fuzzyRes.rows.find((p: any) => 
              p.company_name && (p.company_name.includes(companyName) || companyName.includes(p.company_name))
            );
            if (match) partnerId = match.id;
          }
        }

        // 2. 개별 매입 품목 매핑
        const parsedItems = (invoiceData.items || []).map((rawItem: any) => {
          let matchedItemId = null;
          let matchedItemName = '';
          
          if (rawItem.itemName) {
            const cleanName = rawItem.itemName.trim().toLowerCase();
            const match = allTrackedItems.find((it: any) => 
              it.item_name && (it.item_name.trim().toLowerCase().includes(cleanName) || cleanName.includes(it.item_name.trim().toLowerCase()))
            );
            if (match) {
              matchedItemId = match.item_id;
              matchedItemName = match.item_name;
            }
          }

          return {
            itemName: rawItem.itemName || '',
            spec: rawItem.spec || '',
            quantity: Number(rawItem.quantity) || 0,
            unitPrice: Number(rawItem.unitPrice) || 0,
            amount: Number(rawItem.amount) || 0,
            matched_item_id: matchedItemId,
            matched_item_name: matchedItemName
          };
        });

        processedItems.push({
          itemType: 'PURCHASE_INVOICE',
          data: {
            companyName,
            invoiceDate: invoiceData.invoiceDate || new Date().toISOString().slice(0, 10),
            items: parsedItems,
            pdfFilePath
          },
          partnerId,
          trackedItemsList: allTrackedItems.map((it: any) => ({ id: it.item_id, name: it.item_name }))
        });

      } else if (item.itemType === 'COMPETITOR_PRICE_CAPTURE') {
        const captureData = item.data || {};
        const rawItemName = captureData.itemName ? captureData.itemName.trim() : '';

        // 1. 자사 품목 매핑
        let matchedItemId = null;
        let matchedItemName = '';
        if (rawItemName) {
          const cleanName = rawItemName.toLowerCase();
          const match = allTrackedItems.find((it: any) => 
            it.item_name && (it.item_name.trim().toLowerCase().includes(cleanName) || cleanName.includes(it.item_name.trim().toLowerCase()))
          );
          if (match) {
            matchedItemId = match.item_id;
            matchedItemName = match.item_name;
          }
        }

        processedItems.push({
          itemType: 'COMPETITOR_PRICE_CAPTURE',
          data: {
            competitorName: captureData.competitorName || '외부 사이트',
            itemName: rawItemName,
            capturedPrice: Number(captureData.capturedPrice) || 0,
            captureUrl: captureData.captureUrl || '',
            pdfFilePath
          },
          matchedItemId,
          matchedItemName,
          trackedItemsList: allTrackedItems.map((it: any) => ({ id: it.item_id, name: it.item_name }))
        });
      } else if (item.itemType === 'FACILITY_PLATE') {
        const plateData = item.data || {};
        processedItems.push({
          itemType: 'FACILITY_PLATE',
          data: {
            manufacturer: plateData.manufacturer || '',
            modelName: plateData.modelName || '',
            serialNumber: plateData.serialNumber || '',
            manufactureYear: Number(plateData.manufactureYear) || null,
            specifications: plateData.specifications || '',
            pdfFilePath
          }
        });
      } else if (item.itemType === 'FACILITY_CHECKLIST') {
        const checkData = item.data || {};
        const checks = (checkData.checks || []).map((c: any) => ({
          checkItem: c.checkItem || '',
          status: c.status || 'PASS',
          comment: c.comment || ''
        }));
        
        let matchedEquipmentId = checkData.equipmentId || null;
        let matchedEquipmentName = '';
        
        if (matchedEquipmentId) {
          const matchRes = await queryTable('crm_facilities', { filters: { id: matchedEquipmentId } });
          if (matchRes.rows && matchRes.rows.length > 0) {
            matchedEquipmentName = matchRes.rows[0].name;
          } else {
            const allFacRes = await queryTable('crm_facilities', {});
            const match = (allFacRes.rows || []).find((f: any) => 
              (f.id && f.id.includes(matchedEquipmentId)) || 
              (f.serial_number && f.serial_number.includes(matchedEquipmentId)) || 
              (f.model_name && f.model_name.includes(matchedEquipmentId))
            );
            if (match) {
              matchedEquipmentId = match.id;
              matchedEquipmentName = match.name;
            }
          }
        }

        const allFacRes = await queryTable('crm_facilities', {});
        const facilitiesList = (allFacRes.rows || []).map((f: any) => ({ id: f.id, name: f.name }));

        processedItems.push({
          itemType: 'FACILITY_CHECKLIST',
          data: {
            equipmentId: matchedEquipmentId,
            equipmentName: matchedEquipmentName,
            inspector: checkData.inspector || '',
            checkDate: checkData.checkDate || new Date().toISOString().slice(0, 10),
            checks,
            pdfFilePath
          },
          matchedEquipmentId,
          matchedEquipmentName,
          facilitiesList
        });
      } else if (item.itemType === 'LEGAL_DOCUMENT') {
        const docData = item.data || {};
        processedItems.push({
          itemType: 'LEGAL_DOCUMENT',
          data: {
            documentType: docData.documentType || '미식별 법률 문서',
            caseNumber: docData.caseNumber || '사건번호 미상',
            summary: docData.summary || '상세 내용 없음',
            deadline: docData.deadline || null,
            actions: Array.isArray(docData.actions) ? docData.actions : [],
            pdfFilePath
          }
        });
      }
    }

    // 본사 및 전체 거래처 목록 조회
    const allPartners = [];
    const myCompanySettingForList = await queryTable('system_settings', { filters: { key: 'my_company_profile' } });
    let myCompanyNameForList = '';
    if (myCompanySettingForList.rows && myCompanySettingForList.rows.length > 0) {
      try {
        const profile = JSON.parse(myCompanySettingForList.rows[0].value);
        myCompanyNameForList = profile.companyName || '';
      } catch (e) {}
    }
    
    if (myCompanyNameForList) {
      allPartners.push({
        id: 'MY-COMPANY',
        companyName: myCompanyNameForList,
        type: 'MY_COMPANY'
      });
    } else {
      allPartners.push({
        id: 'MY-COMPANY',
        companyName: '우리회사 (본사)',
        type: 'MY_COMPANY'
      });
    }

    const partnersRes = await queryTable('crm_partners', {});
    if (partnersRes.rows) {
      for (const p of partnersRes.rows) {
        allPartners.push({
          id: p.id,
          companyName: p.company_name || p.name || p.id,
          type: 'PARTNER'
        });
      }
    }

    return NextResponse.json({
      success: true,
      detectedItems: processedItems,
      partnersList: allPartners,
      inventoryItemsList: allInventoryItems
    });

  } catch (error: any) {
    console.error("EasyBot OCR Route Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
