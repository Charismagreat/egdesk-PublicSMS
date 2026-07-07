import React from "react";
import { Search, Trash2 } from "lucide-react";
import { Reservation } from "../types";

interface ReservationTableProps {
  data: Reservation[];
  paginatedData: Reservation[];
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  setActiveOrderId: (id: string | null) => void;
  deleteData: (id: string) => Promise<void>;
}

export function ReservationTable({
  data,
  paginatedData,
  searchQuery,
  setSearchQuery,
  setActiveOrderId,
  deleteData
}: ReservationTableProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* 테이블 컨트롤 헤더 */}
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="font-bold text-slate-800 shrink-0">
          예약 목록 ({data.length === paginatedData.length ? data.length : paginatedData.length}건 / 총 {data.length}건)
        </h2>
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="고객명, 연락처, 서비스 검색"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-full focus:ring-2 focus:ring-indigo-500 outline-none text-xs bg-white font-semibold text-slate-800"
          />
        </div>
      </div>

      {/* 예약 목록 테이블 */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-sm text-slate-650 font-bold">
              <th className="p-4">예약일자</th>
              <th className="p-4">예약시간</th>
              <th className="p-4">예약번호</th>
              <th className="p-4">고객명</th>
              <th className="p-4">연락처</th>
              <th className="p-4">예약내용</th>
              <th className="p-4">상태</th>
              <th className="p-4">관리</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map(t => (
              <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                <td className="p-4 font-bold text-indigo-600">{t.reservation_date}</td>
                <td className="p-4 text-slate-700 font-semibold">{t.reservation_time}</td>
                <td className="p-4">
                  <button 
                    type="button"
                    onClick={() => setActiveOrderId(t.id)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-mono font-black tracking-tight transition-all active:scale-95 cursor-pointer"
                  >
                    RES-{String(t.id || '').slice(-6).toUpperCase()}
                  </button>
                </td>
                <td className="p-4 text-slate-800 font-bold">{t.customer_name}</td>
                <td className="p-4 text-slate-600 font-medium">{t.customer_phone}</td>
                <td className="p-4 text-slate-700 font-semibold max-w-[200px] truncate" title={t.service_name}>
                  {t.service_name}
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                    t.status === "예약확정" ? "bg-green-50 text-green-700 border border-green-200" :
                    t.status === "대기중" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                    "bg-slate-50 text-slate-600 border border-slate-250"
                  }`}>
                    {t.status}
                  </span>
                </td>
                <td className="p-4">
                  <button 
                    type="button"
                    onClick={() => deleteData(t.id)} 
                    className="text-red-400 hover:text-red-650 p-2 rounded-lg hover:bg-red-50 transition-colors border-0 bg-transparent cursor-pointer" 
                    title="삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {paginatedData.length === 0 && (
              <tr>
                <td colSpan={8} className="p-12 text-center text-slate-400 font-bold text-sm">
                  {data.length === 0 ? "등록된 예약 내역이 없습니다." : "검색 결과와 일치하는 예약 내역이 없습니다."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
