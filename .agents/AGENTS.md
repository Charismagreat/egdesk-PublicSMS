# EGDesk Project State Preservation Rules

## 모든 탭 및 검색 화면의 상태 보존 의무화
- 본 프로젝트에 구현되는 모든 대장, 대시보드, 또는 기능 탭(Tab) 전환이 있는 페이지는 사용자가 페이지를 이탈했다가 돌아왔을 때 보던 상태가 초기화되지 않아야 합니다.
- 이를 위해 브라우저 `sessionStorage`와 연동되는 커스텀 훅인 `usePersistedState` (`@/hooks/usePersistedState`)를 기본적으로 적용해야 합니다.
- **적용 대상 상태**:
  - 메인 탭(activeTab) 및 하위 서브 탭(subTab) 상태
  - 사용자가 입력한 검색어(searchQuery, searchKey 등)
  - 페이징 관련 상태(currentPage, page 등)
  - 상세 모달 활성화 여부 및 선택된 행 ID 등
- **하이드레이션 방지 및 가드**:
  - `usePersistedState`를 적용할 때 브라우저 저장소가 복원되기 전에 데이터를 페칭하여 이중 호출(중복 API 쿼리)이 발생하지 않도록, `useEffect` 상단에 `isRestored` 플래그를 체크하여 얼리 리턴(Return Guard) 처리를 반드시 탑재하십시오.

<!-- BEGIN:database-helpers-rules -->
## 데이터 관련 작업 시 egdesk-helpers.ts 사용 의무화
- 본 프로젝트에서 데이터베이스(DB) 데이터를 제어, 조회, 수정, 추가, 삭제하는 작업을 수행할 때는 **반드시 타입 안정성과 공통 규격이 보장된 `egdesk-helpers.ts` 파일의 API 함수들(`queryTable`, `insertRows`, `updateRows`, `executeSQL` 등)만 사용**해야 합니다.
- 로컬 sqlite3 모듈을 직접 로드하거나 SQL 파일에 수동 쿼리를 직접 수행하지 마십시오.
<!-- END:database-helpers-rules -->

<!-- BEGIN:ocr-validation-rules -->
## OCR 실물 수치 대조 및 이중 가드 컨펌 시스템 규칙
- 견적서, 발주서, 수주서 등을 스캔하여 접수하는 모든 OCR 모달(예: `EstimateOcrModal`, `PurchaseOrderOcrModal`, `SalesOrderOcrModal`)은 백엔드 API가 판독하여 반환하는 실물 금액(`originalTotalAmount`) 및 실물 수량(`originalTotalQuantity`)을 수치 입력 필드에 자동으로 대입(오토필)해야 합니다.
- 스캔 결과 내역의 실시간 변경에 따라 계산된 품목 합계액/합계수량이 실물 총액/수량과 일치하는지를 판별하는 뱃지를 시각화하고, 불일치 상태에서 저장 시 `window.confirm`을 통해 최종 확인을 한 번 더 거치도록 하는 이중 가드 로직을 필수로 구성하십시오.
<!-- END:ocr-validation-rules -->

<!-- BEGIN:inventory-barcode-rules -->
## 재고 로그 및 대장 품목코드(바코드) 일원화 규칙
- 재고 입출고 시계열 변동 로그 및 대장 웹뷰 내에 품목코드를 표기할 때, 마스터 품목의 바코드(`itemBarcode`)가 존재하면 해당 바코드를 우선 렌더링하고, 바코드가 부재할 경우에는 반드시 일관되게 `INV-{id}` 포맷의 폴백 코드를 출력하도록 표준화하십시오.
<!-- END:inventory-barcode-rules -->

<!-- BEGIN:new-page-ui-rules -->
## 신설 독립 웹페이지 작성 및 스타일 정규화 규칙
- **디자인 테마**: 이 솔루션은 라이트 모드를 지향합니다. 전체 배경은 `bg-slate-50` 또는 `bg-slate-100` 등의 밝은 그레이 톤을 쓰며, 카드는 `bg-white border border-slate-200/80 rounded-3xl shadow-sm` 등 화이트 배경에 정갈한 테두리를 둘러 통일감을 높이십시오.
- **화면 영역 극대화**: 화면 공간을 100% 웅장하게 활용하기 위해 콘텐츠 랩퍼의 가로폭 제한을 생략하고 `w-full px-4 md:px-8` 로 디자인하십시오.
- **레이아웃 여백 해제**: 전체 페이지를 감싸고 있는 기본 `p-8` 여백을 완전히 걷어내고 배경을 가득 채우기 위해, `src/components/MainContentWrapper.tsx` 의 예외 경로 목록에 신규 라우트를 의무적으로 사전 등록하십시오.
- **헤더 타이틀 표준화**: 대장 타이틀 영역은 `h1`에 `text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2` 클래스와 함께 lucide 아이콘(`w-8 h-8 text-indigo-600`)을 배치하고, 설명글 `p` 태그는 `text-slate-500 mt-2 text-sm` 및 뒤로가기 버튼 간격 맞춤용 패딩(`pl-13`)을 적용하십시오.
- **브라우저 탭 타이틀 연동**: 페이지 진입 시 브라우저 탭 문서 명이 동적으로 바르게 출력되도록 `src/components/DynamicTitle.tsx` 내의 `staticTitles` 매핑 데이터에 신설 라우트와 대장 이름을 필수로 선언하십시오.
<!-- END:new-page-ui-rules -->

<!-- BEGIN:tenant-isolation-rules -->
## 테넌트별 데이터 및 스토리지 완전 격리(Multi-Tenancy Isolation) 준수 원칙
1. **백엔드 DB 쿼리 시 테넌트 식별자 및 헤더 의무 경유**:
   - 모든 데이터 CRUD 작업은 `egdesk-helpers.ts`의 표준 함수(`queryTable`, `insertRows`, `updateRows`, `deleteRows`, `executeSQL`)를 통해서만 수행되어야 하며, 시스템 환경변수 및 요청 헤더(`X-EGDesk-Project-Id`, `X-EGDesk-Env`, `X-Api-Key`)를 통해 해당 테넌트의 격리된 데이터베이스 인스턴스에만 바인딩되어야 합니다. 타 테넌트 데이터를 조회하거나 교차 갱신하는 쿼리를 절대 수행해서는 안 됩니다.
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





