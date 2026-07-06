'use client';

import { apiFetch } from '@/lib/api';
import React, { useState, useEffect } from 'react';
import { Play, Check, Loader2, FileSpreadsheet, Sparkles } from 'lucide-react';

export default function InboundExcelPreviewCard({
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
  const [fileName, setFileName] = useState('');
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
      setPartnerName(parsed.partner_name || '');
      setInboundDate(parsed.inbound_date || new Date().toISOString().slice(0, 10));
      setFileName(parsed.file_url || '');
      
      const parsedItems = (parsed.items || []).map((item: any) => {
        let matchedId = 'NEW';
        const itemName = String(item.item_name || "").trim();
        const itemCode = String(item.item_code || "").trim();
        const barcode = String(item.barcode || "").trim();

        // 1. 바코드 대조
        if (barcode) {
          const matchedByBarcode = inventoryList.find(i => String(i.barcode || "").trim() === barcode);
          if (matchedByBarcode) matchedId = String(matchedByBarcode.id);
        }

        // 2. 품목코드 대조
        if (matchedId === 'NEW' && itemCode) {
          const matchedByCode = inventoryList.find(i => String(i.barcode || "").trim() === itemCode);
          if (matchedByCode) matchedId = String(matchedByCode.id);
        }

        // 3. 품목명 대조
        if (matchedId === 'NEW' && itemName) {
          const matchedByName = inventoryList.find(i => String(i.name || "").trim() === itemName);
          if (matchedByName) matchedId = String(matchedByName.id);
        }

        return {
          ...item,
          itemName: itemName,
          matchedItemId: matchedId
        };
      });
      setItems(parsedItems);
    } catch (err: any) {
      console.error('엑셀 자율입고 태그 파싱 실패:', err);
    }
  }, [tagContent, inventoryList]);

  // 실시간으로 인벤토리 리스트가 불러와졌을 때, 기존 아이템에 매칭 업데이트
  useEffect(() => {
    if (inventoryList.length > 0 && items.length > 0 && items.every(item => item.matchedItemId === 'NEW')) {
      const updated = items.map((item: any) => {
        let matchedId = 'NEW';
        const itemName = String(item.itemName || "").trim();
        const itemCode = String(item.item_code || "").trim();
        const barcode = String(item.barcode || "").trim();

        if (barcode) {
          const matchedByBarcode = inventoryList.find(i => String(i.barcode || "").trim() === barcode);
          if (matchedByBarcode) matchedId = String(matchedByBarcode.id);
        }

        if (matchedId === 'NEW' && itemCode) {
          const matchedByCode = inventoryList.find(i => String(i.barcode || "").trim() === itemCode);
          if (matchedByCode) matchedId = String(matchedByCode.id);
        }

        if (matchedId === 'NEW' && itemName) {
          const matchedByName = inventoryList.find(i => String(i.name || "").trim() === itemName);
          if (matchedByName) matchedId = String(matchedByName.id);
        }
        return { ...item, matchedItemId: matchedId };
      });
      setItems(updated);
    }
  }, [inventoryList]);

  if (!inboundData) return <div className="text-rose-500 font-bold p-2 text-xs">엑셀 입고 데이터를 파싱하지 못했습니다.</div>;

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
      // 엑셀 가공 API 형식에 맞춰 페이로드 정규화
      const formattedItems = items.map(it => ({
        item_name: it.itemName,
        item_code: it.item_code || "",
        barcode: it.barcode || "",
        spec: it.spec || "",
        quantity: Number(it.quantity) || 0,
        unit_price: Number(it.unit_price) || Number(it.price) || 0,
        unit_type: it.unit_type || "개",
        box_contains: Number(it.box_contains) || 1,
        item_type: it.item_type || "자재",
        category: it.category || "기타",
        location: it.location || "자율입고창고",
        note: it.note || ""
      }));

      const response = await apiFetch('/api/inventory/inbounds/excel-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partner_name: partnerName,
          inbound_date: inboundDate,
          items: formattedItems,
          file_url: fileName || "excel_easybot_inbound.xlsx"
        })
      });

      const resData = await response.json();
      if (resData.success) {
        setSaved(true);
        onConfirmSuccess(resData.message);
      } else {
        alert(resData.error || '엑셀 자율 입고 처리에 실패했습니다.');
      }
    } catch (err: any) {
      alert('서버 등록 통신 오류: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="my-3 border border-purple-100 rounded-2xl bg-white shadow-md overflow-hidden text-slate-800 max-w-sm animate-in zoom-in-95 duration-200">
      <div className="bg-gradient-to-r from-purple-50/50 to-indigo-50/30 px-4 py-3 border-b border-purple-50 flex items-center gap-2">
        <span className="p-1 rounded bg-purple-100 text-purple-600">
          <FileSpreadsheet className="w-3.5 h-3.5" />
        </span>
        <span className="text-xs font-black text-slate-800 flex items-center gap-1">
          <span>지능형 엑셀 자율 입고 파이프라인</span>
          <Sparkles className="w-3 h-3 text-purple-500 animate-pulse" />
        </span>
      </div>

      <div className="p-4 space-y-3 text-[11px]">
        {/* 공급처 및 날짜 설정 */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">공급처(거래처)</label>
            <input
              type="text"
              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-800 focus:outline-none focus:border-purple-500"
              value={partnerName}
              onChange={(e) => setPartnerName(e.target.value)}
              disabled={saved || saving}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">입고 일자</label>
            <input
              type="date"
              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-800 focus:outline-none focus:border-purple-500"
              value={inboundDate}
              onChange={(e) => setInboundDate(e.target.value)}
              disabled={saved || saving}
            />
          </div>
        </div>

        {/* 품목 리스트 테이블 */}
        <div className="border border-slate-100 rounded-lg overflow-hidden bg-slate-50/50">
          <div className="bg-slate-100/60 px-2 py-1 font-bold text-slate-600 border-b border-slate-100 flex justify-between">
            <span>엑셀 파싱 품목 목록</span>
            <span>총 {items.length}건</span>
          </div>
          <div className="max-h-[250px] overflow-y-auto divide-y divide-slate-100">
            {items.map((item, idx) => (
              <div key={idx} className="p-2 space-y-1.5 bg-white">
                <div className="flex justify-between items-center gap-1.5">
                  <span className="font-bold text-slate-700 truncate w-1/2">{item.itemName}</span>
                  <span className="text-slate-400 truncate text-[9px]">{item.spec || '규격 없음'}</span>
                </div>
                
                {/* 품목코드 및 바코드 정보가 있는 경우 컴팩트하게 노출 */}
                {(item.item_code || item.barcode) && (
                  <div className="flex flex-wrap gap-2 text-[8px] text-slate-450 font-mono scale-95 origin-left">
                    {item.item_code && <span>코드: {item.item_code}</span>}
                    {item.barcode && <span>바코드: {item.barcode}</span>}
                  </div>
                )}

                {/* 비고 수집 정보가 있는 경우 이탤릭체 노출 */}
                {item.note && (
                  <div className="text-[8.5px] text-slate-400/90 italic bg-slate-50 p-1 rounded-sm border border-slate-100/50 truncate" title={item.note}>
                    메모: {item.note}
                  </div>
                )}

                {/* 규격/포장 사양 입력부 */}
                <div className="grid grid-cols-4 gap-1 pt-0.5">
                  <div>
                    <label className="text-[8px] text-slate-440">수량</label>
                    <input
                      type="number"
                      className="w-full bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-center text-slate-800 text-[10px]"
                      value={item.quantity || 0}
                      onChange={(e) => handleItemFieldChange(idx, 'quantity', Number(e.target.value))}
                      disabled={saved || saving}
                    />
                  </div>
                  <div>
                    <label className="text-[8px] text-slate-440">단가</label>
                    <input
                      type="number"
                      className="w-full bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-center text-slate-800 text-[10px]"
                      value={item.unit_price || item.price || 0}
                      onChange={(e) => handleItemFieldChange(idx, 'unit_price', Number(e.target.value))}
                      disabled={saved || saving}
                    />
                  </div>
                  <div>
                    <label className="text-[8px] text-slate-440">단위</label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-center text-slate-800 text-[10px]"
                      value={item.unit_type || "개"}
                      onChange={(e) => handleItemFieldChange(idx, 'unit_type', e.target.value)}
                      disabled={saved || saving}
                    />
                  </div>
                  <div>
                    <label className="text-[8px] text-slate-440">입수량</label>
                    <input
                      type="number"
                      className="w-full bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-center text-slate-800 text-[10px]"
                      value={item.box_contains || 1}
                      onChange={(e) => handleItemFieldChange(idx, 'box_contains', Number(e.target.value))}
                      disabled={saved || saving}
                    />
                  </div>
                </div>

                {/* 구분/카테고리/적재위치 입력부 */}
                <div className="grid grid-cols-3 gap-1">
                  <div>
                    <label className="text-[8px] text-slate-440 block mb-0.5">구분</label>
                    <select
                      className="w-full bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-slate-750 text-[9.5px]"
                      value={item.item_type || "자재"}
                      onChange={(e) => handleItemFieldChange(idx, 'item_type', e.target.value)}
                      disabled={saved || saving}
                    >
                      <option value="자재">자재</option>
                      <option value="제품">제품</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[8px] text-slate-440 block mb-0.5">카테고리</label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-slate-800 text-[9.5px]"
                      value={item.category || "기타"}
                      onChange={(e) => handleItemFieldChange(idx, 'category', e.target.value)}
                      disabled={saved || saving}
                      placeholder="카테고리"
                    />
                  </div>
                  <div>
                    <label className="text-[8px] text-slate-440 block mb-0.5">적재위치</label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-slate-800 text-[9.5px]"
                      value={item.location || "자율입고창고"}
                      onChange={(e) => handleItemFieldChange(idx, 'location', e.target.value)}
                      disabled={saved || saving}
                    />
                  </div>
                </div>

                {/* 매칭 대상 드롭다운 */}
                <div className="pt-1.5 border-t border-slate-50">
                  <label className="block text-[9px] text-slate-440 mb-0.5">매칭할 재고 품목</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-slate-700 focus:outline-none focus:border-purple-500"
                    value={item.matchedItemId}
                    onChange={(e) => handleItemFieldChange(idx, 'matchedItemId', e.target.value)}
                    disabled={saved || saving}
                  >
                    <option value="NEW">➕ 신규 품목으로 자동 등록</option>
                    {inventoryList.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.name} ({inv.spec || '스펙없음'}) [{inv.type || '자재'} / {inv.category || '기타'} / {inv.location || '창고'}] [재고: {inv.stock}개]
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>

        {fileName && (
          <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
            <span className="text-slate-500 font-medium">첨부 엑셀 파일:</span>
            <span className="text-slate-800 font-bold truncate max-w-[180px]">
              📊 {fileName.split('/').pop()}
            </span>
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="pt-2 border-t border-slate-50 flex gap-2">
          {saved ? (
            <div className="w-full text-center py-2 px-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600 font-black flex items-center justify-center gap-1.5 animate-in fade-in duration-300">
              <Check className="w-4 h-4" />
              엑셀 자율 입고 확정 완료!
            </div>
          ) : (
            <button
              onClick={handleConfirmSubmit}
              disabled={saving}
              className="w-full py-2 px-4 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 transition disabled:opacity-50 text-xs shadow-md shadow-purple-200/50 cursor-pointer flex items-center justify-center gap-1.5"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>재고 적재 중...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>원터치 자율 재고 입고 확정</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
