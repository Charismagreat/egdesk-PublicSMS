"use client";

import React from "react";
import { X, Calendar, User, Building2, Paperclip, FileText, ExternalLink, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";

interface MobileTaskDetailModalProps {
  task: any | null;
  onClose: () => void;
  onCancelTaskRequest: (taskId: string, title: string) => void;
}

export default function MobileTaskDetailModal({
  task,
  onClose,
  onCancelTaskRequest,
}: MobileTaskDetailModalProps) {
  if (!task) return null;

  const isPendingCancel = task.status === "PENDING_APPROVAL" || task.has_cancel_request;
  const isDone = task.status === "DONE";

  const getStatusBadge = () => {
    if (isPendingCancel) {
      return (
        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200/80 px-2.5 py-0.5 rounded-full text-xs font-black">
          <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
          <span>🚨 취소 승인 대기 중</span>
        </span>
      );
    }
    if (isDone) {
      return (
        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2.5 py-0.5 rounded-full text-xs font-black">
          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
          <span>🟢 처리 완료</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-200/80 px-2.5 py-0.5 rounded-full text-xs font-black">
        <Clock className="w-3 h-3 text-indigo-600 shrink-0" />
        <span>🟡 진행 중</span>
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-end sm:items-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 space-y-5 animate-slide-up sm:animate-scale-in text-left">
        
        {/* 모달 상단 헤더 */}
        <div className="flex justify-between items-start border-b border-slate-100 pb-3">
          <div className="space-y-1 pr-2">
            <div className="flex items-center gap-2 flex-wrap">
              {getStatusBadge()}
              {task.due_date && (
                <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  📅 {task.due_date}
                </span>
              )}
            </div>
            <h3 className="text-base font-black text-slate-850 leading-snug">
              {task.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition-colors border-none bg-transparent cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 상세 메타 정보 그리드 */}
        <div className="bg-slate-50/80 border border-slate-200/70 rounded-2xl p-3.5 space-y-2.5 text-xs">
          <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">
            할 일 상세 명세
          </span>

          <div className="bg-white p-3 rounded-xl border border-slate-200/60 space-y-2 text-xs">
            {task.partner_company_name && (
              <div className="flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-slate-500 font-medium">관련 거래처:</span>
                <span className="font-bold text-slate-800">{task.partner_company_name}</span>
              </div>
            )}

            {task.operator && (
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-slate-500 font-medium">담당자 / 상신자:</span>
                <span className="font-bold text-indigo-700">{task.operator}</span>
              </div>
            )}

            {task.created_at && (
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-slate-500 font-medium">등록 일시:</span>
                <span className="font-mono text-slate-700">{task.created_at}</span>
              </div>
            )}
          </div>

          {/* 📝 상세 설명 및 내용 */}
          {task.description && (
            <div className="bg-white p-3 rounded-xl border border-slate-200/60 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 block">세부 내용 및 현장 요청 사항</span>
              <p className="text-xs font-medium text-slate-800 leading-relaxed whitespace-pre-wrap">
                {task.description}
              </p>
            </div>
          )}

          {/* 📎 상신 첨부 서류 및 실물 파일 */}
          {task.attachments && task.attachments.length > 0 && (
            <div className="bg-white p-3 rounded-xl border border-slate-200/60 space-y-2">
              <span className="text-[11px] font-black text-indigo-700 flex items-center gap-1">
                <Paperclip className="w-3.5 h-3.5 text-indigo-600" />
                <span>상신 첨부 서류 ({task.attachments.length}건)</span>
              </span>
              <div className="flex flex-col gap-1.5">
                {task.attachments.map((att: any, idx: number) => (
                  <a
                    key={idx}
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between bg-indigo-50/70 hover:bg-indigo-100 text-indigo-900 font-extrabold text-xs p-2 rounded-xl border border-indigo-200/80 transition-all text-decoration-none"
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span className="truncate">{att.name}</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 푸터 액션 버튼 */}
        <div className="flex items-center justify-between gap-2 pt-1">
          {!isDone && (
            <div>
              {isPendingCancel ? (
                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-2 rounded-xl border border-amber-200 block">
                  🚨 취소 승인 대기 중입니다
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onCancelTaskRequest(task.id, task.title);
                    onClose();
                  }}
                  className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-black transition-all cursor-pointer"
                >
                  🚨 업무 취소 요청
                </button>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="ml-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs"
          >
            닫기
          </button>
        </div>

      </div>
    </div>
  );
}
