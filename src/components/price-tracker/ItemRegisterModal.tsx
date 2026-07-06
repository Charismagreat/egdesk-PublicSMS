"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit3, X } from "lucide-react";

interface ItemRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEditMode: boolean;
  itemForm: {
    item_code: string;
    item_name: string;
    category: string;
    spec: string;
    base_price: string;
    target_margin_rate: string;
    currency_code: string;
  };
  setItemForm: React.Dispatch<React.SetStateAction<any>>;
  handleSaveItem: (e: React.FormEvent) => Promise<void>;
}

export default function ItemRegisterModal({
  isOpen,
  onClose,
  isEditMode,
  itemForm,
  setItemForm,
  handleSaveItem
}: ItemRegisterModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white border border-slate-200 w-full max-w-[500px] rounded-3xl p-6 shadow-2xl space-y-5"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-800 flex items-center gap-1.5">
                {isEditMode ? (
                  <Edit3 className="w-5 h-5 text-pink-650" />
                ) : (
                  <Plus className="w-5 h-5 text-pink-650" />
                )}
                {isEditMode ? "시황 관제 품목 정보 수정" : "신규 시황 관제 품목 등록"}
              </h3>
              <button onClick={onClose} className="p-1 hover:bg-slate-150 rounded-lg cursor-pointer">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">품목 분류</label>
                  <select
                    value={itemForm.category}
                    onChange={(e) => setItemForm((prev: any) => ({ ...prev, category: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl text-xs font-bold focus:border-pink-500 outline-none text-slate-700"
                  >
                    <option value="RAW_MATERIAL">원자재/부자재 (Raw Material)</option>
                    <option value="COMPETITOR_PRODUCT">경쟁사 완제품 (Competitor Product)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">수집 기준 통화</label>
                  <select
                    value={itemForm.currency_code}
                    onChange={(e) => setItemForm((prev: any) => ({ ...prev, currency_code: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl text-xs font-bold focus:border-pink-500 outline-none text-slate-700 font-mono"
                  >
                    <option value="KRW">KRW (대한민국 원)</option>
                    <option value="USD">USD (미국 달러)</option>
                    <option value="EUR">EUR (유럽 유로)</option>
                    <option value="JPY">JPY (일본 엔화)</option>
                    <option value="CNY">CNY (중국 위안화)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">품목 고유 코드</label>
                <input
                  type="text"
                  placeholder="예: RAW-CU-01"
                  value={itemForm.item_code}
                  onChange={(e) => setItemForm((prev: any) => ({ ...prev, item_code: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl text-xs font-bold focus:border-pink-500 outline-none text-slate-700"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">품목명 (명칭)</label>
                <input
                  type="text"
                  placeholder="예: LME 구리 전기동"
                  value={itemForm.item_name}
                  onChange={(e) => setItemForm((prev: any) => ({ ...prev, item_name: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl text-xs font-bold focus:border-pink-500 outline-none text-slate-700"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">상세 규격 (용량, 수량 등)</label>
                <input
                  type="text"
                  placeholder="예: 500ml, 40개입, 10kg 등"
                  value={itemForm.spec || ""}
                  onChange={(e) => setItemForm((prev: any) => ({ ...prev, spec: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl text-xs font-bold focus:border-pink-500 outline-none text-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">
                    자사 기준 단가 ({itemForm.currency_code})
                  </label>
                  <input
                    type="number"
                    placeholder="8200"
                    value={itemForm.base_price}
                    onChange={(e) => setItemForm((prev: any) => ({ ...prev, base_price: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl text-xs font-bold focus:border-pink-500 outline-none text-slate-750 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">목표 보존 마진율 (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="12.5"
                    value={itemForm.target_margin_rate}
                    onChange={(e) => setItemForm((prev: any) => ({ ...prev, target_margin_rate: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl text-xs font-bold focus:border-pink-500 outline-none text-slate-750 font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-gradient-to-r from-pink-500 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white font-extrabold rounded-2xl text-xs shadow-lg shadow-pink-500/10 cursor-pointer transition-all active:scale-[0.99]"
              >
                {isEditMode ? "💾 품목 시황 정보 수정 완료" : "➕ 품목 시황 감시 등록"}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
