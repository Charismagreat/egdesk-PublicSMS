'use client';

import { apiFetch } from '@/lib/api';
import React, { useState, useEffect } from 'react';
import { Sparkles, User, Calendar, CheckCircle2, RefreshCw, Send } from 'lucide-react';

export default function MedicalPreviewCard({
  tagContent,
  onConfirmSuccess
}: {
  tagContent: string;
  onConfirmSuccess: (msg: string) => void;
}) {
  const [medical, setMedical] = useState<any>(null);
  const [patientName, setPatientName] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [daysSpent, setDaysSpent] = useState(0);
  const [operatorId, setOperatorId] = useState('');
  const [operatorsList, setOperatorsList] = useState<any[]>([]);
  
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const parsed = JSON.parse(tagContent);
      setMedical(parsed);
      setPatientName(parsed.patientName || '');
      setDiagnosis(parsed.diagnosis || '');
      setStartDate(parsed.startDate || '');
      setEndDate(parsed.endDate || '');
      setDaysSpent(Number(parsed.daysSpent) || 0);
      setOperatorsList(parsed.operatorsList || []);
      
      if (parsed.matchedOperatorId) {
        setOperatorId(String(parsed.matchedOperatorId));
      }
    } catch (err) {
      console.error('진단서 태그 파싱 실패:', err);
    }
  }, [tagContent]);

  // 시작일 및 종료일 변경 시 사용 일수(daysSpent) 자동 계산 기능
  useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // 당일 포함
      if (!isNaN(diffDays) && diffDays > 0) {
        setDaysSpent(diffDays);
      }
    }
  }, [startDate, endDate]);

  if (!medical) return <div className="text-rose-500 font-bold p-2 text-xs">진단서 데이터를 파싱하지 못했습니다.</div>;

  const handleConfirmSubmit = async () => {
    if (!operatorId) {
      alert('병가를 신청할 직원을 목록에서 선택해 주세요.');
      return;
    }
    if (!startDate || !endDate) {
      alert('병가 기간을 올바르게 선택해 주세요.');
      return;
    }
    setSaving(true);
    try {
      const response = await apiFetch('/api/easybot/ocr/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileType: 'MEDICAL_CERTIFICATE',
          operatorId,
          data: {
            diagnosis,
            startDate,
            endDate,
            daysSpent,
            medical_certificate_path: medical.medical_certificate_path || ''
          }
        })
      });

      const data = await response.json();
      if (data.success) {
        setSaved(true);
        onConfirmSuccess(data.message);
      } else {
        alert(data.error || '병가 신청 상신 처리에 실패했습니다.');
      }
    } catch (err: any) {
      alert('서버 등록 통신 오류: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="my-3 border border-violet-100 rounded-2xl bg-white shadow-md overflow-hidden text-slate-800 max-w-sm animate-in zoom-in-95 duration-200">
      {/* 카드 헤더 */}
      <div className="bg-gradient-to-r from-violet-50/50 to-fuchsia-50/30 px-4 py-3 border-b border-violet-50 flex items-center gap-2">
        <Sparkles size={14} className="text-violet-600 animate-pulse" />
        <span className="text-xs font-black text-slate-800">이지봇 AI 진단서 분석 리포트</span>
      </div>

      {/* 정보 입력 및 보정 양식 */}
      <div className="p-4 space-y-3 text-[11px]">
        {/* 환자명 (OCR 상의 이름) */}
        <div className="space-y-1">
          <label className="text-[10px] text-slate-450 font-extrabold flex items-center gap-1"><User size={10} />환자 성명 (진단서 기재)</label>
          <input 
            type="text" 
            value={patientName} 
            readOnly
            className="w-full px-2 py-1.5 border border-slate-200 rounded-lg bg-slate-100 font-bold"
          />
        </div>

        {/* 🏢 직원 수동 매칭 드롭다운 */}
        <div className="space-y-1">
          <label className="text-[10px] text-slate-450 font-extrabold flex items-center gap-1">🏢 병가 상신 대상 직원 매칭</label>
          <div className="flex gap-1.5 items-center">
            <select
              value={operatorId}
              onChange={e => setOperatorId(e.target.value)}
              disabled={saving || saved}
              className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 bg-slate-50/20 font-bold text-xs cursor-pointer"
            >
              <option value="">-- 직원을 선택해 주세요 --</option>
              {operatorsList.map((op: any) => (
                <option key={op.id} value={op.id}>{op.name} (ID: {op.id})</option>
              ))}
            </select>
            {operatorId ? (
              <span className="shrink-0 bg-violet-50 border border-violet-100 text-violet-600 px-2 py-0.5 rounded-full text-[9px] font-black">매칭완료</span>
            ) : (
              <span className="shrink-0 bg-amber-50 border border-amber-100 text-amber-600 px-2 py-0.5 rounded-full text-[9px] font-black">미매칭</span>
            )}
          </div>
        </div>

        {/* 진단명 */}
        <div className="space-y-1">
          <label className="text-[10px] text-slate-450 font-extrabold">🩺 진단명 / 병명</label>
          <input 
            type="text" 
            value={diagnosis} 
            onChange={e => setDiagnosis(e.target.value)}
            disabled={saving || saved}
            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 bg-slate-50/20 font-bold text-xs"
          />
        </div>

        {/* 병가 기간 */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <label className="text-[10px] text-slate-450 font-extrabold flex items-center gap-1"><Calendar size={10} />병가 시작일</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)}
              disabled={saving || saved}
              className="w-full px-1.5 py-1 border border-slate-200 rounded-lg focus:outline-none bg-slate-50/20 font-bold text-[10px] cursor-pointer"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-slate-450 font-extrabold flex items-center gap-1"><Calendar size={10} />병가 종료일</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)}
              disabled={saving || saved}
              className="w-full px-1.5 py-1 border border-slate-200 rounded-lg focus:outline-none bg-slate-50/20 font-bold text-[10px] cursor-pointer"
            />
          </div>
        </div>

        {/* 사용 일수 */}
        <div className="space-y-1">
          <label className="text-[10px] text-slate-450 font-extrabold">📊 총 신청 일수 (일)</label>
          <input 
            type="number" 
            value={daysSpent} 
            onChange={e => setDaysSpent(Number(e.target.value))}
            disabled={saving || saved}
            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 bg-slate-50/20 font-bold font-mono text-xs"
          />
        </div>

        {/* 실물 파일 연결 표시 */}
        {medical.medical_certificate_path && (
          <div className="mt-2 text-[9px] text-slate-400 flex items-center gap-1">
            <span>📄 진단서 실물 증빙 파일:</span>
            <a href={medical.medical_certificate_path} target="_blank" rel="noreferrer" className="text-violet-600 underline font-bold hover:text-violet-850">
              [실물 파일 열기]
            </a>
          </div>
        )}
      </div>

      {/* 최종 확정 액션 버튼 */}
      <div className="px-4 py-3 bg-slate-50 border-t border-violet-50 flex items-center justify-end">
        {saved ? (
          <div className="text-emerald-600 font-extrabold text-xs flex items-center gap-1.5 py-1.5 w-full justify-center">
            <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
            병가 자동 결재 상신 완료!
          </div>
        ) : (
          <button
            onClick={handleConfirmSubmit}
            disabled={saving}
            className="w-full py-2.5 text-xs font-bold text-white rounded-xl shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer border-none"
            style={{ backgroundColor: '#7c3aed' }}
          >
            {saving ? (
              <>
                <RefreshCw size={12} className="animate-spin" />
                결재 상신 중...
              </>
            ) : (
              <>
                <Send size={12} />
                병가 신청서 결재 자동 상신 📄
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
