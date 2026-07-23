"use client";

import { apiFetch } from "@/lib/api";
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePersistedState } from "@/hooks/usePersistedState";
import Link from "next/link";
import { 
  Database, ArrowLeft, Loader2, Plus, Trash2, Edit2, 
  Search, RefreshCw, Sparkles, LayoutGrid, ListCollapse,
  ChevronLeft, FileSpreadsheet, Save, X
} from "lucide-react";

export default function CustomDynamicPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  // 1. 상태 영속화 (sessionStorage) 연동
  const [searchQuery, setSearchQuery, isSearchRestored] = usePersistedState<string>(`custom_search_${slug}`, "");
  const [currentPage, setCurrentPage, isPageRestored] = usePersistedState<number>(`custom_page_${slug}`, 1);

  // 일반 상태 변수
  const [pageInfo, setPageInfo] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 폼 입력 상태
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [selectedRowId, setSelectedRowId] = useState<number | null>(null);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);

  // 2. 데이터 조회
  const loadPageData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await apiFetch(`/api/custom-pages?action=get_page_detail&slug=${slug}`);
      const data = await res.json();
      if (data.success) {
        setPageInfo(data.page);
        setRows(data.rows || []);
      } else {
        setError(data.error || "데이터를 불러오는 데 실패했습니다.");
      }
    } catch (err: any) {
      setError(err.message || "서버 통신 중 에러가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  // 이중 페칭(Hydration Guard) 방지 가드 적용 후 로드
  useEffect(() => {
    if (!isSearchRestored || !isPageRestored) return;
    loadPageData();
  }, [loadPageData, isSearchRestored, isPageRestored]);

  // 3. 기록 저장 (추가/수정)
  const handleSaveRow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pageInfo) return;

    // 필수값 검증
    const components = pageInfo.ui_schema?.components || [];
    for (const comp of components) {
      if (comp.validation?.required && !formData[comp.id]) {
        alert(`[${comp.label}] 항목은 필수 입력 사항입니다.`);
        return;
      }
    }

    setIsSaving(true);
    try {
      const res = await apiFetch("/api/custom-pages?action=save_row", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page_id: pageInfo.id,
          row_id: selectedRowId,
          data: formData
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || "성공적으로 저장되었습니다.");
        setFormData({});
        setSelectedRowId(null);
        setIsFormOpen(false);
        loadPageData();
      } else {
        alert("저장 실패: " + (data.error || "서버 오류"));
      }
    } catch (err: any) {
      alert("오류 발생: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // 4. 기록 삭제 (소프트 삭제)
  const handleDeleteRow = async (rowId: number) => {
    if (!window.confirm("정말로 이 기록을 삭제하시겠습니까?")) return;

    try {
      const res = await apiFetch("/api/custom-pages?action=delete_row", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ row_id: rowId })
      });
      const data = await res.json();
      if (data.success) {
        alert("성공적으로 삭제되었습니다.");
        loadPageData();
      } else {
        alert("삭제 실패: " + (data.error || "서버 오류"));
      }
    } catch (err: any) {
      alert("오류 발생: " + err.message);
    }
  };

  // 수정 모달/폼 열기
  const openEditForm = (row: any) => {
    setSelectedRowId(row.id);
    // 메타정보 컬럼 데이터 추출하여 폼 바인딩
    const initialData: Record<string, any> = {};
    if (pageInfo?.data_schema?.fields) {
      pageInfo.data_schema.fields.forEach((f: any) => {
        initialData[f.id] = row[f.id] !== undefined ? row[f.id] : "";
      });
    }
    setFormData(initialData);
    setIsFormOpen(true);
  };

  // 5. 검색 필터링 적용
  const filteredRows = rows.filter((row) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    
    // 행에 있는 모든 밸류 값들을 결합하여 검색 매치
    return Object.keys(row).some((key) => {
      if (key === 'id' || key === 'created_at' || key === 'created_by') return false;
      const val = row[key];
      return String(val || "").toLowerCase().includes(query);
    });
  });

  // 페이징 연산
  const itemsPerPage = 15;
  const totalPages = Math.ceil(filteredRows.length / itemsPerPage) || 1;
  const paginatedRows = filteredRows.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (isLoading && !pageInfo) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
        <span className="text-sm text-slate-500 font-black">AI가 설계한 맞춤형 서비스를 구성 중입니다...</span>
      </div>
    );
  }

  if (error || !pageInfo) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6 text-center">
        <Database className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-xl font-black text-slate-700">페이지 로드 실패</h2>
        <p className="text-sm text-slate-400 mt-2 font-bold">{error || "페이지를 찾을 수 없습니다."}</p>
        <button
          onClick={() => router.push("/")}
          className="mt-6 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black shadow-sm transition-colors border-none cursor-pointer"
        >
          CEO 대시보드로 돌아가기
        </button>
      </div>
    );
  }

  const components = pageInfo.ui_schema?.components || [];

  return (
    <div className="min-h-screen bg-slate-50 w-full text-slate-800">
      {/* 웅장한 가로폭 활용 영역 헤더 */}
      <div className="w-full px-4 md:px-8 py-6 bg-white border-b border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <button
              onClick={() => router.push("/")}
              className="mt-1 p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all border-none cursor-pointer text-slate-600"
              title="CEO 대시보드로 돌아가기"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
                <FileSpreadsheet className="w-8 h-8 text-indigo-600" />
                <span>{pageInfo.page_title}</span>
              </h1>
              <p className="text-slate-500 mt-2 text-xs font-bold pl-1">
                자사 전용 커스텀 서비스 | 슬러그: /custom/{pageInfo.page_slug}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadPageData}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all border-none cursor-pointer text-slate-500"
              title="데이터 새로고침"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setSelectedRowId(null);
                setFormData({});
                setIsFormOpen(true);
              }}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black shadow-sm transition-colors border-none cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>신규 기록 등록</span>
            </button>
          </div>
        </div>
      </div>

      {/* 실물 바디 영역 */}
      <div className="w-full px-4 md:px-8 py-6 space-y-6">
        {/* CRUD 모달 폼 컴포넌트 */}
        {isFormOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-3xl shadow-lg w-full max-w-2xl overflow-hidden animate-scale-up text-left">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-black text-slate-800">
                    {selectedRowId ? "데이터 레코드 편집" : "신규 데이터 레코드 추가"}
                  </h3>
                </div>
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="p-1.5 hover:bg-slate-200 rounded-xl transition-colors border-none cursor-pointer text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveRow} className="p-6 space-y-4">
                <div className="grid grid-cols-12 gap-4">
                  {components.map((comp: any) => {
                    const width = comp.grid_width || 6;
                    return (
                      <div key={comp.id} style={{ gridColumn: `span ${width} / span ${width}` }} className="flex flex-col space-y-1.5">
                        <label className="text-[11px] font-black text-slate-500">
                          {comp.label} {comp.validation?.required && <span className="text-rose-500">*</span>}
                        </label>
                        
                        {comp.type === 'NUMBER_INPUT' ? (
                          <input
                            type="number"
                            value={formData[comp.id] !== undefined ? formData[comp.id] : ""}
                            onChange={(e) => setFormData(prev => ({ ...prev, [comp.id]: e.target.value !== "" ? Number(e.target.value) : "" }))}
                            className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:bg-white outline-none focus:border-indigo-500"
                            placeholder={`${comp.label} 입력`}
                          />
                        ) : comp.type === 'DATE_PICKER' ? (
                          <input
                            type="date"
                            value={formData[comp.id] || ""}
                            onChange={(e) => setFormData(prev => ({ ...prev, [comp.id]: e.target.value }))}
                            className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:bg-white outline-none focus:border-indigo-500"
                          />
                        ) : (
                          <input
                            type="text"
                            value={formData[comp.id] || ""}
                            onChange={(e) => setFormData(prev => ({ ...prev, [comp.id]: e.target.value }))}
                            className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:bg-white outline-none focus:border-indigo-500"
                            placeholder={`${comp.label} 입력`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border-none cursor-pointer transition-colors"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black border-none cursor-pointer flex items-center gap-1.5 shadow-sm transition-colors"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>저장 중...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>기록 확정</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 필터링 및 서칭 */}
        <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm p-4 flex flex-col md:flex-row items-center gap-4 text-left">
          <div className="flex-1 w-full relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="데이터 그리드 내 검색어 입력..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:bg-white outline-none focus:border-indigo-500 shadow-xs"
            />
          </div>
          <div className="text-xs font-black text-slate-400 shrink-0">
            조회 결과: <span className="text-indigo-600">{filteredRows.length}</span>행
          </div>
        </div>

        {/* 데이터 그리드 대형 보드 */}
        <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden text-left">
          <div className="overflow-x-auto w-full">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {components.map((comp: any) => (
                    <th key={comp.id} className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider">
                      {comp.label}
                    </th>
                  ))}
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider w-24">
                    등록일자
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-black text-slate-500 uppercase tracking-wider w-28">
                    관리 액션
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={components.length + 2} className="px-6 py-12 text-center text-xs text-slate-400 font-bold">
                      <Database className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                      일치하는 장표 데이터가 존재하지 않습니다.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                      {components.map((comp: any) => (
                        <td key={comp.id} className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-700">
                          {comp.type === 'NUMBER_INPUT' ? (
                            <span className="font-extrabold text-indigo-900">
                              {Number(row[comp.id] || 0).toLocaleString()}
                            </span>
                          ) : (
                            row[comp.id] || "-"
                          )}
                        </td>
                      ))}
                      <td className="px-6 py-4 whitespace-nowrap text-[11px] text-slate-400 font-bold">
                        {row.created_at?.slice(0, 10)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-xs font-black">
                        <div className="flex justify-center items-center gap-1">
                          <button
                            onClick={() => openEditForm(row)}
                            className="p-1.5 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-slate-400 transition-colors border-none cursor-pointer"
                            title="기록 수정"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteRow(row.id)}
                            className="p-1.5 hover:bg-rose-50 hover:text-rose-600 rounded-lg text-slate-400 transition-colors border-none cursor-pointer"
                            title="기록 삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 페이징 네비게이션 */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/20 flex items-center justify-between">
              <div className="text-xs text-slate-400 font-bold">
                페이지 {currentPage} / {totalPages} (총 {filteredRows.length}행)
              </div>
              <div className="flex gap-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 disabled:bg-slate-100 disabled:text-slate-300 border border-slate-200 rounded-lg text-xs font-bold cursor-pointer transition-all"
                >
                  이전
                </button>
                {Array.from({ length: totalPages }).map((_, idx) => {
                  const pNum = idx + 1;
                  return (
                    <button
                      key={pNum}
                      onClick={() => setCurrentPage(pNum)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black cursor-pointer border transition-all ${
                        currentPage === pNum
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                          : "bg-white border-slate-200 hover:bg-slate-100 text-slate-700"
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                })}
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 disabled:bg-slate-100 disabled:text-slate-300 border border-slate-200 rounded-lg text-xs font-bold cursor-pointer transition-all"
                >
                  다음
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
