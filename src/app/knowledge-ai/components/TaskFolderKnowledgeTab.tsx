"use client";

import { apiFetch } from '@/lib/api';
import React, { useState, useEffect } from "react";
import { 
  Folder, FileText, Search, Sparkles, Calendar, 
  ArrowRight, ExternalLink, Bot, CheckCircle2, RefreshCw
} from "lucide-react";
import TaskKnowledgeDocumentModal from "@/components/TaskKnowledgeDocumentModal";

export function TaskFolderKnowledgeTab() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFolderFilter, setSelectedFolderFilter] = useState("ALL");
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchKnowledgeTasks = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/cert-patent?t=${Date.now()}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        // 오직 실물 지식 문서(folderItems)만 추출하여 최신순(created_at/id) 정렬
        const rawItems = data.folderItems || [];
        const sortedItems = [...rawItems].reverse();
        setTasks(sortedItems);
      } else {
        setTasks([]);
      }
    } catch (e) {
      console.error("Failed to fetch task knowledge items:", e);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearAllKnowledge = async () => {
    if (!window.confirm("현재 등록된 모든 태스크 폴더 지식자산을 완전히 초기화(삭제)하시겠습니까?")) return;
    setLoading(true);
    try {
      const res = await apiFetch("/api/cert-patent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear_task_knowledge" })
      });
      const data = await res.json();
      if (data.success) {
        setTasks([]);
        alert("모든 태스크 폴더 지식 자산이 깨끗하게 삭제 초기화되었습니다.");
      }
    } catch (e) {
      console.error(e);
      alert("지식 초기화 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKnowledgeTasks();
  }, []);

  // 태스크 폴더 이름 고유 리스트 추출
  const folderNames = Array.from(new Set(tasks.map((t) => t.folder_name || "직원폴더").filter(Boolean)));

  // 검색 및 필터링
  const filteredTasks = tasks.filter((t) => {
    const folderName = t.folder_name || "직원폴더";
    const matchesFolder = selectedFolderFilter === "ALL" || folderName === selectedFolderFilter;
    const matchesSearch = (t.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (t.description || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (folderName).toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFolder && matchesSearch;
  });

  const handleOpenDoc = (doc: any) => {
    setSelectedDoc({
      id: doc.id,
      title: doc.title,
      folder_name: doc.folder_name || "직원폴더",
      content: doc.description || doc.content || "스캔 및 OCR 파싱된 태스크 폴더 지식 리포트 텍스트입니다.",
      created_at: doc.due_date || doc.created_at || new Date().toISOString().split("T")[0],
      file_name: doc.file_name || "스캔문서.pdf"
    });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 text-left animate-fade-in">
      
      {/* 헤더 & 필터 제어 바 */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full flex items-center gap-1">
              <Folder className="w-3 h-3" />
              AI 태스크 폴더 지식 자산
            </span>
            <span className="text-[10px] text-slate-400 font-extrabold">
              총 {filteredTasks.length}건 지식 등록됨
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">
            태스크 폴더 지식 자산 탐색기
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            AI 스캔 및 OCR 파싱을 통해 자동으로 가공·축적된 전사 태스크 폴더의 지식 리포트 문서를 한눈에 조회합니다.
          </p>
        </div>

        {/* 툴바 버튼군 */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={handleClearAllKnowledge}
            className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="현재 등록된 모든 지식자산 1초 초기화"
          >
            <span>🧹 지식 전체 삭제/초기화</span>
          </button>

          <button
            onClick={fetchKnowledgeTasks}
            className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>지식 새로고침</span>
          </button>
        </div>
      </div>

      {/* 필터 & 검색 툴바 */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/70 border border-slate-200/80 p-3 rounded-2xl">
        
        {/* 폴더 칩 필터 */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedFolderFilter("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedFolderFilter === "ALL"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60"
            }`}
          >
            전체 폴더 ({tasks.length})
          </button>
          {folderNames.map((fn) => {
            const count = tasks.filter((t) => (t.folder_name || "기본 태스크 폴더") === fn).length;
            return (
              <button
                key={fn}
                onClick={() => setSelectedFolderFilter(fn)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedFolderFilter === fn
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60"
                }`}
              >
                {fn} ({count})
              </button>
            );
          })}
        </div>

        {/* 검색창 */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="지식 문서 / 키워드 검색..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:border-indigo-500 focus:outline-hidden transition-all"
          />
        </div>
      </div>

      {/* 지식 리포트 문서 그리드 */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 space-y-2">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-500" />
          <p className="text-xs font-bold">태스크 폴더 지식 자산을 불어오는 중입니다...</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center text-slate-400 space-y-3">
          <Folder className="w-12 h-12 mx-auto text-slate-300" />
          <p className="text-sm font-bold text-slate-600">조회된 태스크 폴더 지식 자산이 없습니다.</p>
          <p className="text-xs text-slate-400">AI 컨트롤타워에서 태스크 폴더 스캔을 실행하면 이곳에 지식이 자동 축적됩니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTasks.map((item) => {
            const folderName = item.folder_name || "기본 태스크 폴더";
            const dateStr = item.due_date || item.created_at || "실시간 지식";

            return (
              <div
                key={item.id}
                onClick={() => handleOpenDoc(item)}
                className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-2xs hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer flex flex-col justify-between group text-left"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[10px] font-black px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full flex items-center gap-1">
                      <Folder className="w-3 h-3" />
                      {folderName}
                    </span>
                    <span className="text-[10px] text-slate-400 font-extrabold flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {dateStr}
                    </span>
                  </div>

                  <h3 className="text-sm font-black text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-2 mb-2">
                    {item.title}
                  </h3>

                  <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed mb-4">
                    {item.description || "태스크 폴더 스캔을 통해 지식화된 공식 서류 분석 리포트입니다."}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-extrabold text-indigo-600 group-hover:text-indigo-700">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    지식 전문 열람하기
                  </span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 지식 전문 뷰어 모달 */}
      <TaskKnowledgeDocumentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        document={selectedDoc}
      />
    </div>
  );
}
