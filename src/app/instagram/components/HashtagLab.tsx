"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Hash, Sparkles, Plus, Copy, Check, Users, Home, Dog, Briefcase, Zap } from "lucide-react";
import { HashtagItem, HashtagResponse } from "@/app/api/instagram/generate-hashtags/route";
import { Product } from "../types";

interface HashtagLabProps {
  /**
   * 선택된 상품
   */
  selectedProduct: Product | null;
  /**
   * 해시태그 생성 로딩 상태
   */
  isGeneratingHashtags: boolean;
  /**
   * 해시태그 생성 트리거 핸들러
   */
  onGenerateHashtags: () => Promise<void>;
  /**
   * 생성된 해시태그 응답 데이터
   */
  hashtagData: HashtagResponse;
  /**
   * 해시태그 칩 클릭 시 피드 본문에 자동 추가하는 콜백
   */
  onAddHashtagToText: (hashtag: string) => void;
}

export default function HashtagLab({
  selectedProduct,
  isGeneratingHashtags,
  onGenerateHashtags,
  hashtagData,
  onAddHashtagToText,
}: HashtagLabProps) {
  const [activeTab, setActiveTab] = useState<string>("family");
  const [copiedHashtag, setCopiedHashtag] = useState<string | null>(null);

  // 현재 선택된 페르소나 탭에 따른 해시태그 목록 리턴
  const getActiveHashtags = (): HashtagItem[] => {
    switch (activeTab) {
      case "spec":
        return hashtagData.specKeywords || [];
      case "family":
        return hashtagData.familyKeywords || [];
      case "single":
        return hashtagData.singleKeywords || [];
      case "pet":
        return hashtagData.petKeywords || [];
      case "office":
        return hashtagData.officeKeywords || [];
      default:
        // 동적 페르소나 체크
        if (hashtagData.dynamicPersonas) {
          const found = hashtagData.dynamicPersonas.find((dp: any) => dp.id === activeTab);
          if (found && found.keywords) return found.keywords;
        }
        return hashtagData.specKeywords || [];
    }
  };

  const handleChipClick = (hashtag: string) => {
    onAddHashtagToText(hashtag);
    setCopiedHashtag(hashtag);
    setTimeout(() => {
      setCopiedHashtag(null);
    }, 1500);
  };

  const currentList = getActiveHashtags();

  return (
    <div className="p-6 rounded-3xl border border-slate-100 bg-white shadow-sm relative overflow-hidden text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 mb-5 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-pink-50 rounded-xl text-pink-600 border border-pink-100 shadow-sm">
            <Hash className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
              AI 해시태그 & 페르소나 연구소
              <span className="text-[10px] bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full font-extrabold">
                Magnetic Lab
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              타겟 페르소나별 최적화된 인기 해시태그를 AI가 실시간 도출합니다. 클릭 시 피드 에디터에 자동 추가됩니다.
            </p>
          </div>
        </div>

        <button
          onClick={onGenerateHashtags}
          disabled={isGeneratingHashtags}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold text-xs hover:opacity-95 shadow-sm transition disabled:opacity-50 cursor-pointer border-0 shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          {isGeneratingHashtags ? "AI 분석 중..." : "AI 해시태그 분석 추출"}
        </button>
      </div>

      {/* 페르소나 탭 선택 버튼 */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 no-scrollbar mb-4">
        <button
          onClick={() => setActiveTab("spec")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
            activeTab === "spec"
              ? "bg-slate-900 text-white border-slate-900 shadow-sm"
              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          상품 스펙/메인
        </button>

        <button
          onClick={() => setActiveTab("family")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
            activeTab === "family"
              ? "bg-pink-600 text-white border-pink-600 shadow-sm"
              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          육아/패밀리
        </button>

        <button
          onClick={() => setActiveTab("single")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
            activeTab === "single"
              ? "bg-purple-600 text-white border-purple-600 shadow-sm"
              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
          }`}
        >
          <Home className="w-3.5 h-3.5" />
          원룸/자취생
        </button>

        <button
          onClick={() => setActiveTab("pet")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
            activeTab === "pet"
              ? "bg-amber-600 text-white border-amber-600 shadow-sm"
              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
          }`}
        >
          <Dog className="w-3.5 h-3.5" />
          반려동물/집사
        </button>

        <button
          onClick={() => setActiveTab("office")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
            activeTab === "office"
              ? "bg-sky-600 text-white border-sky-600 shadow-sm"
              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          사무실/직장인
        </button>

        {/* 동적 맞춤 페르소나 탭들 */}
        {hashtagData.dynamicPersonas?.map((dp: any) => (
          <button
            key={dp.id}
            onClick={() => setActiveTab(dp.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
              activeTab === dp.id
                ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
            }`}
          >
            <span>{dp.icon || "✨"}</span>
            {dp.name}
          </button>
        ))}
      </div>

      {/* 해시태그 칩 카드리스트 (마그네틱 클릭 플라잉) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {currentList.length === 0 ? (
          <div className="col-span-full py-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl">
            <Hash className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
            <p className="text-xs font-semibold text-slate-500">추출된 해시태그가 없습니다.</p>
            <p className="text-[10px] text-slate-400 mt-0.5">상단 'AI 해시태그 분석 추출' 버튼을 클릭해보세요.</p>
          </div>
        ) : (
          currentList.map((item, idx) => (
            <motion.div
              key={idx}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleChipClick(item.hashtag)}
              className="p-3 bg-slate-50 hover:bg-pink-50/70 border border-slate-200/80 hover:border-pink-300 rounded-2xl transition duration-200 cursor-pointer text-left relative group shadow-sm"
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-extrabold text-xs text-slate-800 group-hover:text-pink-600 transition truncate">
                  {item.hashtag}
                </span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                    item.competition === "HIGH"
                      ? "bg-rose-50 text-rose-600 border-rose-200"
                      : item.competition === "MEDIUM"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  }`}
                >
                  {item.competition}
                </span>
              </div>

              <div className="flex justify-between items-center text-[10px] text-slate-500 mt-2 pt-2 border-t border-slate-200/50">
                <span>월간유입 {item.volume}</span>
                <span className="flex items-center gap-0.5 font-bold text-pink-600">
                  {copiedHashtag === item.hashtag ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-600">추가됨</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3 h-3" />
                      추가
                    </>
                  )}
                </span>
              </div>
              <p className="text-[9px] text-slate-400 mt-1 line-clamp-1">{item.reason}</p>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
