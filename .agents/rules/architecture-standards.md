# EGDesk 프로젝트 아키텍처 표준 가이드라인

이 문서는 EGDesk 프로젝트 내에서 새로운 페이지를 개발하거나 기존 페이지를 수정할 때 안티그라비티 에이전트가 준수해야 하는 핵심 아키텍처 표준을 정의합니다.

## 1. 🏗️ 아키텍처 분리 원칙 (Separation of Concerns)

모든 페이지(개발 또는 수정 대상 `page.tsx`)는 단일 대형 파일로 작성하지 않으며, 비즈니스 로직과 UI 프레젠테이션 코드를 명확하게 분리해야 합니다.

### 파일 구조 규격
- **`types.ts`**: 페이지 내부에서 활용되는 데이터 모델(Interface) 및 커스텀 훅의 리턴타입을 가장 먼저 독립적으로 정의합니다.
- **`hooks/use[PageName].ts`**: API 통신, 상태 관리, 이벤트 핸들링, 유효성 검사 등 모든 비즈니스 로직을 이 파일 내로 격리합니다.
- **`components/[ComponentName].tsx`**: UI 마크업, 레이아웃 및 스타일을 세부 컴포넌트 단위로 분리합니다. 컴포넌트는 오직 프로퍼티(Props)를 전달받아 렌더링하는 순수 프레젠테이션 역할만 수행합니다.
- **`page.tsx`**: 커스텀 훅을 호출하고 컴포넌트들을 합성 및 조립(Orchestration)하는 최소한의 코드만 유지합니다. (전체 파일 크기가 최소화되도록 관리)

---

## 2. 🎨 스타일 및 UI 보존 법칙

- 기존의 테마(다크 모드, 슬레이트/오렌지 등 고유 컬러 스키마), 반응형 그리드 레이아웃, 아이콘 명세는 리팩토링 중 변경 없이 100% 원본 스타일을 유지해야 합니다.
- Tailwind CSS 속성을 임의로 누락하거나 변경하여 레이아웃이 깨지는 일이 없도록 고도로 보존 지향적인 리팩토링을 수행해야 합니다.

---

## 3. 🔍 빌드 및 E2E 검증 절차

- 코드를 수정한 후에는 반드시 `npx tsc --noEmit` 컴파일 검사를 실행하여 타입 빌드 오류가 없는지 검증해야 합니다.
- 새로운 페이지나 주요 비즈니스 로직 수정이 발생했을 때, `scratch/` 폴더 하위에 Playwright E2E 검증 테스트 스크립트를 작성 및 실행하여 초기 렌더링, 입력값 동작, 라우팅 성공 등 실제 인터랙션을 검증하고 증빙 스냅샷을 수집해야 합니다.

---

## 4. 🗂️ 신규 페이지 개발 시 연동 및 헬프센터 가이드라인

- **사이드바 메뉴 및 설정 연동**:
  - 새로운 독립 페이지를 신설할 경우, 반드시 좌측 사이드바 컴포넌트([SidebarMenu.tsx](file:///C:/dev/egdesk-FreeSMS/src/components/SidebarMenu.tsx))의 `MENU_STATIC_MAP`에 경로, 레이블명, 아이콘 및 컬러를 매핑하여 등록해야 합니다.
  - 동시에 시스템 설정의 동적 메뉴 관리 컴포넌트([MenuSettingsCard.tsx](file:///C:/dev/egdesk-FreeSMS/src/app/settings/MenuSettingsCard.tsx))의 `MENU_METADATA_MAP`에도 해당 경로와 레이블, 아이콘을 추가하여 최고관리자 전용 설정 영역에서 렌더링될 수 있도록 조치해야 합니다.
- **스마트 모바일 채널 연동**:
  - 만약 신규 기능에 대응하는 모바일 화면(`/m/...` 등)이 제공되는 경우, 대시보드 페이지의 모바일 제어 센터 위젯([MobileHubWidget.tsx](file:///C:/dev/egdesk-FreeSMS/src/components/MobileHubWidget.tsx))의 `channels` 배열에 해당 모바일 채널(경로, 아이콘, 뱃지, 설명 및 SMS 템플릿 포함)을 지능적으로 추가하여 실시간 QR 배포 및 공유가 가능하게 해야 합니다.
- **헬프센터 및 가이드라인 반영**:
  - 깃 푸시(Git Push)를 수행하기 전, 사용자가 신규 기능을 파악할 수 있도록 헬프센터 데이터베이스([constants.ts](file:///C:/dev/egdesk-FreeSMS/src/app/help/constants.ts))에 적절한 FAQ 카테고리와 설명 항목(Q&A)을 반드시 추가 및 수정하여 반영해야 합니다.

---

## 5. 🎨 AI 관제 및 관리 페이지 레이아웃 & 타이틀 헤더 표준 규격

새로운 AI 관제 및 관리 메뉴 페이지를 설계하거나 기존 페이지를 유지보수할 때는 일관된 사용자 경험을 위해 다음의 레이아웃 및 헤더 표준을 엄격히 준수해야 합니다.

### 5.1. 최상위 레이아웃 구조 (가로폭 전체 활용)
- **가로 여백 제한 금지**: 페이지 최상위 컨테이너는 가로 여백 제한(`max-w-7xl`, `max-w-6xl`, `max-w-[1600px]`, `p-6`, `p-8` 등)이 일절 없어야 합니다.
- **전체 가로폭 활용**: 전체 화면을 좌우 끝까지 효율적으로 사용할 수 있도록 `w-full min-w-0`을 기본으로 지정합니다.
- **기본 레이아웃 규격**: `w-full space-y-6 pb-20 min-w-0 font-sans text-slate-800 animate-fade-in text-left`

### 5.2. 플랫 텍스트 기반 타이틀 헤더 & 아이콘
- **디자인 원칙**: 그라디언트 배너 스타일(과거 스타일)은 지양하고, **위험 감지 AI (`safety-detection/page.tsx`)** 와 동일한 형태의 **플랫 텍스트 중심의 헤더** 구조를 채택합니다.
- **필수 타이틀 아이콘**: 모든 내부 페이지의 대제목 좌측에는 반드시 해당 메뉴에 맞는 대표 Lucide 아이콘을 배치해야 합니다. (아이콘이 없으면 미완성 페이지로 간주)
- **아이콘 및 타이틀 레이아웃**:
  - `h1` 태그는 `text-3xl font-bold text-slate-800 flex items-center tracking-tight` 규격을 따릅니다.
  - 아이콘은 `w-8 h-8 mr-3` 크기로 배치하고, SidebarMenu와 어울리는 컬러 클래스(예: `text-purple-500`, `text-green-500` 등)를 지정합니다.
  - 소제목(설명문)은 `p` 태그로 `text-xs font-semibold text-slate-500 mt-1` 또는 `text-[11px] text-slate-500` 규격으로 작성하여 타이틀 하단에 상하 구조로 배치합니다.
- **헤더 정렬선**: 헤더의 하단 간격 및 구분선은 `mb-6 pb-5 border-b border-slate-100` (또는 `border-slate-200`)로 맞추어 페이지 하단 본문과의 조화를 꾀합니다.
- **우측 액션 버튼**: 페이지 내에 신규 등록 등 주요 버튼이 필요한 경우, 헤더의 가장 우측에 Flex 정렬(`flex justify-between items-start md:items-center`)하여 수평 배치합니다.

### 5.3. 요약 지표(스코어카드) 독립 배치
- 기존 헤더 배너 내에 결합되어 있던 통계 정보나 핵심 지표들은 헤더 영역 바깥으로 완전히 격리합니다.
- 헤더 하단에 독립적인 3열 또는 4열 그리드 형태의 **모던 스코어카드 그리드**(`grid grid-cols-1 md:grid-cols-3 gap-4` 등)를 생성하여 지표 정보를 깔끔하게 렌더링합니다.

---

## 6. 🤖 AI API 호출 시 토큰 및 비용 통계 로깅 표준 (ai_token_usage_logs)

새로운 AI 기능을 개발하거나 기존 AI 호출 로직(Gemini API 등)을 수정할 때는 시스템 관리자 및 사용자가 AI 리소스 사용량과 비용을 투명하게 모니터링할 수 있도록 반드시 다음 규칙을 준수해야 합니다.

### 6.1. 토큰 로깅 의무화 (`ai_token_usage_logs` 적재)
- **대상**: 백엔드 API 라우트 핸들러(`route.ts`) 또는 서버 라이브러리(`*.ts`) 등에서 외부 Generative AI API(Gemini API 등)를 호출하는 모든 로직.
- **의무 사항**: AI API 호출 성공 시 반환되는 토큰 사용량 정보(`usageMetadata` 등)를 파싱하여, 반드시 **`ai_token_usage_logs`** 테이블에 이력을 즉시 인서트(`insertRows`)해야 합니다.
- **클라이언트 측 직접 호출 금지**: 클라이언트 컴포넌트(`page.tsx` 등 브라우저 환경)에서 AI API를 직접 호출하지 않습니다. 보안(API 키 노출 방지) 및 신뢰성 있는 로깅을 위해 반드시 서버 사이드 API 라우트를 경유하여 AI를 호출하고 로그를 기록해야 합니다.

### 6.2. 로그 적재 규격 (DB Schema)
데이터베이스에 로그를 기록할 때는 다음 필드를 필히 충족해야 합니다:
- `id` (TEXT): 고유 식별자 (예: `TKC-${Date.now()}-${Math.floor(Math.random() * 1000)}` 포맷 권장)
- `model` (TEXT): 사용된 AI 모델명 (예: `gemini-3.5-flash`)
- `purpose` (TEXT): 해당 AI 호출의 비즈니스 목적을 나타내는 스네이크 케이스 또는 의미 있는 문자열 (예: `GRANT_RAG_MATCHING`, `EASYBOT_OCR_SCAN` 등)
- `prompt_tokens` (INTEGER): 프롬프트에 사용된 입력 토큰 수
- `completion_tokens` (INTEGER): 응답으로 생성된 출력 토큰 수
- `total_tokens` (INTEGER): 총 토큰 수 (`prompt_tokens + completion_tokens`)
- `created_at` (TEXT): 한국 시간 기준(KST) 생성 일시 (`YYYY-MM-DD HH:MM:SS` 포맷)

