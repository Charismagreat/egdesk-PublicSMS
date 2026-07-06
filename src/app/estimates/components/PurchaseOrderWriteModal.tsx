"use client";

import { apiFetch } from '@/lib/api';
import React, { useState } from "react";
import { Plus, X, Sparkles } from "lucide-react";
import { Partner } from "../types";

interface PurchaseOrderWriteModalProps {
  isOpen: boolean;
  onClose: () => void;
  partners: Partner[];
  onSuccess: () => void;
}

export default function PurchaseOrderWriteModal({
  isOpen,
  onClose,
  partners,
  onSuccess
}: PurchaseOrderWriteModalProps) {
  const [selectedPartnerId, setSelectedPartnerId] = useState("direct");
  const [writeVendor, setWriteVendor] = useState("");
  const [writeManager, setWriteManager] = useState("");
  const [writePhone, setWritePhone] = useState("");
  const [writeItems, setWriteItems] = useState<Array<{ item_code: string; product_name: string; spec: string; quantity: number; unit_price: number }>>([
    { item_code: "RAW-COF-01", product_name: "브라질 세라도 생두 10kg", spec: "10kg/백", quantity: 10, unit_price: 32000 }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setWriteVendor("");
    setWriteManager("");
    setWritePhone("");
    setSelectedPartnerId("direct");
    setWriteItems([
      { item_code: "RAW-COF-01", product_name: "브라질 세라도 생두 10kg", spec: "10kg/백", quantity: 10, unit_price: 32000 }
    ]);
    onClose();
  };

  // 총 합계 금액 계산
  const totalAmount = writeItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

  // 수동 발주서 기안 저장 실행
  const handleSavePO = async () => {
    if (!writeVendor.trim()) {
      alert("공급처 상호명을 입력해 주세요.");
      return;
    }
    if (writeItems.length === 0) {
      alert("최소 1개 이상의 발주 품목이 필요합니다.");
      return;
    }

    const hasInvalidItem = writeItems.some(item => !item.product_name.trim() || item.quantity <= 0 || item.unit_price <= 0);
    if (hasInvalidItem) {
      alert("품목명, 수량(1개 이상), 단가(1원 이상)를 올바르게 입력해 주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiFetch("/api/estimates/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_purchase_order_manual",
          vendor_name: writeVendor,
          vendor_phone: writePhone,
          vendor_manager: writeManager,
          items: writeItems,
          total_amount: totalAmount
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || "발주서가 성공적으로 등록되었습니다.");
        handleClose();
        onSuccess();
      } else {
        alert(data.error || "발주서 기안 실패");
      }
    } catch (e) {
      alert("네트워크 통신 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] max-w-2xl w-full p-6 md:p-8 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] animate-scale-up border border-slate-200/85">
        {/* 닫기 버튼 */}
        <button onClick={handleClose} className="absolute top-5 right-5 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors cursor-pointer">
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-indigo-500" />
          <span>보낸 발주서 직접 기안 작성</span>
        </h3>

        <div className="space-y-5 flex-1 overflow-y-auto pr-1">
          {/* 공급처 파트너 선택 */}
          <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div>
              <label className="text-[10px] text-slate-400 font-bold block mb-1">B2B 공급처(VENDOR) 선택 🤝</label>
              <select
                value={selectedPartnerId}
                onChange={e => {
                  const ptId = e.target.value;
                  setSelectedPartnerId(ptId);
                  if (ptId === "direct") {
                    setWriteVendor("");
                    setWriteManager("");
                    setWritePhone("");
                  } else {
                    const target = partners.find(p => p.id === ptId);
                    if (target) {
                      setWriteVendor(target.company_name);
                      setWritePhone(target.phone || "");
                      setWriteManager((target as any).manager_name || "");
                    }
                  }
                }}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold"
              >
                <option value="direct">직접 입력 (신규 공급처)</option>
                {partners.filter(p => p.type === 'VENDOR').map(pt => (
                  <option key={pt.id} value={pt.id}>{pt.company_name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">공급처 상호명 *</label>
                <input 
                  type="text" 
                  placeholder="예: 태백유통(주)"
                  value={writeVendor}
                  onChange={e => setWriteVendor(e.target.value)}
                  disabled={selectedPartnerId !== "direct"}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold disabled:bg-slate-100/70 disabled:text-slate-500"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">수신 담당자명</label>
                <input 
                  type="text" 
                  placeholder="예: 홍길동 과장"
                  value={writeManager}
                  onChange={e => setWriteManager(e.target.value)}
                  disabled={selectedPartnerId !== "direct"}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold disabled:bg-slate-100/70 disabled:text-slate-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">공급처 연락처</label>
                <input 
                  type="text" 
                  placeholder="02-1234-5678"
                  value={writePhone}
                  onChange={e => setWritePhone(e.target.value)}
                  disabled={selectedPartnerId !== "direct"}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold disabled:bg-slate-100/70 disabled:text-slate-500"
                />
              </div>
            </div>
          </div>

          {/* 발주 품목 입력 폼 */}
          <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="flex justify-between items-center border-b border-slate-200 pb-1.5 mb-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">발주 품목 리스트</span>
              <button
                type="button"
                onClick={() => {
                  setWriteItems([...writeItems, { item_code: "", product_name: "", spec: "", quantity: 1, unit_price: 10000 }]);
                }}
                className="p-1.5 text-indigo-650 hover:bg-indigo-50 rounded-lg border border-indigo-200 flex items-center gap-0.5 text-[9px] font-black cursor-pointer"
              >
                <Plus className="w-3 h-3" /> 품목 추가
              </button>
            </div>

            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
              {writeItems.map((item, idx) => (
                <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 text-left relative">
                  <div className="flex justify-between items-center">
                    <label className="block text-[9px] font-black text-indigo-600 uppercase tracking-wider">품목 #{idx + 1}</label>
                    {writeItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setWriteItems(writeItems.filter((_, i) => i !== idx));
                        }}
                        className="text-[9px] font-bold text-rose-500 hover:text-rose-700 cursor-pointer"
                      >
                        삭제
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 mb-1">품목코드 (선택)</label>
                      <input 
                        type="text" 
                        placeholder="예: CODE-01"
                        value={item.item_code}
                        onChange={e => {
                          const next = [...writeItems];
                          next[idx].item_code = e.target.value;
                          setWriteItems(next);
                        }}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[9px] font-bold text-slate-400 mb-1">품명 *</label>
                      <input 
                        type="text" 
                        placeholder="예: 자재 부품명"
                        value={item.product_name}
                        onChange={e => {
                          const next = [...writeItems];
                          next[idx].product_name = e.target.value;
                          setWriteItems(next);
                        }}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 mb-1">규격</label>
                      <input 
                        type="text" 
                        placeholder="예: 10kg/Box"
                        value={item.spec}
                        onChange={e => {
                          const next = [...writeItems];
                          next[idx].spec = e.target.value;
                          setWriteItems(next);
                        }}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 mb-1">수량 *</label>
                      <input 
                        type="number" 
                        value={item.quantity}
                        onChange={e => {
                          const next = [...writeItems];
                          next[idx].quantity = parseInt(e.target.value) || 0;
                          setWriteItems(next);
                        }}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-center"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 mb-1">단가 *</label>
                      <input 
                        type="number" 
                        value={item.unit_price}
                        onChange={e => {
                          const next = [...writeItems];
                          next[idx].unit_price = parseInt(e.target.value) || 0;
                          setWriteItems(next);
                        }}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-right font-mono"
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 총액 패널 */}
            <div className="p-4 bg-indigo-50/40 rounded-2xl border border-indigo-100 flex items-center justify-between text-left mt-2">
              <span className="text-xs font-extrabold text-slate-655">발주 예정 총 합계액</span>
              <span className="text-lg font-black text-indigo-700 font-mono">
                {totalAmount.toLocaleString()}원
              </span>
            </div>
          </div>
        </div>

        {/* 하단 제어 버튼 */}
        <div className="mt-6 border-t border-slate-100 pt-4 flex gap-3">
          <button onClick={handleClose} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-xs cursor-pointer">
            취소
          </button>
          <button 
            onClick={handleSavePO}
            disabled={isSubmitting}
            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl disabled:opacity-50 transition-colors cursor-pointer"
          >
            {isSubmitting ? "기안 등록 중..." : "발주서 등록 승인"}
          </button>
        </div>
      </div>
    </div>
  );
}
