import React from "react";
import { X } from "lucide-react";
import { NewCustomerInput } from "../types";

interface AddCustomerModalProps {
  showAddModal: boolean;
  setShowAddModal: (show: boolean) => void;
  newCustomer: NewCustomerInput;
  setNewCustomer: (val: NewCustomerInput | ((prev: NewCustomerInput) => NewCustomerInput)) => void;
  handleAddCustomer: () => Promise<void>;
  isSubmitting: boolean;
}

export function AddCustomerModal({
  showAddModal,
  setShowAddModal,
  newCustomer,
  setNewCustomer,
  handleAddCustomer,
  isSubmitting
}: AddCustomerModalProps) {
  if (!showAddModal) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-6 w-[500px] shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h3 className="text-base font-black text-slate-800">신규 고객 등록</h3>
          <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer border-none bg-transparent">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">이름 *</label>
            <input 
              type="text" 
              value={newCustomer.name}
              onChange={e => setNewCustomer({...newCustomer, name: e.target.value})}
              placeholder="예: 홍길동"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold text-slate-800 bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">연락처 *</label>
            <input 
              type="text" 
              value={newCustomer.phone}
              onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})}
              placeholder="예: 010-1234-5678"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold text-slate-800 bg-white"
            />
          </div>
          <div className="flex space-x-2">
            <div className="flex-[2]">
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">고객 주소</label>
              <input 
                type="text" 
                value={newCustomer.address}
                onChange={e => setNewCustomer({...newCustomer, address: e.target.value})}
                placeholder="예: 서울특별시 강남구..."
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold text-slate-805 bg-white"
              />
            </div>
            <div className="flex-[3]">
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">그룹/태그</label>
              <input 
                type="text" 
                value={newCustomer.tags}
                onChange={e => setNewCustomer({...newCustomer, tags: e.target.value})}
                placeholder="예: VVIP, 신규회원"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold text-slate-805 bg-white"
              />
            </div>
          </div>
          
          <div className="pt-4 border-t border-slate-100 mt-2 mb-2">
            <h4 className="text-xs font-black text-blue-650 mb-3">배송지 정보 (선택)</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase">배송지 주소</label>
                <input 
                  type="text" 
                  value={newCustomer.shipping_address}
                  onChange={e => setNewCustomer({...newCustomer, shipping_address: e.target.value})}
                  placeholder="예: 경기도 성남시 분당구..."
                  className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-805 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
              <div className="flex space-x-2">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase">수령인명</label>
                  <input 
                    type="text" 
                    value={newCustomer.recipient_name}
                    onChange={e => setNewCustomer({...newCustomer, recipient_name: e.target.value})}
                    placeholder="예: 김배송"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-805 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase">수령인 연락처</label>
                  <input 
                    type="text" 
                    value={newCustomer.recipient_phone}
                    onChange={e => setNewCustomer({...newCustomer, recipient_phone: e.target.value})}
                    placeholder="예: 010-9999-8888"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-805 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2 mt-6">
          <button 
            onClick={() => setShowAddModal(false)} 
            className="px-4 py-2.5 rounded-xl text-slate-655 hover:bg-slate-100 font-extrabold text-xs cursor-pointer transition-colors border-none bg-transparent"
          >
            취소
          </button>
          <button 
            onClick={handleAddCustomer} 
            disabled={isSubmitting}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-slate-400 font-extrabold text-xs shadow-md transition-colors cursor-pointer border-none"
          >
            {isSubmitting ? "등록 중..." : "등록하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
