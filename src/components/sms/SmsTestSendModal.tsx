"use client";

import React from "react";
import { X } from "lucide-react";

interface SmsTestSendModalProps {
  isOpen: boolean;
  onClose: () => void;
  testPhone: string;
  setTestPhone: React.Dispatch<React.SetStateAction<string>>;
  testDeviceId: string;
  setTestDeviceId: React.Dispatch<React.SetStateAction<string>>;
  smsDevices: Array<{ phoneNumber: string; name: string; isConnected: boolean; dailyLimit: number; todaySent: number }>;
  isSending: boolean;
  handleTestSend: () => Promise<void>;
}

export default function SmsTestSendModal({
  isOpen,
  onClose,
  testPhone,
  setTestPhone,
  testDeviceId,
  setTestDeviceId,
  smsDevices,
  isSending,
  handleTestSend
}: SmsTestSendModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/55 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-6 w-[400px] shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-slate-800">테스트 발송</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-4 font-semibold leading-relaxed">
          입력하신 번호로 1건의 문자가 즉시 발송됩니다. (치환 변수는 '홍길동'으로 기본 치환되어 발송 테스트를 시뮬레이션합니다.)
        </p>
        
        <div className="space-y-4 mb-5">
          <div>
            <label className="block text-[11px] font-extrabold text-slate-500 mb-1.5 uppercase">발신 기기 선택</label>
            <select
              value={testDeviceId}
              onChange={e => setTestDeviceId(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs outline-none bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 font-bold text-slate-705 cursor-pointer transition-all"
            >
              {smsDevices.map(d => (
                <option key={d.phoneNumber} value={d.phoneNumber} className="text-slate-800">
                  {d.name} ({d.phoneNumber === 'default' ? '기본 기기' : d.phoneNumber})
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-[11px] font-extrabold text-slate-500 mb-1.5 uppercase">수신 휴대전화 번호</label>
            <input 
              type="text" 
              placeholder="휴대전화 번호 (예: 01012345678)" 
              value={testPhone}
              onChange={e => setTestPhone(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-xs font-semibold text-slate-800"
            />
          </div>
        </div>
        
        <div className="flex justify-end space-x-2">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-slate-500 hover:bg-slate-100 text-xs font-extrabold cursor-pointer transition-all">취소</button>
          <button 
            onClick={handleTestSend} 
            disabled={isSending}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-slate-400 text-xs font-extrabold shadow-md cursor-pointer transition-all"
          >
            {isSending ? "발송 중..." : "테스트 전송"}
          </button>
        </div>
      </div>
    </div>
  );
}
