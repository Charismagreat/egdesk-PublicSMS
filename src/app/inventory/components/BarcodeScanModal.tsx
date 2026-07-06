import React from 'react';
import { X, Sliders } from 'lucide-react';
import { ScanLog } from '../types';
import { playBeep } from '../utils/audio';

interface BarcodeScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  scanMode: 'in' | 'out';
  setScanMode: (mode: 'in' | 'out') => void;
  scanLogs: ScanLog[];
  onBarcodeScanned: (barcode: string) => void;
}

export const BarcodeScanModal: React.FC<BarcodeScanModalProps> = ({
  isOpen,
  onClose,
  scanMode,
  setScanMode,
  scanLogs,
  onBarcodeScanned
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* 모달 헤더 */}
        <div className={`px-6 py-5 flex items-center justify-between text-white bg-gradient-to-r ${scanMode === 'in' ? 'from-blue-600 to-indigo-950 shadow-md shadow-blue-950/20' : 'from-rose-600 to-indigo-950 shadow-md shadow-rose-950/20'}`}>
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              <Sliders className="w-5 h-5 animate-pulse" />
              <span>바코드 퀵 스캔 입출고 콘솔</span>
            </h3>
            <p className="text-[10px] text-slate-300 mt-1">
              리더기를 포커스 인풋창에 조준하고 쏘세요. 성공 시 "삑!" 소리와 함께 실시간 적용됩니다.
            </p>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 모달 바디 */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          
          {/* 스캔 모드 선택 */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">스캔 작동 모드</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setScanMode('in'); playBeep('success'); }}
                className={`py-3 px-4 rounded-xl border text-xs font-extrabold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                  scanMode === 'in'
                    ? 'border-blue-500 bg-blue-50 text-blue-950 shadow-sm'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-500'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 block animate-ping"></span>
                <span>고속 입고 (+1)</span>
              </button>
              <button
                type="button"
                onClick={() => { setScanMode('out'); playBeep('success'); }}
                className={`py-3 px-4 rounded-xl border text-xs font-extrabold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                  scanMode === 'out'
                    ? 'border-rose-500 bg-rose-50 text-rose-950 shadow-sm'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-500'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 block animate-ping"></span>
                <span>고속 출고 (-1)</span>
              </button>
            </div>
          </div>

          {/* 스캐너 포커스 수집 영역 (실제 감청용) */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center space-y-3 relative overflow-hidden">
            <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${scanMode === 'in' ? 'from-transparent via-blue-500 to-transparent' : 'from-transparent via-rose-500 to-transparent'} animate-[pulse_1.5s_infinite]`}></div>
            
            <span className="text-[11px] font-bold text-slate-400">바코드 리더기 스캔 대기중... (수동 모킹 가능)</span>
            
            <div className="relative w-full">
              <input
                type="text"
                name="barcode_capture"
                placeholder="이곳에 포커싱 후 리더기를 쏘거나 바코드를 입력 후 엔터를 누르세요."
                className="w-full text-center px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 outline-none font-bold text-slate-800 placeholder-slate-350"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = (e.target as HTMLInputElement).value;
                    if (val.trim()) {
                      onBarcodeScanned(val.trim());
                      (e.target as HTMLInputElement).value = '';
                    }
                  }
                }}
              />
            </div>
            <p className="text-[9px] text-slate-400 text-center leading-normal">
              * 스캔 전용 모달이 켜져 있는 동안에는 바코드 입력창에 포커스를 주지 않아도<br />
              바코드 리더기로 쏘는 즉시 전역에서 키 신호가 자동으로 감지되어 수불 처리됩니다.
            </p>
          </div>

          {/* 실시간 스캔 피드 로그 리스트 */}
          <div className="space-y-2 flex-1 flex flex-col min-h-[220px]">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">실시간 연속 스캔 타임라인</label>
            <div className="border border-slate-150 rounded-2xl p-3 bg-slate-50/50 flex-1 overflow-y-auto max-h-[260px] space-y-2 no-scrollbar">
              {scanLogs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-1 py-8">
                  <Sliders className="w-8 h-8 text-slate-300" />
                  <span className="text-[10px] font-semibold">아직 스캔된 이력이 없습니다. 바코드를 쏴주세요!</span>
                </div>
              ) : (
                scanLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs animate-in slide-in-from-bottom-2 duration-200 font-medium ${
                      log.success
                        ? 'bg-white border-slate-100 text-slate-800 shadow-3xs'
                        : 'bg-rose-50/70 border-rose-100 text-rose-905'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] text-slate-400 font-bold">{log.time}</span>
                      <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${log.success ? 'bg-indigo-50 text-indigo-655' : 'bg-rose-150 text-rose-700'}`}>
                        {log.success ? `${scanMode === 'in' ? '입고' : '출고'}성공` : '오류'}
                      </span>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800">{log.name}</span>
                        <span className="text-[9px] text-slate-400 font-semibold">바코드: {log.barcode}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      {log.success ? (
                        <div className="flex items-center space-x-1.5">
                          <span className="text-slate-400 line-through text-[10px]">{log.beforeStock}</span>
                          <span className="text-[10px] font-bold text-slate-400">➔</span>
                          <span className="font-extrabold text-indigo-650 text-sm">{log.afterStock} 개</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-rose-600 font-bold">{log.errorMsg}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* 모달 푸터 */}
        <div className="bg-slate-50 px-6 py-4 flex justify-between items-center border-t border-slate-100">
          <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2 py-1 rounded">오퍼레이터: 최고관리자(자동)</span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
          >
            퀵스캔 종료
          </button>
        </div>

      </div>
    </div>
  );
};
