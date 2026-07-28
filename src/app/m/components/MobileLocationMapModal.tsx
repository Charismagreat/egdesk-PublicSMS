"use client";

import React from "react";
import { MapPin, X, Loader2, RefreshCw } from "lucide-react";

interface MobileLocationMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  userCoords: { lat: number; lng: number } | null;
  locationAddress: string;
  locationLoading: boolean;
  allWorkplaces: any[];
  selectedWorkplace: any | null;
  onSelectWorkplace: (workplace: any) => void;
  onReMeasureLocation: () => void;
}

export const MobileLocationMapModal: React.FC<MobileLocationMapModalProps> = ({
  isOpen,
  onClose,
  userCoords,
  locationAddress,
  locationLoading,
  allWorkplaces,
  selectedWorkplace,
  onSelectWorkplace,
  onReMeasureLocation,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-5 space-y-4 text-left animate-scale-in">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between border-b border-slate-150 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600 shrink-0">
              <MapPin className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-800">근태 등록 위치 지도</h3>
              <p className="text-[10px] text-slate-400 font-bold">출퇴근 인정 위치 및 실시간 GPS</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer border-none bg-transparent"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 🏢 사업장 전환 선택 드롭다운 */}
        {allWorkplaces.length > 0 && (
          <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-2.5 space-y-1">
            <label className="block text-[10px] font-black text-indigo-700">
              근태 대상 사업장 (클릭 시 수동 전환)
            </label>
            <select
              value={selectedWorkplace?.id || ""}
              onChange={(e) => {
                const wp = allWorkplaces.find((w) => String(w.id) === e.target.value);
                if (wp) onSelectWorkplace(wp);
              }}
              className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {allWorkplaces.map((wp) => (
                <option key={wp.id} value={wp.id}>
                  {wp.name} {wp.is_main === "Y" ? "(대표 본사)" : ""} - {wp.address || "주소미입력"}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 지도 타일 영역 (OpenStreetMap 대화형 뷰어 & GPS 정보) */}
        <div className="space-y-3">
          <div className="relative w-full h-48 rounded-2xl overflow-hidden border border-slate-200 shadow-inner bg-slate-100 flex items-center justify-center">
            {userCoords ? (
              <iframe
                title="실시간 GPS 지도"
                width="100%"
                height="100%"
                frameBorder="0"
                scrolling="no"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${userCoords.lng - 0.004}%2C${userCoords.lat - 0.002}%2C${userCoords.lng + 0.004}%2C${userCoords.lat + 0.002}&layer=mapnik&marker=${userCoords.lat}%2C${userCoords.lng}`}
                className="w-full h-full"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                <span className="text-xs font-bold">GPS 탐지 중...</span>
              </div>
            )}

            {/* 반경 상태 뱃지 */}
            <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-md text-white text-[9px] font-black px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>출퇴근 인정 구역 내</span>
            </div>
          </div>

          {/* 주소 및 위치 상세 상태 정보 */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span>현재 탐지 위치</span>
              </span>
              <button
                type="button"
                onClick={onReMeasureLocation}
                className="text-[10px] text-indigo-600 hover:underline font-black flex items-center gap-1 bg-transparent border-none cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>재측정</span>
              </button>
            </div>
            <p className="text-xs text-slate-600 font-semibold break-keep leading-snug">
              {locationLoading ? "GPS 위치 정보 수신 중..." : locationAddress}
            </p>
          </div>

          {/* 외부 길찾기 웹 링크 버튼 목록 */}
          {userCoords && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <a
                href={`https://map.kakao.com/link/map/현재위치,${userCoords.lat},${userCoords.lng}`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2 bg-yellow-400/90 hover:bg-yellow-400 text-slate-900 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1 transition-all text-decoration-none shadow-2xs"
              >
                <span>카카오맵 보기</span>
              </a>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${userCoords.lat},${userCoords.lng}`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1 transition-all text-decoration-none shadow-2xs"
              >
                <span>구글지도 길찾기</span>
              </a>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-colors border-none cursor-pointer"
        >
          닫기
        </button>
      </div>
    </div>
  );
};
