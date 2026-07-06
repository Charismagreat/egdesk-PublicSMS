"use client";

import React from "react";
import { Smartphone, X, AlertTriangle } from "lucide-react";

interface SmsDeviceAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  newDeviceName: string;
  setNewDeviceName: (val: string) => void;
  newDevicePhone: string;
  setNewDevicePhone: (val: string) => void;
  isAddingDevice: boolean;
  handleAddDevice: () => Promise<void>;
}

export default function SmsDeviceAddModal({
  isOpen,
  onClose,
  newDeviceName,
  setNewDeviceName,
  newDevicePhone,
  setNewDevicePhone,
  isAddingDevice,
  handleAddDevice
}: SmsDeviceAddModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-6 shadow-2xl border border-slate-100 w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center border-b pb-3.5 mb-4">
          <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-indigo-500" />
            신규 발송 기기 등록
          </h3>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-605 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-black text-slate-500 block mb-1.5 uppercase">기기 명칭</label>
            <input 
              type="text" 
              placeholder="예: 영업팀 서브폰, 매장 전용폰"
              value={newDeviceName}
              onChange={(e) => setNewDeviceName(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-indigo-400 text-xs font-bold text-slate-800"
            />
          </div>
          <div>
            <label className="text-xs font-black text-slate-500 block mb-1.5 uppercase">전화번호 (숫자만 입력)</label>
            <input 
              type="text" 
              placeholder="예: 01012345678"
              value={newDevicePhone}
              onChange={(e) => setNewDevicePhone(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-indigo-400 text-xs font-bold text-slate-800"
            />
          </div>
          <div className="bg-amber-50 border border-amber-100 p-3.5 rounded-xl flex gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-amber-800 font-semibold leading-relaxed">
              새 스마트폰을 등록한 후, 활성화된 카드 우측의 [연동] 버튼을 눌러 생성되는 QR 코드를 해당 기기로 스캔해 주셔야 무료 발송망이 가동됩니다.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button 
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-655 text-xs font-extrabold hover:bg-slate-50 transition-colors cursor-pointer"
          >
            취소
          </button>
          <button 
            onClick={handleAddDevice}
            disabled={isAddingDevice}
            className="px-5 py-2.5 bg-slate-900 text-white text-xs font-extrabold rounded-xl hover:bg-slate-850 shadow-md transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isAddingDevice ? "등록 중..." : "기기 등록하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
