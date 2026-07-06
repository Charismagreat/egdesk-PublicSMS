import React from "react";
import { Plus } from "lucide-react";
import { OrderForm as OrderFormType } from "../types";

interface OrderFormProps {
  form: OrderFormType;
  setForm: React.Dispatch<React.SetStateAction<OrderFormType>>;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}

export function OrderForm({ form, setForm, onSubmit }: OrderFormProps) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
      <h2 className="text-lg font-bold mb-4">새 주문 등록</h2>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <input 
            type="text" 
            placeholder="고객명" 
            value={form.customerName} 
            onChange={e => setForm({ ...form, customerName: e.target.value })} 
            className="flex-1 border rounded-lg px-3 py-2 outline-none text-slate-800 font-medium" 
            required 
          />
          <input 
            type="text" 
            placeholder="연락처 (010...)" 
            value={form.customerPhone} 
            onChange={e => setForm({ ...form, customerPhone: e.target.value })} 
            className="flex-1 border rounded-lg px-3 py-2 outline-none text-slate-800 font-medium" 
            required 
          />
          <input 
            type="text" 
            placeholder="상품명" 
            value={form.productName} 
            onChange={e => setForm({ ...form, productName: e.target.value })} 
            className="flex-1 border rounded-lg px-3 py-2 outline-none text-slate-800 font-medium" 
            required 
          />
          <input 
            type="number" 
            placeholder="수량" 
            value={form.quantity} 
            onChange={e => setForm({ ...form, quantity: e.target.value })} 
            className="w-20 border rounded-lg px-3 py-2 outline-none text-right text-slate-800 font-medium" 
          />
          <input 
            type="text" 
            placeholder="결제금액 (예: 50000)" 
            value={form.totalPrice} 
            onChange={e => setForm({ ...form, totalPrice: e.target.value })} 
            className="w-32 border rounded-lg px-3 py-2 outline-none text-right text-slate-800 font-medium" 
          />
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <select 
            value={form.deliveryMethod} 
            onChange={e => setForm({ ...form, deliveryMethod: e.target.value })} 
            className="border rounded-lg px-3 py-2 outline-none w-40 text-slate-700 font-semibold bg-white"
          >
            <option value="택배배송">택배배송</option>
            <option value="자체배달">자체배달</option>
            <option value="방문픽업">방문픽업</option>
            <option value="현장판매">현장판매</option>
          </select>
          {(form.deliveryMethod === '택배배송' || form.deliveryMethod === '자체배달') && (
            <input 
              type="text" 
              placeholder="배송지 주소" 
              value={form.shippingAddress} 
              onChange={e => setForm({ ...form, shippingAddress: e.target.value })} 
              className="flex-1 border rounded-lg px-3 py-2 outline-none text-slate-800 font-medium" 
            />
          )}
          <button 
            type="submit" 
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 flex items-center font-bold border-0 cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4 mr-1"/> 등록하기
          </button>
        </div>
      </form>
    </div>
  );
}
