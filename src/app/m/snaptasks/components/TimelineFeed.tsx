import React from "react";
import { Clock, Volume2, Sparkles, User, Camera, FileText, Mic, Link2 } from "lucide-react";
import { SnapTask, TimelineItem } from "../types";

interface TimelineFeedProps {
  selectedTask: SnapTask | null;
  detailLoading: boolean;
  timeline: TimelineItem[];
  timelineEndRef: React.RefObject<HTMLDivElement | null>;
}

export function TimelineFeed({
  selectedTask,
  detailLoading,
  timeline,
  timelineEndRef
}: TimelineFeedProps) {
  const getFileIcon = (type: string) => {
    switch (type) {
      case 'IMAGE': return Camera;
      case 'PDF': return FileText;
      case 'AUDIO': return Mic;
      default: return Link2;
    }
  };

  if (!selectedTask) {
    return (
      <p className="text-center py-20 text-xs text-slate-500 font-bold">
        오른쪽 상단 [새 태스크] 버튼을 눌러 첫 태스크를 열어주세요.
      </p>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 z-10">
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4.5 text-center text-xs font-medium space-y-1.5 shadow-sm max-w-sm mx-auto">
        <span className="text-indigo-400 font-extrabold uppercase text-[10px] tracking-widest block">Active Pipeline</span>
        <h2 className="text-sm font-black text-white">{selectedTask.title}</h2>
        <p className="text-slate-500 text-[10px] font-mono">태스크 코드: {selectedTask.id}</p>
      </div>

      {/* 타임라인 피드 카드들 */}
      {detailLoading && timeline.length === 0 ? (
        <p className="text-center py-12 text-xs text-slate-500 font-bold">과거 미팅 기록 마이닝 중...</p>
      ) : timeline.length === 0 ? (
        <p className="text-center py-12 text-xs text-slate-500 font-bold">
          등록된 스냅 자료가 없습니다. 아래 컨트롤러로 현장/업무 기록을 스냅해 주세요.
        </p>
      ) : (
        <div className="space-y-6">
          {timeline.map((item) => {
            const FileIcon = item.file_type !== 'TEXT' ? getFileIcon(item.file_type) : null;
            
            let aiAnalysisObj: any = null;
            try {
              if (item.ai_analysis) aiAnalysisObj = JSON.parse(item.ai_analysis);
            } catch (e) {}

            return (
              <div key={item.id} className="flex flex-col space-y-2.5 max-w-lg mx-auto">
                
                {/* 타임스탬프 */}
                <span className="text-[9px] font-bold font-mono text-slate-600 block pl-1 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  {new Date(item.created_at).toLocaleString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                </span>

                {/* 스냅 카드 몸체 */}
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-4.5 shadow-xl space-y-4">
                  
                  {/* 첨부 파일 렌더링 */}
                  {item.file_url && (
                    <div className="bg-slate-950 rounded-2xl overflow-hidden border border-slate-850 p-2.5 flex items-center gap-3">
                      {item.file_type === 'IMAGE' ? (
                        <img 
                          src={item.file_url} 
                          alt="Snap Attached" 
                          className="w-14 h-14 object-cover rounded-xl border border-slate-800 shrink-0" 
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400 shrink-0">
                          {FileIcon && <FileIcon className="w-6 h-6" />}
                        </div>
                      )}
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <span className="text-[10px] font-black text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 uppercase tracking-widest block w-max">
                          {item.file_type} File
                        </span>
                        <a 
                          href={item.file_url} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-xs text-slate-300 font-bold block truncate hover:underline"
                        >
                          {item.file_url.split('/').pop()}
                        </a>
                      </div>
                    </div>
                  )}

                  {/* 오디오 녹취 HTML5 플레이어 마운트 (STT 소리 확인용 프리미엄 가치) */}
                  {item.file_type === 'AUDIO' && item.file_url && (
                    <div className="bg-slate-950/80 border border-slate-850 rounded-2xl p-3 flex items-center gap-3">
                      <Volume2 className="w-5 h-5 text-indigo-400 animate-pulse shrink-0" />
                      <audio src={item.file_url} controls className="w-full h-8 scale-95 outline-none custom-audio-player" />
                    </div>
                  )}

                  {/* 본문 텍스트 */}
                  {item.content_text && (
                    <p className="text-slate-200 text-xs font-semibold leading-relaxed whitespace-pre-wrap pl-1">
                      {item.content_text}
                    </p>
                  )}

                  {/* AI 자율 의사결정 감사로그 표시 (프리미엄 네온뱃지 레이아웃) */}
                  {aiAnalysisObj && (
                    <div className="bg-indigo-950/20 border border-indigo-500/15 rounded-2xl p-3.5 space-y-2 mt-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-indigo-400 font-black text-[10px] uppercase tracking-wider">
                          <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '3s' }} />
                          <span>AI Autonomous CRM Action</span>
                        </div>
                        <span className={`text-[8px] font-black px-1.5 py-0.3 rounded border uppercase tracking-wider ${
                          aiAnalysisObj.action_taken !== 'NO_ACTION' 
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : 'bg-slate-800/50 border-slate-700 text-slate-400'
                        }`}>
                          {aiAnalysisObj.action_taken}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-350 leading-relaxed font-bold pl-0.5">
                        {aiAnalysisObj.analysis_summary}
                      </p>
                      {aiAnalysisObj.extracted_data?.contact && (
                        <div className="mt-2.5 pt-2 border-t border-indigo-500/10 flex items-center gap-2 text-[10px] text-indigo-300 font-bold animate-fade-in">
                          <User className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span>[담당자 등록 완수] {aiAnalysisObj.extracted_data.contact.name} {aiAnalysisObj.extracted_data.contact.position ? `(${aiAnalysisObj.extracted_data.contact.position})` : ''}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={timelineEndRef} />
        </div>
      )}
    </div>
  );
}
