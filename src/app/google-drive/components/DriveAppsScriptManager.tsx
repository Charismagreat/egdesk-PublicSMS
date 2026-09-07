"use client";

import React, { useState, useEffect } from "react";
import { 
  Code, Play, Clock, RefreshCw, Layers, CheckCircle2, AlertCircle, FileCode, 
  Wrench, Sparkles, ArrowRight, Trash2, X, AlertTriangle, Plus, Zap, 
  ToggleLeft, ToggleRight, Calendar, ExternalLink, Activity
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import NewAppsScriptModal from "./NewAppsScriptModal";
import AppsScriptScheduleModal from "./AppsScriptScheduleModal";

export default function DriveAppsScriptManager() {
  const [projects, setProjects] = useState<any[]>([]);
  const [triggers, setTriggers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 스케줄 관련 상태
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<any | null>(null);
  const [scheduleFilterProjectId, setScheduleFilterProjectId] = useState<string>("all");
  const [scheduleFilterStatus, setScheduleFilterStatus] = useState<"all" | "ACTIVE" | "PAUSED">("all");
  const [runningScheduleId, setRunningScheduleId] = useState<string | null>(null);

  // 새 프로젝트 추가 / 수정 모달 상태
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [editTargetProject, setEditTargetProject] = useState<any | null>(null);

  // 삭제 모달 상태
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleteGoogleSheet, setDeleteGoogleSheet] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 1. 프로젝트 및 기존 트리거 데이터 로드
  const fetchAppsScriptData = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/google-drive/apps-script");
      if (!res.ok) return;
      const text = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        return;
      }

      if (data?.success) {
        setProjects(data.projects || []);
        setTriggers(data.triggers || []);
      }
    } catch (err) {
      console.error("Fetch Apps Script data error:", err);
    } finally {
      setLoading(false);
    }
  };

  // 2. 스케줄(트리거) 목록 로드
  const fetchSchedules = async () => {
    setLoadingSchedules(true);
    try {
      const res = await apiFetch("/api/google-drive/apps-script/schedules");
      if (!res.ok) return;
      const data = await res.json();
      if (data?.success) {
        setSchedules(data.schedules || []);
      }
    } catch (err) {
      console.error("Fetch Apps Script schedules error:", err);
    } finally {
      setLoadingSchedules(false);
    }
  };

  useEffect(() => {
    fetchAppsScriptData();
    fetchSchedules();
  }, []);

  // 삭제 모달 열기 핸들러
  const handleOpenDeleteModal = (proj: any) => {
    setDeleteTarget(proj);
    setDeleteGoogleSheet(false);
  };

  // 삭제 실행 핸들러
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);

    try {
      const res = await apiFetch("/api/google-drive/apps-script", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: deleteTarget.id,
          scriptId: deleteTarget.scriptId,
          spreadsheetId: deleteTarget.spreadsheetId || deleteTarget.containerId,
          deleteGoogleSheet: deleteGoogleSheet
        })
      });

      const text = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {}

      if (data?.success) {
        setAlertMessage({ type: "success", text: data.message || "프로젝트가 성공적으로 삭제되었습니다." });
        setDeleteTarget(null);
        fetchAppsScriptData();
      } else {
        setAlertMessage({ type: "error", text: data?.error || "프로젝트 삭제에 실패했습니다." });
      }
    } catch (err: any) {
      setAlertMessage({ type: "error", text: err.message || "삭제 중 오류가 발생했습니다." });
    } finally {
      setIsDeleting(false);
      setTimeout(() => setAlertMessage(null), 5000);
    }
  };

  // 3. 스케줄 활성 / 일시정지 토글 핸들러
  const handleToggleSchedule = async (schedule: any) => {
    const nextStatus = schedule.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    try {
      const res = await apiFetch("/api/google-drive/apps-script/schedules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduleId: schedule.id, status: nextStatus })
      });
      const data = await res.json();
      if (data.success) {
        setAlertMessage({
          type: "success",
          text: `[${schedule.name}] 스케줄이 ${nextStatus === "ACTIVE" ? "활성화" : "일시정지"}되었습니다.`
        });
        fetchSchedules();
      } else {
        setAlertMessage({ type: "error", text: data.error || "상태 변경에 실패했습니다." });
      }
    } catch (err: any) {
      setAlertMessage({ type: "error", text: err.message || "상태 변경 중 통신 오류가 발생했습니다." });
    } finally {
      setTimeout(() => setAlertMessage(null), 4000);
    }
  };

  // 4. 스케줄 즉시 실행 (Run Now)
  const handleRunScheduleNow = async (schedule: any) => {
    setRunningScheduleId(schedule.id);
    try {
      const res = await apiFetch("/api/google-drive/apps-script/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run_now", scheduleId: schedule.id })
      });
      const data = await res.json();
      if (data.success) {
        setAlertMessage({
          type: "success",
          text: `[${schedule.name}] ${data.message || "스케줄 함수가 성공적으로 실행되었습니다."}`
        });
        fetchSchedules();
      } else {
        setAlertMessage({ type: "error", text: data.error || "스케줄 실행에 실패했습니다." });
      }
    } catch (err: any) {
      setAlertMessage({ type: "error", text: err.message || "실행 요청 중 오류가 발생했습니다." });
    } finally {
      setRunningScheduleId(null);
      setTimeout(() => setAlertMessage(null), 5000);
    }
  };

  // 5. 스케줄 삭제 핸들러
  const handleDeleteSchedule = async (schedule: any) => {
    if (!window.confirm(`정말로 '${schedule.name}' 스케줄을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const res = await apiFetch(`/api/google-drive/apps-script/schedules?id=${schedule.id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        setAlertMessage({ type: "success", text: "스케줄이 성공적으로 삭제되었습니다." });
        fetchSchedules();
      } else {
        setAlertMessage({ type: "error", text: data.error || "스케줄 삭제에 실패했습니다." });
      }
    } catch (err: any) {
      setAlertMessage({ type: "error", text: err.message || "삭제 중 통신 오류가 발생했습니다." });
    } finally {
      setTimeout(() => setAlertMessage(null), 4000);
    }
  };

  // 활성 스케줄 개수 집계
  const activeSchedulesCount = schedules.filter(s => s.status === "ACTIVE").length;

  // 필터링된 스케줄 목록
  const filteredSchedules = schedules.filter(s => {
    if (scheduleFilterProjectId !== "all" && s.projectId !== scheduleFilterProjectId) return false;
    if (scheduleFilterStatus !== "all" && s.status !== scheduleFilterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* 알림 배너 */}
      {alertMessage && (
        <div className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold animate-fade-in ${
          alertMessage.type === "success" 
            ? "bg-emerald-50 text-emerald-800 border border-emerald-200" 
            : "bg-rose-50 text-rose-800 border border-rose-200"
        }`}>
          <div className="flex items-center gap-2">
            {alertMessage.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
            <span>{alertMessage.text}</span>
          </div>
          <button onClick={() => setAlertMessage(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. Apps Script 상태 헤더 카드 */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">연동 Google Apps Script(GAS) 관리</h3>
            </div>
          </div>

          <button
            onClick={() => {
              fetchAppsScriptData();
              fetchSchedules();
            }}
            disabled={loading || loadingSchedules}
            className="p-2 text-slate-500 hover:text-amber-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
            title="새로고침"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading || loadingSchedules ? "animate-spin" : ""}`} />
            <span>새로고침</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
            <span className="text-xs font-bold text-slate-400 block mb-1">연동된 GAS 프로젝트</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-800 tracking-tight">{projects.length}</span>
              <span className="text-xs font-bold text-slate-500">개</span>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
            <span className="text-xs font-bold text-slate-400 block mb-1">활성 실행 스케줄 / 트리거</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-amber-600 tracking-tight">
                {activeSchedulesCount || triggers.length}
              </span>
              <span className="text-xs font-bold text-slate-500">개 가동 중</span>
              {schedules.length > activeSchedulesCount && (
                <span className="text-[10px] font-bold text-slate-400 ml-1">
                  (총 {schedules.length}개 중 {schedules.length - activeSchedulesCount}개 일시정지)
                </span>
              )}
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
            <span className="text-xs font-bold text-slate-400 block mb-1">스케줄러 엔진 상태</span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-bold text-emerald-600 text-xs">
                시간 기반 및 이벤트 트리거 가동 준비 완료
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. ⏰ 자동화 스케줄 & 트리거 관리 전용 패널 */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <span>자동화 스케줄 & 트리거 관리</span>
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-black rounded-md">
                  {schedules.length}개 등록됨
                </span>
              </h4>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* 프로젝트별 필터 */}
            {projects.length > 0 && (
              <select
                value={scheduleFilterProjectId}
                onChange={(e) => setScheduleFilterProjectId(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer focus:outline-none"
              >
                <option value="all">전체 프로젝트 ({schedules.length})</option>
                {projects.map((p, idx) => (
                  <option key={idx} value={p.scriptId || p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}

            {/* 상태 필터 */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/70">
              <button
                onClick={() => setScheduleFilterStatus("all")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  scheduleFilterStatus === "all" ? "bg-white text-slate-800 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                전체
              </button>
              <button
                onClick={() => setScheduleFilterStatus("ACTIVE")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  scheduleFilterStatus === "ACTIVE" ? "bg-white text-emerald-600 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                활성 ({schedules.filter(s => s.status === "ACTIVE").length})
              </button>
              <button
                onClick={() => setScheduleFilterStatus("PAUSED")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  scheduleFilterStatus === "PAUSED" ? "bg-white text-slate-600 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                일시정지 ({schedules.filter(s => s.status === "PAUSED").length})
              </button>
            </div>

            {/* 새 스케줄 등록 버튼 */}
            <button
              onClick={() => {
                setEditingSchedule(null);
                setIsScheduleModalOpen(true);
              }}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>새 스케줄 등록</span>
            </button>
          </div>
        </div>

        {/* 스케줄 대장 목록 */}
        {filteredSchedules.length === 0 ? (
          <div className="p-8 border-2 border-dashed border-slate-200 rounded-3xl text-center space-y-3 bg-slate-50/50">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
              <Clock className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h5 className="font-bold text-slate-800 text-sm">등록된 자동화 스케줄(트리거)이 없습니다.</h5>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                매일 정해진 시각에 대장을 자동 마감하거나, 구글 시트 데이터가 수정될 때마다 실시간으로 이벤트를 수신하는 스케줄을 손쉽게 등록해 보세요.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingSchedule(null);
                setIsScheduleModalOpen(true);
              }}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>첫 자동화 스케줄 등록하기</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredSchedules.map((schedule) => {
              const isRunning = runningScheduleId === schedule.id;
              const isTime = schedule.triggerType === "TIME_DRIVEN";

              // 주기 설명 텍스트 포맷팅
              let frequencyText = "";
              if (isTime) {
                if (schedule.timeFrequency === "MINUTES") frequencyText = `매 ${schedule.intervalValue || 1}분마다`;
                else if (schedule.timeFrequency === "HOURS") frequencyText = `매 ${schedule.intervalValue || 1}시간마다`;
                else if (schedule.timeFrequency === "DAILY") frequencyText = `매일 ${schedule.atHour?.toString().padStart(2, "0") || "09"}:00`;
                else if (schedule.timeFrequency === "WEEKLY") {
                  const weekMap: Record<string, string> = {
                    MONDAY: "월요일", TUESDAY: "화요일", WEDNESDAY: "수요일",
                    THURSDAY: "목요일", FRIDAY: "금요일", SATURDAY: "토요일", SUNDAY: "일요일"
                  };
                  frequencyText = `매주 ${weekMap[schedule.weekDay] || "월요일"} ${schedule.atHour?.toString().padStart(2, "0") || "09"}:00`;
                } else {
                  frequencyText = "시간 기반 스케줄";
                }
              } else {
                const eventMap: Record<string, string> = {
                  ON_EDIT: "시트 셀 수정 시 (onEdit)",
                  ON_OPEN: "시트 열릴 때 (onOpen)",
                  ON_CHANGE: "시트 구조 변경 시 (onChange)",
                  ON_FORM_SUBMIT: "설문 폼 제출 시 (onFormSubmit)"
                };
                frequencyText = eventMap[schedule.eventType] || "시트 이벤트 발생 시";
              }

              return (
                <div
                  key={schedule.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    schedule.status === "ACTIVE"
                      ? "bg-white border-amber-200/80 shadow-xs hover:border-amber-400"
                      : "bg-slate-50/70 border-slate-200 opacity-70 hover:opacity-100"
                  }`}
                >
                  {/* 좌측: 스케줄 정보 */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black flex items-center gap-1 ${
                        isTime 
                          ? "bg-amber-100 text-amber-800" 
                          : "bg-indigo-100 text-indigo-800"
                      }`}>
                        {isTime ? <Clock className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
                        <span>{frequencyText}</span>
                      </span>

                      <h5 className="font-extrabold text-xs text-slate-800 truncate" title={schedule.name}>
                        {schedule.name}
                      </h5>

                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 ${
                        schedule.status === "ACTIVE" 
                          ? "bg-emerald-100 text-emerald-800" 
                          : "bg-slate-200 text-slate-600"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${schedule.status === "ACTIVE" ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`}></span>
                        <span>{schedule.status === "ACTIVE" ? "활성 가동 중" : "일시정지"}</span>
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                      <div className="flex items-center gap-1 font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                        <Code className="w-3 h-3 text-amber-600" />
                        <span className="font-bold">fx:</span>
                        <span>{schedule.functionName}()</span>
                      </div>

                      <div className="flex items-center gap-1 text-slate-400">
                        <span>프로젝트:</span>
                        <span className="font-medium text-slate-700 truncate max-w-[180px]">
                          {schedule.projectName || "기본 프로젝트"}
                        </span>
                      </div>

                      {schedule.spreadsheetUrl && (
                        <a
                          href={schedule.spreadsheetUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 hover:underline flex items-center gap-1 font-medium"
                        >
                          <span>연결 시트 열기</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    {schedule.description && (
                      <p className="text-[11px] text-slate-500 line-clamp-1">
                        {schedule.description}
                      </p>
                    )}

                    {/* 최근 실행 이력 */}
                    {schedule.lastRunAt && (
                      <div className="text-[10px] text-slate-400 flex items-center gap-1.5 pt-0.5">
                        <Activity className="w-3 h-3 text-slate-400" />
                        <span>최근 실행: {schedule.lastRunAt}</span>
                        {schedule.lastStatus === "SUCCESS" && (
                          <span className="text-emerald-600 font-bold">● 정상 완료</span>
                        )}
                        {schedule.lastStatus === "FAILED" && (
                          <span className="text-rose-600 font-bold">● 오류 발생</span>
                        )}
                        {schedule.lastRunMessage && (
                          <span className="text-slate-400 truncate max-w-[280px]">
                            ({schedule.lastRunMessage})
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 우측: 액션 버튼 그룹 */}
                  <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                    {/* 즉시 테스트 실행 버튼 */}
                    <button
                      onClick={() => handleRunScheduleNow(schedule)}
                      disabled={isRunning}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-amber-50 hover:text-amber-700 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
                      title="Apps Script 대상 함수를 지금 즉시 호출 실행합니다."
                    >
                      {isRunning ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
                          <span>실행 중...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 text-amber-600 fill-amber-600" />
                          <span>즉시 실행</span>
                        </>
                      )}
                    </button>

                    {/* 활성/일시정지 토글 버튼 */}
                    <button
                      onClick={() => handleToggleSchedule(schedule)}
                      className={`px-2.5 py-1.5 text-xs font-bold rounded-xl border transition-all flex items-center gap-1 cursor-pointer active:scale-95 ${
                        schedule.status === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                          : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                      }`}
                      title={schedule.status === "ACTIVE" ? "스케줄을 일시정지합니다." : "스케줄을 다시 활성화합니다."}
                    >
                      {schedule.status === "ACTIVE" ? (
                        <>
                          <ToggleRight className="w-4 h-4 text-emerald-600" />
                          <span>활성</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-4 h-4 text-slate-400" />
                          <span>일시정지</span>
                        </>
                      )}
                    </button>

                    {/* 수정 버튼 */}
                    <button
                      onClick={() => {
                        setEditingSchedule(schedule);
                        setIsScheduleModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all cursor-pointer"
                      title="스케줄 주기 및 설정 수정"
                    >
                      <Wrench className="w-4 h-4" />
                    </button>

                    {/* 삭제 버튼 */}
                    <button
                      onClick={() => handleDeleteSchedule(schedule)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                      title="스케줄 삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. 연동 프로젝트 목록 카드 */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
            <FileCode className="w-4 h-4 text-amber-600" />
            연동된 Apps Script 프로젝트 목록
          </h4>

          <button
            onClick={() => {
              setEditTargetProject(null);
              setIsNewProjectModalOpen(true);
            }}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>새 프로젝트 추가</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* 🌟 [➕ 새 프로젝트 추가] 점선 카드 */}
          <div
            onClick={() => {
              setEditTargetProject(null);
              setIsNewProjectModalOpen(true);
            }}
            className="p-5 rounded-2xl border-2 border-dashed border-indigo-200/80 bg-indigo-50/40 hover:bg-indigo-50 hover:border-indigo-400/90 transition-all cursor-pointer flex flex-col justify-between gap-3 group text-left min-h-[110px]"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white text-indigo-600 rounded-xl shadow-xs group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all shrink-0">
                <Plus className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h5 className="font-extrabold text-xs text-indigo-950 group-hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                  <span>새 프로젝트 추가</span>
                  <Sparkles className="w-3 h-3 text-amber-500" />
                </h5>
                <p className="text-[11px] text-indigo-900/70 leading-relaxed">
                  구글 시트 URL을 등록하고 자연어로 Apps Script 코드를 자동 주입합니다.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-indigo-100/60 flex items-center justify-between text-[11px] font-bold text-indigo-600">
              <span>원스톱 AI 주입 시작하기</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* 기존 연동 프로젝트 목록 */}
          {projects.map((p, idx) => (
            <div 
              key={idx} 
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                p.isTrashed 
                  ? "bg-slate-50/60 border-slate-200/60 opacity-60 hover:opacity-100" 
                  : "bg-white border-indigo-100 shadow-xs hover:border-indigo-300"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 flex-1 min-w-0">
                  <h5 className={`font-bold text-xs truncate ${p.isTrashed ? "text-slate-500 line-through" : "text-slate-800"}`} title={p.name}>
                    {p.name || `Project-${idx}`}
                  </h5>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-mono truncate max-w-[200px]">
                      ID: {p.scriptId || p.id}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {p.isTrashed ? (
                    <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-[10px] font-bold rounded-md flex items-center gap-1">
                      <span>🗑️ 휴지통 (삭제됨)</span>
                    </span>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditTargetProject(p);
                          setIsNewProjectModalOpen(true);
                        }}
                        className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 text-[10px] font-extrabold rounded-lg border border-amber-200/80 transition-all flex items-center gap-1 cursor-pointer shadow-2xs active:scale-95"
                        title="기존 코드를 보존하며 새로운 기능을 이어서 수정/추가합니다."
                      >
                        <span>✏️ 이어서 수정</span>
                      </button>

                      <button
                        onClick={() => {
                          // 이 프로젝트 전용 새 스케줄 등록
                          setEditingSchedule({
                            projectId: p.scriptId || p.id,
                            projectName: p.name,
                            spreadsheetId: p.spreadsheetId || p.containerId,
                            spreadsheetUrl: p.spreadsheetUrl
                          });
                          setIsScheduleModalOpen(true);
                        }}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                        title="이 프로젝트에 스케줄 추가"
                      >
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span>스케줄</span>
                      </button>

                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>정상 연결</span>
                      </span>
                    </>
                  )}

                  <button
                    onClick={() => handleOpenDeleteModal(p)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                    title="프로젝트 삭제 / 목록에서 제거"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {p.spreadsheetUrl && (
                <div className="pt-2 border-t border-slate-100/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 text-[10px]">연결 시트:</span>
                  <a 
                    href={p.spreadsheetUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className={`text-[10px] font-medium flex items-center gap-1 hover:underline ${
                      p.isTrashed ? "text-slate-400" : "text-indigo-600"
                    }`}
                  >
                    <span>구글 시트 열기</span>
                    <ArrowRight className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 4. 스마트 프로젝트 삭제 컨펌 모달 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-rose-600">
                <Trash2 className="w-5 h-5" />
                <h3 className="font-extrabold text-sm text-slate-800">Apps Script 프로젝트 삭제</h3>
              </div>
              <button 
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-1">
                <div className="text-[11px] font-bold text-slate-500">대상 프로젝트:</div>
                <div className="text-xs font-extrabold text-slate-800 break-all">{deleteTarget.name}</div>
                <div className="text-[10px] font-mono text-slate-400 truncate">ID: {deleteTarget.scriptId || deleteTarget.id}</div>
              </div>

              {deleteTarget.isTrashed ? (
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/80 text-xs text-amber-900 space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <span>💡 구글 드라이브 휴지통 상태 확인됨</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-800">
                    연결된 구글 시트 파일이 이미 구글 드라이브 휴지통에 있습니다. 이지데스크 연동 목록에서 즉시 제거합니다.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    이 프로젝트를 이지데스크 관리 목록에서 제거합니다. 삭제 옵션을 선택해 주세요:
                  </p>

                  <label className="flex items-start gap-2.5 p-3 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-all">
                    <input 
                      type="checkbox" 
                      checked={deleteGoogleSheet} 
                      onChange={(e) => setDeleteGoogleSheet(e.target.checked)}
                      className="mt-0.5 rounded text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                    />
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-rose-700">구글 드라이브의 원본 시트 파일도 함께 휴지통으로 삭제</div>
                      <div className="text-[10px] text-slate-500 leading-relaxed">
                        체크 시 구글 드라이브 상의 원본 스프레드시트 파일도 함께 휴지통으로 이동합니다. (체크 해제 시 연동 목록에서만 제거)
                      </div>
                    </div>
                  </label>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>삭제 처리 중...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{deleteTarget.isTrashed ? "목록에서 제거" : deleteGoogleSheet ? "시트와 함께 삭제" : "목록에서만 제거"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. 스케줄(트리거) 등록 및 수정 모달 */}
      <AppsScriptScheduleModal
        isOpen={isScheduleModalOpen}
        projects={projects}
        scheduleToEdit={editingSchedule}
        onClose={() => {
          setIsScheduleModalOpen(false);
          setEditingSchedule(null);
        }}
        onSuccess={() => {
          fetchSchedules();
          fetchAppsScriptData();
          setAlertMessage({
            type: "success",
            text: editingSchedule
              ? "스케줄 설정이 성공적으로 수정되었습니다."
              : "새 자동화 스케줄(트리거)이 성공적으로 등록되었습니다."
          });
          setEditingSchedule(null);
        }}
      />

      {/* 6. 새 프로젝트 추가 / 수정 원스톱 팝업 모달 */}
      <NewAppsScriptModal
        isOpen={isNewProjectModalOpen}
        initialProject={editTargetProject}
        onClose={() => {
          setIsNewProjectModalOpen(false);
          setEditTargetProject(null);
        }}
        onSuccess={() => {
          fetchAppsScriptData();
          fetchSchedules();
          setAlertMessage({
            type: "success",
            text: editTargetProject
              ? "Apps Script 프로젝트 기능이 성공적으로 수정 및 갱신 배포되었습니다!"
              : "새 Apps Script 프로젝트가 성공적으로 추가 및 주입되었습니다!"
          });
          setEditTargetProject(null);
        }}
      />
    </div>
  );
}
