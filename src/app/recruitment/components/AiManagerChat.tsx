"use client";

import React, { useState, useEffect, useRef } from "react";
import { Bot, Send } from "lucide-react";
import { ChatMessage } from "../types";

interface AiManagerChatProps {
  /**
   * AI 대화 로그 내역
   */
  chatMessages: ChatMessage[];
  /**
   * AI 비서가 입력 중인지 여부 (타이핑 애니메이션 제어)
   */
  isTyping: boolean;
  /**
   * 메시지 전송 핸들러
   */
  onSendMessage: (text: string) => void;
}

/**
 * 이지봇 AI 대화 창 및 사장님 입력 패널 컴포넌트
 */
export default function AiManagerChat({
  chatMessages,
  isTyping,
  onSendMessage,
}: AiManagerChatProps) {
  const [chatInput, setChatInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // 입력창 자동 크기 조절
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = `${Math.min(Math.max(scrollHeight, 52), 150)}px`;
    }
  }, [chatInput]);

  // 자동 스크롤
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages, isTyping]);

  // 엔터 키 입력 처리
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    const text = chatInput.trim();
    if (!text) return;
    onSendMessage(text);
    setChatInput("");
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* AI 비서 대화 로그 영역 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar bg-slate-50">
        {chatMessages.map((msg, idx) => (
          <div key={idx} className={`flex items-start gap-3.5 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
            {msg.sender === "ai" && (
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#f91f7f] via-[#e84e27] to-[#9b2bb4] flex items-center justify-center shadow-md shrink-0">
                <Bot className="w-5 h-5 text-white" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed border transition-all ${
                msg.sender === "user"
                  ? "bg-gradient-to-r from-[#f91f7f] to-[#9b2bb4] text-white border-transparent shadow-md rounded-tr-none font-bold"
                  : "bg-white text-slate-950 border-slate-300 rounded-tl-none whitespace-pre-line shadow-sm font-extrabold"
              }`}
            >
              {msg.text}
              <span className={`block text-[8px] mt-1.5 text-right ${msg.sender === "user" ? "text-rose-100" : "text-slate-650 font-black"}`}>
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex items-start gap-3.5 justify-start">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#f91f7f] via-[#e84e27] to-[#9b2bb4] flex items-center justify-center shadow-md shrink-0 animate-pulse">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="bg-white border-2 border-slate-300 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f91f7f] animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2.5 h-2.5 rounded-full bg-[#e84e27] animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2.5 h-2.5 rounded-full bg-[#9b2bb4] animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
      </div>

      {/* 사장님 입력창 메커니즘 */}
      <div className="p-4 bg-slate-100 border-t-2 border-slate-300 shrink-0">
        <div className="flex items-end gap-2 bg-white border-2 border-slate-400 rounded-3xl p-2.5 focus-within:border-[#f91f7f] focus-within:ring-2 focus-within:ring-[#f91f7f]/10 transition-all">
          <textarea
            ref={textareaRef}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="구인 매장의 특징이나 조건을 던져서 공고를 피딩해 보세요..."
            rows={1}
            className="flex-1 bg-transparent text-sm text-slate-950 font-extrabold outline-none resize-none px-3 py-3.5 font-sans leading-relaxed no-scrollbar border-0 max-h-[150px] min-h-[52px] placeholder-slate-500"
          />
          <button
            onClick={handleSubmit}
            disabled={!chatInput.trim()}
            className={`p-3.5 rounded-full flex items-center justify-center transition-all cursor-pointer border-0 shadow-md shrink-0 ${
              chatInput.trim()
                ? "bg-gradient-to-r from-[#f91f7f] to-[#e84e27] text-white hover:opacity-95"
                : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
