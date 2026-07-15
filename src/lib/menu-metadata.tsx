import React from "react";
import { 
  Home, Users, MessageSquare, Settings, ShoppingCart, 
  ClipboardList, CreditCard, CalendarDays, Truck, Send, 
  PackageSearch, Package, UserCog, Zap, Ticket, Landmark, Globe, Briefcase, HelpCircle,
  ArrowRightLeft, Handshake, Sparkles, Coins, Database, Compass, Shield, CheckSquare, Wrench, ShieldAlert, Award, Scale, Key, Mic, Bot, Mail
} from "lucide-react";

// 커스텀 인스타그램 아이콘 SVG
export function InstagramIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

// 커스텀 네이버 아이콘 SVG
export function NaverIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="currentColor" 
      className={className}
    >
      <path d="M16.2 3H21v18h-4.8l-7.4-11V21H4V3h4.8l7.4 11V3z"/>
    </svg>
  );
}

// 커스텀 유튜브 아이콘 SVG
export function YoutubeIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="currentColor" 
      className={className}
    >
      <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.108C19.517 3.545 12 3.545 12 3.545s-7.516 0-9.387.51a3.003 3.003 0 0 0-2.11 2.108C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.108c1.871.51 9.387.51 9.387.51s7.517 0 9.387-.51a3.003 3.003 0 0 0 2.11-2.108C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  );
}

export interface MenuMetadata {
  href: string;
  label: string;
  icon: React.ComponentType<any>;
  color: string;
  category: number;
}

// 💡 마스터 메뉴 명세 리스트 (SSOT)
export const MENU_METADATA_LIST: MenuMetadata[] = [
  // 1. 마케팅/채널/소통 (대고객 접점 및 채널)
  { href: "/", label: "모바일 채널", icon: Home, color: "text-blue-550", category: 1 },
  { href: "/sms", label: "무료 문자 발송 AI", icon: MessageSquare, color: "text-purple-550", category: 1 },
  { href: "/message-logs", label: "발송 내역 조회", icon: Send, color: "text-purple-550", category: 1 },
  { href: "/automation", label: "자동 발송 설정", icon: Zap, color: "text-yellow-600", category: 1 },
  { href: "/instagram", label: "인스타그램 마케팅 AI", icon: InstagramIcon, color: "text-[#ff007f]", category: 1 },
  { href: "/naver-blog", label: "N-BLOG 포스팅 AI", icon: NaverIcon, color: "text-[#2db400]", category: 1 },
  { href: "/youtube-shorts", label: "YOUTUBE 쇼츠 AI", icon: YoutubeIcon, color: "text-[#FF0000]", category: 1 },
  { href: "/website", label: "홈페이지 빌더 AI", icon: Globe, color: "text-sky-555", category: 1 },
  
  // 2. 고객/매출/결제 (비즈니스 거래 흐름)
  { href: "/customers", label: "고객 관리 AI", icon: Users, color: "text-green-600", category: 2 },
  { href: "/partners", label: "거래처 관리 AI", icon: Handshake, color: "text-emerald-600", category: 2 },
  { href: "/transactions", label: "거래 관리 AI", icon: ShoppingCart, color: "text-orange-555", category: 2 },
  { href: "/orders", label: "주문 관리 AI", icon: ClipboardList, color: "text-blue-550", category: 2 },
  { href: "/payments", label: "결제 관리 AI", icon: CreditCard, color: "text-emerald-600", category: 2 },
  { href: "/estimates", label: "견적/발주/수주 AI", icon: ArrowRightLeft, color: "text-indigo-550", category: 2 },
  { href: "/coupons", label: "쿠폰 관리 AI", icon: Ticket, color: "text-rose-555", category: 2 },
  { href: "/credit-risk", label: "채권 관리 AI", icon: CreditCard, color: "text-rose-555", category: 2 },
  { href: "/mail-management-ai", label: "메일 관리 AI", icon: Mail, color: "text-cyan-400", category: 2 },
  { href: "/form-management-new", label: "양식 관리 AI", icon: ClipboardList, color: "text-emerald-500", category: 2 },
  { href: "/import-customs", label: "수입 통관 AI", icon: Truck, color: "text-indigo-600", category: 2 },
  { href: "/products", label: "상품 관리 AI", icon: PackageSearch, color: "text-amber-600", category: 2 },

  // 3. 생산/재고/안전 (공장/물류/제조 현장)
  { href: "/inventory", label: "재고 관리 AI", icon: Package, color: "text-cyan-600", category: 3 },
  { href: "/facility-management", label: "설비 관리 AI", icon: Wrench, color: "text-amber-550", category: 3 },
  { href: "/production-plan", label: "생산 계획 AI", icon: CalendarDays, color: "text-indigo-550", category: 3 },
  { href: "/energy-management", label: "에너지 관리 AI", icon: Zap, color: "text-amber-550", category: 3 },
  { href: "/safety-management", label: "안전 관리 AI", icon: Shield, color: "text-red-655", category: 3 },
  { href: "/safety-detection", label: "위험 감지 AI", icon: ShieldAlert, color: "text-red-655", category: 3 },
  { href: "/quality-control", label: "품질 관리 AI", icon: CheckSquare, color: "text-indigo-600", category: 3 },
  { href: "/scm-management", label: "공급망 관리 AI", icon: Globe, color: "text-indigo-555", category: 3 },
  { href: "/grant-management", label: "지원금 신청 AI", icon: Award, color: "text-amber-555", category: 3 },
  { href: "/knowledge-ai", label: "지식 관리 AI", icon: Compass, color: "text-indigo-550", category: 3 },
  { href: "/ecount-erp-ai", label: "이카운트 ERP AI", icon: ArrowRightLeft, color: "text-sky-550", category: 3 },

  // 4. 인사/노무/경영지원 (전사 백오피스)
  { href: "/hr/attendance", label: "근태 관리 AI", icon: CalendarDays, color: "text-indigo-650", category: 4 },
  { href: "/recruitment", label: "채용 매니저 AI", icon: Briefcase, color: "text-rose-550", category: 4 },
  { href: "/expenses", label: "지출 관리 AI", icon: Coins, color: "text-rose-550", category: 4 },
  { href: "/finance", label: "금융 정보 AI", icon: Landmark, color: "text-sky-555", category: 4 },
  { href: "/finance-management", label: "금융 관리 AI", icon: Landmark, color: "text-sky-500", category: 4 },
  { href: "/financials", label: "재무 정보 AI", icon: Landmark, color: "text-teal-600", category: 4 },
  { href: "/finance-cashflow", label: "자금/원가 AI", icon: Coins, color: "text-amber-550", category: 4 },
  { href: "/labor-management", label: "노무 관리 AI", icon: Scale, color: "text-red-655", category: 4 },
  { href: "/password-ai", label: "비밀번호관리 AI", icon: Key, color: "text-purple-555", category: 4 },
  { href: "/lawyer-ai", label: "법률 상담 AI", icon: Scale, color: "text-indigo-650", category: 4 },
  { href: "/rnd-management", label: "연구소 관리 AI", icon: Award, color: "text-amber-550", category: 4 },
  { href: "/meeting-minutes", label: "회의 기록 AI", icon: Mic, color: "text-purple-550", category: 4 },
  { href: "/ai-briefing", label: "AI 브리핑", icon: Sparkles, color: "text-indigo-550", category: 4 },
  { href: "/ai-settings", label: "AI 비서 설정", icon: Bot, color: "text-indigo-400", category: 4 },
  
  // 기타 스냅태스크 (2번에 적절히 노출)
  { href: "/snaptasks", label: "AI 스냅태스크", icon: Sparkles, color: "text-indigo-600", category: 2 }
];

// 💡 [API용] DEFAULT_MENU_ITEMS
export const DEFAULT_MENU_ITEMS = MENU_METADATA_LIST.map(item => ({
  href: item.href,
  label: item.label
}));

// 💡 [Sidebar용] MENU_STATIC_MAP
export const MENU_STATIC_MAP: Record<string, { label: string; icon: React.ComponentType<any>; color: string }> = MENU_METADATA_LIST.reduce((acc, item) => {
  acc[item.href] = {
    label: item.label,
    icon: item.icon,
    color: item.color
  };
  return acc;
}, {} as Record<string, { label: string; icon: React.ComponentType<any>; color: string }>);

// 💡 [설정용] MENU_METADATA_MAP
export const MENU_METADATA_MAP = MENU_STATIC_MAP;

// 💡 [분류 정렬용] CATEGORY_MAP
export const CATEGORY_MAP: Record<string, number> = MENU_METADATA_LIST.reduce((acc, item) => {
  acc[item.href] = item.category;
  return acc;
}, {} as Record<string, number>);
