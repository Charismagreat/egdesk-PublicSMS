import React from 'react';
import { X, FileText } from 'lucide-react';

interface ExcelGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownloadTemplate: () => void;
}

export const ExcelGuideModal: React.FC<ExcelGuideModalProps> = ({
  isOpen,
  onClose,
  onDownloadTemplate
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-indigo-900 to-indigo-950 text-white px-6 py-5 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-300" />
              <span>엑셀 일괄 등록 서식 가이드</span>
            </h3>
            <p className="text-[10px] text-slate-300 mt-1">
              점주님의 엑셀 파일 첫 행(헤더) 컬럼을 시스템에 매핑하는 기준입니다.
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

        {/* 바디 */}
        <div className="p-6 space-y-4 max-h-[450px] overflow-y-auto text-xs text-slate-600">
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-indigo-950 font-medium">
            💡 **편리한 한글 분석 지원**: 첫 행(헤더)에 아래 예시의 컬럼명 중 하나가 기입되어 있으면, 단어가 조금 다르더라도 시스템이 자동으로 유추하여 안전하게 등록합니다.
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-2.5">매핑 필드</th>
                  <th className="p-2.5">엑셀 추천 명칭 (헤더 예시)</th>
                  <th className="p-2.5">필수 여부</th>
                  <th className="p-2.5">기입 룰 / 예시</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white font-medium text-slate-500">
                <tr>
                  <td className="p-2.5 font-bold text-slate-800">종류 (Type)</td>
                  <td className="p-2.5 text-indigo-600 font-semibold">종류, 구분, type</td>
                  <td className="p-2.5 text-red-500 font-bold">기본 '자재'</td>
                  <td className="p-2.5">**자재** 또는 **제품** 기입</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold text-slate-800">품목명 (Name)</td>
                  <td className="p-2.5 text-indigo-600 font-semibold">품목명, 이름, name</td>
                  <td className="p-2.5 text-red-500 font-bold">필수</td>
                  <td className="p-2.5">예: 초경량 모터 V2 (중복 시 스킵)</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold text-slate-800">카테고리</td>
                  <td className="p-2.5 text-indigo-600 font-semibold">카테고리, 분류, category</td>
                  <td className="p-2.5 text-red-500 font-bold">필수</td>
                  <td className="p-2.5">예: 전동부품, 리빙웨어</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold text-slate-800">규격 (Spec)</td>
                  <td className="p-2.5 text-indigo-600 font-semibold">규격, 세부 스펙, spec</td>
                  <td className="p-2.5 text-slate-400">선택</td>
                  <td className="p-2.5">예: 15mm x 150mm, 250g</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold text-slate-800">단위 구분</td>
                  <td className="p-2.5 text-indigo-600 font-semibold">단위, 단위 구분, unitType</td>
                  <td className="p-2.5 text-slate-400">선택</td>
                  <td className="p-2.5">**개수**, **중량**, **박스** 중 기입</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold text-slate-800">박스당 수량</td>
                  <td className="p-2.5 text-indigo-600 font-semibold">박스당 입수량, n개입</td>
                  <td className="p-2.5 text-slate-400">선택</td>
                  <td className="p-2.5">단위가 \'박스\'일 때 숫자 기입 (예: 10)</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold text-slate-800">단가 (Price)</td>
                  <td className="p-2.5 text-indigo-600 font-semibold">단가, 공급 단가, 매입가, 판매가</td>
                  <td className="p-2.5 text-red-500 font-bold">필수</td>
                  <td className="p-2.5">숫자 기입 (예: 12500)</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold text-slate-800">거래처 (Partner)</td>
                  <td className="p-2.5 text-indigo-600 font-semibold">거래처, 매입처, partner</td>
                  <td className="p-2.5 text-slate-400">선택</td>
                  <td className="p-2.5">예: 한성정밀(주)</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold text-slate-800">적재 위치</td>
                  <td className="p-2.5 text-indigo-600 font-semibold">적재 위치, 창고 위치, location</td>
                  <td className="p-2.5 text-slate-400">선택</td>
                  <td className="p-2.5">예: A홀 3번 선반</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold text-slate-800">안전 재고</td>
                  <td className="p-2.5 text-indigo-600 font-semibold">안전 재고, 적정 재고, safeStock</td>
                  <td className="p-2.5 text-red-500 font-bold">필수</td>
                  <td className="p-2.5">숫자 기입 (예: 15)</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold text-slate-800">최초 재고</td>
                  <td className="p-2.5 text-indigo-600 font-semibold">최초 재고, 현재 재고, stock</td>
                  <td className="p-2.5 text-red-500 font-bold">필수</td>
                  <td className="p-2.5">숫자 기입 (기초 재고 및 입고 이력 연동)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 푸터 */}
        <div className="bg-slate-50 px-6 py-4 flex justify-between items-center border-t border-slate-100">
          <button
            type="button"
            onClick={onDownloadTemplate}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 flex items-center space-x-1.5 cursor-pointer"
          >
            <FileText className="w-4 h-4 text-indigo-200" />
            <span>표준 서식 샘플(.xlsx) 다운로드</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
          >
            가이드 닫기
          </button>
        </div>
      </div>
    </div>
  );
};
