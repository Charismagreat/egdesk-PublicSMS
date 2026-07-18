import React from "react";

interface NewPartnerFormProps {
  partnerName: string;
  setPartnerName: (val: string) => void;
  partnerPhone: string;
  setPartnerPhone: (val: string) => void;
  representative: string;
  setRepresentative: (val: string) => void;
  email: string;
  setEmail: (val: string) => void;
  address: string;
  setAddress: (val: string) => void;
  uploading: boolean;
  licenseFileUrl: string;
  ocrScanning: boolean;
  ocrSuccessMsg: string;
  onLicenseUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function NewPartnerForm({
  partnerName,
  setPartnerName,
  partnerPhone,
  setPartnerPhone,
  representative,
  setRepresentative,
  email,
  setEmail,
  address,
  setAddress,
  uploading,
  licenseFileUrl,
  ocrScanning,
  ocrSuccessMsg,
  onLicenseUpload
}: NewPartnerFormProps) {
  return (
    <div className="bg-white border border-indigo-100/50 p-5 rounded-3xl shadow-md space-y-5 animate-slide-down">
      
      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
        <span className="text-[11px] font-black text-indigo-500 uppercase tracking-widest">
          B2B 신규 거래처 등록 서식
        </span>
        <span className="text-[9px] bg-indigo-50 text-indigo-500 font-black px-1.5 py-0.5 rounded uppercase">
          First Time
        </span>
      </div>

      {/* A. 사업자등록증 이미지/PDF 파일 첨부 컴포넌트 */}
      <div className="space-y-2">
        <label className="text-[10px] text-slate-400 font-bold block">사업자등록증 사본 첨부 (필수) *</label>
        
        <div className="relative">
          <input 
            type="file"
            id="licenseFile"
            accept="image/jpeg,image/png,image/jpg,image/webp,application/pdf"
            onChange={onLicenseUpload}
            disabled={uploading}
            className="hidden"
          />
          <label 
            htmlFor="licenseFile"
            className={`w-full border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all ${
              licenseFileUrl ? 'border-emerald-500 bg-emerald-50/10' : 'border-slate-200 bg-slate-50/50 hover:border-indigo-500'
            }`}
          >
            {ocrScanning ? (
              <div className="flex flex-col items-center space-y-2 py-2">
                <div className="w-6 h-6 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-[10px] font-bold text-indigo-600 animate-pulse">Vision AI가 사업자등록증 판독 중...</span>
              </div>
            ) : licenseFileUrl ? (
              <div className="text-center space-y-1.5 py-2">
                <span className="text-xs font-black text-emerald-600 block">✓ 사업자등록증 첨부 완료</span>
                <span className="text-[9px] text-slate-400 block font-mono truncate max-w-xs">{licenseFileUrl.split('/').pop()}</span>
              </div>
            ) : (
              <div className="text-center space-y-1 py-1">
                <span className="text-xs font-bold text-slate-700 block">여기를 눌러 파일 업로드</span>
                <span className="text-[10px] text-slate-400 block">JPG, PNG, WEBP, PDF 지원 (최대 10MB)</span>
              </div>
            )}
          </label>
        </div>

        {ocrSuccessMsg && (
          <div className="p-3 bg-gradient-to-r from-emerald-50 to-indigo-50 border border-emerald-100 rounded-xl text-[10px] font-bold text-slate-700 leading-relaxed">
            🚀 {ocrSuccessMsg}
          </div>
        )}
      </div>

      {/* B. 직접 입력 폼 */}
      <div className="space-y-4 pt-1">
        <div>
          <label className="text-[10px] text-slate-400 font-bold block mb-1">상호명 (회사명) *</label>
          <input 
            type="text"
            placeholder="예: 주식회사 에이치컴퍼니"
            value={partnerName}
            onChange={e => setPartnerName(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 focus:border-indigo-500 rounded-xl outline-none text-xs font-bold transition-all"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-slate-400 font-bold block mb-1">대표자 성함 *</label>
            <input 
              type="text"
              placeholder="대표명"
              value={representative}
              onChange={e => setRepresentative(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 focus:border-indigo-500 rounded-xl outline-none text-xs font-bold transition-all"
              required
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 font-bold block mb-1">대표 연락처 *</label>
            <input 
              type="tel"
              placeholder="010-0000-0000"
              value={partnerPhone}
              onChange={e => setPartnerPhone(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 focus:border-indigo-500 rounded-xl outline-none text-xs font-bold transition-all"
              required
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] text-slate-400 font-bold block mb-1">계산서 수령 이메일 *</label>
          <input 
            type="email"
            placeholder="tax@company.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 focus:border-indigo-500 rounded-xl outline-none text-xs font-bold transition-all"
            required
          />
        </div>

        <div>
          <label className="text-[10px] text-slate-400 font-bold block mb-1">사업장 주소 *</label>
          <input 
            type="text"
            placeholder="사업자등록증 상의 상세 소재지 주소"
            value={address}
            onChange={e => setAddress(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 focus:border-indigo-500 rounded-xl outline-none text-xs font-bold transition-all"
            required
          />
        </div>
      </div>

    </div>
  );
}
