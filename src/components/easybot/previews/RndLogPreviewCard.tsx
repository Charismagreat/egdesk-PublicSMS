'use client';

import { apiFetch } from '@/lib/api';
import React, { useState, useEffect } from 'react';
import { Sparkles, Check } from 'lucide-react';

export default function RndLogPreviewCard({
  tagContent,
  onConfirmSuccess
}: {
  tagContent: string;
  onConfirmSuccess: (msg: string) => void;
}) {
  const [data, setData] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      setData(JSON.parse(tagContent));
    } catch (e) {
      console.error(e);
    }
  }, [tagContent]);

  if (!data) return <div className="text-rose-500 font-bold p-2">일지 초안 데이터를 읽을 수 없습니다.</div>;

  const handleConfirm = async () => {
    setSaving(true);
    try {
      const res = await apiFetch('/api/rnd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'log_add',
          data: {
            author_id: data.author_id || 3, // 박영희
            work_date: data.work_date || new Date().toISOString().slice(0, 10),
            raw_source: data.raw_source || 'VOICE',
            raw_content: data.raw_content || '',
            ai_generated_title: data.ai_generated_title,
            ai_generated_content: data.ai_generated_content,
            approval_status: 'PENDING'
          }
        })
      }).then(r => r.json());

      if (res.success) {
        setSaved(true);
        onConfirmSuccess('연구일지가 성공적으로 작성되어 소장 결재 승인 대기열에 상신되었습니다.');
      } else {
        alert(res.error || '상신 실패');
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="my-3 border border-indigo-100 rounded-2xl bg-white shadow-md overflow-hidden text-slate-800 max-w-sm animate-in zoom-in-95 duration-200">
      <div className="bg-gradient-to-r from-indigo-50 to-violet-50/30 px-4 py-3 border-b border-indigo-50 flex items-center gap-2">
        <Sparkles size={14} className="text-indigo-600" />
        <span className="text-xs font-black text-slate-800">이지봇 AI 연구일지 상신</span>
      </div>
      <div className="p-4 space-y-2 text-[11px]">
        <p className="font-bold text-slate-800 text-xs">과제: {data.ai_generated_title}</p>
        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-[10px] text-slate-500 whitespace-pre-line leading-relaxed max-h-36 overflow-y-auto font-medium">
          {data.ai_generated_content}
        </div>
      </div>
      <div className="px-4 py-2.5 bg-slate-50 border-t border-indigo-50 flex justify-end">
        {saved ? (
          <span className="text-green-600 text-xs font-bold flex items-center gap-1"><Check size={12} /> 결재 상신 완료</span>
        ) : (
          <button 
            onClick={handleConfirm}
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-colors border-none cursor-pointer"
          >
            {saving ? '상신 중...' : '소장 결재 요청'}
          </button>
        )}
      </div>
    </div>
  );
}
