import React from "react";
import { CheckCircle, AlertTriangle } from "lucide-react";
import { MessageLog, SenderDevice } from "../types";

interface MessageLogsTableProps {
  data: MessageLog[];
  paginatedData: MessageLog[];
  formatKoreanTime: (isoString: string) => string;
  parseSenderDevice: (msg: string) => SenderDevice;
}

export function MessageLogsTable({
  data,
  paginatedData,
  formatKoreanTime,
  parseSenderDevice
}: MessageLogsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse whitespace-nowrap md:whitespace-normal">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100 text-sm text-slate-650 font-bold">
            <th className="p-4 whitespace-nowrap">발송일시</th>
            <th className="p-4 whitespace-nowrap">발신번호</th>
            <th className="p-4 whitespace-nowrap">수신번호</th>
            <th className="p-4 w-1/2 min-w-[250px]">발송내용</th>
            <th className="p-4 text-center whitespace-nowrap">상태</th>
          </tr>
        </thead>
        <tbody>
          {paginatedData.map(t => {
            const { cleanMessage, deviceId } = parseSenderDevice(t.message);
            const displaySender = deviceId === "default" ? "기본 기기" : deviceId;
            return (
              <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                <td className="p-4 text-sm text-slate-500 font-mono whitespace-nowrap">
                  {formatKoreanTime(t.created_at)}
                </td>
                <td className="p-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-extrabold border ${
                    deviceId === "default" 
                      ? "bg-slate-50 text-slate-600 border-slate-200" 
                      : "bg-indigo-50 text-indigo-600 border-indigo-100"
                  }`}>
                    {displaySender}
                  </span>
                </td>
                <td className="p-4 font-bold text-slate-700 whitespace-nowrap">{t.phone}</td>
                <td className="p-4 text-xs text-slate-600 whitespace-pre-wrap leading-relaxed max-w-lg break-all">
                  {cleanMessage}
                </td>
                <td className="p-4 text-center whitespace-nowrap">
                  {t.status === "SUCCESS" ? (
                    <span className="inline-flex items-center px-2.5 py-1 bg-green-50 text-green-700 text-xs font-extrabold rounded-full border border-green-200">
                      <CheckCircle className="w-3 h-3 mr-1" />성공
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-1 bg-rose-50 text-rose-700 text-xs font-extrabold rounded-full border border-rose-250">
                      <AlertTriangle className="w-3 h-3 mr-1" />실패
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
          {paginatedData.length === 0 && (
            <tr>
              <td colSpan={5} className="p-12 text-center text-slate-400 font-bold text-sm">
                {data.length === 0 ? "발송 내역이 없습니다." : "검색 결과와 일치하는 내역이 없습니다."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
