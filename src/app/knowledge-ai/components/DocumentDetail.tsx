import React, { useState } from "react";
import { Cpu, GitBranch, CheckCircle2, X, HelpCircle, FileEdit, Sparkles, Shield, Save, Layers, Eye, Code, Maximize2 } from "lucide-react";
import { KnowledgeDocument } from "../types";
import { CadViewer } from "./CadViewer";
import { AudioPlayer } from "./AudioPlayer";

// UTC 시간 문자열을 한국 표준시(KST, UTC+9) 형식으로 포맷팅하는 헬퍼 함수
function formatToKST(dateStr: string, isShort = false): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;

    // UTC 시간을 KST(UTC+9)로 오프셋 보정
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstDate = new Date(d.getTime() + kstOffset);

    const year = kstDate.getUTCFullYear();
    const month = String(kstDate.getUTCMonth() + 1).padStart(2, "0");
    const day = String(kstDate.getUTCDate()).padStart(2, "0");
    const hour = String(kstDate.getUTCHours()).padStart(2, "0");
    const minute = String(kstDate.getUTCMinutes()).padStart(2, "0");
    const second = String(kstDate.getUTCSeconds()).padStart(2, "0");

    if (isShort) {
      return `${month}-${day} ${hour}:${minute}`;
    }
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  } catch (e) {
    return dateStr;
  }
}

interface DocumentDetailProps {
  selectedDoc: KnowledgeDocument | null;
  handleApproveDocument: (docId: string, status: "APPROVED" | "REJECTED", comments: string) => void;

  // CAD 관련 props
  cadZoom: number;
  setCadZoom: (val: number | ((prev: number) => number)) => void;
  cadPan: { x: number; y: number };
  setCadPan: (val: { x: number; y: number }) => void;
  handleCadMouseDown: (e: React.MouseEvent) => void;
  handleCadMouseMove: (e: React.MouseEvent) => void;
  handleCadMouseUp: () => void;

  // 오디오 관련 props
  isPlayingAudio: boolean;
  setIsPlayingAudio: (val: boolean) => void;
  audioProgress: number;

  // 지식 편집 props
  isEditing: boolean;
  setIsEditing: (val: boolean) => void;
  editContent: string;
  setEditContent: (val: string) => void;
  editMetadata: Record<string, any>;
  setEditMetadata: (val: Record<string, any> | ((prev: Record<string, any>) => Record<string, any>)) => void;
  editSecurityLevel: "A" | "B" | "C";
  setEditSecurityLevel: (val: "A" | "B" | "C" | ((prev: "A" | "B" | "C") => "A" | "B" | "C")) => void;
  handleUpdateDocument: (docId: string, content: string, metadata?: Record<string, any>, securityLevel?: "A" | "B" | "C") => void;
  handleDeleteDocument: (docId: string) => void;
  assetTypes: Array<{ id: string | number; type_name: string }>;
}

export function DocumentDetail({
  selectedDoc,
  handleApproveDocument,
  cadZoom,
  setCadZoom,
  cadPan,
  setCadPan,
  handleCadMouseDown,
  handleCadMouseMove,
  handleCadMouseUp,
  isPlayingAudio,
  setIsPlayingAudio,
  audioProgress,
  isEditing,
  setIsEditing,
  editContent,
  setEditContent,
  editMetadata,
  setEditMetadata,
  editSecurityLevel,
  setEditSecurityLevel,
  handleUpdateDocument,
  handleDeleteDocument,
  assetTypes,
}: DocumentDetailProps) {
  if (!selectedDoc) {
    return (
      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center justify-center min-h-[500px] text-slate-400 text-xs">
        왼쪽 리스트에서 사내 지식 문서를 선택하시면 정밀 관제 및 본문 해독이 진행됩니다.
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col min-h-[500px]">
      {/* 문서 헤더 */}
      <div className="flex justify-between items-start border-b border-slate-200 pb-4 mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1.5 font-mono">
            {isEditing ? (
              <select
                value={editSecurityLevel}
                onChange={(e) => setEditSecurityLevel(e.target.value as any)}
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border cursor-pointer focus:outline-none ${
                  editSecurityLevel === "A"
                    ? "bg-rose-50 text-rose-600 border-rose-200"
                    : editSecurityLevel === "B"
                    ? "bg-amber-50 text-amber-600 border-amber-200"
                    : "bg-emerald-50 text-emerald-600 border-emerald-200"
                }`}
              >
                <option value="A">🔒 최고 기밀 (A)</option>
                <option value="B">🔑 부서 대외비 (B)</option>
                <option value="C">🌐 사내 공개 (C)</option>
              </select>
            ) : (
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                  selectedDoc.security_level === "A"
                    ? "bg-rose-50 text-rose-600 border-rose-200"
                    : selectedDoc.security_level === "B"
                    ? "bg-amber-50 text-amber-600 border-amber-200"
                    : "bg-emerald-50 text-emerald-600 border-emerald-200"
                }`}
              >
                {selectedDoc.security_level === "A"
                  ? "🔒 최고 기밀 (A)"
                  : selectedDoc.security_level === "B"
                  ? "🔑 부서 대외비 (B)"
                  : "🌐 사내 공개 (C)"}
              </span>
            )}
            <span className="text-[10px] text-blue-600 font-bold">Autopilot Score: {selectedDoc.autopilot_score}p</span>
          </div>
          <h2 className="text-md font-bold text-slate-800 tracking-tight" id="detail-doc-title">{selectedDoc.title}</h2>
          <div className="flex items-center gap-3 text-xs text-slate-400 mt-2 font-mono">
            <span>기안자: {selectedDoc.creator_id}</span>
            <span>부서: {selectedDoc.dept_code}</span>
            <span>일시: {formatToKST(selectedDoc.created_at)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono">
          {!isEditing && (
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setEditContent(selectedDoc.content || "");
                  setEditMetadata(selectedDoc.metadata || {});
                  setEditSecurityLevel(selectedDoc.security_level as any);
                  setIsEditing(true);
                }}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-blue-650 text-[10px] font-black rounded-lg border border-slate-200 cursor-pointer shadow-sm transition-all"
              >
                ✏️ 지식 수정
              </button>
              <button
                type="button"
                onClick={() => handleDeleteDocument(selectedDoc.document_id)}
                className="px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-600 text-[10px] font-black rounded-lg border border-rose-200 cursor-pointer shadow-sm transition-all"
              >
                🗑️ 지식 삭제
              </button>
            </div>
          )}
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full font-sans ${
              selectedDoc.status === "APPROVED_AUTO"
                ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                : selectedDoc.status === "APPROVED_MANUAL"
                ? "bg-cyan-50 text-cyan-600 border border-cyan-200"
                : selectedDoc.status === "REJECTED"
                ? "bg-rose-50 text-rose-600 border-rose-200"
                : "bg-yellow-50 text-yellow-600 border border-yellow-200"
            }`}
          >
            {selectedDoc.status === "APPROVED_AUTO"
              ? "자동 전결 완료"
              : selectedDoc.status === "APPROVED_MANUAL"
              ? "수동 승인"
              : selectedDoc.status === "REJECTED"
              ? "기안 반려"
              : "심사 대기"}
          </span>
        </div>
      </div>

      {/* 비정형 유형별 시각적 프리뷰 영역 */}
      <div className="mb-4">
        {(selectedDoc.doc_type.includes("도면") || selectedDoc.doc_type === "CAD_BLUEPRINT") && (
          <CadViewer
            cadZoom={cadZoom}
            setCadZoom={setCadZoom}
            cadPan={cadPan}
            setCadPan={setCadPan}
            handleCadMouseDown={handleCadMouseDown}
            handleCadMouseMove={handleCadMouseMove}
            handleCadMouseUp={handleCadMouseUp}
          />
        )}

        {(selectedDoc.doc_type.includes("명함") || selectedDoc.doc_type === "B_CARD") && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-100 px-3 py-1.5 text-[10px] text-slate-500 font-mono border-b border-slate-200">
              B2B 명함 실물 이미지 & AI OCR 정밀 해독 매핑
            </div>
            <div className="p-3 grid grid-cols-2 gap-4">
              <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg flex flex-col justify-between h-32 text-slate-200 shadow-md select-none">
                <div>
                  <div className="text-[9px] tracking-widest text-slate-400 font-semibold mb-2">M M I N N O V A T I O N</div>
                  <div className="text-xs font-bold text-white tracking-wider font-sans">
                    박 태 준 <span className="text-[10px] font-normal text-slate-400 ml-1">본부장</span>
                  </div>
                </div>
                <div className="text-[9px] text-slate-400 font-mono space-y-0.5 pt-2 border-t border-slate-700/50">
                  <div>Tel: 010-9876-5432</div>
                  <div>Email: tjpark@mirae-inno.co.kr</div>
                </div>
              </div>

              <div className="text-xs flex flex-col justify-center space-y-2 border-l border-slate-200 pl-4 font-mono">
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-400">회사명:</span>
                  <span className="font-semibold text-slate-700 font-sans">
                    {selectedDoc.metadata?.company || "미래이노베이션"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-400">대표성명:</span>
                  <span className="font-semibold text-slate-700 font-sans">
                    {selectedDoc.metadata?.name || "박태준"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-400">직급부서:</span>
                  <span className="font-semibold text-slate-700 font-sans">
                    {selectedDoc.metadata?.position || "본부장"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-400">휴대번호:</span>
                  <span className="font-semibold text-slate-700">
                    {selectedDoc.metadata?.phone || "010-9876-5432"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {(selectedDoc.doc_type.includes("녹음") ||
          selectedDoc.doc_type.includes("영상") ||
          selectedDoc.doc_type === "AUDIO_RECORDING") && (
          <AudioPlayer
            isPlayingAudio={isPlayingAudio}
            setIsPlayingAudio={setIsPlayingAudio}
            audioProgress={audioProgress}
          />
        )}
      </div>

      {/* 문서 상세 마크다운 텍스트 본문 (읽기 전용 뷰어) */}
      <div className="flex-1 flex flex-col min-h-[240px] max-h-[420px] bg-slate-50 border border-slate-200 rounded-xl p-4 overflow-y-auto scrollbar-thin relative text-slate-700">
        <div className="whitespace-pre-wrap text-xs font-mono leading-relaxed">{selectedDoc.content}</div>

        {/* JSON 메타데이터 렌더링 */}
        {selectedDoc.metadata && (
          <div className="border-t border-slate-200 pt-3 mt-4 space-y-2">
            <span className="text-blue-600 font-bold flex items-center gap-1 font-sans">
              <Cpu className="w-3.5 h-3.5 text-blue-500" />
              ⚙️ AI 추출 정형 메타데이터
            </span>
            <div className="bg-white p-3 rounded-lg border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
              {Object.entries(selectedDoc.metadata).map(([k, v]: any) => {
                if (typeof v === "object") return null;

                let labelName = k;
                if (k === "doc_type") labelName = "자산종류";
                else if (k === "file_name") labelName = "파일명";
                else if (k === "file_size") labelName = "파일크기";

                return (
                  <div key={k} className="flex justify-between border-b border-slate-100 pb-1">
                    <span className="text-slate-400 font-semibold">{labelName}:</span>
                    <span className="text-slate-700 font-bold">{String(v)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 결재 심사 대기 및 의견 코멘트 감사 보드 */}
      <div className="border-t border-slate-200 pt-4 mt-4">
        <div className="flex items-center gap-2 mb-3">
          <GitBranch className="w-4 h-4 text-slate-500" />
          <h3 className="text-xs font-bold text-slate-700">결재 감사 로그 및 피드백</h3>
        </div>

        {/* approvals 리스트 */}
        <div className="space-y-2 mb-4">
          {selectedDoc.approvals?.map((app, i) => (
            <div
              key={i}
              className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg flex items-start gap-2.5 text-xs font-mono text-slate-700"
            >
              <div
                className={`p-1.5 rounded-full border ${
                  app.status === "APPROVED"
                    ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                    : app.status === "REJECTED"
                    ? "bg-rose-50 text-rose-600 border-rose-200"
                    : "bg-yellow-50 text-yellow-600 border border-yellow-200"
                }`}
              >
                {app.status === "APPROVED" ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : app.status === "REJECTED" ? (
                  <X className="w-3.5 h-3.5" />
                ) : (
                  <HelpCircle className="w-3.5 h-3.5" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex justify-between text-[10px] text-slate-400 font-semibold mb-1">
                  <span>
                    결재권자: {app.approver_id} ({app.step_type})
                  </span>
                  <span>{app.processed_at ? formatToKST(app.processed_at) : "결재대기"}</span>
                </div>
                <p className="text-slate-650 text-[11px] leading-relaxed font-sans">{app.comments}</p>
              </div>
            </div>
          ))}
        </div>

        {/* 수동 결재 대기 중 결재 폼 */}
        {selectedDoc.status === "PENDING" && (
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl gap-2.5 flex flex-col">
            <label className="text-[11px] text-slate-500 font-medium">기안서 결재 처리 의견 작성</label>
            <textarea
              placeholder="결재 심사 또는 기안 반려 시 의견을 적어주십시오."
              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:border-blue-500 text-slate-800 font-sans font-semibold resize-none h-14"
              id={`comment-input-${selectedDoc.document_id}`}
            />
            <div className="flex justify-end gap-2 text-xs">
              <button
                onClick={() => {
                  const input = document.getElementById(`comment-input-${selectedDoc.document_id}`) as HTMLTextAreaElement;
                  handleApproveDocument(selectedDoc.document_id, "REJECTED", input?.value);
                }}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold rounded-lg transition-all"
                id="btn-reject-doc"
              >
                🔴 기안 반려
              </button>
              <button
                onClick={() => {
                  const input = document.getElementById(`comment-input-${selectedDoc.document_id}`) as HTMLTextAreaElement;
                  handleApproveDocument(selectedDoc.document_id, "APPROVED", input?.value);
                }}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 font-bold rounded-lg transition-all flex items-center gap-1"
                id="btn-approve-doc"
              >
                🟢 최종 결재 승인
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 🚀 [대형 팝업 모달] 사내 지식 마크다운 정밀 수정 및 RAG 배포 모달 */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-6xl h-[92vh] max-h-[900px] bg-white rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* 모달 상단 헤더 */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/90 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md">
                  <FileEdit className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-800 tracking-tight">
                      사내 지식 마크다운 정밀 수정 & RAG 즉시 반영
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black border border-blue-200">
                      ID: {selectedDoc.document_id}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    문서명: <span className="font-bold text-slate-800">{selectedDoc.title}</span> · 기안자: {selectedDoc.creator_id} ({selectedDoc.dept_code})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="p-2 hover:bg-slate-200/80 rounded-xl text-slate-400 hover:text-slate-700 transition-colors border-none bg-transparent cursor-pointer"
                  title="닫기 (ESC)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 모달 바디: 좌우 2열 분할 와이드 작업 공간 */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-100/60 divide-y md:divide-y-0 md:divide-x divide-slate-200">
              {/* 좌측 메인: 대형 마크다운 에디터 (62% 너비) */}
              <div className="flex-1 md:w-[62%] flex flex-col bg-white p-5 overflow-hidden">
                <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-800 flex items-center gap-1.5 text-sm">
                      <Code className="w-4 h-4 text-blue-600" />
                      마크다운(Markdown) 원문 에디터
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      ({editContent.length.toLocaleString()} 글자 · {editContent.split('\n').length}줄)
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium">
                    💡 단락, 머리글(#), 표(|), 리스트(-), 강조(**) 문법 지원
                  </div>
                </div>

                <div className="flex-1 relative rounded-2xl border border-slate-200/90 overflow-hidden shadow-inner focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all bg-slate-900">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full h-full p-4.5 bg-slate-900 text-slate-100 text-sm font-mono leading-relaxed resize-none focus:outline-none scrollbar-thin selection:bg-blue-600 selection:text-white"
                    placeholder="# 사내 지식 마크다운 내용을 상세히 입력하세요..."
                    spellCheck={false}
                  />
                </div>
              </div>

              {/* 우측 서브: 보안등급 설정 & 정형 메타데이터 & 실시간 미리보기 (38% 너비) */}
              <div className="md:w-[38%] flex flex-col bg-slate-50/80 p-5 overflow-y-auto scrollbar-thin space-y-4">
                {/* 1. 보안 등급 및 사내 배포 통제 */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-indigo-600" />
                      보안 등급 및 사내 열람 권한
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                      editSecurityLevel === 'A' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                      editSecurityLevel === 'B' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                      'bg-emerald-50 text-emerald-600 border-emerald-200'
                    }`}>
                      현재: {editSecurityLevel}등급 ({editSecurityLevel === 'A' ? '극비 격리' : editSecurityLevel === 'B' ? '부서 한정' : '사내 전체 공개'})
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {(['A', 'B', 'C'] as const).map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setEditSecurityLevel(lvl)}
                        className={`p-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                          editSecurityLevel === lvl
                            ? lvl === 'A'
                              ? 'bg-rose-50 border-rose-400 text-rose-700 ring-2 ring-rose-200 shadow-sm'
                              : lvl === 'B'
                              ? 'bg-amber-50 border-amber-400 text-amber-700 ring-2 ring-amber-200 shadow-sm'
                              : 'bg-emerald-50 border-emerald-400 text-emerald-700 ring-2 ring-emerald-200 shadow-sm'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <div className="text-sm font-black">{lvl}등급</div>
                        <div className="text-[10px] font-normal opacity-80 mt-0.5">
                          {lvl === 'A' ? '극비 격리' : lvl === 'B' ? '부서 한정' : '사내 전체 공개'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. AI 정형 메타데이터 편집 */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <Cpu className="w-4 h-4 text-blue-600" />
                      AI 추출 정형 메타데이터 설정
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">JSON 속성 맵핑</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    {Object.entries(editMetadata).map(([k, v]: any) => {
                      if (typeof v === "object") return null;

                      let labelName = k;
                      if (k === "doc_type") labelName = "자산종류";
                      else if (k === "file_name") labelName = "파일명";
                      else if (k === "file_size") labelName = "파일크기";
                      else if (k === "company") labelName = "고객사/회사명";
                      else if (k === "category") labelName = "카테고리";

                      return (
                        <div key={k} className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-slate-50 border border-slate-150">
                          <span className="text-[11px] text-slate-500 font-bold shrink-0 min-w-[70px]">{labelName}</span>
                          {k === "doc_type" ? (
                            <select
                              value={String(v)}
                              onChange={(e) => {
                                const val = e.target.value;
                                setEditMetadata((prev) => ({ ...prev, [k]: val }));
                              }}
                              className="bg-white border border-slate-200 rounded-md px-2 py-1 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-500 w-full"
                            >
                              {assetTypes.map((type) => (
                                <option key={type.id} value={type.type_name}>
                                  {type.type_name}
                                </option>
                              ))}
                            </select>
                          ) : k === "file_size" ? (
                            <span className="text-slate-700 font-mono font-bold text-[11px] px-2">{String(v)}</span>
                          ) : (
                            <input
                              type="text"
                              value={String(v)}
                              onChange={(e) => {
                                const val = e.target.value;
                                setEditMetadata((prev) => ({ ...prev, [k]: val }));
                              }}
                              className="bg-white border border-slate-200 rounded-md px-2 py-1 text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-500 w-full"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. 마크다운 실시간 미리보기 */}
                <div className="flex-1 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col min-h-[200px]">
                  <span className="text-xs font-black text-slate-800 flex items-center gap-1.5 mb-2">
                    <Eye className="w-4 h-4 text-emerald-600" />
                    실시간 본문 렌더링 미리보기
                  </span>
                  <div className="flex-1 bg-slate-50 rounded-xl p-3.5 border border-slate-150 overflow-y-auto scrollbar-thin text-xs text-slate-700 font-mono whitespace-pre-wrap leading-relaxed">
                    {editContent || <span className="text-slate-400 italic">내용을 입력하시면 실시간 미리보기가 렌더링됩니다.</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* 모달 하단 푸터 액션 바 */}
            <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between shrink-0 shadow-lg">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Sparkles className="w-4 h-4 text-blue-600 animate-pulse" />
                <span>저장 완료 시 <strong>전사 지식 RAG 및 AI 컨트롤타워 관제 규정</strong>에 즉시 자동 색인됩니다.</span>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-all cursor-pointer"
                >
                  취소 및 닫기
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateDocument(selectedDoc.document_id, editContent, editMetadata, editSecurityLevel)}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-xs font-black rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer border-none"
                >
                  <Save className="w-4 h-4" />
                  <span>수정 내용 저장 및 RAG 배포 🚀</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
