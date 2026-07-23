"use client";

import { apiFetch } from "@/lib/api";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  FolderOpen, Cpu, Loader2, CheckCircle2, 
  Database, FileSpreadsheet, Sparkles 
} from "lucide-react";

export default function ExcelPageBuilderWidget() {
  const [customPages, setCustomPages] = useState<any[]>([]);
  const [isCustomPagesLoading, setIsCustomPagesLoading] = useState(false);
  const [isUploadingExcel, setIsUploadingExcel] = useState(false);
  const [excelFile, setExcelFile] = useState<File | null>(null);

  // 1. 사내 개설된 커스텀 서비스 목록 조회
  const fetchCustomPages = async () => {
    try {
      setIsCustomPagesLoading(true);
      const res = await apiFetch("/api/custom-pages?action=get_pages");
      const data = await res.json();
      if (data.success) {
        setCustomPages(data.pages || []);
      }
    } catch (err) {
      console.warn("맞춤형 서비스 목록 로드 실패:", err);
    } finally {
      setIsCustomPagesLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomPages();
  }, []);

  // 2. 엑셀 업로드 기반 AI 동적 서비스 창조 처리
  const handleExcelUpload = async () => {
    if (!excelFile) {
      alert("업로드할 엑셀 파일(.xlsx)을 먼저 선택해 주십시오.");
      return;
    }
    
    setIsUploadingExcel(true);
    const formData = new FormData();
    formData.append("file", excelFile);

    try {
      const res = await apiFetch("/api/custom-pages?action=upload_excel", {
        method: "POST",
        body: formData // multipart/form-data 전송
      });
      const data = await res.json();
      if (data.success) {
        alert(`🪐 AI 맞춤 서비스 빌드 완료!\n\n- 서비스명: ${data.page_title}\n- URL 슬러그: /custom/${data.page_slug}`);
        setExcelFile(null);
        fetchCustomPages(); // 리스트 갱신
      } else {
        alert("AI 빌드 실패: " + (data.error || "서버 오류"));
      }
    } catch (err: any) {
      alert("오류 발생: " + err.message);
    } finally {
      setIsUploadingExcel(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm p-6 space-y-5 text-left w-full">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 font-bold">
            <FolderOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-800 flex items-center gap-1.5">
              <span>엑셀 장표 기반 AI 서비스 빌더</span>
              <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-black">무코드 창조 엔진</span>
            </h3>
            <p className="text-xs text-slate-500 font-bold">회사에서 사용 중인 엑셀 파일(.xlsx)을 업로드하면 AI가 동적 웹페이지를 자동으로 조립하고 데이터를 적재합니다.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 업로드 폼 */}
        <div className="lg:col-span-1 border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-3 bg-slate-50/50 hover:bg-slate-50 transition-colors">
          <div className="p-3 bg-white rounded-full shadow-xs border border-slate-100">
            <Cpu className="w-6 h-6 text-indigo-600 animate-pulse" />
          </div>
          <div>
            <p className="text-xs font-black text-slate-700">엑셀 파일을 선택하거나 끌어서 놓으세요</p>
            <p className="text-[10px] text-slate-400 font-bold mt-1">지원 형식: .xlsx, .xls</p>
          </div>

          <input
            type="file"
            accept=".xlsx, .xls"
            id="excel-home-upload-input"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              setExcelFile(file);
            }}
          />

          {excelFile ? (
            <div className="flex flex-col items-center space-y-2 w-full">
              <span className="text-xs bg-indigo-50 text-indigo-700 font-black px-3 py-1.5 rounded-lg border border-indigo-100 max-w-full truncate">
                📎 {excelFile.name}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setExcelFile(null)}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-black border-none cursor-pointer"
                >
                  취소
                </button>
                <button
                  onClick={handleExcelUpload}
                  disabled={isUploadingExcel}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white rounded-lg text-[10px] font-black border-none cursor-pointer flex items-center gap-1 shadow-sm"
                >
                  {isUploadingExcel ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>AI 빌딩 중...</span>
                    </>
                  ) : (
                    <span>AI 서비스 즉시 빌드</span>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <label
              htmlFor="excel-home-upload-input"
              className="px-4 py-2 bg-white hover:bg-slate-100 text-indigo-600 border border-slate-200 rounded-xl text-xs font-black cursor-pointer shadow-xs transition-colors"
            >
              파일 찾아보기
            </label>
          )}
        </div>

        {/* 생성된 커스텀 서비스 목록 */}
        <div className="lg:col-span-2 space-y-3">
          <h4 className="text-xs font-black text-slate-600 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>자사 맞춤형 AI 서비스 대장 ({customPages.length}개 운영 중)</span>
          </h4>

          {isCustomPagesLoading ? (
            <div className="py-12 flex justify-center items-center">
              <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
            </div>
          ) : customPages.length === 0 ? (
            <div className="py-12 border border-slate-100 rounded-2xl flex flex-col justify-center items-center text-center bg-slate-50/20">
              <Database className="w-8 h-8 text-slate-300 mb-2" />
              <span className="text-xs text-slate-400 font-bold">아직 생성된 맞춤형 서비스가 없습니다.</span>
              <span className="text-[10px] text-slate-400 font-bold mt-1">좌측 엑셀 업로드를 통해 첫 페이지를 즉시 생성해보세요!</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1">
              {customPages.map((page) => (
                <Link
                  key={page.id}
                  href={`/custom/${page.page_slug}`}
                  className="block p-4 bg-slate-50/50 hover:bg-indigo-50/20 border border-slate-150 hover:border-indigo-200 rounded-2xl transition-all text-decoration-none group"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="text-xs font-black text-slate-800 group-hover:text-indigo-950 transition-colors flex items-center gap-1.5">
                        <span>🚀 {page.page_title}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold">
                        슬러그: /custom/{page.page_slug}
                      </div>
                    </div>
                    <span className="text-[9px] bg-slate-200/60 group-hover:bg-indigo-100 group-hover:text-indigo-700 px-2 py-0.5 rounded-full font-black text-slate-500 transition-colors">
                      바로가기 →
                    </span>
                  </div>
                  <div className="mt-2 text-[9px] text-slate-400 font-bold border-t border-slate-200/50 pt-1.5 flex justify-between">
                    <span>생성: {page.created_at?.slice(0, 10)}</span>
                    <span>작성자: {page.created_by}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
