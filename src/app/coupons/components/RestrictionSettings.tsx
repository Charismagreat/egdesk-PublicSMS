import React from "react";
import { CouponRestriction } from "../types";

interface RestrictionSettingsProps {
  restrictions: CouponRestriction[];
  currentRestriction: CouponRestriction;
  setCurrentRestriction: React.Dispatch<React.SetStateAction<CouponRestriction>>;
  onAddRestriction: () => void;
  onRemoveRestriction: (index: number) => void;
}

export function RestrictionSettings({
  restrictions,
  currentRestriction,
  setCurrentRestriction,
  onAddRestriction,
  onRemoveRestriction
}: RestrictionSettingsProps) {
  return (
    <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50/50 p-4 rounded-xl">
      <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-1.5">
        <span>🛡️ 쿠폰 적용 및 제한 대상 설정 (선택)</span>
      </h3>
      
      <div className="flex flex-col sm:flex-row gap-3 items-end">
        <div className="w-full sm:w-1/4">
          <label className="block text-[10px] font-bold text-slate-500 mb-1">적용 방식</label>
          <select 
            value={currentRestriction.restriction_type}
            onChange={e => setCurrentRestriction({...currentRestriction, restriction_type: e.target.value as 'EXCLUDE' | 'INCLUDE'})}
            className="w-full border rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-red-500 bg-white font-semibold cursor-pointer text-slate-700"
          >
            <option value="EXCLUDE">할인 대상에서 제외 (Blacklist)</option>
            <option value="INCLUDE">할인 대상에만 허용 (Whitelist)</option>
          </select>
        </div>
        <div className="w-full sm:w-1/4">
          <label className="block text-[10px] font-bold text-slate-500 mb-1">제한 종류</label>
          <select 
            value={currentRestriction.target_type}
            onChange={e => setCurrentRestriction({...currentRestriction, target_type: e.target.value as 'PRODUCT' | 'CATEGORY'})}
            className="w-full border rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-red-500 bg-white font-semibold cursor-pointer text-slate-700"
          >
            <option value="PRODUCT">개별 상품 ID</option>
            <option value="CATEGORY">상품 카테고리명</option>
          </select>
        </div>
        <div className="w-full sm:flex-1">
          <label className="block text-[10px] font-bold text-slate-500 mb-1">대상 식별 값 (상품 ID 또는 카테고리명)</label>
          <input 
            type="text"
            placeholder={currentRestriction.target_type === 'PRODUCT' ? "예: prod-123" : "예: 테이블용"}
            value={currentRestriction.target_value}
            onChange={e => setCurrentRestriction({...currentRestriction, target_value: e.target.value})}
            className="w-full border rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-red-500 bg-white text-slate-800"
          />
        </div>
        <button 
          type="button"
          onClick={onAddRestriction}
          className="w-full sm:w-auto bg-slate-700 hover:bg-slate-600 text-white font-bold px-5 py-2 rounded-lg text-xs transition-all cursor-pointer whitespace-nowrap h-8 border-0"
        >
          조건 추가
        </button>
      </div>
      
      {/* 추가된 제한 리스트 뱃지 */}
      {restrictions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {restrictions.map((res, index) => (
            <span 
              key={index} 
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${
                res.restriction_type === 'EXCLUDE' 
                  ? 'bg-red-50 text-red-700 border-red-100' 
                  : 'bg-indigo-50 text-indigo-700 border-indigo-100'
              }`}
            >
              <span>{res.restriction_type === 'EXCLUDE' ? '제외' : '허용'}</span>
              <span className="opacity-40">|</span>
              <span>{res.target_type === 'PRODUCT' ? '상품ID' : '카테고리'}: {res.target_value}</span>
              <button 
                type="button" 
                onClick={() => onRemoveRestriction(index)}
                className="ml-1 text-slate-400 hover:text-slate-600 font-bold bg-transparent border-0 cursor-pointer"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
