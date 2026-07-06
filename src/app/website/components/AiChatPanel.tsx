import React from "react";
import { Bot, Plus, History, Image as ImageIcon, Send } from "lucide-react";
import { ChatMessage } from "../types";

interface AiChatPanelProps {
  chatMessages: ChatMessage[];
  isTyping: boolean;
  chatInput: string;
  setChatInput: (input: string) => void;
  handleSendMessage: (e: React.FormEvent) => void;
  handleNewChat: () => void;
  sessionsCount: number;
  showHistory: boolean;
  setShowHistory: (show: boolean) => void;
  handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveImage: () => void;
  attachedImage: string | null;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

export const AiChatPanel: React.FC<AiChatPanelProps> = ({
  chatMessages,
  isTyping,
  chatInput,
  setChatInput,
  handleSendMessage,
  handleNewChat,
  sessionsCount,
  showHistory,
  setShowHistory,
  handleImageChange,
  handleRemoveImage,
  attachedImage,
  textareaRef,
  fileInputRef,
  handleKeyDown,
}) => {
  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* 채팅창 상단 컨트롤 바 */}
      <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0 relative z-20">
        <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 font-sans">
          <Bot className="w-3.5 h-3.5 text-pink-500 animate-pulse" />
          이지봇 실시간 어시스턴트
        </span>
        <div className="flex gap-2">
          <button
            onClick={handleNewChat}
            className="text-xs bg-white text-slate-700 hover:text-pink-600 hover:border-pink-200 border border-slate-200 px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1 shadow-sm cursor-pointer border-0"
            title="현재 대화를 저장하고 새 대화를 시작합니다"
          >
            <Plus className="w-3.5 h-3.5 text-pink-500" />
            새 대화창
          </button>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`text-xs border px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1 shadow-sm cursor-pointer border-0 ${
              showHistory
                ? "bg-pink-50 border-pink-200 text-pink-600 font-extrabold"
                : "bg-white border-slate-200 text-slate-700 hover:text-pink-600"
            }`}
          >
            <History className={`w-3.5 h-3.5 ${showHistory ? "text-pink-600" : "text-slate-500"}`} />
            대화 기록 ({sessionsCount})
          </button>
        </div>
      </div>

      {/* 채팅 메시지 리스트 */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
        {chatMessages.map((msg, index) => {
          const messageTime = (() => {
            try {
              return new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            } catch (e) {
              return "";
            }
          })();

          return (
            <div key={index} className={`flex items-start gap-3.5 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
              {/* AI 프로필 사진 */}
              {msg.sender === "ai" && (
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center shadow-md shrink-0">
                  <Bot className="w-5 h-5 text-white" />
                </div>
              )}

              {/* 메시지 말풍선 */}
              <div className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed border transition-all ${
                msg.sender === "user"
                  ? "bg-gradient-to-tr from-[#ff007f] to-[#7928ca] text-white border-transparent shadow-md shadow-pink-600/10 rounded-tr-none font-medium"
                  : "bg-slate-100 text-slate-800 border-slate-200/50 rounded-tl-none whitespace-pre-line shadow-sm font-medium"
              }`}>
                {/* 첨부된 이미지가 있는 경우 렌더링 */}
                {msg.image && (
                  <div className="mb-2.5 rounded-xl overflow-hidden border border-white/20 shadow-sm max-w-[240px]">
                    <img src={msg.image} alt="Attached Visual Content" className="w-full h-auto object-cover max-h-[160px]" />
                  </div>
                )}
                {msg.text}
                <span className={`block text-[10px] mt-2 text-right ${msg.sender === "user" ? "text-pink-100" : "text-slate-400"}`}>
                  {messageTime}
                </span>
              </div>
            </div>
          );
        })}

        {/* AI 타이핑 지연 인디케이터 */}
        {isTyping && (
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center shadow-md animate-pulse shrink-0">
              <Bot className="w-5 h-5 text-white animate-spin" style={{ animationDuration: "3s" }} />
            </div>
            <div className="bg-slate-100 border border-slate-200/50 text-slate-500 rounded-2xl rounded-tl-none px-5 py-3.5 text-xs flex items-center gap-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              이지봇이 내역 분석 및 홈페이지를 실시간 빌드 중입니다...
            </div>
          </div>
        )}
      </div>

      {/* 하단 입력 폼 영역 */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
        <form onSubmit={handleSendMessage} className="flex gap-2.5 items-end relative">
          {/* 이미지 드롭존 프리뷰 */}
          {attachedImage && (
            <div className="absolute bottom-[64px] left-0 p-2 bg-white border border-slate-200 rounded-2xl shadow-lg flex items-center gap-2 animate-scale-up z-35">
              <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-100">
                <img src={attachedImage} alt="Upload Thumbnail" className="w-full h-full object-cover" />
              </div>
              <button
                type="button"
                onClick={handleRemoveImage}
                className="text-[10px] font-black text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1.5 rounded-lg transition-colors border-0 cursor-pointer"
              >
                지우기
              </button>
            </div>
          )}

          {/* 숨겨진 파일 선택기 */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageChange}
            accept="image/*"
            className="hidden"
          />

          {/* 이미지 첨부 버튼 */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="bg-white border border-slate-200 hover:border-pink-200 hover:bg-pink-50/30 text-slate-400 hover:text-pink-500 p-3.5 rounded-2xl transition-all shadow-inner shrink-0 cursor-pointer active:scale-95 flex items-center justify-center border-0"
            style={{ width: "52px", height: "52px" }}
            title="컨셉 이미지/로고 첨부"
          >
            <ImageIcon className="w-5 h-5" />
          </button>

          <textarea
            ref={textareaRef}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="예: '블랙 골드 테마로 레스토랑 홈페이지를 만들어주고 지도 섹션은 빼줘.'"
            className="flex-1 bg-white border border-slate-200 rounded-2xl px-5 py-3.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all font-medium shadow-inner resize-none overflow-y-auto no-scrollbar"
            style={{ minHeight: "52px", maxHeight: "150px" }}
          />
          <button
            type="submit"
            disabled={(!chatInput.trim() && !attachedImage) || isTyping}
            className="bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-95 text-white font-bold px-6 rounded-2xl transition-all shadow-md active:scale-95 disabled:bg-slate-200 disabled:text-slate-400 disabled:scale-100 flex items-center justify-center gap-1.5 cursor-pointer border-0 shrink-0"
            style={{ height: "52px" }}
          >
            <Send className="w-4.5 h-4.5" />
            <span>전송</span>
          </button>
        </form>
      </div>
    </div>
  );
};
