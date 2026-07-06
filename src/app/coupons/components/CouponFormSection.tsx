import React from "react";
import { Percent, DollarSign } from "lucide-react";
import { CouponForm, IssueType } from "../types";

interface CouponFormSectionProps {
  issueType: IssueType;
  setIssueType: (type: IssueType) => void;
  form: CouponForm;
  setForm: React.Dispatch<React.SetStateAction<CouponForm>>;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  children?: React.ReactNode;
}

export function CouponFormSection({
  issueType,
  setIssueType,
  form,
  setForm,
  loading,
  onSubmit,
  children
}: CouponFormSectionProps) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-700">새 쿠폰 발행</h2>
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button 
            type="button"
            onClick={() => setIssueType('single')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors border-0 cursor-pointer ${
              issueType === 'single' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 bg-transparent'
            }`}
          >
            단건 지정 발행
          </button>
          <button 
            type="button"
            onClick={() => setIssueType('bulk')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors border-0 cursor-pointer ${
              issueType === 'bulk' ? 'bg-white text-red-650 shadow-sm' : 'text-slate-500 bg-transparent'
            }`}
          >
            대량 난수 발행
          </button>
        </div>
      </div>
      
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-4">
          {issueType === 'single' ? (
            <div className="flex-[1]">
              <label className="block text-xs font-bold text-slate-500 mb-1">쿠폰 코드 (영문/숫자)</label>
              <input 
                type="text" 
                placeholder="예: WELCOME2026" 
                value={form.code} 
                onChange={e => setForm({...form, code: e.target.value.toUpperCase()})} 
                className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-red-500 font-mono uppercase text-slate-800" 
              />
            </div>
          ) : (
            <div className="flex-[1] flex gap-2">
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-500 mb-1">접두사 (선택)</label>
                <input 
                  type="text" 
                  placeholder="예: SUM" 
                  value={form.prefix} 
                  onChange={e => setForm({...form, prefix: e.target.value.toUpperCase()})} 
                  className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-red-500 font-mono uppercase text-slate-800" 
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-500 mb-1">발행 수량 (개)</label>
                <input 
                  type="number" 
                  placeholder="100" 
                  value={form.count} 
                  onChange={e => setForm({...form, count: e.target.value})} 
                  className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-red-500 text-slate-850" 
                />
              </div>
            </div>
          )}
          <div className="flex-[2]">
            <label className="block text-xs font-bold text-slate-500 mb-1">고객에게 보일 쿠폰명</label>
            <input 
              type="text" 
              placeholder="예: 신규회원 가입 축하 5천원 쿠폰" 
              value={form.name} 
              onChange={e => setForm({...form, name: e.target.value})} 
              className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-red-500 text-slate-850" 
            />
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-[1]">
            <label className="block text-xs font-bold text-slate-500 mb-1">할인 방식</label>
            <select 
              value={form.discount_type}
              onChange={e => setForm({...form, discount_type: e.target.value})}
              className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-red-500 bg-white text-slate-750 font-medium"
            >
              <option value="amount">정액 할인 (원)</option>
              <option value="percent">정률 할인 (%)</option>
            </select>
          </div>
          <div className="flex-[1]">
            <label className="block text-xs font-bold text-slate-500 mb-1">할인 값</label>
            <div className="relative">
              <input 
                type="number" 
                placeholder={form.discount_type === 'percent' ? '예: 10' : '예: 5000'} 
                value={form.discount_value} 
                onChange={e => setForm({...form, discount_value: e.target.value})} 
                className="w-full border rounded-lg pl-10 pr-3 py-2 outline-none focus:ring-2 focus:ring-red-500 text-slate-850" 
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                {form.discount_type === 'percent' ? <Percent className="w-4 h-4"/> : <DollarSign className="w-4 h-4"/>}
              </div>
            </div>
          </div>
          <div className="flex-[1]">
            <label className="block text-xs font-bold text-slate-500 mb-1">최소 주문 금액 (0=제한없음)</label>
            <input 
              type="number" 
              placeholder="예: 30000" 
              value={form.min_order_amount} 
              onChange={e => setForm({...form, min_order_amount: e.target.value})} 
              className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-red-500 text-slate-850" 
            />
          </div>
          <div className="flex-[1]">
            <label className="block text-xs font-bold text-slate-500 mb-1">유효기간 (지정하지 않을 시 무제한)</label>
            <input 
              type="date" 
              value={form.expires_at} 
              onChange={e => setForm({...form, expires_at: e.target.value})} 
              className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-red-500 text-slate-700 bg-white" 
            />
          </div>
        </div>
        
        {/* 쿠폰 적용 및 제한 대상 설정 / 발행 버튼이 담길 영역 */}
        {children}
      </form>
    </div>
  );
}
