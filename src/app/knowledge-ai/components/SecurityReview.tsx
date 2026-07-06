import React from "react";
import { ShieldAlert, Lock } from "lucide-react";
import { KnowledgeDocument } from "../types";

interface SecurityReviewProps {
  documents: KnowledgeDocument[];
  currentRole: "SUPER_ADMIN" | "PRESIDENT" | "SUB_OPERATOR";
  handleDowngradeSecurity: (docId: string, newLevel: "B" | "C") => void;
}

export function SecurityReview({
  documents,
  currentRole,
  handleDowngradeSecurity,
}: SecurityReviewProps) {
  if (currentRole !== "SUPER_ADMIN" && currentRole !== "PRESIDENT") return null;

  const secretDocuments = documents.filter((d) => d.security_level === "A");

  return (
    <section className="bg-gradient-to-r from-rose-50 to-slate-50 border border-rose-200 p-5 rounded-2xl mb-8 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <ShieldAlert className="w-5 h-5 text-rose-500 animate-pulse" />
        <h2 className="text-md font-bold text-rose-700">Zero-Trust 기밀 문서 등급 심사 피드 (최고관리자 전용)</h2>
        <span className="text-xs text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-200 font-semibold">
          최초 등록 시 A등급 강제 격리 상태
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {secretDocuments.map((doc) => (
          <div
            key={doc.document_id}
            className="bg-white border border-rose-100 hover:border-rose-300 p-4 rounded-xl flex flex-col justify-between shadow-sm transition-all group"
          >
            <div>
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] bg-rose-50 text-rose-600 px-2 py-0.5 rounded border border-rose-200 font-bold font-mono">
                  {doc.doc_type}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">{doc.created_at}</span>
              </div>
              <h3 className="text-sm font-bold text-slate-800 mb-2 truncate group-hover:text-rose-600 transition-colors">
                {doc.title}
              </h3>
              <p className="text-xs text-slate-500 line-clamp-2 mb-3 bg-slate-50 p-2 rounded border border-slate-100 font-mono">
                {doc.content.replace(/[#*`]/g, "")}
              </p>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
              <span className="text-xs text-rose-600 flex items-center gap-1 font-bold">
                <Lock className="w-3.5 h-3.5" /> 최고기밀(A)
              </span>

              {/* 등급 하향 심사 셀렉터 */}
              <div className="flex gap-1.5">
                <button
                  onClick={() => handleDowngradeSecurity(doc.document_id, "B")}
                  className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded text-[10px] font-bold transition-all"
                >
                  B (대외비)
                </button>
                <button
                  onClick={() => handleDowngradeSecurity(doc.document_id, "C")}
                  className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold transition-all"
                >
                  C (공개)
                </button>
              </div>
            </div>
          </div>
        ))}

        {secretDocuments.length === 0 && (
          <div className="col-span-full py-8 text-center text-slate-400 text-xs">
            🎉 심사 대기 중인 A등급 기밀 문서가 없습니다. 모든 지식 자산이 안전하게 정산/분류되었습니다.
          </div>
        )}
      </div>
    </section>
  );
}
