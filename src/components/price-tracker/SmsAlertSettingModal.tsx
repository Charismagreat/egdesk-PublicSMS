"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, Info } from "lucide-react";

interface SmsAlertSettingModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeItem: any;
  alertForm: {
    rule_name: string;
    condition_type: string;
    threshold_value: string;
    phone_number: string;
    sms_template: string;
    threshold_unit: string;
    threshold_currency: string;
    condition_operator: string;
  };
  setAlertForm: React.Dispatch<React.SetStateAction<any>>;
  handleAddAlertRule: (e: React.FormEvent) => Promise<void>;
}

export default function SmsAlertSettingModal({
  isOpen,
  onClose,
  activeItem,
  alertForm,
  setAlertForm,
  handleAddAlertRule
}: SmsAlertSettingModalProps) {
  return (
    <AnimatePresence>
      {isOpen && activeItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white border border-slate-200 w-full max-w-[600px] rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="space-y-0.5">
                <h3 className="text-base font-black text-slate-800 flex items-center gap-1.5">
                  <Bell className="w-5 h-5 text-pink-600 animate-pulse" />
                  [{activeItem.item_name}] FreeSMS 가격선 경보 제어
                </h3>
                <p className="text-[11px] text-slate-400 font-semibold">비율(%) 또는 다국어 통화별 금액 기준의 하이브리드 가격선 감지</p>
              </div>
              <button onClick={onClose} className="p-1 hover:bg-slate-150 rounded-lg cursor-pointer">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleAddAlertRule} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">알림 시나리오명</label>
                  <input
                    type="text"
                    value={alertForm.rule_name}
                    onChange={(e) => setAlertForm(prev => ({ ...prev, rule_name: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-bold focus:border-pink-500 outline-none text-slate-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">긴급 문자 수신 연락처</label>
                  <input
                    type="text"
                    placeholder="010-1234-5678"
                    value={alertForm.phone_number}
                    onChange={(e) => setAlertForm(prev => ({ ...prev, phone_number: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-bold focus:border-pink-500 outline-none text-slate-700 font-mono"
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-150 pb-2">
                  <span className="text-[10px] font-extrabold text-slate-650">경보 가격선 형식 설정</span>

                  <div className="flex bg-slate-200/60 p-0.5 rounded-lg border border-slate-300">
                    <button
                      type="button"
                      onClick={() => setAlertForm(prev => ({ ...prev, threshold_unit: "PERCENT", condition_operator: "MARGIN_BREAKDOWN" }))}
                      className={`px-3 py-1 rounded-md text-[9px] font-black uppercase transition-all cursor-pointer ${
                        alertForm.threshold_unit === "PERCENT"
                          ? "bg-white text-pink-650 shadow-sm"
                          : "text-slate-450 hover:text-slate-750"
                      }`}
                    >
                      비율 (%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAlertForm(prev => ({ ...prev, threshold_unit: "PRICE", condition_operator: "ABOVE" }))}
                      className={`px-3 py-1 rounded-md text-[9px] font-black uppercase transition-all cursor-pointer ${
                        alertForm.threshold_unit === "PRICE"
                          ? "bg-white text-pink-655 shadow-sm"
                          : "text-slate-450 hover:text-slate-755"
                      }`}
                    >
                      금액 ($ / ₩)
                    </button>
                  </div>
                </div>

                {alertForm.threshold_unit === "PERCENT" ? (
                  <div className="grid grid-cols-2 gap-3 items-center">
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">경보 발생 조건</span>
                      <div className="p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700">
                        🛡️ 마진 스프레드 붕괴 시
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">허용 최저 마진 보존선 (%)</label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          value={alertForm.threshold_value}
                          onChange={(e) => setAlertForm(prev => ({ ...prev, threshold_value: e.target.value }))}
                          className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-xs font-bold focus:border-pink-500 outline-none text-slate-700 font-mono pr-8"
                        />
                        <span className="text-slate-400 text-xs font-bold absolute right-3 top-1/2 -translate-y-1/2">% 미만</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1 col-span-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">금액 기준 통화</label>
                        <select
                          value={alertForm.threshold_currency}
                          onChange={(e) => setAlertForm(prev => ({ ...prev, threshold_currency: e.target.value }))}
                          className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-xs font-bold focus:border-pink-500 outline-none text-slate-700 font-mono"
                        >
                          <option value="KRW">₩ 국내 (KRW)</option>
                          <option value="USD">$ 미국 (USD)</option>
                          <option value="EUR">€ 유럽 (EUR)</option>
                          <option value="JPY">¥ 일본 (JPY)</option>
                          <option value="CNY">¥ 중국 (CNY)</option>
                        </select>
                      </div>

                      <div className="space-y-1 col-span-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">동작 연산자</label>
                        <select
                          value={alertForm.condition_operator}
                          onChange={(e) => setAlertForm(prev => ({ ...prev, condition_operator: e.target.value }))}
                          className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-xs font-bold focus:border-pink-500 outline-none text-slate-700"
                        >
                          <option value="ABOVE">▲ 초과 돌파 시</option>
                          <option value="BELOW">▼ 미만 붕괴 시</option>
                        </select>
                      </div>

                      <div className="space-y-1 col-span-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">금액 임계값 설정</label>
                        <input
                          type="number"
                          value={alertForm.threshold_value}
                          onChange={(e) => setAlertForm(prev => ({ ...prev, threshold_value: e.target.value }))}
                          className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-xs font-bold focus:border-pink-500 outline-none text-slate-700 font-mono"
                        />
                      </div>
                    </div>

                    {alertForm.threshold_currency !== "KRW" && Number(alertForm.threshold_value) > 0 && (
                      <div className="text-[9.5px] text-pink-650 bg-pink-50 px-3.5 py-2.5 rounded-xl border border-pink-100 font-semibold leading-relaxed flex items-center gap-1.5">
                        <Info className="w-4 h-4 shrink-0" />
                        <span>
                          금융 관제 연동: <strong>{Number(alertForm.threshold_value).toLocaleString()} {alertForm.threshold_currency}</strong>는
                          실시간 고시 환율 적용 시 원화 <strong>약 ₩ {(
                            Number(alertForm.threshold_value) *
                            (alertForm.threshold_currency === 'USD' ? 1380 : alertForm.threshold_currency === 'EUR' ? 1495 : alertForm.threshold_currency === 'JPY' ? 8.8 : 1.0)
                          ).toLocaleString()}원</strong>에 해당합니다.
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[9.5px] font-bold text-slate-400 uppercase flex items-center justify-between">
                  <span>FreeSMS 긴급 경보 통보 SMS LMS 문자 템플릿</span>
                  <span className="text-[8.5px] text-indigo-650 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">변수 치환 가능</span>
                </label>
                <textarea
                  rows={4}
                  value={alertForm.sms_template}
                  onChange={(e) => setAlertForm(prev => ({ ...prev, sms_template: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-bold focus:border-pink-500 outline-none text-slate-700 font-mono placeholder-slate-450 leading-relaxed"
                />
                <p className="text-[8.5px] text-slate-400 leading-normal font-semibold">
                  * 치환 매핑 가능한 중소제조 SCM 전용 단가 변수: <strong>{"{item_name}, {item_code}, {captured_price}, {converted_krw_price}, {threshold_value}, {threshold_unit}"}</strong>
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-650 text-white font-extrabold rounded-xl text-xs shadow-md transition-all active:scale-[0.99] cursor-pointer"
              >
                💾 FreeSMS 긴급 경보 자동화 규칙 가동 저장
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
