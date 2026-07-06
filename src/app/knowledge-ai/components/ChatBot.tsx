import React from "react";
import { Bot, ArrowRight, Mic, Send } from "lucide-react";
import { KnowledgeDocument, ChatMessage } from "../types";

interface ChatBotProps {
  currentRole: "SUPER_ADMIN" | "PRESIDENT" | "SUB_OPERATOR";
  chatInput: string;
  setChatInput: (val: string) => void;
  chatMessages: ChatMessage[];
  isRecording: boolean;
  documents: KnowledgeDocument[];
  setSelectedDoc: (doc: KnowledgeDocument) => void;
  handleSendChat: (e?: React.FormEvent) => void;
  handleMicClick: () => void;
}

export function ChatBot({
  currentRole,
  chatInput,
  setChatInput,
  chatMessages,
  isRecording,
  documents,
  setSelectedDoc,
  handleSendChat,
  handleMicClick,
}: ChatBotProps) {
  return (
    <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col h-[320px]">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
        <h2 className="text-xs font-bold text-slate-700 flex items-center gap-2">
          <Bot className="w-4 h-4 text-blue-500" />
          지식 비서 EasyBot
        </h2>
        <div className="flex items-center gap-1.5 font-mono">
          <div
            className={`w-2.5 h-2.5 rounded-full animate-pulse ${
              currentRole === "SUPER_ADMIN" ? "bg-rose-500" : "bg-emerald-500"
            }`}
          />
          <span className="text-[9px] text-slate-500 font-semibold">{currentRole}</span>
        </div>
      </div>

      {/* 채팅 메시지 영역 */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs mb-3 scrollbar-thin select-text" id="chat-messages-container">
        {chatMessages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
            <div
              className={`p-2.5 rounded-xl max-w-[90%] leading-relaxed ${
                msg.sender === "user"
                  ? "bg-blue-600 text-white rounded-tr-none"
                  : "bg-slate-50 border border-slate-200 text-slate-700 rounded-tl-none font-sans"
              }`}
            >
              {msg.text}

              {msg.tableData && msg.tableData.length > 0 && (
                <div className="mt-2.5 overflow-x-auto border-t border-slate-200 pt-2 font-sans select-none">
                  <table className="w-full text-[10px] text-left border-collapse text-slate-750">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-semibold">
                        {Object.keys(msg.tableData[0]).map((k) => (
                          <th key={k} className="pb-1 pr-2">
                            {k}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {msg.tableData.map((row, idx) => (
                        <tr
                          key={idx}
                          className="border-b border-slate-100 text-slate-600 last:border-b-0 hover:bg-slate-100/50"
                        >
                          {Object.values(row).map((val: any, vIdx) => (
                            <td key={vIdx} className="py-1.5 pr-2">
                              {val}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {msg.docLink && (
              <button
                onClick={() => {
                  const doc = documents.find((d) => d.document_id === msg.docLink);
                  if (doc) setSelectedDoc(doc);
                }}
                className="text-[10px] text-blue-600 hover:text-blue-500 underline font-semibold mt-1 flex items-center gap-0.5 select-none"
                type="button"
              >
                출처: {msg.docLink} 바로가기 <ArrowRight className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* 입력 폼 */}
      <form onSubmit={handleSendChat} className="flex gap-2">
        <input
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          placeholder="지식 RAG 검색어..."
          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-800"
          id="input-chat-query"
        />
        <button
          type="button"
          onClick={handleMicClick}
          className={`p-2 rounded-xl transition-all ${
            isRecording
              ? "bg-rose-100 text-rose-600 border border-rose-200"
              : "bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500"
          }`}
          id="btn-chat-mic"
        >
          <Mic className="w-4 h-4" />
        </button>
        <button
          type="submit"
          className="p-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-white transition-all"
          id="btn-chat-send"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
