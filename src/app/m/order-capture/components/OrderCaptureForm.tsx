import React from "react";
import { Camera, Image as ImageIcon, Search, Loader2, Send } from "lucide-react";
import { CaptureForm } from "../types";

interface OrderCaptureFormProps {
  form: CaptureForm;
  setForm: React.Dispatch<React.SetStateAction<CaptureForm>>;
  preview: string | null;
  isUploading: boolean;
  isSubmitting: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeFile: () => void;
  onSearchCustomerClick: () => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}

export function OrderCaptureForm({
  form,
  setForm,
  preview,
  isUploading,
  isSubmitting,
  fileInputRef,
  handleFileChange,
  removeFile,
  onSearchCustomerClick,
  onSubmit
}: OrderCaptureFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      
      {/* Image Uploader */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center">
          <ImageIcon className="w-4 h-4 mr-1 text-blue-500" /> 증빙 캡처 첨부 (필수)
        </h3>
        
        {!preview ? (
          <div 
            className="border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 transition-colors rounded-xl h-48 flex flex-col items-center justify-center cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-14 h-14 bg-white rounded-full shadow-sm flex items-center justify-center mb-3">
              <Camera className="w-6 h-6 text-blue-500" />
            </div>
            <span className="text-slate-500 font-semibold text-sm">여기를 눌러 캡처/사진 선택</span>
            <span className="text-xs text-slate-400 mt-1">카카오톡, 문자, 통화녹음 내역</span>
          </div>
        ) : (
          <div className="relative rounded-xl overflow-hidden border border-slate-200">
            <img src={preview} alt="미리보기" className="w-full h-auto max-h-64 object-contain bg-slate-900 mx-auto" />
            <button 
              type="button"
              onClick={removeFile}
              className="absolute top-2 right-2 bg-black/60 text-white text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-sm border-0 cursor-pointer"
            >
              삭제
            </button>
          </div>
        )}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/*" 
          className="hidden" 
        />
      </div>

      {/* Input Form */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-sm font-bold text-slate-700">고객명 *</label>
            <button
              type="button"
              onClick={onSearchCustomerClick}
              className="text-[11px] bg-blue-50 text-blue-600 hover:bg-blue-100 font-extrabold px-2.5 py-1.5 rounded-lg flex items-center gap-1 border border-blue-200/60 transition-colors cursor-pointer"
            >
              <Search className="w-3 h-3 text-blue-500 shrink-0" />
              <span>단골 검색</span>
            </button>
          </div>
          <input 
            type="text" 
            required
            placeholder="예: 홍길동"
            value={form.customerName}
            onChange={e => setForm({ ...form, customerName: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-lg font-medium text-slate-800"
          />
        </div>
        
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">연락처 *</label>
          <input 
            type="tel" 
            required
            placeholder="예: 010-1234-5678"
            value={form.customerPhone}
            onChange={e => setForm({ ...form, customerPhone: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-lg font-medium text-slate-800"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">상담 메모 (상품/내용)</label>
          <textarea 
            placeholder="간단한 메모를 남겨주세요."
            rows={2}
            value={form.productName}
            onChange={e => setForm({ ...form, productName: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all resize-none text-slate-800 text-sm font-semibold"
          />
        </div>

        <div className="pt-2 border-t border-slate-100">
          <label className="block text-sm font-bold text-slate-700 mb-2">접수 상태 처리</label>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <label className={`flex-1 text-center py-2.5 rounded-lg text-sm font-bold cursor-pointer transition-colors ${form.status === '접수완료' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>
              <input 
                type="radio" 
                name="status" 
                value="접수완료" 
                checked={form.status === '접수완료'} 
                onChange={e => setForm({ ...form, status: e.target.value })} 
                className="sr-only" 
              />
              바로 접수
            </label>
            <label className={`flex-1 text-center py-2.5 rounded-lg text-sm font-bold cursor-pointer transition-colors ${form.status === '견적요청' ? 'bg-amber-100 text-amber-700 shadow-sm' : 'text-slate-500'}`}>
              <input 
                type="radio" 
                name="status" 
                value="견적요청" 
                checked={form.status === '견적요청'} 
                onChange={e => setForm({ ...form, status: e.target.value })} 
                className="sr-only" 
              />
              견적 요청
            </label>
          </div>
        </div>
      </div>

      {/* Sticky Submit Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-slate-200 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
        <button 
          type="submit" 
          disabled={isSubmitting}
          className={`w-full max-w-lg mx-auto flex items-center justify-center py-4 rounded-xl font-bold text-lg text-white transition-all shadow-lg border-0 cursor-pointer ${
            isSubmitting ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
          }`}
        >
          {isSubmitting ? (
            <><Loader2 className="w-6 h-6 mr-2 animate-spin" /> {isUploading ? '업로드 중...' : '접수 중...'}</>
          ) : (
            <><Send className="w-5 h-5 mr-2" /> 증빙과 함께 접수하기</>
          )}
        </button>
      </div>
    </form>
  );
}
