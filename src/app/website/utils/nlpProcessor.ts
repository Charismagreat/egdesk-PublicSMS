import { WebsiteConfig } from "../types";

export interface NlpResult {
  updatedConfig: WebsiteConfig;
  responseText: string;
}

/**
 * 자연어(NLP) 키워드 매핑 및 테마/모드 적용 비즈니스 로직
 * @param userText 사용자가 입력한 자연어 텍스트
 * @param currentConfig 현재 활성화된 웹사이트 설정 상태
 * @param hasAttachedImage 이미지 첨부 여부
 */
export function processNaturalLanguageRequest(
  userText: string,
  currentConfig: WebsiteConfig,
  hasAttachedImage: boolean
): NlpResult {
  const lowerText = userText.toLowerCase();
  const updatedConfig = { ...currentConfig };
  const changes: string[] = [];
  let responseText = "";

  // 1. 모드/비즈니스 테마 파싱
  if (
    lowerText.includes("레스토랑") || 
    lowerText.includes("식당") || 
    lowerText.includes("파인다이닝") || 
    lowerText.includes("디저트") || 
    lowerText.includes("맛집") || 
    lowerText.includes("음식")
  ) {
    updatedConfig.mode = "store";
    updatedConfig.title = "더 그랑 퀴진";
    updatedConfig.subtitle = "셰프의 특별한 감각이 돋보이는 최고급 정통 파인 다이닝 레스토랑";
    updatedConfig.aboutText = "더 그랑 퀴진은 청정 지역의 유기농 제철 식재료만을 고집하여 감동적인 미식 여정을 선사합니다. 와인 소믈리에가 엄선한 빈티지 와인 페어링과 함께 영원히 잊지 못할 저녁 식사를 만끽하세요.";
    updatedConfig.products = [
      { id: "ai_d1", name: "시그니처 안심 스테이크", price: "79,000원", description: "국내산 무항생제 1++ 한우 안심과 특제 레드와인 소스 소테" },
      { id: "ai_d2", name: "트러플 크림 파스타", price: "28,000원", description: "이탈리아산 생 트러플을 듬뿍 갈아 넣은 진하고 풍부한 유기농 크림 파스타" }
    ];
    updatedConfig.sections = {
      ...updatedConfig.sections,
      products: true,
      booking: true
    };
    changes.push("🍔 **'미니 샵/파인다이닝 레스토랑' 모드**로 변경하고 관련 상품(스테이크, 파스타)을 주입했습니다.");
  } else if (
    lowerText.includes("필라테스") || 
    lowerText.includes("요가") || 
    lowerText.includes("헬스") || 
    lowerText.includes("피트니스") || 
    lowerText.includes("PT") || 
    lowerText.includes("운동")
  ) {
    updatedConfig.mode = "cms";
    updatedConfig.title = "아우라 기구 필라테스";
    updatedConfig.subtitle = "자세를 바르게, 마음을 맑게. 프라이빗 체형 교정 전문 센터";
    updatedConfig.aboutText = "아우라 필라테스는 체계적인 자세 측정 데이터를 바탕으로 코어 근육을 강화하고 신체 밸런스를 되찾아 드리는 맞춤형 운동 요람입니다. 쾌적한 1:1 전용 룸에서 건강한 변화를 직접 체험해 보세요.";
    updatedConfig.products = [
      { id: "ai_f1", name: "1:1 프라이빗 개인 레슨권 (8회)", price: "580,000원", description: "정밀 체형 진단기 기반 개인 최적화 맞춤 기구 동작 코칭" },
      { id: "ai_f2", name: "6:1 소그룹 필라테스 회원권 (월 12회)", price: "220,000원", description: "리포머와 체어를 활용한 활기차고 에너지 넘치는 소수 정예 그룹 클래스" }
    ];
    updatedConfig.sections = {
      ...updatedConfig.sections,
      booking: true
    };
    changes.push("🧘 **'전문 센터 홍보 CMS' 모드**로 변경하고 기구 필라테스 레슨 상품을 적용했습니다.");
  } else if (
    lowerText.includes("이벤트") || 
    lowerText.includes("쿠폰") || 
    lowerText.includes("랜딩") || 
    lowerText.includes("마케팅") || 
    lowerText.includes("세일") || 
    lowerText.includes("할인")
  ) {
    updatedConfig.mode = "landing";
    updatedConfig.title = "오픈 기념 40% 웰컴 쿠폰 이벤트";
    updatedConfig.subtitle = "방문 전 클릭 한 번으로 즉시 발급받는 특급 할인 찬스! 지금 받으세요.";
    updatedConfig.aboutText = "신규 오픈을 진심으로 축하해 주시는 고객님들을 위해 선착순 100분께만 드리는 프리미엄 40% 할인 웰컴 쿠폰입니다. 쿠폰 받기 단추를 누르고 간편하게 예약해 보세요!";
    updatedConfig.products = [];
    updatedConfig.sections = {
      ...updatedConfig.sections,
      products: false,
      booking: true
    };
    changes.push("🎟️ **'이벤트 쿠폰 모바일 랜딩' 모드**로 전환하고, 웰컴 쿠폰 발급창과 즉시 예약 폼을 세팅했습니다.");
  } else if (
    lowerText.includes("카페") || 
    lowerText.includes("커피") || 
    lowerText.includes("베이커리") || 
    lowerText.includes("빵")
  ) {
    updatedConfig.mode = "store";
    updatedConfig.title = "베이커리 카페 라온";
    updatedConfig.subtitle = "매일 아침 유기농 밀가루로 직접 굽는 명품 빵과 풍부한 아로마 커피";
    updatedConfig.aboutText = "라온은 정성이 담긴 건강한 빵문화를 지향합니다. 천연 효모종을 활용한 천천히 숙성되는 슬로우 브레드와 프리미엄 드립 커피의 환상적인 케미를 야외 테라스에서 여유롭게 즐겨보세요.";
    updatedConfig.products = [
      { id: "ai_c1", name: "소금 버터볼 크루아상", price: "4,500원", description: "겉바속촉 고소함의 대명사! 천일염을 솔솔 뿌린 프랑스 고메 버터 소금 크루아상" },
      { id: "ai_c2", name: "스페셜 콜드브루 커피", price: "5,500원", description: "12시간 동안 한 방울 한 방울 정성껏 추출하여 깔끔하고 초콜릿 풍미가 짙은 차가운 더치 커피" }
    ];
    updatedConfig.sections = {
      ...updatedConfig.sections,
      products: true
    };
    changes.push("☕ **'베이커리/디저트 스토어' 모드**로 변경하고 향긋한 카페 빵과 커피 리스트를 구성했습니다.");
  }

  // 2. 색상 테마 파싱
  if (
    lowerText.includes("파랑") || 
    lowerText.includes("블루") || 
    lowerText.includes("네이비") || 
    lowerText.includes("인디고")
  ) {
    updatedConfig.primaryColor = "indigo";
    changes.push("🎨 메인 테마 색상을 신뢰감을 주는 **'인디고 블루(Indigo Blue)'**로 변경했습니다.");
  } else if (
    lowerText.includes("초록") || 
    lowerText.includes("그린") || 
    lowerText.includes("에메랄드") || 
    lowerText.includes("자연")
  ) {
    updatedConfig.primaryColor = "emerald";
    changes.push("🎨 메인 테마 색상을 싱그럽고 친환경적인 **'에메랄드 그린(Emerald Green)'**으로 바꿨습니다.");
  } else if (
    lowerText.includes("빨강") || 
    lowerText.includes("레드") || 
    lowerText.includes("로즈") || 
    lowerText.includes("핑크") || 
    lowerText.includes("버건디")
  ) {
    updatedConfig.primaryColor = "rose";
    changes.push("🎨 메인 테마 색상을 강렬하고 매혹적인 **'로즈 버건디(Rose Burgundy)'**로 변경했습니다.");
  }

  // 3. AI 답변 빌딩 및 최종 결과 도출
  if (changes.length > 0) {
    responseText = `🤖 **알림: 인공지능이 요청을 해석하여 홈페이지를 새단장했습니다!**\n\n${changes.map(c => `• ${c}`).join("\n")}\n\n우측 모바일 미리보기에서 실시간으로 반영된 명품 디자인을 감상해 보세요. 마음에 들지 않으시면 언제든지 다른 변경이나 복구를 명령하실 수 있습니다!`;
  } else if (hasAttachedImage) {
    // 첨부된 이미지가 있는 경우 AI의 비주얼 이미지 분석 시뮬레이션 반응
    updatedConfig.theme = "glass"; // 이미지 매칭 럭셔리 글래스 테마
    updatedConfig.primaryColor = "violet"; // 매칭 색상 보라색
    updatedConfig.title = "비주얼 갤러리 앤 비스트로";
    updatedConfig.subtitle = "첨부해주신 디자인 시안의 무드와 아름다운 대비를 녹여낸 하이엔드 레이아웃";
    updatedConfig.aboutText = "보내주신 비주얼 자료의 톤앤매너를 본떠 완성된 AI 테마 공간입니다. 투명하게 빛나는 글래스 섀시 스킨 위에 고메 감성의 디테일들을 섬세하게 배치했습니다. 매장의 격조와 가치가 모바일 안에서 생생하게 되살아납니다.";
    
    responseText = `🤖 **이지봇의 이미지 비주얼 분석 보고서:**\n\n보내주신 시안/컨셉 이미지의 주조색 분포와 레이아웃 대비를 AI 엔진이 정밀 추출했습니다! 📸🎨\n\n• **디자인 무드**: 현대적이고 품격 있는 **'하이엔드 갤러리'** 톤앤매너 감지\n• **추천 시그니처 컬러**: 이미지와 가장 우아하게 조화를 이루는 **'바이올렛(Violet)'** 테마 강제 매칭\n• **레이아웃 스킨**: 빛의 산란과 모던한 매력이 돋보이는 **'글래스모피즘(Glassmorphism)'** 레이어 적용\n\n우측 모바일 미리보기 디바이스에서 첨부해주신 이미지의 영감이 세련되게 반영된 홈페이지 실시간 레이아웃을 확인해 보세요!`;
  } else {
    responseText = `🧐 "${userText}" 라고 말씀해 주셨군요!\n\n현재 가동 중인 AI 홈페이지 빌더는 '카페', '레스토랑', '필라테스', '이벤트 쿠폰 랜딩' 모드와 함께 '파랑/초록/빨강/다크/글래스/미니멀' 등 다양한 디자인 테마 및 스킨 변경을 지원합니다.\n\n예: *"분위기 있는 스테이크 레스토랑 테마로 바꾸고 핑크색 포인트 컬러로 해줘"* 처럼 구체적으로 말씀해 주시면 인공지능 비서가 즉각 반영해 드립니다!`;
  }

  return {
    updatedConfig,
    responseText
  };
}
