"use client";

import React from "react";
import { Check } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface OrderSuccessScreenProps {
  tableId: string | string[] | undefined;
  onClose: () => void;
}

export function OrderSuccessScreen({ tableId, onClose }: OrderSuccessScreenProps) {
  const [bankInfo, setBankInfo] = React.useState({
    bankName: "국민은행",
    accountNumber: "123456-12-123456",
    accountHolder: "주식회사 이지데스크"
  });

  React.useEffect(() => {
    async function loadBankInfo() {
      try {
        const res = await apiFetch('/api/settings?key=my_company_profile');
        const data = await res.json();
        if (data.success && data.value) {
          const parsed = JSON.parse(data.value);
          setBankInfo({
            bankName: parsed.bankName || "국민은행",
            accountNumber: parsed.accountNumber || "123456-12-123456",
            accountHolder: parsed.accountHolder || "주식회사 이지데스크"
          });
        }
      } catch (err) {
        console.warn('계좌 정보 로드 실패 (기본 폴백 적용):', err);
      }
    }
    loadBankInfo();
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center text-white">
      <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
        <Check className="w-12 h-12 text-green-500" />
      </div>
      <h1 className="text-3xl font-bold text-white mb-4">주문이 들어갔습니다!</h1>
      <p className="text-slate-400 mb-6 font-medium text-lg">테이블 {tableId}번 주문이 주방으로 전달되었습니다.</p>
      
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 text-left w-full max-w-sm mx-auto mb-8 border border-white/5">
        <h4 className="text-sm font-bold text-orange-400 mb-3 border-b border-white/10 pb-2">계좌 이체 결제 안내</h4>
        <p className="text-sm text-slate-300 mb-1">카운터 방문이 어려우신 경우 아래 계좌로 송금해 주세요.</p>
        <div className="bg-black/20 p-3 rounded-xl border border-white/5 mt-3">
          <div className="font-mono text-sm font-bold text-white">
            {bankInfo.bankName} {bankInfo.accountNumber}
            <span className="block text-xs text-slate-400 mt-1">예금주: {bankInfo.accountHolder}</span>
          </div>
        </div>
      </div>

      <button onClick={onClose} className="bg-slate-800 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-slate-700 transition-colors border-0 cursor-pointer">
        메뉴 더 보기
      </button>
    </div>
  );
}
