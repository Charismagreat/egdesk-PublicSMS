"use client";

import React, { useState } from "react";
import { HelpCircle, ChevronDown } from "lucide-react";
import { FAQItem } from "../types";

interface FaqAccordionListProps {
  filteredFaqs: FAQItem[];
}

export default function FaqAccordionList({ filteredFaqs }: FaqAccordionListProps) {
  // 첫 번째 질문 (sms-1) 기본 오픈 상태로 초기화
  const [openIds, setOpenIds] = useState<Set<string>>(new Set(["sms-1"]));

  // 아코디언 토글 핸들러
  const toggleAccordion = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="w-full space-y-4 block">
      <div className="flex justify-between items-center px-1">
        <span className="text-xs md:text-sm font-bold text-slate-400">
          총 <b>{filteredFaqs.length}개</b>의 가이드 매뉴얼 검색됨
        </span>
      </div>

      {filteredFaqs.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center py-24 shadow-sm w-full block">
          <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-4 animate-pulse" />
          <h3 className="text-base font-black text-slate-800 mb-1">
            일치하는 가이드를 찾을 수 없습니다.
          </h3>
          <p className="text-xs text-slate-400">
            검색어를 지우거나 카테고리를 다시 클릭해 주세요.
          </p>
        </div>
      ) : (
        <div className="space-y-4 w-full block">
          {filteredFaqs.map((faq) => {
            const isOpen = openIds.has(faq.id);

            return (
              <div
                key={faq.id}
                className={`bg-white border rounded-2xl overflow-hidden transition-all duration-300 shadow-sm w-full block ${
                  isOpen
                    ? "border-amber-400/80 ring-2 ring-amber-400/5"
                    : "border-slate-100 hover:border-slate-200 hover:shadow-md"
                }`}
              >
                {/* 질문 영역 */}
                <button
                  id={`faq-btn-${faq.id}`}
                  onClick={() => toggleAccordion(faq.id)}
                  className="w-full flex items-center justify-between p-5 text-left font-black text-slate-800 text-sm md:text-base gap-4 transition-colors cursor-pointer select-none bg-slate-50/10 hover:bg-slate-50/40"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 transition-transform ${
                        isOpen
                          ? "bg-amber-400 scale-125 shadow-lg shadow-amber-400/40"
                          : "bg-slate-300"
                      }`}
                    ></span>
                    <span>{faq.question}</span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-300 ${
                      isOpen ? "rotate-180 text-amber-500" : ""
                    }`}
                  />
                </button>

                {/* 답변 오픈 영역 */}
                {isOpen && (
                  <div className="p-5 border-t border-slate-50 bg-slate-50/20 text-xs md:text-sm text-slate-600 leading-relaxed font-medium animate-scale-up block">
                    <div
                      id={`faq-ans-${faq.id}`}
                      className="bg-white p-5 rounded-2xl border border-slate-100/50 text-slate-700 shadow-inner leading-relaxed block"
                    >
                      {faq.answer}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
