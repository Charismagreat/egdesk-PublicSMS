"use client";

import React from "react";
import { Heart, MessageCircle, DollarSign, Clock, MapPin } from "lucide-react";
import { JobPosting } from "../types";

interface JobPostFeedProps {
  jobPosting: JobPosting | null;
  name: string;
  setName: (val: string) => void;
  age: string;
  setAge: (val: string) => void;
  phone: string;
  setPhone: (val: string) => void;
  experience: string;
  setExperience: (val: string) => void;
  motivation: string;
  setMotivation: (val: string) => void;
  onApplySubmit: (e: React.FormEvent) => void;
}

export function JobPostFeed({
  jobPosting,
  name, setName,
  age, setAge,
  phone, setPhone,
  experience, setExperience,
  motivation, setMotivation,
  onApplySubmit
}: JobPostFeedProps) {
  if (!jobPosting) return null;

  return (
    <div className="space-y-4 animate-fade-in text-left">
      {/* 인스타그램 스폰서 포스트 비주얼 카드 */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 bg-gradient-to-tr from-[#f91f7f] via-[#e84e27] to-[#9b2bb4] relative py-7 text-center">
          <div className="absolute inset-0 bg-black/10" />
          <span className="relative z-10 bg-black/30 text-[#ffd016] text-[8px] font-black px-2 py-0.5 rounded-full border border-white/10 uppercase tracking-widest">Sponsored</span>
          <h3 className="relative z-10 text-sm font-black text-white mt-2 leading-snug">{jobPosting.title}</h3>
          <p className="relative z-10 text-[10px] text-rose-100 font-bold mt-0.5">{jobPosting.category}</p>
        </div>

        <div className="p-3 flex items-center justify-between border-b border-slate-100 bg-white">
          <div className="flex gap-3">
            <Heart className="w-4 h-4 text-[#f91f7f] fill-[#f91f7f] animate-pulse" />
            <MessageCircle className="w-4 h-4 text-slate-700" />
          </div>
          <div className="text-[9px] font-bold text-slate-600">
            매칭률 99.8% 매칭 추천
          </div>
        </div>

        {/* 매장 근로 조건 */}
        <div className="p-4 space-y-2 text-xs border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2 text-slate-700 font-semibold">
            <DollarSign className="w-4 h-4 text-[#f91f7f] shrink-0" />
            <p>보상 조건: <span className="text-slate-900 font-black">{jobPosting.salary}</span></p>
          </div>
          <div className="flex items-center gap-2 text-slate-700 font-semibold">
            <Clock className="w-4 h-4 text-[#f91f7f] shrink-0" />
            <p>근무 시간: <span className="text-slate-800 font-bold">{jobPosting.timeRange}</span></p>
          </div>
          <div className="flex items-center gap-2 text-slate-700 font-semibold">
            <MapPin className="w-4 h-4 text-[#f91f7f] shrink-0" />
            <p>근무 위치: <span className="text-slate-800 font-bold">{jobPosting.location}</span></p>
          </div>
        </div>

        {/* 캡션 요약 */}
        <div className="p-4 pt-3 text-xs leading-relaxed text-slate-600 bg-white">
          <span className="font-black text-slate-900 mr-1.5">store_crew</span>
          {jobPosting.description}
        </div>
      </div>

      {/* 구직자 간편 지원 폼 */}
      <form onSubmit={onApplySubmit} className="space-y-3 pt-2">
        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">간편 프로필 제출</h4>
        
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[10px] text-slate-600 font-bold">성명 (필수)</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="홍길동"
              required
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-[#f91f7f]/50 focus:ring-1 focus:ring-[#f91f7f]/20 text-slate-800 placeholder-slate-400 font-bold"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-slate-600 font-bold">나이 (선택)</label>
            <input 
              type="number" 
              value={age} 
              onChange={(e) => setAge(e.target.value)} 
              placeholder="24"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-[#f91f7f]/50 focus:ring-1 focus:ring-[#f91f7f]/20 text-slate-800 placeholder-slate-400 font-bold"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] text-slate-600 font-bold">휴대폰 번호 (필수)</label>
          <input 
            type="tel" 
            value={phone} 
            onChange={(e) => setPhone(e.target.value)} 
            placeholder="010-1234-5678"
            required
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-[#f91f7f]/50 focus:ring-1 focus:ring-[#f91f7f]/20 text-slate-800 placeholder-slate-400 font-bold"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] text-slate-600 font-bold">경력사항 요약 (필수)</label>
          <input 
            type="text" 
            value={experience} 
            onChange={(e) => setExperience(e.target.value)} 
            placeholder="카페 바리스타 6개월, 매장 판매 1년 등"
            required
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-[#f91f7f]/50 focus:ring-1 focus:ring-[#f91f7f]/20 text-slate-800 placeholder-slate-400 font-bold"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] text-slate-600 font-bold">지원동기 및 다짐 (필수)</label>
          <textarea 
            value={motivation} 
            onChange={(e) => setMotivation(e.target.value)} 
            placeholder="인센티브와 시너지를 내며 즐겁고 성실하게 일할 자신이 있습니다!"
            required
            rows={2}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-[#f91f7f]/50 focus:ring-1 focus:ring-[#f91f7f]/20 text-slate-800 placeholder-slate-400 font-bold resize-none"
          />
        </div>

        <button 
          type="submit"
          className="w-full bg-gradient-to-r from-[#f91f7f] via-[#e84e27] to-[#9b2bb4] text-white font-black text-xs py-3.5 rounded-xl border-0 shadow-lg cursor-pointer active:scale-95 transition-all mt-2"
        >
          📥 1초 프로필 제출 및 면접 대기
        </button>
      </form>
    </div>
  );
}
