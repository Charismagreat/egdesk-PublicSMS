import React from "react";
import { UploadCloud, Settings, Cpu, RefreshCw, Send } from "lucide-react";
import { AssetType } from "../types";

interface IngestHubProps {
  uploadTitle: string;
  setUploadTitle: (val: string) => void;
  uploadType: string;
  setUploadType: (val: string) => void;
  uploadFile: File | null;
  setUploadFile: (val: File | null) => void;
  isUploading: boolean;
  uploadProgress: number;
  assetTypes: AssetType[];
  isAssetTypesLoading: boolean;
  currentRole: "SUPER_ADMIN" | "PRESIDENT" | "SUB_OPERATOR";
  currentUser: string;
  setVaultError: (val: string | null) => void;
  setIsTypeVaultOpen: (val: boolean) => void;
  handleFileUpload: (e: React.FormEvent) => void;
  uploadMode: "file" | "direct";
  setUploadMode: (val: "file" | "direct") => void;
  directContent: string;
  setDirectContent: (val: string) => void;
}

export function IngestHub({
  uploadTitle,
  setUploadTitle,
  uploadType,
  setUploadType,
  uploadFile,
  setUploadFile,
  isUploading,
  uploadProgress,
  assetTypes,
  isAssetTypesLoading,
  currentRole,
  currentUser,
  setVaultError,
  setIsTypeVaultOpen,
  handleFileUpload,
  uploadMode,
  setUploadMode,
  directContent,
  setDirectContent,
}: IngestHubProps) {
  return (
    <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
      <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4">
        <UploadCloud className="w-4.5 h-4.5 text-blue-500" />
        AI 비정형 기안 등록 (Ingest Hub)
      </h2>

      {/* 업로드 방식 선택 세그먼트 탭 */}
      <div className="flex bg-slate-100 p-1 rounded-xl mb-4 border border-slate-200/40">
        <button
          type="button"
          onClick={() => setUploadMode("file")}
          className={`flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all border-none cursor-pointer ${
            uploadMode === "file"
              ? "bg-white text-blue-600 shadow-sm border border-slate-200/50"
              : "text-slate-500 hover:text-slate-750"
          }`}
        >
          📂 파일 업로드 상신
        </button>
        <button
          type="button"
          onClick={() => setUploadMode("direct")}
          className={`flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all border-none cursor-pointer ${
            uploadMode === "direct"
              ? "bg-white text-blue-600 shadow-sm border border-slate-200/50"
              : "text-slate-500 hover:text-slate-750"
          }`}
        >
          ✍️ 마크다운 직접 입력
        </button>
      </div>

      <form onSubmit={handleFileUpload} className="space-y-4">
        <div>
          <label className="block text-xs text-slate-500 mb-1.5 font-medium">기안 및 문서 제목</label>
          <input
            type="text"
            value={uploadTitle}
            onChange={(e) => setUploadTitle(e.target.value)}
            placeholder="예: 3차 소형 섀시 도면 승인 상신"
            className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-800 transition-all font-mono"
            id="input-upload-title"
          />
        </div>

        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-8">
            <label className="block text-xs text-slate-500 mb-1.5 font-medium">자산 종류</label>
            <div className="flex gap-1.5">
              <select
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-700 font-sans font-semibold cursor-pointer"
                id="select-asset-type"
              >
                {isAssetTypesLoading ? (
                  <option>분류 로딩 중...</option>
                ) : (
                  assetTypes.map((item) => (
                    <option key={item.id} value={item.type_name}>
                      {item.type_name}
                    </option>
                  ))
                )}
              </select>

              {(currentRole === "SUPER_ADMIN" || currentRole === "PRESIDENT") && (
                <button
                  type="button"
                  onClick={() => {
                    setVaultError(null);
                    setIsTypeVaultOpen(true);
                  }}
                  className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-200 text-slate-500 transition-colors flex items-center justify-center shadow-sm cursor-pointer"
                  title="자산 종류 동적 편집 및 무결성 락 관리"
                  id="btn-open-vault"
                >
                  <Settings className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="col-span-4">
            <label className="block text-xs text-slate-500 mb-1.5 font-medium">기안자 및 소속</label>
            <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-500 font-mono select-none truncate">
              {currentUser}
            </div>
          </div>
        </div>

        {uploadMode === "file" ? (
          <div className="border-2 border-dashed border-slate-200 hover:border-blue-500/60 hover:bg-blue-50/20 transition-all rounded-xl p-6 text-center cursor-pointer relative group">
            <input
              type="file"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              id="input-file-picker"
            />
            <Cpu className="w-8 h-8 text-slate-400 group-hover:text-blue-500 transition-colors mx-auto mb-2 animate-bounce-slow" />
            <span className="block text-xs font-semibold text-slate-600">
              {uploadFile ? uploadFile.name : "여기에 파일 드래그 또는 클릭"}
            </span>
            <span className="block text-[10px] text-slate-400 mt-1">
              DWG, DXF, PNG, JPG, MP3, WAV, XLSX (최대 50MB)
            </span>
          </div>
        ) : (
          <div className="space-y-1.5">
            <label className="block text-xs text-slate-500 font-medium">마크다운 본문 내용 입력</label>
            <textarea
              value={directContent}
              onChange={(e) => setDirectContent(e.target.value)}
              placeholder="### 사내 지식 규정 양식&#10;&#10;* **작성내용**: 여기에 자연어 지식 규정 또는 마크다운 텍스트를 기재해 주세요.&#10;* **예시**: crm_estimate_items 테이블에 데이터 적재 시, 품목명이나 규격에서 X로 시작하고 뒤에 6자리 숫자로 된 정보를 찾으면 그게 우리 회사에서 사용하는 실제 품목코드(유효품목코드)이다."
              className="w-full h-32 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl p-3 text-xs focus:outline-none focus:border-blue-500 text-slate-800 transition-all font-mono resize-none"
              id="textarea-direct-content"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={isUploading}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-2.5 rounded-xl text-xs hover:from-blue-700 hover:to-indigo-700 active:scale-98 transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
          id="btn-upload-submit"
        >
          {isUploading ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              AI OCR 및 비정형 구문 파싱 중... ({uploadProgress}%)
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              AI 기안 상신 (자동 A등급 강제 격리 🔒)
            </>
          )}
        </button>
      </form>
    </div>
  );
}
