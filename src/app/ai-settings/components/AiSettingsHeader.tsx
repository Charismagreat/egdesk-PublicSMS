"use client";

import React from "react";
import { Bot } from "lucide-react";

export function AiSettingsHeader() {
  return (
    <div className="mb-6 pb-5 border-b border-slate-200/80">
      <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2">
        <Bot className="w-8 h-8 text-indigo-600 animate-pulse" />
        AI 비서 및 하이브리드 라우팅 설정
      </h1>
      <p className="text-slate-500 mt-2 text-sm pl-10">
        구글 Gemini 클라우드 API와 로컬 컴퓨터에 설치된 로컬 LLM(Ollama) 중 최적의 엔진을 지능적으로 분기하여 처리할 수 있습니다.
      </p>
    </div>
  );
}
