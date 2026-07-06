# 설비관리 AI 신설 및 연동 구현 계획서

이 구현 계획서는 중소 제조업을 위한 지능형 설비관리 및 예지보전 AI 페이지(`/facility-management`)와 모바일 예방 점검 채널(`/m/facility-management`)을 구축하고, 사이드바, 동적 메뉴 설정, 모바일 허브 배포 카드, 그리고 헬프센터에 연동하기 위한 설계안입니다.

## 1. 아키텍처 및 폴더 구조
비즈니스 로직과 UI 프레젠테이션 코드를 완벽하게 격리하기 위해 다음과 같이 모듈화된 설계를 적용합니다.

```
src/app/facility-management/
  ├── types.ts                     # 설비 데이터, OEE, 수리 대장 인터페이스 정의
  ├── page.tsx                     # 컴포넌트 합성 및 조립 메인 페이지
  ├── hooks/
  │    └── useFacilityManagement.ts # API 연동, 상태 관리, 챗봇 대화 로직 격리
  └── components/
       ├── PredictiveMaintenanceCard.tsx # 실시간 예지보전 (Autoencoder Anomaly / LSTM 잔여수명)
       ├── OeeMetricsCard.tsx            # 실시간 OEE 가동률 (Availability, Performance, Quality) 및 비가동 분석
       ├── MaintenanceCalendarCard.tsx   # 정기 점검 캘린더 및 소모성 부품 수명 관리
       └── RepairLogCard.tsx             # 수리 대장 및 RAG 기반 고장 대책 추천 챗봇
```

```
src/app/m/facility-management/
  ├── page.tsx                     # 모바일 예방 점검 메인 페이지
  ├── hooks/
  │    └── useMobileMaintenance.ts  # QR 스캔, 사진/음성 메모, 모바일 서명 보드 로직
  └── components/
       └── MobileMaintenanceForm.tsx # 모바일 대형 O/X 스위치 체크리스트 및 점검 폼
```

---

## 2. 세부 개발 및 연동 계획

### 2.1. 프론트엔드 핵심 UI 개발
- **예지보전 카드**: 설비 상태(정상/주의/정지), 진동/전류 실시간 파형 그래프 및 부품별 잔여 유효 수명(RUL D-Day) 시각화.
- **OEE 가동률 분석**: 가동/비가동 비율 게이지 차트, 손실 요인 분석용 파레토 차트, 공장 레이아웃 뷰어 구현.
- **점검 캘린더 및 부품 수명**: 월간 점검 일정 달력(Calendar UI) 및 벨트/모터 가동 누적 시간에 비례한 수명 게이지 차트 구현.
- **수리 대장 & RAG 챗봇**: 수리 이력 조회 필터 및 "이지봇" 스타일의 대화형 창구에서 고장 코드 기입 시 RAG 기반 조치 팁과 부품 창고 좌표 출력 기능 구현.
- **모바일 현장 점검 UI**: 모바일 QR 연동 시물레이션, 오프라인 임시 저장소(Local Storage), 음성 녹음 메모 첨부, 수기 서명 드로잉 보드.

### 2.2. 백엔드 모의 API 구현
- **`/api/facility/predictive`**: 예지보전 Anomaly 점수 및 LSTM RUL 예측치 제공 API.
- **`/api/facility/oee`**: 실시간 가동 시간, 생산량, OEE 3대 지표 분석 데이터 제공 API.
- **`/api/facility/calendar`**: 월간 예방정비 스케줄 및 소모성 자재 재고 상태 조회 API.
- **`/api/facility/repair`**: 수리 대장 조회, 음성 수리 보고서 작성(STT 모킹) 및 RAG 유사 이력 추천 API.
- **`/api/facility/checklist`**: 모바일에서 제출된 점검 기록 접수 API.

### 2.3. 메뉴 연동 및 모바일 채널 배포
- **사이드바 메뉴 추가**: [SidebarMenu.tsx](file:///C:/dev/egdesk-FreeSMS/src/components/SidebarMenu.tsx)의 `MENU_STATIC_MAP`에 `"/facility-management"` 추가. (아이콘: `Wrench` 사용 제안)
- **메뉴 동적 설정 추가**: [MenuSettingsCard.tsx](file:///C:/dev/egdesk-FreeSMS/src/app/settings/MenuSettingsCard.tsx)의 `MENU_METADATA_MAP`에 `"/facility-management"` 추가.
- **기본 메뉴 설정 DB 백필 추가**: [route.ts](file:///C:/dev/egdesk-FreeSMS/src/app/api/settings/menu/route.ts)의 `DEFAULT_MENU_ITEMS`에 `{ href: "/facility-management", label: "설비 관리 AI" }` 추가.
- **모바일 채널 배포 추가**: [MobileHubWidget.tsx](file:///C:/dev/egdesk-FreeSMS/src/components/MobileHubWidget.tsx)의 `channels`에 `"/m/facility-management"` 모바일 예방 점검 카드 정보 추가.
- **사용자 가이드 반영**: [constants.ts](file:///C:/dev/egdesk-FreeSMS/src/app/help/constants.ts) 도움말 FAQ 데이터베이스에 설비 관리 및 예지보전 관련 가이드 추가.

---

## 3. 검증 계획

### 3.1. 타입 체크 및 컴파일 검사
- `npm run build` 명령 실행을 통한 Turbopack 컴파일 검증.

### 3.2. 수동 검증 및 시연 시나리오
1. **사이드바 및 설정 확인**: 신설된 메뉴 아이콘과 레이블이 사이드바 및 동적 메뉴 설정 패널에 정상 작동하는지 확인.
2. **모바일 예방 점검 배포**: 대시보드의 모바일 위젯에서 QR 코드가 정상 생성 및 링크 복사되는지 검증.
3. **가동률(OEE) 시뮬레이션**: 비가동 요인을 변경하거나 모바일 점검 불합격을 제출했을 때, 실시간으로 PC 대시보드에 기회손실 비용 및 정지 상태가 갱신되는지 확인.
4. **RAG 수리 비서 테스트**: 챗봇 입력창에 고장 증상을 적었을 때 과거 유사 결함 이력과 매뉴얼 가이드가 올바르게 추천되는지 검증.
