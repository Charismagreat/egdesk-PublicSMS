import React from 'react';
import { X, FileText } from 'lucide-react';
import { InventoryItem } from '../types';
import { BarcodeSvg } from './BarcodeSvg';

interface BarcodePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPrintItem: InventoryItem | null;
}

export const BarcodePrintModal: React.FC<BarcodePrintModalProps> = ({
  isOpen,
  onClose,
  selectedPrintItem
}) => {
  if (!isOpen || !selectedPrintItem) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all print:p-0 print:bg-white">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200 print:shadow-none print:border-none print:w-[50mm] print:h-[30mm] print:rounded-none">
        
        {/* print 전용 인쇄용 CSS 오버라이드 스타일 (중요) */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body * {
              visibility: hidden !important;
            }
            .print-area, .print-area * {
              visibility: visible !important;
            }
            .print-area {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 50mm !important;
              height: 30mm !important;
              padding: 1.5mm !important;
              box-sizing: border-box !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
              align-items: center !important;
              background: white !important;
            }
            html, body {
              width: 50mm !important;
              height: 30mm !important;
              background: white !important;
            }
          }
        `}} />

        {/* 모달 헤더 (인쇄 시 숨김) */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white px-6 py-4 flex items-center justify-between print:hidden">
          <h3 className="text-xs font-bold flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-indigo-400" />
            <span>규격 바코드 라벨 인쇄</span>
          </h3>
          <button 
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 모달 바디 (인쇄용 타겟) */}
        <div className="p-6 flex flex-col items-center justify-center bg-slate-50/50 print:p-0 print:bg-white">
          
          {/* 실제 감열지 인쇄 카드 영역 */}
          <div className="print-area bg-white border border-slate-200 rounded-2xl p-4 w-[65mm] h-[40mm] flex flex-col justify-between items-center shadow-sm print:shadow-none print:border-none print:w-[50mm] print:h-[30mm] print:rounded-none">
            <div className="text-center w-full">
              <span className="text-[10px] font-extrabold text-indigo-655 tracking-wider uppercase block border-b border-dashed border-indigo-100 pb-0.5 print:text-[8px] print:text-black">
                {selectedPrintItem.type === 'material' ? '원부자재 라벨' : '완제품 라벨'}
              </span>
              <h4 className="text-xs font-black text-slate-800 mt-1 truncate max-w-full print:text-[10px] print:text-black">
                {selectedPrintItem.name}
              </h4>
              {selectedPrintItem.spec && (
                <span className="text-[8px] text-slate-400 font-bold block truncate max-w-full print:text-[7px] print:text-black mt-0.5">
                  규격: {selectedPrintItem.spec}
                </span>
              )}
            </div>

            <div className="w-full mt-1.5 flex justify-center">
              <BarcodeSvg value={selectedPrintItem.barcode || `ITEM-${selectedPrintItem.id}`} />
            </div>
          </div>

          <p className="text-[10px] text-slate-400 text-center leading-normal mt-4 print:hidden">
            * 가로 50mm × 세로 30mm 표준 감열 라벨지 스티커 레이아웃 규격입니다.<br />
            인쇄하기 버튼 클릭 후 배율을 '100%' 또는 '페이지 맞춤'으로 선택해 주세요.
          </p>
        </div>

        {/* 모달 푸터 (인쇄 시 숨김) */}
        <div className="bg-slate-50 px-6 py-4 flex justify-end space-x-2 border-t border-slate-100 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-500 font-semibold text-[11px] hover:bg-slate-100 transition-colors cursor-pointer"
          >
            닫기
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-750 text-white font-bold text-[11px] shadow-md shadow-indigo-100 flex items-center space-x-1.5 cursor-pointer"
          >
            <span>라벨 인쇄하기</span>
          </button>
        </div>

      </div>
    </div>
  );
};
