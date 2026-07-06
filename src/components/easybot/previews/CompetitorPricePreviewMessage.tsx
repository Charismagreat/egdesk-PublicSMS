'use client';

import { apiFetch } from '@/lib/api';
import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle2 } from 'lucide-react';

export default function CompetitorPricePreviewMessage({
  tagContent,
  onConfirmSuccess
}: {
  tagContent: string;
  onConfirmSuccess: (msg: string) => void;
}) {
  const [competitorData, setCompetitorData] = useState<any>(null);
  const [matchedItemId, setMatchedItemId] = useState('');
  const [competitorName, setCompetitorName] = useState('');
  const [itemName, setItemName] = useState('');
  const [capturedPrice, setCapturedPrice] = useState(0);
  const [captureUrl, setCaptureUrl] = useState('');
  const [trackedItemsList, setTrackedItemsList] = useState<any[]>([]);
  const [pdfFilePath, setPdfFilePath] = useState('');

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const parsed = JSON.parse(tagContent);
      setCompetitorData(parsed);
      const ocrData = parsed.data || {};
      setMatchedItemId(parsed.matchedItemId ? String(parsed.matchedItemId) : '');
      setCompetitorName(ocrData.competitorName || '');
      setItemName(ocrData.itemName || '');
      setCapturedPrice(Number(ocrData.capturedPrice) || 0);
      setCaptureUrl(ocrData.captureUrl || '');
      setTrackedItemsList(parsed.trackedItemsList || []);
      setPdfFilePath(ocrData.pdfFilePath || '');
    } catch (err: any) {
      console.error('경쟁사 가격 캡처 태그 파싱 실패:', err);
    }
  }, [tagContent]);

  if (!competitorData) return <div className="text-rose-500 font-bold p-2 text-xs">경쟁사 가격 캡처 데이터를 파싱하지 못했습니다.</div>;

  const handleConfirmSubmit = async () => {
    if (!matchedItemId) {
      alert('매핑할 자사 가격 추적 품목을 선택해 주세요.');
      return;
    }
    setSaving(true);
    try {
      const response = await apiFetch('/api/easybot/ocr/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileType: 'COMPETITOR_PRICE_CAPTURE',
          matchedItemId: Number(matchedItemId),
          data: {
            competitorName,
            itemName,
            capturedPrice: Number(capturedPrice),
            captureUrl
          }
        })
      });

      const resData = await response.json();
      if (resData.success) {
        setSaved(true);
        const combinedMsg = resData.marginReport 
          ? `${resData.message}\n\n📊 [실시간 마진 리포트]\n${resData.marginReport}`
          : resData.message;
        onConfirmSuccess(combinedMsg);
      } else {
        alert(resData.error || '경쟁 가격 매핑 등록에 실패했습니다.');
      }
    } catch (err: any) {
      alert('서버 등록 통신 오류: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="my-3 border border-pink-200 rounded-2xl bg-white shadow-md overflow-hidden text-slate-800 max-w-sm animate-in zoom-in-95 duration-200">
      <div className="bg-gradient-to-r from-pink-100 to-rose-50 px-4 py-3 border-b border-pink-200 flex items-center gap-2">
        <Sparkles size={14} className="text-rose-600 animate-pulse" />
        <span className="text-xs font-black text-slate-800">경쟁사 가격 캡처 분석 리포트</span>
      </div>

      <div className="p-4 space-y-3 text-[11px]">
        {/* 경쟁사명 및 품목명 */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">경쟁사 / 플랫폼</label>
            <input
              type="text"
              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-800 focus:outline-none focus:border-rose-500 font-bold"
              value={competitorName}
              onChange={(e) => setCompetitorName(e.target.value)}
              disabled={saved || saving}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">경쟁 품목명</label>
            <input
              type="text"
              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-800 focus:outline-none focus:border-rose-500 font-bold"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              disabled={saved || saving}
            />
          </div>
        </div>

        {/* 캡처 가격 및 출처 URL */}
        <div className="space-y-2">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">수집된 판매 가격 (원)</label>
            <input
              type="number"
              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-800 focus:outline-none focus:border-rose-500 font-mono font-bold"
              value={capturedPrice}
              onChange={(e) => setCapturedPrice(Number(e.target.value))}
              disabled={saved || saving}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">원본 URL (출처)</label>
            <input
              type="text"
              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-800 focus:outline-none focus:border-rose-500 text-[10px] truncate"
              value={captureUrl}
              onChange={(e) => setCaptureUrl(e.target.value)}
              disabled={saved || saving}
            />
          </div>
        </div>

        {/* 자사 매핑 대상 드롭다운 */}
        <div className="pt-2 border-t border-slate-100">
          <label className="block text-[10px] font-bold text-slate-500 mb-1">매핑할 자사 가격 추적 품목</label>
          <select
            className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-800 focus:outline-none focus:border-rose-500 font-bold cursor-pointer"
            value={matchedItemId}
            onChange={(e) => setMatchedItemId(e.target.value)}
            disabled={saved || saving}
          >
            <option value="">-- 가격 추적 품목 선택 --</option>
            {trackedItemsList.map((it) => (
              <option key={it.id} value={it.id}>
                {it.name}
              </option>
            ))}
          </select>
        </div>

        {pdfFilePath && (
          <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
            <span className="text-slate-500 font-medium">원본 캡처 파일:</span>
            <a
              href={pdfFilePath}
              target="_blank"
              rel="noopener noreferrer"
              className="text-rose-600 font-bold hover:underline truncate max-w-[180px]"
            >
              📷 {pdfFilePath.split('/').pop()}
            </a>
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="pt-2 border-t border-slate-50 flex gap-2">
          {saved ? (
            <div className="w-full text-center py-2 px-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600 font-black flex items-center justify-center gap-1.5 animate-in fade-in duration-300">
              <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
              경쟁 가격 매핑 등록 완료!
            </div>
          ) : (
            <button
              onClick={handleConfirmSubmit}
              disabled={saving || !matchedItemId}
              className={`w-full py-2 px-4 rounded-xl font-bold transition disabled:opacity-50 text-xs shadow-md cursor-pointer flex items-center justify-center gap-1.5 ${
                !matchedItemId 
                  ? 'bg-slate-200 text-slate-400 border-none cursor-not-allowed shadow-none'
                  : 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-200/50 border-none'
              }`}
            >
              {saving ? '⚡ 경쟁 가격 매핑 중...' : '📥 경쟁 가격 매핑 승인'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
