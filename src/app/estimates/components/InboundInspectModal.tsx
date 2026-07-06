"use client";

import { apiFetch } from '@/lib/api';
import React, { useState, useEffect } from "react";
import { CheckCircle2, Minus, Plus, Info } from "lucide-react";
import { PurchaseOrder } from "../types";

interface InboundInspectModalProps {
  isOpen: boolean;
  onClose: () => void;
  po: PurchaseOrder | null;
  onSuccess: () => void;
}

export default function InboundInspectModal({
  isOpen,
  onClose,
  po,
  onSuccess
}: InboundInspectModalProps) {
  const [inspectItems, setInspectItems] = useState<Array<{ product_name: string; quantity: number; checkedQty: number; unit_price: number }>>([]);
  const [inspectSubmitting, setInspectSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && po) {
      // 모의 발주 상세 품목 세팅 (실물 검수용 프리셋 연동)
      setInspectItems([
        { product_name: "에티오피아 예가체프 G1 워시드 원두 1kg", quantity: 20, checkedQty: 20, unit_price: 18500 },
        { product_name: "콜롬비아 수프리모 후일라 원두 1kg", quantity: 30, checkedQty: 30, unit_price: 16000 }
      ]);
    }
  }, [isOpen, po]);

  if (!isOpen || !po) return null;

  const handleAdjustInspectQty = (idx: number, amt: number) => {
    setInspectItems(prev => {
      const next = [...prev];
      next[idx].checkedQty = Math.max(0, next[idx].checkedQty + amt);
      return next;
    });
  };

  const handleConfirmInspectInbound = async () => {
    setInspectSubmitting(true);
    try {
      const res = await apiFetch("/api/estimates/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm_inbound",
          orderId: po.id,
          partner_name: po.vendor_name,
          checkedItems: inspectItems
        })
      });
      const data = await res.json();
      if (data.success) {
        onSuccess();
        onClose();
        alert("🎉 실물 입고 검수가 최종 승인되었습니다! 실제 검수 수량이 이지데스크 재고 대장에 가산되어 실시간 동기화 완료되었습니다.");
      } else {
        alert(data.error || "입고 승인 처리 중 에러 발생");
      }
    } catch (err) {
      alert("입고 승인 처리 중 네트워크 에러 발생");
    } finally {
      setInspectSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] max-w-xl w-full p-6 md:p-8 shadow-2xl relative overflow-hidden flex flex-col animate-scale-up">
        <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          <span>실물 입고 검수 및 재고 반영</span>
        </h3>
        
        <p className="text-xs text-slate-500 leading-relaxed mb-6">
          <b>발주처: {po.vendor_name}</b> 으로부터 자재 실물이 도착하였습니다. <br />
          실물과 맞닥뜨려 수량을 꼼꼼히 확인하고 **실제 확인한 수량만큼** 검수 승인해 주세요. <br />
          [승인] 클릭 시 해당 검수 수량만큼 **재고 대장 자재 수량이 실시간 가산 누적**됩니다.
        </p>

        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
          <div className="bg-slate-50 p-3.5 rounded-2xl text-[10px] text-slate-500 font-bold flex items-center gap-2 border border-slate-100">
            <Info className="w-4 h-4 text-slate-400 shrink-0" />
            <span>실물 누락 및 훼손 시 실제 검수 통과 수량을 하단에서 마이너스 조절해 기입해 주십시오.</span>
          </div>

          {inspectItems.map((item, idx) => (
            <div key={idx} className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between shadow-sm">
              <div className="flex-1 min-w-0 pr-3">
                <span className="font-bold text-slate-800 text-xs md:text-sm truncate block">{item.product_name}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">발주 수량: <b>{item.quantity}개</b></span>
              </div>

              {/* 수량 조절 필드 */}
              <div className="flex items-center bg-slate-100 rounded-xl p-1 shrink-0">
                <button 
                  onClick={() => handleAdjustInspectQty(idx, -1)}
                  className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-650 shadow-sm"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-10 text-center font-black text-slate-800 text-xs md:text-sm">{item.checkedQty}</span>
                <button 
                  onClick={() => handleAdjustInspectQty(idx, 1)}
                  className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-650 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 border-t border-slate-100 pt-4 flex gap-3">
          <button 
            onClick={onClose} 
            className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 rounded-2xl font-bold text-xs"
          >
            취소
          </button>
          <button 
            onClick={handleConfirmInspectInbound}
            disabled={inspectSubmitting}
            className="flex-1 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs rounded-2xl shadow-xl shadow-emerald-600/20"
          >
            {inspectSubmitting ? "실재고 수량 가산 중..." : "실물 입고 검수 완료 및 재고 반영 승인"}
          </button>
        </div>
      </div>
    </div>
  );
}
