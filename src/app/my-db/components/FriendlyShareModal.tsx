"use client";

import React from "react";
import { Table, X, CheckCircle, ExternalLink, RefreshCw, Sparkles, Filter, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Eye, EyeOff } from "lucide-react";
import { ColumnSchema, FriendlyMapping } from "../types";

export interface FriendlyShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTable: string;
  tableSchema: ColumnSchema[];
  tableRows: any[];
  generatedFriendlyShareUrl: string;
  setGeneratedFriendlyShareUrl: (url: string) => void;
  friendlyShareTableName: string;
  setFriendlyShareTableName: (name: string) => void;
  friendlyAllowCsv: boolean;
  setFriendlyAllowCsv: (allow: boolean) => void;
  friendlyColumnMappings: FriendlyMapping[];
  setFriendlyColumnMappings: (mappings: FriendlyMapping[]) => void;
  friendlySortColumn: string;
  setFriendlySortColumn: (col: string) => void;
  friendlySortDirection: string;
  setFriendlySortDirection: (dir: string) => void;
  isFriendlyRecommendLoading: boolean;
  isFriendlySharing: boolean;
  fetchAIRecommendations: (tableName: string, schema: ColumnSchema[]) => Promise<void>;
  handleCreateFriendlyShare: () => Promise<void>;
  showToast: (message: string, type?: "success" | "error" | "warn") => void;
}

export default function FriendlyShareModal({
  isOpen,
  onClose,
  selectedTable,
  tableSchema,
  tableRows,
  generatedFriendlyShareUrl,
  setGeneratedFriendlyShareUrl,
  friendlyShareTableName,
  setFriendlyShareTableName,
  friendlyAllowCsv,
  setFriendlyAllowCsv,
  friendlyColumnMappings,
  setFriendlyColumnMappings,
  friendlySortColumn,
  setFriendlySortColumn,
  friendlySortDirection,
  setFriendlySortDirection,
  isFriendlyRecommendLoading,
  isFriendlySharing,
  fetchAIRecommendations,
  handleCreateFriendlyShare,
  showToast,
}: FriendlyShareModalProps) {
  // 실시간 컬럼 데이터 필터링용 상태 변수
  const [friendlyFilters, setFriendlyFilters] = React.useState<Record<string, string>>({});
  // 컬럼 가로 드래그앤드롭 순서 변경용 상태 변수
  const [draggedColIndex, setDraggedColIndex] = React.useState<number | null>(null);

  // 실시간 필터 적용된 데이터 연산
  const filteredRows = React.useMemo(() => {
    if (!tableRows) return [];
    return tableRows.filter((row) => {
      return Object.entries(friendlyFilters).every(([colPhysical, filterText]) => {
        if (!filterText) return true;
        const cellValue = row[colPhysical];
        if (cellValue === null || cellValue === undefined) return false;

        const stringVal = typeof cellValue === "object" ? JSON.stringify(cellValue) : String(cellValue);
        return stringVal.toLowerCase().includes(filterText.toLowerCase());
      });
    });
  }, [tableRows, friendlyFilters]);

  // 컬럼 좌우 이동 함수
  const moveFriendlyColumn = (index: number, direction: "left" | "right") => {
    if (direction === "left" && index === 0) return;
    if (direction === "right" && index === friendlyColumnMappings.length - 1) return;

    const targetIndex = direction === "left" ? index - 1 : index + 1;
    const newMappings = [...friendlyColumnMappings];

    const temp = newMappings[index];
    newMappings[index] = newMappings[targetIndex];
    newMappings[targetIndex] = temp;

    setFriendlyColumnMappings(newMappings);
  };

  // 드래그 앤 드롭 이벤트 핸들러
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedColIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedColIndex === null || draggedColIndex === targetIndex) return;

    const newMappings = [...friendlyColumnMappings];
    const draggedCol = newMappings[draggedColIndex];

    // 제거 후 삽입
    newMappings.splice(draggedColIndex, 1);
    newMappings.splice(targetIndex, 0, draggedCol);

    setFriendlyColumnMappings(newMappings);
    setDraggedColIndex(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-100 flex flex-col w-screen h-screen overflow-hidden animate-fade-in text-left">
      {/* 🌌 최상단 프리미엄 헤더바 (네온 그라데이션 라인 결합) */}
      <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
      <div className="p-5 border-b border-slate-200 bg-white flex items-center justify-between shadow-xs shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-655 font-black shadow-3xs">
            <Table className="w-5 h-5 text-indigo-600 animate-pulse" />
          </div>
          <div className="space-y-0.5">
            <h3 className="font-extrabold text-slate-900 text-sm md:text-base flex items-center gap-1.5">
              👥 데이터 공유 테이블 뷰 생성 대시보드
            </h3>
            <p className="text-[10px] text-slate-400 font-bold">
              물리 테이블 명: <span className="font-mono text-indigo-550 font-extrabold">{selectedTable}</span>
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-650 rounded-full border-none bg-transparent cursor-pointer transition-all active:scale-90"
          title="창 닫기 (취소)"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* 🚀 메인 본문 영역 (스크롤 최적화 & 풀 레이아웃) */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
        {generatedFriendlyShareUrl ? (
          // 🏆 [A방안] 발행 완료 성공 카드 화면 (대형 프리미엄 성공 안내)
          <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-3xl p-8 shadow-2xl text-center space-y-6 animate-zoom-in my-12">
            <div className="w-16 h-16 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center mx-auto text-indigo-600 shadow-3xs">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h4 className="text-base md:text-lg font-black text-slate-800">
                데이터 공유 뷰가 성공적으로 생성되었습니다!
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed max-w-lg mx-auto">
                지정한 한국어 타이틀과 필터링된 데이터 컬럼 구조가 반영되었습니다. 민감한 정보(비밀번호, 삭제자 등)가 완벽히 은폐된 안전한 공유 링크입니다.
              </p>
            </div>

            <div className="flex items-center gap-2.5 p-4 bg-slate-50 border border-slate-200 rounded-2xl select-all font-mono text-xs text-slate-650 justify-between">
              <span className="truncate pr-4 select-all">{generatedFriendlyShareUrl}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generatedFriendlyShareUrl);
                  showToast("공유 뷰어 링크가 클립보드에 무사히 복사되었습니다!", "success");
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black shrink-0 border-none cursor-pointer hover:bg-indigo-500 shadow-3xs transition-all active:scale-95"
              >
                복사
              </button>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
              <a
                href={generatedFriendlyShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3 bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 rounded-xl text-xs font-black text-center cursor-pointer shadow-3xs transition-all flex items-center justify-center gap-2 text-decoration-none active:scale-95"
              >
                <ExternalLink className="w-4 h-4" />
                공유 페이지 바로가기
              </a>
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-750 text-white rounded-xl text-xs font-extrabold border border-slate-800 cursor-pointer shadow-3xs transition-all active:scale-95"
              >
                대시보드 닫기
              </button>
            </div>
          </div>
        ) : (
          // ⚙️ [B방안] 풀스크린 세팅 폼 대시보드
          <div className="max-w-7xl mx-auto space-y-6">
            {/* 🤖 AI 지능형 실시간 자동 분석/로딩 진행 패널 */}
            {isFriendlyRecommendLoading && (
              <div className="bg-indigo-50/70 border border-indigo-150 rounded-2xl p-4 flex items-center justify-between animate-pulse shadow-3xs text-left">
                <div className="flex items-center gap-3 text-xs font-black text-indigo-700">
                  <RefreshCw className="w-5 h-5 animate-spin text-indigo-600 shrink-0" />
                  <div className="space-y-0.5 text-left">
                    <span className="block font-extrabold text-[12px] text-indigo-900">
                      🤖 AI 지능형 가드레일 분석기 가동 중...
                    </span>
                    <span className="block text-[10px] text-indigo-500 font-medium">
                      테이블의 비즈니스 목적을 파악하고 개인정보 및 민감데이터 4단계 비식별화 필터링 설정을 자동 완성하고 있습니다.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 1. 상단 기본 세팅 블록 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-3xs grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 테이블 한글 명칭 */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  📌 공유용 한글 테이블 명칭
                </label>
                <input
                  type="text"
                  value={friendlyShareTableName}
                  onChange={(e) => setFriendlyShareTableName(e.target.value)}
                  placeholder="예: 단골 고객 연락처 대장, 지출 승인 명세서..."
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-xs text-slate-700 font-semibold transition-all placeholder:text-slate-400 shadow-3xs"
                />
                <p className="text-[10px] text-slate-400 font-medium">
                  공유 링크의 웹 타이틀 및 엑셀 다운로드 파일명으로 사용됩니다.
                </p>
              </div>

              {/* CSV 다운로드 토글 */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  📥 엑셀/CSV 백업 다운로드 권한
                </label>
                <div className="flex items-center gap-3 h-[42px] bg-slate-50 border border-slate-200 rounded-xl px-4">
                  <input
                    type="checkbox"
                    id="friendlyAllowCsv"
                    checked={friendlyAllowCsv}
                    onChange={(e) => setFriendlyAllowCsv(e.target.checked)}
                    className="w-4.5 h-4.5 rounded text-indigo-600 border-slate-350 focus:ring-indigo-555 cursor-pointer"
                  />
                  <label htmlFor="friendlyAllowCsv" className="text-xs font-black text-slate-655 cursor-pointer select-none">
                    사용자들이 웹 뷰어 화면에서 데이터를 CSV 엑셀 파일로 내려받도록 허용합니다.
                  </label>
                </div>
                <p className="text-[10px] text-slate-400 font-medium">
                  보안 유지를 위해 다운로드 파일 역시 숨김(`visible: false`) 처리된 컬럼은 자동 누락됩니다.
                </p>
              </div>
            </div>

            {/* 2. Notion/Airtable 스타일의 가로형 컬럼 & 데이터 그리드 시뮬레이터 */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-3xs overflow-hidden flex flex-col text-left">
              <div className="p-4 bg-slate-50/70 border-b border-slate-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    🧬 Notion/Airtable형 컬럼 맵핑 & 멀티 정렬 시뮬레이터 (실시간 반영)
                  </h4>
                  <p className="text-[10px] text-slate-400 font-medium font-sans">
                    컬럼들이 가로 방향으로 나열되며 실제 데이터 행이 실시간 매핑됩니다. 공개 숨김 컬럼은 비주얼 피드백으로 즉각 숨김 마스킹 처리가 시뮬레이션됩니다.
                  </p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => fetchAIRecommendations(selectedTable, tableSchema)}
                    disabled={isFriendlyRecommendLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 border-none text-white rounded-xl text-[10px] font-black shadow-3xs cursor-pointer transition-all active:scale-95 disabled:opacity-50 select-none shrink-0"
                    title="AI를 통해 한글 테이블 명칭, 각 컬럼의 한글 별칭, 민감데이터 숨김 가드레일을 1초 만에 자동 완성합니다."
                  >
                    <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
                    🤖 AI 지능형 자동 추천 채우기
                  </button>

                  <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 border border-indigo-150 px-2.5 py-0.5 rounded-full select-none animate-pulse">
                    총 {friendlyColumnMappings.length}개 컬럼
                  </span>
                </div>
              </div>

              {/* 실시간 데이터 테이블 가로형 스크롤 프레임 */}
              <div className="overflow-x-auto w-full border-t border-slate-100 bg-white" style={{ maxWidth: "100%" }}>
                <table className="min-w-max text-left border-collapse table-fixed w-full">
                  {/* 1. 컬럼 매핑 헤더 영역 */}
                  <thead>
                    <tr className="bg-slate-50/30 border-b border-slate-200 divide-x divide-slate-150">
                      {friendlyColumnMappings.map((col, idx) => (
                        <th
                          key={col.physical}
                          draggable={col.visible}
                          onDragStart={(e) => handleDragStart(e, idx)}
                          onDragOver={(e) => handleDragOver(e, idx)}
                          onDrop={(e) => handleDrop(e, idx)}
                          className={`px-4 py-4 w-72 min-w-[288px] max-w-[288px] transition-all duration-200 cursor-grab active:cursor-grabbing select-none relative group ${
                            !col.visible ? "bg-slate-100/50 opacity-60" : "bg-white hover:bg-slate-50/50"
                          }`}
                          title={col.visible ? "이 컬럼 헤더를 좌우로 드래그하여 순서를 변경할 수 있습니다." : ""}
                        >
                          <div className="space-y-3.5">
                            {/* 컬럼 물리명 & 순서이동 & 노출제어 */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] font-bold font-mono text-slate-400 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded select-all">
                                  {col.physical}
                                </span>
                                {/* 좌우 이동 간편 버튼 (hover 시 노출) */}
                                {col.visible && (
                                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-slate-200 rounded-md p-0.5 gap-0.5 shadow-3xs z-10">
                                    <button
                                      type="button"
                                      disabled={idx === 0}
                                      onClick={() => moveFriendlyColumn(idx, "left")}
                                      className="p-0.5 text-slate-400 hover:text-indigo-650 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent rounded border-none bg-transparent cursor-pointer animate-fade-in"
                                      title="왼쪽으로 이동"
                                    >
                                      <ArrowLeft className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={idx === friendlyColumnMappings.length - 1}
                                      onClick={() => moveFriendlyColumn(idx, "right")}
                                      className="p-0.5 text-slate-400 hover:text-indigo-650 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent rounded border-none bg-transparent cursor-pointer animate-fade-in"
                                      title="오른쪽으로 이동"
                                    >
                                      <ArrowRight className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                              {/* 눈모양 👁️/🙈 노출제어 버튼 */}
                              <button
                                type="button"
                                onClick={() => {
                                  const newMappings = [...friendlyColumnMappings];
                                  newMappings[idx].visible = !col.visible;
                                  if (!newMappings[idx].visible) {
                                    newMappings[idx].sortDirection = "NONE";
                                    newMappings[idx].sortOrder = 0;
                                  }
                                  setFriendlyColumnMappings(newMappings);
                                }}
                                className={`inline-flex items-center justify-center p-1.5 border rounded-lg transition-all active:scale-95 cursor-pointer ${
                                  col.visible
                                    ? "bg-indigo-50 border-indigo-200 text-indigo-650 hover:bg-indigo-100 hover:border-indigo-300"
                                    : "bg-slate-100 border-slate-250 text-slate-400 hover:bg-slate-200"
                                }`}
                                title={col.visible ? "현재 공유 노출 상태 (클릭시 숨김)" : "현재 공유 숨김 상태 (클릭시 노출)"}
                              >
                                {col.visible ? (
                                  <Eye className="w-3.5 h-3.5 text-indigo-650" />
                                ) : (
                                  <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                                )}
                              </button>
                            </div>

                            {/* 한글 표시명 인풋 */}
                            <div className="space-y-1">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                                한글 표시명 (별칭)
                              </span>
                              <input
                                type="text"
                                value={col.friendly}
                                disabled={!col.visible}
                                onChange={(e) => {
                                  const newMappings = [...friendlyColumnMappings];
                                  newMappings[idx].friendly = e.target.value;
                                  setFriendlyColumnMappings(newMappings);
                                }}
                                placeholder="한글 별칭 입력..."
                                className="w-full px-2.5 py-1.5 bg-white disabled:bg-slate-50 border border-slate-250 focus:border-indigo-500 rounded-lg outline-none text-xs text-slate-700 font-semibold transition-colors disabled:text-slate-400 shadow-3xs"
                              />
                            </div>

                            {/* 실시간 컬럼 필터 인풋 추가 */}
                            <div className="space-y-1">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                <Filter className="w-2.5 h-2.5" /> 실시간 데이터 필터
                              </span>
                              <input
                                type="text"
                                value={friendlyFilters[col.physical] || ""}
                                disabled={!col.visible}
                                onChange={(e) => {
                                  setFriendlyFilters({
                                    ...friendlyFilters,
                                    [col.physical]: e.target.value,
                                  });
                                }}
                                placeholder="필터 검색어 입력..."
                                className="w-full px-2.5 py-1.5 bg-white disabled:bg-slate-50 border border-slate-250 focus:border-indigo-500 rounded-lg outline-none text-xs text-slate-700 font-semibold transition-colors disabled:text-slate-400 shadow-3xs"
                              />
                            </div>

                            {/* 정렬 제어 영역 */}
                            <div className="space-y-1">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                                멀티 정렬 및 우선순위
                              </span>

                              <div className="flex items-center gap-1.5">
                                {/* 정렬 방향 토글식 버튼 (글자 대신 화살표 아이콘으로 전격 교체) */}
                                <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200 select-none flex-1">
                                  <button
                                    type="button"
                                    disabled={!col.visible}
                                    onClick={() => {
                                      const newMappings = [...friendlyColumnMappings];
                                      newMappings[idx].sortDirection = "NONE";
                                      newMappings[idx].sortOrder = 0;
                                      setFriendlyColumnMappings(newMappings);
                                    }}
                                    className={`flex-1 py-1 text-[9px] font-black rounded-md border-none transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                                      col.sortDirection === "NONE"
                                        ? "bg-white text-slate-700 shadow-3xs"
                                        : "text-slate-450 bg-transparent hover:text-slate-655"
                                    }`}
                                    title="정렬 해제"
                                  >
                                    안함
                                  </button>
                                  <button
                                    type="button"
                                    disabled={!col.visible}
                                    onClick={() => {
                                      const newMappings = [...friendlyColumnMappings];
                                      newMappings[idx].sortDirection = "ASC";
                                      if (!col.sortOrder || col.sortOrder === 0) {
                                        const maxOrder = Math.max(...newMappings.map((m) => m.sortOrder || 0), 0);
                                        newMappings[idx].sortOrder = maxOrder + 1;
                                      }
                                      setFriendlyColumnMappings(newMappings);
                                    }}
                                    className={`flex-1 py-1 text-[9px] font-black rounded-md border-none transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center ${
                                      col.sortDirection === "ASC"
                                        ? "bg-indigo-50 text-indigo-650 shadow-3xs"
                                        : "text-slate-450 bg-transparent hover:text-slate-655"
                                    }`}
                                    title="오름차순 (ASC)"
                                  >
                                    <ArrowUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={!col.visible}
                                    onClick={() => {
                                      const newMappings = [...friendlyColumnMappings];
                                      newMappings[idx].sortDirection = "DESC";
                                      if (!col.sortOrder || col.sortOrder === 0) {
                                        const maxOrder = Math.max(...newMappings.map((m) => m.sortOrder || 0), 0);
                                        newMappings[idx].sortOrder = maxOrder + 1;
                                      }
                                      setFriendlyColumnMappings(newMappings);
                                    }}
                                    className={`flex-1 py-1 text-[9px] font-black rounded-md border-none transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center ${
                                      col.sortDirection === "DESC"
                                        ? "bg-indigo-50 text-indigo-650 shadow-3xs"
                                        : "text-slate-450 bg-transparent hover:text-slate-655"
                                    }`}
                                    title="내림차순 (DESC)"
                                  >
                                    <ArrowDown className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                {/* 다단계 정렬 순위 드롭다운 */}
                                <select
                                  value={col.sortOrder || 0}
                                  disabled={!col.visible || col.sortDirection === "NONE"}
                                  onChange={(e) => {
                                    const newMappings = [...friendlyColumnMappings];
                                    newMappings[idx].sortOrder = Number(e.target.value);
                                    setFriendlyColumnMappings(newMappings);
                                  }}
                                  className="text-[9px] font-extrabold outline-none bg-white border border-slate-200 disabled:bg-slate-50 disabled:text-slate-350 disabled:cursor-not-allowed rounded-lg px-1.5 py-1 text-slate-700 cursor-pointer shadow-3xs focus:border-indigo-500 w-16"
                                >
                                  <option value={0}>없음</option>
                                  <option value={1}>1순위</option>
                                  <option value={2}>2순위</option>
                                  <option value={3}>3순위</option>
                                  <option value={4}>4순위</option>
                                  <option value={5}>5순위</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  {/* 2. 실제 데이터 행 실시간 시뮬레이션 영역 */}
                  <tbody className="divide-y divide-slate-150 bg-white">
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={friendlyColumnMappings.length}
                          className="px-4 py-12 text-center text-xs font-bold text-slate-400 bg-slate-50/50"
                        >
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <Filter className="w-6 h-6 text-slate-300" />
                            <span>현재 설정된 필터 조건에 부합하는 레코드가 없습니다.</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredRows.slice(0, 5).map((row, rowIdx) => (
                        <tr key={rowIdx} className="hover:bg-slate-50/20 divide-x divide-slate-100 transition-colors">
                          {friendlyColumnMappings.map((col) => {
                            const cellValue = row[col.physical];
                            const isVisible = col.visible;

                            return (
                              <td
                                key={col.physical}
                                className={`px-4 py-3 text-xs transition-all duration-200 font-medium ${
                                  !isVisible
                                    ? "bg-slate-50/80 text-slate-300 line-through select-none font-mono opacity-50 relative animate-fade-in"
                                    : "text-slate-700"
                                }`}
                              >
                                {!isVisible ? (
                                  <span className="inline-flex items-center gap-1 bg-slate-200 border border-slate-250 text-[9px] px-1.5 py-0.5 rounded-md font-sans no-underline font-extrabold select-none">
                                    🔒 숨김 처리됨
                                  </span>
                                ) : cellValue !== null && cellValue !== undefined ? (
                                  typeof cellValue === "object" ? (
                                    JSON.stringify(cellValue)
                                  ) : (
                                    String(cellValue)
                                  )
                                ) : (
                                  <span className="text-slate-300 font-sans italic text-[10px]">NULL</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. 하단 보안 안내 보드 */}
            <div className="p-4 bg-indigo-50/40 border border-indigo-100 rounded-2xl text-[10px] text-indigo-750 font-medium leading-relaxed text-left flex items-start gap-2 select-none shadow-3xs">
              <span className="shrink-0 text-xs">🔒</span>
              <div className="space-y-0.5">
                <strong>엔터프라이즈급 멀티 컬럼 데이터 정제 가드레일:</strong>
                데이터 공유 뷰 대시보드는 다단계 정렬(`ORDER BY col1 DESC, col2 ASC`) 명세와 컬럼 마스킹 규칙을 Next.js API
                레벨에 직접 적용시킵니다. 노출 여부를 숨김(`visible: false`) 처리한 컬럼은 백엔드 물리적 쿼리문 스코프에서 완전
                영구 배제되어 클라이언트에 데이터 흐름이 원천 단절되므로 안전합니다.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 🏁 하단 액션 도구막대 (푸터 - 폼 미발행 시에만 노출) */}
      {!generatedFriendlyShareUrl && (
        <div className="p-4.5 border-t border-slate-200 bg-white flex items-center justify-end gap-2.5 shrink-0 shadow-xs">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-white border border-slate-250 hover:bg-slate-50 text-slate-650 rounded-xl text-xs font-bold cursor-pointer transition-all active:scale-95 shadow-3xs"
          >
            취소하고 닫기
          </button>
          <button
            type="button"
            onClick={handleCreateFriendlyShare}
            disabled={isFriendlySharing}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl text-xs font-black shadow-sm border-none cursor-pointer transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
          >
            {isFriendlySharing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin mr-0.5 text-white" />
                공유 뷰 발행 등록 중...
              </>
            ) : (
              <>
                <ExternalLink className="w-3.5 h-3.5 text-white" />
                데이터 공유 뷰 생성하기
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
