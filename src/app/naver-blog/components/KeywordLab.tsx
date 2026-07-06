'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';
import { Product, KeywordItem } from '../types';

interface KeywordLabProps {
  selectedProduct: Product | null;
  activePersona: 'family' | 'single' | 'pet' | 'office';
  setActivePersona: (v: 'family' | 'single' | 'pet' | 'office') => void;
  generatedKeywords: {
    specKeywords: KeywordItem[];
    familyKeywords: KeywordItem[];
    singleKeywords: KeywordItem[];
    petKeywords: KeywordItem[];
    officeKeywords: KeywordItem[];
  };
  isGeneratingKeywords: boolean;
  handleKeywordInject: (keyword: string, event: React.MouseEvent<HTMLButtonElement>) => void;
}

export default function KeywordLab({
  selectedProduct,
  activePersona,
  setActivePersona,
  generatedKeywords,
  isGeneratingKeywords,
  handleKeywordInject
}: KeywordLabProps) {

  // 경쟁 강도 배지 시각화 도우미
  const getCompetitionBadge = (comp: 'LOW' | 'MEDIUM' | 'HIGH') => {
    if (comp === 'LOW') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 group relative cursor-pointer">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          🟢 초강추 (경쟁률 낮음)
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 rounded bg-slate-900 border border-slate-800 text-[10px] text-gray-300 leading-relaxed font-normal opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl z-50">
            대형 블로그 침투율이 낮아 초보 블로거도 1페이지 첫 화면 노출 확률 92% 이상 보장되는 극강 꿀 키워드!
          </span>
        </span>
      );
    } else if (comp === 'MEDIUM') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20 group relative cursor-pointer">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
          🟡 경쟁 보통
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 rounded bg-slate-900 border border-slate-800 text-[10px] text-gray-300 leading-relaxed font-normal opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl z-50">
            어느 정도 검색량을 유지하면서 중소형 에디터들이 고르게 경쟁해 노출을 노릴 수 있는 실속 키워드!
          </span>
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/20 group relative cursor-pointer">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
          🔴 경쟁 치열
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 rounded bg-slate-900 border border-slate-800 text-[10px] text-gray-300 leading-relaxed font-normal opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl z-50">
            일 방문자 수만 명 이상의 메가 인플루언서들이 장악하여 초기에 상위 노출은 난도가 매우 높은 키워드!
          </span>
        </span>
      );
    }
  };

  return (
    <div id="ai-keyword-lab-section" className="p-6 lg:p-8 rounded-3xl bg-white/70 backdrop-blur-xl border border-slate-200/60 shadow-sm space-y-6">
      
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <Sparkles className="w-4.5 h-4.5" />
          </span>
          <h3 className="text-base font-bold text-slate-800">
            2단계: N-BLOG AI Keyword Lab (페르소나별 키워드 리서치)
          </h3>
        </div>
      </div>

      {/* 상품 속성 매핑 현황판 */}
      <div className="p-5 rounded-2xl bg-slate-50/50 border border-slate-200/80 shadow-3xs space-y-4">
        <div className="text-xs font-black text-slate-700 uppercase tracking-wider">
          💡 AI 실시간 상품 속성 매핑 (Spec-to-Keyword Mapping)
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">매핑 대상 상품</span>
            <span className="text-xs font-black text-slate-800 block mt-1 line-clamp-1">
              {selectedProduct ? selectedProduct.name : '선택된 상품 없음 🔴'}
            </span>
          </div>
          <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">연관 브랜드 키워드</span>
            <span className="text-xs font-bold text-emerald-650 block mt-1 line-clamp-1">
              {selectedProduct && selectedProduct.brand ? `#${selectedProduct.brand} 공식스토어` : '#분석 중 🟡'}
            </span>
          </div>
          <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">타겟 가격/스펙군</span>
            <span className="text-xs font-bold text-slate-700 block mt-1 line-clamp-1">
              {selectedProduct && selectedProduct.price 
                ? `${Math.floor(Number(selectedProduct.price)/10000)}만원대 가성비 추천` 
                : '#분석 중 🟡'}
            </span>
          </div>
        </div>

        {selectedProduct && (
          <div className="flex flex-wrap gap-1.5 pt-2 font-bold">
            {generatedKeywords.specKeywords && generatedKeywords.specKeywords.map((item, idx) => (
              <button
                key={idx}
                onClick={(e) => handleKeywordInject(item.keyword, e)}
                className="px-3 py-1 rounded-xl bg-white border border-slate-200 hover:border-emerald-500/50 hover:bg-emerald-50/10 text-slate-700 text-xs font-bold transition-all shadow-3xs cursor-pointer active:scale-95 flex items-center gap-1.5"
              >
                #{item.keyword}
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 페르소나별 맞춤 제안 리스트 */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <label className="text-xs font-black text-slate-700 block uppercase tracking-wider">
            타겟 구매 페르소나별 공감 키워드 카드 세트
          </label>
          <span className="text-[10px] text-emerald-650 font-extrabold bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg animate-pulse">
            💡 카드를 클릭 시 타겟 키워드 필드에 자석처럼 날아가 주입됩니다!
          </span>
        </div>

        {/* 페르소나 탭 메뉴 */}
        <div className="flex justify-around p-3.5 rounded-3xl bg-slate-100 border border-slate-200/50 shadow-inner gap-2 overflow-x-auto">
          <button
            onClick={() => setActivePersona('family')}
            className={`py-2 px-4 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activePersona === 'family' 
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md scale-105 ring-2 ring-emerald-400 ring-offset-2' 
                : 'bg-white hover:bg-slate-50 text-slate-500 border border-slate-200 shadow-3xs'
            }`}
          >
            <span className="text-sm">🤱</span>
            <span>육아/가정</span>
          </button>
          <button
            onClick={() => setActivePersona('single')}
            className={`py-2 px-4 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activePersona === 'single' 
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md scale-105 ring-2 ring-emerald-400 ring-offset-2' 
                : 'bg-white hover:bg-slate-50 text-slate-500 border border-slate-200 shadow-3xs'
            }`}
          >
            <span className="text-sm">🧑‍💻</span>
            <span>자취/1인</span>
          </button>
          <button
            onClick={() => setActivePersona('pet')}
            className={`py-2 px-4 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activePersona === 'pet' 
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md scale-105 ring-2 ring-emerald-400 ring-offset-2' 
                : 'bg-white hover:bg-slate-50 text-slate-500 border border-slate-200 shadow-3xs'
            }`}
          >
            <span className="text-sm">🧹</span>
            <span>반려동물</span>
          </button>
          <button
            onClick={() => setActivePersona('office')}
            className={`py-2 px-4 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activePersona === 'office' 
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md scale-105 ring-2 ring-emerald-400 ring-offset-2' 
                : 'bg-white hover:bg-slate-50 text-slate-500 border border-slate-200 shadow-3xs'
            }`}
          >
            <span className="text-sm">🏢</span>
            <span>오피스</span>
          </button>
        </div>

        {/* 페르소나별 키워드 리스트 드로잉 */}
        <div className="p-5 bg-slate-50/50 border border-slate-150 rounded-2xl min-h-36 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(() => {
              if (isGeneratingKeywords) {
                return (
                  <div className="col-span-2 flex flex-col items-center justify-center py-8 space-y-3">
                    <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-xs font-bold text-slate-500">AI가 타겟 구매 페르소나별 최적 키워드를 정밀하게 도출하는 중입니다...</p>
                  </div>
                );
              }

              let targetList = generatedKeywords.familyKeywords || [];
              if (activePersona === 'single') targetList = generatedKeywords.singleKeywords || [];
              if (activePersona === 'pet') targetList = generatedKeywords.petKeywords || [];
              if (activePersona === 'office') targetList = generatedKeywords.officeKeywords || [];

              if (!selectedProduct) {
                return (
                  <div className="col-span-2 text-center py-8 text-xs text-slate-400 font-bold">
                    상품을 먼저 1단계에서 선택하셔야 페르소나별 정밀 키워드가 추출됩니다. 👥
                  </div>
                );
              }

              if (targetList.length === 0) {
                return (
                  <div className="col-span-2 text-center py-8 text-xs text-slate-400 font-bold">
                    분석된 페르소나 키워드가 없습니다.
                  </div>
                );
              }

              return targetList.map((item, idx) => (
                <button
                  key={idx}
                  onClick={(e) => handleKeywordInject(item.keyword, e)}
                  className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-emerald-500/50 hover:shadow-md hover:bg-emerald-50/10 transition-all text-left active:scale-[0.99] flex flex-col justify-between gap-3 cursor-pointer shadow-3xs group/card duration-300"
                >
                  <div className="flex items-center justify-between w-full gap-2">
                    <span className="text-xs font-black text-slate-800 line-clamp-1 group-hover/card:text-emerald-700 transition-colors">#{item.keyword}</span>
                    <span className="shrink-0">{getCompetitionBadge(item.competition)}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">{item.reason}</p>
                  <div className="border-t border-slate-100 pt-2.5 flex items-center justify-between w-full text-[9px] text-slate-400 font-bold">
                    <span>월 검색량: <strong className="text-slate-650 font-extrabold">{item.volume}</strong>건</span>
                    <span className="text-emerald-600 font-extrabold group-hover/card:translate-x-0.5 transition-transform flex items-center gap-0.5">
                      ⚡ 주입하기 +
                    </span>
                  </div>
                </button>
              ));
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
