import React from "react";
import { Smartphone } from "lucide-react";
import { SmsDevice } from "../types";

interface DeviceHubProps {
  setShowAddDeviceModal: (val: boolean) => void;
  selectedDeviceId: string;
  setSelectedDeviceId: (val: string) => void;
  smsDevices: SmsDevice[];
  isPairing: boolean;
  handlePairing: (phone: string) => Promise<void>;
  handleDeleteDevice: (phone: string) => Promise<void>;
  handleUpdateDeviceLimit: (phone: string, limitVal: number) => Promise<void>;
}

export function DeviceHub({
  setShowAddDeviceModal,
  selectedDeviceId,
  setSelectedDeviceId,
  smsDevices,
  isPairing,
  handlePairing,
  handleDeleteDevice,
  handleUpdateDeviceLimit
}: DeviceHubProps) {
  return (
    <div 
      style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)' }}
      className="p-6 rounded-2xl shadow-md text-white border border-indigo-500/20"
    >
      <h2 className="text-lg font-bold mb-4 flex items-center justify-between border-b border-white/10 pb-3">
        <span className="flex items-center text-sm font-extrabold">
          <Smartphone className="w-5 h-5 mr-2 animate-pulse" />
          발송 기기 멀티 허브
        </span>
        <button 
          type="button"
          onClick={() => setShowAddDeviceModal(true)}
          className="bg-white/20 hover:bg-white/30 text-white font-bold text-[10px] px-3 py-1.5 rounded-xl border border-white/10 transition-all active:scale-95 cursor-pointer"
        >
          + 기기 추가
        </button>
      </h2>

      {/* 활성 기기 선택 */}
      <div className="mb-4 bg-white/10 p-3 rounded-xl border border-white/5">
        <label className="text-[10px] font-black text-indigo-200 block mb-1">📢 현재 문자 전송용 활성 기기</label>
        <select
          value={selectedDeviceId}
          onChange={(e) => setSelectedDeviceId(e.target.value)}
          className="w-full bg-indigo-900/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-white font-extrabold text-[11px] outline-none focus:ring-2 focus:ring-white/30 cursor-pointer"
        >
          {smsDevices.map(d => (
            <option key={d.phoneNumber} value={d.phoneNumber} className="text-slate-800 font-bold text-xs">
              {d.name} ({d.phoneNumber === "default" ? "기본" : d.phoneNumber})
            </option>
          ))}
        </select>
      </div>

      {/* 기기 리스트 */}
      <div className="space-y-3 mt-4 max-h-[380px] overflow-y-auto pr-1">
        {smsDevices.map((dev) => (
          <div 
            key={dev.phoneNumber} 
            className="bg-white/10 hover:bg-white/15 p-3.5 rounded-xl backdrop-blur-sm border border-white/5 space-y-2.5 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-1.5 truncate flex-1 pr-2">
                <div className="flex items-center gap-2 truncate">
                  <span className={`inline-flex items-center gap-1.5 text-[9px] px-2 py-0.5 rounded-full font-black border tracking-wider shrink-0 transition-all select-none ${
                    dev.isConnected 
                      ? "bg-green-500/20 text-green-300 border-green-400/30 shadow-inner" 
                      : "bg-red-500/20 text-red-300 border-red-400/30"
                  }`}>
                    <span 
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${dev.isConnected ? "animate-pulse shadow-sm" : ""}`} 
                      style={{ 
                        backgroundColor: dev.isConnected ? '#4ade80' : '#f87171',
                        boxShadow: dev.isConnected ? '0 0 8px #4ade80' : '0 0 6px #f87171'
                      }}
                    />
                    {dev.isConnected ? "연동 완료" : "미연동"}
                  </span>
                  <span className="font-extrabold text-xs text-white truncate">{dev.name}</span>
                </div>
                <p className="text-[9px] text-indigo-200 font-mono">
                  {dev.phoneNumber === "default" ? "기본 세션 연동" : dev.phoneNumber}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button 
                  type="button"
                  onClick={() => handlePairing(dev.phoneNumber)}
                  disabled={isPairing}
                  className="bg-white hover:bg-slate-100 text-indigo-650 font-black text-[9px] px-2.5 py-1.5 rounded-lg shadow-sm transition-colors disabled:opacity-50 cursor-pointer border-none"
                >
                  {isPairing && selectedDeviceId === dev.phoneNumber ? "대기중" : dev.isConnected ? "재연동" : "연동"}
                </button>
                {dev.phoneNumber !== "default" && (
                  <button 
                    type="button"
                    onClick={() => handleDeleteDevice(dev.phoneNumber)}
                    className="bg-red-500/20 hover:bg-red-500/30 text-red-200 hover:text-red-100 text-[9px] px-2 py-1.5 rounded-lg border border-red-500/10 transition-colors cursor-pointer"
                    title="기기 분리"
                  >
                    삭제
                  </button>
                )}
              </div>
            </div>

            {/* 오늘 발송 진척도 바 & 뱃지 */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[9px] text-indigo-200 font-bold">
                <span>오늘 사용량: <strong className="text-white">{dev.todaySent ?? 0}건</strong> / {dev.dailyLimit ?? 150}건</span>
                <span className="font-mono">{Math.round(((dev.todaySent ?? 0) / (dev.dailyLimit ?? 150)) * 100)}%</span>
              </div>
              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                <div 
                  style={{ width: `${Math.min(100, ((dev.todaySent ?? 0) / (dev.dailyLimit ?? 150)) * 100)}%` }} 
                  className={`h-full transition-all ${dev.todaySent >= dev.dailyLimit ? "bg-amber-400" : "bg-green-400"}`}
                />
              </div>
            </div>

            {/* 개별 한도 조절 슬라이더 */}
            <div className="bg-indigo-950/20 p-2.5 rounded-lg border border-white/5 space-y-1">
              <div className="flex justify-between items-center text-[9px] text-indigo-200 font-bold">
                <span>🛡️ 일일 안전 전송량 수동 제한</span>
                <div className="flex items-center gap-1">
                  <input 
                    type="number"
                    value={dev.dailyLimit ?? 150}
                    onChange={(e) => handleUpdateDeviceLimit(dev.phoneNumber, Number(e.target.value))}
                    className="w-10 bg-indigo-900/40 border border-white/10 rounded px-1 text-center font-black text-white text-[9px] focus:outline-none"
                  />
                  <span>건</span>
                </div>
              </div>
              <input 
                type="range"
                min={1}
                max={450}
                step={5}
                value={dev.dailyLimit ?? 150}
                onChange={(e) => handleUpdateDeviceLimit(dev.phoneNumber, Number(e.target.value))}
                className="w-full h-1 bg-white/10 rounded appearance-none cursor-pointer accent-white"
              />
            </div>
          </div>
        ))}
      </div>

      {isPairing && (
        <p className="text-[10px] mt-4 text-center text-indigo-200 animate-pulse font-bold">
          ⚠️ 새 브라우저 창에 생성된 QR코드를 스캔해주세요 (최대 2분 대기).
        </p>
      )}
    </div>
  );
}
