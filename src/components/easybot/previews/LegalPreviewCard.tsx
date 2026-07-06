'use client';

import { apiFetch } from '@/lib/api';
import React, { useState, useEffect } from 'react';
import { Scale, CheckCircle2, ArrowRight } from 'lucide-react';

export default function LegalPreviewCard({
  tagContent,
  onConfirmSuccess
}: {
  tagContent: string;
  onConfirmSuccess: (msg: string) => void;
}) {
  const [legalData, setLegalData] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const parsed = JSON.parse(tagContent);
      const ocrData = parsed.data || parsed || {};
      setLegalData(ocrData);
    } catch (err: any) {
      console.error('소송 문서 데이터 파싱 실패:', err);
    }
  }, [tagContent]);

  if (!legalData) {
    return <div className="text-rose-500 font-bold p-2 text-xs">소송 문서 데이터를 파싱하지 못했습니다.</div>;
  }

  const handleConfirmSubmit = async () => {
    setSaving(true);
    try {
      const response = await apiFetch('/api/easybot/ocr/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileType: 'LEGAL_DOCUMENT',
          data: {
            documentType: legalData.documentType,
            caseNumber: legalData.caseNumber,
            summary: legalData.summary,
            deadline: legalData.deadline,
            actions: legalData.actions,
            pdfFilePath: legalData.pdfFilePath
          }
        })
      });

      const resData = await response.json();
      if (resData.success) {
        setSaved(true);
        onConfirmSuccess(resData.message);
      } else {
        alert(resData.error || '일정 및 조치 등록에 실패했습니다.');
      }
    } catch (err: any) {
      alert('일정 등록 오류: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="my-3 border border-amber-200 rounded-2xl bg-white shadow-md overflow-hidden text-slate-800 max-w-sm animate-in zoom-in-95 duration-200 text-left">
      <div className="bg-gradient-to-r from-amber-50 to-orange-50/50 px-4 py-3 border-b border-amber-200 flex items-center gap-2">
        <Scale size={14} className="text-amber-600 animate-pulse" />
        <span className="text-xs font-black text-slate-800">법률 상담 AI 법률 리스크 분석 결과</span>
      </div>

      <div className="p-4 space-y-3.5 text-[11px]">
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-450 font-bold text-[9px]">문서 구분</span>
            <span className="text-slate-800 font-extrabold text-[10px]">{legalData.documentType || '미식별'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-450 font-bold text-[9px]">사건 번호</span>
            <span className="text-slate-800 font-mono font-black text-[10px]">{legalData.caseNumber || '사건번호 미상'}</span>
          </div>
          {legalData.deadline && (
            <div className="flex justify-between items-center pt-1 border-t border-slate-200/50">
              <span className="text-rose-500 font-black text-[9px] flex items-center gap-0.5">⚠️ 법적 기한</span>
              <span className="text-rose-600 font-black text-[10.5px] bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 font-mono">{legalData.deadline}</span>
            </div>
          )}
        </div>

        <div className="space-y-1">
          <span className="block text-[10px] font-black text-slate-450">🔍 분쟁 사건 요약</span>
          <p className="text-[10.5px] text-slate-700 leading-relaxed font-semibold bg-slate-50/40 p-2.5 rounded-xl border border-slate-100/70">
            {legalData.summary || '사건에 대한 상세 내용이 문서상 식별되지 않았습니다.'}
          </p>
        </div>

        {legalData.actions && legalData.actions.length > 0 && (
          <div className="space-y-1">
            <span className="block text-[10px] font-black text-slate-450">💡 권장 즉시 조치</span>
            <ul className="space-y-1.5 pl-1.5">
              {legalData.actions.map((act: string, idx: number) => (
                <li key={idx} className="text-[10px] text-slate-650 leading-relaxed flex items-start gap-1 font-semibold">
                  <span className="text-amber-500 font-black shrink-0">•</span>
                  <span>{act}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-2 pt-2 border-t border-slate-100">
          {saved ? (
            <div className="py-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-center text-[10.5px] text-emerald-700 font-black flex items-center justify-center gap-1.5">
              <CheckCircle2 size={13} /> 회사 일정 및 대응 지시 연동 완료
            </div>
          ) : (
            <button
              onClick={handleConfirmSubmit}
              disabled={saving}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-98 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer border-none"
            >
              {saving ? '⚡ 캘린더 등록 중...' : '📥 캘린더 기한 등록 및 작업 지시'}
            </button>
          )}

          <a
            href="/lawyer-ai"
            className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/70 text-slate-650 font-black rounded-xl text-xs transition-all flex items-center justify-center gap-1"
          >
            법률 상담 AI 본 화면에서 정밀 진단받기 <ArrowRight size={11} className="text-slate-400" />
          </a>
        </div>
      </div>
    </div>
  );
}
