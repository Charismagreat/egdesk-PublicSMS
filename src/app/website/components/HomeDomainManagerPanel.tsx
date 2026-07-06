"use client";

import { apiFetch } from '@/lib/api';
import React, { useState, useEffect } from "react";
import { Globe, RefreshCw, CheckCircle, AlertTriangle, ShieldCheck, Activity, Save, History, Search, Link, Sparkles } from "lucide-react";

interface DomainHealth {
  url: string;
  status: string;
  latency: string;
  sslExpireDate: string;
  sslRemainDays: number;
  serverType: string;
  trafficToday: number;
}

interface PublishedSite {
  id: number;
  domain_type: string;
  domain_url: string;
  title: string;
  description: string;
  config_json?: string;
  is_active: number;
  updated_at: string;
  updated_by: string;
  health?: DomainHealth;
}

interface HomeDomainManagerPanelProps {
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  onUrlUpdated?: () => void;
  currentConfig?: any;
}

export function HomeDomainManagerPanel({ showToast, onUrlUpdated, currentConfig }: HomeDomainManagerPanelProps) {
  const [homepageUrl, setHomepageUrl] = useState("");
  const [primaryHealth, setPrimaryHealth] = useState<DomainHealth | null>(null);
  const [publishedSites, setPublishedSites] = useState<PublishedSite[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingUrl, setSavingUrl] = useState(false);

  // SEO 입력 폼 상태
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [savingSeo, setSavingSeo] = useState(false);
  const [suggestingSeo, setSuggestingSeo] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/website/domain-info");
      const data = await res.json();
      if (data.success) {
        setHomepageUrl(data.homepageUrl || "");
        setPrimaryHealth(data.primaryHealth || null);
        setPublishedSites(data.publishedSites || []);
        
        // 대표 사이트의 SEO 정보가 있으면 매핑 (배포 이력의 첫번째 활성화된 주소의 정보 참조)
        const activePrimary = data.publishedSites?.find(
          (s: PublishedSite) => s.domain_type === "PRIMARY" && s.is_active === 1
        );
        if (activePrimary) {
          setSeoTitle(activePrimary.title || "");
          setSeoDescription(activePrimary.description || "");
        }
      } else {
        showToast(data.error || "도메인 설정 조회 실패", "error");
      }
    } catch (e: any) {
      showToast("서버 통신 오류: " + e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 대표 홈페이지 주소 업데이트
  const handleUpdateUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!homepageUrl.trim()) {
      alert("홈페이지 URL 주소를 입력해 주세요.");
      return;
    }

    setSavingUrl(true);
    try {
      const res = await apiFetch("/api/website/domain-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ homepageUrl })
      });
      const data = await res.json();
      if (data.success) {
        showToast("대표 홈페이지 주소가 안전하게 동기화되었습니다. 🌐");
        loadData();
        if (onUrlUpdated) onUrlUpdated();
      } else {
        showToast(data.error || "대표 홈페이지 주소 저장 실패", "error");
      }
    } catch (err: any) {
      showToast("서버 저장 오류: " + err.message, "error");
    } finally {
      setSavingUrl(false);
    }
  };

  // 대표 사이트 SEO 메타 정보 저장
  const handleSaveSeo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSeo(true);
    
    try {
      // SEO 정보만 간편 업데이트를 수행하기 위해
      // 마지막 PRIMARY 활성화된 배포 내역의 SEO 필드를 업데이트하거나 신규 배포 정보 업로드 시 바인딩하게 유도
      const primaryActive = publishedSites.find(s => s.domain_type === "PRIMARY" && s.is_active === 1);
      if (!primaryActive) {
        showToast("배포된 내역이 없습니다. 먼저 빌더를 통해 대표 홈페이지에 배포를 1회 실행한 후 SEO를 저장할 수 있습니다.", "error");
        setSavingSeo(false);
        return;
      }

      // publish API를 경유하여 기존 사이트의 SEO 필드 갱신
      const res = await apiFetch("/api/website/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain_type: "PRIMARY",
          domain_url: homepageUrl,
          html_content: "/* SEO UPDATE ONLY */",
          config_json: primaryActive.config_json || "{}",
          title: seoTitle,
          description: seoDescription
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast("검색엔진 최적화(SEO) 메타 설정이 공식 도메인에 즉시 반영되었습니다. 🎯");
        loadData();
      } else {
        showToast(data.error || "SEO 정보 저장 실패", "error");
      }
    } catch (err: any) {
      showToast("통신 오류: " + err.message, "error");
    } finally {
      setSavingSeo(false);
    }
  };

  // AI 기반 SEO 설정 추천 기능
  const handleSuggestSeo = async () => {
    if (!currentConfig) {
      showToast("현재 제작 중인 홈페이지 정보가 없습니다. 대화창에서 먼저 홈페이지를 빌드해주세요.", "error");
      return;
    }

    setSuggestingSeo(true);
    try {
      const res = await apiFetch("/api/website/suggest-seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: currentConfig })
      });
      const data = await res.json();
      if (data.success) {
        setSeoTitle(data.title || "");
        setSeoDescription(data.description || "");
        showToast("AI가 추천하는 SEO 메타데이터 정보가 자동 입력되었습니다! 🎯", "success");
      } else {
        showToast(data.error || "SEO 추천 실패", "error");
      }
    } catch (e: any) {
      showToast("추천 통신 오류: " + e.message, "error");
    } finally {
      setSuggestingSeo(false);
    }
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto max-h-[810px] text-slate-800 bg-white">
      
      {/* 대표 도메인 설정 섹션 */}
      <div className="bg-slate-50/50 border border-slate-100 p-5 rounded-2xl shadow-sm text-left">
        <h4 className="text-sm font-black text-slate-900 flex items-center gap-2 mb-2">
          <Globe className="w-4.5 h-4.5 text-pink-600 animate-pulse" />
          공식 대표 홈페이지 주소 연결
        </h4>
        <p className="text-[11px] text-slate-500 mb-4 font-semibold leading-relaxed">
          본 서비스와 연결할 회사의 메인 도메인을 입력하십시오. 이 도메인 주소 정보는 시스템 프로필과 자동으로 양방향 동기화됩니다.
        </p>

        <form onSubmit={handleUpdateUrl} className="flex gap-2.5">
          <input
            type="url"
            value={homepageUrl}
            onChange={(e) => setHomepageUrl(e.target.value)}
            placeholder="https://yourcompany.com"
            className="flex-1 px-4 py-2.5 bg-white border border-slate-200 focus:border-pink-600 focus:outline-none rounded-xl text-xs font-bold text-slate-800 transition"
            disabled={savingUrl || loading}
            required
          />
          <button
            type="submit"
            disabled={savingUrl || loading}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white font-extrabold text-xs transition rounded-xl cursor-pointer border-none flex items-center gap-1.5 shadow shrink-0"
          >
            {savingUrl ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            설정 저장
          </button>
        </form>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs font-bold space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-pink-500" />
          <p>공식 도메인 연결 정보 및 호스팅 헬스상태 검사 중...</p>
        </div>
      ) : (
        <>
          {/* 대표 홈페이지 헬스체크 카드 */}
          {primaryHealth && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
              {/* 서버 연결 상태 */}
              <div className="bg-white border border-slate-150 p-4 rounded-2xl shadow-sm flex items-start gap-3.5">
                <div className={`p-2.5 rounded-xl ${primaryHealth.status === "HEALTHY" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                  <Activity className="w-5 h-5 animate-pulse" />
                </div>
                <div className="space-y-1 font-semibold text-xs">
                  <span className="block text-[10px] text-slate-400 font-bold">호스팅 연결 상태</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-800 font-black">{primaryHealth.status === "HEALTHY" ? "정상 작동 중" : "일시 지연"}</span>
                    <span className={`w-2 h-2 rounded-full ${primaryHealth.status === "HEALTHY" ? "bg-emerald-500" : "bg-amber-500"}`} />
                  </div>
                  <span className="block text-[9.5px] text-slate-450 font-bold">접속 지연속도: {primaryHealth.latency}</span>
                </div>
              </div>

              {/* SSL 보안 인증서 */}
              <div className="bg-white border border-slate-150 p-4 rounded-2xl shadow-sm flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="space-y-1 font-semibold text-xs">
                  <span className="block text-[10px] text-slate-400 font-bold">SSL 보안인증서 (HTTPS)</span>
                  <span className="block text-slate-800 font-black">안전함 (보안인증 적용)</span>
                  <span className="block text-[9.5px] text-slate-450 font-bold">만료 잔여일: {primaryHealth.sslRemainDays}일 남음</span>
                </div>
              </div>

              {/* 트래픽 / 엣지 CDN */}
              <div className="bg-white border border-slate-150 p-4 rounded-2xl shadow-sm flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-pink-50 text-pink-600">
                  <Globe className="w-5 h-5" />
                </div>
                <div className="space-y-1 font-semibold text-xs">
                  <span className="block text-[10px] text-slate-400 font-bold">오늘 접속 방문 수</span>
                  <span className="block text-slate-800 font-black">{primaryHealth.trafficToday.toLocaleString()} PageView</span>
                  <span className="block text-[9.5px] text-slate-450 font-bold">서버: {primaryHealth.serverType}</span>
                </div>
              </div>
            </div>
          )}

          {/* 검색엔진 최적화 (SEO) 설정 섹션 */}
          <div className="bg-white border border-slate-150 p-5 rounded-2xl shadow-sm text-left">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Link className="w-4 h-4 text-pink-600" />
              검색 포털 최적화 (SEO) 설정
            </h4>
            <button
              type="button"
              onClick={handleSuggestSeo}
              disabled={suggestingSeo || !currentConfig}
              className="px-3 py-1.5 bg-pink-50 hover:bg-pink-100 disabled:bg-slate-100 text-pink-700 disabled:text-slate-400 font-extrabold text-[10px] transition rounded-lg cursor-pointer border border-pink-200/50 disabled:border-none flex items-center gap-1 shadow-sm"
            >
              {suggestingSeo ? <RefreshCw className="w-3 h-3 animate-spin text-pink-600" /> : <Sparkles className="w-3 h-3 text-pink-600" />}
              AI 추천 ✨
            </button>
          </div>
          <p className="text-[11px] text-slate-500 mb-4 font-semibold leading-relaxed">
              네이버, 구글 등 주요 검색엔진 검색 시 노출될 대표 제목과 메타 설명을 수정합니다. (실제 배포된 내역이 있을 시 작동 가능)
            </p>

            <form onSubmit={handleSaveSeo} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">사이트 대표 제목 (SEO Title)</label>
                <input
                  type="text"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  placeholder="예: 라 프렌치 다이닝 - 프렌치 요리와 파인 다이닝 전문점"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-pink-600 focus:outline-none rounded-xl text-xs font-bold text-slate-800 transition"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">사이트 검색 정보 요약 (Meta Description)</label>
                <textarea
                  rows={2}
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  placeholder="예: 강남에서 만나는 최고급 미쉐린 셰프의 프랑스 정통 파인 다이닝 코스 요리 전문점입니다. 지금 예약하세요."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-pink-600 focus:outline-none rounded-xl text-xs font-bold text-slate-800 transition resize-none leading-normal"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={savingSeo}
                  className="px-5 py-2.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-extrabold text-xs transition rounded-xl cursor-pointer border-none flex items-center gap-1.5 shadow"
                >
                  {savingSeo ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  SEO 설정 저장
                </button>
              </div>
            </form>
          </div>

          {/* 다변화 배포 이력 내역 테이블 */}
          <div className="bg-white border border-slate-150 p-5 rounded-2xl shadow-sm text-left">
            <h4 className="text-sm font-black text-slate-900 flex items-center gap-2 mb-2">
              <History className="w-4 h-4 text-pink-600" />
              도메인 다변화 배포 및 연결 이력
            </h4>
            <p className="text-[11px] text-slate-500 mb-4 font-semibold leading-relaxed">
              대표 홈페이지, 커스텀 도메인, 또는 서브도메인을 연결하여 배포한 내역 및 헬스 분석 정보를 제공합니다.
            </p>

            <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-inner">
              <table className="w-full border-collapse text-left text-xs font-semibold">
                <thead>
                  <tr className="bg-slate-500/5 text-slate-400 border-b border-slate-100">
                    <th className="p-3">배포 주소</th>
                    <th className="p-3 text-center">도메인 유형</th>
                    <th className="p-3">사이트 제목</th>
                    <th className="p-3 text-center">연결 상태</th>
                    <th className="p-3 text-center">만료 예정일</th>
                    <th className="p-3 text-center">배포 일자</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {publishedSites.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 font-bold">
                        최근 배포 이력 정보가 없습니다. 가상 뷰어 하단 [배포하기] 버튼을 통해 배포를 시도해 주세요.
                      </td>
                    </tr>
                  ) : (
                    publishedSites.map((site) => (
                      <tr key={site.id} className="hover:bg-slate-50/50 transition">
                        <td className="p-3 font-mono font-bold text-pink-600 truncate max-w-[180px]">
                          <a href={site.domain_url} target="_blank" rel="noreferrer" className="hover:underline flex items-center gap-1">
                            {site.domain_url.replace(/https?:\/\//, '')}
                          </a>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
                            site.domain_type === "PRIMARY" ? "bg-pink-50 text-pink-600 border border-pink-100" :
                            site.domain_type === "CUSTOM" ? "bg-violet-50 text-violet-600 border border-violet-100" :
                            "bg-indigo-50 text-indigo-600 border border-indigo-100"
                          }`}>
                            {site.domain_type === "PRIMARY" ? "대표도메인" :
                             site.domain_type === "CUSTOM" ? "커스텀도메인" : "서브도메인"}
                          </span>
                        </td>
                        <td className="p-3 text-slate-700 font-bold truncate max-w-[120px]">{site.title || site.domain_url}</td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${site.health?.status === "HEALTHY" ? "bg-emerald-500 animate-ping" : "bg-amber-500"}`} />
                            <span className="text-[10px] text-slate-700 font-bold">{site.health?.latency || "측정불가"}</span>
                          </div>
                        </td>
                        <td className="p-3 text-center font-mono text-slate-500">{site.health?.sslExpireDate || "-"}</td>
                        <td className="p-3 text-center font-mono text-slate-400">{site.updated_at.slice(0, 10)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
