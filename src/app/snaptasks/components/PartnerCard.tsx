import React from "react";
import { Building2, FileText } from "lucide-react";
import { Partner, PartnerContact } from "../types";

interface PartnerCardProps {
  detailLoading: boolean;
  partner: Partner | null;
  partnerContacts: PartnerContact[];
}

export function PartnerCard({ detailLoading, partner, partnerContacts }: PartnerCardProps) {
  return (
    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col overflow-hidden max-h-[45%]">
      <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider block mb-3 flex items-center gap-1.5">
        <Building2 className="w-3.5 h-3.5 text-indigo-500" />
        B2B 파트너 및 소속 담당자 명함첩
      </h4>

      {detailLoading ? (
        <p className="text-center py-6 text-xs text-slate-400">파트너 마이닝 중...</p>
      ) : !partner ? (
        <div className="flex-1 flex items-center justify-center border border-dashed border-slate-200 rounded-xl p-4 text-center">
          <p className="text-[11px] text-slate-450 font-bold leading-normal">
            아직 연동된 B2B 거래처 정보가 없습니다.
            <br />
            명함 스냅 시 AI가 거래처를 실시간 자동 개설합니다.
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden space-y-3 font-semibold text-xs text-slate-700">
          {/* 파트너 회사 마스터 정보 */}
          <div className="bg-white p-3 border border-slate-100 rounded-xl space-y-1.5 shadow-sm">
            <div className="flex justify-between items-center">
              <span className="font-extrabold text-sm text-indigo-600 truncate">{partner.company_name}</span>
              <span className="text-[9px] font-bold text-slate-400 font-mono">{partner.business_number}</span>
            </div>
            <div className="text-[10px] text-slate-500 space-y-0.5 leading-tight">
              <p>📍 {partner.address || "주소 등록 안 됨"}</p>
              <p>📞 {partner.phone || "대표 연락처 없음"}</p>
            </div>
          </div>

          {/* 다중 담당자 리스트 */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
              소속 담당자 명함첩 ({partnerContacts.length}명)
            </span>

            <div className="flex-1 overflow-y-auto pr-1 space-y-2">
              {partnerContacts.length === 0 ? (
                <p className="text-center py-4 text-[10px] text-slate-400 font-bold">등록된 담당자가 없습니다.</p>
              ) : (
                partnerContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className={`p-2.5 rounded-xl border flex items-start gap-2.5 transition-all shadow-sm ${
                      contact.is_primary === 1
                        ? "bg-gradient-to-r from-indigo-50/50 to-indigo-100/10 border-indigo-500/20"
                        : "bg-white border-slate-100"
                    }`}
                  >
                    {/* 담당자 명함 또는 기본 아바타 아이콘 */}
                    {contact.card_image_url ? (
                      <a href={contact.card_image_url} target="_blank" rel="noreferrer" className="block shrink-0">
                        <img
                          src={contact.card_image_url}
                          className="w-9 h-9 object-cover rounded-lg border border-slate-200"
                          alt="Card"
                        />
                      </a>
                    ) : (
                      <div className="w-9 h-9 bg-slate-100 rounded-lg shrink-0 flex items-center justify-center text-slate-450 border">
                        <FileText className="w-4 h-4" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0 space-y-0.5 text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-slate-800 truncate">{contact.name}</span>
                        {contact.position && (
                          <span className="text-[9px] text-slate-500 font-medium truncate">{contact.position}</span>
                        )}
                        {contact.is_primary === 1 && (
                          <span className="text-[8px] bg-indigo-500 text-white px-1.5 py-0.2 rounded font-black shrink-0">
                            대표
                          </span>
                        )}
                      </div>
                      <div className="text-slate-500 font-mono space-y-0.2">
                        {contact.phone && <p>📞 {contact.phone}</p>}
                        {contact.email && <p>📧 {contact.email}</p>}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
