'use client';

import { apiFetch } from '@/lib/api';
import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle2 } from 'lucide-react';

export default function PurchaseInvoicePreviewMessage({
  tagContent,
  onConfirmSuccess
}: {
  tagContent: string;
  onConfirmSuccess: (msg: string) => void;
}) {
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [partnerId, setPartnerId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [pdfFilePath, setPdfFilePath] = useState('');
  const [trackedItemsList, setTrackedItemsList] = useState<any[]>([]);
  const [partnersList, setPartnersList] = useState<any[]>([]);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const parsed = JSON.parse(tagContent);
      setInvoiceData(parsed);
      const ocrData = parsed.data || {};
      setPartnerId(parsed.partnerId || '');
      setCompanyName(ocrData.companyName || '');
      setInvoiceDate(ocrData.invoiceDate || new Date().toISOString().slice(0, 10));
      setPdfFilePath(ocrData.pdfFilePath || '');
      setTrackedItemsList(parsed.trackedItemsList || []);
      setPartnersList(parsed.partnersList || []);
      
      const parsedItems = (ocrData.items || []).map((item: any) => ({
        itemName: item.itemName || '',
        spec: item.spec || '',
        quantity: Number(item.quantity) || 0,
        unitPrice: Number(item.unitPrice) || 0,
        amount: Number(item.amount) || 0,
        matched_item_id: item.matched_item_id ? String(item.matched_item_id) : ''
      }));
      setItems(parsedItems);
    } catch (err: any) {
      console.error('매입 명세서 태그 파싱 실패:', err);
    }
  }, [tagContent]);

  if (!invoiceData) return <div className="text-rose-500 font-bold p-2 text-xs">매입 명세서 데이터를 파싱하지 못했습니다.</div>;

  const handlePartnerChange = (selectedId: string) => {
    setPartnerId(selectedId);
    const matched = partnersList.find(p => p.id === selectedId);
    if (matched) {
      setCompanyName(matched.companyName);
    }
  };

  const handleItemFieldChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      [field]: value
    };
    if (field === 'quantity' || field === 'unitPrice') {
      const qty = field === 'quantity' ? Number(value) : Number(newItems[index].quantity);
      const price = field === 'unitPrice' ? Number(value) : Number(newItems[index].unitPrice);
      newItems[index].amount = qty * price;
    }
    setItems(newItems);
  };

  const handleConfirmSubmit = async () => {
    if (items.length === 0) {
      alert('등록할 매입 품목이 존재하지 않습니다.');
      return;
    }
    setSaving(true);
    try {
      const response = await apiFetch('/api/easybot/ocr/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileType: 'PURCHASE_INVOICE',
          items: items.map(it => ({
            ...it,
            matched_item_id: it.matched_item_id ? Number(it.matched_item_id) : null
          }))
        })
      });

      const resData = await response.json();
      if (resData.success) {
        setSaved(true);
        onConfirmSuccess(resData.message);
      } else {
        alert(resData.error || '매입 원가 업데이트 처리에 실패했습니다.');
      }
    } catch (err: any) {
      alert('서버 등록 통신 오류: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="my-3 border border-pink-100 rounded-2xl bg-white shadow-md overflow-hidden text-slate-800 max-w-sm animate-in zoom-in-95 duration-200">
      <div className="bg-gradient-to-r from-pink-50/50 to-orange-50/30 px-4 py-3 border-b border-pink-50 flex items-center gap-2">
        <Sparkles size={14} className="text-pink-600 animate-pulse" />
        <span className="text-xs font-black text-slate-800">매입 명세서 OCR 원가 분석 리포트</span>
      </div>

      <div className="p-4 space-y-3 text-[11px]">
        {/* 거래처 및 날짜 */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">매입처(거래처)</label>
            <select
              value={partnerId}
              onChange={e => handlePartnerChange(e.target.value)}
              disabled={saving || saved}
              className="w-full px-2 py-1 border border-slate-200 rounded bg-slate-50 text-slate-800 focus:outline-none focus:border-pink-500 font-bold cursor-pointer"
            >
              <option value="">-- 거래처 선택 --</option>
              {partnersList.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.companyName} {p.type === 'MY_COMPANY' ? '(본사)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">매입 일자</label>
            <input
              type="date"
              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-800 focus:outline-none focus:border-pink-500"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              disabled={saved || saving}
            />
          </div>
        </div>

        {/* 품목 목록 */}
        <div className="border border-slate-100 rounded-lg overflow-hidden bg-slate-50/50">
          <div className="bg-slate-100/60 px-2 py-1 font-bold text-slate-600 border-b border-slate-100 flex justify-between">
            <span>스캔 품목 목록</span>
            <span>총 {items.length}건</span>
          </div>
          <div className="max-h-[160px] overflow-y-auto divide-y divide-slate-100">
            {items.map((item, idx) => (
              <div key={idx} className="p-2 space-y-1.5 bg-white">
                <div className="flex justify-between items-center gap-1.5">
                  <input
                    type="text"
                    className="font-bold text-slate-700 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-pink-500 focus:outline-none w-1/2 text-[11px]"
                    value={item.itemName}
                    onChange={e => handleItemFieldChange(idx, 'itemName', e.target.value)}
                    disabled={saved || saving}
                  />
                  <input
                    type="text"
                    className="text-slate-400 text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-pink-500 focus:outline-none text-[9px] w-1/3"
                    value={item.spec}
                    placeholder="규격"
                    onChange={e => handleItemFieldChange(idx, 'spec', e.target.value)}
                    disabled={saved || saving}
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-1.5">
                  <div>
                    <label className="text-[9px] text-slate-400">매입 수량</label>
                    <input
                      type="number"
                      className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-center text-slate-800 font-bold"
                      value={item.quantity || 0}
                      onChange={(e) => handleItemFieldChange(idx, 'quantity', Number(e.target.value))}
                      disabled={saved || saving}
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400">매입 단가</label>
                    <input
                      type="number"
                      className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-center text-slate-800 font-bold font-mono"
                      value={item.unitPrice || 0}
                      onChange={(e) => handleItemFieldChange(idx, 'unitPrice', Number(e.target.value))}
                      disabled={saved || saving}
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400">공급 총액</label>
                    <div className="w-full bg-slate-100 rounded px-1.5 py-0.5 text-center text-slate-500 truncate font-mono text-[9px]">
                      {(item.amount || 0).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* 자사 매핑 대상 드롭다운 */}
                <div className="pt-1.5 border-t border-slate-50">
                  <label className="block text-[9px] text-slate-400 mb-0.5">매핑할 자사 품목</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-slate-750 focus:outline-none focus:border-pink-500 cursor-pointer font-bold"
                    value={item.matched_item_id}
                    onChange={(e) => handleItemFieldChange(idx, 'matched_item_id', e.target.value)}
                    disabled={saved || saving}
                  >
                    <option value="">-- 신규 품목으로 자율 등록 --</option>
                    {trackedItemsList.map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>

        {pdfFilePath && (
          <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
            <span className="text-slate-500 font-medium">매입 명세서 PDF:</span>
            <a
              href={pdfFilePath}
              target="_blank"
              rel="noopener noreferrer"
              className="text-pink-600 font-bold hover:underline truncate max-w-[180px]"
            >
              📄 {pdfFilePath.split('/').pop()}
            </a>
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="pt-2 border-t border-slate-50 flex gap-2">
          {saved ? (
            <div className="w-full text-center py-2 px-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600 font-black flex items-center justify-center gap-1.5 animate-in fade-in duration-300">
              <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
              매입 원가 동기화 반영 완료!
            </div>
          ) : (
            <button
              onClick={handleConfirmSubmit}
              disabled={saving}
              className="w-full py-2 px-4 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold transition disabled:opacity-50 text-xs shadow-md shadow-pink-200/50 cursor-pointer flex items-center justify-center gap-1.5"
            >
              {saving ? '⚡ 원가 동기화 반영 중...' : '📥 매입 원가 동기화 승인'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
