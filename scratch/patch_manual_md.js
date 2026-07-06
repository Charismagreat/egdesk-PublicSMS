const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../src/docs/egdesk-manual.md');
let manual = fs.readFileSync(targetPath, 'utf8');

const newSection = `
## 18. 이지봇 대화방 재무제표 PDF 자율 OCR 및 RAG 분석 시스템 (신설 ⚡)
이지봇(EasyBot) 대화방에 국세청 재무제표 PDF나 이미지를 전송하여 6대 핵심 지표와 전체 세부 항목을 자동으로 데이터베이스에 적재하고, 이를 기반으로 깊이 있는 자연어 분석 정보를 받아볼 수 있는 지능형 재무 관제 시스템을 제공합니다.

### 18.1. 재무제표 자율 OCR 판독 및 원터치 DB 적재
*   **원스톱 PDF/이미지 스캔**: 이지봇 대화방 하단의 카메라(📷) 단추를 눌러 국세청 재무제표 PDF 또는 이미지 파일을 전송하면 AI가 실시간 문서 판독을 시작합니다.
*   **6대 지표 자동 추출**: 고정밀 Gemini OCR 엔진이 문서를 해독하여 회계 연도, 자산총계, 부채총계, 자본총계, 매출액, 영업이익, 당기순이익 수치를 원화 단위로 정확히 파싱합니다.
*   **대상 기업 자동 매칭 및 수동 보정**: 스캔된 회사명을 본사 설정 및 거래처 DB와 실시간 대조(Fuzzy 매칭)하여 본사(\`MY-COMPANY\`) 혹은 거래처 ID를 자동 연결 제안합니다. 사용자는 보라색 테마의 프리뷰 카드에서 대상 기업과 파싱 수치를 직접 보정·확인한 후, \`[재무제표 원터치 DB 적재 🚀]\` 버튼을 클릭해 간편하게 데이터베이스(\`crm_financial_statements\`)에 Upsert 적재를 완료할 수 있습니다.
*   **물리 파일 보존**: 업로드된 실물 PDF 파일은 \`/public/uploads/financials/\` 디렉토리에 보존되고 상대 경로(\`pdf_file_path\`)가 발급되어 영구 추적이 가능합니다.

### 18.2. 세부 계정과목 RAG 자연어 RDB 분석
*   **세부 내역 JSON 백업**: 6대 핵심 지표는 데이터베이스 고정 컬럼에 적재되어 고속 통계 및 차트에 사용되는 한편, 대차대조표와 손익계산서 전체 세부 계정과목 항목들은 JSON 트리 구조(\`parsed_raw_json\`) 형태로 통째로 백업 보존됩니다.
*   **SQL 없는 RAG 세부 분석**: 사용자가 이지봇에게 *"본사의 작년도 현금및현금성자산은 얼마야?"* 또는 *"여비교통비 세부 내역이 어떻게 돼?"* 와 같이 DB 고정 컬럼에 존재하지 않는 미세한 항목을 질문하면, 이지봇이 해당 연도의 JSON 트리 데이터를 프롬프트 컨텍스트(RAG 지식)에 동적으로 주입합니다. 이를 통해 Gemini가 JSON 내부에서 질문에 딱 맞는 계정과목과 수치를 찾아 자연스럽고 정확하게 1:1로 리포트 답변을 도출해 줍니다.
`;

if (!manual.includes('## 18. 이지봇 대화방 재무제표 PDF 자율 OCR 및 RAG 분석 시스템')) {
  manual = manual + '\n' + newSection;
  fs.writeFileSync(targetPath, manual, 'utf8');
  console.log('Successfully updated egdesk-manual.md!');
} else {
  console.log('egdesk-manual.md is already updated.');
}
