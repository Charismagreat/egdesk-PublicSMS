// 대화 메시지 인터페이스 정의
export interface ChatMessage {
  sender: "ai" | "user";
  text: string;
  timestamp: string; // Date String 포맷
  image?: string;
}

// 대화 세션 인터페이스 정의
export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  config: WebsiteConfig;
  timestamp: string;
}

// 홈페이지 설정 인터페이스
export interface WebsiteConfig {
  mode: "store" | "cms" | "landing"; // 미니쇼핑몰, 서비스 홍보, 쿠폰 랜딩
  title: string;
  subtitle: string;
  theme: "gradient" | "minimal" | "dark" | "glass";
  primaryColor: "indigo" | "emerald" | "rose" | "amber" | "violet" | "cyan" | "slate";
  sections: {
    hero: boolean;
    about: boolean;
    products: boolean;
    booking: boolean;
    map: boolean;
    contact: boolean;
  };
  aboutText: string;
  contactPhone: string;
  address: string;
  products: Array<{
    id: string;
    name: string;
    price: string;
    description: string;
    imageUrl?: string;
  }>;
  customDomain: string;
}
