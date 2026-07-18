import React from "react";
import { X, User, Search } from "lucide-react";
import { Customer } from "../types";

interface CustomerSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  customers: Customer[];
  onSelectCustomer: (name: string, phone: string) => void;
}

export function CustomerSearchModal({
  isOpen,
  onClose,
  searchTerm,
  setSearchTerm,
  customers,
  onSelectCustomer
}: CustomerSearchModalProps) {
  if (!isOpen) return null;

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.replace(/[^0-9]/g, '').includes(searchTerm.replace(/[^0-9]/g, ''))
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl relative overflow-hidden flex flex-col max-h-[80vh] border border-slate-100 animate-scale-up">
        
        {/* 모달 헤더 */}
        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
            <User className="w-4 h-4 text-blue-500" />
            <span>단골 고객 실시간 매핑</span>
          </h3>
          <button 
            type="button" 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 border-0 bg-transparent cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 모달 검색바 */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2 flex-row focus-within:border-blue-500 transition-colors">
            <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
            <input 
              type="text"
              placeholder="고객 이름 또는 휴대폰 번호 검색..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-transparent outline-none text-xs font-semibold text-slate-800 placeholder-slate-400"
            />
            {searchTerm && (
              <button 
                type="button"
                onClick={() => setSearchTerm("")}
                className="p-0.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 shrink-0 ml-1 transition-colors border-0 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* 고객 리스트 바디 */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400 font-bold">
              일치하는 단골 고객이 없습니다.
            </div>
          ) : (
            filteredCustomers.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelectCustomer(c.name, c.phone)}
                className="w-full text-left p-3.5 hover:bg-blue-50/50 rounded-xl flex items-center justify-between border-0 bg-transparent cursor-pointer transition-colors group"
              >
                <div className="space-y-0.5">
                  <span className="font-bold text-xs text-slate-800 group-hover:text-blue-600 transition-colors">{c.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono block">{c.phone}</span>
                </div>
                {c.tags && (
                  <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">
                    {c.tags.split(',')[0]}
                  </span>
                )}
              </button>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
