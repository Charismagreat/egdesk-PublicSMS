"use client";

import React from "react";
import { 
  FileText, RotateCcw, User, Calendar, CheckCircle2, 
  Sparkles, X, Loader2, ArrowRight, UserCheck 
} from "lucide-react";

interface GovernanceReportsTabProps {
  dailyReports: any[];
  loadDailyReports: () => void;
  selectedReport: any;
  setSelectedReport: (report: any) => void;
  pendingTasks: any[];
  assigneeMap: { [taskId: string]: string };
  setAssigneeMap: React.Dispatch<React.SetStateAction<{ [taskId: string]: string }>>;
  dueDateMap: { [taskId: string]: string };
  setDueDateMap: React.Dispatch<React.SetStateAction<{ [taskId: string]: string }>>;
  operators: any[];
  isExecuting: boolean;
  handleApproveReport: (reportId: string) => void;
  handleApprovePendingTask: (task: any) => void;
}

export default function GovernanceReportsTab({
  dailyReports,
  loadDailyReports,
  selectedReport,
  setSelectedReport,
  pendingTasks,
  assigneeMap,
  setAssigneeMap,
  dueDateMap,
  setDueDateMap,
  operators,
  isExecuting,
  handleApproveReport,
  handleApprovePendingTask,
}: GovernanceReportsTabProps) {
  return (
    <div className="space-y-4">
      {/* 서브 헤더 컨트롤바 */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-sm flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            <span>임직원 일일 업무 보고서 관제 & AI 후속 업무 자동 도출</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            임직원이 모바일에서 제출한 일일 업무 보고서를 검토하고, AI가 자동으로 도출한 후속 추천 업무를 담당자에게 배정합니다.
          </p>
        </div>
        <button
          onClick={loadDailyReports}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-2xl text-xs border-none cursor-pointer flex items-center gap-1.5 transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>새로고침</span>
        </button>
      </div>

      {/* 업무 보고서 리스트 */}
      {dailyReports.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center space-y-2 shadow-sm">
          <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-600">제출된 일일 업무 보고서가 없습니다.</h3>
          <p className="text-xs text-slate-400">직원들이 모바일 포털에서 일일 보고서를 제출하면 이곳에 모니터링됩니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dailyReports.map((rep) => (
            <div key={rep.id} className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex flex-col justify-between gap-4 text-left">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-xs">
                      📄 일일 보고서
                    </span>
                    <span className="font-black text-slate-800 text-sm">{rep.report_date}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    rep.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200 animate-pulse'
                  }`}>
                    {rep.status === 'APPROVED' ? '관제 승인 완료' : '🚨 결재 검토 대기'}
                  </span>
                </div>

                <div className="text-xs text-slate-600 space-y-1">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>작성자: <strong>{rep.created_by || rep.operator_name || '임직원'}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>제출 일시: {rep.created_at}</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">금일 진행 업무 요약</span>
                  <p className="text-xs font-semibold text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {rep.content_summary || rep.summary || '상세 업무 내용이 기록되어 있습니다.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  onClick={() => setSelectedReport(rep)}
                  className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-extrabold transition-all cursor-pointer border border-indigo-200 flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>AI 추천 후속 태스크 검토 & 담당자 배정</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI 추천 후속 태스크 도출 & 담당 배정 모달 */}
      {selectedReport && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-5 text-left animate-scale-in">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
                <h3 className="text-base font-black text-slate-800">AI 추천 후속 태스크 도출 & 관제 배정</h3>
              </div>
              <button 
                onClick={() => setSelectedReport(null)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors border-none bg-transparent cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 space-y-2">
                <span className="text-[11px] font-black text-indigo-700 uppercase">보고서 원문 요약</span>
                <p className="text-xs font-semibold text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {selectedReport.content_summary || selectedReport.summary}
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <ArrowRight className="w-3.5 h-3.5 text-indigo-600" />
                  <span>AI 분석 결과 도출된 추천 후속 태스크 ({pendingTasks.length}건)</span>
                </h4>

                {pendingTasks.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">도출된 후속 태스크가 없습니다.</p>
                ) : (
                  pendingTasks.map((task) => (
                    <div key={task.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                      <div>
                        <span className="text-xs font-black text-slate-850 block">{task.task_title}</span>
                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{task.task_description}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/60 text-xs">
                        <div>
                          <label className="font-bold text-slate-600 block mb-1">담당 사원 배정</label>
                          <select
                            value={assigneeMap[task.id] || ''}
                            onChange={(e) => setAssigneeMap(prev => ({ ...prev, [task.id]: e.target.value }))}
                            className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500"
                          >
                            <option value="">👤 담당자 선택</option>
                            {operators.map((op) => (
                              <option key={op.id} value={op.id}>{op.name} ({op.department || '임직원'})</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="font-bold text-slate-600 block mb-1">처리 기한 (due_date)</label>
                          <input
                            type="date"
                            value={dueDateMap[task.id] || ''}
                            onChange={(e) => setDueDateMap(prev => ({ ...prev, [task.id]: e.target.value }))}
                            className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          onClick={() => handleApprovePendingTask(task)}
                          disabled={isExecuting}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs flex items-center gap-1"
                        >
                          {isExecuting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                          <span>이 업무 최종 배정 및 캘린더 적재</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedReport(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-5 py-2.5 rounded-xl text-xs border-none cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
