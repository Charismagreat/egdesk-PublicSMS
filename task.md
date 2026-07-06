# 옴니채널 마케팅 및 RPA 업무 자동화(RPA) 메일 연동 시나리오 작업 목록

- [x] 데이터베이스 스키마 보완 및 고객 API 수정
  - [x] `src/lib/setup-db.ts` 내 `crm_customers`에 `email` 컬럼 추가
  - [x] `src/app/api/customers/route.ts`에 고객 등록 시 `email` 컬럼 처리 추가
- [x] 아이디어 3: 초개인화 HTML 마케팅 뉴스레터 발송 연동
  - [x] `src/lib/ai-content-generator.ts` 내 뉴스레터 HTML 콘텐츠 생성 로직 추가 (Gemini Prompt 확장 & 로컬 폴백 HTML 구현)
  - [x] `src/app/api/ai-briefing/route.ts`의 `POST` 핸들러에 타겟 고객 이메일 발송 연동 (`sendMail` 활용)
  - [x] `src/components/AiCopilotWidget.tsx` 내 옴니채널 마케팅 탭에 "이메일 뉴스레터" 뷰 추가 및 미리보기 iframe 연동
- [x] 아이디어 4: 안전 TBM 및 품질/설비 일일 보고서 아카이빙 개발
  - [x] `src/app/api/automation/daily-archive/route.ts` API 신설 (당일 안전 TBM, 품질 체크리스트, 설비 점검 수집 및 종합 HTML 생성)
  - [x] 메일 발송 파이프라인 연동 (`archive_email` 또는 폴백 본사 이메일 전송)
- [x] 아이디어 5: 임직원 서류 자가 발급 메일 전송 개발
  - [x] `src/app/api/templates-new/send-email/route.ts` API 신설 (Mustache 템플릿 변수 치환, 메일 전송 및 발급 대장 `crm_employment_certificate_logs` 이력 적재)
  - [x] `src/app/m/form-management-new/hooks/useMobileForm.ts` 내 이메일 발송 훅 함수 연동
  - [x] `src/app/m/form-management-new/components/MobileFormIssuer.tsx` 내 [이메일로 발송] 버튼 및 이메일 입력 모달 추가
- [x] 타입 검증 및 동작 확인
  - [x] `npx tsc --noEmit` 정적 타입 검증
  - [x] UI를 통한 업로드 및 빌드 테스트 확인진행
- [ ] Walkthrough 보고서 작성 및 최종 커밋

# 태스크 목록: 보낼/받은 수발주·견적 전체 모듈 품목코드 및 규격(spec) 연동

## API (백엔드)
- [x] `src/app/api/estimates/route.ts` 수정
  - POST API에서 `item_code`와 `spec` 정보를 품목 등록 시 DB에 저장하도록 구현
  - PUT API에서 `spec` 정보도 함께 저장하도록 구현 (이미 `item_code`는 저장 중)
- [x] `src/app/api/estimates/direct-register/route.ts` 수정
  - POST API에서 품목(`crm_estimate_items`) 저장 시 `item_code` 컬럼 누락된 것 매핑하여 저장
- [x] `src/app/api/estimates/ocr/route.ts` 수정
  - Gemini Vision OCR 프롬프트에 `item_code` 및 `spec` 추출 지침 추가
  - 실제 파싱 및 Mock 응답 생성부에서 `item_code` 및 `spec` 매핑하여 클라이언트에 반환

## UI (프론트엔드)
- [x] `src/app/estimates/components/EstimateWriteModal.tsx` (보낼 견적 수동) 수정
  - 품목 입력 시 `품목코드`, `규격` 입력 필드 추가
  - 가격 계산 요청 및 최종 발송 API 호출 시 `item_code`, `spec`이 전달되도록 수정
- [x] `src/app/estimates/components/EstimateOcrModal.tsx` (받은 견적 OCR) 수정
  - 품목 인터페이스에 `item_code` 및 `spec` 필드 추가
# 옴니채널 마케팅 및 RPA 업무 자동화(RPA) 메일 연동 시나리오 작업 목록

- [x] 데이터베이스 스키마 보완 및 고객 API 수정
  - [x] `src/lib/setup-db.ts` 내 `crm_customers`에 `email` 컬럼 추가
  - [x] `src/app/api/customers/route.ts`에 고객 등록 시 `email` 컬럼 처리 추가
- [x] 아이디어 3: 초개인화 HTML 마케팅 뉴스레터 발송 연동
  - [x] `src/lib/ai-content-generator.ts` 내 뉴스레터 HTML 콘텐츠 생성 로직 추가 (Gemini Prompt 확장 & 로컬 폴백 HTML 구현)
  - [x] `src/app/api/ai-briefing/route.ts`의 `POST` 핸들러에 타겟 고객 이메일 발송 연동 (`sendMail` 활용)
  - [x] `src/components/AiCopilotWidget.tsx` 내 옴니채널 마케팅 탭에 "이메일 뉴스레터" 뷰 추가 및 미리보기 iframe 연동
- [x] 아이디어 4: 안전 TBM 및 품질/설비 일일 보고서 아카이빙 개발
  - [x] `src/app/api/automation/daily-archive/route.ts` API 신설 (당일 안전 TBM, 품질 체크리스트, 설비 점검 수집 및 종합 HTML 생성)
  - [x] 메일 발송 파이프라인 연동 (`archive_email` 또는 폴백 본사 이메일 전송)
- [x] 아이디어 5: 임직원 서류 자가 발급 메일 전송 개발
  - [x] `src/app/api/templates-new/send-email/route.ts` API 신설 (Mustache 템플릿 변수 치환, 메일 전송 및 발급 대장 `crm_employment_certificate_logs` 이력 적재)
  - [x] `src/app/m/form-management-new/hooks/useMobileForm.ts` 내 이메일 발송 훅 함수 연동
  - [x] `src/app/m/form-management-new/components/MobileFormIssuer.tsx` 내 [이메일로 발송] 버튼 및 이메일 입력 모달 추가
- [x] 타입 검증 및 동작 확인
  - [x] `npx tsc --noEmit` 정적 타입 검증
  - [x] UI를 통한 업로드 및 빌드 테스트 확인진행
- [ ] Walkthrough 보고서 작성 및 최종 커밋

# 태스크 목록: 보낼/받은 수발주·견적 전체 모듈 품목코드 및 규격(spec) 연동

## API (백엔드)
- [x] `src/app/api/estimates/route.ts` 수정
  - POST API에서 `item_code`와 `spec` 정보를 품목 등록 시 DB에 저장하도록 구현
  - PUT API에서 `spec` 정보도 함께 저장하도록 구현 (이미 `item_code`는 저장 중)
- [x] `src/app/api/estimates/direct-register/route.ts` 수정
  - POST API에서 품목(`crm_estimate_items`) 저장 시 `item_code` 컬럼 누락된 것 매핑하여 저장
- [x] `src/app/api/estimates/ocr/route.ts` 수정
  - Gemini Vision OCR 프롬프트에 `item_code` 및 `spec` 추출 지침 추가
  - 실제 파싱 및 Mock 응답 생성부에서 `item_code` 및 `spec` 매핑하여 클라이언트에 반환
- [x] 16. OCR 담당자 인식 정밀도 보완 및 교차 오인 방지 지침 보강
  - [x] `src/app/api/estimates/ocr-sales-order/route.ts` 수정 (프롬프트 내 담당자 추출 정밀도 및 교차 오인 방지 지침 추가)
  - [x] 통합 기능 테스트 및 타입 검사 (`npx tsc --noEmit`)
  - [x] `walkthrough.md` 작성 및 git commit & push 완료

## UI (프론트엔드)
- [x] `src/app/estimates/components/EstimateWriteModal.tsx` (보낼 견적 수동) 수정
  - 품목 입력 시 `품목코드`, `규격` 입력 필드 추가
  - 가격 계산 요청 및 최종 발송 API 호출 시 `item_code`, `spec`이 전달되도록 수정
- [x] `src/app/estimates/components/EstimateOcrModal.tsx` (받은 견적 OCR) 수정
  - 품목 인터페이스에 `item_code` 및 `spec` 필드 추가
  - UI 카드 영역에서 품목코드와 규격을 직접 수정하고 조회할 수 있는 입력 필드 추가
- [x] `src/app/estimates/components/PurchaseOrderOcrModal.tsx` (보낼 발주 OCR) 수정
  - 품목 인터페이스에 `item_code` 필드 추가
  - UI 렌더링 영역에 품목코드(`item_code`) 입력 인풋 추가
  - 저장 시 `item_code`가 SCM API에 잘 실려가도록 매핑

## 검증
- [x] SQLite 테이블 및 컬럼 정상 생성 여부 확인
- [x] 로컬 빌드 테스트 및 빌드 오류 체크 (`tsc`)
- [x] 실제 동작 테스트 및 결과 확인 및 푸시 완료
- [x] 엑셀(CSV) 다운로드 4개 대장 컬럼 대대적 확장 및 품목 납기일(delivery_date) 매핑 완료
- [x] 평탄화 데이터 실시간 웹 뷰어(Web View) 독립 페이지 및 버튼 컴포넌트 연동 완료
- [x] 웹 뷰어 내 검색, 정렬(정규화 숫자 크기순 포함), 페이지네이션 기능 구현 완료
- [x] 지식관리 AI 기안 상신 시 스냅샷 FOREIGN KEY 제약 오류 해결 (비어있는 스냅샷 리스트 대응 자동 시딩 구현)
- [x] 지식관리 AI 페이지의 지식자산 삭제 기능 구현 (백엔드 DELETE 액션 추가 및 상세 화면 🗑️ 지식 삭제하기 버튼 연동)
- [x] 지식관리 AI 페이지의 지식자산 수정 시 메타데이터 편집 지원 (백엔드 UPDATE 시 메타데이터 변경 수용 및 UI 내 input 전환 구현)
- [x] 지식 수정 시 자산종류(doc_type) select 선택 연동 및 파일크기(file_size) 수정 불가 처리
- [x] 지식 수정 시 보안 등급(security_level) select 선택 지원 (상단 뱃지 영역 select 박스 동적 전환)







