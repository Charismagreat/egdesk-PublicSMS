"use client";

import React from "react";
import { X, Pencil, Plus } from "lucide-react";
import { ProductForm } from "../types";

interface ProductFormSectionProps {
  form: ProductForm;
  setForm: React.Dispatch<React.SetStateAction<ProductForm>>;
  editTargetId: string | null;
  isUploading: boolean;
  existingCategories: string[];
  onCancelEdit: () => void;
  onSaveProduct: (e: React.FormEvent) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>, field: 'main_image_url' | 'detail_image_url') => void;
}

export function ProductFormSection({
  form,
  setForm,
  editTargetId,
  isUploading,
  existingCategories,
  onCancelEdit,
  onSaveProduct,
  onFileUpload
}: ProductFormSectionProps) {
  return (
    <div className="pt-2 pb-4 w-full text-slate-800">
      <div className={`bg-white p-6 rounded-2xl shadow-md border ${
        editTargetId ? 'border-blue-300 ring-4 ring-blue-50' : 'border-slate-100'
      }`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-700">{editTargetId ? '상품 수정' : '새 상품 등록'}</h2>
          {editTargetId && (
            <button 
              type="button"
              onClick={onCancelEdit} 
              className="text-sm text-slate-500 hover:text-slate-800 flex items-center bg-slate-100 px-3 py-1 rounded-lg border-0 cursor-pointer"
            >
              <X className="w-4 h-4 mr-1"/> 취소
            </button>
          )}
        </div>
        <form onSubmit={onSaveProduct} className="flex flex-col gap-3">
          <div className="flex flex-col md:flex-row gap-3">
            <input 
              type="text" 
              placeholder="상품명 (예: 24년형 스마트 TV)" 
              value={form.name} 
              onChange={e => setForm(prev => ({...prev, name: e.target.value}))} 
              className="flex-[2] border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-pink-500 font-semibold text-sm" 
              required
            />
            <div className="flex-[1] flex items-center gap-2 border rounded-lg px-3 py-2 bg-white">
              <input 
                type="text" 
                placeholder="가격 (예: 850,000원)" 
                value={form.price} 
                onChange={e => setForm(prev => ({...prev, price: e.target.value}))} 
                disabled={form.isPriceTbd}
                className="w-full outline-none disabled:bg-slate-50 disabled:text-slate-400 font-semibold text-sm border-0" 
              />
              <label className="flex items-center space-x-1 whitespace-nowrap text-xs text-slate-600 font-bold cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={form.isPriceTbd} 
                  onChange={e => setForm(prev => ({
                    ...prev, 
                    isPriceTbd: e.target.checked, 
                    price: e.target.checked ? '' : prev.price
                  }))} 
                  className="rounded text-pink-500 focus:ring-pink-500" 
                />
                <span>상담후결정</span>
              </label>
            </div>
            <select 
              value={form.category}
              onChange={e => setForm(prev => ({...prev, category: e.target.value}))}
              className="w-32 border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-pink-500 bg-white font-semibold text-sm"
            >
              <option value="스토어용">스토어용</option>
              <option value="테이블용">테이블용</option>
              <option value="예약용">예약용</option>
            </select>
            <div className="flex-1">
              <input 
                type="text" 
                list="category-options"
                placeholder="카테고리 (예: 가전)" 
                value={form.menu_category} 
                onChange={e => setForm(prev => ({...prev, menu_category: e.target.value}))} 
                className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-pink-500 font-semibold text-sm" 
              />
              <datalist id="category-options">
                {existingCategories.map((cat, idx) => (
                  <option key={idx} value={cat} />
                ))}
              </datalist>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <textarea 
              placeholder="상세 설명 문구를 입력하세요 (엔터를 치면 줄바꿈이 됩니다)" 
              value={form.description} 
              onChange={e => setForm(prev => ({...prev, description: e.target.value}))} 
              className="w-full border rounded-lg px-3 py-3 outline-none focus:ring-2 focus:ring-pink-500 min-h-[100px] resize-y font-semibold text-xs" 
            />
          </div>
          <div className="flex flex-col md:flex-row gap-3 w-full">
            <div className="flex-1 flex flex-col justify-center min-w-0">
              <input 
                type="text" 
                placeholder="쇼핑몰 URL (선택)" 
                value={form.url} 
                onChange={e => setForm(prev => ({...prev, url: e.target.value}))} 
                className="w-full h-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-pink-500 min-h-[58px] font-semibold text-xs" 
              />
            </div>
            <label className="flex-1 border rounded-lg px-3 py-2 flex flex-col bg-white relative justify-center min-h-[58px] min-w-0 cursor-pointer hover:bg-slate-50 transition-colors group">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-slate-700">대표이미지 <span className="text-[10px] font-normal text-slate-400 ml-0.5 hidden 2xl:inline">(600x600)</span></span>
                {form.main_image_url && <span className="text-[10px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded">등록됨</span>}
              </div>
              <input 
                type="file" 
                accept="image/*"
                onChange={e => onFileUpload(e, 'main_image_url')}
                className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:font-semibold file:bg-pink-50 file:text-pink-700 group-hover:file:bg-pink-100 cursor-pointer" 
              />
            </label>
            <label className="flex-1 border rounded-lg px-3 py-2 flex flex-col bg-white relative justify-center min-h-[58px] min-w-0 cursor-pointer hover:bg-slate-50 transition-colors group">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-slate-700">상세이미지 <span className="text-[10px] font-normal text-slate-400 ml-0.5 hidden 2xl:inline">(가로 800px↑)</span></span>
                {form.detail_image_url && <span className="text-[10px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded">등록됨</span>}
              </div>
              <input 
                type="file" 
                accept="image/*"
                onChange={e => onFileUpload(e, 'detail_image_url')}
                className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:font-semibold file:bg-blue-50 file:text-blue-700 group-hover:file:bg-blue-100 cursor-pointer" 
              />
            </label>
            <div className="flex-[1.2] border rounded-lg px-3 py-2 flex flex-col bg-white justify-center min-h-[58px] min-w-0">
              <span className="text-sm font-semibold text-slate-700 mb-1">수령 방식</span>
              <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
                {['매장에서', '가져가기', '배달', '배송'].map(method => (
                  <label key={method} className="flex items-center space-x-1 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={form.available_methods.includes(method)}
                      onChange={(e) => {
                        const newMethods = e.target.checked 
                          ? [...form.available_methods, method] 
                          : form.available_methods.filter(m => m !== method);
                        setForm(prev => ({...prev, available_methods: newMethods}));
                      }}
                      className="rounded text-pink-500 focus:ring-pink-500 w-3 h-3"
                    />
                    <span className="text-xs text-slate-600 font-bold whitespace-nowrap">{method}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isUploading} 
            className={`w-full text-white font-bold py-3 rounded-lg transition flex items-center justify-center border-0 cursor-pointer ${
              isUploading 
                ? 'bg-slate-400 cursor-not-allowed' 
                : editTargetId 
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : 'bg-slate-800 hover:bg-slate-700'
            }`}
          >
            {isUploading ? (
              '이미지 업로드 중...'
            ) : editTargetId ? (
              <><Pencil className="w-4 h-4 mr-1"/> 수정 완료</>
            ) : (
              <><Plus className="w-4 h-4 mr-1"/> 등록</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
