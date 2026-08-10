"use client";

import { useState, useEffect } from "react";
import { ChevronUp } from "lucide-react";

export default function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const checkScroll = () => {
      // 1. window 및 html/body 스크롤 값 측정
      let maxScroll = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;

      // 2. 프로젝트 내 메인 스크롤 컨테이너 (main 등 overflow-y-auto) 스크롤 값 측정
      const scrollableElements = document.querySelectorAll(".overflow-y-auto, .overflow-y-scroll, main");
      scrollableElements.forEach((el) => {
        if (el.scrollTop > maxScroll) {
          maxScroll = el.scrollTop;
        }
      });

      // 80px 이상 스크롤 발생 시 버튼 활성화
      if (maxScroll > 80) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    // 초기 스크롤 위치 점검
    checkScroll();

    // 캡처링(useCapture: true)을 사용하여 내부 scrollable div의 스크롤 이벤트까지 전역 수신
    window.addEventListener("scroll", checkScroll, true);
    window.addEventListener("resize", checkScroll);

    return () => {
      window.removeEventListener("scroll", checkScroll, true);
      window.removeEventListener("resize", checkScroll);
    };
  }, []);

  const scrollToTop = () => {
    // 1. Window 및 Document 스크롤 최상단 리셋
    window.scrollTo({ top: 0, behavior: "smooth" });
    document.documentElement.scrollTo({ top: 0, behavior: "smooth" });
    document.body.scrollTo({ top: 0, behavior: "smooth" });

    // 2. main 및 모든 내부 스크롤 가능한 요소 최상단 리셋
    const scrollableElements = document.querySelectorAll(".overflow-y-auto, .overflow-y-scroll, main");
    scrollableElements.forEach((el) => {
      el.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="맨 위로 스크롤"
      className={`fixed bottom-24 right-5 sm:bottom-28 sm:right-8 w-12 h-12 sm:w-14 sm:h-14 bg-white/95 backdrop-blur-md text-slate-700 border border-slate-200/90 shadow-[0_8px_30px_rgba(0,0,0,0.18)] rounded-full flex flex-col items-center justify-center transition-all duration-300 active:scale-95 z-[999] group border-none cursor-pointer ${
        isVisible
          ? "opacity-100 translate-y-0 pointer-events-auto scale-100"
          : "opacity-0 translate-y-4 pointer-events-none scale-90"
      }`}
    >
      <ChevronUp className="w-6 h-6 text-slate-700 group-hover:text-blue-600 group-hover:-translate-y-1 transition-transform" />
      <span className="text-[10px] font-black tracking-tight -mt-1 text-slate-700 group-hover:text-blue-600">
        TOP
      </span>

      {/* Hover Tooltip */}
      <div className="absolute right-16 bg-slate-900/90 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        맨 위로
      </div>
    </button>
  );
}
