"use client";

import React, { useState } from "react";
import { Sparkles, Wand2, ArrowRight, Lightbulb, Clock, Zap, Mail, FileText, Coins, CheckSquare, RefreshCw } from "lucide-react";
import { SCRIPT_PRESETS, ScriptPreset } from "../constants/presets";

interface NaturalLanguagePromptStepProps {
  prompt: string;
  setPrompt: (p: string) => void;
  onGenerateScript: () => void;
  loading: boolean;
  onBackToClone: () => void;
  clonedSheetInfo?: any;
  existingScriptCode?: string;
}

export default function NaturalLanguagePromptStep({
  prompt,
  setPrompt,
  onGenerateScript,
  loading,
  onBackToClone,
  clonedSheetInfo,
  existingScriptCode,
}: NaturalLanguagePromptStepProps) {
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

  const handleSelectPreset = (preset: ScriptPreset) => {
    setSelectedPresetId(preset.id);
    setPrompt(preset.prompt);
  };

  const allTabs: Array<{ sheetTitle: string; headers: string[] }> = clonedSheetInfo?.allTabs || [];

  const getPresetIcon = (iconName: string) => {
    switch (iconName) {
      case "Clock": return <Clock className="w-4 h-4 text-purple-600" />;
      case "Zap": return <Zap className="w-4 h-4 text-amber-500" />;
      case "Mail": return <Mail className="w-4 h-4 text-blue-500" />;
      case "FileText": return <FileText className="w-4 h-4 text-indigo-500" />;
      case "Coins": return <Coins className="w-4 h-4 text-emerald-500" />;
      case "CheckSquare": return <CheckSquare className="w-4 h-4 text-green-600" />;
      default: return <Sparkles className="w-4 h-4 text-indigo-600" />;
    }
  };

  const isIncrementalMode = Boolean(existingScriptCode && existingScriptCode.trim().length > 30);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Wand2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
              <span>Step 2. 구글 시트에 주입할 자동화 로직을 자연어로 작성</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                isIncrementalMode ? "bg-purple-100 text-purple-700" : "bg-indigo-100 text-indigo-700"
              }`}>
                {isIncrementalMode ? "기존 코드 기반 증분 수정 모드" : "다중 탭 심층 분석 AI"}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isIncrementalMode
                ? "현재 구글 시트의 기존 코드를 유지한 채, 추가하거나 변경하고 싶은 내용만 아래에 편하게 적어주세요."
                : "AI가 시트의 모든 탭 구조와 컬럼을 미리 파악하고 있습니다. 원하는 자동화 기능(메뉴, 자동 계산, 탭 간 연동 등)을 편하게 적어주세요."}
            </p>
          </div>
        </div>
      </div>

      {/* 증분 수정(Refactoring) 활성화 배너 */}
      {isIncrementalMode && (
        <div className="bg-gradient-to-r from-indigo-50/90 to-purple-50/90 border border-indigo-200/90 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-indigo-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>지능형 증분 수정 모드 활성화됨 (기존 코드 보존)</span>
            </span>
            <span className="text-[10px] font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-indigo-200 shadow-3xs">
              Code.gs 계승 모드
            </span>
          </div>
          <p className="text-xs text-indigo-700 leading-relaxed">
            💡 현재 구글 시트에 배포되어 있는 기존 코드(사이드바 UI, 파일 업로드 등)를 AI가 기억하고 있습니다.
            기존 기능을 유지한 채 <strong>추가하거나 변경하고 싶은 내용만 아래에 편하게 적어주시면</strong> AI가 기존 코드에 자연스럽게 덧붙여(Merge) 완성해 드립니다.
          </p>
        </div>
      )}

      {/* 감지된 시트 탭 목록 & 컬럼 명세 카드 */}
      {allTabs.length > 0 && (
        <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
              <span>📊 AI가 분석한 시트 탭 목록 ({allTabs.length}개 탭 감지됨)</span>
            </span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              전체 구조 파악 완료
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {allTabs.map((t, idx) => (
              <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200/80 space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-extrabold text-indigo-900 text-xs truncate">
                    📑 {t.sheetTitle}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {t.headers.length}개 컬럼
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 truncate font-mono">
                  {t.headers.length > 0 ? t.headers.slice(0, 5).join(' | ') + (t.headers.length > 5 ? '...' : '') : '자유 형식 데이터'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 1. 인기 자동화 템플릿 원터치 갤러리 */}
      <div className="space-y-2.5">
        <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
          <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
          <span>인기 자동화 프리셋 템플릿 (클릭 시 자동 입력)</span>
        </span>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {SCRIPT_PRESETS.map((preset) => {
            const isSelected = selectedPresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                  isSelected
                    ? "bg-indigo-50/60 border-indigo-500 ring-2 ring-indigo-200"
                    : "bg-slate-50/60 hover:bg-slate-100/80 border-slate-200/80 hover:border-indigo-300"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <div className="p-1.5 bg-white rounded-lg border border-slate-200/60 shrink-0">
                      {getPresetIcon(preset.iconName)}
                    </div>
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-white border text-indigo-600">
                      {preset.badge}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 leading-snug">
                    {preset.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {preset.description}
                  </p>
                </div>
                <span className="text-[10px] font-bold text-indigo-600 flex items-center gap-0.5 self-end">
                  <span>선택하기</span>
                  <ArrowRight className="w-2.5 h-2.5" />
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. 자연어 프롬프트 입력 textarea */}
      <div className="space-y-2">
        <label className="block text-xs font-extrabold text-slate-700">
          나만의 맞춤 자동화 요구사항 직접 입력
        </label>
        <textarea
          rows={5}
          value={prompt}
          onChange={(e) => {
            setPrompt(e.target.value);
            setSelectedPresetId(null);
          }}
          placeholder="예시: 시트 상단에 [이지데스크 자동화] 메뉴를 만들어줘. 사용자가 시트에서 특정 행을 선택하고 메뉴를 누르면, 그 행의 거래처명, 품목, 금액을 읽어서 이지데스크 API로 전송하고 맨 우측 열에 '전송완료'와 타임스탬프를 남겨줘."
          className="w-full bg-slate-50 border border-slate-200/90 rounded-2xl p-4 text-xs font-medium text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all leading-relaxed"
          disabled={loading}
        />
      </div>

      {/* 액션 버튼 바 */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={onBackToClone}
          disabled={loading}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition-all cursor-pointer border-none"
        >
          이전 단계로
        </button>

        <button
          type="button"
          onClick={onGenerateScript}
          disabled={loading || !prompt.trim()}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black text-xs rounded-2xl transition-all flex items-center gap-2 cursor-pointer shadow-xs border-none active:scale-95"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>AI Apps Script 코드 설계 및 생성 중...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Apps Script 코드 자동 생성하기</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
