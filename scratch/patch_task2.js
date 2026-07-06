const fs = require('fs');
const path = require('path');

const absolutePath = 'C:/Users/CHARISMA/.gemini/antigravity/brain/a782e257-1928-486a-b220-2e2ffe6297c3/task.md';

const content = `# 이지봇 재무제표 PDF 자율 등록 태스크 리스트

- [x] 1. EasyBot OCR API 수정 (src/app/api/easybot/ocr/route.ts)
    - [x] Gemini OCR 스캔 프롬프트에 재무제표(FINANCIAL_STATEMENT) 인식 룰 및 JSON 스키마 주입
    - [x] PDF 업로드 시 public/uploads/financials/ 디렉토리에 파일 저장 및 상대 경로 발행
    - [x] 회사명 기반 본사 및 거래처 자동 매칭 판별 구현
    - [x] 프론트엔드 수동 보정용 본사/거래처 전체 목록(partnersList) 응답 추가
- [x] 2. EasyBot OCR Confirm API 수정 (src/app/api/easybot/ocr/confirm/route.ts)
    - [x] FINANCIAL_STATEMENT 타입의 확정 적재 분기 추가
    - [x] crm_financial_statements 테이블에 Upsert(INSERT/UPDATE) 구현
- [x] 3. EasyBot 프론트엔드 컴포넌트 수정 (src/components/EasyBot.tsx)
    - [x] 보라색 테마의 FinancialStatementPreviewMessage 컴포넌트 신설
    - [x] AI 판독 수치 수정 폼 및 본사/거래처 선택 드롭다운 렌더링
    - [x] 최종 등록 성공 콜백 및 완료 메시지 연동
    - [x] 이지봇 대화방 내 PDF 재무제표 전송 및 분석 챗봇 흐름 연결
- [x] 4. 빌드 검증 및 최종 테스트
    - [x] npx tsc --noEmit 타입 정적 검사 수행 및 에러 수정
    - [x] 챗봇을 통한 PDF 재무제표 업로드 및 최종 DB 적재 시나리오 검증
    - [x] walkthrough.md 업데이트 작성 및 사용자 가이드 / 헬프페이지 깃푸시 완료
`;

fs.writeFileSync(absolutePath, content, 'utf8');
console.log('Successfully updated task.md to 100%!');
