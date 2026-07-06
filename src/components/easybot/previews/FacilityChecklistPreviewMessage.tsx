'use client';

import { apiFetch } from '@/lib/api';
import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle2 } from 'lucide-react';

export default function FacilityChecklistPreviewMessage({
  tagContent,
  onConfirmSuccess
}: {
  tagContent: string;
  onConfirmSuccess: (msg: string) => void;
}) {
  const [checklistData, setChecklistData] = useState<any>(null);
  const [equipmentId, setEquipmentId] = useState('');
  const [inspector, setInspector] = useState('');
  const [checkDate, setCheckDate] = useState('');
  const [checks, setChecks] = useState<any[]>([]);
  const [facilitiesList, setFacilitiesList] = useState<any[]>([]);
  const [pdfFilePath, setPdfFilePath] = useState('');

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const parsed = JSON.parse(tagContent);
      setChecklistData(parsed);
      const ocrData = parsed.data || {};
      setEquipmentId(parsed.matchedEquipmentId ? String(parsed.matchedEquipmentId) : '');
      setInspector(ocrData.inspector || '');
      setCheckDate(ocrData.checkDate || '');
      setChecks(ocrData.checks || []);
      setFacilitiesList(parsed.facilitiesList || []);
      setPdfFilePath(ocrData.pdfFilePath || '');
    } catch (err: any) {
      console.error('수기 점검표 태그 파싱 실패:', err);
    }
  }, [tagContent]);

  if (!checklistData) return <div className="text-rose-500 font-bold p-2 text-xs">수기 점검표 데이터를 파싱하지 못했습니다.</div>;

  const handleToggleStatus = (index: number) => {
    if (saved || saving) return;
    setChecks(prev => prev.map((c, i) => i === index ? { ...c, status: c.status === 'PASS' ? 'FAIL' : 'PASS' } : c));
  };

  const handleCommentChange = (index: number, val: string) => {
    if (saved || saving) return;
    setChecks(prev => prev.map((c, i) => i === index ? { ...c, comment: val } : c));
  };

  const handleConfirmSubmit = async () => {
    if (!equipmentId) {
      alert('대상 설비를 지정해 주세요.');
      return;
    }
    if (!inspector) {
      alert('점검자를 기입해 주세요.');
      return;
    }
    setSaving(true);
    try {
      const response = await apiFetch('/api/easybot/ocr/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileType: 'FACILITY_CHECKLIST',
          data: {
            equipmentId,
            inspector,
            checkDate,
            checks,
            pdfFilePath
          }
        })
      });

      const resData = await response.json();
      if (resData.success) {
        setSaved(true);
        onConfirmSuccess(resData.message);
      } else {
        alert(resData.error || '수기 점검 등록에 실패했습니다.');
      }
    } catch (err: any) {
      alert('서버 등록 통신 오류: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="my-3 border border-amber-200 rounded-2xl bg-white shadow-md overflow-hidden text-slate-800 max-w-sm animate-in zoom-in-95 duration-200">
      <div className="bg-gradient-to-r from-amber-50 to-orange-50/50 px-4 py-3 border-b border-amber-200 flex items-center gap-2">
        <Sparkles size={14} className="text-amber-600 animate-pulse" />
        <span className="text-xs font-black text-slate-800">수기 점검표 OCR 분석 결과</span>
      </div>

      <div className="p-4 space-y-3 text-[11px]">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">대상 설비</label>
            <select
              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-800 focus:outline-none focus:border-amber-500 font-bold cursor-pointer"
              value={equipmentId}
              onChange={(e) => setEquipmentId(e.target.value)}
              disabled={saved || saving}
            >
              <option value="">-- 설비 선택 --</option>
              {facilitiesList.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.id})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">점검자</label>
            <input
              type="text"
              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-800 focus:outline-none focus:border-amber-500 font-bold"
              value={inspector}
              onChange={(e) => setInspector(e.target.value)}
              disabled={saved || saving}
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-1">점검 일시</label>
          <input
            type="text"
            className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-800 focus:outline-none focus:border-amber-500 font-mono"
            value={checkDate}
            onChange={(e) => setCheckDate(e.target.value)}
            disabled={saved || saving}
          />
        </div>

        {/* 개별 점검 문항 리스트 */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <label className="block text-[10px] font-bold text-slate-500">점검 세부 항목 및 상태</label>
          <div className="max-h-40 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {checks.map((item, idx) => {
              const isFail = item.status === 'FAIL';
              return (
                <div key={idx} className="p-2 rounded-lg bg-slate-50 border border-slate-150 flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-700">{item.checkItem}</span>
                    <button
                      onClick={() => handleToggleStatus(idx)}
                      disabled={saved || saving}
                      className={`px-2 py-0.5 rounded text-[9px] font-black border transition cursor-pointer select-none ${
                        isFail
                          ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'
                      }`}
                    >
                      {isFail ? '❌ 조치필요' : '🟢 양호'}
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="특이사항 없음"
                    className="w-full bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10px] text-slate-650 focus:outline-none focus:border-amber-500"
                    value={item.comment || ''}
                    onChange={(e) => handleCommentChange(idx, e.target.value)}
                    disabled={saved || saving}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {pdfFilePath && (
          <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
            <span className="text-slate-500 font-medium">수기점검표 파일:</span>
            <a
              href={pdfFilePath}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-700 font-bold hover:underline truncate max-w-[180px]"
            >
              📄 {pdfFilePath.split('/').pop()}
            </a>
          </div>
        )}

        <div className="pt-2 border-t border-slate-50 flex gap-2">
          {saved ? (
            <div className="w-full text-center py-2 px-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600 font-black flex items-center justify-center gap-1.5 animate-in fade-in duration-300">
              <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
              점검 대장 적재 동기화 완료!
            </div>
          ) : (
            <button
              onClick={handleConfirmSubmit}
              disabled={saving || !equipmentId || !inspector}
              className={`w-full py-2 px-4 rounded-xl font-bold transition disabled:opacity-50 text-xs shadow-md cursor-pointer flex items-center justify-center gap-1.5 ${
                !equipmentId || !inspector
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none border-none'
                  : 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200/50 border-none'
              }`}
            >
              {saving ? '⚡ 점검표 등록 중...' : '📥 점검 이력 동기화 승인 🛠️'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
