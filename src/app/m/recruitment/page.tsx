"use client";

import React from "react";
import { Sparkles, Check, Smartphone } from "lucide-react";

// 커스텀 훅 및 컴포넌트 임포트
import { useCandidateMobile } from "./hooks/useCandidateMobile";
import { JobPostFeed } from "./components/JobPostFeed";
import { ScreeningWaiting } from "./components/ScreeningWaiting";
import { InterviewChat } from "./components/InterviewChat";
import { ReviewWaiting } from "./components/ReviewWaiting";
import { ContractSigning } from "./components/ContractSigning";
import { MatchCompleted } from "./components/MatchCompleted";

export default function CandidateMobilePage() {
  const {
    jobPosting,
    name, setName,
    age, setAge,
    phone, setPhone,
    experience, setExperience,
    motivation, setMotivation,
    step,
    chatInput, setChatInput,
    chatLogs,
    canvasRef,
    hasSigned,
    chatScrollRef,
    handleApplySubmit,
    handleSendInterviewMessage,
    startDrawing,
    draw,
    stopDrawing,
    clearCanvas,
    handleSubmitContract
  } = useCandidateMobile();

  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-800 flex flex-col items-center justify-center p-3 sm:p-6 font-sans relative overflow-hidden selection:bg-[#f91f7f] selection:text-white">
      
      {/* 백그라운드 인스타 무지개 네온 오로라 광채 */}
      <div className="absolute top-[-20%] left-[-15%] w-[130%] h-[60%] rounded-full bg-gradient-to-tr from-[#f91f7f]/5 via-[#e84e27]/5 to-[#9b2bb4]/5 blur-[120px] pointer-events-none" />

      {/* 스마트폰 섀시 레이아웃 (모바일 타이트 프레임) */}
      <div className="w-full max-w-[400px] bg-white border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.08)] rounded-[40px] p-5 relative z-10 flex flex-col justify-between flex-1 min-h-[660px]" style={{ height: "690px" }}>
        
        {/* 인스타 스토리 스타일 상단 진행바 (Progress Bars) */}
        <div className="flex gap-1 mb-4 shrink-0">
          {[
            step === "posting" || step === "waiting_interview" || step === "interviewing" || step === "waiting_approve" || step === "contracting" || step === "done",
            step === "waiting_interview" || step === "interviewing" || step === "waiting_approve" || step === "contracting" || step === "done",
            step === "interviewing" || step === "waiting_approve" || step === "contracting" || step === "done",
            step === "waiting_approve" || step === "contracting" || step === "done",
            step === "contracting" || step === "done",
            step === "done"
          ].map((active, idx) => (
            <div 
              key={idx} 
              className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                active 
                  ? "bg-gradient-to-r from-[#f91f7f] via-[#e84e27] to-[#9b2bb4]" 
                  : "bg-slate-200"
              }`} 
            />
          ))}
        </div>

        {/* 상단바 헤더 */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 mb-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#f91f7f] via-[#e84e27] to-[#9b2bb4] p-[1.5px] flex items-center justify-center shadow-sm">
              <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-[#f91f7f]" />
              </div>
            </div>
            <div className="text-left">
              <h2 className="text-[11px] font-black text-slate-800 flex items-center gap-1">
                EGDESK 모바일 <Check className="w-2.5 h-2.5 text-[#f91f7f] fill-[#f91f7f]" />
              </h2>
              <p className="text-[8px] text-[#f91f7f] font-black tracking-wider">Sponsored Ad Direct</p>
            </div>
          </div>
          <span className="text-[9px] bg-slate-100 text-slate-600 font-extrabold px-2.5 py-0.5 rounded-full border border-slate-200 uppercase tracking-wider">
            {step === "posting" ? "Ad Feed" :
             step === "waiting_interview" ? "Screening" :
             step === "interviewing" ? "1:1 DM Chat" :
             step === "waiting_approve" ? "Review" :
             step === "contracting" ? "E-Sign" : "Matched 🎉"}
          </span>
        </div>

        {/* 바디 영역 - 각 단계별 마크업 전환 */}
        <div className="flex-1 overflow-y-auto pr-0.5 no-scrollbar flex flex-col justify-start">
          
          {step === "posting" && (
            <JobPostFeed
              jobPosting={jobPosting}
              name={name}
              setName={setName}
              age={age}
              setAge={setAge}
              phone={phone}
              setPhone={setPhone}
              experience={experience}
              setExperience={setExperience}
              motivation={motivation}
              setMotivation={setMotivation}
              onApplySubmit={handleApplySubmit}
            />
          )}

          {step === "waiting_interview" && (
            <ScreeningWaiting name={name} />
          )}

          {step === "interviewing" && (
            <InterviewChat
              chatLogs={chatLogs}
              chatInput={chatInput}
              setChatInput={setChatInput}
              onSendMessage={handleSendInterviewMessage}
              chatScrollRef={chatScrollRef}
            />
          )}

          {step === "waiting_approve" && (
            <ReviewWaiting />
          )}

          {step === "contracting" && (
            <ContractSigning
              jobPosting={jobPosting}
              name={name}
              canvasRef={canvasRef}
              hasSigned={hasSigned}
              startDrawing={startDrawing}
              draw={draw}
              stopDrawing={stopDrawing}
              clearCanvas={clearCanvas}
              onSubmitContract={handleSubmitContract}
            />
          )}

          {step === "done" && (
            <MatchCompleted name={name} />
          )}

        </div>

        {/* 푸터 워터마크 */}
        <div className="text-center text-[8px] text-slate-400 font-black border-t border-slate-100 pt-3.5 shrink-0 flex items-center justify-center gap-1 uppercase tracking-widest">
          <Smartphone className="w-3 h-3 text-slate-400" /> Instagram Style Recruits
        </div>

      </div>

    </div>
  );
}
