"use client";

import React from "react";
import { Sparkles, Database, CheckCircle, ShieldAlert, AlertTriangle, BarChart, FileText, Activity, RotateCcw, Undo, Trash2, Paperclip, Send, RefreshCw, X } from "lucide-react";
import DBChartRenderer from "@/components/DBChartRenderer";
import { TuneMessage } from "../types";

export interface StandaloneViewProps {
  tables: any[];
  selectedTable: string;
  sqlQuery: string;
  tableRows: any[];
  consoleResult: any;
  aiChartSpec: any;
  setAiChartSpec: (spec: any) => void;
  aiBriefing: string | null;
  setAiBriefing: (briefing: string | null) => void;
  tunePrompt: string;
  setTunePrompt: (prompt: string) => void;
  tuneHistory: TuneMessage[];
  setTuneHistory: React.Dispatch<React.SetStateAction<TuneMessage[]>>;
  selectedChartPart: string;
  setSelectedChartPart: (part: string) => void;
  attachedImage: string;
  setAttachedImage: (img: string) => void;
  isVisualizing: boolean;
  setIsVisualizing: (val: boolean) => void;
  initialSnapshot: any;
  previousSnapshot: any;
  toast: { message: string; type: "success" | "error" | "warn" } | null;
  showToast: (message: string, type?: "success" | "error" | "warn") => void;
  setIsShareModalOpen: (val: boolean) => void;
  setShareTitle: (title: string) => void;
  setShareInterval: (interval: "NONE" | "HOURLY" | "DAILY" | "WEEKLY") => void;
  setGeneratedShareUrl: (url: string) => void;
  handleTuneChart: (e?: React.FormEvent) => Promise<void>;
  handleResetToOriginal: () => void;
  handleUndoTuning: () => void;
  handleResetChat: () => void;
}

export default function StandaloneView({
  tables,
  selectedTable,
  sqlQuery,
  tableRows,
  consoleResult,
  aiChartSpec,
  setAiChartSpec,
  aiBriefing,
  setAiBriefing,
  tunePrompt,
  setTunePrompt,
  tuneHistory,
  setTuneHistory,
  selectedChartPart,
  setSelectedChartPart,
  attachedImage,
  setAttachedImage,
  isVisualizing,
  setIsVisualizing,
  initialSnapshot,
  previousSnapshot,
  toast,
  showToast,
  setIsShareModalOpen,
  setShareTitle,
  setShareInterval,
  setGeneratedShareUrl,
  handleTuneChart,
  handleResetToOriginal,
  handleUndoTuning,
  handleResetChat,
}: StandaloneViewProps) {
  // ✂️ 영역 선택 및 드래그 캡처 로컬 상태 변수
  const [isAreaSelectMode, setIsAreaSelectMode] = React.useState<boolean>(false);
  const [isSelecting, setIsSelecting] = React.useState<boolean>(false);
  const [startCoords, setStartCoords] = React.useState<{ x: number; y: number } | null>(null);
  const [selectionRect, setSelectionRect] = React.useState<{ x: number; y: number; width: number; height: number } | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const chatEndRef = React.useRef<HTMLDivElement | null>(null);

  // 대화 로그 자동 스크롤 추적
  React.useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [tuneHistory]);

  // ✂️ 차트 시각적 영역 드래그 캡처 및 XMLSerializer 기반 크롭 헬퍼 핸들러
  const handleAreaMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setStartCoords({ x, y });
    setIsSelecting(true);
    setSelectionRect({ x, y, width: 0, height: 0 });
  };

  const handleAreaMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isSelecting || !startCoords) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    const x = Math.min(startCoords.x, currentX);
    const y = Math.min(startCoords.y, currentY);
    const width = Math.abs(startCoords.x - currentX);
    const height = Math.abs(startCoords.y - currentY);

    setSelectionRect({ x, y, width, height });
  };

  const handleAreaMouseUp = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isSelecting || !selectionRect || selectionRect.width < 5 || selectionRect.height < 5) {
      setIsSelecting(false);
      setStartCoords(null);
      return;
    }

    setIsSelecting(false);
    setStartCoords(null);
    setIsAreaSelectMode(false); // 선택 완료 시 모드 자동 해제

    try {
      const container = document.getElementById("chart-capture-target");
      const svgElement = container?.querySelector("svg");

      if (svgElement) {
        // XMLSerializer를 통해 SVG 마크업 문자열 획득
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svgElement);
        const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
        const blobURL = window.URL.createObjectURL(svgBlob);

        const image = new Image();
        image.onload = () => {
          // 고품질 크롭을 위해 2배 스케일 적용
          const canvas = document.createElement("canvas");
          canvas.width = selectionRect.width * 2;
          canvas.height = selectionRect.height * 2;
          const context = canvas.getContext("2d");

          const containerRect = container!.getBoundingClientRect();
          const svgRect = svgElement.getBoundingClientRect();

          // 상대 오프셋 도출
          const svgOffsetLeft = Math.max(0, svgRect.left - containerRect.left);
          const svgOffsetTop = Math.max(0, svgRect.top - containerRect.top);

          let relativeX = Math.max(0, Math.min(selectionRect.x - svgOffsetLeft, svgRect.width - 5));
          let relativeY = Math.max(0, Math.min(selectionRect.y - svgOffsetTop, svgRect.height - 5));

          const scaleX = image.width / svgRect.width;
          const scaleY = image.height / svgRect.height;

          if (context) {
            context.scale(2, 2);
            context.drawImage(
              image,
              relativeX * scaleX,
              relativeY * scaleY,
              selectionRect.width * scaleX,
              selectionRect.height * scaleY,
              0,
              0,
              selectionRect.width,
              selectionRect.height
            );

            const croppedBase64 = canvas.toDataURL("image/png");
            setAttachedImage(croppedBase64);
            setSelectedChartPart(`지정된 시각적 영역 (${Math.round(selectionRect.width)}x${Math.round(selectionRect.height)})`);
            showToast("✓ 선택 영역이 성공적으로 캡처 첨부되었습니다! 챗봇에서 바로 지시해 보세요.", "success");
          }
          window.URL.revokeObjectURL(blobURL);
        };
        image.src = blobURL;
      } else {
        setSelectedChartPart(`지정된 시각적 영역 (x: ${Math.round(selectionRect.x)}, y: ${Math.round(selectionRect.y)})`);
        showToast("✓ 선택 영역이 지정되었습니다.", "success");
      }
    } catch (err: any) {
      console.error("⚠️ 차트 영역 크롭 실패:", err.message);
      setSelectedChartPart(`지정된 시각적 영역 (x: ${Math.round(selectionRect.x)}, y: ${Math.round(selectionRect.y)})`);
      showToast("영역 캡처가 불가하여 좌표 지정으로 대체되었습니다.", "warn");
    }
  };

  // 이미지 분석 첨부 (Vision)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast("파일 크기는 최대 5MB를 초과할 수 없습니다.", "warn");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedImage(reader.result as string);
        showToast("✓ 이미지가 성공적으로 임시 첨부되었습니다.", "success");
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6 pb-20 bg-slate-50/30 p-6 rounded-3xl max-w-7xl mx-auto w-full min-h-screen">
      {/* 🖥️ 스탠드얼론 전용 헤더 */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 select-none">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-6 h-6 text-indigo-500 shrink-0" />
          <div className="flex flex-col leading-tight">
            <h1 className="text-lg font-black text-slate-800 flex items-center gap-1.5">
              AI 지능형 리포트 & 피드백 튜닝 센터
              <span className="text-[9px] bg-indigo-50 border border-indigo-150 text-indigo-650 px-2 py-0.5 rounded-full font-bold">
                독립 작업 모드
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 mt-0.5">
              넓은 전체화면에서 지능형 차트 분석과 챗봇 피드백 튜닝 작업을 쾌적하게 수행합니다.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const fromMatch = sqlQuery.match(/FROM\s+["']?([a-zA-Z0-9_-]+)["']?/i);
              const tName = fromMatch ? fromMatch[1] : selectedTable;
              const dName = tables.find((t) => t.name === tName)?.displayName || tName;
              setShareTitle(`${dName} AI 지능형 통합 리포트`);
              setShareInterval("NONE");
              setGeneratedShareUrl("");
              setIsShareModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black border-none cursor-pointer shadow-3xs transition-all active:scale-95"
            title="현재 튜닝된 지능형 차트와 비즈니스 브리핑 리포트를 퍼블릭 웹에 게시하고 실시간 자동 갱신을 연동합니다."
          >
            <Database className="w-3.5 h-3.5 text-white" />
            🌐 웹에 게시 및 자동 갱신
          </button>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.close();
              }
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black border border-slate-200 cursor-pointer transition-all active:scale-95 shadow-3xs"
            title="독립 작업 모드 창을 닫고 원래 DB 화면으로 복귀합니다."
          >
            창 닫기
          </button>
        </div>
      </div>

      {/* 🛎️ 알림 토스트 컴포넌트 */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 p-4 rounded-xl shadow-2xl border flex items-center gap-3 animate-fade-in ${
            toast.type === "success"
              ? "bg-green-50 text-green-755 border-green-200"
              : toast.type === "error"
              ? "bg-red-50 text-red-755 border-red-200"
              : "bg-amber-50 text-amber-755 border-amber-200"
          }`}
        >
          {toast.type === "success" && <CheckCircle className="w-5 h-5 text-green-650" />}
          {toast.type === "error" && <ShieldAlert className="w-5 h-5 text-red-650" />}
          {toast.type === "warn" && <AlertTriangle className="w-5 h-5 text-amber-650" />}
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* AI 지능형 시각화 & 비즈니스 브리핑 통합 standalone 뷰 */}
      {aiChartSpec ? (
        <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-3xs space-y-6 relative animate-fade-in">
          {/* 통합 대시보드 내 차트 세션 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <BarChart className="w-4 h-4 text-indigo-500" />
                <span className="text-xs font-extrabold text-slate-850">1. AI 지능형 시각화 차트 분석</span>
              </div>
              {aiChartSpec && (
                <button
                  type="button"
                  onClick={() => {
                    setIsAreaSelectMode(!isAreaSelectMode);
                    if (!isAreaSelectMode) {
                      showToast("✂️ 차트에서 원하는 범위를 드래그하여 지정해 주세요.", "success");
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black border transition-all cursor-pointer active:scale-95 select-none ${
                    isAreaSelectMode
                      ? "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700"
                      : "bg-white text-slate-650 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  {isAreaSelectMode ? "영역 선택 중... (드래그)" : "✂️ 화면 영역 지정 수정"}
                </button>
              )}
            </div>
            <div
              id="chart-capture-target"
              className="bg-slate-50 p-4 border border-slate-100 rounded-2xl overflow-hidden relative"
            >
              <DBChartRenderer
                spec={aiChartSpec}
                rows={consoleResult?.rows || tableRows}
                onSelectPart={(partName) => {
                  setSelectedChartPart(partName);
                  showToast(`🎯 수정 대상 지표로 "${partName}"이(가) 지정되었습니다.`, "success");
                }}
              />
              {/* ✂️ 영역 선택 모드 활성화 시 표시되는 투명 오버레이 패널 */}
              {isAreaSelectMode && (
                <div
                  onMouseDown={handleAreaMouseDown}
                  onMouseMove={handleAreaMouseMove}
                  onMouseUp={handleAreaMouseUp}
                  className="absolute inset-0 z-40 bg-slate-900/10 cursor-crosshair select-none rounded-2xl"
                  title="수정하고자 하는 차트 영역을 마우스로 드래그해서 지정하세요"
                >
                  {isSelecting && selectionRect && (
                    <div
                      style={{
                        left: `${selectionRect.x}px`,
                        top: `${selectionRect.y}px`,
                        width: `${selectionRect.width}px`,
                        height: `${selectionRect.height}px`,
                      }}
                      className="absolute border-2 border-dashed border-indigo-500 bg-indigo-500/15 rounded-md shadow-lg pointer-events-none"
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 일체형 대시보드 경계선 (그라데이션 피드) */}
          <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent my-6" />

          {/* 통합 대시보드 내 브리핑 세션 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <FileText className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-extrabold text-slate-850">2. AI 데이터 비즈니스 통찰 및 브리핑 요약</span>
            </div>

            {aiBriefing ? (
              <div className="p-5 bg-[#f0fdf4] border border-emerald-100 rounded-2xl shadow-3xs space-y-3 animate-fade-in">
                <div className="text-xs font-bold leading-relaxed text-slate-700 whitespace-pre-line font-sans">
                  {aiBriefing}
                </div>
              </div>
            ) : (
              <div className="p-6 bg-slate-50 border border-slate-100 border-dashed rounded-2xl flex flex-col items-center justify-center text-center text-slate-400">
                <Activity className="w-6 h-6 text-slate-300 mb-1.5" />
                <p className="text-xs font-bold">비즈니스 브리핑 리포트를 불러오지 못했습니다.</p>
              </div>
            )}
          </div>

          {/* 💡 AI 챗봇 튜닝 대화형 메신저 UI 세션 */}
          <div className="mt-6 border-t border-slate-100 pt-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-black text-slate-700 animate-pulse">
                <Sparkles className="w-4.5 h-4.5 text-indigo-600" />
                <span>AI 지능형 피드백 챗봇 대화</span>
                <span className="text-[9px] bg-indigo-50 border border-indigo-150 text-indigo-600 px-1.5 py-0.5 rounded-full font-bold ml-1">
                  gemini-3.5-flash
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleResetToOriginal}
                  disabled={!initialSnapshot}
                  className={`flex items-center gap-1 text-[10px] bg-transparent border-none outline-none transition-all select-none ${
                    initialSnapshot
                      ? "font-bold text-amber-600 hover:text-amber-700 cursor-pointer active:scale-95 animate-pulse"
                      : "font-medium text-slate-350 cursor-not-allowed opacity-50"
                  }`}
                  title={
                    initialSnapshot
                      ? "AI가 최초 추천했던 원본 차트 및 브리핑 상태로 완전히 돌아가기 (대화 초기화 동반)"
                      : "되돌아갈 최초 차트 정보가 존재하지 않습니다."
                  }
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  처음으로 돌아가기
                </button>

                <button
                  type="button"
                  onClick={handleUndoTuning}
                  disabled={!previousSnapshot}
                  className={`flex items-center gap-1 text-[10px] bg-transparent border-none outline-none transition-all select-none ${
                    previousSnapshot
                      ? "font-bold text-indigo-500 hover:text-indigo-700 cursor-pointer active:scale-95 animate-pulse"
                      : "font-medium text-slate-350 cursor-not-allowed opacity-50"
                  }`}
                  title={
                    previousSnapshot
                      ? "직전 피드백 전송 전의 차트와 대화 이력 상태로 되돌리기 (Undo)"
                      : "되돌릴 수 있는 이전 튜닝 이력이 존재하지 않습니다."
                  }
                >
                  <Undo className="w-3.5 h-3.5" />
                  이전으로 되돌리기
                </button>

                <button
                  type="button"
                  onClick={handleResetChat}
                  disabled={tuneHistory.length === 0}
                  className={`flex items-center gap-1 text-[10px] bg-transparent border-none outline-none transition-all select-none ${
                    tuneHistory.length > 0
                      ? "font-bold text-slate-400 hover:text-rose-500 cursor-pointer active:scale-95"
                      : "font-medium text-slate-355 cursor-not-allowed opacity-50"
                  }`}
                  title={
                    tuneHistory.length > 0
                      ? "대화 내용 및 차트 상태를 최초 추천 상태로 리셋"
                      : "초기화할 대화 내용이 존재하지 않습니다."
                  }
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  대화 초기화
                </button>
              </div>
            </div>

            {/* 대화 메시지 로그 프레임 */}
            <div className="h-[550px] overflow-y-auto chat-scrollbar pl-4 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-4">
              {tuneHistory.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 space-y-2.5">
                  <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center animate-bounce">
                    <Sparkles className="w-4.5 h-4.5 text-indigo-500" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-black text-slate-500">지능형 튜닝 챗봇 대화가 활성화되었습니다.</p>
                    <p className="text-[9px] text-slate-400 leading-relaxed text-center">
                      차트의 범례나 X축 레이블을 클릭하면 [집중 수정 지표] 칩이 자동 연동되어
                      <br />
                      AI에게 정밀 타겟팅된 수정 피드백을 전달할 수 있습니다.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 font-sans text-left">
                  {tuneHistory.map((msg, index) => {
                    if (msg.role === "user") {
                      return (
                        <div key={index} className="flex justify-end items-end gap-2 animate-fade-in pr-0.5">
                          <span className="text-[8px] text-slate-400 font-medium mb-1">{msg.timestamp}</span>
                          <div className="flex flex-col items-end max-w-[80%] mr-2">
                            {msg.image && (
                              <img
                                src={msg.image}
                                className="w-48 h-auto rounded-lg mb-1.5 border border-slate-200 shadow-3xs"
                                alt="첨부 이미지"
                              />
                            )}
                            <div className="bg-blue-600 text-white text-xs px-4 py-2.5 rounded-2xl rounded-tr-none shadow-3xs whitespace-pre-wrap leading-relaxed font-semibold">
                              {msg.text}
                            </div>
                          </div>
                        </div>
                      );
                    } else if (msg.role === "ai") {
                      return (
                        <div key={index} className="flex justify-start items-end gap-2 animate-fade-in">
                          <div className="w-7 h-7 rounded-full bg-indigo-50 border border-indigo-155 flex items-center justify-center shrink-0 shadow-3xs">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                          </div>
                          <div className="flex flex-col items-start max-w-[80%]">
                            <div className="bg-white border border-slate-150 text-slate-800 text-xs px-4 py-2.5 rounded-2xl rounded-tl-none shadow-3xs whitespace-pre-wrap leading-relaxed">
                              {msg.text}
                            </div>
                          </div>
                          <span className="text-[8px] text-slate-400 font-medium mb-1">{msg.timestamp}</span>
                        </div>
                      );
                    } else {
                      if (msg.isNewSkill) {
                        return (
                          <div key={index} className="flex justify-center my-1.5 max-w-[95%] mx-auto animate-pulse">
                            <div className="w-full bg-amber-50 border border-amber-300 rounded-2xl p-3.5 shadow-sm flex items-start gap-2.5">
                              <div className="w-6.5 h-6.5 rounded-full bg-amber-100 flex items-center justify-center shrink-0 shadow-3xs">
                                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                              </div>
                              <div className="flex-1 space-y-1 text-left">
                                <span className="text-[10px] font-black text-amber-800 tracking-wider">
                                  💡 최고관리자 개인화 스킬 스스로 획득
                                </span>
                                <p className="text-xs font-bold text-slate-700 leading-relaxed whitespace-pre-line">
                                  {msg.text}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div key={index} className="flex justify-center my-1 animate-fade-in">
                          <div className="bg-slate-100 border border-slate-200 text-slate-500 text-[10px] px-3 py-1 rounded-full font-bold">
                            {msg.text}
                          </div>
                        </div>
                      );
                    }
                  })}

                  {isVisualizing && (
                    <div className="flex justify-start items-center gap-2 animate-pulse mt-3">
                      <div className="w-7 h-7 rounded-full bg-indigo-50 border border-indigo-155 flex items-center justify-center shrink-0 shadow-3xs">
                        <RefreshCw className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
                      </div>
                      <div className="bg-white border border-slate-150 text-slate-500 text-[10px] px-3.5 py-1.5 rounded-full font-bold shadow-3xs">
                        🤖 AI 지능형 엔진이 최고관리자님의 의견을 반영하여 차트와 브리핑을 정밀 재튜닝하고 있습니다... (약
                        2초 소요)
                      </div>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>
              )}
            </div>

            {/* 숨김형 파일 업로더 */}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleImageUpload}
            />

            {/* 통합형 콤팩트 대화 입력 컨테이너 */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-400 transition-all overflow-hidden flex flex-col shadow-3xs">
              {(selectedChartPart || (attachedImage && attachedImage.length > 50)) && (
                <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-100/60 border-b border-slate-200/80 animate-fade-in text-left">
                  {selectedChartPart && (
                    <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-150 text-indigo-700 text-[10px] font-extrabold px-2.5 py-1 rounded-lg">
                      <span>🎯 집중 수정 지표: {selectedChartPart}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedChartPart("")}
                        className="text-indigo-500 hover:text-indigo-650 font-black cursor-pointer bg-transparent border-none p-0 outline-none text-xs ml-1"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                  {attachedImage && attachedImage.length > 50 && (
                    <div className="relative flex items-center gap-1.5 border border-slate-200 bg-white p-1 rounded-lg shrink-0 shadow-2xs">
                      <img
                        src={attachedImage}
                        className="w-10 h-10 object-contain bg-slate-50 rounded-md block"
                        alt="지정 영역 프리뷰"
                      />
                      <button
                        type="button"
                        onClick={() => setAttachedImage("")}
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 hover:bg-rose-600 text-white text-[9px] font-black flex items-center justify-center cursor-pointer shadow-3xs border border-white"
                        title="지정 영역 삭제"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2.5 py-1.5 px-2.5 min-h-[46px]">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isVisualizing}
                  className="p-2 text-slate-400 hover:text-slate-655 hover:bg-slate-200/50 rounded-xl transition-all cursor-pointer border-none bg-transparent active:scale-95 flex items-center justify-center shrink-0"
                  title="이미지 분석 첨부 (Vision)"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <textarea
                  value={tunePrompt}
                  onChange={(e) => setTunePrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (e.ctrlKey) {
                        e.preventDefault();
                        handleTuneChart();
                      } else if (!e.shiftKey) {
                        e.preventDefault();
                        handleTuneChart();
                      }
                    }
                  }}
                  placeholder={
                    isVisualizing
                      ? "AI 분석 튜닝이 진행 중입니다..."
                      : "AI에게 피드백을 전달해 보세요... (Ctrl+Enter: 전송, Shift+Enter: 줄바꿈)"
                  }
                  disabled={isVisualizing}
                  rows={Math.min(tunePrompt.split("\n").length || 1, 5)}
                  className="flex-1 max-h-32 text-xs bg-transparent border-none outline-none py-1.5 resize-none text-slate-800 placeholder-slate-405 leading-relaxed font-semibold font-sans focus:ring-0 focus:outline-none self-center"
                />

                <button
                  type="button"
                  onClick={() => handleTuneChart()}
                  disabled={isVisualizing || (!tunePrompt.trim() && !attachedImage)}
                  className={`w-9 h-9 rounded-xl transition-all duration-200 shrink-0 border flex items-center justify-center shadow-3xs select-none active:scale-95 ${
                    (!tunePrompt.trim() && !attachedImage) || isVisualizing
                      ? "bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed opacity-90"
                      : "bg-blue-600 hover:bg-blue-700 text-white border-transparent cursor-pointer shadow-sm"
                  }`}
                  title="수정 요청 전송"
                >
                  {isVisualizing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-16 text-center bg-white border border-slate-200 rounded-3xl shadow-sm text-slate-400 flex flex-col items-center justify-center space-y-3">
          <Sparkles className="w-10 h-10 text-indigo-400 animate-pulse" />
          <h3 className="font-bold text-slate-700 text-sm">현재 로드된 지능형 리포트 데이터가 존재하지 않습니다.</h3>
          <p className="text-xs text-slate-400">
            원본 DB 관리 화면에서 쿼리 실행 후 [AI 지능형 시각화 & 브리핑] 탭을 먼저 활성화해 주세요.
          </p>
        </div>
      )}
    </div>
  );
}
