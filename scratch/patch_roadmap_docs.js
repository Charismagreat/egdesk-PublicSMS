const fs = require('fs');
const path = require('path');

const planPath = 'C:/Users/CHARISMA/.gemini/antigravity/brain/a782e257-1928-486a-b220-2e2ffe6297c3/implementation_plan.md';
const taskPath = 'C:/Users/CHARISMA/.gemini/antigravity/brain/a782e257-1928-486a-b220-2e2ffe6297c3/task.md';

// 1. implementation_plan.md 업데이트
let planContent = fs.readFileSync(planPath, 'utf8');
const planRoadmap = `
---

## 🚀 전사 AI 자율 파일/이미지 적재 및 수금 대조 로드맵 (구현 대상 확정 ⚡)

사용자의 분석 및 요구 사항에 발맞추어, 프로젝트 전반의 생산성을 극대화하기 위한 6대 AI 자율 문서 OCR/RAG 기능 및 1대 금융 대조 자동화 파이프라인을 정식 구현 계획에 추가 마운트합니다.

### 1. [금융정보 AI] 이카운트 계산서 ↔ 입출금 DB 수금 대조 기능 (OCR 배제형 💡)
*   **방안**: 세금계산서 테이블과 실시간 은행 입출금 거래 내역(\`bank_transactions\`) 테이블을 직접 SQL로 교차 Join 및 대조하여, 별도 OCR 판독 절차 없이 금융정보 AI 페이지 내에서 수금 완료 및 미수금 현황을 원클릭 조회·추적할 수 있는 정산 대조 기능을 신설합니다.
*   **효과**: OCR 비용 절감 및 100%의 데이터 정합성 보장.

### 2. [물류 & 재고] 실물 거래명세서/라벨 이미지 자율 입고 OCR
*   **방안**: 자재/제품 입고 시 명세서나 바코드 라벨 사진을 이지봇에 전송하면 품명, 규격, 수량을 자동 파싱해 \`inventory\` 재고 수량에 가산하는 자율 입고 파이프라인을 구축합니다.

### 3. [인사 & 근태] 이력서 PDF 인재풀 등록 및 진단서 근태 연동
*   **방안**: 
    *   자유 양식 이력서 PDF를 이지봇에 드롭하여 인적사항, 경력, 보유 스택을 추출하고 \`recruitment\` 인재 DB에 자동 기입합니다.
    *   병원 진단서 사진 제출 시 기간을 자동 스캔하여 \`hr\` 근태 대장에 병가 결재 대기 건으로 자동 상신합니다.

### 4. [설비 관리] 수기 점검표 및 명판 OCR 설비 대장 자동 마운트
*   **방안**: 설비 제조 명판 사진으로 제품 스펙을 설비 대장에 자동 입력하고, 수기 점검표의 체크 항목을 인식하여 정비 이력 적재 및 특이사항 시 작업 지시(\`crm_snaptasks\`)를 자동 발행합니다.

### 5. [정책 자금] 공고문 요약 및 본사 RAG 맞춤형 추천 매칭
*   **방안**: 지원금 공고문 PDF 수십 장을 이지봇에 전달하면 핵심을 요약하고, 본사 설정 정보 및 재무제표 DB를 대조하여 지원 조건 충족 여부 및 가점 항목을 컨설팅 브리핑해 줍니다.

### 6. [품질 & 안전] 불량 NCR 보고서 및 위험 사진 안전 스냅태스크 발령
*   **방안**:
    *   공정 제품 불량 사진 스캔 시 원인을 분석하여 품질 부적합 보고서(NCR) 대장에 자동 입적합니다.
    *   안전 미비 상황(소화기 방해물 등) 촬영 전송 시 관련 위반 법령 조항을 매칭하고, 즉시 시정 조치 스냅태스크를 강제 발송합니다.

### 7. [마진 추적] 매입 명세서 OCR 및 경쟁사 판매가 캡처 마진 매퍼
*   **방안**: 매입 명세서를 스캔해 원자재 매입 원가를 \`price_tracker\`에 자동 갱신하고, 경쟁사 판매 단가 화면 캡처 시 마진 스프레드를 분석하여 자사 최적 판매가를 시뮬레이션 제안합니다.
`;

if (!planContent.includes('전사 AI 자율 파일/이미지 적재 및 수금 대조 로드맵')) {
  planContent = planContent + '\n' + planRoadmap;
  fs.writeFileSync(planPath, planContent, 'utf8');
  console.log('Successfully updated implementation_plan.md with roadmap!');
}

// 2. task.md 업데이트
let taskContent = fs.readFileSync(taskPath, 'utf8');
const taskRoadmap = `
### 🚀 [백로그] 전사 AI 파일/이미지 자율 적재 & 수금 대조 구현 로드맵
- [ ] 1. [금융정보 AI] 이카운트 계산서 ↔ 입출금 DB 수금 대조 기능 구현
- [ ] 2. [물류 & 재고] 실물 거래명세서/라벨 이미지 자율 입고 OCR 파이프라인
- [ ] 3. [인사 & 근태] 이력서 PDF 인재풀 등록 및 진단서 근태 결재 연동
- [ ] 4. [설비 관리] 수기 점검표 및 명판 OCR 설비 대장 자동 마운트
- [ ] 5. [정책 자금] 공고문 요약 및 본사 RAG 맞춤형 추천 매칭
- [ ] 6. [품질 & 안전] 불량 NCR 보고서 및 위험 사진 안전 스냅태스크 발령
- [ ] 7. [마진 추적] 매입 명세서 OCR 및 경쟁사 판매가 캡처 마진 매퍼
`;

if (!taskContent.includes('[백로그] 전사 AI 파일/이미지 자율 적재')) {
  taskContent = taskContent + '\n' + taskRoadmap;
  fs.writeFileSync(taskPath, taskContent, 'utf8');
  console.log('Successfully updated task.md with roadmap backlog!');
}
