"use client";

import React, { useState, useRef } from 'react';
import { Upload, Key, Play, FileText, CheckCircle2, RefreshCw } from 'lucide-react';
import DynamicTitle from '@/components/DynamicTitle';

export default function DebugDirectOcrPage() {
  const [apiKey, setApiKey] = useState('');
  const [fileBase64, setFileBase64] = useState('');
  const [filename, setFilename] = useState('');
  const [scanning, setScanning] = useState(false);
  const [ocrResult, setOcrResult] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFilename(file.name);
    setOcrResult('');
    setErrorMsg('');

    const reader = new FileReader();
    reader.onload = () => {
      setFileBase64(reader.result as string);
    };
    reader.onerror = () => {
      setErrorMsg('파일을 읽는 도중 오류가 발생했습니다.');
    };
    reader.readAsDataURL(file);
  };

  const handleStartOcr = async () => {
    if (!apiKey.startsWith('AIzaSy')) {
      setErrorMsg('올바른 구글 API 키(AIzaSy...)를 입력해 주세요.');
      return;
    }
    if (!fileBase64) {
      setErrorMsg('스캔할 이미지 파일을 먼저 선택해 주세요.');
      return;
    }

    setScanning(true);
    setOcrResult('');
    setErrorMsg('');

    try {
      const res = await fetch('/api/debug-direct-ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: fileBase64,
          rawGoogleApiKey: apiKey.trim()
        })
      });

      const data = await res.json();
      if (data.success) {
        setOcrResult(data.raw_ocr_result);
      } else {
        setErrorMsg(data.error || '분석 중 원인 미상의 실패가 발생했습니다.');
      }
    } catch (e: any) {
      setErrorMsg(`API 호출 중 오류 발생: ${e.message}`);
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 py-10 px-4 md:px-8">
      {/* 탭 타이틀 연동용 더미 컴포넌트 호출 대신 하드코딩 대체 */}
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* 헤더 타이틀 */}
        <div className="border-b border-slate-200 pb-5">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Upload className="w-8 h-8 text-indigo-600 animate-pulse" />
            <span>구글 API 직접 통신 OCR 디버그 키트</span>
          </h1>
          <p className="text-slate-500 mt-2 text-sm pl-10">
            이지데스크 AI 중계기 채널을 100% 우회하여 사용자 PC단에서 구글 Gemini API로 원본 이미지를 다이렉트 송수신 판독하는 검증 툴입니다.
          </p>
        </div>

        {/* 설정 및 업로드 영역 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* API 키 카드 */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
              <Key className="w-4 h-4 text-indigo-500" />
              <span>1단계: 실물 구글 API 키 입력</span>
            </h3>
            <div className="space-y-1">
              <input
                type="password"
                placeholder="AIzaSy... 로 시작하는 구글 API Key 입력"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
              <span className="text-[10px] text-slate-400 block pl-1">
                * 입력하신 구글 API 키는 서버 DB에 저장되지 않으며 오직 1회성 통신용으로만 즉시 사용됩니다.
              </span>
            </div>
          </div>

          {/* 파일 업로드 카드 */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-500" />
              <span>2단계: 원본 발주서 이미지 업로드</span>
            </h3>
            
            <div className="flex items-center gap-3">
              <label 
                htmlFor="direct-file-input"
                className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-black text-xs rounded-xl border border-indigo-100 cursor-pointer shadow-sm transition-colors shrink-0"
              >
                파일 선택
              </label>
              <input
                id="direct-file-input"
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="text-xs text-slate-600 truncate font-semibold">
                {filename ? `선택된 파일: ${filename}` : '선택된 파일 없음 (원컨덕터.jpg 선택)'}
              </div>
            </div>
          </div>
        </div>

        {/* 실행 버튼 */}
        <div className="flex justify-center">
          <button
            onClick={handleStartOcr}
            disabled={scanning || !apiKey}
            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm rounded-2xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {scanning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>구글 API 직접 통신 판독 중...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>구글 직접 통신 OCR 실행</span>
              </>
            )}
          </button>
        </div>

        {/* 오류 메시지 */}
        {errorMsg && (
          <div className="bg-rose-50 border border-rose-100 text-rose-700 p-4.5 rounded-2xl text-xs font-bold text-left animate-scale-up">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* 판독 결과 영역 */}
        {ocrResult && (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4 animate-scale-up">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>3단계: 구글 직접 통신 AI OCR 판독 원본 결과</span>
            </h3>
            <div className="bg-slate-900 text-slate-100 p-5 rounded-2xl text-xs font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto">
              {ocrResult}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
