import React from "react";
import { Plus } from "lucide-react";

interface TransactionFormSectionProps {
  newName: string;
  setNewName: (val: string) => void;
  newPhone: string;
  setNewPhone: (val: string) => void;
  newProduct: string;
  setNewProduct: (val: string) => void;
  newAmount: string;
  setNewAmount: (val: string) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}

export function TransactionFormSection({
  newName,
  setNewName,
  newPhone,
  setNewPhone,
  newProduct,
  setNewProduct,
  newAmount,
  setNewAmount,
  onSubmit
}: TransactionFormSectionProps) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
      <h2 className="text-lg font-bold text-slate-800 mb-4">새 거래 등록</h2>
      <form onSubmit={onSubmit} className="flex space-x-3">
        <input 
          type="text" 
          placeholder="고객명" 
          value={newName} 
          onChange={e => setNewName(e.target.value)} 
          className="flex-1 border rounded-lg px-3 py-2 outline-none focus:border-orange-500 bg-slate-50 text-slate-800 text-sm focus:bg-white transition-colors" 
          required
        />
        <input 
          type="text" 
          placeholder="연락처 (010...)" 
          value={newPhone} 
          onChange={e => setNewPhone(e.target.value)} 
          className="flex-1 border rounded-lg px-3 py-2 outline-none focus:border-orange-500 bg-slate-50 text-slate-800 text-sm focus:bg-white transition-colors" 
          required
        />
        <input 
          type="text" 
          placeholder="상품명" 
          value={newProduct} 
          onChange={e => setNewProduct(e.target.value)} 
          className="flex-1 border rounded-lg px-3 py-2 outline-none focus:border-orange-500 bg-slate-50 text-slate-800 text-sm focus:bg-white transition-colors" 
          required
        />
        <input 
          type="text" 
          placeholder="금액" 
          value={newAmount} 
          onChange={e => setNewAmount(e.target.value)} 
          className="w-32 border rounded-lg px-3 py-2 outline-none focus:border-orange-500 bg-slate-50 text-slate-800 text-sm focus:bg-white transition-colors" 
        />
        <button 
          type="submit" 
          className="bg-orange-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-600 active:bg-orange-700 flex items-center border-0 cursor-pointer transition-colors shrink-0"
        >
          <Plus className="w-4 h-4 mr-1" /> 등록
        </button>
      </form>
    </div>
  );
}
