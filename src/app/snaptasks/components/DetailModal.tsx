import React from "react";
import { X } from "lucide-react";
import { SnapTask, TimelineItem, ActionLog, Partner, PartnerContact } from "../types";
import { PartnerCard } from "./PartnerCard";
import { ActionLogFeed } from "./ActionLogFeed";
import { TimelineFeed } from "./TimelineFeed";
import { PcSnapForm } from "./PcSnapForm";

interface DetailModalProps {
  selectedTask: SnapTask;
  isDetailOpen: boolean;
  setIsDetailOpen: (val: boolean) => void;
  timeline: TimelineItem[];
  actions: ActionLog[];
  partner: Partner | null;
  partnerContacts: PartnerContact[];
  detailLoading: boolean;
  handleUpdateStatus: (task: SnapTask, nextStatus: "ACTIVE" | "COMPLETED" | "ARCHIVED") => void;

  // PcSnapForm 관련 props
  contentText: string;
  setContentText: (val: string) => void;
  attachedFile: File | null;
  setAttachedFile: (val: File | null) => void;
  attachedFileType: "IMAGE" | "PDF" | "AUDIO" | "LINK" | "TEXT";
  setAttachedFileType: (val: "IMAGE" | "PDF" | "AUDIO" | "LINK" | "TEXT") => void;
  setAttachedFileBase64: (val: string) => void;
  snapping: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileChange: (file: File, type: "IMAGE" | "PDF" | "AUDIO") => void;
  handleSnapSubmit: (e: React.FormEvent) => void;
}

export function DetailModal({
  selectedTask,
  isDetailOpen,
  setIsDetailOpen,
  timeline,
  actions,
  partner,
  partnerContacts,
  detailLoading,
  handleUpdateStatus,
  contentText,
  setContentText,
  attachedFile,
  setAttachedFile,
  attachedFileType,
  setAttachedFileType,
  setAttachedFileBase64,
  snapping,
  fileInputRef,
  handleFileChange,
  handleSnapSubmit,
}: DetailModalProps) {
  if (!isDetailOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] max-w-4xl w-full p-6 md:p-8 shadow-2xl relative flex flex-col max-h-[85vh] animate-scale-up">
        <button
          onClick={() => setIsDetailOpen(false)}
          className="absolute top-5 right-5 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* 헤더 */}
        <div className="space-y-1 mb-5">
          <span className="text-[9px] bg-indigo-50 text-indigo-600 px-2.5 py-0.5 rounded font-black tracking-wider uppercase inline-block">
            SnapTask Deep-Mining Analysis
          </span>
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <span>{selectedTask.title}</span>
            {selectedTask.partner_company_name && (
              <span className="text-xs bg-emerald-50 border border-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full font-extrabold">
                파트너: {selectedTask.partner_company_name}
              </span>
            )}
          </h3>
        </div>

        {/* 본체: 2단 분할 레이아웃 (좌: AI 자율 감사 감사록, 우: 스냅 타임라인 피드) */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 flex-1 overflow-hidden">
          {/* 좌측 2열: B2B 파트너/명함첩 및 AI 감사기록 피드 */}
          <div className="lg:col-span-2 flex flex-col gap-4 overflow-hidden">
            <PartnerCard detailLoading={detailLoading} partner={partner} partnerContacts={partnerContacts} />
            <ActionLogFeed detailLoading={detailLoading} actions={actions} />
          </div>

          {/* 우측 3열: 타임라인 데이터 피드 리스트 */}
          <div className="lg:col-span-3 bg-white border border-slate-100 rounded-2xl p-4.5 flex flex-col overflow-hidden">
            <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider block mb-3">
              스냅 타임라인 피드 히스토리
            </h4>
            <TimelineFeed detailLoading={detailLoading} timeline={timeline} />
            <PcSnapForm
              contentText={contentText}
              setContentText={setContentText}
              attachedFile={attachedFile}
              setAttachedFile={setAttachedFile}
              attachedFileType={attachedFileType}
              setAttachedFileType={setAttachedFileType}
              setAttachedFileBase64={setAttachedFileBase64}
              snapping={snapping}
              fileInputRef={fileInputRef}
              handleFileChange={handleFileChange}
              handleSnapSubmit={handleSnapSubmit}
            />
          </div>
        </div>

        {/* 하단 트랜지션 액션바 */}
        <div className="mt-6 border-t border-slate-100 pt-4 flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => setIsDetailOpen(false)}
            className="flex-1 py-3 bg-slate-150 hover:bg-slate-200 text-slate-750 font-bold text-xs rounded-xl transition-colors"
          >
            관제 탑으로 복귀
          </button>

          {selectedTask.status === "ACTIVE" && (
            <button
              onClick={() => handleUpdateStatus(selectedTask, "COMPLETED")}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-colors"
            >
              목표 달성 및 태스크 완료 승인 (COMPLETED)
            </button>
          )}

          {selectedTask.status === "COMPLETED" && (
            <button
              onClick={() => handleUpdateStatus(selectedTask, "ARCHIVED")}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs rounded-xl transition-colors"
            >
              과거 이력함 보관 이관 (ARCHIVED)
            </button>
          )}

          {selectedTask.status === "ARCHIVED" && (
            <button
              onClick={() => handleUpdateStatus(selectedTask, "ACTIVE")}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl transition-colors"
            >
              활성 진행 태스크 복구 (ACTIVE)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
