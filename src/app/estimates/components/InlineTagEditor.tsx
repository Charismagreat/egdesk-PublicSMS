"use client";

import React, { useState } from "react";
import { parseEstimateMetadata } from "../utils";

interface Tag {
  id: string;
  name: string;
}

interface InlineTagEditorProps {
  estimateId: string;
  initialTags: string;
  aiParsed: number | boolean;
  userRole: string;
  dbTags: Tag[];
  onUpdateTags: (estId: string, tagsValue: string) => Promise<void>;
}

export default function InlineTagEditor({
  estimateId,
  initialTags,
  aiParsed,
  userRole,
  dbTags,
  onUpdateTags,
}: InlineTagEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  
  // 💡 initialTags가 JSON 메타데이터일 경우 순수 tags 필드만 디스플레이 타깃으로 분리
  const metadata = parseEstimateMetadata(initialTags || "");
  const [tempTags, setTempTags] = useState(metadata.tags || "");
  const [isSaving, setIsSaving] = useState(false);

  // 로컬 태그 토글 핸들러
  const handleTagToggle = (tagName: string) => {
    const currentTags = tempTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    let nextTags: string[];
    if (currentTags.includes(tagName)) {
      nextTags = currentTags.filter((t) => t !== tagName);
    } else {
      nextTags = [...currentTags, tagName];
    }

    setTempTags(nextTags.join(", "));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let finalTagsValue = tempTags;
      
      // 💡 만약 기존 initialTags가 JSON 문자열 포맷이었다면, 타 속성(사업자번호, 주소 등) 유실 방지를 위해 tags 속성만 교체 병합하여 직렬화 전송
      const trimmed = (initialTags || "").trim();
      if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
        try {
          const parsed = JSON.parse(trimmed);
          parsed.tags = tempTags;
          finalTagsValue = JSON.stringify(parsed);
        } catch (e) {
          // 파싱 에러 시 입력된 순수 텍스트 전송 폴백
        }
      }

      await onUpdateTags(estimateId, finalTagsValue);
      setIsEditing(false);
    } catch (e) {
      console.error("인라인 태그 저장 실패:", e);
    } finally {
      setIsSaving(false);
    }
  };

  if (isEditing) {
    return (
      <div className="flex flex-col gap-1.5 p-1.5 bg-white rounded-xl border border-slate-200 shadow-md min-w-[200px] z-10 relative">
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={tempTags}
            onChange={(e) => setTempTags(e.target.value)}
            className="border border-indigo-300 bg-indigo-50/50 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500 w-full"
            placeholder="쉼표로 태그 구분"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSave();
              } else if (e.key === "Escape") {
                setIsEditing(false);
              }
            }}
          />
          <button
            onClick={handleSave}
            className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[9px] font-bold transition-all active:scale-95 whitespace-nowrap"
            disabled={isSaving}
          >
            저장
          </button>
          <button
            onClick={() => setIsEditing(false)}
            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg text-[9px] font-bold transition-all active:scale-95 whitespace-nowrap"
          >
            취소
          </button>
        </div>
        <div className="mt-1 p-1.5 bg-slate-50/80 rounded-lg border border-slate-100/80">
          <div className="text-[8.5px] font-extrabold text-slate-400 mb-1">태그 선택 (토글)</div>
          <div className="flex flex-wrap gap-1">
            {dbTags.map((tag) => {
              const isSelected = tempTags
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean)
                .includes(tag.name);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => handleTagToggle(tag.name)}
                  className={`px-1.5 py-0.5 rounded-md text-[8.5px] font-bold border transition-all active:scale-95 cursor-pointer ${
                    isSelected
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-slate-500 border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200"
                  }`}
                >
                  #{tag.name}
                </button>
              );
            })}
            {dbTags.length === 0 && (
              <span className="text-[8.5px] text-slate-300">로드 중...</span>
            )}
          </div>
          {userRole === "SUPER_ADMIN" && (
            <div className="mt-2 pt-1.5 border-t border-slate-100 flex justify-end">
              <a
                href="/expenses"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[8.5px] font-black text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-0.5 animate-pulse"
              >
                ⚙️ 태그 관리 바로가기
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-[28px] flex items-center w-full cursor-pointer hover:bg-indigo-50/50 p-1 rounded-xl transition-all group"
      onClick={() => {
        setIsEditing(true);
        setTempTags(metadata.tags || "");
      }}
      title="클릭하여 비고(태그) 인라인 수정"
    >
      <div className="flex flex-wrap gap-1 max-w-[150px]">
        <span
          className={`px-1.5 py-0.5 rounded-md text-[9px] font-black border ${
            aiParsed
              ? "bg-indigo-50 text-indigo-600 border-indigo-100/60"
              : "bg-slate-50 text-slate-500 border-slate-200"
          }`}
        >
          {aiParsed ? "AI" : "수동"}
        </span>
        {metadata.tags ? (
          metadata.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
            .map((tag, tIdx) => (
              <span
                key={tIdx}
                className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100/60 rounded-md text-[9px] font-black"
              >
                {tag}
              </span>
            ))
        ) : (
          <span className="text-slate-300 text-[9px] font-bold italic group-hover:text-indigo-400">
            비고 추가...
          </span>
        )}
      </div>
    </div>
  );
}
