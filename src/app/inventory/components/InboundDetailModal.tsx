'use client';

import { apiFetch } from '@/lib/api';
import React, { useEffect, useState } from 'react';
import { X, ClipboardList, Loader2, Sparkles, AlertCircle } from 'lucide-react';

interface InboundDetailItem {
  id: string;
  inbound_id: string;
  type: string;
  category: string;
  item_name: string;
  item_code: string;
  barcode: string;
  spec: string;
  unit: string;
  box_qty: number;
  quantity: number;
  price: number;
  partner_name: string;
  inbound_date: string;
  location: string;
  note: string;
}

interface InboundDetailModalProps {
  inboundId: string;
  onClose: () => void;
}

export const InboundDetailModal: React.FC<InboundDetailModalProps> = ({ inboundId, onClose }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [items, setItems] = useState<InboundDetailItem[]>([]);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchInboundDetail = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await apiFetch(`/api/inventory/inbounds?inbound_id=${inboundId}`);
        const resData = await res.json();
        if (resData.success) {
          setItems(resData.data || []);
        } else {
          setError(resData.error || '상세 입고 내역을 불러오지 못했습니다.');
        }
      } catch (err: any) {
        setError('데이터 통신 중 오류가 발생했습니다: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    if (inboundId) {
      fetchInboundDetail();
    }
  }, [inboundId]);

  const totalQuantity = items.reduce((acc, it) => acc + (it.quantity || 0), 0);
  const totalAmount = items.reduce((acc, it) => acc + ((it.quantity || 0) * (it.price || 0)), 0);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-2">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-[98vw] max-w-[98vw] overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* 모달 헤더 (프리미엄 투톤 그라디언트) */}
        <div className="px-6 py-4.5 border-b border-slate-50 flex items-center justify-between bg-gradient-to-r from-slate-50 to-indigo-50/40">
          <div className="flex items-center space-x-3.5">
            <div className="p-2 bg-indigo-500 text-white rounded-xl shadow-md shadow-indigo-150">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <span>일괄 입고 등록 전체 항목 리스트</span>
                <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-md font-mono font-black">
                  {inboundId}
                </span>
              </h3>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                14대 매핑 컬럼과 총액 필드가 가로 스크롤 없이 한 화면에 전체 피팅 렌더링된 화면입니다.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-xl transition text-slate-400 hover:text-slate-650 active:scale-95 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 모달 바디 */}
        <div className="p-5 flex-1 flex flex-col min-h-0 bg-slate-50/20">
          {loading ? (
            <div className="flex flex-col items-center justify-center flex-1 py-20 space-y-3">
              <Loader2 className="w-9 h-9 text-indigo-500 animate-spin" />
              <span className="text-xs text-slate-450 font-black">데이터를 불러오는 중입니다...</span>
            </div>
          ) : error ? (
            <div className="p-5 bg-rose-50 border border-rose-150 text-rose-700 text-xs rounded-2xl flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div>
                <h4 className="font-bold">내역 조회 중 오류 발생</h4>
                <p className="mt-0.5 text-rose-600 font-semibold">{error}</p>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-20 text-xs text-slate-400 font-black">
              조회된 세부 품목 내역이 없습니다.
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0 space-y-4">
              
              {/* 테이블 컨테이너 (스크롤바 완전 억제, 100% 핏) */}
              <div className="flex-1 min-h-0 border border-slate-100 rounded-2xl overflow-y-auto bg-white shadow-sm">
                <table className="w-full border-collapse text-left text-[10px] table-fixed">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100 font-black text-slate-500 text-[9px] sticky top-0 z-10 backdrop-blur-sm">
                      <th className="py-2.5 px-1 w-[3%] text-center">No.</th>
                      <th className="py-2.5 px-1 w-[3%] text-center">구분</th>
                      <th className="py-2.5 px-1 w-[5%]">카테고리</th>
                      <th className="py-2.5 px-1 w-[15%]">품목명</th>
                      <th className="py-2.5 px-1 w-[8%]">품목코드</th>
                      <th className="py-2.5 px-1 w-[7%]">바코드</th>
                      <th className="py-2.5 px-1 w-[7%]">규격</th>
                      <th className="py-2.5 px-1 w-[3%] text-center">단위</th>
                      <th className="py-2.5 px-1 w-[4%] text-right">입수량</th>
                      <th className="py-2.5 px-1 w-[5%] text-right">입고수량</th>
                      <th className="py-2.5 px-1 w-[6%] text-right">입고단가</th>
                      <th className="py-2.5 px-1 w-[7%] text-right">총액</th>
                      <th className="py-2.5 px-1 w-[9%]">공급처명</th>
                      <th className="py-2.5 px-1 w-[7%] text-center">입고일자</th>
                      <th className="py-2.5 px-1 w-[5%] text-center">적재위치</th>
                      <th className="py-2.5 px-1 w-[9%]">비고</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {items.map((item, index) => (
                      <tr key={item.id} className="hover:bg-indigo-50/20 transition-colors odd:bg-white even:bg-slate-50/10">
                        {/* 0. No. */}
                        <td className="py-2 px-1 text-center text-slate-450 font-bold font-mono">
                          {index + 1}
                        </td>
                        {/* 1. 구분 */}
                        <td className="py-2 px-1 text-center">
                          <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black ${
                            item.type === '원부자재' || item.type === 'material' || item.type === '자재' || item.type === '원자재'
                              ? 'bg-blue-50 text-blue-600 border border-blue-100' 
                              : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                          }`}>
                            {item.type === '원부자재' || item.type === 'material' || item.type === '자재' || item.type === '원자재' ? '원부자재' : '완제품'}
                          </span>
                        </td>
                        {/* 2. 카테고리 */}
                        <td className="py-2 px-1 text-slate-500 font-semibold truncate" title={item.category}>
                          {item.category}
                        </td>
                        {/* 3. 품목명 */}
                        <td className="py-2 px-1 font-bold text-slate-800 truncate" title={item.item_name}>
                          {item.item_name}
                        </td>
                        {/* 4. 품목코드 */}
                        <td className="py-2 px-1 text-slate-450 font-mono truncate" title={item.item_code}>
                          {item.item_code}
                        </td>
                        {/* 5. 바코드 */}
                        <td className="py-2 px-1 text-slate-450 font-mono truncate" title={item.barcode}>
                          {item.barcode}
                        </td>
                        {/* 6. 규격 */}
                        <td className="py-2 px-1 text-slate-400 font-medium truncate" title={item.spec}>
                          {item.spec || '-'}
                        </td>
                        {/* 7. 단위 */}
                        <td className="py-2 px-1 text-center text-slate-500 font-bold truncate">
                          {item.unit}
                        </td>
                        {/* 8. 박스당 입수량 */}
                        <td className="py-2 px-1 text-right text-slate-600 font-mono">
                          {(item.box_qty || 1).toLocaleString()}
                        </td>
                        {/* 9. 입고 수량 */}
                        <td className="py-2 px-1 text-right font-black text-indigo-650 font-mono">
                          {item.quantity.toLocaleString()}
                        </td>
                        {/* 10. 입고 단가 */}
                        <td className="py-2 px-1 text-right text-slate-600 font-mono">
                          {item.price.toLocaleString()}
                        </td>
                        {/* 11. 총액 */}
                        <td className="py-2 px-1 text-right text-slate-900 font-black font-mono">
                          {((item.quantity || 0) * (item.price || 0)).toLocaleString()}
                        </td>
                        {/* 12. 공급처명 */}
                        <td className="py-2 px-1 text-slate-600 font-semibold truncate" title={item.partner_name}>
                          {item.partner_name}
                        </td>
                        {/* 13. 입고일자 */}
                        <td className="py-2 px-1 text-center text-slate-450 font-mono truncate">
                          {item.inbound_date}
                        </td>
                        {/* 14. 적재위치 */}
                        <td className="py-2 px-1 text-center text-slate-500 font-semibold truncate" title={item.location}>
                          {item.location}
                        </td>
                        {/* 15. 비고 */}
                        <td className="py-2 px-1 text-slate-400 truncate" title={item.note}>
                          {item.note || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 하단 요약 바 (가로 전체 피팅) */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center text-xs font-black text-slate-700 shrink-0">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
                  <span>총 입고 합계 수량: <strong className="text-indigo-600 text-sm font-black">{totalQuantity.toLocaleString()}</strong> 개</span>
                </div>
                <div>
                  <span>총 자산 가치 평가액: <strong className="text-emerald-600 text-sm font-black">{totalAmount.toLocaleString()}</strong> 원</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 모달 푸터 */}
        <div className="px-6 py-3.5 border-t border-slate-50 bg-slate-50/40 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black text-xs px-5 py-2 rounded-xl active:scale-95 transition cursor-pointer"
          >
            확인 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
};
