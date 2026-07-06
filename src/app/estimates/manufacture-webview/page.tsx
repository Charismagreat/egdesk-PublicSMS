"use client";

import { apiFetch } from '@/lib/api';
import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { FileText, Search, RefreshCw, X, Download, ArrowUp, ArrowDown, Eye, Printer, Sun, Moon } from "lucide-react";

// 제조업 견적 대장 헤더 명세 (비용 열들을 단일 '구분' 컬럼으로 압축)
const HEADERS = [
  "견적번호", "수신바이어", "연락처", "담당자명", "총 견적액", "상태", "작성일", "등록일시",
  "연계수주번호", "구분", "품목코드", "품목명", "품목비고", "규격", "수량", "단가", "금액",
  "품목납기일", "상세비고"
];

const DEFAULT_VISIBLE = [
  "견적번호", "수신바이어", "총 견적액", "상태", "작성일", 
  "구분", "품목명", "품목비고", "수량", "단가", "금액",
  "상세비고"
];

export default function ManufactureWebView() {
  const [data, setData] = useState<{
    title: string;
    headers: string[];
    rows: any[][];
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [isColSelectorOpen, setIsColSelectorOpen] = useState(false);
  const [activeMemo, setActiveMemo] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // 컬럼 선택 드롭다운용 좌표 계산
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const updateCoords = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY + 8,
        left: rect.right - 256 + window.scrollX
      });
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isColSelectorOpen) {
      updateCoords();
      window.addEventListener("resize", updateCoords);
      window.addEventListener("scroll", updateCoords, true);
    }
    return () => {
      window.removeEventListener("resize", updateCoords);
      window.removeEventListener("scroll", updateCoords, true);
    };
  }, [isColSelectorOpen]);

  // 1. 실시간 API 연동 및 데이터 패치
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/estimates?action=list&_t=${Date.now()}`);
      const json = await res.json();
      if (json.success && json.estimates) {
        const outboundList = json.estimates.filter((e: any) => {
          if (e.type !== "OUTBOUND") return false;
          if (e.tags) {
            try {
              const parsedTags = typeof e.tags === "string" ? JSON.parse(e.tags) : e.tags;
              return parsedTags.is_manufacture === true || parsedTags.is_manufacture === 1;
            } catch {
              return e.tags.includes('"is_manufacture":true') || e.tags.includes('is_manufacture');
            }
          }
          return false;
        });

        const tempRows: any[][] = [];

        outboundList.forEach((e: any) => {
          // 견적 마스터 태그에서 간접비 추출
          let masterTagsObj: any = {};
          if (e.tags) {
            try {
              masterTagsObj = typeof e.tags === "string" ? JSON.parse(e.tags) : e.tags;
            } catch {}
          }
          const generalCost = Number(masterTagsObj.generalAdminCost) || 0;
          const profitCost = Number(masterTagsObj.businessProfit) || 0;
          const etcCost = Number(masterTagsObj.materialManageCost) || 0;

          const estItems = e.items && e.items.length > 0 ? e.items : [];
          
          // A. 일반 품목들 (원부자재, 직접가공, 외주가공) 푸시
          estItems.forEach((item: any) => {
            let itemSpecObj: any = null;
            if (item.spec) {
              try {
                if (String(item.spec).trim().startsWith("{")) {
                  itemSpecObj = JSON.parse(item.spec);
                }
              } catch {}
            }
            const itemType = itemSpecObj?.type || (item.item_code === 'PROC-DIR' ? 'DIRECT_PROCESS' : item.item_code === 'PROC-OUT' ? 'OUTSOURCE_PROCESS' : 'MATERIAL');
            const itemAmount = Number(item.amount) || (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);

            // 구분 값 맵핑
            let division = "재료비";
            if (itemType === "DIRECT_PROCESS") division = "직접가공비";
            else if (itemType === "OUTSOURCE_PROCESS") division = "외주가공비";

            const displaySpec = itemSpecObj 
              ? (itemSpecObj.spec !== undefined && itemSpecObj.spec !== null ? itemSpecObj.spec : "-")
              : (item.spec || "-");

            tempRows.push([
              e.id,                                                 // 0: 견적번호
              e.partner_name,                                       // 1: 수신바이어
              e.partner_phone || "-",                               // 2: 연락처
              e.partner_manager || "-",                             // 3: 담당자명
              e.total_amount,                                       // 4: 총 견적액
              e.direction_status === "SENT" ? "견적발송" : "수주수락", // 5: 상태
              e.created_at ? e.created_at.substring(0, 10) : "-",    // 6: 작성일
              e.created_at || "-",                                  // 7: 등록일시
              e.sales_order_number || "-",                          // 8: 연계수주번호
              division,                                             // 9: 구분 (품목명 바로 앞)
              item.item_code || "-",                                // 10: 품목코드
              item.product_name || "-",                              // 11: 품목명
              itemSpecObj?.remark || "-",                           // 12: 품목비고
              displaySpec || "-",                                   // 13: 규격
              item.quantity !== undefined ? item.quantity : "",        // 14: 수량
              item.unit_price !== undefined ? item.unit_price : "",    // 15: 단가
              itemAmount,                                           // 16: 금액
              item.delivery_date || "-",                            // 17: 품목납기일
              e.document_memo_search || "-"                         // 18: 상세비고
            ]);
          });

          // B. 일반관리비 행 추가 (존재 시)
          if (generalCost > 0) {
            tempRows.push([
              e.id,
              e.partner_name,
              e.partner_phone || "-",
              e.partner_manager || "-",
              e.total_amount,
              e.direction_status === "SENT" ? "견적발송" : "수주수락",
              e.created_at ? e.created_at.substring(0, 10) : "-",
              e.created_at || "-",
              e.sales_order_number || "-",
              "일반관리비",                                            // 9: 구분
              "-",                                                  // 10: 품목코드
              "일반관리비 (가공비의 10%)",                             // 11: 품목명
              "-",                                                  // 12: 품목비고
              "-",                                                  // 13: 규격
              1,                                                    // 14: 수량
              generalCost,                                          // 15: 단가
              generalCost,                                          // 16: 금액
              "-",                                                  // 17: 품목납기일
              e.document_memo_search || "-"                         // 18: 상세비고
            ]);
          }

          // C. 기업이윤 행 추가 (존재 시)
          if (profitCost > 0) {
            tempRows.push([
              e.id,
              e.partner_name,
              e.partner_phone || "-",
              e.partner_manager || "-",
              e.total_amount,
              e.direction_status === "SENT" ? "견적발송" : "수주수락",
              e.created_at ? e.created_at.substring(0, 10) : "-",
              e.created_at || "-",
              e.sales_order_number || "-",
              "기업이윤",                                              // 9: 구분
              "-",                                                  // 10: 품목코드
              "기업이윤 (가공비+관리비의 10%)",                         // 11: 품목명
              "-",                                                  // 12: 품목비고
              "-",                                                  // 13: 규격
              1,                                                    // 14: 수량
              profitCost,                                           // 15: 단가
              profitCost,                                           // 16: 금액
              "-",                                                  // 17: 품목납기일
              e.document_memo_search || "-"                         // 18: 상세비고
            ]);
          }

          // D. 기타비용(재료관리비) 행 추가 (존재 시)
          if (etcCost > 0) {
            tempRows.push([
              e.id,
              e.partner_name,
              e.partner_phone || "-",
              e.partner_manager || "-",
              e.total_amount,
              e.direction_status === "SENT" ? "견적발송" : "수주수락",
              e.created_at ? e.created_at.substring(0, 10) : "-",
              e.created_at || "-",
              e.sales_order_number || "-",
              "기타비용",                                              // 9: 구분
              "-",                                                  // 10: 품목코드
              "기타비용 (재료관리비의 5%)",                             // 11: 품목명
              "-",                                                  // 12: 품목비고
              "-",                                                  // 13: 규격
              1,                                                    // 14: 수량
              etcCost,                                              // 15: 단가
              etcCost,                                              // 16: 금액
              "-",                                                  // 17: 품목납기일
              e.document_memo_search || "-"                         // 18: 상세비고
            ]);
          }
        });

        setData({
          title: "(제조)보낸 견적서 상세 내역",
          headers: HEADERS,
          rows: tempRows
        });

        // 로컬스토리지 설정 불러오기 (캐시 초기화용 v5 스키마 명명)
        if (typeof window !== "undefined") {
          const savedColumns = localStorage.getItem("egdesk_est_webview_cols_v5_manufacture_outbound");
          const savedVisible = localStorage.getItem("egdesk_est_webview_visible_v5_manufacture_outbound");
          
          if (savedColumns && savedVisible) {
            try {
              const parsedCols = JSON.parse(savedColumns) as string[];
              const parsedVisible = JSON.parse(savedVisible) as string[];
              
              const filteredCols = parsedCols.filter(c => HEADERS.includes(c));
              const missingCols = HEADERS.filter(c => !filteredCols.includes(c));
              setColumns([...filteredCols, ...missingCols]);
              setVisibleColumns(parsedVisible.filter(c => HEADERS.includes(c)));
            } catch {
              setColumns(HEADERS);
              setVisibleColumns(DEFAULT_VISIBLE);
            }
          } else {
            setColumns(HEADERS);
            setVisibleColumns(DEFAULT_VISIBLE);
          }
        } else {
          setColumns(HEADERS);
          setVisibleColumns(DEFAULT_VISIBLE);
        }
      }
    } catch (e) {
      console.error("제조업 견적서 발송 데이터 로딩 실패:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSortKey(7); // 기본 정렬: 등록일시 (7번 인덱스)
    setSortDir("desc");
    fetchData();
  }, []);

  // 2. 검색 필터링
  const filteredRows = useMemo(() => {
    if (!data) return [];
    if (!search.trim()) return data.rows;
    
    const term = search.toLowerCase();
    return data.rows.filter((row) =>
      row.some((val) => String(val).toLowerCase().includes(term))
    );
  }, [data, search]);

  // 3. 정렬 파이프라인
  const sortedRows = useMemo(() => {
    if (sortKey === null) return filteredRows;

    return [...filteredRows].sort((a, b) => {
      let valA = a[sortKey];
      let valB = b[sortKey];

      const numA = Number(String(valA).replace(/[^0-9.-]/g, ""));
      const numB = Number(String(valB).replace(/[^0-9.-]/g, ""));
      
      if (!isNaN(numA) && !isNaN(numB)) {
        return sortDir === "asc" ? numA - numB : numB - numA;
      }

      valA = String(valA).toLowerCase();
      valB = String(valB).toLowerCase();
      return sortDir === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });
  }, [filteredRows, sortKey, sortDir]);

  // 4. 페이지네이션
  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedRows.slice(startIndex, startIndex + pageSize);
  }, [sortedRows, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedRows.length / pageSize) || 1;

  const handleSort = (index: number) => {
    if (sortKey === index) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(index);
      setSortDir("asc");
    }
    setCurrentPage(1);
  };

  // CSV/엑셀 백업 내보내기
  const handleExportCsv = () => {
    if (!data) return;

    const activeHeaders = columns.filter((h) => visibleColumns.includes(h));
    const headerIndices = activeHeaders.map((h) => data.headers.indexOf(h));

    const activeRows = data.rows.map((row) =>
      headerIndices.map((idx) => (idx !== -1 ? row[idx] : ""))
    );

    const csvContent =
      "\ufeff" +
      [
        activeHeaders.join(","),
        ...activeRows.map((r) =>
          r.map((val: any) => `"${String(val).replace(/"/g, '""')}"`).join(",")
        ),
      ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `제조_견적서_상세대장_${new Date().toISOString().substring(0, 10)}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 컬럼 표시 설정 제어
  const saveColumnSettings = (newCols: string[], newVisible: string[]) => {
    setColumns(newCols);
    setVisibleColumns(newVisible);
    if (typeof window !== "undefined") {
      localStorage.setItem("egdesk_est_webview_cols_v5_manufacture_outbound", JSON.stringify(newCols));
      localStorage.setItem("egdesk_est_webview_visible_v5_manufacture_outbound", JSON.stringify(newVisible));
    }
  };

  const toggleColumn = (colName: string) => {
    const nextVisible = visibleColumns.includes(colName)
      ? visibleColumns.filter((c) => c !== colName)
      : [...visibleColumns, colName];
    saveColumnSettings(columns, nextVisible);
  };

  const toggleAllColumns = () => {
    if (!data) return;
    const nextVisible = visibleColumns.length === data.headers.length
      ? [data.headers[0]]
      : [...data.headers];
    saveColumnSettings(columns, nextVisible);
  };

  const moveColumn = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === columns.length - 1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const newColumns = [...columns];
    const temp = newColumns[index];
    newColumns[index] = newColumns[targetIndex];
    newColumns[targetIndex] = temp;
    saveColumnSettings(newColumns, visibleColumns);
  };

  const resetToDefaultColumns = () => {
    if (!data) return;
    saveColumnSettings(HEADERS, DEFAULT_VISIBLE);
    setSortKey(7); // 기본: 등록일시
    setSortDir("desc");
  };

  // 인쇄 및 다이렉트 PDF
  const handlePrintPdf = (estId: string) => {
    window.open(`/estimates/print-pdf?id=${estId}`, "_blank", "width=850,height=1000,scrollbars=yes");
  };

  const handleDownloadPdf = (estId: string) => {
    const link = document.createElement("a");
    link.href = `/api/estimates/download?id=${estId}`;
    link.setAttribute("download", `Estimate_${estId}.pdf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading || !data) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-slate-955 text-slate-350' : 'bg-slate-50 text-slate-600'} flex flex-col items-center justify-center font-sans p-6 transition-colors duration-300`}>
        <div className="w-16 h-16 border-4 border-indigo-650 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-black tracking-wide text-indigo-500 animate-pulse">실시간 제조업 발송 대장을 연계 조회 중입니다...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${
      isDarkMode 
        ? "bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950 text-slate-100" 
        : "bg-gradient-to-tr from-slate-50 via-slate-100 to-indigo-50/30 text-slate-800"
    } font-sans p-3 md:p-5 transition-colors duration-300 relative overflow-x-hidden w-full`}>
      {/* 럭셔리 네온 광원 */}
      <div className={`absolute top-10 left-10 w-80 h-80 ${isDarkMode ? 'bg-indigo-600/10' : 'bg-indigo-400/5'} rounded-full blur-3xl -z-10 animate-pulse`}></div>
      <div className={`absolute bottom-10 right-10 w-96 h-96 ${isDarkMode ? 'bg-purple-600/5' : 'bg-purple-400/5'} rounded-full blur-3xl -z-10`}></div>

      <div className="w-full space-y-4">
        {/* 상단 헤더 패널 */}
        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          isDarkMode 
            ? "bg-slate-900/90 border-white/10 shadow-2xl shadow-slate-950/50" 
            : "bg-white border-slate-200 shadow-xl shadow-slate-100/50"
        } border p-5 rounded-3xl transition-all duration-300`}>
          <div>
            <span className={`${
              isDarkMode 
                ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30" 
                : "bg-indigo-50/80 text-indigo-650 border-indigo-200"
            } border text-[9px] font-black tracking-widest px-2.5 py-0.5 rounded-full uppercase`}>
              B2B Realtime WebView
            </span>
            <h1 className={`text-xl font-black ${
              isDarkMode 
                ? "text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-indigo-300" 
                : "text-slate-800"
            } mt-1.5`}>
              {data.title}
            </h1>
            <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-505'} mt-0.5 font-medium`}>
              실시간 DB 연계 조회 중 ➔ 총 <span className="text-indigo-600 font-bold">{sortedRows.length}</span>개의 발송 품목 내역이 적재되어 있습니다.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              className={`p-2.5 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                isDarkMode 
                  ? "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white" 
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm"
              }`}
              title="데이터 새로고침"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>

            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`px-3 py-2.5 rounded-2xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                isDarkMode 
                  ? "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white" 
                  : "bg-white border-slate-200 text-slate-705 hover:bg-slate-50 hover:text-slate-900 shadow-sm"
              }`}
              title={isDarkMode ? "라이트모드로 전환" : "다크모드로 전환"}
            >
              {isDarkMode ? (
                <>
                  <Sun size={14} className="text-amber-400 animate-pulse" />
                  <span>라이트모드</span>
                </>
              ) : (
                <>
                  <Moon size={14} className="text-indigo-600" />
                  <span>다크모드</span>
                </>
              )}
            </button>

            <button
              onClick={handleExportCsv}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white text-xs font-black rounded-2xl shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Download size={14} />
              <span>CSV 내보내기</span>
            </button>
          </div>
        </div>

        {/* 필터 및 검색, 컬럼 표시설정 영역 */}
        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-3 ${
          isDarkMode 
            ? "bg-slate-900/90 border-white/10 shadow-2xl shadow-slate-950/50" 
            : "bg-white border-slate-200 shadow-xl shadow-slate-100/50"
        } border p-4 rounded-3xl transition-all duration-300 relative z-30`}>
          <div className="flex flex-1 items-center max-w-md w-full">
            <input
              type="text"
              placeholder="검색어를 입력해 주세요 (전체 대장 실시간 검색)..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className={`w-full px-3.5 py-2.5 border rounded-2xl text-[11px] font-bold shadow-inner outline-none transition-all ${
                isDarkMode 
                  ? "bg-slate-900/50 border-white/10 text-white placeholder-slate-500 focus:border-indigo-500/80" 
                  : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500/70"
              }`}
            />
          </div>
          <div className="flex items-center gap-3 justify-end relative">
            <div className="relative z-40">
              <button
                ref={buttonRef}
                onClick={() => setIsColSelectorOpen(!isColSelectorOpen)}
                className={`px-3 py-2.5 rounded-2xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isColSelectorOpen
                    ? "bg-indigo-600 border-indigo-650 text-white shadow-md"
                    : isDarkMode
                    ? "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
                }`}
              >
                <Eye size={13} />
                <span>⚙️ 컬럼 표시 설정</span>
              </button>
              
              {mounted && isColSelectorOpen && typeof document !== 'undefined' && createPortal(
                <div 
                  className={`fixed rounded-2xl border shadow-2xl p-4 w-64 transition-all ${
                    isDarkMode
                      ? "border-slate-800 text-slate-100 shadow-black/90"
                      : "border-slate-200 text-slate-800 shadow-slate-200/60"
                  }`}
                  style={{
                    top: `${coords.top}px`,
                    left: `${coords.left}px`,
                    zIndex: 99999,
                    backgroundColor: isDarkMode ? "#090d16" : "#ffffff",
                    transform: "translate3d(0, 0, 9999px)",
                    isolation: "isolate",
                  }}
                >
                  <div className="flex items-center justify-between border-b border-solid border-slate-700/20 pb-2 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider">표시 컬럼 선택</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={toggleAllColumns}
                        className="text-[9px] font-black text-indigo-500 hover:underline border-none bg-transparent cursor-pointer"
                      >
                        {visibleColumns.length === data.headers.length ? "전체해제" : "전체선택"}
                      </button>
                      <span className="text-[9px] text-slate-650">|</span>
                      <button
                        onClick={resetToDefaultColumns}
                        className="text-[9px] font-black text-indigo-500 hover:underline border-none bg-transparent cursor-pointer"
                        title="순서 및 숨김 상태를 기본 복구합니다."
                      >
                        기본값 복원
                      </button>
                    </div>
                  </div>
                  <div className="max-h-[480px] overflow-y-auto space-y-1 custom-scrollbar text-left">
                    {columns.map((h, idx) => {
                      const isChecked = visibleColumns.includes(h);
                      return (
                        <div
                          key={h}
                          className="flex items-center justify-between px-1.5 py-1 hover:bg-white/5 rounded-lg transition-colors group"
                        >
                          <label className="flex items-center gap-2 cursor-pointer text-[11px] font-bold">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleColumn(h)}
                              className="rounded border-slate-400 text-indigo-650 focus:ring-indigo-555 w-3.5 h-3.5 cursor-pointer"
                            />
                            <span className={isChecked ? "opacity-100" : "opacity-50"}>{h}</span>
                          </label>
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => moveColumn(idx, "up")}
                              className="p-0.5 hover:bg-white/10 disabled:opacity-20 rounded text-slate-400 hover:text-white cursor-pointer disabled:cursor-not-allowed border-none bg-transparent"
                              title="위로 이동"
                            >
                              <ArrowUp size={11} />
                            </button>
                            <button
                              type="button"
                              disabled={idx === columns.length - 1}
                              onClick={() => moveColumn(idx, "down")}
                              className="p-0.5 hover:bg-white/10 disabled:opacity-20 rounded text-slate-400 hover:text-white cursor-pointer disabled:cursor-not-allowed border-none bg-transparent"
                              title="아래로 이동"
                            >
                              <ArrowDown size={11} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="border-t border-solid border-slate-700/20 pt-2 mt-2 flex justify-end">
                    <button
                      onClick={() => setIsColSelectorOpen(false)}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-755 text-white rounded-lg text-[10px] font-black cursor-pointer border-none"
                    >
                      확인
                    </button>
                  </div>
                </div>,
                document.body
              )}
            </div>

            <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-505'} font-bold`}>보기:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className={`px-3 py-2 border rounded-2xl text-xs font-bold shadow-sm outline-none transition-all ${
                isDarkMode 
                  ? "bg-slate-900/50 border-white/10 text-slate-300" 
                  : "bg-slate-50 border-slate-200 text-slate-705"
              }`}
            >
              <option value={10}>10개씩</option>
              <option value={15}>15개씩</option>
              <option value={30}>30개씩</option>
              <option value={50}>50개씩</option>
            </select>
          </div>
        </div>

        {/* 데이터 테이블 카드 */}
        <div className={`relative z-10 ${
          isDarkMode 
            ? "bg-slate-900/95 border-white/10 shadow-2xl shadow-slate-950/50" 
            : "bg-white border-slate-200 shadow-xl shadow-slate-100/50"
        } border rounded-3xl overflow-hidden transition-all duration-300 w-full`}>
          <div className="w-full overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-[11px] font-semibold border-collapse table-auto">
              <thead>
                <tr className={`border-b ${
                  isDarkMode 
                    ? "border-white/10 bg-slate-900/30 text-slate-400" 
                    : "border-slate-200 bg-slate-50 text-slate-600"
                } transition-colors duration-300`}>
                  {/* 액션 컬럼 헤더 */}
                  <th className="py-3.5 px-3.5 text-center text-[10px] uppercase tracking-wider w-24">액션</th>

                  {columns.map((header) => {
                    if (!visibleColumns.includes(header)) return null;
                    const origIdx = HEADERS.indexOf(header);
                    if (origIdx === -1) return null;
                    const isHeaderNumeric = ["수량", "단가", "금액", "총 견적액"].includes(header.replace(/\s+/g, ""));
                    return (
                      <th
                        key={header}
                        onClick={() => handleSort(origIdx)}
                        className={`py-3.5 px-3.5 cursor-pointer ${
                          isDarkMode ? "hover:text-white" : "hover:text-slate-900"
                        } select-none transition-colors group whitespace-nowrap ${
                          isHeaderNumeric ? "text-right" : ""
                        }`}
                      >
                        <div className={`flex items-center gap-1 ${isHeaderNumeric ? "justify-end" : ""}`}>
                          {header}
                          <span className="text-indigo-500 font-bold group-hover:scale-110 transition-transform">
                            {sortKey === origIdx ? (sortDir === "asc" ? " ▲" : " ▼") : " ↕"}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={visibleColumns.length + 1}
                      className={`text-center py-20 ${isDarkMode ? 'text-slate-400' : 'text-slate-505'} font-semibold`}
                    >
                      조건에 부합하는 제조업 보낸 견적서 대장 내역이 존재하지 않습니다.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row, rIdx) => {
                    const estId = row[0]; // 견적번호
                    return (
                      <tr
                        key={rIdx}
                        className={`border-b ${
                          isDarkMode 
                            ? "border-white/5 hover:bg-white/5" 
                            : "border-slate-100 hover:bg-slate-50/60"
                        } transition-colors duration-300`}
                      >
                        {/* 액션 셀 */}
                        <td className="py-2.5 px-3.5 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handlePrintPdf(estId)}
                              className="px-2 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 rounded-lg text-[9px] font-black transition-all flex items-center gap-1 cursor-pointer"
                              title="A4 공식 양식 인쇄"
                            >
                              <Printer size={11} />
                              인쇄
                            </button>
                            <button
                              onClick={() => handleDownloadPdf(estId)}
                              className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 rounded-lg text-[9px] font-black transition-all flex items-center gap-1 cursor-pointer"
                              title="실물 PDF 저장"
                            >
                              <Eye size={11} />
                              다운
                            </button>
                          </div>
                        </td>

                        {columns.map((headerName) => {
                          if (!visibleColumns.includes(headerName)) return null;
                          const cIdx = HEADERS.indexOf(headerName);
                          if (cIdx === -1) return null;

                          let val = row[cIdx];
                          let strVal = String(val);

                          if (strVal !== "-") {
                            const isMoney = ["단가", "금액", "총 견적액"].includes(headerName);
                            const isQty = ["수량"].includes(headerName);
                            if (isMoney || isQty) {
                              const cleanNum = Number(strVal.replace(/[^0-9.-]/g, ""));
                              if (!isNaN(cleanNum)) {
                                strVal = isMoney ? `${cleanNum.toLocaleString()}원` : `${cleanNum.toLocaleString()}`;
                              }
                            }
                          }

                          if (headerName === "상태") {
                            const isSent = strVal === "견적발송";
                            return (
                              <td key={headerName} className="py-3 px-3.5 whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                  isSent
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                }`}>
                                  {strVal}
                                </span>
                              </td>
                            );
                          }

                          if (headerName === "상세비고" && strVal.length > 20) {
                            return (
                              <td key={headerName} className="py-3 px-3.5 text-xs text-slate-400 font-medium">
                                <button
                                  onClick={() => setActiveMemo(strVal)}
                                  className="text-indigo-400 hover:underline max-w-[180px] truncate block text-left bg-transparent border-none cursor-pointer"
                                  title="전체 메모 확인"
                                >
                                  {strVal}
                                </button>
                              </td>
                            );
                          }

                          if (headerName === "구분") {
                            let divBadgeClass = "bg-slate-500/10 text-slate-400 border border-slate-500/20";
                            if (strVal === "재료비") {
                              divBadgeClass = "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20";
                            } else if (strVal === "직접가공비") {
                              divBadgeClass = "bg-pink-500/10 text-pink-400 border border-pink-500/20";
                            } else if (strVal === "외주가공비") {
                              divBadgeClass = "bg-purple-500/10 text-purple-400 border border-purple-500/20";
                            } else if (strVal === "일반관리비" || strVal === "기업이윤" || strVal === "기타비용") {
                              divBadgeClass = "bg-amber-500/10 text-amber-400 border border-amber-500/20";
                            }
                            return (
                              <td key={headerName} className="py-3 px-3.5 whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${divBadgeClass}`}>
                                  {strVal}
                                </span>
                              </td>
                            );
                          }

                          const isNumericCol = ["수량", "단가", "금액", "총 견적액"].includes(headerName.replace(/\s+/g, ""));
                          return (
                            <td key={headerName} className={`py-3 px-3.5 ${
                              isDarkMode ? "text-slate-300" : "text-slate-700"
                            } font-medium ${
                              isNumericCol 
                                ? "whitespace-nowrap font-mono text-right" 
                                : "whitespace-normal break-all max-w-[240px]"
                            }`}>
                              {strVal}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* 하단 페이지네이션 컨트롤러 */}
          <div className={`px-6 py-4 flex items-center justify-between gap-4 border-t ${
            isDarkMode ? "border-white/5 bg-slate-900/30" : "border-slate-100 bg-slate-50/60"
          } transition-all duration-300`}>
            <span className={`text-[10px] font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              전체 <strong className={isDarkMode ? "text-white font-extrabold" : "text-slate-800 font-extrabold"}>{sortedRows.length}</strong>건 중{" "}
              {sortedRows.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}~
              {Math.min(currentPage * pageSize, sortedRows.length)}건 표시
            </span>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1 || loading}
                className={`px-2.5 py-1.5 border rounded-lg text-[9px] font-black transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  isDarkMode 
                    ? "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 disabled:hover:bg-white/5" 
                    : "bg-white border-slate-200 text-slate-655 hover:bg-slate-50 shadow-sm"
                }`}
              >
                처음
              </button>
              <button
                onClick={() => setCurrentPage((c) => Math.max(1, c - 1))}
                disabled={currentPage === 1 || loading}
                className={`px-2.5 py-1.5 border rounded-lg text-[9px] font-black transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  isDarkMode 
                    ? "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 disabled:hover:bg-white/5" 
                    : "bg-white border-slate-200 text-slate-655 hover:bg-slate-50 shadow-sm"
                }`}
              >
                이전
              </button>
              <span className={`px-3 py-1 text-[11px] font-extrabold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((c) => Math.min(totalPages, c + 1))}
                disabled={currentPage === totalPages || loading}
                className={`px-2.5 py-1.5 border rounded-lg text-[9px] font-black transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  isDarkMode 
                    ? "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 disabled:hover:bg-white/5" 
                    : "bg-white border-slate-200 text-slate-655 hover:bg-slate-50 shadow-sm"
                }`}
              >
                다음
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages || loading}
                className={`px-2.5 py-1.5 border rounded-lg text-[9px] font-black transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  isDarkMode 
                    ? "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 disabled:hover:bg-white/5" 
                    : "bg-white border-slate-200 text-slate-655 hover:bg-slate-50 shadow-sm"
                }`}
              >
                끝
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 비고 메모 오버레이 모달 */}
      {activeMemo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[99999] p-4 animate-in fade-in duration-200">
          <div className={`rounded-3xl border p-5 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 ${
            isDarkMode 
              ? "bg-slate-900 border-white/10 text-white shadow-black/80" 
              : "bg-white border-slate-200 text-slate-800 shadow-slate-200/50"
          }`}>
            <div className="flex items-center justify-between border-b border-slate-700/20 pb-3 mb-4">
              <span className="text-[11px] font-black uppercase tracking-widest text-indigo-500">상세 비고 메모</span>
              <button 
                onClick={() => setActiveMemo(null)} 
                className={`p-1 rounded-full cursor-pointer hover:bg-white/10 transition-colors ${
                  isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-505 hover:bg-slate-100'
                }`}
              >
                <X size={15} />
              </button>
            </div>
            <div className={`text-xs font-semibold leading-relaxed border p-4 rounded-2xl whitespace-pre-wrap max-h-96 overflow-y-auto ${
              isDarkMode 
                ? "bg-slate-950/80 border-white/5 text-slate-300" 
                : "bg-slate-50 border-slate-100 text-slate-600"
            }`}>
              {activeMemo}
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setActiveMemo(null)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-755 text-white rounded-xl text-xs font-bold transition cursor-pointer border-none shadow-md"
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
