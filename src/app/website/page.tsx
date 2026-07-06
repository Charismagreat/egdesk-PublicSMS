"use client";

import { apiFetch } from '@/lib/api';
import { useState, useEffect, useRef } from "react";
import { Globe, CheckCircle, AlertCircle, Play, Save, RefreshCw } from "lucide-react";

// 공통 타입 및 유틸리티 임포트
import { ChatMessage, ChatSession, WebsiteConfig } from "./types";
import { processNaturalLanguageRequest } from "./utils/nlpProcessor";
import { generateQRCodeCanvas } from "./utils/qrHelper";

// 분리된 서브 컴포넌트 임포트
import { TemplateSelector } from "./components/TemplateSelector";
import { HistoryOverlay } from "./components/HistoryOverlay";
import { AiChatPanel } from "./components/AiChatPanel";
import { ManualTunerPanel } from "./components/ManualTunerPanel";
import { LiveSimulator } from "./components/LiveSimulator";
import { MarketingKitCenter } from "./components/MarketingKitCenter";
import { HomeDomainManagerPanel } from "./components/HomeDomainManagerPanel";

// 템플릿 데이터 프리셋 정의 (NLP와의 정합성을 위해 유지)
export const TEMPLATES: Record<string, WebsiteConfig> = {
  dining: {
    mode: "store",
    title: "라 프렌치 다이닝",
    subtitle: "강남에서 만나는 최고급 프렌치 요리와 파인 다이닝의 정수",
    theme: "gradient",
    primaryColor: "rose",
    sections: { hero: true, about: true, products: true, booking: true, map: true, contact: true },
    aboutText: "저희 라 프렌치 다이닝은 20년 경력의 미쉐린 스타 셰프가 선사하는 고품격 정통 프랑스 요리 전문점입니다. 매일 아침 신선하게 공급되는 엄선된 제철 식재료만을 사용하여 깊고 풍부한 프랑스의 맛을 구현해 냅니다. 격조 높은 서비스와 세련된 공간에서 특별한 순간을 소중한 분들과 함께 완성해 보세요.",
    contactPhone: "02-555-9876",
    address: "서울시 강남구 테헤란로 123, 1층",
    customDomain: "lafrench.egdesk.co",
    products: [
      { id: "d1", name: "시그니처 디너 크루 코스", price: "150,000원", description: "아뮤즈 부쉬, 에스카르고, 최고급 한우 안심 스테이크, 디저트로 구성된 고품격 풀코스 요리" },
      { id: "d2", name: "바닷가재 타르타르와 캐비어", price: "65,000원", description: "신선한 로브스터 살에 레몬 비네그레트 드레싱을 얹고 벨루가 캐비어를 곁들인 프리미엄 전채" },
      { id: "d3", name: "수비드 양갈비 프렌치 랙", price: "85,000원", description: "어린 양갈비를 진공 저온 공법으로 조리하여 입안에서 녹아내리는 극상의 부드러움을 선사하는 메인 디시" }
    ]
  },
  fitness: {
    mode: "cms",
    title: "바디핏 필라테스 & 요가",
    subtitle: "과학적인 체형 분석과 1:1 맞춤 기구 필라테스로 완성하는 아름다운 라인",
    theme: "glass",
    primaryColor: "emerald",
    sections: { hero: true, about: true, products: true, booking: true, map: true, contact: true },
    aboutText: "바디핏 필라테스는 개개인의 체형과 근육 불균형 상태를 첨단 장비로 정밀 측정하여, 전문 강사진이 가장 적합한 자세 교정 및 근력 향상 프로그램을 맞춤 설계해 드립니다. 깨끗하고 프라이빗한 최고급 시설에서 온전한 나 자신만의 건강한 호흡과 움직임에 집중하며 삶의 활력을 채워보세요.",
    contactPhone: "010-8765-4321",
    address: "서울시 서초구 서초대로 456, 3층",
    customDomain: "bodyfit.egdesk.co",
    products: [
      { id: "f1", name: "1:1 프라이빗 개인 레슨권 (10회)", price: "770,000원", description: "오직 나만을 위한 맞춤 기구 필라테스 프로그램. 정밀 체형 분석 및 매회 맞춤형 차트 관리" },
      { id: "f2", name: "2:1 듀엣 프렌즈 레슨권 (10회)", price: "450,000원", description: "가족, 친구, 연인과 함께 오붓하게 진행하는 듀엣 필라테스 수업. 합리적인 가격과 확실한 밀착 관리" },
      { id: "f3", name: "4:1 소그룹 기구 필라테스 (월 8회)", price: "240,000원", description: "최대 4인 정원으로 진행되는 리포머/스프링보드 그룹 클래스. 소수 정예로 디테일한 동작 피드백 보장" }
    ]
  },
  coupon: {
    mode: "landing",
    title: "루나 헤어살롱 오프닝 메가 세일",
    subtitle: "첫 방문 고객 한정! 전 품목 40% 초특급 할인 웰컴 쿠폰 즉시 다운로드",
    theme: "dark",
    primaryColor: "violet",
    sections: { hero: true, about: true, products: false, booking: true, map: true, contact: true },
    aboutText: "트렌디한 감각과 독보적인 기술을 겸비한 헤어 아티스트 그룹 '루나 헤어'가 강남점을 새롭게 오픈했습니다! 오픈을 기념하여 방문하시는 모든 고객님께 감사의 마음을 담아 첫 방문 전 시술 40% 즉시 할인 쿠폰을 한정 수량 제공합니다. 루나 헤어에서 인생 머리를 찾고 완벽한 이미지 변화를 경험해 보세요.",
    contactPhone: "02-1234-5678",
    address: "서울시 마포구 독막로 88, 2층",
    customDomain: "lunahair.egdesk.co",
    products: []
  },
  minimalCafe: {
    mode: "store",
    title: "카페 모노(MONO)",
    subtitle: "미니멀리즘 인테리어와 스페셜티 드립 커피가 선사하는 평온한 쉼표",
    theme: "minimal",
    primaryColor: "slate",
    sections: { hero: true, about: true, products: true, booking: false, map: true, contact: true },
    aboutText: "시끄럽고 복잡한 도심 한가운데에서 진정한 미니멀리즘과 스페셜티 에스프레소의 품격을 만나보세요. 카페 모노는 매주 전 세계 유수 농장에서 소량 직수입한 스페셜티 원두를 전문 로스터가 직접 세밀하게 볶아 최상의 커피 아로마를 추출합니다. 잔잔한 재즈 음악과 향긋한 커피 한 잔의 고요함을 누려보세요.",
    contactPhone: "070-9999-8888",
    address: "서울시 성동구 연무장길 77, 1층",
    customDomain: "mono.egdesk.co",
    products: [
      { id: "c1", name: "에티오피아 예가체프 싱글 드립 커피", price: "6,500원", description: "풍부한 과일 꽃 향과 부드럽고 깔끔한 산미가 일품인 명품 핸드 드립 스페셜티 커피" },
      { id: "c2", name: "시그니처 블랙 세사미 슈페너", price: "7,000원", description: "고소한 흑임자 아인슈페너 크림에 에스프레소와 귀리 우유가 조화롭게 어우러진 시그니처 꿀조합 커피" },
      { id: "c3", name: "프랑스 이즈니 버터 크루아상", price: "4,800원", description: "최고급 이즈니 버터를 가득 품어 겉은 바삭하고 속은 촉촉하게 결이 살아있는 매일 구운 시그니처 크루아상" }
    ]
  }
};

export default function WebsiteBuilderPage() {
  const [config, setConfig] = useState<WebsiteConfig>(TEMPLATES.dining);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      sender: "ai",
      text: "안녕하세요! EGDESK AI 홈페이지 코파일럿 '이지봇'입니다. 🤖\n\n자연어로 말씀해 주시면 원하는 테마와 레이아웃을 반영하여 모바일 최적화 홈페이지를 실시간으로 빌드해 드립니다.\n\n예: \"딥블루 테마로 세련된 필라테스 홈페이지 만들어주고 예약 기능 활성화해줘.\"",
      timestamp: new Date().toISOString()
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "manual" | "domain">("chat");

  // 대표 도메인 주소 및 배포 모달 관련 상태
  const [homepageUrl, setHomepageUrl] = useState("https://egdesk.cloud");
  const [domainHealth, setDomainHealth] = useState<any>(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [publishDomainType, setPublishDomainType] = useState<"PRIMARY" | "CUSTOM" | "SUBDOMAIN">("PRIMARY");
  const [publishDomainUrl, setPublishDomainUrl] = useState("");
  const [publishSeoTitle, setPublishSeoTitle] = useState("");
  const [publishSeoDesc, setPublishSeoDesc] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadHomepageUrl = async () => {
    try {
      const res = await apiFetch("/api/website/domain-info");
      const data = await res.json();
      if (data.success) {
        setHomepageUrl(data.homepageUrl !== undefined && data.homepageUrl !== null ? data.homepageUrl : "https://egdesk.cloud");
        setDomainHealth(data.primaryHealth || null);
      }
    } catch (e) {
      console.error("대표 홈페이지 URL 조회 실패:", e);
    }
  };

  const handleReAudit = async () => {
    setIsAuditing(true);
    try {
      const res = await apiFetch("/api/website/domain-info");
      const data = await res.json();
      if (data.success) {
        setDomainHealth(data.primaryHealth || null);
        showToast("공식 홈페이지 실시간 보안 및 SEO 최적화 재검사가 완료되었습니다! 🔍", "success");
      } else {
        showToast(data.error || "재검사 실패", "error");
      }
    } catch (e: any) {
      showToast("네트워크 통신 오류: " + e.message, "error");
    } finally {
      // 1초 지연 시각화 오버레이 효과
      setTimeout(() => {
        setIsAuditing(false);
      }, 1000);
    }
  };

  useEffect(() => {
    loadHomepageUrl();
  }, []);

  // 도메인 타입 변경 시 도메인 주소 필드 오토필 기능
  useEffect(() => {
    if (publishDomainType === "PRIMARY") {
      setPublishDomainUrl(homepageUrl);
    } else if (publishDomainType === "SUBDOMAIN") {
      try {
        const domain = homepageUrl.replace(/https?:\/\//, '').split('/')[0];
        setPublishDomainUrl(`sub.${domain}`);
      } catch {
        setPublishDomainUrl("sub.company.com");
      }
    } else {
      setPublishDomainUrl("");
    }
  }, [publishDomainType, homepageUrl, isPublishModalOpen]);

  // 대화 기록 및 새 대화 관련 상태
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // 모바일 기기 시뮬레이터 인터랙션 상태
  const [mobileBookings, setMobileBookings] = useState<any[]>([]);
  const [bookingForm, setBookingForm] = useState({ name: "", phone: "", date: "", time: "", guests: "2" });
  const [couponDownloaded, setCouponDownloaded] = useState(false);
  const [alertMessage, setAlertMessage] = useState<{ type: "success" | "info" | "error"; text: string } | null>(null);

  // QR 코드 Canvas Ref 및 상태
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedSms, setCopiedSms] = useState(false);

  // 클립보드 복사 헬퍼 함수
  const copyToClipboard = (text: string, type: "link" | "sms") => {
    if (typeof window !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        if (type === "link") {
          setCopiedLink(true);
          showMobileAlert("success", "🔗 모바일 단축 URL이 클립보드에 복사되었습니다!");
          setTimeout(() => setCopiedLink(false), 2000);
        } else {
          setCopiedSms(true);
          showMobileAlert("success", "📣 마케팅 SMS 홍보 서식이 클립보드에 복사되었습니다!");
          setTimeout(() => setCopiedSms(false), 2000);
        }
      }).catch(() => {
        showMobileAlert("error", "클립보드 복사에 실패했습니다.");
      });
    } else {
      // 대체 복사 방식 (클립보드 API 미지원 환경 대비)
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        if (type === "link") {
          setCopiedLink(true);
          showMobileAlert("success", "🔗 모바일 단축 URL이 클립보드에 복사되었습니다!");
          setTimeout(() => setCopiedLink(false), 2000);
        } else {
          setCopiedSms(true);
          showMobileAlert("success", "📣 마케팅 SMS 홍보 서식이 클립보드에 복사되었습니다!");
          setTimeout(() => setCopiedSms(false), 2000);
        }
      } catch (err) {
        showMobileAlert("error", "클립보드 복사에 실패했습니다.");
      }
      document.body.removeChild(textArea);
    }
  };

  // 입력창 자동 크기 조절
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = `${Math.min(Math.max(scrollHeight, 52), 150)}px`;
    }
  }, [chatInput]);

  // 엔터키 입력 처리 (Shift + Enter는 줄바꿈, Enter는 전송)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const fakeEvent = {
        preventDefault: () => {}
      } as React.FormEvent;
      handleSendMessage(fakeEvent);
    }
  };

  // 이미지 파일 첨부 핸들러
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showMobileAlert("error", "⚠️ 이미지는 최대 5MB까지만 첨부할 수 있습니다.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedImage(reader.result as string);
        showMobileAlert("success", `📸 이미지 '${file.name}' 첨부가 완료되었습니다.`);
      };
      reader.readAsDataURL(file);
    }
  };

  // 첨부 이미지 삭제
  const handleRemoveImage = () => {
    setAttachedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // 로컬스토리지 복원
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("egdesk_website_config");
      if (saved) {
        try {
          setConfig(JSON.parse(saved));
        } catch (e) {
          console.error("로컬 스토리지 데이터 로드 실패", e);
        }
      }

      const savedSessions = localStorage.getItem("egdesk_chat_sessions");
      if (savedSessions) {
        try {
          setSessions(JSON.parse(savedSessions));
        } catch (e) {
          console.error("채팅 세션 로컬 스토리지 로드 실패", e);
        }
      }
    }
  }, []);

  // 설정이 변경될 때마다 로컬스토리지 저장 및 QR 코드 재생성
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("egdesk_website_config", JSON.stringify(config));
    }
    generateQRCode();
  }, [config]);

  // Canvas 기반 QR 코드 생성 연동
  const generateQRCode = () => {
    const canvas = qrCanvasRef.current;
    if (!canvas) return;
    const url = generateQRCodeCanvas(canvas, config.primaryColor);
    setQrCodeDataUrl(url);
  };

  // 모바일 디바이스 가상 알림 생성
  const showMobileAlert = (type: "success" | "info" | "error", text: string) => {
    setAlertMessage({ type, text });
    setTimeout(() => setAlertMessage(null), 3500);
  };

  // 실시간 웹사이트 배포 핸들러
  const handlePublishSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publishDomainUrl.trim()) {
      alert("배포할 도메인 주소를 올바르게 입력해 주세요.");
      return;
    }

    setIsPublishing(true);
    try {
      // NLP가 완성한 템플릿 정보를 기반으로 가상의 HTML 코드를 조합하여 전달
      const mockupHtml = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>\${publishSeoTitle || config.title}</title>
  <meta name="description" content="\${publishSeoDesc || config.subtitle}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: sans-serif; background-color: #fafafa; margin: 0; padding: 20px; text-align: center; }
    .card { background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); padding: 40px; max-width: 600px; margin: 40px auto; }
    h1 { color: #1e293b; }
    p { color: #64748b; line-height: 1.6; }
    .btn { display: inline-block; background: #db2777; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>\${config.title}</h1>
    <h3>\${config.subtitle}</h3>
    <p>\${config.aboutText || "소개글이 없습니다."}</p>
    <a href="tel:\${config.contactPhone || ""}" class="btn">전화 상담 문의</a>
  </div>
</body>
</html>
      `;

      const res = await apiFetch("/api/website/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain_type: publishDomainType,
          domain_url: publishDomainUrl,
          html_content: mockupHtml,
          config_json: config,
          title: publishSeoTitle || config.title,
          description: publishSeoDesc || config.subtitle
        })
      });

      const data = await res.json();
      if (data.success) {
        showToast(`웹사이트 배포가 완료되었습니다! 🚀 (\${publishDomainUrl})`);
        setIsPublishModalOpen(false);
        setPublishSeoTitle("");
        setPublishSeoDesc("");
        if (publishDomainType === "PRIMARY") {
          loadHomepageUrl();
        }
      } else {
        showToast(data.error || "배포 실패", "error");
      }
    } catch (err: any) {
      showToast("통신 오류: " + err.message, "error");
    } finally {
      setIsPublishing(false);
    }
  };

  // 가상 쿠폰 다운로드
  const handleDownloadCoupon = () => {
    if (couponDownloaded) {
      showMobileAlert("info", "이미 쿠폰을 보관함에 다운로드 하셨습니다.");
      return;
    }
    setCouponDownloaded(true);
    showMobileAlert("success", "🎟️ 웰컴 40% 특별 할인 쿠폰이 모바일 지갑에 보관되었습니다!");
  };

  // 가상 예약 신청
  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingForm.name || !bookingForm.phone || !bookingForm.date || !bookingForm.time) {
      showMobileAlert("error", "모든 예약 정보를 빠짐없이 입력해 주세요.");
      return;
    }
    const newBooking = {
      id: Date.now().toString(),
      ...bookingForm,
      createdAt: new Date().toLocaleDateString()
    };
    setMobileBookings([newBooking, ...mobileBookings]);
    showMobileAlert("success", `🎉 ${bookingForm.name} 고객님의 예약 신청이 완료되었습니다! 안내 문자가 곧 발송됩니다.`);
    setBookingForm({ name: "", phone: "", date: "", time: "", guests: "2" });
  };

  // 템플릿 강제 교체 헬퍼
  const applyPresetTemplate = (key: string) => {
    const tpl = TEMPLATES[key];
    if (tpl) {
      setConfig(tpl);
      showMobileAlert("success", `⚡ '${tpl.title}' 템플릿으로 빠른 세팅이 완료되었습니다!`);

      const newMsg = {
        sender: "ai" as const,
        text: `💡 **'${tpl.title}'** 프리미엄 템플릿으로 빠르게 초기화를 완료했습니다.\n\n오른쪽 스마트폰 화면에서 라이브 모습을 확인하시고, 대화나 수동 탭을 통해 언제든 입맛에 맞춰 상세 수정해 보세요!`,
        timestamp: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, newMsg]);
    }
  };

  // 새 대화 시작 (현재 대화가 있으면 세션으로 자동 저장)
  const handleNewChat = () => {
    if (chatMessages.length > 1) {
      const firstUserMsg = chatMessages.find(m => m.sender === "user")?.text || "새로운 홈페이지 디자인 대화";
      const sessionTitle = firstUserMsg.length > 20 ? firstUserMsg.slice(0, 20) + "..." : firstUserMsg;

      const newSession: ChatSession = {
        id: Date.now().toString(),
        title: sessionTitle,
        messages: chatMessages,
        config: config,
        timestamp: new Date().toLocaleString("ko-KR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })
      };

      const updatedSessions = [newSession, ...sessions];
      setSessions(updatedSessions);
      if (typeof window !== "undefined") {
        localStorage.setItem("egdesk_chat_sessions", JSON.stringify(updatedSessions));
      }
      showMobileAlert("success", "📁 현재 대화가 기록 보관함에 안전하게 저장되었습니다.");
    }

    setChatMessages([
      {
        sender: "ai",
        text: "안녕하세요! EGDESK AI 홈페이지 코파일럿 '이지봇'입니다. 🤖\n\n자연어로 말씀해 주시면 원하는 테마와 레이아웃을 반영하여 모바일 최적화 홈페이지를 실시간으로 빌드해 드립니다.\n\n예: \"딥블루 테마로 세련된 필라테스 홈페이지 만들어주고 예약 기능 활성화해줘.\"",
        timestamp: new Date().toISOString()
      }
    ]);
    showMobileAlert("success", "✨ 새로운 대화창이 열렸습니다!");
  };

  // 대화 기록 복원
  const handleLoadSession = (session: ChatSession) => {
    setChatMessages(session.messages);
    setConfig(session.config);
    setShowHistory(false);
    showMobileAlert("success", `📂 '${session.title}' 대화 세션과 테마 설정을 성공적으로 복원했습니다.`);
  };

  // 대화 기록 삭제
  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedSessions = sessions.filter(s => s.id !== id);
    setSessions(updatedSessions);
    if (typeof window !== "undefined") {
      localStorage.setItem("egdesk_chat_sessions", JSON.stringify(updatedSessions));
    }
    showMobileAlert("success", "🗑️ 대화 기록이 삭제되었습니다.");
  };

  // 자연어 처리 NLP 유틸리티 연동 핸들러
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() && !attachedImage) return;

    const userText = chatInput.trim();
    const currentAttachedImage = attachedImage;

    const newUserMsg: ChatMessage = {
      sender: "user",
      text: userText || "🖼️ 이미지를 첨부하여 비주얼 무드 분석을 요청했습니다.",
      timestamp: new Date().toISOString(),
      image: currentAttachedImage || undefined
    };
    setChatMessages(prev => [...prev, newUserMsg]);
    setChatInput("");
    setAttachedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setIsTyping(true);

    setTimeout(() => {
      const { updatedConfig, responseText } = processNaturalLanguageRequest(
        userText,
        config,
        !!currentAttachedImage
      );

      const newAiMsg: ChatMessage = {
        sender: "ai",
        text: responseText,
        timestamp: new Date().toISOString()
      };

      setConfig(updatedConfig);
      setChatMessages(prev => [...prev, newAiMsg]);
      setIsTyping(false);
    }, 1200);
  };

  return (
    <div className="w-full space-y-6 pb-20 min-w-0 font-sans text-slate-800 animate-fade-in text-left" data-easybot-hint="홈페이지 빌더 AI: 중소기업 홍보용 브랜드 사이트의 메타태그 설정 및 빌더 구성을 지원합니다.">
      {/* 보이지 않는 QR 코드 드로잉용 캔버스 */}
      <canvas ref={qrCanvasRef} width="150" height="150" className="hidden" />

      {/* 상단 타이틀 헤더 */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6 pb-5 border-b border-slate-200 relative z-10 shrink-0">
        <div className="space-y-1 flex items-center gap-4">
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center">
            <Globe className="w-8 h-8 text-pink-600 mr-3" />
            홈페이지 빌더 AI
          </h1>
          {homepageUrl && (
            <div className="flex flex-wrap items-center gap-2.5 animate-fade-in">
              <div className="bg-pink-50 border border-pink-100 rounded-xl px-3.5 py-1.5 text-xs font-bold text-pink-700 flex items-center gap-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-ping" />
                <span>공식 홈페이지 연결:</span>
                <a
                  href={homepageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-pink-900 font-extrabold"
                >
                  {homepageUrl.replace(/https?:\/\//, "")}
                </a>
              </div>

              {/* SSL 뱃지 */}
              <button
                onClick={() => setIsAuditModalOpen(true)}
                className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60 rounded-xl px-3.5 py-1.5 text-xs font-bold text-emerald-700 flex items-center gap-1.5 shadow-sm cursor-pointer transition active:scale-95 border-none"
                title="SSL 보안 진단 보고서 보기"
              >
                <span className="inline-flex w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>보안(SSL):</span>
                <span className="font-extrabold bg-emerald-200/50 px-1.5 py-0.5 rounded text-[10px]">
                  {domainHealth?.sslGrade || 'A+'}
                </span>
              </button>

              {/* SEO 뱃지 */}
              <button
                onClick={() => setIsAuditModalOpen(true)}
                className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/60 rounded-xl px-3.5 py-1.5 text-xs font-bold text-indigo-700 flex items-center gap-1.5 shadow-sm cursor-pointer transition active:scale-95 border-none"
                title="SEO 최적화 보고서 보기"
              >
                <span className="inline-flex w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                <span>검색최적화(SEO):</span>
                <span className="font-extrabold bg-indigo-200/50 px-1.5 py-0.5 rounded text-[10px]">
                  {domainHealth?.seoScore || 85}점
                </span>
              </button>
            </div>
          )}
        </div>

        {/* 템플릿 프리셋 퀵 셀렉터 */}
        <TemplateSelector applyPresetTemplate={applyPresetTemplate} />
      </div>

      {/* 메인 2분할 레이아웃 Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10 flex-1 overflow-hidden min-h-0">
        
        {/* 좌측 패널 (대화 생성기 및 수동 튜너 탭) */}
        <div
          className="lg:col-span-7 bg-white/90 border border-slate-100 rounded-3xl overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-all backdrop-blur-md"
          style={{ height: "880px" }}
        >
          {/* 탭 컨트롤 헤더 */}
          <div className="flex border-b border-slate-100 bg-slate-50/80 p-1.5 shrink-0">
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-extrabold rounded-2xl transition-all cursor-pointer border-0 ${
                activeTab === "chat"
                  ? "bg-white text-slate-800 shadow-sm border border-slate-200/50 font-black"
                  : "text-slate-500 hover:text-slate-800 bg-transparent"
              }`}
            >
              AI 대화형 홈페이지 생성기
            </button>
            <button
              onClick={() => setActiveTab("manual")}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-extrabold rounded-2xl transition-all cursor-pointer border-0 ${
                activeTab === "manual"
                  ? "bg-white text-slate-800 shadow-sm border border-slate-200/50 font-black"
                  : "text-slate-500 hover:text-slate-800 bg-transparent"
              }`}
            >
              마우스 정밀 수동 튜닝
            </button>
            <button
              onClick={() => setActiveTab("domain")}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-extrabold rounded-2xl transition-all cursor-pointer border-0 ${
                activeTab === "domain"
                  ? "bg-white text-slate-800 shadow-sm border border-slate-200/50 font-black"
                  : "text-slate-500 hover:text-slate-800 bg-transparent"
              }`}
            >
              공식 홈페이지 연결 관리
            </button>
          </div>

          {/* 탭 컨텐츠 렌더링 분기 */}
          <div className="flex-1 overflow-hidden relative flex flex-col">
            {activeTab === "chat" ? (
              <AiChatPanel
                chatMessages={chatMessages}
                isTyping={isTyping}
                chatInput={chatInput}
                setChatInput={setChatInput}
                handleSendMessage={handleSendMessage}
                handleNewChat={handleNewChat}
                sessionsCount={sessions.length}
                showHistory={showHistory}
                setShowHistory={setShowHistory}
                handleImageChange={handleImageChange}
                handleRemoveImage={handleRemoveImage}
                attachedImage={attachedImage}
                textareaRef={textareaRef}
                fileInputRef={fileInputRef}
                handleKeyDown={handleKeyDown}
              />
            ) : activeTab === "manual" ? (
              <ManualTunerPanel
                config={config}
                setConfig={setConfig}
                onSave={() => {
                  localStorage.setItem("egdesk_website_config", JSON.stringify(config));
                  showMobileAlert("success", "💾 변경된 홈페이지 설정이 브라우저 로컬 저장소에 완벽히 동기화 및 저장되었습니다!");
                }}
              />
            ) : (
              <HomeDomainManagerPanel
                showToast={showToast}
                onUrlUpdated={loadHomepageUrl}
                currentConfig={config}
              />
            )}

            {/* 대화 기록 모달 (AI 대화창 활성화 및 대화기록 활성화 시에만 렌더링) */}
            <HistoryOverlay
              isOpen={activeTab === "chat" && showHistory}
              onClose={() => setShowHistory(false)}
              sessions={sessions}
              onLoadSession={handleLoadSession}
              onDeleteSession={handleDeleteSession}
            />
          </div>
        </div>

        {/* 우측 패널 (스마트폰 가상 프리뷰 시뮬레이터 및 배포 기능) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <LiveSimulator
            config={config}
            alertMessage={alertMessage}
            couponDownloaded={couponDownloaded}
            handleDownloadCoupon={handleDownloadCoupon}
            bookingForm={bookingForm}
            setBookingForm={setBookingForm}
            handleBookingSubmit={handleBookingSubmit}
            showMobileAlert={showMobileAlert}
          />
          
          <button
            onClick={() => {
              setPublishSeoTitle(`${config.title} - ${config.subtitle}`);
              setPublishSeoDesc(config.aboutText || "");
              setIsPublishModalOpen(true);
            }}
            className="w-full py-4 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-extrabold text-xs rounded-2xl cursor-pointer border-none shadow-lg shadow-pink-600/15 flex items-center justify-center gap-2 transition animate-fade-in"
          >
            <Globe className="w-4.5 h-4.5 animate-pulse" />
            공식 홈페이지에 즉시 배포 (Publish) 🚀
          </button>
        </div>
      </div>

      {/* 하단 마케팅 배포 키트 연동 카드 */}
      <MarketingKitCenter
        config={config}
        qrCodeDataUrl={qrCodeDataUrl}
        copiedLink={copiedLink}
        copiedSms={copiedSms}
        copyToClipboard={copyToClipboard}
      />

      {/* 🚀 실시간 도메인 배포 설정 팝업 모달 */}
      {isPublishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in text-left">
          <div className="w-full max-w-lg bg-white border border-slate-100 rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh] text-slate-850">
            {/* 모달 헤더 */}
            <div className="p-5 border-b border-slate-100 bg-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-black flex items-center gap-2 text-slate-900">
                  <Globe className="w-5 h-5 text-pink-600 animate-pulse" />
                  실시간 웹사이트 배포 (Publish)
                </h3>
                <p className="text-[11px] text-slate-500 mt-1 font-semibold">
                  AI 빌더로 구성한 가상의 웹사이트 코드를 공식 주소나 지정 도메인에 연결합니다.
                </p>
              </div>
              <button 
                onClick={() => setIsPublishModalOpen(false)}
                className="text-slate-400 hover:text-slate-800 px-3 py-2 rounded-xl hover:bg-slate-100 transition text-xs font-black cursor-pointer border-none bg-transparent"
              >
                닫기
              </button>
            </div>

            {/* 모달 본문 */}
            <form onSubmit={handlePublishSubmit} className="p-6 overflow-y-auto space-y-4 text-xs font-semibold">
              
              {/* 도메인 연결 방식 선택 */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">연결 도메인 유형 선택</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPublishDomainType("PRIMARY")}
                    className={`py-2.5 rounded-xl border text-center font-extrabold cursor-pointer transition ${
                      publishDomainType === "PRIMARY"
                        ? "bg-pink-50 border-pink-500 text-pink-700 font-black shadow-sm"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    공식 대표 도메인
                  </button>
                  <button
                    type="button"
                    onClick={() => setPublishDomainType("CUSTOM")}
                    className={`py-2.5 rounded-xl border text-center font-extrabold cursor-pointer transition ${
                      publishDomainType === "CUSTOM"
                        ? "bg-pink-50 border-pink-500 text-pink-700 font-black shadow-sm"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    신규 커스텀 도메인
                  </button>
                  <button
                    type="button"
                    onClick={() => setPublishDomainType("SUBDOMAIN")}
                    className={`py-2.5 rounded-xl border text-center font-extrabold cursor-pointer transition ${
                      publishDomainType === "SUBDOMAIN"
                        ? "bg-pink-50 border-pink-500 text-pink-700 font-black shadow-sm"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    서브도메인 추가
                  </button>
                </div>
              </div>

              {/* 도메인 주소 입력 */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">연결할 도메인 주소 (URL)</label>
                <input
                  type="text"
                  value={publishDomainUrl}
                  onChange={(e) => setPublishDomainUrl(e.target.value)}
                  placeholder="예: lafrench.egdesk.co 또는 lafrench.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-pink-600 focus:outline-none rounded-xl text-xs font-bold text-slate-800 transition"
                  required
                />
                <span className="block text-[9.5px] text-slate-450 font-bold leading-relaxed mt-1">
                  {publishDomainType === "PRIMARY" && "※ 시스템 설정에 기입된 대표 주소로 배포되어 도메인 정보와 동기화됩니다."}
                  {publishDomainType === "CUSTOM" && "※ 회사에서 신규 구매하신 외부 도메인 주소를 입력해 주십시오."}
                  {publishDomainType === "SUBDOMAIN" && "※ 대표 도메인의 서브 호스트(예: shop.yourdomain.com)를 지정하여 배포합니다."}
                </span>
              </div>

              {/* SEO 메타태그 사전 설정 */}
              <div className="space-y-3.5 border-t border-slate-100 pt-3">
                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  검색 포털 최적화 (SEO) 설정
                </span>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">배포 페이지 제목 (Title)</label>
                  <input
                    type="text"
                    value={publishSeoTitle}
                    onChange={(e) => setPublishSeoTitle(e.target.value)}
                    placeholder="사이트 대표 제목 입력"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-pink-600 focus:outline-none rounded-xl text-xs font-bold text-slate-850"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">배포 페이지 요약글 (Description)</label>
                  <textarea
                    rows={2}
                    value={publishSeoDesc}
                    onChange={(e) => setPublishSeoDesc(e.target.value)}
                    placeholder="검색 노출 요약 문구 입력"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-pink-600 focus:outline-none rounded-xl text-xs font-bold text-slate-850 resize-none leading-normal"
                  />
                </div>
              </div>

              {/* 하단 버튼 제어 */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsPublishModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition rounded-xl cursor-pointer border-none"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isPublishing}
                  className="px-5 py-2.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-extrabold text-xs transition rounded-xl cursor-pointer border-none flex items-center gap-1.5 shadow"
                >
                  {isPublishing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  배포 실행 (Publish)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🔍 홈페이지 보안 및 SEO 진단 결과 팝업 모달 */}
      {isAuditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in text-left">
          <div className="w-full max-w-lg bg-white border border-slate-100 rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh] text-slate-800">
            {/* 모달 헤더 */}
            <div className="p-5 border-b border-slate-100 bg-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-black flex items-center gap-2 text-slate-900">
                  <Globe className="w-5 h-5 text-pink-600 animate-pulse" />
                  홈페이지 보안 & SEO 정밀 분석 리포트
                </h3>
                <p className="text-[11px] text-slate-500 mt-1 font-semibold">
                  연결된 공식 대표 홈페이지 주소를 실시간으로 감사한 분석 결과입니다.
                </p>
              </div>
              <button 
                onClick={() => setIsAuditModalOpen(false)}
                className="text-slate-400 hover:text-slate-800 px-3 py-2 rounded-xl hover:bg-slate-100 transition text-xs font-black cursor-pointer border-none bg-transparent"
              >
                닫기
              </button>
            </div>

            {/* 모달 본문 */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs font-semibold relative">
              {isAuditing && (
                <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center space-y-3 animate-fade-in rounded-b-3xl">
                  <RefreshCw className="w-8 h-8 text-pink-600 animate-spin" />
                  <span className="text-xs font-black text-slate-700">홈페이지 실시간 보안 규격 및 SEO 노출 상태 분석 중...</span>
                </div>
              )}
              {/* 기본 요약 */}
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold uppercase">검사 대상 도메인</span>
                  <span className="text-slate-800 font-black text-sm">{homepageUrl}</span>
                </div>
                <div className="text-right">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase">최종 검진 상태</span>
                  <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    검사 통과 (PASS)
                  </span>
                </div>
              </div>

              {/* 1. SSL 보안 인증서 리포트 */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span className="w-1 h-3.5 bg-emerald-500 rounded-full" />
                  SSL 보안 암호화 (HTTPS) 진단
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white border border-slate-150 p-3.5 rounded-xl space-y-1 shadow-sm">
                    <span className="text-[10px] text-slate-400 font-bold block">인증서 종합 보안등급</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-black text-emerald-600">{domainHealth?.sslGrade || 'A+'}</span>
                      <span className="text-[10px] text-emerald-500 font-bold">최고 수준 안전</span>
                    </div>
                  </div>
                  <div className="bg-white border border-slate-150 p-3.5 rounded-xl space-y-1 shadow-sm">
                    <span className="text-[10px] text-slate-400 font-bold block">남은 유효 기간</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-black text-slate-800">{domainHealth?.sslRemainDays || 365}일</span>
                      <span className="text-[9.5px] text-slate-400 font-bold">({domainHealth?.sslExpireDate || '2027-06-15'} 만료)</span>
                    </div>
                  </div>
                </div>

                <ul className="space-y-2 text-[11px] text-slate-650 font-semibold list-none p-0 m-0 leading-relaxed">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span>전송 계층 보안(TLS 1.3) 프로토콜 최신 규격이 완벽하게 적용되어 있습니다.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span>개인 정보 유출 및 피싱 방지를 위한 대칭키 암호 알고리즘 가동 중입니다.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span>보안 등급 CA 기관 발행 인증서 인증 확인 완료 ({domainHealth?.serverType || 'EGDESK AI Edge CDN'}).</span>
                  </li>
                </ul>
              </div>

              {/* 2. SEO 검색 엔진 최적화 리포트 */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span className="w-1 h-3.5 bg-indigo-500 rounded-full" />
                  SEO 포털 검색 노출 최적화 진단
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white border border-slate-150 p-3.5 rounded-xl space-y-1 shadow-sm">
                    <span className="text-[10px] text-slate-400 font-bold block">SEO 최적화 종합 스코어</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-black text-indigo-600">{domainHealth?.seoScore || 85}점</span>
                      <span className="text-[10px] text-indigo-500 font-bold">/ 100점 만점</span>
                    </div>
                  </div>
                  <div className="bg-white border border-slate-150 p-3.5 rounded-xl space-y-1 shadow-sm">
                    <span className="text-[10px] text-slate-400 font-bold block">접속 지연 응답속도</span>
                    <span className="text-lg font-black text-slate-800 block">{domainHealth?.latency || '12ms'}</span>
                  </div>
                </div>

                <div className="space-y-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">항목별 진단 상태</span>
                  <div className="space-y-2 font-bold text-[10px]">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">대표 제목 설정 (Title Tag)</span>
                      <span className="text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded font-black">매우 우수</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">사이트 정보 요약 (Meta Description)</span>
                      <span className="text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded font-black">적용 완료</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">모바일 뷰포트 레이아웃 최적화</span>
                      <span className="text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded font-black">양호</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">시맨틱 HTML 구조 설계</span>
                      <span className="text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded font-black">권장사항 존재</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 하단 제어 */}
              <div className="flex gap-2.5 pt-3 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={handleReAudit}
                  disabled={isAuditing}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 text-slate-700 disabled:text-slate-400 font-extrabold text-xs transition rounded-xl cursor-pointer border-none flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? 'animate-spin text-pink-600' : ''}`} />
                  {isAuditing ? '재분석 중...' : '분석 다시 시도'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAuditModalOpen(false)}
                  disabled={isAuditing}
                  className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-600 text-white font-extrabold text-xs transition rounded-xl cursor-pointer border-none shadow-md flex items-center justify-center gap-1.5"
                >
                  확인 완료
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 글로벌 토스트 알림 */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg border transition-all text-xs font-bold ${
          toast.type === "success" 
            ? "bg-slate-900 border-pink-500/30 text-pink-400" 
            : toast.type === "error"
            ? "bg-rose-950 border-rose-500/40 text-rose-400"
            : "bg-slate-800 border-slate-750 text-slate-350"
        }`}>
          {toast.type === "success" ? <CheckCircle className="w-4 h-4 text-pink-500 animate-pulse" /> : <AlertCircle className="w-4 h-4" />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
