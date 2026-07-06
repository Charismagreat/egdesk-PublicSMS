import React from "react";
import { Plus } from "lucide-react";
import { ReservationForm } from "../types";

interface ReservationFormSectionProps {
  form: ReservationForm;
  setForm: React.Dispatch<React.SetStateAction<ReservationForm>>;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}

export function ReservationFormSection({
  form,
  setForm,
  onSubmit
}: ReservationFormSectionProps) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
      <h2 className="text-lg font-bold mb-4">새 예약 등록</h2>
      <form onSubmit={onSubmit} className="flex space-x-3">
        <input 
          type="text" 
          placeholder="고객명" 
          value={form.customerName} 
          onChange={e => setForm({ ...form, customerName: e.target.value })} 
          className="flex-1 border rounded-lg px-3 py-2 outline-none bg-slate-50 text-slate-800 text-sm focus:bg-white focus:border-indigo-500 transition-colors" 
          required 
        />
        <input 
          type="text" 
          placeholder="연락처" 
          value={form.customerPhone} 
          onChange={e => setForm({ ...form, customerPhone: e.target.value })} 
          className="flex-1 border rounded-lg px-3 py-2 outline-none bg-slate-50 text-slate-800 text-sm focus:bg-white focus:border-indigo-500 transition-colors" 
          required 
        />
        <input 
          type="text" 
          placeholder="예약서비스" 
          value={form.serviceName} 
          onChange={e => setForm({ ...form, serviceName: e.target.value })} 
          className="flex-1 border rounded-lg px-3 py-2 outline-none bg-slate-50 text-slate-800 text-sm focus:bg-white focus:border-indigo-500 transition-colors" 
          required 
        />
        <input 
          type="date" 
          value={form.reservationDate} 
          onChange={e => setForm({ ...form, reservationDate: e.target.value })} 
          className="border rounded-lg px-3 py-2 outline-none bg-slate-50 text-slate-800 text-sm focus:bg-white focus:border-indigo-500 transition-colors cursor-pointer" 
        />
        <input 
          type="time" 
          value={form.reservationTime} 
          onChange={e => setForm({ ...form, reservationTime: e.target.value })} 
          className="border rounded-lg px-3 py-2 outline-none bg-slate-50 text-slate-800 text-sm focus:bg-white focus:border-indigo-500 transition-colors cursor-pointer" 
        />
        <button 
          type="submit"
          className="bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600 active:bg-indigo-700 flex items-center font-bold border-0 cursor-pointer transition-colors shrink-0"
        >
          <Plus className="w-4 h-4 mr-1" /> 등록
        </button>
      </form>
    </div>
  );
}
