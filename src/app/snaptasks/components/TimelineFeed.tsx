import React from "react";
import { FileText } from "lucide-react";
import { TimelineItem } from "../types";

interface TimelineFeedProps {
  detailLoading: boolean;
  timeline: TimelineItem[];
}

export function TimelineFeed({ detailLoading, timeline }: TimelineFeedProps) {
  return (
    <div className="flex-1 overflow-y-auto pr-1 space-y-4">
      {detailLoading ? (
        <p className="text-center py-10 text-xs text-slate-400">스냅 데이터 디코딩 중...</p>
      ) : timeline.length === 0 ? (
        <p className="text-center py-10 text-xs text-slate-400">등록된 스냅 기록이 없습니다.</p>
      ) : (
        timeline.map((item) => {
          let aiObj: any = null;
          try {
            if (item.ai_analysis) aiObj = JSON.parse(item.ai_analysis);
          } catch (e) {}

          return (
            <div key={item.id} className="border-b border-slate-50 pb-4 space-y-2 font-semibold text-xs">
              <div className="flex items-center justify-between text-[9px] font-bold text-slate-400">
                <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{item.file_type} 스냅</span>
                <span className="font-mono">{item.created_at}</span>
              </div>

              {/* 첨부 파일 썸네일 */}
              {item.file_url && (
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center gap-2 max-w-sm">
                  {item.file_type === "IMAGE" ? (
                    <img src={item.file_url} className="w-10 h-10 object-cover rounded-lg border" alt="Thumb" />
                  ) : (
                    <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center text-slate-500">
                      <FileText className="w-5 h-5" />
                    </div>
                  )}
                  <a
                    href={item.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-indigo-600 hover:underline truncate flex-1 block"
                  >
                    {item.file_url.split("/").pop()}
                  </a>
                </div>
              )}

              {item.file_type === "AUDIO" && item.file_url && (
                <audio src={item.file_url} controls className="w-full h-8 outline-none scale-95 origin-left" />
              )}

              <p className="text-slate-800 whitespace-pre-wrap leading-relaxed pl-0.5">{item.content_text}</p>

              {aiObj && (
                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold text-slate-700 leading-normal">
                  🎯 <span className="text-indigo-600">[AI 해독]</span> {aiObj.analysis_summary}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
