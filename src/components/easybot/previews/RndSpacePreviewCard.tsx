'use client';

import { apiFetch } from '@/lib/api';
import React, { useState, useEffect } from 'react';
import { Camera, Check } from 'lucide-react';

export default function RndSpacePreviewCard({
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

  if (!data) return <div className="text-rose-500 font-bold p-2">공간 분석 데이터를 읽을 수 없습니다.</div>;

  const handleConfirm = async () => {
    setSaving(true);
    try {
      const res = await apiFetch('/api/rnd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'space_add',
          data: {
            check_date: new Date().toISOString().slice(0, 10),
            image_url_entrance: data.image_url_entrance || '/images/rnd/entrance.jpg',
            image_url_layout: data.image_url_layout || '/images/rnd/layout.jpg',
            ai_analysis_result: data.ai_analysis_result,
            signage_status: data.signage_status || 'PASS',
            partition_status: data.partition_status || 'FAIL',
            overall_status: data.overall_status || '보완필요',
            inspector_notes: data.inspector_notes || ''
          }
        })
      }).then(r => r.json());

      if (res.success) {
        setSaved(true);
        onConfirmSuccess('연구소 공간 자가진단 내역이 성공적으로 데이터베이스에 등재되었습니다.');
      } else {
        alert(res.error || '저장 실패');
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="my-3 border border-amber-100 rounded-2xl bg-white shadow-md overflow-hidden text-slate-800 max-w-sm animate-in zoom-in-95 duration-200">
      <div className="bg-gradient-to-r from-amber-50 to-orange-50/30 px-4 py-3 border-b border-amber-50 flex items-center gap-2">
        <Camera size={14} className="text-amber-600" />
        <span className="text-xs font-black text-slate-800">이지봇 공간 적격성 AI 판독</span>
      </div>
      <div className="p-4 space-y-2.5 text-[11px]">
        <p className="font-bold text-slate-800 text-xs">진단 결과: <span className={data.overall_status === '합격' ? 'text-green-600' : 'text-amber-600 font-extrabold'}>{data.overall_status}</span></p>
        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-slate-600 space-y-1">
          <p>• 현판 부착: {data.signage_status === 'PASS' ? '합격(확인)' : '부적격(미부착)'}</p>
          <p>• 파티션 높이: {data.partition_status === 'PASS' ? '합격(1.2m 이상)' : '주의(1.2m 미달 추정)'}</p>
          <p className="text-[10px] text-slate-500 italic border-t pt-1.5 mt-1.5 leading-relaxed">
            "{data.inspector_notes}"
          </p>
        </div>
      </div>
      <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex justify-end">
        {saved ? (
          <span className="text-green-600 text-xs font-bold flex items-center gap-1"><Check size={12} /> 진단 기록 등재 완료</span>
        ) : (
          <button 
            onClick={handleConfirm}
            disabled={saving}
            className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-colors border-none cursor-pointer"
          >
            {saving ? '기록 중...' : '자가진단 대장 등록'}
          </button>
        )}
      </div>
    </div>
  );
}
