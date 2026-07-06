'use client';

import { apiFetch } from '@/lib/api';
import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function InboundEstimatePreviewMessage({
  tagContent,
  onConfirmSuccess
}: {
  tagContent: string;
  onConfirmSuccess: (msg: string) => void;
}) {
  const router = useRouter();
  const [estimateData, setEstimateData] = useState<any>(null);
  const [partnerId, setPartnerId] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [partnerPhone, setPartnerPhone] = useState('');
  const [estimateDate, setEstimateDate] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [pdfFilePath, setPdfFilePath] = useState('');
  const [trackedItemsList, setTrackedItemsList] = useState<any[]>([]);
  const [partnersList, setPartnersList] = useState<any[]>([]);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);
  const [createdEstimateId, setCreatedEstimateId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const parsed = JSON.parse(tagContent);
      setEstimateData(parsed);
      const ocrData = parsed.data || {};
      setPartnerName(ocrData.partnerName || '');
      setPartnerPhone(ocrData.partnerPhone || '');
      setEstimateDate(ocrData.estimateDate || new Date().toISOString().slice(0, 10));
      setPdfFilePath(ocrData.pdfFilePath || '');
      setTrackedItemsList(parsed.trackedItemsList || []);
      setPartnersList(parsed.partnersList || []);
      setPartnerId(parsed.partnerId || '');
      
      const parsedItems = (ocrData.items || []).map((item: any) => ({
        productName: item.productName || item.product_name || item.itemName || '',
        spec: item.spec || '',
        quantity: Number(item.quantity) || 0,
        unitPrice: Number(item.unitPrice || item.unit_price) || 0,
        amount: Number(item.amount) || 0,
        matched_item_id: item.matched_item_id ? String(item.matched_item_id) : ''
      }));
      setItems(parsedItems);

      // 총 금액 계산
      const total = parsedItems.reduce((sum: number, it: any) => sum + (it.quantity * it.unitPrice), 0);
      setTotalAmount(total);
    } catch (err: any) {
      console.error('받은 견적서 태그 파싱 실패:', err);
    }
  }, [tagContent]);

  if (!estimateData) return <div className="text-rose-500 font-bold p-2 text-xs">견적서 데이터를 파싱하지 못했습니다.</div>;

  const handleGoToDetail = async () => {
    // 이미 연동 처리되어 estimateId가 발급된 경우 API 호출 없이 바로 모달 팝업/페이지 이동
    if (createdEstimateId) {
      if (typeof window !== "undefined" && window.location.pathname === '/estimates') {
        window.history.replaceState({}, "", `/estimates?detail_id=${createdEstimateId}`);
        window.dispatchEvent(new CustomEvent('open-estimate-detail', { detail: { estimateId: createdEstimateId } }));
      } else {
        router.push(`/estimates?detail_id=${createdEstimateId}`);
      }
      return;
    }

    if (items.length === 0) {
      alert('등록할 견적 품목이 존재하지 않습니다.');
      return;
    }
    setSaving(true);
    try {
      const response = await apiFetch('/api/easybot/ocr/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileType: 'INBOUND_ESTIMATE',
          partnerName,
          partnerPhone,
          estimateDate,
          pdfFilePath,
          items: items.map(it => ({
            ...it,
            matched_item_id: it.matched_item_id ? Number(it.matched_item_id) : null
          }))
        })
      });

      const resData = await response.json();
      if (resData.success) {
        setSaved(true);
        setCreatedEstimateId(resData.estimateId || null);
        onConfirmSuccess(resData.message);
        
        const estId = resData.estimateId;
        if (estId) {
          // 현재 위치가 이미 견적 대장 페이지인 경우 새로고침 없이 즉각 모달 오픈 이벤트 전송
          if (typeof window !== "undefined" && window.location.pathname === '/estimates') {
            window.history.replaceState({}, "", `/estimates?detail_id=${estId}`);
            window.dispatchEvent(new CustomEvent('open-estimate-detail', { detail: { estimateId: estId } }));
          } else {
            // 다른 페이지에 있다면 쿼리 스트링과 함께 라우팅 이동 (마운트 시 자동 감지됨)
            router.push(`/estimates?detail_id=${estId}`);
          }
        } else {
          router.push('/estimates');
        }
      } else {
        alert(resData.error || '견적서 저장 처리에 실패했습니다.');
      }
    } catch (err: any) {
      alert('서버 등록 통신 오류: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="my-3 border border-sky-100 rounded-2xl bg-white shadow-md overflow-hidden text-slate-800 max-w-sm animate-in zoom-in-95 duration-200">
      {/* 카드 헤더 */}
      <div className="bg-gradient-to-r from-sky-50/50 to-blue-50/30 px-4 py-3 border-b border-sky-50 flex items-center gap-2">
        <Sparkles size={14} className="text-sky-600 animate-pulse" />
        <span className="text-xs font-black text-slate-800">받은 견적서 AI OCR 요약 리포트</span>
      </div>

      <div className="p-4 space-y-3.5 text-[11px]">
        {/* 요약 상세 표 */}
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2.5">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 font-bold">공급처(거래처)</span>
            <span className="text-slate-800 font-black text-right">{partnerName || '미지정'}</span>
          </div>
          {partnerPhone && (
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-bold">연락처</span>
              <span className="text-slate-700 font-medium font-mono text-right">{partnerPhone}</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-slate-400 font-bold">견적 일자</span>
            <span className="text-slate-700 font-medium text-right">{estimateDate}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400 font-bold">총 품목 수</span>
            <span className="text-slate-800 font-bold text-right">{items.length}건</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-slate-200/60">
            <span className="text-slate-500 font-black">총 견적 금액</span>
            <span className="text-indigo-600 font-extrabold text-xs">{totalAmount.toLocaleString()}원</span>
          </div>
        </div>

        {/* 파일명 표시 */}
        {pdfFilePath && (
          <div className="flex justify-between items-center bg-slate-50/50 p-2 rounded-lg border border-slate-100 text-[10px]">
            <span className="text-slate-400 font-bold">견적 파일명:</span>
            <span className="text-slate-600 font-medium truncate max-w-[200px]" title={pdfFilePath.split('/').pop()}>
              📄 {pdfFilePath.split('/').pop()}
            </span>
          </div>
        )}

        {/* 자세히 보기 및 연동 버튼 */}
        <button
          onClick={handleGoToDetail}
          disabled={saving}
          className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-black transition text-xs shadow-md shadow-sky-200/50 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          {saving ? '⚡ 견적서 연동 처리 중...' : '🔍 자세히 보기 및 견적 연동 ➡️'}
        </button>
      </div>
    </div>
  );
}
