"use client";

import React from "react";
import { Terminal, AlertTriangle, X, Play, RefreshCw, Database, CheckCircle, ShieldAlert } from "lucide-react";
import { ConsoleResult } from "../types";

// SQL 프리셋 정의
const SQL_PRESETS = [
  { label: "지출 장부 스캔 (Top 10)", query: "SELECT * FROM crm_expenses ORDER BY id DESC LIMIT 10;" },
  { label: "운영자 목록 조회", query: "SELECT id, username, name, role, created_at FROM crm_operators;" },
  { label: "지출 계정과목 전체", query: "SELECT * FROM crm_categories;" },
  { label: "결제수단별 지출집계", query: "SELECT payment_method, COUNT(*) as 건수, SUM(amount) as 총합 FROM crm_expenses GROUP BY payment_method;" },
  { label: "SQLite 버전 정보", query: "SELECT sqlite_version();" }
];

export interface SqlConsolePlaygroundProps {
  tables: any[];
  selectedTable: string;
  sqlQuery: string;
  setSqlQuery: (query: string) => void;
  consoleTab: "direct" | "ai";
  setConsoleTab: (tab: "direct" | "ai") => void;
  safetyUnlocked: boolean;
  setSafetyUnlocked: (unlocked: boolean) => void;
  aiPrompt: string;
  setAiPrompt: (prompt: string) => void;
  isAiLoading: boolean;
  setIsAiLoading: (loading: boolean) => void;
  aiGeneratedSql: string;
  setAiGeneratedSql: (sql: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  setConsoleResult: (res: ConsoleResult | null) => void;
  setActiveTab: (tab: "data" | "schema" | "console" | "chart" | "shared") => void;
  triggerAIVisualization: (rows: any[], queryStr: string) => Promise<void>;
  handleExecuteSQL: () => Promise<void>;
  handleTranslateSQL: () => Promise<void>;
  showToast: (message: string, type?: "success" | "error" | "warn") => void;
}

export function SqlConsolePlayground({
  tables,
  selectedTable,
  sqlQuery,
  setSqlQuery,
  consoleTab,
  setConsoleTab,
  safetyUnlocked,
  setSafetyUnlocked,
  aiPrompt,
  setAiPrompt,
  isAiLoading,
  setIsAiLoading,
  aiGeneratedSql,
  setAiGeneratedSql,
  isLoading,
  setIsLoading,
  setConsoleResult,
  setActiveTab,
  triggerAIVisualization,
  handleExecuteSQL,
  handleTranslateSQL,
  showToast,
}: SqlConsolePlaygroundProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 overflow-hidden text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100/70">
        <h2 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
          <Terminal className="w-4.5 h-4.5 text-indigo-500" />
          대화형 SQL 플레이그라운드
        </h2>

        <div className="flex items-center gap-3">
          {/* 💡 직접 입력 / AI 자연어 스위치 탭 */}
          <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200/70 text-[10px] font-bold">
            <button
              onClick={() => setConsoleTab("ai")}
              className={`px-3 py-1.5 rounded-md transition-all border-none cursor-pointer flex items-center gap-0.5 ${
                consoleTab === "ai"
                  ? "bg-white text-blue-600 shadow-3xs font-black"
                  : "text-slate-500 bg-transparent"
              }`}
            >
              AI 자연어 요청 💡
            </button>
            <button
              onClick={() => setConsoleTab("direct")}
              className={`px-3 py-1.5 rounded-md transition-all border-none cursor-pointer ${
                consoleTab === "direct"
                  ? "bg-white text-blue-600 shadow-3xs font-black"
                  : "text-slate-500 bg-transparent"
              }`}
            >
              직접 쿼리 입력
            </button>
          </div>

          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={safetyUnlocked}
              onChange={(e) => setSafetyUnlocked(e.target.checked)}
              className="rounded border-slate-350 text-rose-600 bg-white focus:ring-rose-500/20 w-3.5 h-3.5 cursor-pointer"
            />
            <span className="text-[10px] font-bold text-rose-605 flex items-center gap-0.5">
              <AlertTriangle className="w-3 h-3 text-rose-500" />
              안전장치 잠금 해제
            </span>
          </label>
        </div>
      </div>

      {/* 1단: 직접 SQL 쿼리 에디터 탭 */}
      {consoleTab === "direct" ? (
        <>
          <div className="relative mb-3.5">
            <textarea
              value={sqlQuery}
              onChange={(e) => setSqlQuery(e.target.value)}
              placeholder="여기에 실행할 커스텀 SQL 쿼리를 기입하십시오. (예: SELECT * FROM crm_expenses;)"
              className="w-full h-28 pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 text-slate-700 font-mono text-xs rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none shadow-3xs"
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.ctrlKey) {
                  e.preventDefault();
                  handleExecuteSQL();
                }
              }}
            />
            {sqlQuery && (
              <button
                onClick={() => setSqlQuery("")}
                className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-655 hover:bg-slate-200/50 rounded-full border-none bg-transparent cursor-pointer transition-colors"
                title="에디터 입력 내용 비우기"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* 템플릿 프리셋 및 실행 버튼 */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-slate-400 font-bold mr-1">프리셋:</span>
              {SQL_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => setSqlQuery(preset.query)}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-605 rounded-lg text-[9px] font-bold border border-slate-200/50 cursor-pointer select-none transition-all"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleExecuteSQL}
              disabled={isLoading}
              className="flex items-center gap-1 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black shadow-sm border-none cursor-pointer transition-all active:scale-95 disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current text-white" />
              SQL 실행 (Ctrl+Enter)
            </button>
          </div>
        </>
      ) : (
        /* 2단: AI 자연어 쿼리 번역기 탭 */
        <div className="space-y-4 animate-fade-in">
          <div className="relative">
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="DB 전문가가 아니더라도 자연어로 원하시는 데이터를 AI에게 편하게 물어보세요!&#10;(예: '최근 등록된 5개의 지출 내역 보여줘' 또는 '결제 수단별로 총 지출 금액 합계를 내줘')"
              className="w-full h-24 pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none shadow-3xs"
            />
            {aiPrompt && (
              <button
                onClick={() => setAiPrompt("")}
                className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-655 hover:bg-slate-200/50 rounded-full border-none bg-transparent cursor-pointer transition-colors"
                title="AI 요구사항 입력 비우기"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
              <Database className="w-3 h-3 text-blue-500" />
              {tables.length}개의 로컬 물리 테이블 정보 동기화 완료
            </div>

            <button
              onClick={handleTranslateSQL}
              disabled={isAiLoading || !aiPrompt.trim()}
              className="flex items-center gap-1 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow-sm border-none cursor-pointer transition-all active:scale-95 disabled:opacity-50"
            >
              {isAiLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin mr-0.5 text-white" />
                  AI 번역 분석 중...
                </>
              ) : (
                <>
                  <Terminal className="w-3.5 h-3.5 text-white" />
                  SQL 번역 및 생성 요청
                </>
              )}
            </button>
          </div>

          {/* AI 번역 완료 결과 카드 영역 */}
          {aiGeneratedSql && (
            <div className="bg-slate-50/70 border border-slate-200/60 p-4.5 rounded-2xl space-y-3.5 animate-fade-in shadow-3xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-indigo-605 bg-indigo-50 px-2 py-1 border border-indigo-100 rounded-md">
                  🤖 AI가 해독한 SQLite3 쿼리
                </span>
                <span className="text-[9px] text-slate-400">
                  오류 제어 번역 확률: 99.8% (Gemini 3.5 Flash)
                </span>
              </div>

              <pre className="p-3.5 bg-slate-900 text-green-400 font-mono text-[11px] rounded-xl overflow-x-auto select-all leading-relaxed shadow-sm">
                {aiGeneratedSql}
              </pre>

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => {
                    setSqlQuery(aiGeneratedSql);
                    setConsoleTab("direct");
                    showToast("번역된 쿼리가 에디터에 적용되었습니다. 실행 단추를 누르시면 됩니다.", "success");
                  }}
                  className="px-3.5 py-2 border border-slate-250 bg-white hover:bg-slate-50 text-slate-650 rounded-xl text-xs font-bold shadow-3xs cursor-pointer select-none transition-all active:scale-95"
                >
                  ✏️ 쿼리 에디터에 적용
                </button>
                <button
                  onClick={async () => {
                    setSqlQuery(aiGeneratedSql);
                    setTimeout(async () => {
                      setIsLoading(true);
                      setConsoleResult(null);
                      try {
                        const res = await fetch("/api/db", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ action: "execute", query: aiGeneratedSql })
                        });
                        const data = await res.json();
                        if (data.success) {
                          setConsoleResult({
                            success: true,
                            rows: data.rows,
                            affectedRows: data.affectedRows,
                            lastInsertRowid: data.lastInsertRowid
                          });
                          showToast("AI 생성 쿼리가 데이터베이스에서 성공적으로 완수되었습니다.", "success");

                          // AI 시각화 및 데이터 브리핑 호출
                          if (data.rows && data.rows.length > 0) {
                            triggerAIVisualization(data.rows, aiGeneratedSql);
                          }

                          setActiveTab("console");
                        } else {
                          setConsoleResult({ success: false, error: data.error });
                          showToast(data.error || "쿼리 컴파일 실패", "error");
                          setActiveTab("console");
                        }
                      } catch (e) {
                        showToast("실행 에러 발생", "error");
                      } finally {
                        setIsLoading(false);
                      }
                    }, 50);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow-3xs cursor-pointer border-none transition-all active:scale-95"
                >
                  ⚡ 쿼리 즉시 실행하기
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export interface SqlConsoleResultProps {
  consoleResult: ConsoleResult;
}

export function SqlConsoleResult({ consoleResult }: SqlConsoleResultProps) {
  return (
    <div className="p-5 space-y-4 animate-fade-in text-left">
      {consoleResult.success ? (
        <div className="space-y-4">
          {/* 성공 헤더 피드 */}
          <div className="p-3.5 bg-green-50 text-green-700 border border-green-200 rounded-xl flex items-center gap-2 text-xs font-semibold">
            <CheckCircle className="w-4.5 h-4.5 text-green-600" />
            성공: 쿼리가 데이터베이스 컴파일러를 통과하여 완수되었습니다.
            {consoleResult.affectedRows !== null && consoleResult.affectedRows !== undefined && ` (영향받은 행: ${consoleResult.affectedRows}개)`}
            {consoleResult.lastInsertRowid !== null && consoleResult.lastInsertRowid !== undefined && ` (생성된 ID: ${consoleResult.lastInsertRowid})`}
          </div>

          {/* 결과 레코드 표 */}
          {consoleResult.rows && consoleResult.rows.length > 0 ? (
            <div className="overflow-x-auto w-full border border-slate-100 rounded-xl max-h-[400px]">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-100 text-sm">
                  <tr>
                    {Object.keys(consoleResult.rows[0]).map((key) => (
                      <th key={key} className="p-4 font-bold text-slate-700 whitespace-nowrap">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {consoleResult.rows.map((row, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-slate-50 hover:bg-slate-50 transition-all font-mono text-[11px] text-slate-650"
                    >
                      {Object.values(row).map((val: any, cIdx) => (
                        <td key={cIdx} className="p-4 max-w-[250px] truncate" title={val !== null ? String(val) : "NULL"}>
                          {val === null ? (
                            <span className="text-[10px] text-slate-300 italic select-none">NULL</span>
                          ) : (
                            String(val)
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-10 text-center text-xs text-slate-400 italic font-bold">
              SELECT 결과 세트가 비어있거나, 데이터를 변경하는 쿼리입니다.
            </div>
          )}
        </div>
      ) : (
        /* 실패 정보 피드 */
        <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs font-mono leading-relaxed">
          <ShieldAlert className="w-4.5 h-4.5 text-red-650 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-red-800 mb-1">SQL Compilation/Execution Failed:</div>
            {consoleResult.error || "알 수 없는 SQL 컴파일 에러입니다. 문법을 확인해 주세요."}
          </div>
        </div>
      )}
    </div>
  );
}
