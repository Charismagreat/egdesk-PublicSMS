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
  const memoText = task.memo || task.note || task.customer_memo || task.reason || task.details || task.data?.memo || task.data?.note || task.data?.reason;

  // 📷 사진 첨부파일 통집 (photos / images / data.photos 등)
  const photosList: any[] = [
    ...(Array.isArray(task.photos) ? task.photos : []),
    ...(Array.isArray(task.data?.photos) ? task.data.photos : []),
    ...(Array.isArray(task.images) ? task.images : []),
  ];

  // 📂 서류/기타 파일 첨부통집 (attachments / files / data.files / file_url 등)
  const filesList: any[] = [
    ...(Array.isArray(task.attachments) ? task.attachments : []),
    ...(Array.isArray(task.files) ? task.files : []),
    ...(Array.isArray(task.data?.files) ? task.data.files : []),
    ...(task.file_url ? [{ name: task.file_name || '첨부 서류 파일', url: task.file_url }] : [])
  ];

  const getStatusBadge = () => {
    if (isPendingCancel) {
      return (
        <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-800 border border-rose-200/80 px-2.5 py-0.5 rounded-full text-xs font-black">
          <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
          <span>🚨 취소 승인 대기 중</span>
        </span>
      );
    }
    if (isDone) {
      return (
        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2.5 py-0.5 rounded-full text-xs font-black">
          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
          <span>🟢 관제 실행 완료</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200/80 px-2.5 py-0.5 rounded-full text-xs font-black">
        <Clock className="w-3 h-3 text-amber-500 shrink-0" />
        <span>🟡 관제 승인 대기</span>
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-5 space-y-4 animate-scale-in text-left">
        
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

          {/* 💡 등록 시 작성된 추가 메모 */}
          {memoText && (
            <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200/70 space-y-1">
              <span className="text-[10px] font-black text-amber-900 flex items-center gap-1">
                💡 상신 시 작성한 추가 메모
              </span>
              <p className="text-xs font-semibold text-amber-950 leading-relaxed whitespace-pre-wrap">
                {memoText}
              </p>
            </div>
          )}

          {/* 📷 1. 등록된 현장 이미지/사진 미리보기 목록 */}
          {photosList.length > 0 && (
            <div className="bg-white p-3 rounded-xl border border-slate-200/60 space-y-2">
              <span className="text-[11px] font-black text-indigo-700 flex items-center gap-1">
                <Paperclip className="w-3.5 h-3.5 text-indigo-600" />
                <span>등록된 현장 사진 ({photosList.length}건)</span>
              </span>
              <div className="grid grid-cols-2 gap-2">
                {photosList.map((photo: any, idx: number) => {
                  const imgUrl = photo.preview || photo.base64 || photo.url || photo;
                  const imgName = photo.name || `사진_${idx + 1}`;
                  return (
                    <a
                      key={idx}
                      href={typeof imgUrl === 'string' ? imgUrl : '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative rounded-xl overflow-hidden border border-slate-200 aspect-video bg-slate-100 flex flex-col justify-end p-1.5 transition-all hover:border-indigo-400"
                    >
                      {typeof imgUrl === 'string' && (
                        <img src={imgUrl} alt={imgName} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      )}
                      <div className="relative z-10 bg-slate-900/70 backdrop-blur-3xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md truncate">
                        {imgName}
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* 📎 2. 상신 첨부 서류 및 실물 파일 목록 */}
          {filesList.length > 0 && (
            <div className="bg-white p-3 rounded-xl border border-slate-200/60 space-y-2">
              <span className="text-[11px] font-black text-indigo-700 flex items-center gap-1">
                <Paperclip className="w-3.5 h-3.5 text-indigo-600" />
                <span>상신 첨부 서류 ({filesList.length}건)</span>
              </span>
              <div className="flex flex-col gap-1.5">
                {filesList.map((att: any, idx: number) => {
                  const fileUrl = att.url || att.preview || att.base64;
                  const fileName = att.name || att.filename || `서류파일_${idx + 1}`;
                  return (
                    <a
                      key={idx}
                      href={fileUrl || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between bg-indigo-50/70 hover:bg-indigo-100 text-indigo-900 font-extrabold text-xs p-2.5 rounded-xl border border-indigo-200/80 transition-all text-decoration-none"
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span className="truncate">{fileName}</span>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    </a>
                  );
                })}
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
