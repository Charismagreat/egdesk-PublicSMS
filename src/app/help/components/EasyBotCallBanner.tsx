"use client";

import React from "react";
import { Bot, Sparkles } from "lucide-react";

export default function EasyBotCallBanner() {
  const triggerEasyBot = () => {
    if (typeof window !== "undefined") {
      const event = new CustomEvent("open-easybot");
      window.dispatchEvent(event);
    }
  };

  return (
    <div className="bg-gradient-to-r from-amber-500/5 via-orange-500/5 to-indigo-500/5 border border-slate-100 p-6 md:p-8 rounded-3xl mt-8 shadow-sm w-full block">
      <div className="space-y-6 block">
        {/* 상단 텍스트 존 */}
        <div className="flex items-start space-x-4 w-full block">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-slate-900 shadow-xl shadow-orange-500/10 shrink-0 animate-bounce">
            <Bot className="w-7 h-7 text-slate-900" />
          </div>

          <div className="space-y-1 block">
            <h4 className="text-sm md:text-base font-black text-slate-800 flex items-center gap-2">
              원하는 답변을 찾기 어려우신가요?
              <span className="bg-amber-400 text-slate-900 font-extrabold text-[9px] px-2 py-0.5 rounded flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5" />
                AI
              </span>
            </h4>
            <p className="text-xs md:text-sm text-slate-500 font-semibold leading-relaxed">
              이지봇 인공지능 매장 비서에게 음성이나 채팅으로 직접 대화하여 필요한 기능 질문에 대한 정답을 즉석에서 추천받아보세요!
            </p>
          </div>
        </div>

        {/* 하단 버튼 존 */}
        <div className="w-full block">
          <button
            id="trigger-easybot-btn"
            onClick={triggerEasyBot}
            className="w-full py-4 bg-slate-950 hover:bg-slate-800 text-white font-extrabold rounded-2xl text-xs md:text-sm transition-all border-0 shadow-lg shadow-slate-950/10 cursor-pointer flex items-center justify-center gap-2 active:scale-95"
          >
            <Bot className="w-4 h-4 text-amber-400 animate-pulse" />
            이지봇 AI 비서 호출하기
          </button>
        </div>
      </div>
    </div>
  );
}
