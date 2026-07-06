"use client";

import React, { useState, useEffect } from "react";
import { 
  ShoppingBag, 
  Smartphone, 
  Calendar, 
  UserPlus, 
  Camera, 
  Copy, 
  QrCode, 
  MessageSquare, 
  ExternalLink, 
  Printer, 
  Download, 
  Check, 
  X,
  Info,
  Handshake,
  Sparkles,
  Coins,
  Shield,
  CheckSquare,
  Wrench,
  CalendarDays,
  Zap,
  ShieldAlert,
  Globe,
  Award,
  Scale,
  ClipboardList,
  IdCard,
  Languages
} from "lucide-react";

interface MobileChannel {
  id: string;
  name: string;
  description: string;
  path: string;
  icon: React.ComponentType<any>;
  themeColor: string; // Tailwind class prefix, e.g., 'blue', 'rose'
  badge: string;
  smsTemplate: string;
}

export default function MobileHubWidget() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeQrChannel, setActiveQrChannel] = useState<MobileChannel | null>(null);
  const [hostUrl, setHostUrl] = useState("");

  // 클라이언트 사이드에서 호스트 URL 확보
  useEffect(() => {
    if (typeof window !== "undefined") {
      setHostUrl(window.location.origin);
    }
  }, []);

  const channels: MobileChannel[] = [
    {
      id: "employee-portal",
      name: "임직원 통합 모바일 포털",
      description: "이지봇 비서(파일 대화형 복수 처리) 및 실시간 근무 관리, 스냅태스크, 지출 품의, 현장 안전 관리를 한데 모은 모바일 허브",
      path: "/m",
      icon: Smartphone,
      themeColor: "from-cyan-600 to-indigo-650 bg-cyan-50 text-cyan-600 border-cyan-100",
      badge: "임직원 전용/보안 격리",
      smsTemplate: "[이지데스크] 임직원 통합 모바일 포털 접속 링크입니다. 아래 링크에서 로그인 후 이지봇 및 업무 관리 도구를 활용해 주세요. "
    },
    {
      id: "store",
      name: "스마트 주문 스토어",
      description: "AI 음성 비서 탑재 및 한정 쿠폰 혜택으로 온라인 주문을 유도하는 사장님의 가상 온라인 스토어",
      path: "/store",
      icon: ShoppingBag,
      themeColor: "from-blue-600 to-indigo-600 bg-blue-50 text-blue-600 border-blue-100",
      badge: "온라인/단골 타겟",
      smsTemplate: "[이지데스크] 사장님 추천! 아래 링크에서 간편하게 상품 확인하시고 쿠폰 혜택과 함께 AI 음성 주문을 이용해보세요! "
    },
    {
      id: "table-order",
      name: "매장 테이블 오더",
      description: "비대면으로 각 테이블에서 QR코드로 즉시 주문하고 사장님 어드민에 연동되는 테이블 무인 오더서",
      path: "/table-order/1",
      icon: Smartphone,
      themeColor: "from-rose-600 to-red-600 bg-rose-50 text-rose-600 border-rose-100",
      badge: "매장 내 방문객 타겟",
      smsTemplate: "[이지데스크] 매장 방문 감사드립니다! 테이블 번호 1번의 실시간 테이블 오더 주문 링크입니다. 편하게 이용해주세요. "
    },
    {
      id: "booking",
      name: "실시간 모바일 예약",
      description: "전화 상담 없이 고객이 24시간 언제 어디서나 모바일로 방문/대기 예약을 접수하는 자동 예약 창구",
      path: "/booking",
      icon: Calendar,
      themeColor: "from-purple-600 to-violet-600 bg-purple-50 text-purple-600 border-purple-100",
      badge: "대기/예약 타겟",
      smsTemplate: "[이지데스크] 저희 매장 예약을 환영합니다! 아래 모바일 링크를 통해 날짜와 인원을 기입하시면 간편하게 접수 완료됩니다. "
    },
    {
      id: "recruitment",
      name: "구직자 모바일 접수",
      description: "알바 및 직원 채용 프로세스를 깔끔한 양식으로 자동화하여 면접 대상자를 손쉽게 수집하는 채용서",
      path: "/m/recruitment",
      icon: UserPlus,
      themeColor: "from-emerald-600 to-teal-600 bg-emerald-50 text-emerald-600 border-emerald-100",
      badge: "구인/HR 최적화",
      smsTemplate: "[이지데스크] 직영점 채용 공고에 관심을 가져주셔서 감사합니다. 아래 모바일 지원서를 작성하여 제출해 주시기 바랍니다. "
    },
    {
      id: "order-capture",
      name: "현장 주문 캡처",
      description: "근무 중인 현장 직원이 손님 영수증이나 메모를 촬영하여 AI 스캔 주문서로 즉시 등재하는 스태프용 웹",
      path: "/m/order-capture",
      icon: Camera,
      themeColor: "from-amber-600 to-orange-600 bg-amber-50 text-amber-600 border-amber-100",
      badge: "매장 스태프/직원 전용",
      smsTemplate: "[이지데스크] 현장 주문 캡처 웹 링크입니다. 로그인 후 영수증 촬영 및 수기 오더 전송을 진행해주세요. "
    },
    {
      id: "estimate-request",
      name: "B2B 스마트 견적 요청",
      description: "바이어가 모바일에서 자재 수량을 입력하고 사업자 중복 조회 및 AI OCR 스캔 온보딩을 거쳐 신규 가입하는 B2B 바이어 채널",
      path: "/m/estimate-request",
      icon: Handshake,
      themeColor: "from-cyan-600 to-teal-600 bg-cyan-50 text-cyan-600 border-cyan-100",
      badge: "B2B 바이어/구매처 전용",
      smsTemplate: "[이지데스크] B2B 거래처 견적 요청 링크입니다. 사업자번호 입력과 사업자등록증 첨부 시 AI가 정보를 자동 완성해 드립니다. "
    },
    {
      id: "snaptasks",
      name: "현장/업무 스마트 스냅",
      description: "연구개발, 품질관리, 마케팅 및 영업 현장에서 촬영한 사진, 녹취 파일, 주소 링크 및 메모를 스냅하여 AI가 즉각 분석하고 전사 협업 태스크로 연동 처리하는 실무진 채널",
      path: "/m/snaptasks",
      icon: Sparkles,
      themeColor: "from-indigo-600 to-violet-600 bg-indigo-50 text-indigo-600 border-indigo-100",
      badge: "현장 실무자/R&D/마케팅 전용",
      smsTemplate: "[이지데스크] 현장/업무 스냅태스크 모바일 전송 채널입니다. 아래 링크에서 바로 실시간 텍스트 메모 및 미디어(사진/녹취/문서) 스냅 전송을 시작하세요! "
    },
    {
      id: "expenses-mobile-approve",
      name: "지출결의 모바일 승인",
      description: "대표자가 야외 현장에서도 실시간 지출 내역을 심사하고 승인/반려 처리를 모바일로 즉석 집행하는 모바일 관제서",
      path: "/expenses/mobile-approve",
      icon: Coins,
      themeColor: "from-rose-600 to-pink-650 bg-rose-50 text-rose-600 border-rose-100",
      badge: "대표자/임원진 전용",
      smsTemplate: "[이지데스크] 지출결의서 모바일 실시간 심사 링크입니다. 아래 링크에서 즉석 검수 및 승인을 진행해 주시기 바랍니다. "
    },
    {
      id: "safety-tbm",
      name: "AI 안전 TBM 서명",
      description: "현장 작업자가 모바일로 당일 TBM 연설안을 확인하고 QR코드로 실시간 안전 서명을 제출하는 의무 관리 창구",
      path: "/m/safety/tbm",
      icon: Shield,
      themeColor: "from-amber-600 to-red-650 bg-amber-50 text-amber-600 border-amber-100",
      badge: "현장 근로자/안전 의무",
      smsTemplate: "[이지데스크] 금일 작업 TBM 및 안전 서명 링크입니다. 작업 시작 전 반드시 확인하시고 모바일 서명을 마쳐주시기 바랍니다. "
    },
    {
      id: "quality-control",
      name: "품질 현장 검사 양식",
      description: "작업 현장에서 실시간 모바일 체크리스트를 기입하고 바코드 스캔 및 전자 서명 후 관리 대장에 즉시 적재하는 실무용 채널",
      path: "/m/quality-control",
      icon: CheckSquare,
      themeColor: "from-indigo-600 to-blue-600 bg-indigo-50 text-indigo-600 border-indigo-100",
      badge: "품질 보증/현장 실무",
      smsTemplate: "[이지데스크] 금일 공정 품질 검사 및 현장 체크리스트 서명 링크입니다. 작업 종료 전 반드시 점검 완료해 주세요. "
    },
    {
      id: "facility-management",
      name: "설비 현장 점검 채널",
      description: "진동 센서 및 가동률 점검, 이상 현상 발생 시 모바일 수기 서명과 STT 음성 메모로 관리 대장에 즉각 송신하는 공장 설비 채널",
      path: "/m/facility-management",
      icon: Wrench,
      themeColor: "from-amber-600 to-yellow-600 bg-amber-50 text-amber-600 border-amber-100",
      badge: "설비 보전/현장 실무",
      smsTemplate: "[이지데스크] 금일 공장 설비 정기 점검 및 수기 서명 링크입니다. 교대 전 반드시 점검 및 전송을 마쳐주시기 바랍니다. "
    },
    {
      id: "finance-cashflow",
      name: "자금 모바일 분석 채널",
      description: "환율 및 원가 시뮬레이션, 90일 자금 흐름 모니터링 및 연체 미수 거래처에 대한 원클릭 FreeSMS 독촉 발송 모바일 웹 채널",
      path: "/m/finance-cashflow",
      icon: Coins,
      themeColor: "from-emerald-600 to-teal-650 bg-emerald-50 text-emerald-600 border-emerald-100",
      badge: "자금/세무/B2B 관리",
      smsTemplate: "[이지데스크] 당사 자금 분석 모바일 관제 센터 링크입니다. 실시간 수금 현황 및 연체 미수 정리를 진행해주세요. "
    },
    {
      id: "production-plan",
      name: "생산 모바일 지시서",
      description: "현장 근무자가 본인 확인 후 당일 생산 공정과 가동 설비 계획을 조회하고 실시간 작업 상태를 전송하는 채널",
      path: "/m/production-plan",
      icon: CalendarDays,
      themeColor: "from-indigo-600 to-violet-650 bg-indigo-50 text-indigo-600 border-indigo-100",
      badge: "생산 계획/현장 지시",
      smsTemplate: "[이지데스크] 금일 공정 작업지시서 무선 동기화 링크입니다. 근무 시작 전 모바일 상태 보고를 진행해주세요. "
    },
    {
      id: "energy-management",
      name: "에너지 모바일 관제",
      description: "공장의 실시간 전력 부하 피크 위험도를 점검하고, 비상 시 모바일을 통해 고전력 설비를 원격 셧다운 제어하는 채널",
      path: "/m/energy-management",
      icon: Zap,
      themeColor: "from-amber-600 to-orange-655 bg-amber-50 text-amber-600 border-amber-100",
      badge: "에너지/피크/현장 실무",
      smsTemplate: "[이지데스크] 당사 공장 실시간 에너지 피크 모바일 제어 센터 링크입니다. 피크 위험 발생 시 즉각 셧다운 조치해주세요. "
    },
    {
      id: "safety-detection",
      name: "위험 모바일 감지",
      description: "CCTV 비전 감지로 인명 상해 사고나 위험구역 침범이 포착될 시 실시간 점멸 비상 경보를 울리고 즉각 셧다운 및 119 신고를 돕는 채널",
      path: "/m/safety-detection",
      icon: ShieldAlert,
      themeColor: "from-red-600 to-rose-650 bg-red-50 text-red-600 border-red-100",
      badge: "안전 관리/비상 대응",
      smsTemplate: "[이지데스크] 현장 비상 위험 경보 전송 채널 링크입니다. 위험 포착 시 모바일 핫키를 통해 긴급 정지 조치를 집행하세요! "
    },
    {
      id: "scm-management",
      name: "공급망 모바일 관제",
      description: "조달 원자재의 세관 통관 및 입고 단계 실시간 업데이트, 기사 긴급 SMS/전화 독촉을 원클릭 수행하는 모바일 웹 채널",
      path: "/m/scm-management",
      icon: Globe,
      themeColor: "from-indigo-650 to-blue-650 bg-indigo-50 text-indigo-600 border-indigo-100",
      badge: "물류/SCM/현장 실무",
      smsTemplate: "[이지데스크] 당사 공급망(SCM) 모바일 실시간 관제 링크입니다. 세관 통관 및 입고 갱신을 진행해주세요. "
    },
    {
      id: "grant-management",
      name: "지원금 모바일 관제",
      description: "당사 조건에 적합한 정부 지원 사업 매칭 리스트 실시간 확인 및 사내 담당자 대상 문자/링크 공유 채널",
      path: "/m/grant-management",
      icon: Award,
      themeColor: "from-amber-600 to-yellow-650 bg-amber-50 text-amber-600 border-amber-100",
      badge: "정책 자금/정부 혜택",
      smsTemplate: "[이지데스크] 당사 맞춤형 정부 지원금/보조금 실시간 모바일 매칭 리스트입니다. 확인 후 신속하게 신청 바랍니다. "
    },
    {
      id: "labor-management",
      name: "노무 모바일 관제",
      description: "임직원별 실시간 근로기준법 한도 초과 위험 상태 조회 및 유선 통화/시정 권고 SMS 즉각 발송 채널",
      path: "/m/labor-management",
      icon: Scale,
      themeColor: "from-rose-600 to-red-650 bg-rose-50 text-rose-600 border-rose-100",
      badge: "근로기준법/노무 관리",
      smsTemplate: "[이지데스크] 당사 실시간 노무 리스크 모바일 알림입니다. 주 52시간 한도 초과 위험이 발견되었으니 신속하게 시정조치 바랍니다. "
    },
    {
      id: "lawyer-ai",
      name: "법률 상담 AI 모바일 관제",
      description: "CEO 전용 모바일 법률 비서. 모바일 퀵 노무/안전 진단, 소송 단계별 가이드라인 및 실시간 판례 검색을 한눈에 조회하는 채널",
      path: "/m/lawyer-ai",
      icon: Scale,
      themeColor: "from-amber-600 to-yellow-650 bg-amber-50 text-amber-600 border-amber-100",
      badge: "소송/법률/CEO 전용",
      smsTemplate: "[이지데스크] CEO 전용 모바일 법률 비서(법률 상담 AI) 채널입니다. 모바일 노무/안전 진단 및 판례 검색을 확인하세요! "
    },
    {
      id: "credit-risk",
      name: "채권 모바일 관제",
      description: "거래처별 실시간 신용 리스크 분석 상태 및 연체 미수 거래처에 대한 다이렉트 모바일 독촉/공유 채널",
      path: "/m/credit-risk",
      icon: Coins,
      themeColor: "from-rose-655 to-pink-650 bg-rose-50 text-rose-600 border-rose-100",
      badge: "채권/신용 관리",
      smsTemplate: "[이지데스크] 당사 채권 리스크 모바일 관제 센터 링크입니다. 연체 미수 거래처의 신용 점수 모니터링 및 즉시 독촉을 진행해주세요. "
    },
    {
      id: "form-management-new",
      name: "모바일 양식 발급 AI",
      description: "임직원이 본인의 모바일 기기에서 재직/경력증명서 등의 행정 서류를 신청하고 간편하게 즉석 발급/출력하는 임직원 전용 채널",
      path: "/m/form-management-new",
      icon: ClipboardList,
      themeColor: "from-indigo-600 to-emerald-650 bg-indigo-50 text-indigo-650 border-indigo-100",
      badge: "임직원 행정/자가 발급",
      smsTemplate: "[이지데스크] 임직원 자가 서류 발급(재직/경력증명서 등) 모바일 웹 링크입니다. 로그인 후 즉석 신청 및 출력을 진행해 주세요. "
    },
    {
      id: "business-card",
      name: "이지데스크 명함 비서",
      description: "거래처 명함을 카메라로 찍어 AI OCR로 등록하고, 폰 주소록 저장 및 내 모바일 명함을 고객에게 즉시 전송하는 직원용 비서 채널",
      path: "/employee/business-card",
      icon: IdCard,
      themeColor: "from-blue-600 to-cyan-600 bg-blue-50 text-blue-600 border-blue-100",
      badge: "영업/스태프 전용",
      smsTemplate: "[이지데스크] 직원의 모바일 명함 비서 링크입니다. 아래 링크에서 미팅한 상대방의 명함 촬영 및 내 명함 발송을 진행해주세요. "
    },
    {
      id: "interpretation-ai",
      name: "실시간 통역 모바일 웹",
      description: "실시간 음성인식(STT) 및 다국어 인공지능 기반 번역으로 고객과의 외국어 소통을 원활하게 돕는 실시간 통역 비서 채널",
      path: "/interpretation-ai",
      icon: Languages,
      themeColor: "from-purple-600 to-indigo-650 bg-purple-50 text-purple-600 border-purple-100",
      badge: "다국어 소통/통역",
      smsTemplate: "[이지데스크] 실시간 다국어 AI 통역 서비스 링크입니다. 아래 링크에서 실시간 통역을 이용해보세요! "
    }
  ];

  const handleCopyLink = async (id: string, path: string) => {
    const fullUrl = `${hostUrl}${path}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      alert("클립보드 복사에 실패했습니다. 브라우저 권한을 확인해주세요.");
    }
  };

  const handlePrintQr = () => {
    if (typeof window !== "undefined") {
      const printWindow = window.open("", "_blank");
      if (printWindow && activeQrChannel) {
        const fullUrl = `${hostUrl}${activeQrChannel.path}`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(fullUrl)}`;
        
        printWindow.document.write(`
          <html>
            <head>
              <title>QR코드 인쇄 - ${activeQrChannel.name}</title>
              <style>
                body {
                  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  height: 100vh;
                  margin: 0;
                  background-color: white;
                  color: #1e293b;
                  text-align: center;
                }
                .container {
                  border: 3px double #cbd5e1;
                  padding: 40px;
                  border-radius: 24px;
                  box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05);
                  max-width: 500px;
                }
                .logo {
                  font-size: 28px;
                  font-weight: 900;
                  color: #2563eb;
                  margin-bottom: 5px;
                  letter-spacing: -0.05em;
                }
                .title {
                  font-size: 22px;
                  font-weight: bold;
                  margin: 20px 0 10px 0;
                }
                .desc {
                  font-size: 14px;
                  color: #64748b;
                  margin-bottom: 30px;
                  line-height: 1.5;
                }
                .qr-img {
                  width: 250px;
                  height: 250px;
                  border: 1px solid #f1f5f9;
                  padding: 10px;
                  border-radius: 12px;
                  background: white;
                }
                .footer {
                  margin-top: 30px;
                  font-size: 11px;
                  color: #94a3b8;
                }
                @media print {
                  body { height: auto; }
                  .container { border: none; box-shadow: none; padding: 20px; }
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="logo">이지데스크 [FreeSMS]</div>
                <div class="title">${activeQrChannel.name}</div>
                <div class="desc">아래 QR코드를 스마트폰 카메라로 비추면<br/>해당 모바일 서비스로 즉시 이동합니다.</div>
                <img class="qr-img" src="${qrUrl}" alt="QR Code" />
                <div class="footer">본 QR 코드는 이지데스크 매장관리 플랫폼에서 생성되었습니다.</div>
              </div>
              <script>
                window.onload = function() {
                  window.print();
                };
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 text-white relative overflow-hidden shadow-xl mb-6">
      {/* 2중 오로라 백그라운드 블러 */}
      <div className="absolute top-[-100px] left-[-100px] w-[350px] h-[350px] rounded-full bg-blue-500/10 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-100px] right-[-100px] w-[350px] h-[350px] rounded-full bg-red-500/10 blur-[100px] pointer-events-none"></div>

      <div className="relative z-10">
        {/* 8대 B2B/B2C 채널 목록 - 4열 콤팩트 그리드 레이아웃 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {channels.map((channel) => {
            const Icon = channel.icon;
            const isCopied = copiedId === channel.id;
            const fullUrl = `${hostUrl}${channel.path}`;

            return (
              <div 
                key={channel.id} 
                className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 flex flex-col justify-between hover:bg-slate-800/80 hover:border-slate-650 transition-all duration-300 group shadow-sm hover:shadow-md animate-fade-in text-left"
              >
                {/* 상단: 아이콘 + 제목 + 뱃지 */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={`p-2.5 rounded-xl bg-gradient-to-br ${channel.themeColor.split(' ').slice(0, 2).join(' ')} text-white shadow-md shrink-0 group-hover:scale-105 transition-transform`}>
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <span className="text-[8px] font-black bg-slate-700/50 text-slate-300 px-2 py-0.5 rounded border border-slate-700 uppercase tracking-wider">
                      {channel.badge}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <h3 className="text-sm font-extrabold text-white tracking-tight group-hover:text-blue-400 transition-colors">
                      {channel.name}
                    </h3>
                    <p className="text-slate-400 text-[11px] leading-relaxed line-clamp-2 min-h-[32px] font-medium">
                      {channel.description}
                    </p>
                  </div>
                </div>

                {/* 하단: 액션 버튼 그룹 */}
                <div className="grid grid-cols-3 gap-1.5 mt-4 pt-3 border-t border-slate-800/60">
                  <button 
                    onClick={() => handleCopyLink(channel.id, channel.path)}
                    className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-[10px] font-black transition-all ${
                      isCopied 
                        ? "bg-green-650 text-white" 
                        : "bg-slate-800 text-slate-350 hover:bg-slate-700 border border-slate-700"
                    }`}
                    title="모바일 링크 복사"
                  >
                    {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{isCopied ? "완료" : "링크"}</span>
                  </button>

                  <button 
                    onClick={() => setActiveQrChannel(channel)}
                    className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-[10px] font-black bg-slate-800 text-slate-350 hover:bg-slate-700 border border-slate-700 transition-all"
                    title="실시간 QR코드 생성"
                  >
                    <QrCode className="w-3 h-3" />
                    <span>QR</span>
                  </button>

                  <a 
                    href={`/sms?message=${encodeURIComponent(channel.smsTemplate + fullUrl)}`}
                    className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-[10px] font-black bg-blue-600 text-white hover:bg-blue-500 shadow-sm transition-all"
                    title="고객에게 SMS 발송"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>발송</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* QR코드 팝업 모달 */}
      {activeQrChannel && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setActiveQrChannel(null)}></div>
          
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl relative z-10 overflow-hidden text-center p-6 md:p-8">
            <button 
              onClick={() => setActiveQrChannel(null)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex flex-col items-center mt-2">
              <span className="bg-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1 rounded-full border border-blue-500/30 mb-2">
                오프라인 매장 홍보용 QR
              </span>
              <h3 className="text-xl font-bold text-white mb-1">{activeQrChannel.name}</h3>
              <p className="text-slate-400 text-xs mb-6 max-w-xs leading-relaxed">
                테이블, 카운터, 메뉴판에 인쇄하여 배치하면 단골 고객들이 모바일 페이지로 즉시 접근할 수 있습니다.
              </p>

              {/* QR 이미지 출력 */}
              <div className="bg-white p-4 rounded-2xl shadow-inner border border-slate-700/50 mb-6 flex items-center justify-center">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`${hostUrl}${activeQrChannel.path}`)}`} 
                  alt={`${activeQrChannel.name} QR Code`} 
                  className="w-48 h-48"
                />
              </div>

              {/* 퀵 주소 안내 */}
              <div className="w-full bg-slate-950/50 rounded-xl p-3 border border-slate-800 text-left font-mono text-xs text-slate-400 break-all flex items-center justify-between gap-2 mb-6">
                <span>{hostUrl}{activeQrChannel.path}</span>
                <a 
                  href={activeQrChannel.path} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-blue-400 hover:underline shrink-0 flex items-center gap-0.5"
                >
                  열기 <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* 하단 제어 버튼 */}
              <div className="flex gap-3 w-full">
                <a 
                  href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(`${hostUrl}${activeQrChannel.path}`)}&download=1`}
                  download={`${activeQrChannel.id}-qr.png`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 border border-slate-700"
                >
                  <Download className="w-4 h-4" />
                  이미지 다운로드
                </a>
                <button 
                  onClick={handlePrintQr}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  QR코드 인쇄
                </button>
              </div>

              {/* 꿀팁 뱃지 */}
              <div className="mt-6 flex items-start gap-2 text-left bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl w-full">
                <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-blue-300 leading-normal">
                  <span className="font-bold">마케팅 꿀팁:</span> QR코드를 라벨지에 출력하여 컵 홀더나 포장 봉투에 부착하면 매장 재방문율을 300% 이상 끌어올릴 수 있습니다!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
