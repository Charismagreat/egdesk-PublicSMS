"use client";

import React, { useEffect, useState } from "react";
import { X, Receipt, Clock, CheckCircle2 } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface TableOrderHistoryModalProps {
  tableId: string | string[] | undefined;
  onClose: () => void;
}

export function TableOrderHistoryModal({ tableId, onClose }: TableOrderHistoryModalProps) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchTableOrders() {
      try {
        const cleanTableId = String(tableId || "").trim();
        const savedTenant = typeof window !== "undefined" ? sessionStorage.getItem(`table_tenant_${cleanTableId}`) : null;
        const queryUrl = savedTenant && savedTenant !== "default" ? `/api/orders?tenantId=${encodeURIComponent(savedTenant)}` : "/api/orders";
        
        const res = await apiFetch(queryUrl);
        const json = await res.json();
        if (json.success && Array.isArray(json.orders)) {
          // 현재 테이블Id 매칭 (customer_name에 "테이블 1번", "테이블 1", "테이블1" 유연 포함)
          const filtered = json.orders.filter((o: any) => {
            const name = String(o.customer_name || o.customerName || "");
            return (
              name.includes(`테이블 ${cleanTableId}`) ||
              name.includes(`테이블${cleanTableId}`) ||
              name === cleanTableId
            );
          });
          setOrders(filtered);
        }
      } catch (e) {
        console.error("테이블 주문 내역 조회 오류:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchTableOrders();
  }, [tableId]);

  const grandTotal = orders.reduce((sum, o) => {
    const rawPrice = o.total_price || o.totalPrice || "0";
    const val = Number(String(rawPrice).replace(/[^0-9]/g, ""));
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 relative max-h-[85vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-orange-600" />
            <h2 className="text-base font-black text-slate-800">
              테이블 {tableId}번 누적 주문 내역
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors border-0 bg-transparent cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 본문 주문 목록 */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs font-bold space-y-2">
              <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p>주문 내역을 불러오는 중입니다...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs font-bold space-y-1">
              <p className="text-sm text-slate-600">접수된 주문 내역이 없습니다 🍽️</p>
              <p className="text-[11px] text-slate-400 font-normal">메뉴를 고르신 후 주문하기를 눌러주세요.</p>
            </div>
          ) : (
            orders.map((order, index) => {
              const rawPrice = order.total_price || order.totalPrice || "0";
              const priceNum = Number(String(rawPrice).replace(/[^0-9]/g, ""));
              const productName = order.product_name || order.productName || "주문 상품";
              const memo = order.customer_memo || order.customerMemo || "";
              const dateStr = order.created_at || order.order_date || order.createdAt || "방금 전";

              return (
                <div
                  key={order.id || index}
                  className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                    <span className="font-extrabold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-md text-[10px]">
                      {orders.length - index}차 주문
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {dateStr}
                    </span>
                  </div>

                  <div className="space-y-1 font-bold text-slate-800">
                    <p className="text-sm font-black text-slate-900">{productName}</p>
                    {memo && (
                      <p className="text-[11px] font-normal text-slate-500 whitespace-pre-line leading-relaxed bg-white p-2 rounded-xl border border-slate-100">
                        {memo}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1 font-black text-slate-800">
                    <span className="text-slate-500 font-bold">주문 금액</span>
                    <span className="text-sm text-orange-650">{priceNum.toLocaleString()}원</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 푸터 총 주문 금액 */}
        {orders.length > 0 && (
          <div className="border-t border-slate-200 pt-3 shrink-0 flex items-center justify-between bg-orange-50/60 -mx-6 -mb-6 p-4 rounded-b-3xl">
            <span className="text-xs font-bold text-slate-600">누적 총 결제 예정금액</span>
            <span className="text-lg font-black text-orange-650">{grandTotal.toLocaleString()}원</span>
          </div>
        )}
      </div>
    </div>
  );
}
