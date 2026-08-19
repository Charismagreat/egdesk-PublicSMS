"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { 
  Search, 
  Layers, 
  Smartphone, 
  CloudSun, 
  PenTool, 
  Share2, 
  Video, 
  Ticket, 
  ScanLine, 
  Truck, 
  Barcode, 
  Building2, 
  TrendingUp, 
  FileCheck2, 
  Receipt, 
  CheckCircle, 
  Wallet, 
  ShieldAlert, 
  LineChart, 
  Camera, 
  Mic, 
  Contact2, 
  Sparkles, 
  ShieldCheck, 
  UserCheck, 
  Scale, 
  UserPlus, 
  Landmark, 
  Cpu, 
  CheckSquare, 
  AlertTriangle, 
  Zap, 
  Gavel, 
  Languages, 
  Store, 
  CalendarClock, 
  ExternalLink,
  ArrowRight,
  Filter
} from "lucide-react";
import { CATEGORIES, ALL_FEATURES, FeatureItem } from "../data/featuresData";

// 아이콘 매퍼 헬퍼 함수
function renderFeatureIcon(iconName: string, className = "w-5 h-5") {
  switch (iconName) {
    case "Smartphone": return <Smartphone className={className} />;
    case "CloudSun": return <CloudSun className={className} />;
    case "PenTool": return <PenTool className={className} />;
    case "Instagram": return <Share2 className={className} />;
    case "Video": return <Video className={className} />;
    case "Ticket": return <Ticket className={className} />;
    case "ScanLine": return <ScanLine className={className} />;
    case "Truck": return <Truck className={className} />;
    case "Barcode": return <Barcode className={className} />;
    case "Building2": return <Building2 className={className} />;
    case "TrendingUp": return <TrendingUp className={className} />;
    case "FileCheck2": return <FileCheck2 className={className} />;
    case "Receipt": return <Receipt className={className} />;
    case "SmartphoneCheck": return <CheckCircle className={className} />;
    case "Wallet": return <Wallet className={className} />;
    case "ShieldAlert": return <ShieldAlert className={className} />;
    case "LineChart": return <LineChart className={className} />;
    case "Camera": return <Camera className={className} />;
    case "Mic": return <Mic className={className} />;
    case "Contact2": return <Contact2 className={className} />;
    case "Sparkles": return <Sparkles className={className} />;
    case "ShieldCheck": return <ShieldCheck className={className} />;
    case "UserCheck": return <UserCheck className={className} />;
    case "Scale": return <Scale className={className} />;
    case "UserPlus": return <UserPlus className={className} />;
    case "Landmark": return <Landmark className={className} />;
    case "Cpu": return <Cpu className={className} />;
    case "CheckSquare": return <CheckSquare className={className} />;
    case "AlertTriangle": return <AlertTriangle className={className} />;
    case "Zap": return <Zap className={className} />;
    case "Gavel": return <Gavel className={className} />;
    case "Languages": return <Languages className={className} />;
    case "Store": return <Store className={className} />;
    case "CalendarClock": return <CalendarClock className={className} />;
    default: return <Sparkles className={className} />;
  }
}

export default function FeatureMatrix() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // 필터링 및 검색 로직
  const filteredFeatures = useMemo(() => {
    return ALL_FEATURES.filter((item) => {
      // 카테고리 필터
      const matchCategory = selectedCategory === "all" || item.category === selectedCategory;
      
      // 검색어 필터
      if (!searchQuery.trim()) return matchCategory;
      const query = searchQuery.toLowerCase().trim();
      const matchName = item.name.toLowerCase().includes(query);
      const matchSummary = item.summary.toLowerCase().includes(query);
      const matchDesc = item.description.toLowerCase().includes(query);
      const matchBenefits = item.benefits.some(b => b.toLowerCase().includes(query));

      return matchCategory && (matchName || matchSummary || matchDesc || matchBenefits);
    });
  }, [selectedCategory, searchQuery]);

  return (
    <section id="feature-matrix" className="scroll-mt-20 py-20 md:py-28 bg-white border-t border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* 섹션 헤더 */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-100 mb-3">
            <Layers className="w-3.5 h-3.5" />
            <span>ALL-IN-ONE SOLUTION DIRECTORY</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            이지데스크의 <strong>30여 개 전 모듈</strong> 전수 탐색
          </h2>
          <p className="mt-4 text-base text-slate-600">
            마케팅, SCM, 회계, 인사, 협업, 생산, 특화 AI까지 중소기업 운영에 필요한 모든 기능을 탑재했습니다.
          </p>
        </div>

        {/* 컨트롤러: 검색 바 & 카테고리 탭 */}
        <div className="mt-12 space-y-6">
          {/* 실시간 검색 바 */}
          <div className="max-w-xl mx-auto relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="찾으시는 기능(예: 영수증, 문자, 회의록, 재고, 견적, 계약서)을 검색하세요..."
              className="w-full pl-12 pr-10 py-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 bg-slate-200 px-2 py-0.5 rounded-full"
              >
                지우기
              </button>
            )}
          </div>

          {/* 카테고리 칩 네비게이션 (화면 폭에 맞춰 자연스럽게 랩핑 & 중앙 정렬) */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 max-w-5xl mx-auto">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              const count = cat.id === "all" 
                ? ALL_FEATURES.length 
                : ALL_FEATURES.filter(f => f.category === cat.id).length;

              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25 scale-[1.02]"
                      : "bg-slate-100/90 text-slate-600 hover:bg-slate-200/90 hover:text-slate-900 border border-slate-200/60"
                  }`}
                >
                  <span>{cat.name}</span>
                  <span className={`text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded-full font-bold ${
                    isSelected ? "bg-white/20 text-white" : "bg-slate-200 text-slate-500"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 검색 결과 카운트 안내 */}
        <div className="mt-8 flex items-center justify-between text-xs sm:text-sm text-slate-500 font-medium border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-500" />
            <span>총 <strong className="text-indigo-600 font-bold">{filteredFeatures.length}개</strong>의 기능 모듈이 활성화되어 있습니다.</span>
          </div>
          {searchQuery && (
            <span className="text-slate-400">
              &quot;{searchQuery}&quot; 검색 결과
            </span>
          )}
        </div>

        {/* 기능 카드 그리드 (3열) */}
        {filteredFeatures.length > 0 ? (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFeatures.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-3xl p-6 border border-slate-200/80 hover:border-indigo-300 hover:shadow-lg transition-all flex flex-col justify-between group relative overflow-hidden"
              >
                {/* 상단 하이라이트 라인 */}
                {item.highlight && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-blue-500" />
                )}

                <div>
                  {/* 카드 헤더: 아이콘 + 뱃지 */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                      {renderFeatureIcon(item.iconName)}
                    </div>
                    {item.badge && (
                      <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {item.badge}
                      </span>
                    )}
                  </div>

                  {/* 기능 이름 & 요약 */}
                  <h4 className="text-lg font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {item.name}
                  </h4>
                  <p className="mt-2 text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                    {item.summary}
                  </p>

                  {/* 세부 설명 */}
                  <p className="mt-2 text-xs text-slate-700 leading-relaxed line-clamp-2">
                    {item.description}
                  </p>

                  {/* 혜택 태그 목록 */}
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {item.benefits.map((b, bIdx) => (
                      <span
                        key={bIdx}
                        className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md"
                      >
                        ✓ {b}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 카드 푸터: 데모 바로가기 */}
                {item.demoPath && (
                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <Link
                      href={item.demoPath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 group/link"
                    >
                      <span>실제 화면 체험하기</span>
                      <ExternalLink className="w-3.5 h-3.5 group-link-hover:translate-x-0.5 transition-transform" />
                    </Link>
                    <span className="text-[10px] text-slate-700 font-mono">
                      {item.demoPath}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* 검색 결과 없음 */
          <div className="py-20 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200 mt-8">
            <Search className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-base font-bold text-slate-700">검색 조건에 맞는 기능을 찾을 수 없습니다.</p>
            <p className="text-xs text-slate-700 mt-1">다른 검색어를 입력하시거나 카테고리 필터를 변경해 보세요.</p>
            <button
              onClick={() => { setSelectedCategory("all"); setSearchQuery(""); }}
              className="mt-4 px-4 py-2 text-xs font-bold text-indigo-600 bg-white border border-indigo-100 rounded-xl shadow-sm hover:bg-indigo-50"
            >
              전체 필터 초기화
            </button>
          </div>
        )}

      </div>
    </section>
  );
}
