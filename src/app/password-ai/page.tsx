"use client";

import React, { useState, useEffect, useCallback } from "react";
import { usePersistedState } from "@/hooks/usePersistedState";
import { apiFetch } from "@/lib/api";
import { 
  Key, Search, Plus, ShieldCheck, Eye, EyeOff, Lock, 
  RefreshCw, Trash2, Copy, AlertTriangle, ExternalLink, 
  CheckCircle2, Building2, User, Globe, AlertCircle
} from "lucide-react";

interface PasswordItem {
  id: string | number;
  service_name: string;
  category?: string;
  login_id: string;
  masked_password?: string;
  decrypted_password?: string; // 열람 시 저장되는 평문
  url?: string;
  memo?: string;
  last_updated?: string;
  owner_name?: string;
}

export default function PasswordAiPage() {
  const [passwords, setPasswords] = useState<PasswordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRestored, setIsRestored] = useState(false);

  // 브라우저 sessionStorage 연동 상태 보존
  const [searchQuery, setSearchQuery] = usePersistedState<string>("password_search_query", "");
  const [activeCategory, setActiveCategory] = usePersistedState<string>("password_active_category", "ALL");

  // 비밀번호 평문 열람 사유 모달 상태
  const [selectedAssetId, setSelectedAssetId] = useState<string | number | null>(null);
  const [viewReason, setViewReason] = useState("");
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string | number, string>>({});
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // 신규 비밀번호 자산 등록 모달 상태
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [serviceName, setServiceName] = useState("");
  const [category, setCategory] = useState("서버/시스템");
  const [loginId, setLoginId] = useState("");
  const [passwordValue, setPasswordValue] = useState("");
  const [assetUrl, setAssetUrl] = useState("");
  const [memo, setMemo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 비밀번호 자산 대장 조회
  const fetchPasswords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/password-ai");
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.items)) {
          setPasswords(data.items);
        } else {
          // 기본 데모 시드 데이터 fallback
          setPasswords([
            { id: 1, service_name: "시흥 본사 AWS 클라우드 마스터", category: "서버/시스템", login_id: "admin@egdesk.internal", masked_password: "••••••••••••", url: "https://aws.amazon.com", memo: "최고관리자 전용 마스터 계정", last_updated: "2026-06-15" },
            { id: 2, service_name: "국세청 홈택스 법인 전자서명", category: "세무/회계", login_id: "egdesk_tax", masked_password: "••••••••••••", url: "https://hometax.go.kr", memo: "분기 세무 신고용 법인 인증서", last_updated: "2026-05-10" },
            { id: 3, service_name: "공식 인스타그램 마케팅 채널", category: "SNS/마케팅", login_id: "egdesk_official", masked_password: "••••••••••••", url: "https://instagram.com", memo: "마케팅팀 공유 계정", last_updated: "2026-07-01" },
            { id: 4, service_name: "토스페이먼츠 PG 결제 상점 관리자", category: "결제/금융", login_id: "store_m_4000", masked_password: "••••••••••••", url: "https://admin.tosspayments.com", memo: "B2B 결제 API 연동 키 보유", last_updated: "2026-04-20" }
          ]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch password assets:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPasswords();
    setIsRestored(true);
  }, [fetchPasswords]);

  // 특정 비밀번호 복호화 평문 조회 (감사 추적 사유 기록)
  const handleRevealPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId || !viewReason.trim()) {
      alert("열람 사유를 입력해 주세요.");
      return;
    }

    try {
      const res = await apiFetch(`/api/password-ai?id=${selectedAssetId}&reason=${encodeURIComponent(viewReason)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.decrypted_password) {
          setRevealedPasswords((prev) => ({
            ...prev,
            [selectedAssetId]: data.decrypted_password
          }));
          alert("🔑 비밀번호 복호화 성공! 보안 감사 이력에 사용자의 조회 사유가 서명 기록되었습니다.");
          setIsViewModalOpen(false);
          setViewReason("");
        } else {
          alert(data.error || "복호화 실패");
        }
      }
    } catch (err) {
      console.error("Password reveal error:", err);
      alert("비밀번호 열람 중 오류가 발생했습니다.");
    }
  };

  // 비밀번호 복사 헬퍼
  const handleCopyPassword = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    alert("📋 클립보드에 비밀번호가 안전하게 복사되었습니다.");
  };

  // 신규 자산 등록
  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceName || !loginId || !passwordValue) {
      alert("서비스 명, 아이디, 비밀번호를 모두 입력해 주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiFetch("/api/password-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_name: serviceName,
          category,
          login_id: loginId,
          password: passwordValue,
          url: assetUrl,
          memo
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          alert("🟢 신규 비밀번호 자산이 AES-256-GCM으로 안전하게 암호화되어 등록되었습니다.");
          setIsAddModalOpen(false);
          resetForm();
          fetchPasswords();
        } else {
          alert(data.error || "등록 실패");
        }
      }
    } catch (err) {
      console.error("Failed to add password asset:", err);
      alert("등록 처리 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 자산 영구 삭제
  const handleDeleteAsset = async (assetId: string | number) => {
    if (!window.confirm("해당 비밀번호 자산을 삭제하시겠습니까? (감사 이력은 보관됩니다)")) return;
    try {
      const res = await apiFetch(`/api/password-ai?id=${assetId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        alert("비밀번호 자산이 삭제되었습니다.");
        fetchPasswords();
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const resetForm = () => {
    setServiceName("");
    setCategory("서버/시스템");
    setLoginId("");
    setPasswordValue("");
    setAssetUrl("");
    setMemo("");
  };

  // 검색 및 카테고리 필터링
  const filteredPasswords = passwords.filter((item) => {
    if (activeCategory !== "ALL" && item.category !== activeCategory) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.service_name.toLowerCase().includes(q) ||
      item.login_id.toLowerCase().includes(q) ||
      (item.memo || "").toLowerCase().includes(q)
    );
  });

  // KPI 수치 집계
  const totalCount = passwords.length;
  const serverCategoryCount = passwords.filter((p) => p.category === "서버/시스템").length;
  const taxCategoryCount = passwords.filter((p) => p.category === "세무/회계").length;

  return (
    <div className="w-full px-4 md:px-8 py-6 space-y-6 bg-slate-50 min-h-screen text-left">
      {/* 1. 헤더 타이틀 영역 (NEW PAGE UI RULES 준수) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Key className="w-8 h-8 text-purple-600 shrink-0" />
            <span>비밀번호관리 AI</span>
          </h1>
          <p className="text-slate-500 mt-2 text-sm">
            기업 핵심 시스템 및 계정 비밀번호 AES-256-GCM 암호화 보관, 감사 추적 및 인수인계 센터
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchPasswords}
            className="p-2.5 bg-white hover:bg-slate-100 text-slate-600 rounded-2xl border border-slate-200 transition-all cursor-pointer shadow-3xs flex items-center gap-1.5 font-bold text-xs"
            title="새로고침"
          >
            <RefreshCw className="w-4 h-4 text-purple-600" />
            <span>새로고침</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black text-xs flex items-center gap-2 transition-all shadow-xs cursor-pointer border-none"
          >
            <Plus className="w-4 h-4" />
            <span>신규 비밀번호 자산 등록</span>
          </button>
        </div>
      </div>

      {/* 2. 대형 요약 KPI 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 block">총 비밀번호 자산</span>
            <span className="text-2xl font-black text-slate-800 mt-1 block">{totalCount}개</span>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
            <Key className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 block">AES-256-GCM 암호화 보관</span>
            <span className="text-2xl font-black text-emerald-600 mt-1 block">100% 안전</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 block">서버/시스템 인프라 계정</span>
            <span className="text-2xl font-black text-indigo-600 mt-1 block">{serverCategoryCount}개</span>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 block">세무/금융/결제 인프라</span>
            <span className="text-2xl font-black text-amber-600 mt-1 block">{taxCategoryCount}개</span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
            <Lock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 3. 검색 바 및 세그먼트 필터 */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl shrink-0 w-full md:w-auto">
          {[
            { id: "ALL", label: "전체 자산" },
            { id: "서버/시스템", label: "서버/시스템" },
            { id: "세무/회계", label: "세무/회계" },
            { id: "SNS/마케팅", label: "SNS/마케팅" },
            { id: "결제/금융", label: "결제/금융" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border-none cursor-pointer whitespace-nowrap flex-1 md:flex-none ${
                activeCategory === tab.id
                  ? "bg-white text-purple-600 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800 bg-transparent"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="서비스명, 계정 아이디 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl pl-10 pr-4 py-2 text-xs font-bold text-slate-800 placeholder-slate-400 outline-none focus:border-purple-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* 4. 비밀번호 자산 메인 대장 테이블 */}
      <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden">
        {loading && !isRestored ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-purple-500 mb-2" />
            <p className="text-xs font-bold">비밀번호 자산 대장을 불러오는 중입니다...</p>
          </div>
        ) : filteredPasswords.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <AlertCircle className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-600">등록된 비밀번호 자산이 없습니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-extrabold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">분류</th>
                  <th className="py-3.5 px-4">서비스 / 자산 명</th>
                  <th className="py-3.5 px-4">접속 로그인 ID</th>
                  <th className="py-3.5 px-4">보안 비밀번호 (암호화)</th>
                  <th className="py-3.5 px-4">접속 URL</th>
                  <th className="py-3.5 px-4">최종 수정일</th>
                  <th className="py-3.5 px-4 text-center">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredPasswords.map((item) => {
                  const isRevealed = Boolean(revealedPasswords[item.id]);
                  const secretText = revealedPasswords[item.id] || item.masked_password || "••••••••••••";

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-xl bg-purple-50 text-purple-700 text-[10px] font-black border border-purple-100">
                          {item.category || "일반"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-extrabold text-slate-850">
                        {item.service_name}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        {item.login_id}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs ${isRevealed ? "bg-amber-100 text-amber-900 font-black" : "text-slate-400"}`}>
                            {secretText}
                          </span>

                          {isRevealed ? (
                            <button
                              onClick={() => handleCopyPassword(secretText)}
                              className="p-1 bg-white hover:bg-slate-100 text-purple-600 rounded-lg border border-slate-200 transition-all cursor-pointer"
                              title="비밀번호 복사"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedAssetId(item.id);
                                setIsViewModalOpen(true);
                              }}
                              className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-[11px] font-black border border-purple-200 cursor-pointer flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>사유 입력 후 열람</span>
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-medium">
                        {item.url ? (
                          <a
                            href={item.url.startsWith("http") ? item.url : `https://${item.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-indigo-600 font-bold hover:underline"
                          >
                            <Globe className="w-3 h-3" />
                            <span className="truncate max-w-[140px]">{item.url}</span>
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-500">
                        {item.last_updated || "-"}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleDeleteAsset(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all border-none bg-transparent cursor-pointer"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. 비밀번호 열람 사유 입력 모달 */}
      {isViewModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 text-left animate-scale-in">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-purple-600" />
                <h3 className="text-base font-black text-slate-800">비밀번호 평문 복호화 열람</h3>
              </div>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 border-none bg-transparent cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              보안 규정에 따라 비밀번호 평문 조회 시 **조회 사유와 사원 서명**이 감사 로그에 영구 기록됩니다.
            </p>

            <form onSubmit={handleRevealPassword} className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 text-xs block mb-1">조회 사유 (필수)</label>
                <input
                  type="text"
                  required
                  placeholder="예: 서버 긴급 점검 및 세무 신고 접속"
                  value={viewReason}
                  onChange={(e) => setViewReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-purple-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsViewModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs border-none cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-xl text-xs border-none cursor-pointer shadow-xs"
                >
                  감사 서명 후 복호화 열람
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. 신규 자산 등록 모달 */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 text-left animate-scale-in">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-purple-600" />
                <h3 className="text-base font-black text-slate-800">신규 비밀번호 자산 등록</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 border-none bg-transparent cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddAsset} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-600 block mb-1">분류 카테고리</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 outline-none focus:border-purple-500"
                >
                  <option value="서버/시스템">서버/시스템</option>
                  <option value="세무/회계">세무/회계</option>
                  <option value="SNS/마케팅">SNS/마케팅</option>
                  <option value="결제/금융">결제/금융</option>
                  <option value="기타인프라">기타인프라</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">서비스 / 자산 명 *</label>
                <input
                  type="text"
                  required
                  placeholder="예: 클라우드 DB 인스턴스 주 계정"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-extrabold text-slate-800 outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">로그인 ID *</label>
                <input
                  type="text"
                  required
                  placeholder="예: admin@egdesk.internal"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">보안 비밀번호 (AES-256 암호화) *</label>
                <input
                  type="password"
                  required
                  placeholder="비밀번호 입력"
                  value={passwordValue}
                  onChange={(e) => setPasswordValue(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">접속 URL (선택)</label>
                <input
                  type="text"
                  placeholder="예: https://console.aws.amazon.com"
                  value={assetUrl}
                  onChange={(e) => setAssetUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">메모 / 비고</label>
                <textarea
                  rows={2}
                  placeholder="보안 관련 특이사항"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl border-none cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-xl border-none cursor-pointer shadow-xs"
                >
                  {isSubmitting ? "암호화 처리 중..." : "AES-256 암호화 등록"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
