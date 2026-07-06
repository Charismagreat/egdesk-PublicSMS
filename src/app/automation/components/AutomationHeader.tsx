import React from "react";
import { Zap, Save } from "lucide-react";

interface AutomationHeaderProps {
  isSaving: boolean;
  onSave: () => Promise<void>;
}

export function AutomationHeader({
  isSaving,
  onSave
}: AutomationHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 flex items-center">
          <Zap className="w-8 h-8 text-yellow-500 mr-3 animate-pulse" />
          자동 발송 설정
        </h1>
        <p className="text-slate-550 text-slate-500 mt-2 text-sm font-semibold">
          이벤트가 발생할 때마다 백그라운드에서 지정된 템플릿 문자를 자동으로 발송합니다.
        </p>
      </div>
      <button 
        type="button"
        onClick={onSave}
        disabled={isSaving}
        className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 hover:bg-blue-700 active:bg-blue-800 transition-all flex items-center disabled:opacity-50 border-0 cursor-pointer shrink-0"
      >
        <Save className="w-5 h-5 mr-2" />
        {isSaving ? "저장 중..." : "설정 저장하기"}
      </button>
    </div>
  );
}
