import React from "react";
import { 
  RefreshCw, AlertTriangle, Database, Search, 
  ArrowUp, ArrowDown, ArrowUpDown, CheckCircle 
} from "lucide-react";
import { SharedViewData } from "../types";

interface SharedViewTableProps {
  isLoading: boolean;
  error: string | null;
  data: SharedViewData | null;
  filteredRows: any[];
  filterQuery: string;
  setFilterQuery: (val: string) => void;
  sortColumn: string;
  sortDirection: "ASC" | "DESC";
  handleSort: (col: string) => void;
  onRetry: () => Promise<void>;
}

export function SharedViewTable({
  isLoading,
  error,
  data,
  filteredRows,
  filterQuery,
  setFilterQuery,
  sortColumn,
  sortDirection,
  handleSort,
  onRetry
}: SharedViewTableProps) {
  
  // 1. 로딩 상태 렌더링
  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-16 flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
        <div className="text-center">
          <p className="text-xs font-black text-slate-700">보안 가드레일을 통과하여 안전 테이블을 로드 중입니다...</p>
          <p className="text-[10px] text-slate-400">잠시만 기다려 주십시오.</p>
        </div>
      </div>
    );
  }

  // 2. 에러 상태 렌더링
  if (error) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-16 flex flex-col items-center justify-center space-y-4 text-center">
        <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-sm font-black text-slate-800">공유 뷰어를 구동할 수 없습니다</h3>
          <p className="text-xs text-slate-500">{error}</p>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white border-none rounded-xl text-xs font-extrabold cursor-pointer"
        >
          다시 시도하기
        </button>
      </div>
    );
  }

  // 3. 데이터가 존재하지 않는 특수 에러 대비
  if (!data) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
      {/* 검색 도구막대 */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
        <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-500 px-1 text-left">
          <Database className="w-3.5 h-3.5 text-slate-400 mr-0.5" />
          정제 데이터 ({filteredRows.length}개 / 총 {data.total}개 레코드)
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="테이블 실시간 즉석 검색..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3.5 py-1.5 text-xs text-slate-750 font-semibold outline-none focus:border-indigo-500 shadow-3xs text-slate-700"
          />
        </div>
      </div>

      {/* 메인 데이터 그리드 (반응형 모바일 스크롤) */}
      <div className="overflow-x-auto w-full min-w-0">
        <table className="min-w-max w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/70 border-b border-slate-150">
              {data.columnMappings.map((col) => {
                const isSortingThis = sortColumn === col.physical;
                return (
                  <th
                    key={col.physical}
                    onClick={() => handleSort(col.physical)}
                    className="px-6 py-4.5 text-xs font-black text-slate-500 select-none cursor-pointer hover:bg-slate-100/70 transition-colors"
                  >
                    <div className="flex items-center gap-1 text-[11px] font-black">
                      {col.friendly}
                      {isSortingThis ? (
                        sortDirection === "ASC" ? (
                          <ArrowUp className="w-3 h-3 text-indigo-500" />
                        ) : (
                          <ArrowDown className="w-3 h-3 text-indigo-500" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-350 hover:text-slate-400" />
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filteredRows.length === 0 ? (
              <tr>
                <td 
                  colSpan={data.columnMappings.length} 
                  className="px-6 py-16 text-center text-xs font-extrabold text-slate-450 bg-slate-50/20"
                >
                  검색 조건에 부합하거나 노출 승인된 데이터가 비어있습니다.
                </td>
              </tr>
            ) : (
              filteredRows.map((row, rowIdx) => (
                <tr 
                  key={rowIdx} 
                  className="hover:bg-slate-50/40 transition-colors"
                >
                  {data.columnMappings.map((col) => {
                    const val = row[col.physical];
                    return (
                      <td 
                        key={col.physical} 
                        className="px-6 py-3.5 text-xs font-semibold text-slate-650"
                      >
                        {val === null || val === undefined ? (
                          <span className="text-[10px] text-slate-300 font-bold font-mono">(NULL)</span>
                        ) : typeof val === "number" ? (
                          <span className="font-mono">{val.toLocaleString()}</span>
                        ) : (
                          String(val)
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 푸터 마감 정보 */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between text-[10px] text-slate-400 font-medium">
        <div className="flex items-center gap-1">
          <CheckCircle className="w-3.5 h-3.5 text-green-500" />
          보안 비식별 마스킹 엔진이 완벽 가동 중입니다.
        </div>
        <div>
          EZDesk Enterprise Database Security Grid v1.0
        </div>
      </div>
    </div>
  );
}
