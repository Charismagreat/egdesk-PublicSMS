import React from "react";
import { 
  ShoppingBag, Star, Flame, Check, AlertCircle, Phone, MapPin 
} from "lucide-react";
import { WebsiteConfig } from "../types";

interface LiveSimulatorProps {
  config: WebsiteConfig;
  alertMessage: { type: "success" | "info" | "error"; text: string } | null;
  couponDownloaded: boolean;
  handleDownloadCoupon: () => void;
  bookingForm: { name: string; phone: string; date: string; time: string; guests: string };
  setBookingForm: (form: any) => void;
  handleBookingSubmit: (e: React.FormEvent) => void;
  showMobileAlert: (type: "success" | "info" | "error", text: string) => void;
}

export const LiveSimulator: React.FC<LiveSimulatorProps> = ({
  config,
  alertMessage,
  couponDownloaded,
  handleDownloadCoupon,
  bookingForm,
  setBookingForm,
  handleBookingSubmit,
  showMobileAlert,
}) => {
  return (
    <div className="lg:col-span-5 flex flex-col items-center justify-center relative z-10">
      {/* 럭셔리 스마트폰 베젤 */}
      <div
        className="relative flex flex-col shrink-0 animate-scale-up"
        style={{
          width: "416px",
          height: "840px",
          backgroundColor: "#0f172a",
          border: "12px solid #1e293b",
          borderRadius: "56px",
          padding: "12px",
          boxShadow: "0 35px 80px -15px rgba(0,0,0,0.3), inset 0 0 0 2px rgba(255,255,255,0.15), 0 0 30px rgba(0,0,0,0.1)",
        }}
      >
        {/* 좌측 볼륨 조절 버튼 모형 */}
        <div className="absolute w-[4px] h-[40px] bg-slate-700 rounded-l-md" style={{ left: "-16px", top: "144px", border: "1px solid #1e293b", borderRight: "none" }} />
        <div className="absolute w-[4px] h-[40px] bg-slate-700 rounded-l-md" style={{ left: "-16px", top: "192px", border: "1px solid #1e293b", borderRight: "none" }} />

        {/* 우측 전원 버튼 모형 */}
        <div className="absolute w-[4px] h-[60px] bg-slate-700 rounded-r-md" style={{ right: "-16px", top: "168px", border: "1px solid #1e293b", borderLeft: "none" }} />

        {/* 폰 상단 가상 다이내믹 아일랜드 펀치홀 */}
        <div className="absolute top-3.5 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full z-50 flex items-center justify-center shadow-inner">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-950/80 border border-slate-800/20 mr-2 flex items-center justify-center">
            <div className="w-1 h-1 rounded-full bg-blue-900/60" />
          </div>
          <div className="w-12 h-1 bg-slate-950/80 rounded-full" />
        </div>

        {/* 폰 액정 내부 영역 */}
        <div className="flex-1 bg-white overflow-hidden flex flex-col relative select-none text-slate-800 text-left font-sans shadow-2xl" style={{ borderRadius: "42px" }}>
          {/* 모바일 최상단 가상 네비게이션 헤더 */}
          <div className="bg-slate-950 text-white pt-7 pb-3.5 px-6 flex items-center justify-between shrink-0 select-none">
            <span className="text-[11px] font-bold tracking-tight text-slate-200">EGDESK Live Preview</span>
            <span className="text-[9px] font-extrabold tracking-wide uppercase px-2.5 py-0.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-full">
              {config.mode === "store" ? "미니 스토어" : config.mode === "cms" ? "브랜드 홍보" : "웰컴 랜딩"}
            </span>
          </div>

          {/* ==================== 폰 내부 실제 뷰포트 스크롤 바디 ==================== */}
          <div className="flex-1 overflow-y-auto no-scrollbar bg-slate-50 relative flex flex-col">
            {/* 가상 알럿 노출 */}
            {alertMessage && (
              <div
                className={`absolute top-4 left-4 right-4 z-[999] p-3 rounded-2xl shadow-xl flex items-center gap-2 border text-xs font-bold animate-slide-in backdrop-blur-md ${
                  alertMessage.type === "success"
                    ? "bg-emerald-500/90 text-white border-emerald-400"
                    : alertMessage.type === "error"
                    ? "bg-rose-500/90 text-white border-rose-400"
                    : "bg-[#7928ca]/95 text-white border-purple-400"
                }`}
              >
                {alertMessage.type === "success" ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{alertMessage.text}</span>
              </div>
            )}

            {/* 테마 배경 */}
            <div
              className={`flex-1 flex flex-col relative transition-all ${
                config.theme === "dark"
                  ? "bg-slate-900 text-slate-100"
                  : config.theme === "gradient"
                  ? `bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 text-slate-100` // 템플릿 색상 그라데이션 단순화
                  : config.theme === "glass"
                  ? "bg-gradient-to-br from-slate-50 to-slate-100 text-slate-800"
                  : "bg-white text-slate-900"
              }`}
            >
              {/* 1. Hero 인트로 배너 섹션 */}
              {config.sections.hero && (
                <div
                  className={`relative px-5 pt-8 pb-10 text-center border-b ${
                    config.theme === "dark" ? "border-slate-800 bg-slate-950/40" : 
                    config.theme === "gradient" ? "border-slate-800/40 bg-black/20" : 
                    config.theme === "glass" ? "border-slate-200 bg-white/50 backdrop-blur-sm shadow-inner" : "border-slate-100 bg-slate-50"
                  }`}
                >
                  {/* 장식용 아이콘 원 */}
                  <div
                    className={`w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg transition-transform ${
                      config.primaryColor === "indigo" ? "bg-indigo-600 text-white" :
                      config.primaryColor === "emerald" ? "bg-emerald-600 text-white" :
                      config.primaryColor === "rose" ? "bg-rose-600 text-white" :
                      config.primaryColor === "amber" ? "bg-amber-500 text-slate-950 font-black" :
                      config.primaryColor === "violet" ? "bg-violet-600 text-white" :
                      config.primaryColor === "cyan" ? "bg-cyan-500 text-slate-950 font-black" : "bg-slate-800 text-white"
                    }`}
                  >
                    {config.mode === "store" ? <ShoppingBag className="w-7 h-7" /> : 
                     config.mode === "cms" ? <Star className="w-7 h-7" /> : <Flame className="w-7 h-7" />}
                  </div>

                  <h2 className={`text-xl font-extrabold tracking-tight mb-2.5 ${
                    config.theme === "dark" || config.theme === "gradient" ? "text-white" : "text-slate-900"
                  }`}>{config.title}</h2>
                  <p className={`text-xs leading-relaxed max-w-[240px] mx-auto font-medium ${
                    config.theme === "dark" || config.theme === "gradient" ? "text-slate-300" : "text-slate-600"
                  }`}>{config.subtitle}</p>
                </div>
              )}

              {/* 2. 회사/비즈니스 소개 섹션 */}
              {config.sections.about && (
                <div className="px-5 py-6">
                  <div className="flex items-center gap-1.5 mb-3">
                    <span className={`w-1 h-3.5 rounded ${
                      config.primaryColor === "indigo" ? "bg-indigo-600" :
                      config.primaryColor === "emerald" ? "bg-emerald-600" :
                      config.primaryColor === "rose" ? "bg-rose-600" :
                      config.primaryColor === "amber" ? "bg-amber-500" :
                      config.primaryColor === "violet" ? "bg-violet-600" :
                      config.primaryColor === "cyan" ? "bg-cyan-500" : "bg-slate-600"
                    }`} />
                    <h3 className={`text-xs font-black tracking-wider uppercase ${
                      config.theme === "dark" || config.theme === "gradient" ? "text-slate-300" : "text-slate-700"
                    }`}>비즈니스 소개</h3>
                  </div>
                  <p className={`text-[11px] leading-relaxed whitespace-pre-line text-justify ${
                    config.theme === "dark" || config.theme === "gradient" ? "text-slate-300" : "text-slate-600 font-medium"
                  }`}>{config.aboutText}</p>
                </div>
              )}

              {/* 3-A. 모바일 랜딩 전용 쿠폰 받기 섹션 */}
              {config.mode === "landing" && (
                <div className="px-5 py-4">
                  <div className={`p-4 rounded-3xl border-2 border-dashed relative overflow-hidden transition-all text-center ${
                    couponDownloaded
                      ? "bg-slate-900/50 border-slate-800 text-slate-500"
                      : config.primaryColor === "indigo" ? "bg-indigo-950/20 border-indigo-500/50 text-indigo-300" :
                        config.primaryColor === "emerald" ? "bg-emerald-950/20 border-emerald-500/50 text-emerald-300" :
                        config.primaryColor === "rose" ? "bg-rose-950/20 border-rose-500/50 text-rose-300" :
                        config.primaryColor === "amber" ? "bg-amber-950/20 border-amber-500/50 text-amber-300" :
                        config.primaryColor === "violet" ? "bg-violet-950/20 border-violet-500/50 text-violet-300" :
                        config.primaryColor === "cyan" ? "bg-cyan-950/20 border-cyan-500/50 text-cyan-300" : "bg-slate-900/40 border-slate-700 text-slate-300"
                  }`}>
                    <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full bg-slate-900/20" />
                    <h4 className="text-xs font-black tracking-wider uppercase opacity-80 mb-1.5">★ OPEN WELCOME COUPON ★</h4>
                    <div className={`text-2xl font-black mb-3 tracking-tight ${
                      couponDownloaded ? "text-slate-600 line-through" : "text-slate-900 dark:text-white"
                    }`}>전 품목 40% 즉시할인</div>
                    <p className="text-[10px] opacity-70 mb-4 font-bold">오픈 축하 감사 기념 선착순 발급 중</p>
                    <button
                      type="button"
                      onClick={handleDownloadCoupon}
                      className={`w-full py-2.5 rounded-xl text-[11px] font-black transition-all flex items-center justify-center gap-1.5 shadow-md border-0 cursor-pointer ${
                        couponDownloaded
                          ? "bg-slate-800 text-slate-600 cursor-not-allowed shadow-none border border-slate-900"
                          : config.primaryColor === "indigo" ? "bg-indigo-600 hover:bg-indigo-500 text-white" :
                            config.primaryColor === "emerald" ? "bg-emerald-600 hover:bg-emerald-500 text-white" :
                            config.primaryColor === "rose" ? "bg-rose-600 hover:bg-rose-500 text-white" :
                            config.primaryColor === "amber" ? "bg-amber-500 hover:bg-amber-400 text-slate-950" :
                            config.primaryColor === "violet" ? "bg-violet-600 hover:bg-violet-500 text-white" :
                            config.primaryColor === "cyan" ? "bg-cyan-500 hover:bg-cyan-400 text-slate-950" : "bg-slate-800 hover:bg-slate-700 text-white"
                      }`}
                    >
                      {couponDownloaded ? "🎟️ 발급 보관 완료" : "⚡ 40% 웰컴 쿠폰 발급받기"}
                    </button>
                  </div>
                </div>
              )}

              {/* 3-B. 상품 쇼케이스 리스트 섹션 */}
              {config.sections.products && config.products.length > 0 && (
                <div className="px-5 py-4">
                  <div className="flex items-center gap-1.5 mb-3">
                    <span className={`w-1 h-3.5 rounded ${
                      config.primaryColor === "indigo" ? "bg-indigo-600" :
                      config.primaryColor === "emerald" ? "bg-emerald-600" :
                      config.primaryColor === "rose" ? "bg-rose-600" :
                      config.primaryColor === "amber" ? "bg-amber-500" :
                      config.primaryColor === "violet" ? "bg-violet-600" :
                      config.primaryColor === "cyan" ? "bg-cyan-500" : "bg-slate-600"
                    }`} />
                    <h3 className={`text-xs font-black tracking-wider uppercase ${
                      config.theme === "dark" || config.theme === "gradient" ? "text-slate-300" : "text-slate-700"
                    }`}>대표 상품 & 추천 메뉴</h3>
                  </div>

                  <div className="space-y-3">
                    {config.products.map((prod) => (
                      <div
                        key={prod.id}
                        onClick={() => showMobileAlert("info", `🛒 '${prod.name}' 상품 상세 내역 조회가 활성화되었습니다.`)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex gap-3 ${
                          config.theme === "dark" || config.theme === "gradient"
                            ? "bg-slate-900/60 border-slate-800 hover:bg-slate-900"
                            : config.theme === "glass" ? "bg-white/70 border-white/80 hover:bg-white/90 shadow-sm" : "bg-white border-slate-100 hover:border-slate-200 shadow-sm"
                        }`}
                      >
                        <div className="w-12 h-12 rounded-xl bg-slate-200/40 shrink-0 flex items-center justify-center text-slate-400">
                          <ShoppingBag className="w-5 h-5 text-slate-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <h4 className={`text-[11px] font-bold truncate ${
                              config.theme === "dark" || config.theme === "gradient" ? "text-slate-100" : "text-slate-800"
                            }`}>{prod.name}</h4>
                            <span className={`text-[10px] font-black shrink-0 ${
                              config.primaryColor === "indigo" ? "text-indigo-600 dark:text-indigo-400" :
                              config.primaryColor === "emerald" ? "text-emerald-600 dark:text-emerald-400" :
                              config.primaryColor === "rose" ? "text-rose-600 dark:text-rose-400" :
                              config.primaryColor === "amber" ? "text-amber-600 dark:text-amber-500" :
                              config.primaryColor === "violet" ? "text-violet-600 dark:text-violet-400" :
                              config.primaryColor === "cyan" ? "text-cyan-600 dark:text-cyan-400" : "text-slate-700"
                            }`}>{prod.price}</span>
                          </div>
                          <p className={`text-[9.5px] truncate ${
                            config.theme === "dark" || config.theme === "gradient" ? "text-slate-400" : "text-slate-500 font-medium"
                          }`}>{prod.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. 실시간 예약 폼 섹션 */}
              {config.sections.booking && (
                <div className="px-5 py-4">
                  <div className="flex items-center gap-1.5 mb-3">
                    <span className={`w-1 h-3.5 rounded ${
                      config.primaryColor === "indigo" ? "bg-indigo-600" :
                      config.primaryColor === "emerald" ? "bg-emerald-600" :
                      config.primaryColor === "rose" ? "bg-rose-600" :
                      config.primaryColor === "amber" ? "bg-amber-500" :
                      config.primaryColor === "violet" ? "bg-violet-600" :
                      config.primaryColor === "cyan" ? "bg-cyan-500" : "bg-slate-600"
                    }`} />
                    <h3 className={`text-xs font-black tracking-wider uppercase ${
                      config.theme === "dark" || config.theme === "gradient" ? "text-slate-300" : "text-slate-700"
                    }`}>간편 실시간 예약 신청</h3>
                  </div>

                  <form onSubmit={handleBookingSubmit} className={`p-4 rounded-2xl border space-y-2.5 ${
                    config.theme === "dark" || config.theme === "gradient" ? "bg-slate-950/40 border-slate-800" : "bg-white border-slate-100 shadow-sm"
                  }`}>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[8.5px] font-bold text-slate-500 mb-0.5">성함</label>
                        <input
                          type="text"
                          required
                          value={bookingForm.name}
                          onChange={(e) => setBookingForm({ ...bookingForm, name: e.target.value })}
                          placeholder="홍길동"
                          className="w-full bg-slate-900/10 border border-slate-300/40 rounded-lg px-2.5 py-1.5 text-[10px] outline-none focus:border-pink-500 text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[8.5px] font-bold text-slate-500 mb-0.5">연락처</label>
                        <input
                          type="tel"
                          required
                          value={bookingForm.phone}
                          onChange={(e) => setBookingForm({ ...bookingForm, phone: e.target.value })}
                          placeholder="010-0000-0000"
                          className="w-full bg-slate-900/10 border border-slate-300/40 rounded-lg px-2.5 py-1.5 text-[10px] outline-none focus:border-pink-500 text-slate-800"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[8.5px] font-bold text-slate-500 mb-0.5">예약 날짜</label>
                        <input
                          type="date"
                          required
                          value={bookingForm.date}
                          onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })}
                          className="w-full bg-slate-900/10 border border-slate-300/40 rounded-lg px-2.5 py-1.5 text-[10px] outline-none focus:border-pink-500 text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[8.5px] font-bold text-slate-500 mb-0.5">인원 (선택)</label>
                        <select
                          value={bookingForm.guests}
                          onChange={(e) => setBookingForm({ ...bookingForm, guests: e.target.value })}
                          className="w-full bg-slate-900/10 border border-slate-300/40 rounded-lg px-2.5 py-1.5 text-[10px] outline-none focus:border-pink-500 text-slate-800"
                        >
                          <option value="1">1명</option>
                          <option value="2">2명</option>
                          <option value="3">3명</option>
                          <option value="4">4명 이상</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="col-span-2">
                        <label className="block text-[8.5px] font-bold text-slate-500 mb-0.5">희망 시간</label>
                        <input
                          type="time"
                          required
                          value={bookingForm.time}
                          onChange={(e) => setBookingForm({ ...bookingForm, time: e.target.value })}
                          className="w-full bg-slate-900/10 border border-slate-300/40 rounded-lg px-2.5 py-1.5 text-[10px] outline-none focus:border-pink-500 text-slate-800"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className={`w-full py-2.5 rounded-xl text-[10.5px] font-extrabold transition-all text-white shadow-md border-0 cursor-pointer ${
                        config.primaryColor === "indigo" ? "bg-indigo-600 hover:bg-indigo-500" :
                        config.primaryColor === "emerald" ? "bg-emerald-600 hover:bg-emerald-500" :
                        config.primaryColor === "rose" ? "bg-rose-600 hover:bg-rose-500" :
                        config.primaryColor === "amber" ? "bg-amber-500 hover:bg-amber-400 text-slate-950 font-black" :
                        config.primaryColor === "violet" ? "bg-violet-600 hover:bg-violet-500" :
                        config.primaryColor === "cyan" ? "bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black" : "bg-slate-800 hover:bg-slate-700"
                      }`}
                    >
                      📅 예약 정보 기입 완료 및 신청
                    </button>
                  </form>
                </div>
              )}

              {/* 5. 오시는 길 네이버 지도 섹션 */}
              {config.sections.map && (
                <div className="px-5 py-4">
                  <div className="flex items-center gap-1.5 mb-3">
                    <span className={`w-1 h-3.5 rounded ${
                      config.primaryColor === "indigo" ? "bg-indigo-600" :
                      config.primaryColor === "emerald" ? "bg-emerald-600" :
                      config.primaryColor === "rose" ? "bg-rose-600" :
                      config.primaryColor === "amber" ? "bg-amber-500" :
                      config.primaryColor === "violet" ? "bg-violet-600" :
                      config.primaryColor === "cyan" ? "bg-cyan-500" : "bg-slate-600"
                    }`} />
                    <h3 className={`text-xs font-black tracking-wider uppercase ${
                      config.theme === "dark" || config.theme === "gradient" ? "text-slate-300" : "text-slate-700"
                    }`}>오시는 길 (약도)</h3>
                  </div>

                  <div className={`rounded-2xl border overflow-hidden relative shadow-sm h-36 ${
                    config.theme === "dark" || config.theme === "gradient" ? "bg-slate-950/40 border-slate-800" : "bg-white border-slate-100"
                  }`}>
                    <div className="absolute inset-0 bg-slate-200/50 flex flex-col justify-between p-3 select-none bg-[radial-gradient(#cbd5e1_1.5px,transparent_1.5px)] [background-size:16px_16px]">
                      <div className="absolute top-[40%] left-[45%] flex flex-col items-center animate-bounce">
                        <MapPin className={`w-6 h-6 ${config.primaryColor === "rose" ? "text-rose-600" : "text-indigo-600"}`} />
                        <span className="bg-slate-900/90 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded shadow whitespace-nowrap block mt-0.5">
                          {config.title}
                        </span>
                      </div>

                      <div className="mt-auto flex items-end justify-between w-full relative z-10">
                        <span className="text-[7.5px] text-slate-400 font-extrabold tracking-tight">NAVER Map API</span>
                        <button
                          type="button"
                          onClick={() => showMobileAlert("info", "🗺️ 네이버지도 앱과 연동되어 실제 길찾기 내비게이션으로 진입합니다.")}
                          className="bg-slate-900 text-white text-[8px] px-2 py-1 rounded font-bold hover:bg-slate-800 border-0 cursor-pointer"
                        >
                          네이버 지도열기
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 6. 회사 하단 정보 (푸터 연락처) */}
              {config.sections.contact && (
                <div className={`mt-auto px-5 py-6 text-center text-[10px] border-t ${
                  config.theme === "dark" || config.theme === "gradient"
                    ? "border-slate-800 text-slate-500 bg-slate-950/20"
                    : "border-slate-100 text-slate-400 bg-slate-50"
                }`}>
                  <div className="font-extrabold mb-1.5">{config.title}</div>
                  <div className="flex justify-center items-center gap-1.5 mb-1 text-[9px]">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>{config.contactPhone}</span>
                  </div>
                  <div className="flex justify-center items-center gap-1.5 text-[9px]">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span>{config.address}</span>
                  </div>
                  <div className="mt-4 text-[8px] opacity-60">
                    © {new Date().getFullYear()} {config.title}. Powered by EGDESK AI Builder
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 폰 액정 하단 가상 홈 버튼 바 */}
          <div className="h-10 bg-slate-950 flex items-center justify-center shrink-0 w-full" style={{ borderBottomLeftRadius: "42px", borderBottomRightRadius: "42px" }}>
            <div className="w-28 h-1 bg-slate-800 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
};
