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

