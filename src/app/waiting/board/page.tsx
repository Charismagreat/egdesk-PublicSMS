"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Users, 
  Clock, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  QrCode, 
  RefreshCw,
  Flame,
  CheckCircle2,
  PhoneCall
} from "lucide-react";

export default function WaitingBoardPage() {
  const [waitings, setWaitings] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [previousCalledIds, setPreviousCalledIds] = useState<string[]>([]);
  
  const qrUrl = typeof window !== 'undefined' ? `${window.location.origin}/waiting` : 'http://localhost:4005/waiting';
  const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`;

  // 🔔 딩동 차임벨 사운드 재생 (Web Audio API)
  const playChimeSound = () => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(0.25, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };

      // 딩-동-댕 3단 차임벨
      playTone(523.25, 0.0, 0.4); // C5
      playTone(659.25, 0.2, 0.4); // E5
      playTone(783.99, 0.4, 0.8); // G5
    } catch (e) {
      console.error("Audio error:", e);
    }
  };

  // 🗣️ 음성 TTS 방송
  const speakCalling = (waitingNo: number) => {
    if (!soundEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(`대기 ${waitingNo}번 고객님, 카운터로 입장해 주시기 바랍니다.`);
      utterance.lang = 'ko-KR';
      utterance.rate = 0.92;
      const voices = window.speechSynthesis.getVoices();
      const koVoice = voices.find(v => v.lang.includes('ko') || v.lang.includes('KR'));
      if (koVoice) utterance.voice = koVoice;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error("TTS error:", e);
    }
  };

  // 🔄 대기 현황 데이터 로드
  const fetchBoardData = async () => {
    try {
      const res = await fetch("/api/waitings", { cache: "no-store" });
      if (!res.ok) {
        return;
      }
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        return;
      }
      const json = await res.json();
      if (json.success) {
        const list = (json.waitings || json.data || []) as any[];
        setWaitings(list);
        setLastUpdated(new Date().toLocaleTimeString());

        // 새롭게 호출된 대기자가 있는지 감지하여 사운드 & TTS 출력
        const currentCalled = list.filter(w => w.status === 'CALLED');
        const currentCalledIds = currentCalled.map(w => w.id);
        
        const newCalls = currentCalled.filter(w => !previousCalledIds.includes(w.id));
        if (newCalls.length > 0 && previousCalledIds.length > 0) {
          playChimeSound();
          setTimeout(() => {
            speakCalling(newCalls[0].waiting_no);
          }, 800);
        }
        setPreviousCalledIds(currentCalledIds);
      }
    } catch (err) {
      console.error("Fetch board data failed:", err);
    } finally {
      setLoading(false);
    }
  };

  // 3초 주기 자동 폴링
  useEffect(() => {
    fetchBoardData();
    const interval = setInterval(fetchBoardData, 3000);
    return () => clearInterval(interval);
  }, [previousCalledIds, soundEnabled]);

  // 전체화면 토글
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(e => console.error(e));
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(e => console.error(e));
        setIsFullscreen(false);
      }
    }
  };

  // 호출 중인 손님 (CALLED) & 대기 중인 손님 (WAITING)
  const calledList = waitings.filter(w => w.status === 'CALLED');
  const waitingList = waitings.filter(w => w.status === 'WAITING');
  const estimatedWaitTime = waitingList.length * 7; // 팀당 평균 7분

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col justify-between overflow-hidden select-none p-4 sm:p-6 lg:p-8">
      
      {/* 🌟 1. 상단 글로벌 헤더 */}
      <header className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-tr from-orange-600 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-600/30">
            <Flame className="w-7 h-7 text-white animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-white">
                실시간 대기 현황판
              </h1>
              <span className="bg-orange-600/30 text-orange-400 border border-orange-500/40 text-xs font-black px-2.5 py-0.5 rounded-full animate-pulse">
                LIVE
              </span>
            </div>
            <p className="text-slate-400 text-xs mt-0.5">
              호출된 고객님께서는 카운터로 입장해 주시기 바랍니다.
            </p>
          </div>
        </div>

        {/* 우측 컨트롤 도구 (소리, 전체화면, 시간) */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
              soundEnabled 
                ? 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800' 
                : 'bg-rose-950/60 border-rose-800 text-rose-300'
            }`}
            title="호출 사운드 & 음성 방송 토글"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{soundEnabled ? '음성 방송 ON' : '음성 OFF'}</span>
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-2xl text-slate-200 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
            title="전체화면 전환"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            <span className="hidden sm:inline">{isFullscreen ? '화면 축소' : '전체 화면'}</span>
          </button>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5 text-right hidden md:block">
            <span className="text-[10px] font-bold text-slate-400 block">실시간 동기화</span>
            <span className="text-xs font-black text-amber-300">{lastUpdated || '연결중...'}</span>
          </div>
        </div>
      </header>

      {/* 🌟 2. 메인 대형 DID 화면 (2열 그리드) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 my-6 flex-1 items-stretch min-h-0">
        
        {/* 📢 좌측: 지금 입장해 주세요! (NOW CALLING - 7열) */}
        <section className="lg:col-span-7 bg-gradient-to-b from-orange-950/40 via-slate-900/80 to-slate-900/90 border-2 border-orange-500/40 rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden backdrop-blur-md">
          {/* 장식 배경 글로우 */}
          <div className="absolute -right-20 -top-20 w-80 h-80 bg-orange-600/15 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex items-center justify-between border-b border-orange-500/20 pb-4">
            <div className="flex items-center gap-3">
              <span className="w-4 h-4 rounded-full bg-orange-500 animate-ping"></span>
              <h2 className="text-2xl sm:text-3xl font-black text-orange-400 tracking-tight flex items-center gap-2">
                <span>지금 입장해 주세요</span>
                <span className="text-xs text-orange-300 font-bold bg-orange-900/60 border border-orange-600/50 px-3 py-1 rounded-full uppercase tracking-wider">
                  Now Calling
                </span>
              </h2>
            </div>
            <span className="text-sm font-extrabold text-orange-200">
              총 <span className="text-xl text-white font-black">{calledList.length}</span>팀 호출중
            </span>
          </div>

          {/* 호출된 대기 번호 카드 그리드 */}
          <div className="my-auto py-6">
            {calledList.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <div className="w-16 h-16 bg-slate-800/80 rounded-3xl flex items-center justify-center mx-auto text-slate-500">
                  <Clock className="w-8 h-8" />
                </div>
                <p className="text-slate-400 text-lg font-bold">현재 호출 중인 고객님이 없습니다.</p>
                <p className="text-slate-500 text-sm">입장 순서가 되면 번호가 점등되며 음성으로 안내해 드립니다.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {calledList.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`rounded-3xl p-6 sm:p-8 text-center flex flex-col items-center justify-center border-2 transition-all relative ${
                      idx === 0 
                        ? 'bg-gradient-to-br from-orange-600 via-orange-500 to-amber-600 text-white border-white/60 shadow-2xl shadow-orange-600/40 animate-pulse scale-102' 
                        : 'bg-slate-800/90 border-orange-500/50 text-white shadow-xl'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <PhoneCall className="w-4 h-4 text-orange-200 animate-bounce" />
                      <span className="text-xs font-black tracking-widest uppercase text-orange-100">
                        {idx === 0 ? '🔥 최신 호출' : '입장 대기'}
                      </span>
                    </div>

                    <div className="text-6xl sm:text-7xl lg:text-8xl font-black tracking-tighter my-2 drop-shadow-md">
                      {item.waiting_no}
                      <span className="text-2xl sm:text-3xl font-bold ml-1">번</span>
                    </div>

                    <div className="mt-2 text-sm font-extrabold bg-black/25 px-4 py-1.5 rounded-full backdrop-blur-xs flex items-center gap-1.5">
                      <span>{item.customer_name || '고객님'}</span>
                      <span className="text-orange-200 font-normal">({item.party_size}인)</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-orange-500/20 pt-4 flex items-center justify-between text-xs text-orange-200/70">
            <span>✓ 호출 알림 문자를 받으신 후 5분 이내에 카운터로 와주세요.</span>
            <span className="hidden sm:inline">EGDESK Smart Waiting</span>
          </div>
        </section>


        {/* ⏳ 우측: 대기 순번 목록 & QR코드 (5열) */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          
          {/* 1. 대기 순번 목록 카드 */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 flex-1 flex flex-col justify-between shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-black text-white">다음 대기 순서</h3>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xs font-bold text-slate-400">대기</span>
                <span className="text-xl font-black text-amber-400">{waitingList.length}</span>
                <span className="text-xs font-bold text-slate-400">팀</span>
              </div>
            </div>

            {/* 대기 번호 카드 리스트 */}
            <div className="flex-1 overflow-y-auto my-4 max-h-[300px] pr-1 scrollbar-thin">
              {waitingList.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm font-bold">
                  현재 대기 중인 고객님이 없습니다.
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                  {waitingList.map((w, idx) => (
                    <div
                      key={w.id}
                      className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-2xl p-3 text-center flex flex-col items-center justify-center transition-all"
                    >
                      <span className="text-[10px] font-bold text-indigo-300">
                        {idx + 1}번째
                      </span>
                      <span className="text-2xl font-black text-white mt-0.5">
                        {w.waiting_no}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        {w.party_size}인
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 예상 대기 시간 안내 바 */}
            <div className="bg-indigo-950/40 border border-indigo-800/50 rounded-2xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-indigo-200">
                <Clock className="w-4 h-4 text-indigo-400" />
                <span className="font-bold">현재 예상 대기시간</span>
              </div>
              <span className="text-base font-black text-amber-300">
                약 {estimatedWaitTime}분
              </span>
            </div>
          </div>


          {/* 2. 대기 등록 QR코드 안내 카드 */}
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 border border-indigo-800/50 rounded-3xl p-5 flex items-center justify-between gap-4 shadow-xl">
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-orange-400" />
                <span className="text-xs font-black text-orange-400 uppercase tracking-wider">
                  스마트폰으로 간편 접수
                </span>
              </div>
              <h4 className="text-lg font-black text-white leading-tight">
                카메라로 QR코드를 스캔하여<br />대기를 등록하세요!
              </h4>
              <p className="text-xs text-slate-400">
                실시간 내 순서 확인 및 사전 메뉴 주문 가능
              </p>
            </div>

            {/* QR 이미지 */}
            <div className="bg-white p-2.5 rounded-2xl shadow-md shrink-0">
              <img
                src={qrImgUrl}
                alt="Waiting QR"
                className="w-24 h-24 sm:w-28 sm:h-28 object-contain rounded-lg"
              />
            </div>
          </div>

        </section>

      </div>

      {/* 🌟 3. 하단 티커 안내 바 */}
      <footer className="border-t border-slate-800/80 pt-3 flex items-center justify-between text-xs text-slate-400 flex-wrap gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-md text-[10px]">
            안내
          </span>
          <span>호출 후 부재 시 대기가 자동 취소될 수 있으니 모바일 대기표 화면을 확인해 주세요.</span>
        </div>
        <div className="font-mono text-[11px] text-slate-500">
          POWERED BY EGDESK PUBLIC SMS
        </div>
      </footer>

    </main>
  );
}
