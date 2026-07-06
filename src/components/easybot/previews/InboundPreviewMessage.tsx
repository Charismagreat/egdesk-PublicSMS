'use client';

import { apiFetch } from '@/lib/api';
import React, { useState, useEffect } from 'react';

export default function InboundPreviewMessage({
  tagContent,
  onConfirmSuccess
}: {
  tagContent: string;
  onConfirmSuccess: (msg: string) => void;
}) {
  const [inboundData, setInboundData] = useState<any>(null);
  const [partnerName, setPartnerName] = useState('');
  const [inboundDate, setInboundDate] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [pdfFilePath, setPdfFilePath] = useState('');
  const [inventoryList, setInventoryList] = useState<any[]>([]);
  
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // 컴포넌트 마운트 시 기존 재고 리스트 로드
  useEffect(() => {
    async function fetchInventory() {
      try {
        const response = await apiFetch('/api/inventory');
        const resJson = await response.json();
        if (resJson.success && resJson.data) {
          setInventoryList(resJson.data);
        }
      } catch (err) {
        console.error('기존 재고 목록 로드 에러:', err);
      }
    }
    fetchInventory();
  }, []);

  // 태그 컨텐츠 파싱 및 초기화
  useEffect(() => {
    try {
      const parsed = JSON.parse(tagContent);
      setInboundData(parsed);
      const ocrData = parsed.data || {};
      setPartnerName(ocrData.partnerName || '');
      setInboundDate(ocrData.inboundDate || new Date().toISOString().slice(0, 10));
      setPdfFilePath(parsed.pdfFilePath || '');
      
      const parsedItems = (ocrData.items || []).map((item: any) => {
        let matchedId = 'NEW';
        if (item.barcode) {
          const matchedByBarcode = inventoryList.find(i => i.barcode === item.barcode);
          if (matchedByBarcode) {
            matchedId = String(matchedByBarcode.id);
          }
        }
        if (matchedId === 'NEW' && item.itemName) {
          const matchedByName = inventoryList.find(i => i.name === item.itemName);
          if (matchedByName) {
            matchedId = String(matchedByName.id);
          }
        }
        return {
          ...item,
          matchedItemId: matchedId
        };
      });
      setItems(parsedItems);
    } catch (err: any) {
      console.error('거래명세서 태그 파싱 실패:', err);
    }
  }, [tagContent, inventoryList]);

  // 실시간으로 인벤토리 리스트가 불러와졌을 때, 기존 아이템에 매칭 업데이트
  useEffect(() => {
    if (inventoryList.length > 0 && items.length > 0 && items.every(item => item.matchedItemId === 'NEW')) {
      const updated = items.map((item: any) => {
        let matchedId = 'NEW';
        if (item.barcode) {
          const matchedByBarcode = inventoryList.find(i => i.barcode === item.barcode);
          if (matchedByBarcode) {
            matchedId = String(matchedByBarcode.id);
          }
        }
        if (matchedId === 'NEW' && item.itemName) {
          const matchedByName = inventoryList.find(i => i.name === item.itemName);
          if (matchedByName) {
            matchedId = String(matchedByName.id);
          }
        }
        return { ...item, matchedItemId: matchedId };
      });
      setItems(updated);
    }
  }, [inventoryList]);

  if (!inboundData) return <div className="text-rose-500 font-bold p-2 text-xs">거래명세서 데이터를 파싱하지 못했습니다.</div>;

  const handleItemFieldChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      [field]: value
    };
    setItems(newItems);
  };

  const handleConfirmSubmit = async () => {
    if (items.length === 0) {
      alert('입고할 품목이 존재하지 않습니다.');
      return;
    }
    setSaving(true);
    try {
      const response = await apiFetch('/api/easybot/ocr/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileType: 'INVENTORY_INBOUND',
          partnerName,
          inboundDate,
          items,
          pdfFilePath
        })
      });

      const resData = await response.json();
      if (resData.success) {
        setSaved(true);
        onConfirmSuccess(resData.message);
      } else {
        alert(resData.error || '자율 입고 처리에 실패했습니다.');
      }
    } catch (err: any) {
      alert('서버 등록 통신 오류: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="my-3 border border-blue-100 rounded-2xl bg-white shadow-md overflow-hidden text-slate-800 max-w-sm animate-in zoom-in-95 duration-200">
      <div className="bg-gradient-to-r from-blue-50/50 to-cyan-50/30 px-4 py-3 border-b border-blue-50 flex items-center gap-2">
        <span className="p-1 rounded bg-blue-100 text-blue-600">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </span>
        <span className="text-xs font-black text-slate-800">지능형 자율 입고 OCR 파이프라인</span>
      </div>

      <div className="p-4 space-y-3 text-[11px]">
        {/* 공급처 및 날짜 설정 */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">공급처(거래처)</label>
            <input
              type="text"
              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-800 focus:outline-none focus:border-blue-500"
              value={partnerName}
              onChange={(e) => setPartnerName(e.target.value)}
              disabled={saved || saving}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">입고 일자</label>
            <input
              type="date"
              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-800 focus:outline-none focus:border-blue-500"
              value={inboundDate}
              onChange={(e) => setInboundDate(e.target.value)}
              disabled={saved || saving}
            />
          </div>
        </div>

        {/* 품목 리스트 테이블 */}
        <div className="border border-slate-100 rounded-lg overflow-hidden bg-slate-50/50">
          <div className="bg-slate-100/60 px-2 py-1 font-bold text-slate-600 border-b border-slate-100 flex justify-between">
            <span>스캔 품목 목록</span>
            <span>총 {items.length}건</span>
          </div>
          <div className="max-h-[160px] overflow-y-auto divide-y divide-slate-100">
            {items.map((item, idx) => (
              <div key={idx} className="p-2 space-y-1.5 bg-white">
                <div className="flex justify-between items-center gap-1.5">
                  <span className="font-bold text-slate-700 truncate w-1/2">{item.itemName}</span>
                  <span className="text-slate-400 truncate text-[9px]">{item.spec || '규격 없음'}</span>
                </div>
                
                <div className="grid grid-cols-3 gap-1.5">
                  <div>
                    <label className="text-[9px] text-slate-440">수량</label>
                    <input
                      type="number"
                      className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-center text-slate-800"
                      value={item.quantity || 0}
                      onChange={(e) => handleItemFieldChange(idx, 'quantity', Number(e.target.value))}
                      disabled={saved || saving}
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-440">단가</label>
                    <input
                      type="number"
                      className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-center text-slate-800"
                      value={item.price || 0}
                      onChange={(e) => handleItemFieldChange(idx, 'price', Number(e.target.value))}
                      disabled={saved || saving}
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-440">바코드</label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-center text-slate-800 truncate"
                      value={item.barcode || ''}
                      onChange={(e) => handleItemFieldChange(idx, 'barcode', e.target.value)}
                      disabled={saved || saving}
                    />
                  </div>
                </div>

                {/* 매칭 대상 드롭다운 */}
                <div className="pt-1.5 border-t border-slate-50">
                  <label className="block text-[9px] text-slate-440 mb-0.5">매칭할 재고 품목</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-slate-700 focus:outline-none focus:border-blue-500"
                    value={item.matchedItemId}
                    onChange={(e) => handleItemFieldChange(idx, 'matchedItemId', e.target.value)}
                    disabled={saved || saving}
                  >
                    <option value="NEW">➕ 신규 품목으로 자동 등록</option>
                    {inventoryList.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.name} ({inv.spec || '스펙없음'}) [재고: {inv.stock}개]
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
            <span className="text-slate-500 font-medium">첨부 증빙 파일:</span>
            <a
              href={pdfFilePath}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 font-bold hover:underline truncate max-w-[180px]"
            >
              📄 {pdfFilePath.split('/').pop()}
            </a>
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="pt-2 border-t border-slate-50 flex gap-2">
          {saved ? (
            <div className="w-full text-center py-2 px-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600 font-black flex items-center justify-center gap-1.5 animate-in fade-in duration-300">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
              자율 재고 입고 확정 완료!
            </div>
          ) : (
            <button
              onClick={handleConfirmSubmit}
              disabled={saving}
              className="w-full py-2 px-4 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition disabled:opacity-50 text-xs shadow-md shadow-blue-200/50 cursor-pointer"
            >
              {saving ? '⚡ 재고 적재 중...' : '📥 원터치 자율 재고 입고 확정'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
