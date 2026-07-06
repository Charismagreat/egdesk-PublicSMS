import React, { useState } from "react";
import { GrantAnnouncement, RndPlan, RND_PLAN_SECTIONS } from "../types";
import { Download, Sparkles, FileEdit, Check, HelpCircle } from "lucide-react";

interface RndPlanBuilderCardProps {
  announcements: GrantAnnouncement[];
  rndPlan: RndPlan | null;
  isGenerating: boolean;
  onUpdateSection: (sectionId: string, content: string) => void;
  onExportCsv: () => void;
}

/**
 * AI R&D 사업계획서 4대 장표 빌더 및 엑셀 다운로드 카드
 */
export default function RndPlanBuilderCard({
  announcements,
  rndPlan,
  isGenerating,
  onUpdateSection,
  onExportCsv,
}: RndPlanBuilderCardProps) {
  const [activeTab, setActiveTab] = useState<string>("necessity");

  const currentAnn = announcements.find((a) => a.id === rndPlan?.announcementId);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs text-left flex flex-col min-h-[480px]">
      
      {/* 1. 기획서 대기 상태 (RndPlan이 없는 경우) */}
      {!rndPlan ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center space-y-4">
          <div className="p-4 rounded-full bg-indigo-50 text-indigo-650 animate-pulse">
            <Sparkles className="w-10 h-10" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-black text-slate-800">R&D 사업계획서 AI 빌딩 보드</h4>
            <p className="text-[9.5px] text-slate-400 font-bold max-w-sm leading-relaxed">
              좌측 공고 매칭 보드에서 **기술 R&D** 유형 과제의 <b className="text-indigo-600">"AI 계획서 빌드"</b> 단추를 누르시면, 본 장표에 정부 표준 양식에 맞춘 4대 기획서 원고 초안이 즉각 실시간 자동 생성됩니다.
            </p>
          </div>
          {isGenerating && (
            <div className="flex items-center gap-2 text-[10px] text-indigo-600 font-black pt-2">
              <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span>Gemini AI가 특허 및 기업 정보를 조합해 초안을 작성 중입니다...</span>
            </div>
          )}
        </div>
      ) : (
        /* 2. 기획서 작성 완료 및 에디터 구동 상태 */
        <div className="flex-1 flex flex-col space-y-4">
          
          {/* 상단 기획 정보 및 엑셀 내보내기 */}
          <div className="flex justify-between items-start border-b border-slate-100 pb-3 flex-wrap gap-2">
            <div className="space-y-1">
              <span className="text-[8.5px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                AI R&D Draft Complete
              </span>
              <h4 className="text-xs font-black text-slate-850 truncate max-w-[320px]">
                {currentAnn?.title}
              </h4>
            </div>
            
            <button
              type="button"
              onClick={onExportCsv}
              className="px-3 py-1.5 bg-emerald-650 hover:bg-emerald-700 text-white font-extrabold text-[9.5px] rounded-xl shadow-2xs transition-colors flex items-center gap-1 shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              CSV 엑셀 다운로드
            </button>
          </div>

          {/* 4대 장표 탭 버튼 그룹 */}
          <div className="flex border-b border-slate-200 overflow-x-auto gap-1">
            {RND_PLAN_SECTIONS.map((sec) => {
              const isActive = activeTab === sec.id;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setActiveTab(sec.id)}
                  className={`px-3 py-2 text-[9px] font-black whitespace-nowrap transition-colors border-b-2 -mb-[1px] ${
                    isActive
                      ? "border-indigo-650 text-indigo-650"
                      : "border-transparent text-slate-400 hover:text-slate-650"
                  }`}
                >
                  {sec.title.split(". ")[1]}
                </button>
              );
            })}
          </div>

          {/* 에디터 뷰포트 영역 */}
          <div className="flex-1 flex flex-col space-y-2">
            <div className="flex items-center justify-between text-[8px] text-slate-400 font-bold">
              <span className="flex items-center gap-1">
                <FileEdit className="w-3.5 h-3.5 text-slate-400" />
                선택 섹션: {RND_PLAN_SECTIONS.find((s) => s.id === activeTab)?.title}
              </span>
              <span className="text-emerald-650 flex items-center gap-0.5 font-bold">
                <Check className="w-3.5 h-3.5" /> 실시간 반영됨
              </span>
            </div>

            <textarea
              className="flex-1 w-full min-h-[220px] p-4 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-bold text-slate-700 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all leading-relaxed"
              value={rndPlan.sections[activeTab] || ""}
              onChange={(e) => onUpdateSection(activeTab, e.target.value)}
              placeholder={RND_PLAN_SECTIONS.find((s) => s.id === activeTab)?.placeholder}
            />
          </div>

          {/* 하단 푸터 안내 */}
          <div className="p-3 bg-indigo-50/30 border border-indigo-100/50 rounded-2xl flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <p className="text-[8.5px] text-indigo-850 font-bold leading-normal">
              <b>💡 AI 작성 팁:</b> 원고 내용 중 기술 정량 수치나 핵심 비즈니스 도메인(예: 도소매 물류 소프트웨어)에 맞는 구체적인 거래처 상호명을 기입하시면 사업계획서 대면 평가 통과율이 한층 더 향상됩니다.
            </p>
          </div>

        </div>
      )}

    </div>
  );
}
