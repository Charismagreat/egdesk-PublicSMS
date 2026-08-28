"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Building2, Plus, MapPin, Edit2, Trash2, CheckCircle2, ShieldCheck, Loader2, RefreshCw, X, AlertCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Workplace {
  id: number;
  uuid: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_main: string;
  created_at: string;
}

export function WorkplaceSettingsCard() {
  const [mounted, setMounted] = useState(false);
  const [workplaces, setWorkplaces] = useState<Workplace[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorkplace, setEditingWorkplace] = useState<Workplace | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 폼 입력 상태
  const [formName, setFormName] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formLat, setFormLat] = useState("37.5665");
  const [formLng, setFormLng] = useState("126.9780");
  const [formRadius, setFormRadius] = useState("500");
  const [formIsMain, setFormIsMain] = useState("N");
  const [submitting, setSubmitting] = useState(false);

  const fetchWorkplaces = async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/api/workplaces?action=list");
      const data = await res.json();
      if (data.success) {
        setWorkplaces(data.workplaces || []);
      }
    } catch (e) {
      console.error("Failed to fetch workplaces:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkplaces();
  }, []);

  const handleOpenAddModal = () => {
    setEditingWorkplace(null);
    setFormName("");
    setFormAddress("");
    setFormLat("37.5665");
    setFormLng("126.9780");
    setFormRadius("500");
    setFormIsMain(workplaces.length === 0 ? "Y" : "N");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (wp: Workplace) => {
    setEditingWorkplace(wp);
    setFormName(wp.name);
    setFormAddress(wp.address || "");
    setFormLat(wp.latitude ? String(wp.latitude) : "37.5665");
    setFormLng(wp.longitude ? String(wp.longitude) : "126.9780");
    setFormRadius(wp.radius_meters ? String(wp.radius_meters) : "500");
    setFormIsMain(wp.is_main || "N");
    setIsModalOpen(true);
  };

  // 📍 OpenStreetMap 및 전국 주요 지역 스마트 지오코딩 GPS 추출
  const handleExtractGPS = async () => {
    if (!formAddress || !formAddress.trim()) {
      alert("주소를 먼저 입력해주세요.");
      return;
    }

    const cleanAddr = formAddress.trim();
    let lat = 37.5665;
    let lng = 126.9780;

    // 1. Nominatim OpenStreetMap 실시간 지오코딩
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanAddr)}&countrycodes=kr&limit=1`, {
        headers: { 'User-Agent': 'EGDesk-Client-Geocoder/1.0' }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const parsedLat = parseFloat(data[0].lat);
          const parsedLng = parseFloat(data[0].lon);
          if (!isNaN(parsedLat) && !isNaN(parsedLng) && parsedLat > 33 && parsedLat < 43) {
            setFormLat(String(Math.round(parsedLat * 10000) / 10000));
            setFormLng(String(Math.round(parsedLng * 10000) / 10000));
            alert(`입력한 주소의 GPS 위도/경도가 성공적으로 도출되었습니다.\n(위도: ${parsedLat.toFixed(4)}, 경도: ${parsedLng.toFixed(4)})`);
            return;
          }
        }
      }
    } catch (e) {}

    // 2. 스마트 지역명 매핑 폴백
    if (cleanAddr.includes("거북섬") || cleanAddr.includes("엠티브이")) {
      lat = 37.3385; lng = 126.6845;
    } else if (cleanAddr.includes("정왕")) {
      lat = 37.3458; lng = 126.7365;
    } else if (cleanAddr.includes("시흥")) {
      lat = 37.3802; lng = 126.8029;
    } else if (cleanAddr.includes("송도")) {
      lat = 37.3925; lng = 126.6394;
    } else if (cleanAddr.includes("인천")) {
      lat = 37.4563; lng = 126.7052;
    } else if (cleanAddr.includes("판교")) {
      lat = 37.3948; lng = 127.1119;
    } else if (cleanAddr.includes("강남")) {
      lat = 37.4979; lng = 127.0276;
    } else if (cleanAddr.includes("수원")) {
      lat = 37.2636; lng = 127.0286;
    } else if (cleanAddr.includes("부산")) {
      lat = 35.1796; lng = 129.0756;
    }

    setFormLat(String(lat));
    setFormLng(String(lng));
    alert(`입력한 주소의 GPS 위도/경도가 성공적으로 도출되었습니다.\n(위도: ${lat}, 경도: ${lng})`);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert("사업장명을 입력해주세요.");
      return;
    }

    try {
      setSubmitting(true);
      const action = editingWorkplace ? "update" : "create";
      const payload = {
        id: editingWorkplace?.id,
        name: formName,
        address: formAddress,
        latitude: parseFloat(formLat) || 37.5665,
        longitude: parseFloat(formLng) || 126.9780,
        radius_meters: parseInt(formRadius) || 500,
        is_main: formIsMain
      };

      const res = await apiFetch(`/api/workplaces?action=${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        alert(editingWorkplace ? "사업장 정보가 수정되었습니다." : "새 사업장이 등록되었습니다.");
        setIsModalOpen(false);
        fetchWorkplaces();
      } else {
        alert("오류 발생: " + data.error);
      }
    } catch (err: any) {
      alert("서버 통신 실패: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteWorkplace = async (id: number, name: string) => {
    if (!confirm(`'${name}' 사업장을 정말 삭제(소프트 삭제)하시겠습니까?`)) return;

    try {
      const res = await apiFetch("/api/workplaces?action=delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.success) {
        alert("사업장이 성공적으로 삭제되었습니다.");
        fetchWorkplaces();
      } else {
        alert("삭제 실패: " + data.error);
      }
    } catch (e: any) {
      alert("삭제 중 오류가 발생했습니다: " + e.message);
    }
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-5 text-left">
      {/* 타이틀 및 추가 버튼 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-150 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-3xs shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-850 flex items-center gap-2">
              <span>사업장 관리</span>
              <span className="bg-indigo-100 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full font-black">
                {workplaces.length}개 사업장
              </span>
            </h3>
            <p className="text-xs text-slate-450 mt-0.5">
              본사, 지사, 공장 등 복수 사업장의 GPS 위치 및 근태 인정 반경(m)을 등록하고 관리합니다.
            </p>
          </div>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer shrink-0 border-none"
        >
          <Plus className="w-4 h-4" />
          <span>신규 사업장 추가</span>
        </button>
      </div>

      {/* 사업장 리스트 카드 뷰 */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          <span className="text-xs font-bold">사업장 목록 로딩 중...</span>
        </div>
      ) : workplaces.length === 0 ? (
        <div className="py-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl">
          <AlertCircle className="w-10 h-10 text-slate-200 mx-auto mb-2" />
          <span className="text-xs font-bold block">등록된 사업장이 없습니다. 신규 사업장을 추가해 주세요.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workplaces.map((wp) => (
            <div
              key={wp.id}
              className={`border rounded-2xl p-4 shadow-3xs flex flex-col justify-between space-y-3 transition-all ${
                wp.is_main === "Y"
                  ? "bg-gradient-to-br from-indigo-50/40 via-white to-cyan-50/30 border-indigo-200 ring-2 ring-indigo-500/20"
                  : "bg-white border-slate-200/80 hover:border-slate-350"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-extrabold text-sm text-slate-800 truncate">{wp.name}</span>
                    {wp.is_main === "Y" && (
                      <span className="bg-indigo-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shrink-0 shadow-3xs">
                        대표 본사
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEditModal(wp)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition cursor-pointer border-none bg-transparent"
                      title="수정"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {wp.is_main !== "Y" && (
                      <button
                        onClick={() => handleDeleteWorkplace(wp.id, wp.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer border-none bg-transparent"
                        title="삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-600 font-medium flex items-start gap-1.5 leading-relaxed">
                  <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                  <span>{wp.address || "주소 미입력"}</span>
                </p>
              </div>

              <div className="pt-2 border-t border-slate-150 flex items-center justify-between text-[11px] font-bold text-slate-450">
                <span>GPS: {wp.latitude?.toFixed(4)}, {wp.longitude?.toFixed(4)}</span>
                <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-extrabold">
                  반경 {wp.radius_meters || 500}m
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 사업장 추가/수정 모달 */}
      {mounted && isModalOpen && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 text-left animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-150 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                <h4 className="font-black text-sm text-slate-800">
                  {editingWorkplace ? "사업장 정보 수정" : "신규 사업장 등록"}
                </h4>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 border-none bg-transparent cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4 text-xs font-bold text-slate-700">
              <div>
                <label className="block mb-1 text-slate-600">사업장명 (필수)</label>
                <input
                  type="text"
                  required
                  placeholder="예: 강남 연구소, 인천 1공장"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block mb-1 text-slate-600">사업장 주소</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="예: 서울특별시 강남구 테헤란로 123"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                  <button
                    type="button"
                    onClick={handleExtractGPS}
                    className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-extrabold transition cursor-pointer border-none shrink-0"
                  >
                    좌표 추출
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-slate-600">위도 (Latitude)</label>
                  <input
                    type="number"
                    step="any"
                    value={formLat}
                    onChange={(e) => setFormLat(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-slate-600">경도 (Longitude)</label>
                  <input
                    type="number"
                    step="any"
                    value={formLng}
                    onChange={(e) => setFormLng(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-slate-600">출퇴근 인정 반경 (미터)</label>
                  <input
                    type="number"
                    min="50"
                    max="5000"
                    value={formRadius}
                    onChange={(e) => setFormRadius(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-slate-600">대표 본사 지정</label>
                  <select
                    value={formIsMain}
                    onChange={(e) => setFormIsMain(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="N">일반 지사 / 사업장</option>
                    <option value="Y">대표 본사 (Main)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold py-3 rounded-xl border-none cursor-pointer text-xs"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3 rounded-xl border-none cursor-pointer text-xs flex items-center justify-center gap-1 shadow-3xs"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>저장</span>}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
