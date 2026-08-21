// src/app/promo/data/featuresData.ts

export interface FeatureItem {
  id: string;
  category: string;
  name: string;
  badge?: string;
  iconName: string;
  summary: string;
  description: string;
  benefits: string[];
  demoPath?: string;
  highlight?: boolean;
}

export interface CategoryInfo {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
}

export const CATEGORIES: CategoryInfo[] = [
  {
    id: "all",
    name: "전체 솔루션 (30+)",
    icon: "Layers",
    description: "이지데스크의 모든 엔터프라이즈 기능",
    color: "from-indigo-500 to-blue-600"
  },
  {
    id: "data_lake",
    name: "데이터 레이크 & AI 지식",
    icon: "Database",
    description: "사내 정형/비정형 전사 데이터 통합 집결 및 프라이빗 AI 엔진",
    color: "from-indigo-500 to-blue-600"
  },
  {
    id: "erp_mes",
    name: "차세대 AI ERP & MES",
    icon: "Building2",
    description: "수기 입력 없는 영업, 회계, 생산계획, 재고 및 모바일 결재",
    color: "from-blue-500 to-indigo-600"
  },
  {
    id: "scm",
    name: "SCM & 무역 물류",
    icon: "PackageCheck",
    description: "3초 AI 비전 OCR 견적/발주, 실재고 바코드 및 수입통관 서류",
    color: "from-emerald-500 to-teal-600"
  },
  {
    id: "finance",
    name: "재무, 회계 & RPA",
    icon: "CreditCard",
    description: "법인카드 영수증 드래그앤드롭 회계 적재 및 자금/채권 위험도 진단",
    color: "from-amber-500 to-orange-600"
  },
  {
    id: "collab",
    name: "전사 협업 & 현장 비서",
    icon: "Camera",
    description: "스냅태스크 피드, 음성 녹취 AI 회의록 및 1:N 스마트 명함첩",
    color: "from-purple-500 to-indigo-600"
  },
  {
    id: "hr_safety",
    name: "인사·노무 & 안전환경",
    icon: "ShieldCheck",
    description: "임직원 포털, 노무 AI, 정부지원금 매칭 및 AI 안전사고 감지",
    color: "from-rose-500 to-pink-600"
  },
  {
    id: "special_ai",
    name: "특화 AI & 모바일 채널",
    icon: "Bot",
    description: "AI 법률 자문, 실시간 통번역, 비대면 오더 및 스마트 예약",
    color: "from-violet-500 to-purple-600"
  }
];

export const ALL_FEATURES: FeatureItem[] = [
  // 1. 데이터 레이크 & AI 지식
  {
    id: "data-lake-hub",
    category: "data_lake",
    name: "프라이빗 데이터 레이크 (Data Lake)",
    badge: "전사 데이터 통합",
    iconName: "Database",
    summary: "흩어진 엑셀, PDF 견적서, 영수증, 녹취록을 단 하나의 사내 프라이빗 저장소로 집결",
    description: "직원 개인 PC와 카카오톡에 파편화되어 갇혀 있던 전사 정형/비정형 데이터를 단 하나의 프라이빗 데이터 레이크에 무손실 집결하여 사내 AI의 든든한 지식 원천(Ground Truth)으로 가동합니다.",
    benefits: ["사내 데이터 사일로(Data Silo) 완전 해소", "100% 프라이빗 스토리지 격리 보관", "환각(Hallucination) 없는 사내 AI 추론"],
    demoPath: "/my-db",
    highlight: true
  },
  {
    id: "knowledge-rag-ai",
    category: "data_lake",
    name: "사내 RAG 지식관리 AI & 자율 이지봇",
    badge: "사내 AI 비서",
    iconName: "Sparkles",
    summary: "사내 취업규칙, 제품 매뉴얼, FAQ 문서를 학습하여 이지봇이 자율 답변 대행",
    description: "회사 규정과 노하우 문서를 등록하면 임직원이나 고객의 질문에 사내 지침을 준수하며 정확히 응답하고 작동 규칙을 시뮬레이션합니다.",
    benefits: ["반복 사내 문의 응대 90% 감소", "규정 변경 시 영향도 실시간 사전 검증", "데이터 정합성 및 감사 이력 타임라인"],
    demoPath: "/knowledge-ai",
    highlight: true
  },
  {
    id: "governance-control",
    category: "data_lake",
    name: "거버넌스 & 7종 감사 관제탑",
    iconName: "ShieldCheck",
    summary: "모든 데이터의 생성·수정·소프트 삭제 이력과 권한 관리 추적",
    description: "전사 데이터의 라이프사이클을 투명하게 감사 추적하고, 실수로 삭제된 데이터의 원클릭 무손실 복원을 지원합니다.",
    benefits: ["법적 감사 요건 100% 충족", "실수로 삭제된 데이터 즉시 복원", "작업자별 접근 권한 철저 통제"],
    demoPath: "/governance"
  },
  {
    id: "google-workspace-hub",
    category: "data_lake",
    name: "구글 워크스페이스 & 시트 원클릭 연동",
    badge: "기존 시트 그대로",
    iconName: "FileSpreadsheet",
    summary: "구글 스프레드시트 한 권과 드라이브 폴더를 그대로 연결하여 8대 업무 실시간 동기화",
    description: "새로운 시스템 적응 없이 기존 구글 시트 URL을 등록하면 거래처, 직원, 재고, 근태, 세금계산서, 은행, 카드 내역을 이지데스크가 실시간으로 분석하고 양방향 동기화합니다.",
    benefits: ["도입 교육 비용 0원 (기존 시트 100% 호환)", "구글 드라이브 파일 실시간 감시(Watch)", "G메일 첨부파일 사내 지식 자동 아카이빙"],
    demoPath: "/google-drive",
    highlight: true
  },
  {
    id: "finance-management-hub",
    category: "finance",
    name: "3대 금융·세무 자동화 (홈택스·통장·법인카드)",
    badge: "월말 정산 3분",
    iconName: "Coins",
    summary: "국세청 전자세금계산서, 은행 통장 실시간 잔액, 법인카드 승인내역 1초 일원화",
    description: "홈택스 매입·매출 명세, 주요 은행 계좌 입출금, 카드사 승인내역을 엑셀 및 구글 시트로 원터치 적재하여 수기 대조 없이 완벽한 자금 장부를 완성합니다.",
    benefits: ["월말 결산 시간 95% 단축", "표준 엑셀 서식 1초 다운로드 제공", "실시간 법인 잔액 및 매입/매출 세액 자동 계산"],
    demoPath: "/finance-management",
    highlight: true
  },

  // 2. 차세대 AI ERP & MES
  {
    id: "ai-erp-mes-core",
    category: "erp_mes",
    name: "차세대 AI ERP & 스마트 MES 통합",
    badge: "수기 입력 0초",
    iconName: "Building2",
    summary: "고비용·복잡한 기존 ERP/MES 완벽 대체 — 견적, 재고, 생산, 결재 단일화",
    description: "수천만 원의 도입비와 수기 입력 부담을 없애고, 견적 OCR부터 실재고 연동, 수주 연동 생산계획 간트차트, 모바일 결재까지 단일 시스템으로 운영합니다.",
    benefits: ["기존 ERP/MES 도입비 & 월 구독료 0원화", "수기 타이핑 입력 제로(0)", "모바일 포털 실시간 경영 관제"],
    demoPath: "/estimates",
    highlight: true
  },
  {
    id: "production-mes",
    category: "erp_mes",
    name: "수주 연동 생산 계획 (MES)",
    iconName: "Cpu",
    summary: "수주 내역과 연동된 공정 스케줄링 및 작업 지시서 실시간 발송",
    description: "납기 일정에 맞춘 라인별 생산 일정을 시각화 간트차트로 관리하고 작업 완료 현황을 실시간 집계합니다.",
    benefits: ["납기 지연율 50% 개선", "공정 병목 구간 조기 발견", "원자재 투입량 자동 계산"],
    demoPath: "/production-plan"
  },
  {
    id: "mobile-erp-approve",
    category: "erp_mes",
    name: "대표이사 모바일 ERP 결재",
    iconName: "Smartphone",
    summary: "이동 중 스마트폰에서 실시간 지출 내역 검토 및 원터치 결재 (Inbox Zero)",
    description: "자동 승인 건은 깔끔하게 필터링하고 결재 대기 건만 스마트폰으로 푸시하여 지출 결재 지연을 제로로 만듭니다.",
    benefits: ["언제 어디서나 원터치 모바일 결재", "실시간 월별 예산 소진 차트", "결재 히스토리 투명 보존"],
    demoPath: "/expenses/mobile-approve"
  },
  {
    id: "financial-dashboard",
    category: "erp_mes",
    name: "재무제표 및 경영 관제 대시보드",
    iconName: "LineChart",
    summary: "손익계산서, 매출/매입 추이, 수익성 지표를 실시간 그래픽 차트로 제공",
    description: "복잡한 회계 원장을 한눈에 이해할 수 있는 시각 경영 리포트로 가공하여 대표이사의 신속한 의사결정을 지원합니다.",
    benefits: ["월별 영업이익률 실시간 계산", "전년 동기 대비 성장률 비교", "직관적인 KPI 게이지 차트"],
    demoPath: "/financials"
  },

  // 3. SCM & 무역 물류
  {
    id: "estimate-ocr",
    category: "scm",
    name: "받은 견적서 AI Vision OCR",
    badge: "업무 90% 단축",
    iconName: "ScanLine",
    summary: "공급사 지면/PDF 견적서를 3초 만에 품목·단가·수량 데이터로 완벽 변환",
    description: "Gemini Vision OCR 엔진이 복잡한 양식의 견적서 서류를 분석하여 오타 없이 전산 테이블에 정규화 적재합니다.",
    benefits: ["수기 타이핑 입력 제로(0)", "품목·수량·공급가액 자동 검증", "원클릭 SCM 발주서 전환 연계"],
    demoPath: "/estimates",
    highlight: true
  },
  {
    id: "scm-orders",
    category: "scm",
    name: "원클릭 수주·발주 통합 관리",
    iconName: "Truck",
    summary: "견적 승인부터 정식 발주서 발송, 바이어 수주확정 및 영수 알림 자동화",
    description: "거래 흐름 전 과정을 상태 머신으로 통제하며, 거래처에 카카오 알림톡을 자동 발송합니다.",
    benefits: ["수발주 전 주기 프로세스 단일화", "자동 알림톡 템플릿 즉시 발송", "누적 미출고/미입고 실시간 관리"],
    demoPath: "/orders"
  },
  {
    id: "inventory-barcode",
    category: "scm",
    name: "실재고 & 바코드(INV-ID) 연동",
    iconName: "Barcode",
    summary: "실물 입고 검수 및 영구 이력 추적(inventory_logs)이 보장되는 정밀 재고",
    description: "실제 확인한 수량만큼 승인하여 재고를 실시간 증감시키고, 바코드 우선 매핑 및 INV-{id} 표준 코드로 체계화합니다.",
    benefits: ["실물 검수 기반 무결점 재고", "입출고 시계열 로그 영구 보존", "재고 부족 시 자동 알림 경보"],
    demoPath: "/inventory"
  },
  {
    id: "b2b-partners",
    category: "scm",
    name: "B2B 파트너 & 여신 한도 관리",
    iconName: "Building2",
    summary: "거래처 사업자정보, 담당자 계층, 외상 거래 여신한도(credit_limit) 통제",
    description: "일반 소비자와 기업 거래처를 분리 관리하며, 거래처별 누적 거래 대금과 잔여 여신 한도를 실시간 파악합니다.",
    benefits: ["외상 대금 미회수 리스크 차단", "1:N 다중 담당자 명함첩 연동", "거래처별 거래 타임라인 마이닝"],
    demoPath: "/partners"
  },
  {
    id: "import-customs",
    category: "scm",
    name: "수입 통관 & 서류 AI 판독",
    iconName: "FileCheck2",
    summary: "원산지증명서, 인보이스, 패킹리스트 등 무역 서류의 AI 시각 정밀 분석",
    description: "PDF 무역 서류를 화면에서 바로 열어보는 내장 뷰어와 관세/세액 정산 내역 요약 리포트를 자동으로 제공합니다.",
    benefits: ["통관 서류 핵심 명세 3초 추출", "통합 PDF 스트리밍 뷰어 내장", "무역 서류 감사 추적 지원"],
    demoPath: "/import-customs"
  },

  // 4. 재무, 회계 & RPA
  {
    id: "expense-rpa",
    category: "finance",
    name: "법인카드 영수증 RPA 자동 적재",
    badge: "영수증 풀칠 0장",
    iconName: "Receipt",
    summary: "영수증 사진 드래그앤드롭 즉시 지출 대장(crm_expenses)에 자동 전표 생성",
    description: "신용카드 승인 내역과 영수증 사진을 자동 매칭하여 판관비/원가 계정과목을 분류하고 승인 상태로 즉시 적재합니다.",
    benefits: ["영수증 풀칠 및 수기 타이핑 완전 소멸", "계정과목 3단 자동 뱃지 분류", "중복 청구 및 누락 원천 방지"],
    demoPath: "/expenses"
  },
  {
    id: "finance-cashflow",
    category: "finance",
    name: "자금 / 현금흐름 시뮬레이터",
    iconName: "Wallet",
    summary: "월별 수금·지급 스케줄 기반 30일/90일 현금 흐름 및 유동성 예측",
    description: "매출 채권 수금일과 매입 채무 결제일을 시뮬레이션하여 자금 경색 위험을 사전에 경고하고 대응책을 제시합니다.",
    benefits: ["자금 부족 구간 사전 알림", "월별 고정비/변동비 구조 분석", "자금 계획 수립 시간 단축"],
    demoPath: "/finance-cashflow"
  },
  {
    id: "credit-risk",
    category: "finance",
    name: "거래처 채권 신용위험 진단",
    iconName: "ShieldAlert",
    summary: "장기 미수금 거래처의 결제 패턴 분석 및 부실 채권 사전 예방",
    description: "거래처별 결제 주기 지연 패턴을 감지하여 위험 등급을 산출하고 외상 거래 한도 축소 가이드를 제공합니다.",
    benefits: ["미수금 회수율 40% 향상", "악성 부실 채권 사전 차단", "신용 등급별 안전 여신 추천"],
    demoPath: "/credit-risk"
  },

  // 5. 전사 협업 & 현장 비서
  {
    id: "snaptask",
    category: "collab",
    name: "전사 협업 스냅태스크 (SnapTask)",
    badge: "현장 작업 관제",
    iconName: "Camera",
    summary: "본사 작업 지시서·도면 전달부터 현장 작업 완료 사진 보고까지 단일 타임라인 관제",
    description: "주먹구구식 카카오톡/전화 지시를 걷어내고, 영업·생산·품질·설계 등 전 부서가 현장 실물 사진과 도면을 실시간 피드로 공유하여 누락과 소통 오류를 100% 차단합니다.",
    benefits: ["본사 작업 지시 및 현장 완료 보고 100% 추적", "도면 PDF 및 실시간 사진 뷰어 내장", "태스크별 담당자 및 납기 기한 실시간 동기화"],
    demoPath: "/snaptasks",
    highlight: true
  },
  {
    id: "audio-minutes",
    category: "collab",
    name: "음성 녹취 AI 회의록",
    iconName: "Mic",
    summary: "회의 녹음 파일(M4A, MP3)을 고정밀 텍스트로 풀고 핵심 안건 자동 요약",
    description: "장시간 회의 녹취를 업로드하면 화자 분리 및 결정 사항, 후속 조치 과제(To-Do)를 구조화된 리포트로 자동 추출합니다.",
    benefits: ["회의록 정리 시간 95% 단축", "결정 사항 및 액션 아이템 자동 생성", "핵심 발언 키워드 타임스탬프 검색"],
    demoPath: "/meeting-minutes"
  },
  {
    id: "smart-business-cards",
    category: "collab",
    name: "1:N 스마트 명함첩 동기화",
    iconName: "Contact2",
    summary: "명함 한 장 촬영 시 B2B 거래처 정보 및 대표/일반 담당자 자동 정규화",
    description: "기존 거래처가 있으면 담당자만 신규 추가하고, 새 거래처면 회사와 대표 담당자를 동시에 가입시키는 트랜잭션을 실행합니다.",
    benefits: ["사내 거래처 인맥 자산화", "수기 명함 입력 제로", "담당자 퇴사 시에도 연락처 영구 보존"],
    demoPath: "/partners"
  },

  // 6. 인사·노무 & 안전환경
  {
    id: "employee-portal",
    category: "hr_safety",
    name: "임직원 모바일 통합 포털",
    iconName: "UserCheck",
    summary: "출퇴근 체크, 휴가 신청/승인, 급여 명세서 확인을 스마트폰에서 원터치",
    description: "GPS 기반 모바일 근태 관리와 전자 결재, 개인별 연차 잔여일수 조회를 스마트폰 앱처럼 부드럽게 제공합니다.",
    benefits: ["근태 체크 누락 제로", "모바일 전자 결재로 처리 속도 향상", "개인별 급여/휴가 투명 공개"],
    demoPath: "/m"
  },
  {
    id: "labor-ai",
    category: "hr_safety",
    name: "노무 관리 & 근로계약서 AI",
    iconName: "Scale",
    summary: "최신 근로기준법 준수 표준 근로계약서 작성 및 노무 리스크 자가 진단",
    description: "주휴수당, 포괄임금, 연장근로 한도를 AI가 검토하여 법적 분쟁 소지를 사전에 제거한 계약서를 작성합니다.",
    benefits: ["노무사 자문 비용 절감", "법정 필수 기재사항 자동 점검", "모바일 전자 서명 연동"],
    demoPath: "/labor-management"
  },
  {
    id: "grant-matching",
    category: "hr_safety",
    name: "정부 지원금 매칭 센터",
    iconName: "Landmark",
    summary: "기업 업종, 고용 인원, 기술 분야에 적합한 정부 R&D/바우처 지원사업 추천",
    description: "중기부, 산자부 등 수많은 공고 중 우리 회사가 지원 자격을 갖춘 고용/연구개발 지원금을 선별하여 매칭합니다.",
    benefits: ["놓치기 쉬운 정책 자금 확보", "신청 자격 요건 자동 체크", "필요 서류 체크리스트 제공"],
    demoPath: "/grant-management"
  },
  {
    id: "safety-ai",
    category: "hr_safety",
    name: "AI 안전사고 실시간 감지",
    iconName: "AlertTriangle",
    summary: "작업장 CCTV/사진 기반 보호구 미착용 및 위험 행동 AI 감지",
    description: "현장 안전 수칙 위반 요소를 감지하여 관리자에게 즉각 경보를 울리고 중대재해 예방 일지를 자동 기록합니다.",
    benefits: ["중대재해처벌법 대응 체계 구축", "안전 점검 일지 자동 생성", "현장 사고 발생률 최소화"],
    demoPath: "/safety-detection"
  },

  // 7. 특화 AI & 모바일 채널
  {
    id: "lawyer-ai",
    category: "special_ai",
    name: "AI 사내 법률 자문 비서",
    badge: "법률 리스크 차단",
    iconName: "Gavel",
    summary: "계약서 독소 조항 검토, 불공정 거래 조항 발견 및 법률 리스크 1차 스크리닝",
    description: "거래 계약서 파일을 업로드하면 불리한 위약금, 면책 조항을 찾아내고 유리한 수정 문구를 제안합니다.",
    benefits: ["고액 법률 자문 비용 절감", "계약서 체결 전 리스크 제로화", "전문 법률 용어 쉬운 해설"],
    demoPath: "/lawyer-ai",
    highlight: true
  },
  {
    id: "interpretation-ai",
    category: "special_ai",
    name: "AI 실시간 다국어 통번역",
    iconName: "Languages",
    summary: "외국 바이어 미팅 실시간 음성 통역 및 무역 이메일/서류 고정밀 번역",
    description: "영어, 중국어, 일본어, 베트남어 등 다국어 비즈니스 대화를 전문 무역 용어 맥락에 맞게 매끄럽게 통번역합니다.",
    benefits: ["해외 바이어 미팅 언어 장벽 해소", "무역 견적 메일 즉시 번역", "오역 없는 비즈니스 톤앤매너"],
    demoPath: "/interpretation-ai"
  },
  {
    id: "store-order",
    category: "special_ai",
    name: "스마트 주문 스토어 & 테이블 오더",
    iconName: "Store",
    summary: "B2B 발주서 AI 원클릭 주문 및 QR코드 기반 무인 비대면 테이블 주문",
    description: "바이어가 발주서 사진을 올리면 장바구니에 품목을 자동 담아주고, 매장 테이블에서는 고객이 QR로 직접 주문합니다.",
    benefits: ["주문 접수 인건비 절감", "발주서 기반 자동 주문 생성", "주문 누락 및 오류 0%"],
    demoPath: "/store"
  },
  {
    id: "booking-waiting",
    category: "special_ai",
    name: "24시간 모바일 예약 & 웨이팅",
    iconName: "CalendarClock",
    summary: "전화 응대 없는 24시간 실시간 예약 접수 및 노쇼 방지 자동 알림톡",
    description: "고객이 스스로 가능한 시간을 선택해 예약하고, 방문 전날 리마인드 문자를 자동 발송하여 노쇼를 원천 차단합니다.",
    benefits: ["전화 응대 업무 80% 감소", "예약 노쇼율 70% 감소", "시간대별 고객 분산 유도"],
    demoPath: "/booking"
  }
];

// 이지데스크(EGDesk) 서버 인프라 특장점
export const EGDESK_INFRA_FEATURES = [
  {
    title: "100% 프라이빗 데이터 주권 (Data Sovereignty)",
    iconName: "Shield",
    description: "외부 상용 클라우드에 회사 데이터를 유출하지 않고, 귀사 전용 이지데스크 서버에 100% 격리 암호화 보관합니다. 고객 명단, 재무 전표, 거래 단가가 안전하게 지켜집니다."
  },
  {
    title: "19종 물리 테이블 자가 치유 (Self-Healing Zero-Config)",
    iconName: "RefreshCw",
    description: "서버 실행 시 19종 비즈니스 물리 테이블이 자동 구축되며, 무손실 인앱 마이그레이션을 통해 전담 IT 엔지니어 없이도 영구적으로 무결한 운영이 보장됩니다."
  },
  {
    title: "고속 비전 스트리밍 & MCP AI 게이트웨이",
    iconName: "Cpu",
    description: "대용량 PDF 도면, 고음질 녹취 파일, 영수증 원본을 고속 스트리밍하는 파일 게이트웨이와 멀티모달 Gemini AI 비전 엔진이 내장되어 3초 내 처리가 가능합니다."
  },
  {
    title: "엔터프라이즈 7종 감사 이력 (Audit Trail Governance)",
    iconName: "FileCheck",
    description: "모든 레코드에 7종 감사 컬럼(수정자, 수정일시, 소프트삭제, 복원자 등)이 강제 주입되어 데이터 변경 이력이 완벽히 추적되며 법적 거버넌스를 충족합니다."
  }
];

// 자주 묻는 질문 (FAQ)
export const FAQS = [
  {
    q: "정말 기존 중소기업 ERP(더존, 이카운트 등)와 MES를 대체할 수 있나요?",
    a: "네, 완벽하게 대체할 수 있습니다! 기존 ERP/MES의 가장 큰 문제인 '높은 월 구독료'와 '직원이 모든 서류와 전표를 수기 타이핑해야 하는 번거로움'을 Gemini AI Vision OCR과 RPA 기술로 100% 자동화(Zero-Typing)했습니다. 견적서·발주서·재고·영수증 지출관리부터 수주 연동 생산계획(MES), 현장 스마트폰 스냅태스크 피드까지 하나의 시스템으로 통합 운영할 수 있습니다."
  },
  {
    q: "사내 데이터 레이크(Data Lake)는 어떻게 구축되고 운영되나요?",
    a: "엑셀 파일, PDF 견적서, 계약서, 영수증 사진, 회의 녹취 오디오 등 사내의 모든 정형/비정형 데이터를 이지데스크 프라이빗 데이터 레이크에 드래그앤드롭 한 번으로 안전하게 적재합니다. 모인 데이터는 외부로 유출되지 않으며, 사내 AI(이지봇)가 회사 지침과 실물 데이터를 기반으로 답변하고 분석하는 지식 원천으로 활용됩니다."
  },
  {
    q: "기존에 사용하던 고객 명단이나 거래처 엑셀 데이터를 가져올 수 있나요?",
    a: "네, 완벽하게 지원합니다. 기존에 보유하고 계신 고객 명단, 거래처 리스트, 품목 재고 엑셀(XLSX/CSV) 파일을 이지데스크의 AI 엑셀 업로더를 통해 드래그앤드롭 한 번으로 즉시 전산에 마이그레이션할 수 있습니다."
  },
  {
    q: "스마트폰 모바일에서도 모든 기능을 쓸 수 있나요?",
    a: "네! 대표이사 및 임직원 전용 스마트 모바일 포털(/m)이 완벽히 구축되어 있습니다. 출퇴근 체크, 현장 사진 스냅태스크 업로드, 모바일 지출 결재, 단체 알림 발송, 주문 스토어 관리까지 이동 중 스마트폰에서 자유롭게 통제할 수 있습니다."
  },
  {
    q: "회사 데이터의 보안은 안전한가요?",
    a: "공용 SaaS 서비스와 달리, 이지데스크는 귀사 전용 프라이빗 서버 격리 보관을 원칙으로 합니다. 모든 데이터베이스와 첨부 서류는 회사 내부 스토리지 버킷에 암호화 보관되며, 7종 감사 이력(Audit Trail)으로 누가 언제 조회/수정했는지 투명하게 기록됩니다."
  }
];
