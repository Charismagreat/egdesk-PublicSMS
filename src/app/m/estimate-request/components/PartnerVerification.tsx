import React from "react";
import { CheckStatusMsg } from "../types";

interface PartnerVerificationProps {
  businessNumber: string;
  setBusinessNumber: (val: string) => void;
  loading: boolean;
  checkStatusMsg: CheckStatusMsg | null;
  onCheckBusiness: () => void;
}

export function PartnerVerification({
  businessNumber,
  setBusinessNumber,
  loading,
  checkStatusMsg,
  onCheckBusiness
}: PartnerVerificationProps) {
  return (
    <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm space-y-4">
      <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1">
        B2B 파트너 본인 인증
      </span>
      
      <div className="space-y-3">
        <label className="text-[10px] text-slate-400 font-bold block">사업자등록번호 입력 *</label>
        <div className="flex gap-2">
          <input 
            type="text"
            placeholder="10자리 번호 입력 (예: 123-45-67890)"
            value={businessNumber}
            onChange={e => setBusinessNumber(e.target.value)}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 focus:border-indigo-500 rounded-xl outline-none text-xs font-bold font-mono transition-all disabled:bg-slate-100"
            required
          />
          <button
            type="button"
            onClick={onCheckBusiness}
            disabled={loading}
            className="px-4 py-3 bg-slate-900 text-white rounded-xl text-xs font-black shadow-md hover:bg-slate-800 transition-colors shrink-0 border-0 cursor-pointer disabled:bg-slate-400 disabled:cursor-not-allowed"
          >
            중복 조회
          </button>
        </div>

        {/* 중복 체크 피드백 메시지 */}
        {checkStatusMsg && (
          <div 
            className={`p-3.5 rounded-xl border text-[11px] font-semibold leading-relaxed transition-all ${
              checkStatusMsg.type === 'success' 
                ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                : 'bg-indigo-50 border-indigo-100 text-indigo-700'
            }`}
          >
            {checkStatusMsg.text}
          </div>
        )}
      </div>
    </div>
  );
}
