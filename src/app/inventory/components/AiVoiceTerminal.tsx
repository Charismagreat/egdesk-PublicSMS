import React from 'react';
import { Sparkles, Mic, MicOff, Volume2, X, CheckCircle, Loader2 } from 'lucide-react';

interface AiVoiceTerminalProps {
  voiceText: string;
  setVoiceText: (text: string) => void;
  selectedVoicePreset: number | null;
  setSelectedVoicePreset: (id: number | null) => void;
  isRecording: boolean;
  aiVoiceLoading: boolean;
  aiVoiceSuccess: boolean;
  onVoiceAnalysisTrigger: (textToAnalyze?: string) => void;
  onToggleRecording: () => void;
  onResetSuccess: () => void;
}

export const voicePresets: any[] = [];

export const AiVoiceTerminal: React.FC<AiVoiceTerminalProps> = ({
  voiceText,
  setVoiceText,
  selectedVoicePreset,
  setSelectedVoicePreset,
  isRecording,
  aiVoiceLoading,
  aiVoiceSuccess,
  onVoiceAnalysisTrigger,
  onToggleRecording,
  onResetSuccess
}) => {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-100 flex flex-col relative overflow-hidden">
      <div className="absolute top-0 right-0 p-3 bg-red-50 text-red-600 rounded-bl-2xl font-bold text-[10px] uppercase flex items-center gap-1">
        <Sparkles className="w-3.5 h-3.5 animate-spin" /> Speech NLP AI Engine
      </div>
      
      <div className="mb-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Mic className="w-5 h-5 text-red-500" />
          <span>AI 음성/자연어 출고 명령</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          *"텀블러 5개 출고하고 VIP 발송이라고 메모해줘"* 등의 자연어를 입력하거나 음성으로 말하면 AI가 분석하여 출고 입력폼에 자동 채워줍니다.
        </p>
      </div>

      {/* 음성 프리셋 패널 */}
      {voicePresets.length > 0 && (
        <div className="mb-4">
          <span className="text-xs font-bold text-slate-500 block mb-2">실시간 음성/자연어 분석용 프리셋:</span>
          <div className="flex flex-col space-y-1.5">
            {voicePresets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => {
                  setVoiceText(preset.text);
                  setSelectedVoicePreset(preset.id);
                  onResetSuccess();
                }}
                className={`p-2 rounded-lg border text-left text-xs transition-all flex items-center space-x-2 ${
                  selectedVoicePreset === preset.id
                    ? 'border-red-500 bg-red-50 text-red-950 font-medium'
                    : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <Volume2 className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                <span className="truncate">{preset.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 자연어 텍스트 및 음성 마이크 UI */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <input
            type="text"
            value={voiceText}
            onChange={(e) => {
              setVoiceText(e.target.value);
              setSelectedVoicePreset(null);
              onResetSuccess();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && voiceText.trim() && !aiVoiceLoading) {
                onVoiceAnalysisTrigger(voiceText);
              }
            }}
            placeholder="예: 초경량 모터 5개 출고. 2공장 생산 투입 건"
            className="w-full pl-3 pr-20 py-3 rounded-xl border border-slate-200 text-xs focus:ring-1 focus:ring-red-400 focus:border-red-400 outline-none"
          />
          <div className="absolute right-2 top-1.5 flex items-center space-x-0.5 z-10">
            {voiceText && (
              <button 
                onClick={() => {
                  setVoiceText('');
                  setSelectedVoicePreset(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="지우기"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => {
                if (voiceText.trim() && !aiVoiceLoading) {
                  onVoiceAnalysisTrigger(voiceText);
                }
              }}
              disabled={!voiceText.trim() || aiVoiceLoading}
              className={`p-1.5 rounded-lg transition-all flex items-center justify-center cursor-pointer ${
                voiceText.trim() && !aiVoiceLoading
                  ? 'bg-red-50 hover:bg-red-100 text-red-650'
                  : 'text-slate-350 bg-slate-50 cursor-not-allowed'
              }`}
              title="AI 분석 실행"
            >
              {aiVoiceLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
        <button
          onClick={onToggleRecording}
          className={`p-3 rounded-xl transition-all shadow-md flex items-center justify-center relative ${
            isRecording 
              ? 'bg-red-500 hover:bg-red-600 text-white scale-105 animate-pulse' 
              : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
          }`}
          title={isRecording ? '녹음 정지' : '마이크로 음성 출고 지시 시작'}
        >
          {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          {isRecording && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
            </span>
          )}
        </button>
      </div>

      {/* 음성 인식 웨이브 애니메이션 */}
      {isRecording && (
        <div className="mb-4 bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col items-center justify-center space-y-2">
          <div className="flex items-center space-x-1.5 h-6">
            <span className="w-1 bg-red-400 animate-[bounce_0.8s_infinite_100ms] h-3 rounded-full"></span>
            <span className="w-1 bg-red-500 animate-[bounce_0.8s_infinite_200ms] h-5 rounded-full"></span>
            <span className="w-1 bg-red-600 animate-[bounce_0.8s_infinite_300ms] h-6 rounded-full"></span>
            <span className="w-1 bg-red-500 animate-[bounce_0.8s_infinite_400ms] h-4 rounded-full"></span>
            <span className="w-1 bg-red-400 animate-[bounce_0.8s_infinite_500ms] h-2 rounded-full"></span>
          </div>
          <span className="text-[10px] text-red-500 font-semibold">마이크 음성을 인지 중입니다. 말을 마치려면 정지해 주세요...</span>
        </div>
      )}

      <div className="mt-auto pt-2 border-t border-slate-50">
        {aiVoiceSuccess ? (
          <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" /> 파싱 성공! 출고 전용 폼에 데이터 바인딩 됨
          </span>
        ) : (
          <span className="text-[10px] text-slate-400">* 자연어 입력 후 Enter 키 또는 인풋 창 내 우측 번개 단추를 클릭하세요.</span>
        )}
      </div>
    </div>
  );
};
