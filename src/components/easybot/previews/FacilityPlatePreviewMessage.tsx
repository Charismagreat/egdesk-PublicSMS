'use client';

import { apiFetch } from '@/lib/api';
import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle2 } from 'lucide-react';

export default function FacilityPlatePreviewMessage({
  tagContent,
  onConfirmSuccess
}: {
  tagContent: string;
  onConfirmSuccess: (msg: string) => void;
}) {
  const [plateData, setPlateData] = useState<any>(null);
  const [manufacturer, setManufacturer] = useState('');
  const [modelName, setModelName] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [manufactureYear, setManufactureYear] = useState<number | ''>('');
  const [specifications, setSpecifications] = useState('');
  const [pdfFilePath, setPdfFilePath] = useState('');

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const parsed = JSON.parse(tagContent);
      setPlateData(parsed);
      const ocrData = parsed.data || {};
      setManufacturer(ocrData.manufacturer || '');
      setModelName(ocrData.modelName || '');
      setSerialNumber(ocrData.serialNumber || '');
      setManufactureYear(ocrData.manufactureYear ? Number(ocrData.manufactureYear) : '');
      setSpecifications(ocrData.specifications || '');
      setPdfFilePath(ocrData.pdfFilePath || '');
    } catch (err: any) {
      console.error('설비 명판 태그 파싱 실패:', err);
    }
  }, [tagContent]);

  if (!plateData) return <div className="text-rose-500 font-bold p-2 text-xs">설비 명판 데이터를 파싱하지 못했습니다.</div>;

  const handleConfirmSubmit = async () => {
    if (!modelName) {
      alert('설비 모델명을 입력해 주세요.');
      return;
    }
    setSaving(true);
    try {
      const response = await apiFetch('/api/easybot/ocr/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileType: 'FACILITY_PLATE',
          data: {
            manufacturer,
            modelName,
            serialNumber,
            manufactureYear: manufactureYear ? Number(manufactureYear) : null,
            specifications
          }
        })
      });

      const resData = await response.json();
      if (resData.success) {
        setSaved(true);
        onConfirmSuccess(resData.message);
      } else {
        alert(resData.error || '설비 마운트 등록에 실패했습니다.');
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
        <span className="text-xs font-black text-slate-800">설비 제조 명판 OCR 분석 결과</span>
      </div>

      <div className="p-4 space-y-3 text-[11px]">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">제조사 (Manufacturer)</label>
            <input
              type="text"
              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-800 focus:outline-none focus:border-amber-500 font-bold"
              value={manufacturer}
              onChange={(e) => setManufacturer(e.target.value)}
              disabled={saved || saving}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">모델명 (Model Name)</label>
            <input
              type="text"
              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-800 focus:outline-none focus:border-amber-500 font-bold"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              disabled={saved || saving}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">일련번호 (Serial No.)</label>
            <input
              type="text"
              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-800 focus:outline-none focus:border-amber-500 font-mono font-bold"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              disabled={saved || saving}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">제조년도 (Year)</label>
            <input
              type="number"
              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-800 focus:outline-none focus:border-amber-500 font-bold"
              value={manufactureYear}
              onChange={(e) => setManufactureYear(e.target.value !== '' ? Number(e.target.value) : '')}
              disabled={saved || saving}
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-1">제조 사양 (Specifications)</label>
          <textarea
            className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-slate-800 focus:outline-none focus:border-amber-500 h-16 resize-none"
            value={specifications}
            onChange={(e) => setSpecifications(e.target.value)}
            disabled={saved || saving}
          />
        </div>

        {pdfFilePath && (
          <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
            <span className="text-slate-500 font-medium">명판 이미지:</span>
            <a
              href={pdfFilePath}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-700 font-bold hover:underline truncate max-w-[180px]"
            >
              📷 {pdfFilePath.split('/').pop()}
            </a>
          </div>
        )}

        <div className="pt-2 border-t border-slate-50 flex gap-2">
          {saved ? (
            <div className="w-full text-center py-2 px-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600 font-black flex items-center justify-center gap-1.5 animate-in fade-in duration-300">
              <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
              설비 대장 마운트 등록 완료!
            </div>
          ) : (
            <button
              onClick={handleConfirmSubmit}
              disabled={saving || !modelName}
              className={`w-full py-2 px-4 rounded-xl font-bold transition disabled:opacity-50 text-xs shadow-md cursor-pointer flex items-center justify-center gap-1.5 ${
                !modelName
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none border-none'
                  : 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200/50 border-none'
              }`}
            >
              {saving ? '⚡ 마운트 등록 중...' : '📥 설비 마운트 승인 ⚡'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
