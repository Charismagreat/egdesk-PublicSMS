const fs = require('fs');
const path = require('path');

// 1. constants.ts FAQ 추가
const constantsPath = path.join(__dirname, '../src/app/help/constants.ts');
let constantsCode = fs.readFileSync(constantsPath, 'utf8');

const targetFaqMarker = `  {
    id: "point-21",
    category: "point",
    question: "실시간 원가/마진 시뮬레이터에서 환율과 원자재비/노무비를 조절하면 어떻게 제조 원가에 반영되나요?",
    answer: "PC 시뮬레이터 화면의 슬라이더를 통해 원달러 환율(1,200원~1,500원), 수입 원자재가 상승률(0%~50%), 공장 노무비율(0%~30%)을 조절하는 즉시 백엔드 시뮬레이션 엔진이 작동하여 제품 단위당 원가 구성을 실시간 재계산합니다. 수입 부품의 경우 환율 and 자재가 인상률이 곱해져 재료비 상승으로 반영되며, 노무비는 임금 상승률만큼 가중 가산됩니다. 연산 완료 시 제품별 순이익 마진율이 실시간으로 하락하거나 상승하는 것을 스택트 원가 바 그래프로 시각화해 주며, 마진율이 10% 미만으로 폭락하는 적색 위험 경보 시 즉각 제품 판매가 인상 조치 필요 가이드를 제공합니다."
  },`;

const newFaqBlock = `  {
    id: "point-21",
    category: "point",
    question: "실시간 원가/마진 시뮬레이터에서 환율과 원자재비/노무비를 조절하면 어떻게 제조 원가에 반영되나요?",
    answer: "PC 시뮬레이터 화면의 슬라이더를 통해 원달러 환율(1,200원~1,500원), 수입 원자재가 상승률(0%~50%), 공장 노무비율(0%~30%)을 조절하는 즉시 백엔드 시뮬레이션 엔진이 작동하여 제품 단위당 원가 구성을 실시간 재계산합니다. 수입 부품의 경우 환율 and 자재가 인상률이 곱해져 재료비 상승으로 반영되며, 노무비는 임금 상승률만큼 가중 가산됩니다. 연산 완료 시 제품별 순이익 마진율이 실시간으로 하락하거나 상승하는 것을 스택트 원가 바 그래프로 시각화해 주며, 마진율이 10% 미만으로 폭락하는 적색 위험 경보 시 즉각 제품 판매가 인상 조치 필요 가이드를 제공합니다."
  },
  {
    id: "point-22",
    category: "point",
    question: "국세청 재무제표 PDF를 이지봇에 업로드하여 자율 등록하는 방법이 무엇인가요?",
    answer: "이지봇(EasyBot) 대화방에 국세청 재무제표 PDF 파일(또는 이미지)을 드래그 앤 드롭하여 전송하면 AI가 실시간으로 문서를 판독합니다. AI OCR 엔진이 문서의 핵심 6대 지표(자산총계, 부채총계, 자본총계, 매출액, 영업이익, 당기순이익) 및 회계 연도를 자동 추출하며, 본사 설정의 회사명이나 거래처 목록을 조회하여 자동으로 대상 기업을 매칭합니다. 사용자는 보라색 테마의 프리뷰 카드 안에서 대상 매칭 기업을 직접 보정하거나 수치를 수정한 뒤, '재무제표 원터치 DB 적재 🚀' 버튼을 클릭해 간편하게 데이터베이스(crm_financial_statements)에 즉시 저장(Upsert)할 수 있습니다."
  },
  {
    id: "point-23",
    category: "point",
    question: "이지봇에게 재무제표의 세부 계정과목이나 지표 분석을 질문하면 어떻게 처리되나요?",
    answer: "데이터베이스에 적재된 각 기업의 연도별 재무제표 정보는 6대 지표 외에도 대차대조표와 손익계산서 전체 세부 항목이 JSON 트리 형태(parsed_raw_json)로 함께 백업 보관됩니다. 이지봇은 사용자의 재무제표 질문을 수신하면, 해당 연도의 JSON 트리 전체를 프롬프트의 백그라운드 지식(RAG 컨텍스트)으로 실시간 바인딩합니다. 따라서 별도의 복잡한 SQL 쿼리 없이도 Gemini가 JSON 텍스트 내부에서 질문에 해당하는 세부 계정과목(예: '여비교통비', '현금및현금성자산', '급여' 등)의 원화 수치를 빠르게 찾아내어 자연스럽고 똑똑하게 1:1 리포트 답변을 해 드립니다."
  },`;

if (constantsCode.includes(targetFaqMarker) && !constantsCode.includes('id: "point-22"')) {
  constantsCode = constantsCode.replace(targetFaqMarker, newFaqBlock);
  fs.writeFileSync(constantsPath, constantsCode, 'utf8');
  console.log('Successfully updated help/constants.ts FAQ list!');
} else {
  console.log('constants.ts is already updated or marker not found.');
}

// 2. page.tsx 초성 검색 추가
const pagePath = path.join(__dirname, '../src/app/help/page.tsx');
let pageCode = fs.readFileSync(pagePath, 'utf8');

const targetSearchMarker = '        if (q === "ㅇㅈㅂ" && str.includes("이지봇")) return true;';
const newSearchBlock = `        if (q === "ㅈㅁㅈㅍ" && (str.includes("재무") || str.includes("제표"))) return true;
        if (q === "ㅇㅈㅂ" && str.includes("이지봇")) return true;`;

if (pageCode.includes(targetSearchMarker) && !pageCode.includes('ㅈㅁㅈㅍ')) {
  pageCode = pageCode.replace(targetSearchMarker, newSearchBlock);
  fs.writeFileSync(pagePath, pageCode, 'utf8');
  console.log('Successfully updated help/page.tsx search filter!');
} else {
  console.log('page.tsx is already updated or marker not found.');
}
