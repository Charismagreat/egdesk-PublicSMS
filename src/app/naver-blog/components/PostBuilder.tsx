'use client';

import React from 'react';
import { Sparkles, RefreshCw, FileText, Calendar, Send } from 'lucide-react';
import { Product } from '../types';

interface PostBuilderProps {
  selectedProduct: Product | null;
  aiTone: string;
  setAiTone: (v: string) => void;
  imageTab: 'product' | 'ai';
  setImageTab: (v: 'product' | 'ai') => void;
  aiPrompt: string;
  setAiPrompt: (v: string) => void;
  isGenerating: boolean;
  handleGenerateAI: () => Promise<void>;
  targetKeywords: string;
  setTargetKeywords: (v: string) => void;
  postTitle: string;
  setPostTitle: (v: string) => void;
  postContent: string;
  setPostContent: (v: string) => void;
  scheduleDate: string;
  setScheduleDate: (v: string) => void;
  scheduleTime: string;
  setScheduleTime: (v: string) => void;
  handleSavePost: (isImmediate: boolean) => Promise<void>;
  keywordInputRef: React.RefObject<HTMLInputElement | null>;
}

export default function PostBuilder({
  selectedProduct,
  aiTone,
  setAiTone,
  imageTab,
  setImageTab,
  aiPrompt,
  setAiPrompt,
  isGenerating,
  handleGenerateAI,
  targetKeywords,
  setTargetKeywords,
  postTitle,
  setPostTitle,
  postContent,
  setPostContent,
  scheduleDate,
  setScheduleDate,
  scheduleTime,
  setScheduleTime,
  handleSavePost,
  keywordInputRef
}: PostBuilderProps) {
  
  return (
    <div className="p-6 lg:p-8 rounded-3xl bg-white/70 backdrop-blur-xl border border-slate-200/60 shadow-sm space-y-6">
      
      <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
        <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
          <FileText className="w-4.5 h-4.5" />
        </span>
        <h3 className="text-base font-bold text-slate-800">
          2단계: 네이버 블로그 포스팅 원고 빌더
        </h3>
      </div>

      {/* AI 장문 생성기 세팅창 */}
      <div className="p-5 rounded-2xl bg-slate-50/50 border border-slate-200 space-y-4 shadow-3xs">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4.5 h-4.5 text-[#03C75A] animate-pulse" />
          <span className="text-xs font-black text-slate-800">AI 장문 SEO 원고 자동 집필 엔진</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">집필 톤앤매너</label>
            <select
              value={aiTone}
              onChange={(e) => setAiTone(e.target.value)}
              className="w-full mt-1.5 px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 font-bold cursor-pointer shadow-3xs"
            >
              <option value="정보제공형">🎓 정보제공형 스펙리뷰</option>
              <option value="솔직리뷰형">💬 리얼 솔직리뷰형</option>
              <option value="전문칼럼형">📊 전문칼럼 분석형</option>
              <option value="친근한일상형">🏠 친근한 일상공유형</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">이미지 모드</label>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              <button
                type="button"
                disabled={!selectedProduct}
                onClick={() => setImageTab('product')}
                className={`py-2.5 px-3 rounded-2xl text-xs font-bold border transition-all cursor-pointer shadow-3xs active:scale-95 ${
                  !selectedProduct
                    ? 'bg-slate-200 border-slate-200 text-slate-400 cursor-not-allowed opacity-40'
                    : imageTab === 'product'
                    ? 'bg-emerald-500 border-emerald-500 text-white font-extrabold'
                    : 'bg-white border-slate-250 text-slate-550 hover:text-slate-700'
                }`}
              >
                상품 대표이미지
              </button>
              <button
                type="button"
                disabled={!selectedProduct}
                onClick={() => setImageTab('ai')}
                className={`py-2.5 px-3 rounded-2xl text-xs font-bold border transition-all cursor-pointer shadow-3xs active:scale-95 ${
                  !selectedProduct
                    ? 'bg-slate-200 border-slate-200 text-slate-400 cursor-not-allowed opacity-40'
                    : imageTab === 'ai'
                    ? 'bg-emerald-500 border-emerald-500 text-white font-extrabold'
                    : 'bg-white border-slate-250 text-slate-550 hover:text-slate-700'
                }`}
              >
                AI 다중 감성샷
              </button>
            </div>
            {!selectedProduct && (
              <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1 mt-2.5 animate-pulse">
                ⚠️ 상품을 먼저 선택하시면 이미지 모드가 활성화됩니다.
              </span>
            )}
          </div>
        </div>

        <div>
          <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">AI 추가 요구 프롬프트 (선택)</label>
          <textarea
            placeholder="예: '단점도 아주 살짝 솔직하게 녹여줘', '해당 제품 사용 후 삶의 질이 어떻게 변했는지를 중점적으로 강조해줘'"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            rows={2}
            className="w-full mt-1.5 px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 font-semibold resize-none shadow-3xs"
          />
        </div>

        <button
          onClick={handleGenerateAI}
          disabled={isGenerating || !selectedProduct}
          className="w-full py-3.5 rounded-2xl text-xs font-extrabold bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:via-teal-650 hover:to-emerald-700 text-white shadow-[0_4px_20px_rgba(16,185,129,0.25)] hover:shadow-[0_4px_25px_rgba(16,185,129,0.35)] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-4.5 h-4.5 animate-spin" />
              AI가 네이버 SEO에 맞는 800자 이상 원고 집필 중...
            </>
          ) : (
            <>
              <Sparkles className="w-4.5 h-4.5 animate-pulse" />
              네이버 블로그 맞춤형 AI 원고 즉시 빌드
            </>
          )}
        </button>
      </div>

      {/* 에디터 필드 */}
      <div className="space-y-5">
        
        {/* ⚡ 마그네틱 원클릭 주입 수집 필드 */}
        <div>
          <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">
            타겟 키워드 (쉼표 구분)
          </label>
          <input
            ref={keywordInputRef}
            type="text"
            placeholder="우측 AI Keyword Lab의 뱃지를 클릭하면 이곳으로 자동 마그네틱 주입됩니다."
            value={targetKeywords}
            onChange={(e) => setTargetKeywords(e.target.value)}
            className="w-full mt-1.5 px-4.5 py-3 bg-white border border-slate-200 rounded-2xl text-xs text-emerald-650 placeholder:text-slate-455 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 font-bold shadow-3xs transition-all"
          />
          {targetKeywords && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {targetKeywords.split(',').map((k) => k.trim()).filter(Boolean).map((k, idx) => (
                <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-250 text-[#03C75A] text-[10px] font-black shadow-3xs">
                  #{k}
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">포스팅 제목 (Title)</label>
          <input
            type="text"
            placeholder="블로그 포스팅 제목을 입력하거나 AI 생성을 실행하세요."
            value={postTitle}
            onChange={(e) => setPostTitle(e.target.value)}
            className="w-full mt-1.5 px-4.5 py-3 bg-white border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 font-black shadow-3xs"
          />
        </div>

        <div>
          <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">포스팅 본문 원고 (Content)</label>
          <textarea
            placeholder="네이버 블로그에 최적화된 고품질 장문 본문 원고를 작성하세요. 제목และ 본문에 타겟 키워드들이 자연스럽게 녹아들어야 상위 노출에 유리합니다."
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
            rows={12}
            className="w-full mt-1.5 p-4.5 bg-white border border-slate-200 rounded-2xl text-xs text-slate-700 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 font-semibold leading-relaxed resize-y shadow-3xs"
          />
          <div className="flex justify-between items-center text-[10px] text-slate-400 mt-2 font-bold">
            <span>공백 포함 총: <strong className="text-slate-700 font-black">{postContent.length}</strong>자</span>
            <span className={postContent.length >= 800 ? "text-[#03C75A] font-black" : "text-amber-600 font-bold"}>
              {postContent.length >= 800 ? "🟢 권장 SEO 분량 달성 (800자 이상)" : "⚠️ 장문 보강 권장 (800자 이하)"}
            </span>
          </div>
        </div>

      </div>

      {/* 예약 시간 설정 및 등록 액션 */}
      <div className="pt-5 border-t border-slate-200/85">
        <div className="flex flex-col md:flex-row items-end gap-3.5 w-full pb-1">
          
          {/* 1. 예약 발행 일시 설정 */}
          <div className="flex flex-col gap-1.5 w-full md:w-[320px] shrink-0">
            <label className="text-[10px] text-slate-450 font-extrabold block uppercase tracking-wider">예약 발행 일시</label>
            <div className="flex items-center gap-2.5 w-full">
              <input 
                type="date" 
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="flex-1 min-w-0 px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 font-bold shadow-3xs h-[45px]"
              />
              <input 
                type="time" 
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="w-[120px] shrink-0 px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 font-bold shadow-3xs h-[45px]"
              />
            </div>
          </div>

          {/* 2. 지정 시간 예약 등록 버튼 */}
          <div className="w-full md:flex-1">
            <button
              type="button"
              onClick={() => handleSavePost(false)}
              disabled={!postTitle || !postContent}
              className={`w-full py-3 rounded-2xl text-xs font-black active:scale-95 transition-all duration-300 border flex items-center justify-center gap-2 h-[45px] cursor-pointer shadow-3xs ${
                (!postTitle || !postContent)
                  ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-250 shadow-xs'
              }`}
            >
              <Calendar className="w-4 h-4 shrink-0 text-slate-500" />
              <span className="truncate">지정 시간 예약 등록</span>
            </button>
          </div>

          {/* 3. 네이버 블로그 즉시 발행 버튼 */}
          <div className="w-full md:flex-1">
            <button
              type="button"
              onClick={() => handleSavePost(true)}
              disabled={!postTitle || !postContent}
              className={`w-full py-3 rounded-2xl text-xs font-black active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 h-[45px] cursor-pointer shadow-[0_4px_15px_rgba(3,199,90,0.2)] ${
                (!postTitle || !postContent)
                  ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                  : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white'
              }`}
            >
              <Send className="w-4 h-4 shrink-0" />
              <span className="truncate">네이버 블로그 즉시 발행</span>
            </button>
          </div>

        </div>
      </div>

    </div>
  );
}
