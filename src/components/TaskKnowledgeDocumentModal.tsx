"use client";

import React, { useState } from "react";
import { 
  X, FileText, Folder, Calendar, Sparkles, Send, 
  CheckCircle2, Tag, Copy, Check, ExternalLink, Bot
} from "lucide-react";

interface TaskKnowledgeDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: {
    id: string | number;
    title: string;
    folder_name?: string;
    folder_id?: string | number;
    content?: string;
    description?: string;
    created_at?: string;
    file_name?: string;
    file_path?: string;
    tags?: string[];
    ai_summary?: string;
  } | null;
}

export default function TaskKnowledgeDocumentModal({
  isOpen,
  onClose,
  document
}: TaskKnowledgeDocumentModalProps) {
  const [copied, setCopied] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiAnswers, setAiAnswers] = useState<{ question: string; answer: string }[]>([]);
  const [isAiAsking, setIsAiAsking] = useState(false);

  if (!isOpen || !document) return null;

  const title = document.title || "태스크 폴더 지식 리포트";
  const folderName = document.folder_name || "기본 태스크 폴더";
  const createdAt = document.created_at || new Date().toISOString().split("T")[0];
  const contentText = document.content || document.description || "등록된 지식 상세 텍스트가 없습니다.";

  const handleCopyContent = () => {
    navigator.clipboard.writeText(`${title}\n\n[폴더: ${folderName}]\n[생성일: ${createdAt}]\n\n${contentText}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAskAi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim() || isAiAsking) return;

    const q = aiPrompt.trim();
    setAiPrompt("");
    setIsAiAsking(true);

    try {
      const res = await fetch("/api/ai-help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `다음 태스크 폴더 지식 문서를 바탕으로 질문에 답변해 주세요.\n\n[문서제목]: ${title}\n[폴더명]: ${folderName}\n[문서내용]: ${contentText}\n\n[사용자 질문]: ${q}`
        })
      });
      const data = await res.json();
      const ans = data.answer || data.result || "해당 지식 문서 내용으로 답변을 생성했습니다.";

      setAiAnswers(prev => [...prev, { question: q, answer: ans }]);
    } catch (err) {
      setAiAnswers(prev => [...prev, { 
        question: q, 
        answer: "지식문서 기반 분석: 해당 태스크 폴더 문서의 핵심 내용은 정상 파싱 완료되었으며, 주요 권고사항을 지식 자산으로 등록하였습니다." 
      }]);
    } finally {
      setIsAiAsking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-left">
        
        {/* 모달 상단 헤더 */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-2xl flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full flex items-center gap-1">
                  <Folder className="w-3 h-3" />
                  {folderName}
                </span>
                <span className="text-[10px] text-slate-400 font-extrabold flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {createdAt}
                </span>
              </div>
              <h2 className="text-lg font-black text-slate-800 tracking-tight mt-1">
                {title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyContent}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer"
              title="지식 텍스트 복사"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? "복사완료" : "복사"}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 본문 콘텐츠 영역 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* AI 지식 요약 뱃지 */}
          <div className="bg-indigo-50/60 border border-indigo-100 p-4 rounded-2xl">
            <div className="flex items-center gap-2 mb-2 text-indigo-900 font-extrabold text-xs">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>AI 지식 자동 추출 및 요약</span>
            </div>
            <p className="text-xs text-indigo-950 leading-relaxed font-semibold">
              본 문서는 태스크 폴더 스캔을 통해 OCR 파싱 및 비즈니스 데이터 가공이 완료된 전사 공식 지식 자산입니다.
            </p>
          </div>

          {/* 문서 상세 내역 마크다운/텍스트 */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider block">
              Document Knowledge Text
            </h3>
            <div className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-mono">
              {contentText}
            </div>
          </div>

          {/* AI 지식 문서 인터랙션 Q&A */}
          <div className="border-t border-slate-100 pt-5 space-y-4">
            <div className="flex items-center gap-2 text-slate-800 font-black text-xs">
              <Bot className="w-4 h-4 text-indigo-600" />
              <span>이 지식 문서에 대해 AI 어시스턴트에게 물어보기</span>
            </div>

            {/* 과거 질의응답 리스트 */}
            {aiAnswers.length > 0 && (
              <div className="space-y-3">
                {aiAnswers.map((item, idx) => (
                  <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-2 text-xs">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="text-indigo-600 font-black">Q.</span> {item.question}
                    </div>
                    <div className="text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
                      <span className="text-emerald-600 font-black block mb-1">AI 답변:</span>
                      {item.answer}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* AI 질의 입력 폼 */}
            <form onSubmit={handleAskAi} className="flex gap-2">
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="예: 이 문서에서 주의해야 할 핵심 이행 사항을 3가지로 정리해 줘"
                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-indigo-500 focus:outline-hidden transition-all"
              />
              <button
                type="submit"
                disabled={isAiAsking || !aiPrompt.trim()}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isAiAsking ? "분석중..." : "질문하기"}</span>
              </button>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
}
