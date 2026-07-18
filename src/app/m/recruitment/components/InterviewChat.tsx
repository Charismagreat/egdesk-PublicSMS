"use client";

import React from "react";
import { Bot, Settings, Camera, Image, Send } from "lucide-react";
import { ChatLog } from "../types";

interface InterviewChatProps {
  chatLogs: ChatLog[];
  chatInput: string;
  setChatInput: (val: string) => void;
  onSendMessage: () => void;
  chatScrollRef: React.RefObject<HTMLDivElement | null>;
}

export function InterviewChat({
  chatLogs,
  chatInput,
  setChatInput,
  onSendMessage,
  chatScrollRef
}: InterviewChatProps) {
  return (
    <div className="flex-1 flex flex-col justify-between overflow-hidden h-full min-h-[460px] animate-fade-in text-left text-slate-800">
      {/* 인스타 DM 헤더 */}
      <div className="px-3.5 py-3 bg-white border border-slate-200 rounded-2xl flex items-center justify-between shrink-0 mb-3.5 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#f91f7f] to-[#e84e27] p-[1.5px] shrink-0">
            <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 text-[#f91f7f]" />
            </div>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-800">이지봇 (AI 면접관)</p>
            <p className="text-[7px] text-emerald-600 font-extrabold tracking-wider">Active Now</p>
          </div>
        </div>
        <Settings className="w-4 h-4 text-slate-500" />
      </div>

      {/* 실시간 면접 채팅창 */}
      <div ref={chatScrollRef} className="flex-grow overflow-y-auto space-y-3 pr-0.5 no-scrollbar pb-3">
        {chatLogs.map((log, idx) => (
          <div key={idx} className={`flex items-start gap-2.5 ${log.sender === "candidate" ? "justify-end" : "justify-start"}`}>
            {log.sender === "ai" && (
              <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5 text-slate-500" />
              </div>
            )}
            <div className={`max-w-[80%] rounded-xl px-3 py-2.5 text-xs leading-relaxed border transition-all ${
              log.sender === "candidate"
                ? "bg-gradient-to-r from-[#f91f7f] via-[#e84e27] to-[#9b2bb4] text-white border-transparent rounded-tr-none font-bold"
                : "bg-white text-slate-800 border-slate-200 rounded-tl-none whitespace-pre-line font-semibold shadow-sm"
            }`}>
              {log.text}
            </div>
          </div>
        ))}
      </div>

      {/* DM 입력창 */}
      <div className="pt-2 border-t border-slate-200 shrink-0">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-3xl p-1.5 focus-within:border-[#f91f7f]/50 focus-within:ring-1 focus-within:ring-[#f91f7f]/20 transition-all">
          <div className="flex gap-2 text-slate-400 px-1 shrink-0">
            <Camera className="w-4 h-4 cursor-pointer hover:text-slate-600" />
            <Image className="w-4 h-4 cursor-pointer hover:text-slate-600" />
          </div>
          <input 
            type="text" 
            value={chatInput} 
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSendMessage()}
            placeholder="메세지 보내기..."
            className="flex-1 bg-transparent text-xs text-slate-800 font-bold outline-none px-1 py-2 border-0 placeholder-slate-400"
          />
          <button 
            onClick={onSendMessage}
            disabled={!chatInput.trim()}
            className={`p-2.5 rounded-full flex items-center justify-center border-0 cursor-pointer shadow-md shrink-0 ${
              chatInput.trim() 
                ? "bg-gradient-to-r from-[#f91f7f] to-[#e84e27] text-white active:scale-95 transition-all" 
                : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
            }`}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
