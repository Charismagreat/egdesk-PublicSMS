const path = require('path');
const fs = require('fs');

process.env.NEXT_PUBLIC_EGDESK_API_URL = 'http://localhost:8080';
const helpers = require('../egdesk-helpers.js');

async function verify() {
  console.log('1. DB에서 AI API 키 및 모델 정보 조회');
  let apiKey = null;
  let selectedModel = 'gemini-3.5-flash';

  try {
    const apiKeyRow = await helpers.queryTable('system_settings', { filters: { key: 'google_ai_api_key' } });
    const modelRow = await helpers.queryTable('system_settings', { filters: { key: 'google_ai_model' } });

    apiKey = apiKeyRow.rows && apiKeyRow.rows.length > 0 ? apiKeyRow.rows[0].value : null;
    selectedModel = modelRow.rows && modelRow.rows.length > 0 ? modelRow.rows[0].value : 'gemini-3.5-flash';
  } catch (err) {
    console.error('DB 조회 실패:', err.message);
    return;
  }

  console.log('API Key:', apiKey ? '존재함(길이 ' + apiKey.length + ')' : '없음');
  console.log('Model:', selectedModel);

  if (!apiKey) {
    console.error('API 키가 없습니다.');
    return;
  }

  const imgPath = path.join(__dirname, '../demo_materials/purchase_invoice.png');
  if (!fs.existsSync(imgPath)) {
    console.error('purchase_invoice.png 파일이 존재하지 않습니다:', imgPath);
    return;
  }

  console.log(`이미지 파일 로드: ${imgPath} (${fs.statSync(imgPath).size} bytes)`);
  const base64Data = fs.readFileSync(imgPath).toString('base64');
  const mimeType = 'image/png';

  // RAG 데이터 조회
  let partners = [];
  let trackedItems = [];
  let facilities = [];

  try {
    const partnersRes = await helpers.queryTable('crm_partners', {});
    partners = (partnersRes.rows || []).map((p) => ({ id: p.id, name: p.company_name || p.name }));
    
    const trackedItemsRes = await helpers.queryTable('tracked_items', {});
    trackedItems = (trackedItemsRes.rows || []).map((t) => ({ id: t.item_id, name: t.item_name, code: t.item_code, category: t.category, basePrice: t.base_price }));
    
    const facilitiesRes = await helpers.queryTable('crm_facilities', {});
    facilities = (facilitiesRes.rows || []).map((f) => ({ id: f.id, name: f.name, model: f.model_name, serial: f.serial_number }));
  } catch (e) {
    console.error('RAG 데이터 로드 경고:', e.message);
  }

  const geminiPrompt = `제공된 문서 이미지나 PDF 속에는 여러 장의 명함, 사업자등록증, 영수증(지출 증빙), 재무제표, 거래명세서, 이력서(PDF/이미지), 병원 진단서/처방전, 매입 명세서(원가 청구서), 경쟁사 가격 캡처 화면, 설비 제조 명판, 설비 수기 점검표, 또는 법원 소장/송달장/판결문 등의 소송 법률 문서가 혼재되어 있을 수 있습니다.
각 문서들을 지능적으로 개별 검출하여 detectedItems 배열 안에 순서대로 담아 응답해 주세요.

각 아이템은 다음 13가지 타입 중 하나여야 합니다:
1. 명함 ("BUSINESS_CARD"):
   - data 객체에 name (성명), position (직급/직책), phone (전화번호), email (이메일), companyName (회사명/소속) 추출.
2. 사업자등록증 ("BUSINESS_LICENSE"):
   - data 객체에 businessNumber ("000-00-00000" 형태), companyName (상호명), representative (대표자명), address (주소), phone (전화번호), managerName (담당자명), openingDate (개업일 "YYYY-MM-DD"), businessType (업태), businessItem (종목) 추출.
3. 영수증 ("RECEIPT"):
   - data 객체에 title (상호명과 구매품 요약, 예: "CU - 음료 구매"), category (아래 7대 비목 중 가장 잘 어울리는 중분류 하나만 선택: "복리후생비", "여비교통비", "소모품비", "접대비", "임차료", "세금공과금", "기타"), amount (최종 결제 금액, 숫자로만), expense_date (결제일 "YYYY-MM-DD"), payment_method (결제 수단, 예: "법인카드", "개인카드", "현금", "계좌이체" 등), memo (세부 사항 메모), payee (가맹점명 또는 상호명) 추출.
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
13. 받은 견적서 ("INBOUND_ESTIMATE"):
    - data 객체에 partnerName (견적서를 발행한 거래처/공급처명, 예: "태백유통(주)"), partnerPhone (연락처, 없으면 빈 문자열 ""), items 배열 추출.
    - items 배열의 각 요소는 productName (품목명, 예: "친환경 생분해 컵"), quantity (수량, 숫자로만, 예: 50), unitPrice (단가, 숫자로만, 예: 1500), amount (공급 금액, 수량 * 단가, 숫자로만, 예: 75000)를 포함해야 합니다.

사내 등록된 거래처 정보(RAG):
${JSON.stringify(partners)}

사내 등록된 가격 추적 품목 정보(RAG):
${JSON.stringify(trackedItems)}

사내 등록된 설비 정보(RAG):
${JSON.stringify(facilities)}

추출한 값들은 반드시 아래 JSON 스키마 규격을 빈틈없이 준수하여 순수 JSON 문자열로만 응답해 주세요. 다른 마크다운 백틱(\`\`\`) 기호나 텍스트는 절대 포함하지 마세요.

응답 JSON 스펙 예시:
{
  "detectedItems": [
    {
      "itemType": "PURCHASE_INVOICE",
      "data": {
        "companyName": "한국가스켐(주)",
        "invoiceDate": "2026-06-08",
        "items": [
          {
            "itemName": "R-134a 에어컨 냉매 벌크",
            "spec": "13.6kg x 10캔",
            "quantity": 2,
            "unitPrice": 1200000,
            "amount": 2400000
          }
        ]
      }
    }
  ]
}
`;

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;
  console.log('Gemini API 호출 중...');

  try {
    const response = await fetch(geminiUrl, {
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
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('API Error Response:', text);
      return;
    }

    const aiData = await response.json();
    const rawText = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log('================== Gemini Response ==================');
    console.log(rawText);
    console.log('=====================================================');
  } catch (err) {
    console.error('API 호출 도중 에러 발생:', err);
  }
}

verify();
