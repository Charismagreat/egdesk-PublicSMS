import React from "react";
import { Plus } from "lucide-react";
import { PaymentForm } from "../types";

interface PaymentFormSectionProps {
  form: PaymentForm;
  onUpdateField: (key: keyof PaymentForm, value: string) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}

export function PaymentFormSection({
  form,
  onUpdateField,
  onSubmit
}: PaymentFormSectionProps) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
      <h2 className="text-lg font-bold mb-4">새 결제 등록</h2>
      <form onSubmit={onSubmit} className="flex space-x-3">
        <input 
          type="text" 
          placeholder="고객명" 
          value={form.customerName} 
          onChange={e => onUpdateField("customerName", e.target.value)} 
          className="flex-1 border rounded-lg px-3 py-2 outline-none" 
          required 
        />
        <select 
          value={form.paymentMethod} 
          onChange={e => onUpdateField("paymentMethod", e.target.value)} 
          className="border rounded-lg px-3 py-2 outline-none text-slate-700 bg-white"
        >
          <option value="카드결제">카드결제</option>
          <option value="무통장입금">무통장입금</option>
          <option value="현금">현금</option>
        </select>
        <input 
          type="text" 
          placeholder="결제금액 (예: 50,000원)" 
          value={form.amount} 
          onChange={e => onUpdateField("amount", e.target.value)} 
          className="flex-1 border rounded-lg px-3 py-2 outline-none" 
          required 
        />
        <input 
          type="text" 
          placeholder="연관 주문번호 (선택)" 
          value={form.orderId} 
          onChange={e => onUpdateField("orderId", e.target.value)} 
          className="flex-1 border rounded-lg px-3 py-2 outline-none" 
        />
        <button 
          type="submit" 
          className="bg-emerald-500 text-white px-4 py-2 rounded-lg hover:bg-emerald-600 flex items-center shrink-0 font-bold border-0 cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-1" /> 
          등록
        </button>
      </form>
    </div>
  );
}
