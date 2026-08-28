<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->


<!-- BEGIN:database-audit-rules -->
## 데이터베이스 테이블 설계 및 소프트 삭제(Soft Delete) 준수 원칙

1. **공통 7종 감사(Audit) 및 소프트 삭제 컬럼 기본 제공**:
   - 이 프로젝트에서 새로 추가되는 모든 테이블은 데이터 변경 이력 관리와 소프트 삭제를 위해 반드시 다음 7종 컬럼을 포함해야 합니다:
     - `uuid` (TEXT) - 예측 불가능한 전역 고유 식별자
     - `updated_at` (TEXT) - 최종 수정 일시 (YYYY-MM-DD HH:MM:SS)
     - `updated_by` (TEXT) - 최종 수정자 정보
     - `deleted_at` (TEXT) - 소프트 삭제 처리 일시 (삭제되지 않은 경우 NULL)
     - `deleted_by` (TEXT) - 삭제 처리 작업자
     - `restored_at` (TEXT) - 복원 일시 (복원되지 않은 경우 NULL)
     - `restored_by` (TEXT) - 복원 처리 작업자
2. **`uuid` 컬럼의 Nullable 설계 원칙**:
   - `uuid` 컬럼은 데이터베이스 스키마에서 **필수 입력 값(`notNull: true`)으로 강제하지 않고 Nullable(선택 입력)로 정의**합니다.
   - 이는 하위 호환성 유지, 무손실 마이그레이션 적용 및 필요한 시점에 지연 생성(Lazy Generation)을 안전하게 지원하기 위함입니다.
3. **스키마 정의 및 마이그레이션 자동화 헬퍼 활용**:
   - `src/lib/setup-db.ts` 내의 `safeCreateTable` 함수는 스키마 선언 시 7종 컬럼이 생략되더라도 자동으로 컬럼을 주입해 줍니다. 신규 테이블 생성 시 이 헬퍼를 무조건 경유해야 합니다.
   - `In-app migration` 블록은 DB 내 모든 테이블을 동적으로 스캔하여 누락된 컬럼에 대해 무손실 `ALTER TABLE`을 가동하므로, 마이그레이션 시 기존 데이터를 드롭하지 않고 안전하게 보정하십시오.
4. **조회 및 통계 쿼리 시 소프트 삭제 필터링 (`deleted_at IS NULL`) 필수 적용**:
   - `executeSQL` 등을 통해 원시 쿼리를 수행하거나 동적 AI 쿼리(EasyBot)를 생성할 때, 소프트 삭제를 지원하는 테이블에 대한 조회는 WHERE 절에 반드시 `deleted_at IS NULL` 조건을 기본 주입하여 삭제된 데이터가 화면 및 계산 지표에 노출되지 않도록 하십시오.
5. **고유 식별자 ID (PK/FK) 기반 조인 및 맵핑 엄격 의무화**:
   - 데이터 조인, 맵핑, 중복 제거(De-duplication) 처리 시 단순 제목(`title`)이나 타임스탬프 계산(`Date.now()`) 등의 불안정한 연산을 절대 사용해서는 안 됩니다.
   - 모든 연결과 병합은 오직 **전역 고유 식별자 ID (`id`, `doc_id`, `task_id`) 간의 1:1 명확한 외래키(Foreign Key) 문자열 조인**으로만 수행해야 합니다.
6. **대장 쿼리 시 최신순(`orderBy DESC`) 정렬 기본 주입 원칙**:
   - `crm_snaptask_items` 등 대용량 레코드가 누적되는 대장 테이블을 `queryTable`로 조회할 때는 DB 조회 상한선(Limit)에 걸려 최신 첨부파일 및 레코드가 잘려 나가지 않도록 **반드시 `orderBy: 'id'`, `orderDirection: 'DESC'` 정렬을 필수 주입**하여 조회해야 합니다.
<!-- END:database-audit-rules -->

<!-- BEGIN:mobile-ui-rules -->
## 모바일 UI/UX 렌더링 및 레이아웃 제어 규칙

1. **PC용 사이드바 노출 제한**:
   - 모든 모바일 페이지(예: `/m`, `/m/*`, `/expenses/mobile-approve`, `/employee`, `/interpretation-ai` 등) 및 외부 노출형 특수 페이지에서는 PC용 사이드바(`SidebarWrapper`)를 노출해서는 안 됩니다.
   - 새로운 모바일 관련 라우트가 추가되는 경우, 반드시 `src/components/SidebarWrapper.tsx`에 해당 경로를 예외 등록하여 사이드바가 렌더링되는 것을 방지해야 합니다.
2. **도움말 AI 및 이지봇 버튼 노출 제한**:
   - 모바일 페이지 중 오직 **임직원 통합 모바일 포털 홈 페이지 (`/m`)**에서만 도움말 AI 및 이지봇 버튼이 노출되어야 합니다.
   - 그 외의 서브 모바일 페이지(예: `/m/*`, `/expenses/mobile-approve`, `/employee`, `/interpretation-ai` 등) 및 외부 노출 페이지에서는 해당 플로팅 단추들이 화면을 가려 오작동을 유발하지 않도록 `src/components/EasyBot.tsx` 및 `src/components/AIHelpManager.tsx`에서 렌더링을 제한해야 합니다.
<!-- END:mobile-ui-rules -->

<!-- BEGIN:easybot-orchestration-rules -->
## 이지봇(EasyBot) 오케스트레이션 및 멀티 에이전트 설계 원칙

1. **이지봇(Orchestrator)과 사이드바 각 업무 페이지(Domain Agent)의 역할 분담**:
   - **이지봇 (Orchestrator)**: 사용자의 자연어 질문과 의도(Intent)를 분류하고, 각 도메인 에이전트(업무 페이지)로 이벤트를 라우팅하거나 적절한 도메인 컴포넌트를 호출하는 중앙 제어기 역할에 집중합니다. 비즈니스 세부 로직을 내장해서는 안 됩니다.
   - **사이드바 각 업무 페이지 (Domain Agent)**: 이지봇으로부터 파싱된 매개변수와 원시 데이터를 넘겨받아 비즈니스 연산, DB 생성/수정/적재 및 예외 처리를 자율적으로 수행합니다.
2. **도메인 프리뷰 카드 컴포넌트의 격리**:
   - AI 파싱 프리뷰 화면(예: 이력서 분석, 재무제표 원터치 적재 카드 등)은 이지봇 소스 코드(`src/components/EasyBot.tsx`) 내에 선언하지 않고, 별도의 독립 파일(`src/components/easybot/previews/*`)로 완벽히 격리해 관리해야 합니다.
   - 새로운 업무 도메인과 프리뷰 UI가 생성되는 경우, 독자적인 파일로 개발한 후 이지봇에서 동적으로 수입(import)하여 렌더링하는 느슨한 결합(Loose Coupling) 방식을 엄격하게 고수합니다.
<!-- END:easybot-orchestration-rules -->

<!-- BEGIN:file-upload-rules -->
## 전사적 파일 보관 및 모바일 파일 업로드 표준 준수 원칙

1. **모바일 파일 업로드의 웹 표준 `FormData` 단일 직송 원칙**:
   - 모바일 페이지(`/m`) 및 현장 업무 모달에서 고화질 사진(7MB+), 동영상, 녹음, CAD 도면, PDF 문서 등을 첨부할 때는 **브라우저 순수 `File` 객체를 `FormData`에 담아 서버로 한 번에 직송(Direct Stream)**해야 합니다.
   - 클라이언트에서 복잡한 Base64 인코딩, 캔버스 압축, 복합 `useEffect` 상태 동기화나 사전 업로드(2-Phase)를 도입하지 마십시오. 이는 모바일 브라우저의 메모리 행(Hanging)과 입력 제목 덮어쓰기 버그를 유발합니다.
2. **백엔드 멀티파트 파싱 시 Web API 호환성 준수**:
   - 백엔드 App Router(`route.ts`)에서 `request.formData()`를 순회할 때, Node.js/Next.js 런타임 Realm 불일치를 방지하기 위해 `instanceof File` 대신 `typeof value === 'object' && typeof value.arrayBuffer === 'function'` 표준 판별자를 적용하여 바이너리 버퍼를 추출해야 합니다.
3. **`egdesk-helpers.ts` 및 이지데스크 MCP `uploadFile` 스토리지 의무 적용**:
   - 서버에 수신된 파일 바이너리는 `crm_snaptask_items` 등 대장에 1:1 인서트하여 유효한 `rowId`를 획득한 후, 반드시 `egdesk-helpers.ts`의 `uploadFile` API (이지데스크 MCP `user_data_upload_file`)를 호출하여 테넌트 격리 스토리지 버킷에 영구 보관해야 합니다.
4. **통합 파일 게이트웨이 및 정적 다운로드 연동**:
   - 보관된 파일의 조회 및 다운로드는 통합 게이트웨이 엔드포인트인 `/api/shared/files?tableName=...&rowId=...` 또는 로컬 정적 디스크 경로(`/uploads/customs/...`)를 경유하도록 설계하여 다이렉트 서빙과 보안성을 동시에 확보합니다.
<!-- END:file-upload-rules -->

<!-- BEGIN:egdesk-dev-context -->
## EGDesk Development Context

EGDesk opened this project with the dev server on **port 4000** (http://localhost:4000, coding (dev)).
Do not assume port 3000. Use port 4000 for local preview and dev commands.
EGDesk MCP/API runs at http://localhost:8080.

See `.agents/rules/egdesk-dev-context.md` for full details.
<!-- END:egdesk-dev-context -->

<!-- BEGIN:nextjs-turbopack-middleware-rules -->
## Next.js 16+ (Turbopack) 미들웨어 캐싱 및 에러 조치 규칙

1. **임의의 `middleware.ts` 생성 금지**:
   - Next.js 16+ 환경에서 Edge 런타임 오류로 `Could not parse module '[project]/src/middleware.ts', file not found` 가 발생하는 경우, **절대로 `src/middleware.ts` 파일을 임의로 신규 생성하지 마십시오.**
   - 이 에러는 Turbopack 컴파일 캐시 꼬임에 기인하는 것으로, 파일이 없음에도 과거 엣지 번들 참조가 남아 발생합니다.
2. **Turbopack 캐시 강제 소거 해결 원칙**:
   - `file not found` 관련 미들웨어 로드 오류 시, 개발 서버를 종료하고 `.next` 캐시 폴더를 강제 삭제한 뒤 개발 서버를 리스타트하여 그래프를 재컴파일하도록 안내하십시오.
     - PowerShell: `Remove-Item -Recurse -Force .next`
     - 명령어: `npm run dev`
3. **이지데스크 `proxy.ts` 존중 및 통신 복구**:
   - 이지데스크 플러그인은 Next.js 16+에서 `proxy.ts` 를 통해 CORS 우회 및 프록시 처리를 독자 수행하도록 설정됩니다. 
   - 이 설정을 해치지 않도록 미들웨어 파일 생성을 철저히 지양해야 합니다.
<!-- END:nextjs-turbopack-middleware-rules -->

<!-- BEGIN:tenant-isolation-rules -->
## 테넌트별 데이터 및 스토리지 완전 격리(Multi-Tenancy Isolation) 준수 원칙

1. **백엔드 DB 쿼리 시 테넌트 식별자 및 헤더 의무 경유**:
   - 모든 데이터 CRUD 작업은 `egdesk-helpers.ts`의 표준 함수(`queryTable`, `insertRows`, `updateRows`, `deleteRows`, `executeSQL`)를 통해서만 수행되어야 하며, 시스템 환경변수 및 요청 헤더(`X-EGDesk-Project-Id`, `X-EGDesk-Env`, `X-Api-Key`)를 통해 해당 테넌트의 격리된 데이터베이스 인스턴스에만 바인딩되어야 합니다.
   - 타 테넌트의 데이터를 조회하거나 교차 갱신하는 쿼리를 절대 수행해서는 안 됩니다.
2. **파일 및 첨부파일 스토리지 격리**:
   - 영수증, 계약서, 견적서, OCR 이미지 등 모든 파일은 `uploadFile` API를 통해 테넌트 격리 스토리지 버킷에 보관되어야 하며, 타 테넌트의 파일 ID로의 무단 접근이 불가능하도록 게이트웨이 인증을 필수로 거쳐야 합니다.
3. **클라이언트 브라우저 로컬 저장소(`localStorage` / `sessionStorage`) 테넌트 Prefix 격리**:
   - 브라우저 스토리지에 저장되는 임시 상태, 시트 URL, 검색 기록, 필터 조건 등은 반드시 `getEgdeskBasePath()` 기반의 테넌트 고유 Prefix(예: `_t_tunnelId_p_projectName_key`)를 적용하여 격리해야 합니다.
   - 이를 통해 동일한 PC 브라우저에서 복수의 테넌트/회사 계정으로 전환하더라도 데이터나 입력값이 교차 노출되지 않도록 원천 차단합니다.
4. **외부 연동(구글 시트, 알림톡, 결제 등) 테넌트 분리**:
   - 구글 스프레드시트, 네이버 블로그, 카카오 알림톡 등 외부 API 연동 시 계정 자격증명 및 세션 정보는 각 테넌트별 설정 레코드(`system_settings`) 및 격리 파일로 분리 관리되어야 합니다.
<!-- END:tenant-isolation-rules -->

<!-- BEGIN:data-validation-rules -->
## 데이터 유효성 검증(Validation Guard) 및 정규화(Sanitization) 준수 원칙

1. **중앙 검증 엔진(`@/lib/data-validator.ts`) 의무 적용**:
   - 구글 스프레드시트 연동, 엑셀 파일 업로드, 외부 API 임포트 및 사용자 대량 입력이 발생하는 모든 도메인(금융, 인사, 재고, 거래처 등)에서는 반드시 `@/lib/data-validator.ts` 유틸리티를 경유하여 유효성 검증과 정규화를 거쳐야 합니다.
2. **도메인별 필수 검증 규격**:
   - **날짜 (`sanitizeDate`)**: `YYYY-MM-DD`, 점(`.`), 시리얼 번호 등 자동 표준화 및 유효한 실존 날짜(1970~2099년) 검증, 긴 일련번호 오유입 차단
   - **금액/숫자 (`sanitizeAmount`, `reconcileAmounts`)**: 콤마, 통화기호 제거, 음수(수정세금계산서) 안전 처리, $\text{공급가액} + \text{세액} = \text{합계금액}$ 삼각 교차 대조
   - **사업자등록번호 (`sanitizeBusinessNumber`)**: 10자리 숫자 패턴 검증 및 `000-00-00000` 표준 포맷화
   - **전화번호/연락처 (`sanitizePhoneNumber`)**: `010-XXXX-XXXX`, `02-XXX-XXXX` 포맷 정규화
   - **이메일 (`sanitizeEmail`)**: 표준 이메일 정규식 유효성 검사
   - **수량/바코드 (`sanitizeQuantity`, `sanitizeBarcode`)**: 수량 양수 검증 및 바코드 최소 자릿수 검증
3. **프론트엔드 미리보기 테이블 표준 뱃지 시각화**:
   - 대량 데이터를 가져오는 모든 모달(Sheets/Excel Import Modal)의 미리보기 테이블 맨 좌측에는 검증 상태를 표기하는 뱃지를 제공해야 합니다:
     - `[🛡️ 정상]` (초록 뱃지): 모든 필수 필드 정규화 및 검증 통과
     - `[⚠️ 확인]` (주황 뱃지): 서식 이상 또는 금액 불일치 행 표시 (마우스 호버 툴팁으로 상세 원인 제공)
4. **백엔드 DB 적재 시 2차 이중 가드 의무화**:
   - 프론트엔드 모달뿐 아니라 백엔드 API 라우트(`route.ts`)에서도 DB `insertRows` 호출 직전 동일한 정규화 및 검증 함수를 실행하여 데이터베이스 오염을 원천 차단하십시오.
<!-- END:data-validation-rules -->

<!-- BEGIN:data-ingestion-triad-rules -->
## 신규 대장 및 입력 페이지의 3-Way 데이터 적재(Data Ingestion Triad) 표준 원칙

1. **3-Way 데이터 적재 인터페이스 기본 탑재 의무화**:
   - 향후 본 프로젝트에 신규 생성되거나 확장되는 모든 마스터 대장 및 데이터 입력 페이지(금융, 인사, 재고, 물류, 거래처, 고객, CRM, 프로젝트 등)는 사용자 전환 비용 최소화와 부서 간 협업 극대화를 위해 다음 **3종 데이터 적재 인터페이스를 필수적으로 기본 제공**해야 합니다:
     - **[✍️ 단건 직접 등록]**: 폼 모달을 통한 1건 수동 입력
     - **[📊 엑셀 파일 일괄 업로드]**: `.xlsx`, `.xls` 파일 드래그 앤 드롭 및 표준 서식(`Sample Template`) 다운로드 제공
     - **[🌐 구글 스프레드시트 실시간 연동]**: Google Sheets URL/ID 입력 및 탭 선택 기반 실시간 판독 동기화
2. **표준 엑셀 템플릿(Excel Sample) 다운로드 필수 구비**:
   - 엑셀 업로드를 지원하는 모든 모달은 사용자가 열 순서와 데이터 규격을 혼동하지 않도록 표준 컬럼명이 기재된 샘플 엑셀 파일 다운로드 기능(`[📥 표준 서식 다운로드]`)을 필수로 구비해야 합니다.
3. **중복 데이터 방지(De-duplication Key) 의무화**:
   - 대량 데이터 가져오기 시 동일 레코드가 중복 생성되지 않도록 도메인별 고유 식별자(사업자번호, 승인번호, 사원번호, 바코드, 계좌번호, 이메일 등)를 기준으로 사전 중복 체크 및 건너뛰기/갱신 처리를 적용해야 합니다.
4. **중앙 검증 엔진(`@/lib/data-validator.ts`) 및 표준 뱃지 시각화 의무화**:
   - 모든 대량 적재 모달의 미리보기 테이블 맨 좌측에는 검증 상태 뱃지(`[🛡️ 정상]`, `[⚠️ 확인]`)를 필수로 제공하여 사용자가 안심하고 데이터를 확정할 수 있도록 해야 합니다.
<!-- END:data-ingestion-triad-rules -->

<!-- BEGIN:data-export-and-sync-rules -->
## 대장 조회 화면의 양방향 데이터 출력(Data Export & Sync) 표준 원칙

1. **2종 데이터 내보내기(Export Duo) 기본 제공 의무화**:
   - 본 프로젝트의 모든 마스터 대장 및 데이터 조회 화면(금융, 인사, 재고, 거래처 등) 상단 액션 툴바에는 사용자가 현재 필터링된 데이터를 외부로 손쉽게 반출하고 협업할 수 있도록 다음 **2종 내보내기 인터페이스를 필수 제공**해야 합니다:
     - **[📥 엑셀 다운로드]**: 현재 화면에 표시된 검색/필터 결과 목록을 정규 서식의 `.xlsx` 파일로 원클릭 다운로드
     - **[🌐 구글 시트 내보내기/조회]**: 현재 대장 목록을 실시간 구글 스프레드시트로 내보내거나 동기화하여 새 탭에서 즉시 열람
2. **공통 내보내기 유틸리티(`@/lib/excel-export.ts`) 활용**:
   - 파일 다운로드 구현 시 중복 코드 없이 타입 안전성이 보장된 공통 헬퍼(`exportToExcel`)를 의무적으로 사용하십시오.
   - 열 너비 자동 맞춤, 통화 금액 포맷팅, 일관된 파일명 명명 규칙(`YYYY-MM-DD_대장명.xlsx`)을 준수해야 합니다.
<!-- END:data-export-and-sync-rules -->

<!-- BEGIN:ocr-fewshot-correction-rules -->
## 전사 OCR 기능 개발 및 페이지 신설 시 Few-shot 자율 교정 엔진 의무 적용 규칙

1. **중앙 Few-shot 교정 서비스(`@/lib/ocr-fewshot-service.ts`) 의무 연동**:
   - 발주서, 견적서, 거래명세서, 영수증, 사업자등록증, 명함, 통관서류 등 시스템 내 모든 OCR 기능 및 신규 입력 페이지에서는 반드시 `@/lib/ocr-fewshot-service.ts`의 자율 교정 엔진을 적용해야 합니다.
2. **OCR 분석 시 Few-shot 프롬프트 가이드 동적 주입**:
   - Vision AI / Gemini 프롬프트 생성 시 `getFewShotPromptContext({ tenantId, documentType, partnerName })`를 호출하여 과거 사용자가 직접 교정한 규칙 및 오인식 방지 지침을 프롬프트 상단에 필수로 주입해야 합니다.
3. **저장 및 확정 승인 시 원시 스냅샷(`raw_ocr_data`) 대조 및 피드백 자동 적재**:
   - OCR 프론트엔드 모달/화면은 최초 AI 분석 결과를 `raw_ocr_data`로 보존하고 저장 API 호출 시 함께 전송해야 합니다.
   - 백엔드 API 라우트는 `recordOcrCorrection`을 호출하여 원시 판독값과 사용자 최종 수정값 간의 차이점(Diff)을 자동 감지하고 `ai_ocr_feedback_corrections` 테이블에 적재하여 다음 OCR 분석 시 스스로 보정하도록 자율 학습 피드백 루프를 보장해야 합니다.
<!-- END:ocr-fewshot-correction-rules -->



