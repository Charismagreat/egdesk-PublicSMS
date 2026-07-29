"use client";

import React, { useState, useEffect, useCallback } from "react";
import { usePersistedState } from "@/hooks/usePersistedState";
import { apiFetch } from "@/lib/api";
import { 
  Truck, Search, AlertTriangle, CheckCircle2, ShieldCheck, 
  RefreshCw, ArrowRightLeft, Anchor, Clock, DollarSign, 
  Sparkles, ExternalLink, Zap, AlertCircle, Building2, Star
} from "lucide-react";

interface ShipmentItem {
  id: string;
  item_name: string;
  quantity: string;
  supplier_name: string;
  status: string;
  eta: string;
  delay_probability: number;
  risk: "SAFE" | "WARNING" | "CRITICAL";
  route?: {
    fromName: string;
    toName: string;
  };
  alternatives?: any[];
}

interface SupplierItem {
  id: string;
  name: string;
  rating: number;
  on_time_delivery_rate: number;
  quality_score: number;
  contact: string;
}

export default function ScmManagementPage() {
  const [shipments, setShipments] = useState<ShipmentItem[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [alternativesMap, setAlternativesMap] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [isRestored, setIsRestored] = useState(false);

  // 브라우저 sessionStorage 연동 상태 보존
  const [searchQuery, setSearchQuery] = usePersistedState<string>("scm_search_query", "");
  const [activeFilter, setActiveFilter] = usePersistedState<string>("scm_active_filter", "ALL");

  // 대체 공급사 우회 모달 상태
  const [selectedShipment, setSelectedShipment] = useState<ShipmentItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRerouting, setIsRerouting] = useState(false);

  // SCM 데이터 조달
  const fetchScmData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/production/scm");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setShipments(data.shipments || []);
          setSuppliers(data.suppliers || []);
          setAlternativesMap(data.alternatives || {});
        }
      }
    } catch (err) {
      console.error("Failed to fetch SCM data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScmData();
    setIsRestored(true);
  }, [fetchScmData]);

  // AI 대체 공급사 우회 승인
  const handleRerouteSupplier = async (alternativeSupplierId: string) => {
    if (!selectedShipment) return;
    if (!window.confirm(`해당 화물(${selectedShipment.id})의 조달망을 선택한 대체 공급처로 즉시 전환하시겠습니까?`)) return;

    setIsRerouting(true);
    try {
      const res = await apiFetch("/api/production/scm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REROUTE",
          shipmentId: selectedShipment.id,
          alternativeSupplierId
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          alert("⚡ 대체 공급처 우회 전환이 성공적으로 적재 및 실행되었습니다!");
          setIsModalOpen(false);
          setSelectedShipment(null);
          fetchScmData();
        } else {
          alert(data.error || "우회 전환 실패");
        }
      }
    } catch (err) {
      console.error("Reroute Error:", err);
      alert("대체 공급사 전환 처리 중 오류가 발생했습니다.");
    } finally {
      setIsRerouting(false);
    }
  };

  // 검색 및 세그먼트 필터링
  const filteredShipments = shipments.filter((s) => {
    if (activeFilter === "CRITICAL" && s.risk !== "CRITICAL") return false;
    if (activeFilter === "WARNING" && s.risk !== "WARNING") return false;
    if (activeFilter === "SAFE" && s.risk !== "SAFE") return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.id.toLowerCase().includes(q) ||
      s.item_name.toLowerCase().includes(q) ||
      s.supplier_name.toLowerCase().includes(q) ||
      s.status.toLowerCase().includes(q)
    );
  });

  // KPI 수치 집계
  const totalCount = shipments.length;
  const criticalCount = shipments.filter((s) => s.risk === "CRITICAL").length;
  const warningCount = shipments.filter((s) => s.risk === "WARNING").length;
  const safeCount = shipments.filter((s) => s.risk === "SAFE").length;

  return (
    <div className="w-full px-4 md:px-8 py-6 space-y-6 bg-slate-50 min-h-screen text-left">
      {/* 1. 헤더 타이틀 영역 (NEW PAGE UI RULES 준수) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Truck className="w-8 h-8 text-indigo-600 shrink-0" />
            <span>공급망 관리 AI</span>
          </h1>
          <p className="text-slate-500 mt-2 text-sm">
            글로벌 선적/항만 지연 위험 실시간 AI 예후 예측 및 대체 공급처 우회 자동 전환 센터
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchScmData}
            className="p-2.5 bg-white hover:bg-slate-100 text-slate-600 rounded-2xl border border-slate-200 transition-all cursor-pointer shadow-3xs flex items-center gap-1.5 font-bold text-xs"
            title="새로고침"
          >
            <RefreshCw className="w-4 h-4 text-indigo-600" />
            <span>데이터 동기화</span>
          </button>
        </div>
      </div>

      {/* 2. 대형 요약 KPI 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 block">총 SCM 조달 화물</span>
            <span className="text-2xl font-black text-slate-800 mt-1 block">{totalCount}건</span>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Anchor className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 block">정상 입고 예정 (SAFE)</span>
            <span className="text-2xl font-black text-emerald-600 mt-1 block">{safeCount}건</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 block">지연 주의 / 경보 (WARNING)</span>
            <span className="text-2xl font-black text-amber-600 mt-1 block">{warningCount}건</span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 block">심각한 지연 위험 (CRITICAL)</span>
            <span className="text-2xl font-black text-rose-600 mt-1 block">{criticalCount}건</span>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 3. 검색 바 및 세그먼트 필터 */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl shrink-0 w-full md:w-auto">
          {[
            { id: "ALL", label: "전체 화물" },
            { id: "CRITICAL", label: "🔴 고위험 (70%+)" },
            { id: "WARNING", label: "🟡 주의 (30%+)" },
            { id: "SAFE", label: "🟢 정상 이송" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border-none cursor-pointer whitespace-nowrap flex-1 md:flex-none ${
                activeFilter === tab.id
                  ? "bg-white text-indigo-600 shadow-2xs"
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
            placeholder="화물ID, 품명, 협력사명 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl pl-10 pr-4 py-2 text-xs font-bold text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* 4. SCM 조달 화물 메인 대장 테이블 */}
      <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden">
        {loading && !isRestored ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-500 mb-2" />
            <p className="text-xs font-bold">공급망 관리 AI 대장을 불러오는 중입니다...</p>
          </div>
        ) : filteredShipments.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <AlertCircle className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-600">조회된 SCM 조달 화물이 없습니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-extrabold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">화물 ID / B/L</th>
                  <th className="py-3.5 px-4">원자재/부품명</th>
                  <th className="py-3.5 px-4">공급 협력사</th>
                  <th className="py-3.5 px-4">운송 루트 (출발 ➔ 도착)</th>
                  <th className="py-3.5 px-4">입고 예정일 (ETA)</th>
                  <th className="py-3.5 px-4 text-center">AI 지연 위험도</th>
                  <th className="py-3.5 px-4 text-center">이송 상태</th>
                  <th className="py-3.5 px-4 text-center">AI 자율 조치</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredShipments.map((s) => {
                  const hasAlternatives = (s.alternatives && s.alternatives.length > 0) || (alternativesMap[s.id] && alternativesMap[s.id].length > 0);
                  const alts = s.alternatives || alternativesMap[s.id] || [];

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-black text-indigo-650">
                        {s.id}
                      </td>
                      <td className="py-3.5 px-4 font-extrabold text-slate-850">
                        {s.item_name} ({s.quantity})
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {s.supplier_name}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {s.route ? `${s.route.fromName} ➔ ${s.route.toName}` : "해외 세관 ➔ 평택 공장"}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        {s.eta}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black border">
                          <span className={`w-2 h-2 rounded-full ${
                            s.risk === "CRITICAL" ? "bg-rose-500 animate-ping" : s.risk === "WARNING" ? "bg-amber-500" : "bg-emerald-500"
                          }`} />
                          <span className={
                            s.risk === "CRITICAL" ? "text-rose-700" : s.risk === "WARNING" ? "text-amber-700" : "text-emerald-700"
                          }>
                            {s.delay_probability}% ({s.risk})
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 text-[11px] font-bold">
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {s.risk === "CRITICAL" || s.risk === "WARNING" ? (
                          <button
                            onClick={() => {
                              setSelectedShipment({ ...s, alternatives: alts });
                              setIsModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[11px] font-black transition-all shadow-2xs border-none cursor-pointer"
                          >
                            <Zap className="w-3.5 h-3.5 text-amber-300" />
                            <span>대체 공급사 우회 전환</span>
                          </button>
                        ) : (
                          <span className="text-emerald-600 font-bold text-[11px] flex items-center justify-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>정상 모니터링 중</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. 협력사 평점 & 신뢰도 스코어 카드 영역 */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs space-y-4 text-left">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-black text-slate-800">SCM 주요 원자재 협력사 신뢰성 평점</h3>
          </div>
          <span className="text-xs text-slate-400 font-bold">납기 준수율 및 데이터 갱신 기준</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map((sup) => (
            <div key={sup.id} className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-800 text-sm">{sup.name}</span>
                <span className="inline-flex items-center gap-1 text-amber-600 font-black text-xs bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200/60">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>{sup.rating}</span>
                </span>
              </div>
              <div className="text-xs text-slate-500 space-y-1 font-medium">
                <div className="flex justify-between">
                  <span>납기 준수율 (On-Time):</span>
                  <span className="font-bold text-slate-800">{sup.on_time_delivery_rate}%</span>
                </div>
                <div className="flex justify-between">
                  <span>품질 점수 (Quality):</span>
                  <span className="font-bold text-slate-800">{sup.quality_score}점</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>담당자 연락처:</span>
                  <span>{sup.contact}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. AI 대체 공급사 우회 추천 모달 */}
      {isModalOpen && selectedShipment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 text-left animate-scale-in">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-rose-600" />
                <h3 className="text-base font-black text-slate-800">AI 대체 공급처 우회 추천</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 border-none bg-transparent cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-rose-800 font-extrabold text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>지연 위험 감지: {selectedShipment.id} ({selectedShipment.item_name})</span>
              </div>
              <p className="text-[11px] text-rose-700/90 font-medium leading-relaxed">
                현재 지연 확률이 {selectedShipment.delay_probability}%로 예측되었습니다. 생산 차질을 방지하기 위해 AI가 추천하는 국내 대체 공급사로 즉시 우회합니다.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">AI 추천 우회 후보군 목록</h4>
              {selectedShipment.alternatives && selectedShipment.alternatives.length > 0 ? (
                selectedShipment.alternatives.map((alt: any) => (
                  <div key={alt.id} className="bg-white border border-indigo-200 rounded-2xl p-4 space-y-2 hover:border-indigo-500 transition-all shadow-3xs">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-indigo-950 text-sm">{alt.name}</span>
                      <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                        리드타임: {alt.leadTime}일 소요
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium leading-relaxed">
                      💡 {alt.reason}
                    </p>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="text-xs font-bold text-slate-700">
                        견적 금액: {Number(alt.price).toLocaleString()}원
                      </span>
                      <button
                        onClick={() => handleRerouteSupplier(alt.id)}
                        disabled={isRerouting}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all border-none cursor-pointer shadow-3xs"
                      >
                        {isRerouting ? "우회 전환 중..." : "이 대체 공급처로 전환 승인"}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-slate-800 text-sm">아시아 세미콘 (국내 우회)</span>
                    <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                      리드타임: 3일 소요
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                    💡 상해항 기상 악화 우회, 국내 창고 실시간 안전 재고 물량 확보로 3일 내 즉시 공급 가능.
                  </p>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-700">
                      추정 비용: 42,000,000원
                    </span>
                    <button
                      onClick={() => handleRerouteSupplier("SUP-02")}
                      disabled={isRerouting}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all border-none cursor-pointer shadow-3xs"
                    >
                      {isRerouting ? "우회 전환 중..." : "이 대체 공급처로 전환 승인"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
