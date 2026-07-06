import React from "react";
import { Layers } from "lucide-react";
import { KnowledgeDocument } from "../types";

// UTC 시간 문자열을 한국 표준시(KST, UTC+9) 형식으로 포맷팅하는 헬퍼 함수
function formatToKST(dateStr: string, isShort = false): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;

    // UTC 시간을 KST(UTC+9)로 오프셋 보정
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstDate = new Date(d.getTime() + kstOffset);

    const year = kstDate.getUTCFullYear();
    const month = String(kstDate.getUTCMonth() + 1).padStart(2, "0");
    const day = String(kstDate.getUTCDate()).padStart(2, "0");
    const hour = String(kstDate.getUTCHours()).padStart(2, "0");
    const minute = String(kstDate.getUTCMinutes()).padStart(2, "0");
    const second = String(kstDate.getUTCSeconds()).padStart(2, "0");

    if (isShort) {
      return `${month}-${day} ${hour}:${minute}`;
    }
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  } catch (e) {
    return dateStr;
  }
}

interface AssetListProps {
  isLoading: boolean;
  documents: KnowledgeDocument[];
  selectedDoc: KnowledgeDocument | null;
  setSelectedDoc: (doc: KnowledgeDocument) => void;
}

export function AssetList({ isLoading, documents, selectedDoc, setSelectedDoc }: AssetListProps) {
  return (
    <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col max-h-[480px]">
      <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4">
        <Layers className="w-4.5 h-4.5 text-blue-500" />
        사내 지식 자산 리스트
      </h2>

      <div className="overflow-y-auto space-y-3 flex-1 pr-1 scrollbar-thin">
        {isLoading ? (
          <div className="text-center py-8 text-slate-400 text-xs">데이터 로딩 중...</div>
        ) : (
          documents.map((doc) => (
            <div
              key={doc.document_id}
              onClick={() => setSelectedDoc(doc)}
              className={`border p-3.5 rounded-xl cursor-pointer transition-all flex items-start justify-between gap-3 ${
                selectedDoc?.document_id === doc.document_id
                  ? "bg-blue-50/40 border-blue-500 shadow-sm"
                  : "bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300"
              }`}
            >
              <div className="min-w-0 flex-1 font-mono">
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold border ${
                      doc.security_level === "A"
                        ? "bg-rose-50 text-rose-600 border-rose-200"
                        : doc.security_level === "B"
                        ? "bg-amber-50 text-amber-600 border-amber-200"
                        : "bg-emerald-50 text-emerald-600 border-emerald-200"
                    }`}
                  >
                    {doc.security_level === "A" ? "🔒 A기밀" : doc.security_level === "B" ? "🔑 B대외비" : "🌐 C공개"}
                  </span>
                  <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 truncate max-w-[80px]">
                    {doc.doc_type}
                  </span>
                </div>
                <h3 className="text-xs font-bold text-slate-800 truncate font-sans">{doc.title}</h3>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 font-mono">
                  <span>{doc.creator_id}</span>
                  <span>{formatToKST(doc.created_at, true)}</span>
                </div>
              </div>

              <div className="flex flex-col items-end justify-between self-stretch font-mono">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-sans ${
                    doc.status === "APPROVED_AUTO"
                      ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                      : doc.status === "APPROVED_MANUAL"
                      ? "bg-cyan-50 text-cyan-600 border border-cyan-200"
                      : doc.status === "REJECTED"
                      ? "bg-rose-50 text-rose-600 border-rose-200"
                      : "bg-yellow-50 text-yellow-600 border border-yellow-200"
                  }`}
                >
                  {doc.status === "APPROVED_AUTO"
                    ? "자동전결"
                    : doc.status === "APPROVED_MANUAL"
                    ? "수동승인"
                    : doc.status === "REJECTED"
                    ? "반려됨"
                    : "결재중"}
                </span>
                {doc.autopilot_score > 0 && (
                  <span className="text-[10px] text-blue-600 font-bold">{doc.autopilot_score}p</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
