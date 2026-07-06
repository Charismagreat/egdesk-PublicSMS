import React from "react";
import { Bot, Sparkles, AlertTriangle } from "lucide-react";

interface AiPanelProps {
  aiPrompt: string;
  setAiPrompt: (val: string) => void;
  isAiLoading: boolean;
  aiError: string | null;
  onAiGenerate: () => void;
}

export function AiPanel({
  aiPrompt,
  setAiPrompt,
  isAiLoading,
  aiError,
  onAiGenerate
}: AiPanelProps) {
  return (
    <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-6 rounded-2xl shadow-sm border border-indigo-100">
      <h2 className="text-lg font-bold text-indigo-900 mb-3 flex items-center">
        <Bot className="w-5 h-5 mr-2 text-indigo-650 animate-bounce" />
        AI 비서에게 발송 타겟팅 & 내용 작성 부탁하기
      </h2>
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="예: 단골 고객들에게 이번 주말 50% 세일 문자를 작성해줘."
          value={aiPrompt}
          onChange={e => setAiPrompt(e.target.value)}
          className="flex-1 border border-indigo-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-550 bg-white text-slate-805 text-xs font-semibold"
          onKeyDown={e => e.key === 'Enter' && onAiGenerate()}
        />
        <button 
          type="button"
          onClick={onAiGenerate}
          disabled={isAiLoading}
          className="bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition flex items-center justify-center font-extrabold text-xs disabled:opacity-50 whitespace-nowrap cursor-pointer border-none"
        >
          {isAiLoading ? (
            <span className="flex items-center">
              <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
              생성 중...
            </span>
          ) : (
            <span className="flex items-center">
              <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
              자동 완성
            </span>
          )}
        </button>
      </div>
      {aiError && (
        <p className="text-red-500 text-sm mt-2 flex items-center">
          <AlertTriangle className="w-4 h-4 mr-1"/>
          {aiError}
        </p>
      )}
    </div>
  );
}
