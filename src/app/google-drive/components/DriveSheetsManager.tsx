"use client";

import React, { useState, useEffect } from "react";
import { 
  FileSpreadsheet, Globe, ExternalLink, RefreshCw, CheckCircle2, 
  ArrowRight, ShieldCheck, Database, Layers, Sparkles, Plus, Star, Trash2, Edit2, Check, X, Search, Filter
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import Link from "next/link";
import { GoogleSheetPreset } from "@/components/GoogleSheetPresetModal";

interface DomainMeta {
  id: string;
  label: string;
  category: string;
  path: string;
  badgeColor: string;
  desc: string;
}

const DOMAIN_METAS: Record<string, DomainMeta> = {
  hometax: { id: "hometax", label: "세무/홈택스", category: "finance", path: "/finance-management", badgeColor: "bg-teal-50 text-teal-700 border-teal-200", desc: "전자세금계산서 매입/매출 및 면세 계산서 연동" },
  bank: { id: "bank", label: "은행 거래내역", category: "finance", path: "/finance-management", badgeColor: "bg-blue-50 text-blue-700 border-blue-200", desc: "법인 통장 입출금 내역 및 잔액 실시간 동기화" },
  card: { id: "card", label: "신용카드 승인", category: "finance", path: "/finance-management", badgeColor: "bg-amber-50 text-amber-700 border-amber-200", desc: "법인카드 승인/취소 내역 및 가맹점 명세 연동" },
  partners: { id: "partners", label: "거래처 마스터", category: "crm", path: "/partners", badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200", desc: "바이어/공급사 마스터, 사업자번호, 대표자명 연동" },
  customer: { id: "customer", label: "고객 대장", category: "crm", path: "/customers", badgeColor: "bg-purple-50 text-purple-700 border-purple-200", desc: "고객 인적사항, 연락처, 배송지, 적립금 일괄 연동" },
  inventory: { id: "inventory", label: "재고/품목", category: "logistics", path: "/inventory", badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200", desc: "마스터 품목코드, 품명, 규격, 단가, 초기재고 연동" },
  product: { id: "product", label: "상품 마스터", category: "logistics", path: "/products", badgeColor: "bg-cyan-50 text-cyan-700 border-cyan-200", desc: "쇼핑몰/스토어 판매 상품 규격 및 단가 일괄 연동" },
  hr_attendance: { id: "hr_attendance", label: "HR 인사/근태", category: "hr", path: "/hr/attendance", badgeColor: "bg-rose-50 text-rose-700 border-rose-200", desc: "일자별 출퇴근 기록, 근무유형, 인사 정보 연동" },
  employee: { id: "employee", label: "직원 계정", category: "hr", path: "/settings", badgeColor: "bg-sky-50 text-sky-700 border-sky-200", desc: "임직원 시스템 계정 및 부서/직급 일괄 생성 연동" },
  company_profile: { id: "company_profile", label: "회사 프로필", category: "settings", path: "/settings", badgeColor: "bg-slate-100 text-slate-700 border-slate-300", desc: "회사명, 대표자, 사업자등록번호, 기본 주소 연동" },
};

export default function DriveSheetsManager() {
  const [flatPresets, setFlatPresets] = useState<Array<GoogleSheetPreset & { domain: string }>>([]);
  const [activeDomainFilter, setActiveDomainFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New Tab Registration Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newDomain, setNewDomain] = useState("hometax");
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newSheetName, setNewSheetName] = useState("");
  const [newIsDefault, setNewIsDefault] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Inline Editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const fetchAllPresets = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch("/api/shared/google-sheets/presets?domain=all");
      const data = await res.json();
      if (data.success && data.flatPresets) {
        setFlatPresets(data.flatPresets);
      }
    } catch (e: any) {
      console.error("Failed to fetch all presets:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllPresets();
  }, []);

  // Filter Presets
  const filteredPresets = flatPresets.filter((item) => {
    if (activeDomainFilter !== "all" && item.domain !== activeDomainFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title?.toLowerCase().includes(q);
      const matchTab = item.sheetName?.toLowerCase().includes(q);
      const matchUrl = item.url?.toLowerCase().includes(q);
      const matchDomain = DOMAIN_METAS[item.domain]?.label.toLowerCase().includes(q);
      return matchTitle || matchTab || matchUrl || matchDomain;
    }
    return true;
  });

  const handleSaveNewPreset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newUrl.trim()) {
      alert("별칭과 URL을 모두 입력해 주세요.");
      return;
    }
    setIsSaving(true);
    try {
      const res = await apiFetch("/api/shared/google-sheets/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          domain: newDomain,
          preset: {
            title: newTitle.trim(),
            url: newUrl.trim(),
            sheetName: newSheetName.trim(),
            isDefault: newIsDefault
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsAddModalOpen(false);
        setNewTitle("");
        setNewUrl("");
        setNewSheetName("");
        setNewIsDefault(false);
        setStatusMsg({ type: 'success', text: "새 탭 프리셋이 성공적으로 등록되었습니다." });
        fetchAllPresets();
        setTimeout(() => setStatusMsg(null), 3000);
      } else {
        alert(data.error || "저장 실패");
      }
    } catch (err: any) {
      alert(err.message || "오류 발생");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (domain: string, presetId: string, title: string) => {
    if (!window.confirm(`정말로 '${title}' 탭 설정을 삭제하시겠습니까?`)) return;
    try {
      const res = await apiFetch("/api/shared/google-sheets/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", domain, presetId })
      });
      const data = await res.json();
      if (data.success) {
        fetchAllPresets();
      }
    } catch (err) {
      alert("삭제 실패");
    }
  };

  const handleSetDefault = async (domain: string, presetId: string) => {
    try {
      const res = await apiFetch("/api/shared/google-sheets/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_default", domain, presetId })
      });
      const data = await res.json();
      if (data.success) {
        fetchAllPresets();
      }
    } catch (err) {
      alert("기본 탭 지정 실패");
    }
  };

  const handleRename = async (domain: string, presetId: string) => {
    if (!editingTitle.trim()) {
      setEditingId(null);
      return;
    }
    try {
      const res = await apiFetch("/api/shared/google-sheets/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rename", domain, presetId, newTitle: editingTitle.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setEditingId(null);
        fetchAllPresets();
      }
    } catch (err) {
      alert("이름 변경 실패");
    }
  };

  const activeDomainsCount = new Set(flatPresets.map(p => p.domain)).size;
  const uniqueSpreadsheetsCount = new Set(flatPresets.map(p => p.url)).size;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. 요약 통계 보드 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-bold">등록된 연동 탭(Tab) 총계</div>
            <div className="text-2xl font-black text-slate-800 tracking-tight mt-0.5 font-mono">
              {flatPresets.length} <span className="text-xs font-bold text-slate-400 font-sans">개</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-bold">연동 활성 업무 영역</div>
            <div className="text-2xl font-black text-slate-800 tracking-tight mt-0.5 font-mono">
              {activeDomainsCount} <span className="text-xs font-bold text-slate-400 font-sans">개 분야</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-bold">연동 스프레드시트 파일</div>
            <div className="text-2xl font-black text-slate-800 tracking-tight mt-0.5 font-mono">
              {uniqueSpreadsheetsCount} <span className="text-xs font-bold text-slate-400 font-sans">개 문서</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. 전사 탭 통합 관리자 메인 카드 */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* 상단 툴바 */}
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-100 text-teal-700 rounded-2xl">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                전사 구글 스프레드시트 탭(Tab)별 통합 관제 센터
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                하나의 시트 파일 내 다양한 탭을 각 업무 화면과 1:1로 맵핑하여 등록하고 중앙에서 제어합니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchAllPresets}
              disabled={isLoading}
              className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
              title="새로고침"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-teal-600" : ""}`} />
            </button>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-teal-600/20 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>새 탭 프리셋 등록</span>
            </button>
          </div>
        </div>

        {/* 도메인 필터 탭 & 검색 바 */}
        <div className="p-4 bg-slate-50/70 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* 필터 칩 */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full text-xs font-bold no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveDomainFilter("all")}
              className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer shrink-0 ${
                activeDomainFilter === "all"
                  ? "bg-teal-600 text-white border-teal-600 shadow-xs"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              전체 ({flatPresets.length})
            </button>

            {Object.entries(DOMAIN_METAS).map(([key, meta]) => {
              const count = flatPresets.filter((p) => p.domain === key).length;
              const isSelected = activeDomainFilter === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveDomainFilter(key)}
                  className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                    isSelected
                      ? "bg-teal-600 text-white border-teal-600 shadow-xs"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <span>{meta.label}</span>
                  {count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                      isSelected ? "bg-teal-700 text-teal-100" : "bg-slate-100 text-slate-500"
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* 검색창 */}
          <div className="relative shrink-0 w-full lg:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="시트명, 탭명, URL 검색..."
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
            />
          </div>
        </div>

        {/* 상태 피드백 알림 */}
        {statusMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* 목록 카드 렌더링 영역 */}
        <div className="p-6">
          {isLoading && flatPresets.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-teal-600" />
              <span className="text-xs">전사 구글 시트 탭 목록을 불러오는 중...</span>
            </div>
          ) : filteredPresets.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-2 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
              <FileSpreadsheet className="w-10 h-10 text-slate-300" />
              <p className="text-sm font-black text-slate-600">등록된 구글 시트 탭 프리셋이 없습니다.</p>
              <p className="text-xs text-slate-400">
                각 업무 팝업창에서 시트를 저장하거나, 상단의 [+ 새 탭 프리셋 등록] 버튼을 눌러 등록해 보세요.
              </p>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="mt-3 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer"
              >
                + 첫 탭 프리셋 등록하기
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPresets.map((preset) => {
                const isEditing = editingId === preset.id;
                const domainMeta = DOMAIN_METAS[preset.domain] || {
                  label: preset.domain,
                  path: "/finance-management",
                  badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
                  desc: ""
                };

                return (
                  <div
                    key={preset.id}
                    className="p-5 rounded-3xl border border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-2">
                      {/* 상단 도메인 뱃지 & 탭 태그 */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg border ${domainMeta.badgeColor}`}>
                            {domainMeta.label}
                          </span>
                          {preset.sheetName && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-800 bg-teal-100/90 px-2 py-0.5 rounded-md border border-teal-200">
                              <Layers className="w-3 h-3 text-teal-600" />
                              탭: {preset.sheetName}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 제목 (별칭) */}
                      <div>
                        {isEditing ? (
                          <div className="flex items-center gap-1.5 pt-1">
                            <input
                              type="text"
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              className="px-2.5 py-1 bg-white border border-teal-400 rounded-lg text-xs font-bold text-slate-800 flex-1 focus:outline-none"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleRename(preset.domain, preset.id);
                                if (e.key === "Escape") setEditingId(null);
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleRename(preset.domain, preset.id)}
                              className="p-1 text-teal-600 hover:bg-teal-100 rounded-md cursor-pointer"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="p-1 text-slate-400 hover:bg-slate-100 rounded-md cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <h4 className="text-sm font-black text-slate-800 tracking-tight flex items-center justify-between">
                            <span className="truncate">{preset.title}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingId(preset.id);
                                  setEditingTitle(preset.title);
                                }}
                                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md cursor-pointer"
                                title="이름 수정"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(preset.domain, preset.id, preset.title)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer"
                                title="삭제"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </h4>
                        )}
                      </div>

                      {/* URL */}
                      <div className="text-[11px] text-slate-400 font-mono truncate pt-0.5">
                        {preset.url}
                      </div>
                    </div>

                    {/* 하단 액션 버튼 바 */}
                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 text-xs font-bold">
                      <a
                        href={preset.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-500 hover:text-teal-600 flex items-center gap-1 text-[11px] font-semibold transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>시트 원본 열기</span>
                      </a>

                      <Link
                        href={domainMeta.path}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-800 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                      >
                        <span>해당 업무로 이동</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 3. 새 탭 프리셋 등록 모달 */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-teal-100 text-teal-700 rounded-2xl">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800">새 구글 시트 탭 프리셋 등록</h3>
                  <p className="text-xs text-slate-500 mt-0.5">특정 업무 화면에 연결할 시트 파일과 탭 이름을 지정합니다.</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewPreset} className="p-6 space-y-4 text-xs font-bold text-slate-700">
              <div className="space-y-1.5">
                <label className="text-slate-800 font-black">연동 대상 업무 영역</label>
                <select
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold"
                >
                  {Object.entries(DOMAIN_METAS).map(([key, meta]) => (
                    <option key={key} value={key}>
                      {meta.label} ({meta.desc})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-800 font-black">구글 스프레드시트 URL</label>
                <input
                  type="text"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-800 font-black">연동 대상 시트 탭(Worksheet) 이름</label>
                <input
                  type="text"
                  value={newSheetName}
                  onChange={(e) => {
                    setNewSheetName(e.target.value);
                    if (!newTitle) setNewTitle(`${DOMAIN_METAS[newDomain]?.label || ''} (${e.target.value})`);
                  }}
                  placeholder="예: 7월 매입, 거래처목록, 신한통장 (미입력 시 첫 번째 탭)"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-800 font-black">탭 프리셋 별칭 / 이름</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="예: 2026년 7월 매입 세금계산서, 신한은행 법인통장"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newIsDefault}
                    onChange={(e) => setNewIsDefault(e.target.checked)}
                    className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                  />
                  <span>해당 업무의 대표 기본 탭으로 지정</span>
                </label>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-all cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-black flex items-center gap-1.5 shadow-md shadow-teal-600/20 active:scale-95 transition-all cursor-pointer"
                >
                  {isSaving ? "저장 중..." : "등록 완료"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
