const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../src/app/api/easybot/ocr/route.ts');
let code = fs.readFileSync(targetPath, 'utf8');

// 1. imports 추가 (fs, path)
if (!code.includes("import fs from 'fs';")) {
  code = code.replace(
    "import { queryTable, insertRows } from '../../../../../egdesk-helpers';",
    "import { queryTable, insertRows } from '../../../../../egdesk-helpers';\nimport fs from 'fs';\nimport path from 'path';"
  );
}

// 2. 파일 디스크 보관 로직 추가
const targetMarker = `if (image.startsWith('data:')) {
      const parts = image.split(';base64,');
      mimeType = parts[0].replace('data:', '');
      base64Data = parts[1];
    }`;

const fileSaveBlock = `

    // 1.5. PDF 및 이미지 파일을 디스크에 미리 보관
    let pdfFilePath = '';
    try {
      const isPdf = mimeType === 'application/pdf';
      const isImage = mimeType.startsWith('image/');
      if (isPdf || isImage) {
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'financials');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        const fileExt = isPdf ? '.pdf' : '.png';
        const fileName = 'financial_' + Date.now() + fileExt;
        const filePath = path.join(uploadDir, fileName);
        const fileBuffer = Buffer.from(base64Data, 'base64');
        fs.writeFileSync(filePath, fileBuffer);
        pdfFilePath = '/uploads/financials/' + fileName;
      }
    } catch (fileErr) {
      console.error('OCR 로컬 파일 작성 에러:', fileErr);
    }`;

if (code.includes(targetMarker) && !code.includes("let pdfFilePath = '';")) {
  code = code.replace(targetMarker, targetMarker + fileSaveBlock);
}

// 3. geminiPrompt 변경
const promptRegex = /const geminiPrompt = `[\s\S]*?`;/g;

// 새로운 프롬프트 생성 (백틱만 \x60으로 이스케이프)
const newPrompt = `const geminiPrompt = \x60제공된 문서 이미지나 PDF 속에는 여러 장의 명함, 사업자등록증, 영수증(지출 증빙), 재무제표가 혼재되어 있을 수 있습니다.
각 문서들을 지능적으로 개별 검출하여 detectedItems 배열 안에 순서대로 담아 응답해 주세요.

각 아이템은 다음 4가지 타입 중 하나여야 합니다:
1. 명함 ("BUSINESS_CARD"):
   - data 객체에 name (성명), position (직급/직책), phone (전화번호), email (이메일), companyName (회사명/소속) 추출.
2. 사업자등록증 ("BUSINESS_LICENSE"):
   - data 객체에 businessNumber ("000-00-00000" 형태), companyName (상호명), representative (대표자명), address (주소), phone (전화번호), managerName (담당자명), openingDate (개업일 "YYYY-MM-DD"), businessType (업태), businessItem (종목) 추출.
3. 영수증 ("RECEIPT"):
   - data 객체에 title (상호명과 구매품 요약, 예: "CU - 음료 구매"), category (아래 7대 비목 중 가장 잘 어울리는 중분류 하나만 선택: "복리후생비", "여비교통비", "소모품비", "접대비", "임차료", "세금공과금", "기타"), amount (최종 결제 금액, 숫자로만), expense_date (결제일 "YYYY-MM-DD"), payment_method (결제 수단, 예: "법인카드", "개인카드", "현금", "계좌이체" 등), memo (세부 사항 메모), payee (가맹점명 또는 상호명) 추출.
4. 재무제표 ("FINANCIAL_STATEMENT"):
   - data 객체에 companyName (회사명), fiscalYear (회계 연도, 숫자로만), fiscalQuarter (분기, 기본값 "YR"), totalAssets (자산총계, 숫자로만), totalLiabilities (부채총계, 숫자로만), totalEquity (자본총계, 숫자로만), revenue (매출액, 숫자로만), operatingIncome (영업이익, 숫자로만), netIncome (당기순이익, 숫자로만) 추출.
   - 또한, data 객체 내부의 parsedRawJson 속성에 대차대조표와 손익계산서의 세부 계정과목 및 금액 정보를 담은 계층형 트리 JSON 객체를 정밀 추출해 주세요. 이 JSON 객체는 PDF에 기재된 모든 세부 계정과목(예: 현금및현금성자산, 매출채권, 여비교통비, 급여, 임차료 등)의 계층 구조와 원화 단위를 정확히 반영해야 합니다. (예시: {"재무상태표": {"자산": {"유동자산": {"현금및현금성자산": 15000000, "매출채권": 24000000}, "비유동자산": {...}}, "부채": {...}, "자본": {...}}, "손익계산서": {"매출액": 120000000, "매출원가": 70000000, "판매비와관리비": {"여비교통비": 1200000, "복리후생비": 3200000, ...}} 등) 모든 금액 수치는 반드시 원화(KRW) 단위 정수여야 하며, 만약 문서 단위가 백만원 또는 천원 등이라면 원 단위로 환산해서 기입해야 합니다.

추출한 값들은 반드시 아래 JSON 스키마 규격을 빈틈없이 준수하여 순수 JSON 문자열로만 응답해 주세요. 다른 마크다운 백틱(\\\x60\\\x60\\\x60) 기호나 텍스트는 절대 포함하지 마세요.

응답 JSON 스펙 예시:
{
  "detectedItems": [
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
}\x60;`;

code = code.replace(promptRegex, newPrompt);

// 4. FINANCIAL_STATEMENT 처리 분기 추가
const receiptBlockEnd = `        processedItems.push({
          itemType: 'RECEIPT',
          data: {
            title: receiptData.title || '',
            category: receiptData.category || '복리후생비',
            amount: Number(receiptData.amount) || 0,
            expense_date: receiptData.expense_date || new Date().toISOString().slice(0, 10),
            payment_method: receiptData.payment_method || '법인카드',
            memo: receiptData.memo || '',
            payee: receiptData.payee || receiptData.merchant || ''
          }
        });
      }`;

const financialStatementBlock = `        processedItems.push({
          itemType: 'RECEIPT',
          data: {
            title: receiptData.title || '',
            category: receiptData.category || '복리후생비',
            amount: Number(receiptData.amount) || 0,
            expense_date: receiptData.expense_date || new Date().toISOString().slice(0, 10),
            payment_method: receiptData.payment_method || '법인카드',
            memo: receiptData.memo || '',
            payee: receiptData.payee || receiptData.merchant || ''
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
      }`;

code = code.replace(receiptBlockEnd, financialStatementBlock);

// 5. 응답 부분 수정 (partnersList 추가)
const oldReturn = `    return NextResponse.json({
      success: true,
      detectedItems: processedItems
    });`;

const newReturn = `    // 본사 및 전체 거래처 목록 조회
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
      partnersList: allPartners
    });`;

code = code.replace(oldReturn, newReturn);

fs.writeFileSync(targetPath, code, 'utf8');
console.log('Successfully patched route.ts!');
