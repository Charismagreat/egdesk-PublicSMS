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
## 전사적 파일 보관 및 업로드 표준 준수 원칙

1. **로컬 파일시스템 직접 쓰기 지양**:
   - `fs.writeFileSync` 또는 임의 저장 방식을 통해 프로젝트 내 `public/uploads` 등의 정적 폴더에 실물 업로드 파일을 직접 생성하는 방식을 금지합니다.
2. **`egdesk-helpers.ts` 스토리지 API 의무 적용**:
   - 파일 업로드가 필요한 모든 도메인(명함, 영수증, 계약서, 견적서, 통관서류 등)에서는 `egdesk-helpers.ts`의 `uploadFile` API를 의무적으로 사용하여 시스템 격리 스토리지 버킷에 보관해야 합니다.
3. **통합 파일 게이트웨이 활용**:
   - 보관된 파일의 새 창 조회 및 다운로드는 통합 게이트웨이 엔드포인트인 `/api/shared/files?fileId=...` 또는 `tableName`과 `rowId`를 경유하도록 설계하여 다이렉트 파일 서빙 경로 노출에 따른 보안 리스크를 원천 차단합니다.
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
