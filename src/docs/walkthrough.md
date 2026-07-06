# 안전 관리 AI 페이지 사이드바 추가, 타이틀 변경 및 플로팅 버튼 겹침 해결 보고서

요청하신 안전 관리 AI 관련 사이드바 추가, 내부 타이틀 수정, 시스템 설정 동적 메뉴 리스트 이름 반영, 모바일 페이지 주소의 대시보드 추가, 이지봇 버튼과의 플로팅 겹침 문제를 해결하였으며, 최종적으로 헬프센터 가이드 및 에이전트 개발 표준 수칙 반영까지 완료하였습니다.

## 작업 완료 사항

### 1. 좌측 사이드바 추가 및 변경
- **대상 파일**: [SidebarMenu.tsx](file:///C:/dev/egdesk-FreeSMS/src/components/SidebarMenu.tsx)
- **변경 사항**: 
  - `lucide-react`에서 `Shield` 아이콘을 임포트하였습니다.
  - `MENU_STATIC_MAP`에 `/safety-management` 라우트를 추가하여 좌측 사이드바 메뉴에 **"안전 관리 AI"**로 추가 완료하였습니다.

### 2. 시스템 설정 페이지 반영
- **대상 파일**: [MenuSettingsCard.tsx](file:///C:/dev/egdesk-FreeSMS/src/app/settings/MenuSettingsCard.tsx)
- **변경 사항**:
  - `lucide-react`에서 `Shield` 아이콘을 임포트하였습니다.
  - `MENU_METADATA_MAP`에 `/safety-management`를 추가하여 최고관리자 전용 "사이드바 동적 메뉴 활성 및 순서 설정" 영역에 **"안전 관리 AI"**로 알맞은 아이콘과 이름이 노출되도록 구성하였습니다.

### 3. 페이지 내부 타이틀 변경
- **대상 파일**: [page.tsx](file:///C:/dev/egdesk-FreeSMS/src/app/safety-management/page.tsx)
- **변경 사항**:
  - 기존 페이지 내부 메인 헤더 타이틀인 `"안전 관리 AI 관제 센터"`를 요청에 따라 **"안전 관리 AI"**로 일괄 변경 완료하였습니다.

### 4. 대시보드 스마트 모바일 채널 추가
- **대상 파일**: [MobileHubWidget.tsx](file:///C:/dev/egdesk-FreeSMS/src/components/MobileHubWidget.tsx)
- **변경 사항**:
  - `lucide-react`에서 `Shield` 아이콘을 임포트하였습니다.
  - `channels` 배열에 모바일 안전관리 페이지인 `"/m/safety/tbm"` 경로와 연동된 **"AI 안전 TBM 서명"** 채널 카드를 추가하였습니다.
  - 이를 통해 대시보드 내 모바일 채널 영역에서 링크 복사, QR코드 인쇄 및 SMS 전송 기능을 완벽히 사용할 수 있습니다.

### 5. 이지봇과의 챗봇 버튼 겹침 현상 조치
- **대상 파일**: [page.tsx](file:///C:/dev/egdesk-FreeSMS/src/app/safety-management/page.tsx)
- **변경 사항**:
  - 우측 하단에 상시 배치된 "이지봇(EasyBot)" 메신저 위젯(원형 아이콘)과 안전 관리 AI 페이지의 "AI 비상 대응 센터" 플로팅 버튼의 배치 영역이 `fixed bottom-6 right-6`로 완전히 겹치는 현상을 식별하였습니다.
  - 이를 조치하기 위해 "AI 비상 대응 센터" 플로팅 버튼의 좌표 설정을 `right-24`로 이동하여, 이지봇 위젯과 겹치지 않고 그 바로 왼쪽에 나란히 깔끔하게 정렬되도록 레이아웃을 수정하였습니다.

### 6. 헬프페이지 가이드 및 아키텍처 규칙 업데이트
- **대상 파일**: 
  - [constants.ts](file:///C:/dev/egdesk-FreeSMS/src/app/help/constants.ts)
  - [architecture-standards.md](file:///C:/dev/egdesk-FreeSMS/.agents/rules/architecture-standards.md)
- **변경 사항**:
  - 헬프센터 도움말 FAQ 목록에 "안전 관리 & 중대재해 AI" 카테고리를 신설하고 안전 관리 AI 기능 및 모바일 TBM 서명 배포 방법에 대한 Q&A 2종을 신규 등록하였습니다.
  - 아키텍처 표준 가이드라인 하단에 사용자가 지시하신 신규 기능 개발 시의 연동 규칙(사이드바, 동적 메뉴, 모바일 허브 채널 및 헬프센터 Q&A 업데이트 의무)을 명시하여 향후 개발 시에도 영구 보존되도록 하였습니다.

---

## 빌드 및 검증 결과
- `npm run build` 명령을 실행하여 Next.js 프로젝트가 오류 없이 정상적으로 빌드되는 것을 검증하였습니다.
