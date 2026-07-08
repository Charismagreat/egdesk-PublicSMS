"use client";

import { useState } from "react";
import { FAQ_DATABASE } from "./constants";

// 컴포넌트 임포트
import HelpHeader from "./components/HelpHeader";
import HelpSearchFilter from "./components/HelpSearchFilter";
import FaqAccordionList from "./components/FaqAccordionList";
import EasyBotCallBanner from "./components/EasyBotCallBanner";

export default function FAQHelpCenterPage() {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // 실시간 검색어 및 초성 보정 검색 엔진 필터링
  const getFilteredFAQ = () => {
    return FAQ_DATABASE.filter((faq) => {
      if (activeCategory !== "all" && faq.category !== activeCategory) {
        return false;
      }

      if (!searchQuery.trim()) return true;

      const query = searchQuery.toLowerCase().trim();
      const question = faq.question.toLowerCase();
      const answer = faq.answer.toLowerCase();

      const matchesConsonants = (str: string, q: string) => {
        if (q === "ㅇㅌㅍ" && str.includes("otp")) return true;
        if (q === "ㅁㅈ" && (str.includes("문자") || str.includes("메시지"))) return true;
        if (q === "ㅂㄹㄱ" && str.includes("블로그")) return true;
        if (q === "ㅈㄹ" && str.includes("적립")) return true;
        if (q === "ㅋㅍ" && str.includes("쿠폰")) return true;
        if (q === "ㅅㅇㅈ" && (str.includes("사업자") || str.includes("등록증"))) return true;
        if (q === "ㅇㅈㅂ" && str.includes("이지봇")) return true;
        if (q === "ㄱㅌ" && str.includes("근태")) return true;
        if (q === "ㄱㅇ" && str.includes("급여")) return true;
        if (q === "ㅇㅅ" && str.includes("인사")) return true;
        return false;
      };

      return (
        question.includes(query) ||
        answer.includes(query) ||
        matchesConsonants(question, query) ||
        matchesConsonants(answer, query)
      );
    });
  };

  const filteredFaqs = getFilteredFAQ();

  return (
    <div className="w-full min-h-screen bg-slate-50 p-6 md:p-8 space-y-8 animate-fade-in block relative overflow-x-hidden">
      {/* 럭셔리 네온 광원 데코레이션 */}
      <div className="absolute top-0 right-10 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl -z-10"></div>
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl -z-10"></div>

      {/* 1. 헤더 가이드 패널 */}
      <HelpHeader />

      {/* 2. 가로형 검색 및 필터 패널 */}
      <HelpSearchFilter
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
      />

      {/* 3. FAQ 아코디언 카드 리스트 */}
      <FaqAccordionList filteredFaqs={filteredFaqs} />

      {/* 4. 이지봇 AI 헬프 배너 브릿지 */}
      <EasyBotCallBanner />
    </div>
  );
}
