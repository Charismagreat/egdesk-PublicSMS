import React from "react";
import { History, Bot, Trash2 } from "lucide-react";
import { ChatSession } from "../types";

interface HistoryOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  onLoadSession: (session: ChatSession) => void;
  onDeleteSession: (id: string, e: React.MouseEvent) => void;
}

export const HistoryOverlay: React.FC<HistoryOverlayProps> = ({
  isOpen,
  onClose,
  sessions,
  onLoadSession,
  onDeleteSession,
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 bg-white/95 backdrop-blur-md z-40 p-6 flex flex-col animate-fade-in overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
        <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
          <History className="w-4 h-4 text-pink-500" />
          이전 대화 기록 보관함
        </h3>
        <button
          onClick={onClose}
          className="text-xs text-slate-400 hover:text-slate-700 font-extrabold border-0 bg-transparent cursor-pointer"
        >
          닫기 ✕
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2">
          <Bot className="w-12 h-12 text-slate-300 animate-bounce" />
          <p className="text-xs font-bold">보관된 이전 대화 기록이 존재하지 않습니다.</p>
          <p className="text-[10px] text-slate-400 font-medium">대화를 진행한 뒤 '새 대화창'을 누르시면 기록이 보관됩니다.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-3 pr-1.5 no-scrollbar">
          {sessions.map((sess) => (
            <div
              key={sess.id}
              onClick={() => onLoadSession(sess)}
              className="p-4 bg-slate-50 hover:bg-pink-50/30 border border-slate-200/60 hover:border-pink-200/50 rounded-2xl cursor-pointer transition-all flex items-start justify-between gap-4 shadow-sm hover:shadow-md relative group"
            >
              <div className="flex-1 min-w-0 text-left">
                <h4 className="text-xs font-bold text-slate-800 truncate mb-1 flex items-center gap-1.5 group-hover:text-pink-600">
                  💬 {sess.title}
                </h4>
                <p className="text-[10px] text-slate-400 font-medium flex items-center gap-2">
                  <span>{sess.timestamp}</span>
                  <span>•</span>
                  <span>대화 메시지 {sess.messages.length}개</span>
                  <span>•</span>
                  <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[8px] font-bold text-slate-500">
                    테마: {sess.config.title}
                  </span>
                </p>
              </div>
              <button
                onClick={(e) => onDeleteSession(sess.id, e)}
                className="p-1.5 rounded-lg bg-slate-200 hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-colors border-0 cursor-pointer shadow-sm active:scale-95"
                title="기록 삭제"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
