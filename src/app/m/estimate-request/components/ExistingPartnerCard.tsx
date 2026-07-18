import React from "react";

interface ExistingPartnerCardProps {
  partnerName: string;
  representative: string;
  partnerPhone: string;
  email: string;
  address: string;
}

export function ExistingPartnerCard({
  partnerName,
  representative,
  partnerPhone,
  email,
  address
}: ExistingPartnerCardProps) {
  return (
    <div className="bg-slate-150/40 border border-slate-200/55 p-4.5 rounded-3xl space-y-3 font-semibold text-slate-700 text-xs bg-slate-100">
      <span className="text-[9px] bg-slate-200 text-slate-500 font-black px-1.5 py-0.5 rounded uppercase block w-max mb-1">
        기존 회원 프로필
      </span>
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div> 상호: <span className="font-extrabold text-slate-900">{partnerName}</span></div>
        <div> 대표: <span className="font-bold text-slate-800">{representative || '미등록'}</span></div>
        <div> 번호: <span className="font-mono text-slate-800">{partnerPhone}</span></div>
        <div> 이메일: <span className="font-mono text-slate-800">{email || '미등록'}</span></div>
        <div className="col-span-2 border-t border-slate-200/40 pt-2 mt-1"> 
          주소: <span className="text-slate-650">{address || '소재지 미기재'}</span>
        </div>
      </div>
    </div>
  );
}
