"use client";

import { apiFetch } from '@/lib/api';
import { useState, useEffect } from "react";
import { X, ShoppingBag, Calendar, User, Phone, MapPin, DollarSign, FileText, ClipboardList } from "lucide-react";

interface OrderDetailModalProps {
  orderId: string;
  onClose: () => void;
}

export default function OrderDetailModal({ orderId, onClose }: OrderDetailModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    if (orderId) {
      fetchDetail();
    }
  }, [orderId]);

  const fetchDetail = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch(`/api/orders/detail?id=${orderId}`);
      const json = await res.json();
      if (json.success) {
        setOrder(json.order);
      } else {
        setError(json.error || "상세 내역을 불러오지 못했습니다.");
      }
    } catch (e: any) {
      setError("네트워크 연결에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* 반투명 블러 백드롭 배경 */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      ></div>

      {/* 모달 박스 */}
      <div className="relative bg-white rounded-3xl w-full max-w-lg shadow-2xl z-10 overflow-hidden border border-slate-100 flex flex-col transform transition-all duration-300 scale-100">
        
        {/* 모달 헤더 */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center space-x-2">
            {order?.type === 'reservation' ? (
              <Calendar className="w-5 h-5 text-indigo-500" />
            ) : (
              <ShoppingBag className="w-5 h-5 text-emerald-500" />
            )}
            <h3 className="font-bold text-slate-800 text-lg">
              {order?.type === 'reservation' ? '예약 상세 내역' : '주문 상세 내역'}
            </h3>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-200/50 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 모달 바디 */}
        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
          {loading ? (
            <div className="py-12 space-y-4 animate-pulse">
              <div className="h-6 bg-slate-100 rounded-lg w-1/3 mx-auto"></div>
              <div className="space-y-2">
                <div className="h-4 bg-slate-100 rounded-lg w-full"></div>
                <div className="h-4 bg-slate-100 rounded-lg w-5/6"></div>
                <div className="h-4 bg-slate-100 rounded-lg w-4/5"></div>
              </div>
            </div>
          ) : error ? (
            <div className="py-12 text-center text-red-500 font-medium">
              <p>{error}</p>
              <button 
                onClick={fetchDetail} 
                className="mt-4 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 text-xs font-semibold"
              >
                다시 시도
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* ID 및 상태 요약 */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex justify-between items-center">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">주문번호 (ID)</span>
                  <span className="font-mono text-sm font-bold text-slate-700">{order.id}</span>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  order.status === '결제완료' || order.status === '예약확정' 
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                    : 'bg-amber-50 text-amber-600 border border-amber-100'
                }`}>
                  {order.status}
                </span>
              </div>

              {/* 디테일 필드 */}
              <div className="space-y-4 text-sm text-slate-600">
                {/* 1. 고객명 */}
                <div className="flex items-start space-x-3">
                  <User className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div className="flex-1">
                    <span className="text-xs text-slate-400 block">고객명</span>
                    <span className="font-semibold text-slate-800">{order.customerName}</span>
                  </div>
                </div>

                {/* 2. 연락처 */}
                <div className="flex items-start space-x-3">
                  <Phone className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div className="flex-1">
                    <span className="text-xs text-slate-400 block">연락처</span>
                    <span className="font-mono text-slate-700">{order.customerPhone}</span>
                  </div>
                </div>

                {/* 3. 주문 상품 */}
                <div className="flex items-start space-x-3">
                  <ClipboardList className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div className="flex-1">
                    <span className="text-xs text-slate-400 block">
                      {order.type === 'reservation' ? '예약 서비스명' : '주문 상품명'}
                    </span>
                    <span className="font-semibold text-slate-800">{order.productName}</span>
                    {order.type !== 'reservation' && (
                      <span className="text-xs text-slate-400 ml-2">({order.quantity}개)</span>
                    )}
                  </div>
                </div>

                {/* 4. 결제 금액 */}
                <div className="flex items-start space-x-3">
                  <DollarSign className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div className="flex-1">
                    <span className="text-xs text-slate-400 block">결제 금액</span>
                    <span className="font-bold text-slate-800">
                      {order.type === 'reservation' && isNaN(Number(order.totalPrice)) 
                        ? order.totalPrice 
                        : `${Number(order.totalPrice).toLocaleString()}원`}
                    </span>
                  </div>
                </div>

                {/* 5. 배송 방식 및 배송지 (또는 예약 시간) */}
                <div className="flex items-start space-x-3">
                  <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div className="flex-1">
                    <span className="text-xs text-slate-400 block">
                      {order.type === 'reservation' ? '예약 일정' : `수령 방식 (${order.deliveryMethod})`}
                    </span>
                    <span className="text-slate-800 font-medium whitespace-pre-line">{order.shippingAddress || '(지정된 주소 없음)'}</span>
                  </div>
                </div>

                {/* 6. 요청 사항 / 메모 */}
                {order.customerMemo && (
                  <div className="flex items-start space-x-3">
                    <FileText className="w-4 h-4 text-slate-400 mt-0.5" />
                    <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="text-xs text-slate-400 block mb-1">고객 메모 / 상세 사항</span>
                      <p className="text-xs text-slate-600 whitespace-pre-line italic leading-relaxed">
                        "{order.customerMemo}"
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 모달 푸터 */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button 
            onClick={onClose} 
            className="px-5 py-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-700 text-sm font-bold shadow-md shadow-slate-900/10 transition-colors"
          >
            확인 완료
          </button>
        </div>

      </div>
    </div>
  );
}
