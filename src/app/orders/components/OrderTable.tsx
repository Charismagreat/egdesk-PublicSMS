import React from "react";
import { Trash2, Truck, MapPin, DollarSign, Store, Send, Image as ImageIcon, Package } from "lucide-react";
import { Order } from "../types";

interface OrderTableProps {
  paginatedData: Order[];
  selectedIds: Set<string>;
  isUpdating: boolean;
  tabs: string[];
  trackingEdits: Record<string, string>;
  setTrackingEdits: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  toggleSelectAll: (e: React.ChangeEvent<HTMLInputElement>) => void;
  toggleSelect: (id: string) => void;
  setActiveOrderId: (id: string | null) => void;
  setViewerUrl: (url: string | null) => void;
  updateOrder: (id: string, updates: Partial<Order>) => Promise<void>;
  bulkUpdateStatus: (status: string) => Promise<void>;
  saveTrackingNumber: (id: string) => void;
  onDelete: (id: string) => void;
  allDataCount: number;
}

export function OrderTable({
  paginatedData,
  selectedIds,
  isUpdating,
  tabs,
  trackingEdits,
  setTrackingEdits,
  toggleSelectAll,
  toggleSelect,
  setActiveOrderId,
  setViewerUrl,
  updateOrder,
  bulkUpdateStatus,
  saveTrackingNumber,
  onDelete,
  allDataCount
}: OrderTableProps) {
  return (
    <>
      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="p-3 bg-blue-50/50 border-b border-blue-100 flex items-center gap-3">
          <span className="text-sm font-medium text-blue-800 ml-2">{selectedIds.size}개 선택됨</span>
          <select 
            className="border border-blue-200 rounded-lg px-3 py-1.5 text-sm outline-none bg-white text-blue-800 font-semibold cursor-pointer"
            onChange={(e) => {
              if (e.target.value) bulkUpdateStatus(e.target.value);
              e.target.value = "";
            }}
          >
            <option value="">일괄 상태 변경...</option>
            {tabs.filter(t => t !== '전체').map(t => (
              <option key={t} value={t}>{t} (으)로 변경</option>
            ))}
          </select>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse whitespace-nowrap min-w-[900px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-sm text-slate-600">
              <th className="p-4 w-12 text-center">
                <input 
                  type="checkbox" 
                  onChange={toggleSelectAll} 
                  checked={paginatedData.length > 0 && selectedIds.size === paginatedData.length} 
                  className="rounded cursor-pointer" 
                />
              </th>
              <th className="p-4 font-semibold">주문일자</th>
              <th className="p-4 font-semibold">주문번호</th>
              <th className="p-4 font-semibold">주문정보</th>
              <th className="p-4 font-semibold">수령방식/배송정보</th>
              <th className="p-4 text-right font-semibold">수량</th>
              <th className="p-4 text-right font-semibold">총 금액</th>
              <th className="p-4 w-32 font-semibold">상태</th>
              <th className="p-4 text-center font-semibold">관리</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map(t => (
              <tr key={t.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${isUpdating ? 'opacity-50' : ''}`}>
                <td className="p-4 text-center">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.has(t.id)} 
                    onChange={() => toggleSelect(t.id)} 
                    className="rounded cursor-pointer" 
                  />
                </td>
                <td className="p-4 text-sm text-slate-500 font-medium">{t.order_date}</td>
                <td className="p-4">
                  <button 
                    onClick={() => setActiveOrderId(t.id)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-mono font-bold tracking-tight transition-all active:scale-95 cursor-pointer"
                  >
                    ORD-{String(t.id || '').slice(-6).toUpperCase()}
                  </button>
                </td>
                <td className="p-4">
                  <div className="font-bold text-slate-800 flex items-center">
                    {t.product_name}
                    {t.attachment_url && (
                      <button 
                        onClick={() => setViewerUrl(t.attachment_url || null)} 
                        className="ml-2 bg-blue-100 text-blue-600 px-2 py-0.5 rounded text-[10px] hover:bg-blue-200 flex items-center shadow-sm border-0 font-bold cursor-pointer"
                      >
                        <ImageIcon className="w-3 h-3 mr-1" /> 첨부 확인
                      </button>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 font-semibold">{t.customer_name} <span className="text-slate-400 font-medium">({t.customer_phone})</span></div>
                  {t.customer_memo && (
                    <div className="mt-1 text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded inline-block font-semibold">
                      🗣️ {t.customer_memo}
                    </div>
                  )}
                </td>
                <td className="p-4">
                  <div className="flex items-center text-xs font-bold text-slate-700 mb-1">
                    {t.delivery_method === '배송' && <Truck className="w-3.5 h-3.5 mr-1 text-blue-500"/>}
                    {t.delivery_method === '배달' && <Send className="w-3.5 h-3.5 mr-1 text-orange-500"/>}
                    {t.delivery_method === '가져가기' && <Package className="w-3.5 h-3.5 mr-1 text-green-500"/>}
                    {t.delivery_method === '매장에서' && <Store className="w-3.5 h-3.5 mr-1 text-purple-500"/>}
                    
                    {t.delivery_method === '택배배송' && <Truck className="w-3.5 h-3.5 mr-1 text-blue-500"/>}
                    {t.delivery_method === '자체배달' && <Send className="w-3.5 h-3.5 mr-1 text-orange-500"/>}
                    {t.delivery_method === '방문픽업' && <Package className="w-3.5 h-3.5 mr-1 text-green-500"/>}
                    {t.delivery_method === '현장판매' && <DollarSign className="w-3.5 h-3.5 mr-1 text-purple-500"/>}
                    {t.delivery_method === '상담/캡처' && <ImageIcon className="w-3.5 h-3.5 mr-1 text-teal-500"/>}
                    
                    {t.delivery_method || '배송'}
                  </div>
                  {['배송', '배달', '택배배송', '자체배달'].includes(t.delivery_method) && (
                    <div className="text-[10px] text-slate-500 flex items-center mt-1 truncate max-w-[200px]" title={t.shipping_address}>
                      <MapPin className="w-3 h-3 mr-1 shrink-0" /> {t.shipping_address || '주소 미입력'}
                    </div>
                  )}
                  {['배송', '택배배송'].includes(t.delivery_method) && (
                    <div className="mt-2 flex items-center space-x-1">
                      <input 
                        type="text" 
                        placeholder="송장번호 입력"
                        className="border rounded px-2 py-1 text-xs w-32 outline-none focus:border-blue-500 bg-white font-medium text-slate-800"
                        value={trackingEdits[t.id] !== undefined ? trackingEdits[t.id] : (t.tracking_number || '')}
                        onChange={(e) => setTrackingEdits({ ...trackingEdits, [t.id]: e.target.value })}
                      />
                      {(trackingEdits[t.id] !== undefined && trackingEdits[t.id] !== (t.tracking_number || '')) && (
                        <button 
                          onClick={() => saveTrackingNumber(t.id)} 
                          className="bg-blue-100 text-blue-600 px-2 py-1 rounded text-xs hover:bg-blue-200 border-0 font-bold cursor-pointer transition-colors"
                        >
                          저장
                        </button>
                      )}
                    </div>
                  )}
                </td>
                <td className="p-4 text-right font-semibold text-slate-700 text-xs">
                  {t.quantity ? Number(String(t.quantity).replace(/[^0-9]/g, '')).toLocaleString() : '-'}
                </td>
                <td className="p-4 text-right font-extrabold text-red-500 text-sm">
                  {t.total_price ? Number(String(t.total_price).replace(/[^0-9]/g, '')).toLocaleString() : '-'}원
                </td>
                <td className="p-4">
                  <select 
                    value={t.status || '결제대기'}
                    onChange={(e) => updateOrder(t.id, { status: e.target.value })}
                    className={`border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-blue-500 w-full bg-white font-semibold cursor-pointer ${
                      t.status === '견적요청' ? 'bg-amber-50 text-amber-700 font-bold border-amber-200' : 'text-slate-700'
                    }`}
                  >
                    {tabs.filter(tab => tab !== '전체').map(tab => (
                      <option key={tab} value={tab}>{tab}</option>
                    ))}
                  </select>
                </td>
                <td className="p-4 text-center">
                  <button 
                    onClick={() => onDelete(t.id)} 
                    className="text-slate-300 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors border-0 cursor-pointer bg-transparent" 
                    title="삭제"
                  >
                    <Trash2 className="w-4 h-4"/>
                  </button>
                </td>
              </tr>
            ))}
            {paginatedData.length === 0 && (
              <tr>
                <td colSpan={9} className="p-12 text-center text-slate-400 font-medium">
                  {allDataCount === 0 ? "등록된 주문 내역이 없습니다." : "조건에 맞는 주문 내역이 없습니다."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
