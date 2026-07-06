import React from "react";
import { Info, Save } from "lucide-react";
import { WebsiteConfig } from "../types";

interface ManualTunerPanelProps {
  config: WebsiteConfig;
  setConfig: (config: WebsiteConfig) => void;
  onSave: () => void;
}

export const ManualTunerPanel: React.FC<ManualTunerPanelProps> = ({
  config,
  setConfig,
  onSave,
}) => {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
      {/* 기본 핵심 정보 편집 */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-pink-600 tracking-wider uppercase border-b border-slate-100 pb-2">
          1. 대표 브랜드 타이틀 및 메인 소개
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">상호/사이트 타이틀 *</label>
            <input
              type="text"
              value={config.title}
              onChange={(e) => setConfig({ ...config, title: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-pink-500 transition-all font-bold shadow-inner"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">한줄 서브타이틀 *</label>
            <input
              type="text"
              value={config.subtitle}
              onChange={(e) => setConfig({ ...config, subtitle: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-pink-500 transition-all shadow-inner"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">자세한 서비스/비즈니스 설명 *</label>
          <textarea
            value={config.aboutText}
            onChange={(e) => setConfig({ ...config, aboutText: e.target.value })}
            rows={4}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-pink-500 transition-all leading-relaxed whitespace-pre-line shadow-inner"
          />
        </div>
      </div>

      {/* 디자인 스킨 및 테마 색상 선택 */}
      <div className="space-y-4 pt-2">
        <h3 className="text-sm font-bold text-pink-600 tracking-wider uppercase border-b border-slate-100 pb-2">
          2. 비주얼 테마 & 스킨 스타일
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { id: "gradient", name: "비비드 그라디언트" },
            { id: "minimal", name: "미니멀리즘 화이트" },
            { id: "dark", name: "네온 다크모드" },
            { id: "glass", name: "글래스모피즘 아크릴" },
          ].map((skin) => (
            <button
              key={skin.id}
              type="button"
              onClick={() => setConfig({ ...config, theme: skin.id as any })}
              className={`py-3 px-4 rounded-xl border text-xs font-extrabold transition-all cursor-pointer border-0 ${
                config.theme === skin.id
                  ? "bg-gradient-to-r from-pink-500 to-purple-600 border-transparent text-white shadow-md font-black"
                  : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:border-slate-300"
              }`}
            >
              {skin.name}
            </button>
          ))}
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 mb-2">시그니처 포인트 컬러 테마</label>
          <div className="flex flex-wrap gap-2.5">
            {[
              { id: "indigo", bg: "bg-indigo-600", text: "로얄블루" },
              { id: "emerald", bg: "bg-emerald-600", text: "에메랄드" },
              { id: "rose", bg: "bg-rose-600", text: "로즈레드" },
              { id: "amber", bg: "bg-amber-500", text: "골드옐로우" },
              { id: "violet", bg: "bg-violet-600", text: "바이올렛" },
              { id: "cyan", bg: "bg-cyan-500", text: "아쿠아시안" },
              { id: "slate", bg: "bg-slate-600", text: "차콜그레이" },
            ].map((col) => (
              <button
                key={col.id}
                type="button"
                onClick={() => setConfig({ ...config, primaryColor: col.id as any })}
                className={`flex items-center gap-1.5 py-2 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer border-0 ${
                  config.primaryColor === col.id
                    ? "border-pink-500 bg-pink-50 text-pink-700 font-extrabold shadow-sm"
                    : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:border-slate-300"
                }`}
              >
                <span className={`w-3 h-3 rounded-full ${col.bg}`} />
                {col.text}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 디바이스 내부 노출 섹션 온오프 토글 */}
      <div className="space-y-4 pt-2">
        <h3 className="text-sm font-bold text-pink-600 tracking-wider uppercase border-b border-slate-100 pb-2">
          3. 홈페이지 구성 섹션 노출 토글
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { key: "hero", label: "메인 인트로 배너" },
            { key: "about", label: "상세 소개글" },
            { key: "products", label: "상품/메뉴 쇼케이스" },
            { key: "booking", label: "간편 실시간 예약 폼" },
            { key: "map", label: "오시는길 지도 (네이버)" },
            { key: "contact", label: "푸터 연락처 정보" },
          ].map((sec) => (
            <label
              key={sec.key}
              className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer select-none transition-all ${
                config.sections[sec.key as keyof typeof config.sections]
                  ? "bg-pink-50/40 border-pink-500/50 text-pink-700 font-extrabold shadow-sm"
                  : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
              }`}
            >
              <span className="text-xs">{sec.label}</span>
              <input
                type="checkbox"
                checked={config.sections[sec.key as keyof typeof config.sections]}
                onChange={(e) => {
                  const secs = { ...config.sections, [sec.key]: e.target.checked };
                  setConfig({ ...config, sections: secs });
                }}
                className="rounded bg-white border-slate-300 text-pink-600 focus:ring-0 w-4 h-4 cursor-pointer"
              />
            </label>
          ))}
        </div>
      </div>

      {/* 매장/상호 연락처 및 지도 주소 */}
      <div className="space-y-4 pt-2">
        <h3 className="text-sm font-bold text-pink-600 tracking-wider uppercase border-b border-slate-100 pb-2">
          4. 오프라인 위치 및 연락처 정보
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">문의처 대표번호 *</label>
            <input
              type="text"
              value={config.contactPhone}
              onChange={(e) => setConfig({ ...config, contactPhone: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-pink-500 transition-all shadow-inner"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">오시는 길 주소지 *</label>
            <input
              type="text"
              value={config.address}
              onChange={(e) => setConfig({ ...config, address: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-pink-500 transition-all shadow-inner"
            />
          </div>
        </div>
      </div>

      {/* 퀵 셋팅 저장 알림 */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
        <div className="flex items-center gap-2.5">
          <Info className="w-5 h-5 text-pink-500 shrink-0" />
          <span className="text-xs text-slate-500 font-medium">
            수동으로 폼의 항목을 수정하는 즉시 모바일 라이브 폰 화면에 레이아웃이 주입됩니다.
          </span>
        </div>
        <button
          onClick={onSave}
          className="bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-95 text-white text-xs font-extrabold py-2.5 px-4 rounded-xl transition-all flex items-center gap-1 shadow-md active:scale-95 shrink-0 border-0 cursor-pointer"
        >
          <Save className="w-3.5 h-3.5" /> 저장하기
        </button>
      </div>
    </div>
  );
};
