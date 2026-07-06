"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Info, X, ArrowUpRight } from "lucide-react";

interface CollectorGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  setUrlForm: React.Dispatch<React.SetStateAction<any>>;
}

export default function CollectorGuideModal({
  isOpen,
  onClose,
  setUrlForm
}: CollectorGuideModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white border border-slate-200 w-full max-w-[500px] rounded-3xl p-6 shadow-2xl space-y-6 overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="space-y-0.5">
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-pink-650" />
                  수집 주기 (Cron) 설정 가이드
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold">자동 수집 주기를 지정하는 5필드 크론식 사용법</p>
              </div>
              <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {/* 크론식 구조 시각화 */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold text-slate-500">크론식 포맷 구조</h4>
              <div className="grid grid-cols-5 gap-1.5 text-center">
                {[
                  { label: "분", desc: "0-59", value: "*" },
                  { label: "시", desc: "0-23", value: "*" },
                  { label: "일", desc: "1-31", value: "*" },
                  { label: "월", desc: "1-12", value: "*" },
                  { label: "요일", desc: "0-6", value: "*" },
                ].map((field, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-150 p-2 rounded-xl">
                    <div className="text-[10px] font-black text-slate-700">{field.label}</div>
                    <div className="text-[8px] text-slate-400 font-semibold mb-1">{field.desc}</div>
                    <div className="text-xs font-mono font-extrabold text-pink-600 bg-white border border-pink-100 rounded py-0.5">{field.value}</div>
                  </div>
                ))}
              </div>
              <p className="text-[9px] text-slate-450 leading-relaxed font-medium">
                각 자리는 공백으로 구분하며, <code className="bg-slate-100 px-1 py-0.2 rounded font-mono font-bold text-pink-600 text-[8px]">*</code>은 "모든 값(매 주기)"을 의미합니다. 요일은 0이 일요일, 1이 월요일이며 6이 토요일입니다.
              </p>
            </div>

            {/* 빠른 템플릿 선택 */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold text-slate-500">클릭 시 자동 완성 템플릿</h4>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { title: "매시간 정각", cron: "0 * * * *", desc: "1시간 간격 수집" },
                  { title: "매일 오전 9시", cron: "0 9 * * *", desc: "업무 시작 시간 수집" },
                  { title: "매일 밤 12시", cron: "0 0 * * *", desc: "하루 마무리 시각" },
                  { title: "매주 월요일 9시", cron: "0 9 * * 1", desc: "주간 업무 시작 수집" },
                ].map((temp, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setUrlForm((prev: any) => ({ ...prev, cron_interval: temp.cron }));
                      onClose();
                    }}
                    className="bg-slate-50 hover:bg-pink-50/50 hover:border-pink-200 border border-slate-150 p-3 rounded-2xl text-left cursor-pointer transition-all duration-200 group"
                  >
                    <div className="text-[11px] font-extrabold text-slate-800 group-hover:text-pink-600 transition-colors flex items-center justify-between">
                      <span>{temp.title}</span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-pink-500 shrink-0" />
                    </div>
                    <div className="text-[8px] text-slate-400 font-semibold mb-1">{temp.desc}</div>
                    <div className="text-[10px] font-mono font-black text-indigo-650 bg-white border border-slate-200 px-1.5 py-0.5 rounded-lg w-max shrink-0 group-hover:border-pink-100">
                      {temp.cron}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-2xl flex items-start gap-2">
              <Info className="w-4 h-4 text-pink-650 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <h5 className="text-[10px] font-bold text-slate-700">고급 팁 (주기 범위)</h5>
                <p className="text-[9px] text-slate-450 leading-relaxed font-semibold">
                  콤마(<code className="font-mono text-pink-600 font-bold">,</code>)를 사용하여 여러 시각을 지정하거나(예: <code className="font-mono text-pink-600 font-bold">0 9,18 * * *</code> = 오전 9시 & 오후 6시), 슬래시(<code className="font-mono text-pink-600 font-bold">/</code>)를 활용해 주기 간격을 지정할 수 있습니다.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center cursor-pointer transition-all duration-200"
            >
              닫기
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
