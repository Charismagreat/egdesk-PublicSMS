export interface ScriptPreset {
  id: string;
  title: string;
  category: "데이터 연동" | "자동 알림" | "감사 로그" | "문서 생성" | "UI 메뉴";
  description: string;
  prompt: string;
  iconName: string;
  badge: string;
}

export const SCRIPT_PRESETS: ScriptPreset[] = [
  {
    id: "audit-trail",
    title: "셀 수정 시 타임스탬프 & 감사 로그 자동 기록",
    category: "감사 로그",
    description: "사용자가 어떤 셀을 수정했을 때 마지막 열에 수정한 일시와 작업자 이메일을 자동으로 기록합니다.",
    prompt: "구글 시트의 어느 셀이든 데이터가 수정되면(onEdit), 해당 행의 맨 우측 열(또는 지정된 '최종수정일시' 및 '수정자' 열)에 현재 한국 표준시(KST) 타임스탬프와 수정자의 이메일을 자동으로 기록해줘.",
    iconName: "Clock",
    badge: "가장 인기",
  },
  {
    id: "egdesk-sync",
    title: "이지데스크 ERP/수주 대장 실시간 양방향 동기화",
    category: "데이터 연동",
    description: "시트 상단에 [이지데스크 연동] 메뉴를 추가하고, 선택한 행을 이지데스크 재고/수주 API로 즉시 전송합니다.",
    prompt: "상단 메뉴바에 [⚡ 이지데스크 자동화] > [선택 행 수주 대장으로 전송] 메뉴를 생성해줘. 사용자가 시트에서 행을 선택하고 메뉴를 누르면, 이지데스크 API(/api/orders 또는 Webhook)로 JSON 데이터를 안전하게 전송하고 결과 상태(성공 여부)를 시트에 표기해줘.",
    iconName: "Zap",
    badge: "이지데스크 전용",
  },
  {
    id: "email-alert-trigger",
    title: "마감 임박(D-3) 또는 특정 조건 시 이메일 자동 알림",
    category: "자동 알림",
    description: "매일 아침 9시에 시트의 '마감일' 열을 확인하여 기한이 3일 이하로 남은 항목을 담당자에게 이메일로 발송합니다.",
    prompt: "매일 아침 9시(시간 기반 트리거)에 시트를 자동으로 읽어서, '상태'가 '진행중'이면서 '마감일'이 오늘로부터 3일 이내로 남은 항목들을 모두 취합하여 담당자(이메일 열)에게 요약 이메일(HTML 서식)을 자동 발송하는 스크립트를 작성해줘.",
    iconName: "Mail",
    badge: "시간 트리거",
  },
  {
    id: "pdf-generator",
    title: "시트 데이터 기반 PDF 거래명세서/견적서 자동 생성",
    category: "문서 생성",
    description: "시트의 특정 양식 데이터를 PDF로 변환하여 구글 드라이브 지정 폴더에 자동 저장하고 다운로드 링크를 반환합니다.",
    prompt: "상단 메뉴에 [📄 PDF 거래명세서 발행] 버튼을 만들어줘. 현재 활성화된 시트(또는 '명세서양식' 탭)의 인쇄 영역을 PDF 바이너리로 변환하여 구글 드라이브에 '[발행일]_거래명세서.pdf' 파일로 저장하고 링크를 해당 행에 입력해줘.",
    iconName: "FileText",
    badge: "드라이브 연동",
  },
  {
    id: "exchange-rate-update",
    title: "매일 실시간 환율 및 원자재 시세 자동 갱신",
    category: "데이터 연동",
    description: "매일 정해진 시각에 공공 환율 API(USD, EUR, JPY, CNY)를 호출하여 시트의 환율 기준표를 자동 갱신합니다.",
    prompt: "매일 아침 8시 30분에 공공 환율 정보(또는 표준 환율 API)를 UrlFetchApp으로 조회하여 '환율표' 탭의 USD, EUR, JPY 매매기준율 셀을 자동으로 최신화해줘.",
    iconName: "Coins",
    badge: "자동 갱신",
  },
  {
    id: "custom-menu-cleanup",
    title: "원클릭 데이터 정규화, 중복 제거 및 서식 정리",
    category: "UI 메뉴",
    description: "상단 메뉴에 [데이터 정리] 도구를 추가하여 공백 제거, 전화번호/사업자번호 포맷 정규화, 중복 행을 자동 정리합니다.",
    prompt: "상단 메뉴에 [🛠️ 스마트 데이터 정리] 메뉴를 추가하고 하위 항목으로 1) '사업자번호/전화번호 하이픈 표준화', 2) '빈 행 및 앞뒤 불필요 공백 일괄 제거', 3) '중복 데이터 하이라이트' 3가지 기능을 구현해줘.",
    iconName: "CheckSquare",
    badge: "서식 표준화",
  },
];
