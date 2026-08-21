"use client";

import React, { useState } from "react";
import { 
  FileText, Search, DownloadCloud, ExternalLink, RefreshCw, 
  Clock, CheckCircle2, FileCode, FileSpreadsheet, FileArchive, Image as ImageIcon 
} from "lucide-react";

interface DriveEventTableProps {
  events: any[];
  loading: boolean;
  onRefresh: () => void;
}

export default function DriveEventTable({ events, loading, onRefresh }: DriveEventTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  const getFileIcon = (fileName: string) => {
    const ext = fileName?.split(".").pop()?.toLowerCase() || "";
    if (["xlsx", "xls", "csv"].includes(ext)) return <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />;
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return <ImageIcon className="w-4 h-4 text-purple-600 shrink-0" />;
    if (["zip", "tar", "gz", "7z"].includes(ext)) return <FileArchive className="w-4 h-4 text-amber-600 shrink-0" />;
    if (["js", "ts", "json", "py", "html"].includes(ext)) return <FileCode className="w-4 h-4 text-blue-600 shrink-0" />;
    return <FileText className="w-4 h-4 text-slate-500 shrink-0" />;
  };

  const getEventTypeBadge = (type: string) => {
    const cleanType = String(type || "").toLowerCase();
    if (cleanType.includes("create") || cleanType.includes("add")) {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">신규 생성</span>;
    }
    if (cleanType.includes("modify") || cleanType.includes("update") || cleanType.includes("change")) {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800">내용 수정</span>;
    }
    if (cleanType.includes("delete") || cleanType.includes("remove") || cleanType.includes("trash")) {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800">삭제됨</span>;
    }
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700">{type || "감지됨"}</span>;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filteredEvents = events.filter((ev: any) => {
    const name = ev.file_name || ev.fileName || ev.name || ev.title || "";
    const matchesSearch = !searchTerm || name.toLowerCase().includes(searchTerm.toLowerCase());
    const rawType = String(ev.event_type || ev.eventType || "").toLowerCase();
    
    if (filterType === "all") return matchesSearch;
    if (filterType === "downloaded") return matchesSearch && (ev.downloaded === 1 || ev.downloaded === true || ev.localPath);
    if (filterType === "created") return matchesSearch && rawType.includes("create");
    if (filterType === "modified") return matchesSearch && rawType.includes("modify");
    return matchesSearch;
  });

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-5">
      {/* 테이블 상단 툴바 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">실시간 드라이브 파일 변동 이력 대장</h3>
            <span className="text-xs text-slate-400 font-semibold">총 {events.length}건의 감지 이력</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* 검색 입력 */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="파일명 검색..."
              className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 w-44"
            />
          </div>

          {/* 이벤트 타입 필터 */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="all">전체 이벤트</option>
            <option value="downloaded">다운로드 완료</option>
            <option value="created">신규 생성</option>
            <option value="modified">내용 수정</option>
          </select>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            title="새로고침"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* 이벤트 목록 테이블 */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl text-slate-400">
          <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="text-xs font-medium">최근 감지된 파일 변경 이벤트가 없습니다.</p>
          <p className="text-[11px] text-slate-400 mt-1">구글 드라이브에서 파일을 업로드하거나 수정하면 실시간으로 로그가 적재됩니다.</p>
        </div>
      ) : (
        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-3xs max-h-96 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 text-slate-600 font-bold sticky top-0 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">파일명 / 구글 드라이브 File ID</th>
                <th className="py-3 px-3">이벤트 구분</th>
                <th className="py-3 px-3">파일 크기</th>
                <th className="py-3 px-3">감지 시각</th>
                <th className="py-3 px-3">동기화 상태</th>
                <th className="py-3 px-3 text-right">링크</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEvents.map((ev: any, idx: number) => {
                const fileName = ev.file_name || ev.fileName || ev.name || ev.title || "이름 없는 파일";
                const fileId = ev.file_id || ev.fileId || ev.id || `file-${idx}`;
                const eventTime = ev.detected_at || ev.modified_time || ev.timestamp || ev.createdAt || ev.time || "-";
                const driveUrl = ev.webViewLink || ev.url || (ev.file_id || ev.fileId ? `https://drive.google.com/file/d/${ev.file_id || ev.fileId}/view` : "#");
                const isDownloaded = ev.downloaded === 1 || ev.downloaded === true || ev.localPath;
                const sizeStr = formatFileSize(ev.file_size || ev.fileSize || ev.size);

                return (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2.5">
                        {getFileIcon(fileName)}
                        <div>
                          <span className="font-bold text-slate-800 block text-xs">{fileName}</span>
                          <span className="text-[10px] text-slate-400 font-mono">ID: {fileId}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {getEventTypeBadge(ev.event_type || ev.eventType || ev.type)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      {sizeStr || "-"}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      {typeof eventTime === "string" ? eventTime.replace("T", " ").substring(0, 19) : String(eventTime)}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {isDownloaded ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          로컬 보관됨
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">클라우드 대기</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      {driveUrl && driveUrl !== "#" && (
                        <a
                          href={driveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          <ExternalLink className="w-3 h-3" />
                          드라이브 열기
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
