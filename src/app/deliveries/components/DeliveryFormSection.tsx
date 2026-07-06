import React from "react";
import { Plus } from "lucide-react";
import { DeliveryForm } from "../types";

interface DeliveryFormSectionProps {
  form: DeliveryForm;
  setForm: React.Dispatch<React.SetStateAction<DeliveryForm>>;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}

export function DeliveryFormSection({ form, setForm, onSubmit }: DeliveryFormSectionProps) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
      <h2 className="text-lg font-bold mb-4">새 배송 등록</h2>
      <form onSubmit={onSubmit} className="flex flex-col space-y-3">
        <div className="flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-3">
          <input 
            type="text" 
            placeholder="고객명" 
            value={form.customerName} 
            onChange={e => setForm({ ...form, customerName: e.target.value })} 
            className="flex-1 border rounded-lg px-3 py-2 outline-none text-slate-800 font-semibold" 
            required 
          />
          <input 
            type="text" 
            placeholder="연락처" 
            value={form.customerPhone} 
            onChange={e => setForm({ ...form, customerPhone: e.target.value })} 
            className="flex-1 border rounded-lg px-3 py-2 outline-none text-slate-800 font-semibold" 
            required 
          />
          <select 
            value={form.courier} 
            onChange={e => setForm({ ...form, courier: e.target.value })} 
            className="border rounded-lg px-3 py-2 outline-none text-slate-700 font-bold bg-white"
          >
            <option>대한통운</option>
            <option>우체국</option>
            <option>로젠택배</option>
            <option>한진택배</option>
          </select>
          <input 
            type="text" 
            placeholder="운송장번호" 
            value={form.trackingNumber} 
            onChange={e => setForm({ ...form, trackingNumber: e.target.value })} 
            className="flex-1 border rounded-lg px-3 py-2 outline-none text-slate-800 font-semibold" 
          />
        </div>
        <div className="flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-3">
          <input 
            type="text" 
            placeholder="배송지 주소" 
            value={form.address} 
            onChange={e => setForm({ ...form, address: e.target.value })} 
            className="flex-[3] border rounded-lg px-3 py-2 outline-none text-slate-800 font-semibold" 
            required 
          />
          <button 
            type="submit" 
            className="flex-1 bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 flex items-center justify-center font-bold border-0 cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4 mr-1"/> 배송 등록
          </button>
        </div>
      </form>
    </div>
  );
}
