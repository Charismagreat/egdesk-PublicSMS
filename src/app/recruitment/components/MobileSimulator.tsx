"use client";

import React, { useState, useEffect } from "react";
import {
  Briefcase, Heart, MessageCircle, Share2, DollarSign, Clock, MapPin, ArrowRight,
  Bot, ShieldCheck, FileText, Sparkles, Check, MoreHorizontal
} from "lucide-react";
import { JobPosting, Applicant } from "../types";

interface MobileSimulatorProps {
  /**
   * 활성화된 채용 공고 정보
   */
  jobPosting: JobPosting | null;
  /**
   * 선택된 지원자 정보
   */
  selectedApplicant: Applicant | null;
  /**
   * 현재 활성화된 모바일 뷰 탭
   */
  activeMobileView: "posting" | "interview" | "contract";
  /**
   * 모바일 뷰 탭 전환 핸들러
   */
  onActiveMobileViewChange: (view: "posting" | "interview" | "contract") => void;
}

/**
 * 3D 스마트폰 섀시 시뮬레이터 컴포넌트 (스폰서드 피드 / AI DM 면접 / 모바일 전자계약서 미러링)
 */
export default function MobileSimulator({
  jobPosting,
  selectedApplicant,
  activeMobileView,
  onActiveMobileViewChange,
}: MobileSimulatorProps) {
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  return (
    <div className="lg:col-span-5 flex flex-col items-center justify-center relative shrink-0">
      {/* 모바일 화면 뷰 모드 수동 토글 탭 */}
      <div className="flex bg-slate-300 border-2 border-slate-400 rounded-2xl p-1 mb-4 relative z-10 w-full max-w-[340px] shadow-sm">
        <button
          onClick={() => onActiveMobileViewChange("posting")}
          className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all cursor-pointer border-0 ${
            activeMobileView === "posting"
              ? "text-white shadow-md"
              : "text-slate-900 hover:text-black font-extrabold bg-transparent"
          }`}
          style={activeMobileView === "posting" ? { background: "linear-gradient(90deg, #f91f7f 0%, #e84e27 100%)" } : {}}
        >
          스폰서드 피드
        </button>
        <button
          onClick={() => onActiveMobileViewChange("interview")}
          className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all cursor-pointer border-0 ${
            activeMobileView === "interview"
              ? "text-white shadow-md"
              : "text-slate-900 hover:text-black font-extrabold bg-transparent"
          }`}
          style={activeMobileView === "interview" ? { background: "linear-gradient(90deg, #f91f7f 0%, #e84e27 100%)" } : {}}
        >
          1:1 DM 면접
        </button>
        <button
          onClick={() => onActiveMobileViewChange("contract")}
          className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all cursor-pointer border-0 ${
            activeMobileView === "contract"
              ? "text-white shadow-md"
              : "text-slate-900 hover:text-black font-extrabold bg-transparent"
          }`}
          style={activeMobileView === "contract" ? { background: "linear-gradient(90deg, #f91f7f 0%, #e84e27 100%)" } : {}}
        >
          전자 근로계약
        </button>
      </div>

      {/* 3D 스마트폰 모형 (아이폰 섀시 - 고대비 실버/그레이 프레임) */}
      <div
        className="relative bg-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden transition-all flex flex-col justify-start items-center border"
        style={{
          width: "360px",
          height: "720px",
          borderRadius: "48px",
          borderWidth: "10px",
          borderColor: "#94a3b8", // 더욱 뚜렷하고 고급스러운 다크 실버 프레임
          boxShadow: "inset 0 0 12px rgba(0,0,0,0.15), 0 25px 50px -12px rgba(0,0,0,0.25)",
        }}
      >
        {/* 아일랜드형 노치 (Dynamic Island) */}
        <div
          className="absolute top-2.5 left-1/2 transform -translate-x-1/2 bg-slate-900 z-50 flex items-center justify-end px-3.5 gap-1.5"
          style={{
            width: "90px",
            height: "22px",
            borderRadius: "14px",
          }}
        >
          <div className="w-2.5 h-2.5 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
            <div className="w-1 h-1 rounded-full bg-blue-900" />
          </div>
        </div>

        {/* 스마트폰 화면 내부 (라이트 모드 고대비 적용) */}
        <div className="w-full h-full bg-slate-50 flex flex-col overflow-hidden relative p-4 pt-10">
          {/* 모바일 화면 분기 */}
          {activeMobileView === "posting" && (
            <div className="w-full h-full flex flex-col justify-between overflow-y-auto no-scrollbar animate-fade-in text-left">
              {jobPosting ? (
                <div className="space-y-4 flex-1 pb-4">
                  {/* 인스타그램 브랜드 피드 카드 스타일 */}
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    {/* 피드 헤더 */}
                    <div className="p-3 flex items-center justify-between border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#f91f7f] via-[#e84e27] to-[#9b2bb4] p-[1.5px]">
                          <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                            <Sparkles className="w-3.5 h-3.5 text-[#f91f7f]" />
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-800 flex items-center gap-1">
                            (주)EGDESK 매장 <Check className="w-3 h-3 text-[#f91f7f] fill-[#f91f7f]" />
                          </p>
                          <p className="text-[8px] text-slate-500 font-bold">Sponsored Ad</p>
                        </div>
                      </div>
                      <MoreHorizontal className="w-4 h-4 text-slate-400" />
                    </div>

                    {/* 피드 비주얼 영역 */}
                    <div className="p-5 bg-gradient-to-tr from-[#f91f7f] via-[#e84e27] to-[#9b2bb4] relative overflow-hidden flex flex-col justify-center items-center text-center py-9">
                      <div className="absolute inset-0 bg-black/10" />
                      <div className="relative z-10">
                        <span className="bg-black/30 text-[#ffd016] text-[8px] font-black px-2 py-0.5 rounded-full border border-white/10 uppercase tracking-widest">
                          We Are Hiring!
                        </span>
                        <h2 className="text-sm font-black text-white mt-2.5 leading-snug">{jobPosting.title}</h2>
                        <p className="text-[9px] text-rose-100 font-black mt-0.5">{jobPosting.category}</p>
                      </div>
                    </div>

                    {/* 피드 라이크/소통 바 */}
                    <div className="p-3 flex items-center justify-between border-b border-slate-100">
                      <div className="flex gap-3">
                        <Heart className="w-4 h-4 text-[#f91f7f] fill-[#f91f7f]" />
                        <MessageCircle className="w-4 h-4 text-slate-700" />
                        <Share2 className="w-4 h-4 text-slate-700" />
                      </div>
                      <div className="text-[9px] font-black text-slate-900">987 likes</div>
                    </div>

                    {/* 조건 세부 - 다크 텍스트 가독성 확보 */}
                    <div className="p-4 space-y-2 text-xs">
                      <p className="leading-relaxed text-slate-700 font-semibold">
                        <span className="font-black text-slate-900 mr-1.5">egdesk_recruits</span>
                        {jobPosting.description}
                      </p>

                      <div className="pt-2 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-750 font-bold">
                        <div className="flex items-center gap-1.5">
                          <DollarSign className="w-3.5 h-3.5 text-[#e11d48]" /> 급여: {jobPosting.salary}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#e11d48]" /> 스케줄: {jobPosting.timeRange}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#e11d48]" /> 위치: {jobPosting.location}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 모바일 화면 전용 스와이프 업 / 지원 단추 */}
                  <div className="pt-2">
                    <button className="w-full bg-gradient-to-r from-[#f91f7f] via-[#e84e27] to-[#9b2bb4] text-white font-black py-3 rounded-2xl shadow-lg border-0 cursor-pointer text-xs flex items-center justify-center gap-1.5 hover:opacity-95 transition-all">
                      <span>간편 모바일 지원하기</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-grow flex flex-col items-center justify-center text-slate-700 gap-3 p-6 text-center bg-slate-100/50 border border-slate-200 rounded-3xl shadow-inner h-full">
                  <Briefcase className="w-14 h-14 text-slate-350 animate-pulse" />
                  <p className="text-xs font-black text-slate-950">활성화된 구인공고가 없습니다</p>
                  <p className="text-[10px] text-slate-800 font-extrabold leading-relaxed">
                    왼쪽의 AI 매니저를 통해 구인 공고를 먼저 든든하게 생성해 주세요!
                  </p>
                </div>
              )}
            </div>
          )}

          {activeMobileView === "interview" && (
            <div className="w-full h-full flex flex-col justify-between overflow-y-auto no-scrollbar animate-fade-in text-left">
              {selectedApplicant ? (
                <div className="flex flex-col h-full bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200">
                  {/* 인스타 DM 헤더 */}
                  <div className="p-3 border-b border-slate-100 flex items-center gap-2.5 bg-slate-50 shrink-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#f91f7f] to-[#e84e27] p-[1.5px] flex items-center justify-center">
                      <div className="w-full h-full bg-white rounded-full flex items-center justify-center font-black text-xs text-slate-900">
                        {selectedApplicant.name.substring(0, 2)}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-950 flex items-center gap-1">
                        {selectedApplicant.name} <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                      </p>
                      <p className="text-[8px] text-slate-500 font-bold">EGDESK AI 실시간 인터뷰 중</p>
                    </div>
                  </div>

                  {/* DM 대화 내역 */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50/50 text-[10px]">
                    {selectedApplicant.interviewLogs && selectedApplicant.interviewLogs.length > 0 ? (
                      selectedApplicant.interviewLogs.map((log, idx) => (
                        <div key={idx} className={`flex ${log.sender === "ai" ? "justify-start" : "justify-end"}`}>
                          <div
                            className={`max-w-[80%] px-3 py-2 rounded-2xl ${
                              log.sender === "ai"
                                ? "bg-slate-200 text-slate-950 rounded-tl-none font-bold"
                                : "bg-gradient-to-r from-[#f91f7f] to-[#9b2bb4] text-white rounded-tr-none font-extrabold"
                            }`}
                          >
                            {log.text}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 text-center p-4">
                        <Bot className="w-10 h-10 text-slate-350 animate-bounce" />
                        <p className="text-[10px] font-black text-slate-700">AI 면접 연결 완료</p>
                        <p className="text-[8px] text-slate-500">지원자에게 첫 번째 AI 질문을 던지는 중입니다...</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-grow flex flex-col items-center justify-center text-slate-700 gap-3 p-6 text-center bg-slate-100/50 border border-slate-200 rounded-3xl shadow-inner h-full">
                  <Bot className="w-12 h-12 text-[#f91f7f] animate-bounce" />
                  <p className="text-xs font-black text-slate-950">진행 중인 1:1 DM 면접이 없습니다.</p>
                  <p className="text-[10px] text-slate-800 font-extrabold leading-relaxed">
                    구직자 프로필을 선택하고 좌측 관리바의 **[AI 면접 승인]**을 누르시면 실시간 DM 면접이 생중계됩니다.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeMobileView === "contract" && (
            <div className="w-full h-full flex flex-col justify-between overflow-y-auto no-scrollbar animate-fade-in text-left">
              {selectedApplicant && jobPosting ? (
                <div className="space-y-4 pb-4">
                  {/* 표준근로계약서 마크업 (고대비 화이트 페이퍼) */}
                  <div className="bg-white text-slate-900 p-4.5 rounded-2xl shadow-sm border border-slate-250 space-y-4 font-sans text-[10px]">
                    <h2 className="text-xs font-black text-center border-b-2 border-slate-800 pb-2 text-[#f91f7f] uppercase tracking-wider">
                      전자 근로 계약서
                    </h2>

                    <div className="space-y-1.5 leading-relaxed text-slate-750 font-semibold">
                      <p>
                        <strong>갑 (대표자)</strong>: EGDESK 파트너스 매장
                      </p>
                      <p>
                        <strong>을 (근로자)</strong>: {selectedApplicant.name}
                      </p>
                      <p className="text-[9px] text-slate-500 font-medium">
                        본 서류는 EGDESK 모바일 전자계약 보안채널을 통해 실시간 생성되었습니다.
                      </p>
                    </div>

                    <div className="space-y-2 border-t border-slate-100 pt-2.5 text-slate-900 font-black">
                      <p>• <strong>담당 직무</strong>: {jobPosting.category}</p>
                      <p>• <strong>근무 위치</strong>: {jobPosting.location}</p>
                      <p>• <strong>소정 시간</strong>: {jobPosting.timeRange}</p>
                      <p>• <strong>보상 임금</strong>: {jobPosting.salary}</p>
                    </div>

                    {/* 서명 완료 여부 시각화 */}
                    {selectedApplicant.signatureUrl ? (
                      <div className="border border-emerald-250 bg-emerald-50 p-2.5 rounded-xl flex items-center justify-between">
                        <div>
                          <p className="text-[8px] text-emerald-600 font-extrabold uppercase tracking-widest">E-Contract Signed</p>
                          <p className="text-[10px] font-black text-slate-950">을 서명: {selectedApplicant.name}</p>
                          <p className="text-[8px] text-slate-500">일자: {selectedApplicant.signedAt}</p>
                        </div>
                        <div className="w-16 h-10 border border-slate-200 bg-white rounded-lg flex items-center justify-center overflow-hidden">
                          <img
                            src={selectedApplicant.signatureUrl}
                            alt="Signature"
                            className="w-full h-auto max-h-[36px] object-contain"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="border border-slate-200 bg-slate-100 p-3 rounded-xl text-center space-y-1">
                        <p className="text-[9px] font-black text-slate-705 animate-pulse">⏳ 모바일 서명 작성 대기 중...</p>
                        <p className="text-[8px] text-slate-500 font-bold">구직자가 폰 스케치 패드로 전자 서명을 그리는 중입니다.</p>
                      </div>
                    )}
                  </div>

                  {/* 근로계약 체결 상태 바 */}
                  {selectedApplicant.signatureUrl ? (
                    <div className="bg-emerald-50 border border-emerald-250 p-3.5 rounded-2xl flex items-center gap-2.5 shadow-sm">
                      <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div className="text-left">
                        <p className="text-xs font-black text-slate-800">전자근로계약 체결 완료!</p>
                        <p className="text-[8px] text-slate-500 font-semibold">법적 효력을 갖는 정식 매칭 계약이 체결되었습니다.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-250 p-3.5 rounded-2xl flex items-center gap-2.5">
                      <FileText className="w-5 h-5 text-[#f91f7f] shrink-0" />
                      <div className="text-left">
                        <p className="text-xs font-black text-slate-755">합격 서명 대기 상태</p>
                        <p className="text-[8px] text-slate-550 font-semibold">사장님이 합격 승인을 누르시면 서명 폼이 열립니다.</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-grow flex flex-col items-center justify-center text-slate-700 gap-3 p-6 text-center bg-slate-100/50 border border-slate-200 rounded-3xl shadow-inner h-full">
                  <FileText className="w-14 h-14 text-[#9b2bb4] opacity-80 animate-pulse" />
                  <p className="text-xs font-black text-slate-950">미발행 근로 계약서</p>
                  <p className="text-[10px] text-slate-800 font-extrabold leading-relaxed">
                    AI 면접이 완료된 우수 인재에게 합격 승인을 내리시면 자동으로 전자계약 조회가 시작됩니다.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
