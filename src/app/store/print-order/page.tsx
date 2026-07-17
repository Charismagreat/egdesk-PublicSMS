"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Printer, X, Loader2, FileText } from "lucide-react";

interface OrderDetail {
  id: string;
  type: string;
  customerName: string;
  customerPhone: string;
  productName: string;
  quantity: string;
  totalPrice: string;
  deliveryMethod: string;
  shippingAddress: string;
  trackingNumber: string;
  customerMemo: string;
  orderDate: string;
  status: string;
}

interface CompanyProfile {
  companyName: string;
  representative: string;
  businessNumber: string;
  phone: string;
  address: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

function PrintOrderContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("주문 번호가 누락되었습니다.");
      setLoading(false);
      return;
    }

    async function loadData() {
      try {
        // 1. 주문 상세 조회
        const orderRes = await apiFetch(`/api/orders/detail?id=${id}`);
        const orderData = await orderRes.json();
        if (orderData.success && orderData.order) {
          setOrder(orderData.order);
        } else {
          setError(orderData.error || "주문 내역을 찾을 수 없습니다.");
        }

        // 2. 회사 설정 조회 (동적 입금 안내 및 회사명 렌더링용)
        const profileRes = await apiFetch("/api/settings?key=my_company_profile");
        const profileData = await profileRes.json();
        if (profileData.success && profileData.value) {
          setProfile(JSON.parse(profileData.value));
        }
      } catch (err: any) {
        setError("데이터 로드 중 에러가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

  useEffect(() => {
    if (!loading && order) {
      // PDF 파일명 자동 제안을 위해 document.title 동적 설정 (특수문자 제거 가드)
      const cleanName = order.customerName ? order.customerName.replace(/[^a-zA-Z0-9가-힣ㄱ-ㅎㅏ-ㅣ\s_-]/g, "").trim() : "고객";
      document.title = `주문확인서_${cleanName}_${order.id}`;

      // 로딩 완료 후 0.5초 대기 후 인쇄 팝업 자동 구동
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, order]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-slate-600 font-bold text-sm">주문서를 생성하는 중입니다...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full text-center shadow-sm">
          <X className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-black text-slate-800 mb-2">오류 발생</h3>
          <p className="text-slate-500 text-xs leading-relaxed mb-6">{error || "주문 내역이 존재하지 않습니다."}</p>
          <button
            onClick={() => window.close()}
            className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-colors border-none cursor-pointer"
          >
            창 닫기
          </button>
        </div>
      </div>
    );
  }

  const finalPrice = Number(order.totalPrice);
  const quantity = Number(order.quantity) || 1;
  const unitPrice = !isNaN(finalPrice) ? Math.round(finalPrice / quantity) : 0;

  const displayUnitPrice = !isNaN(finalPrice) ? `${unitPrice.toLocaleString()}원` : order.totalPrice;
  const displayPrice = !isNaN(finalPrice) ? `${finalPrice.toLocaleString()}원` : order.totalPrice;

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 sm:px-6 lg:px-8 print:bg-white print:py-0 print:px-0">
      {/* no-print 상단 제어 바 */}
      <div className="max-w-3xl mx-auto mb-6 flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs no-print">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-600" />
          <span className="text-sm font-black text-slate-800">주문 확인증 출력</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 border-none cursor-pointer shadow-xs"
          >
            <Printer className="w-4 h-4" />
            인쇄하기
          </button>
          <button
            onClick={() => window.close()}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 border-none cursor-pointer"
          >
            <X className="w-4 h-4" />
            창 닫기
          </button>
        </div>
      </div>

      {/* 실물 A4 주문 확인증 본문 */}
      <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 shadow-sm print:shadow-none print:border-none print:p-0">
        
        {/* 상단 타이틀 및 회사정보 */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-8 border-b border-slate-200 gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-800">주문 확인서</h1>
            <p className="text-xs text-slate-400 mt-1 font-semibold">주문 번호: {order.id}</p>
          </div>
          <div className="text-left sm:text-right text-xs text-slate-500 space-y-1">
            <h4 className="font-bold text-slate-700 text-sm">{profile?.companyName || "EGDESK STORE"}</h4>
            <p>대표자: {profile?.representative || "-"}</p>
            <p>사업자번호: {profile?.businessNumber || "-"}</p>
            <p>연락처: {profile?.phone || "-"}</p>
            <p>{profile?.address || "-"}</p>
          </div>
        </div>

        {/* 주문 요약 명세 */}
        <div className="py-8 grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-slate-100">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">주문 정보</h3>
            <table className="w-full text-xs text-slate-600 space-y-2">
              <tbody>
                <tr>
                  <td className="py-1 font-bold text-slate-500 w-24">주문 일자</td>
                  <td className="py-1 font-semibold text-slate-800">{order.orderDate?.split(" ")[0]}</td>
                </tr>
                <tr>
                  <td className="py-1 font-bold text-slate-500">배송 방법</td>
                  <td className="py-1 font-semibold text-slate-800">{order.deliveryMethod}</td>
                </tr>
                {order.shippingAddress && (
                  <tr>
                    <td className="py-1 font-bold text-slate-500">배송지 주소</td>
                    <td className="py-1 font-semibold text-slate-800 leading-relaxed">{order.shippingAddress}</td>
                  </tr>
                )}
                {order.customerMemo && (
                  <tr>
                    <td className="py-1 font-bold text-slate-500">고객 메모</td>
                    <td className="py-1 font-semibold text-slate-800 whitespace-pre-wrap">{order.customerMemo}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">주문자 정보</h3>
            <table className="w-full text-xs text-slate-600 space-y-2">
              <tbody>
                <tr>
                  <td className="py-1 font-bold text-slate-500 w-24">주문자명</td>
                  <td className="py-1 font-semibold text-slate-800">{order.customerName}</td>
                </tr>
                <tr>
                  <td className="py-1 font-bold text-slate-500">연락처</td>
                  <td className="py-1 font-semibold text-slate-800">{order.customerPhone}</td>
                </tr>
                <tr>
                  <td className="py-1 font-bold text-slate-500">주문 상태</td>
                  <td className="py-1">
                    <span className="inline-block bg-slate-100 text-slate-800 font-bold px-2 py-0.5 rounded-md text-[10px]">
                      {order.status}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 품목 내역 테이블 */}
        <div className="py-8">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">주문 품목 내역</h3>
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-xs text-left text-slate-600">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-4">상품명</th>
                  <th className="p-4 text-right w-28">단가</th>
                  <th className="p-4 text-center w-24">수량</th>
                  <th className="p-4 text-right w-32">총 금액</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="p-4 font-bold text-slate-800">{order.productName}</td>
                  <td className="p-4 text-right font-semibold text-slate-700">{displayUnitPrice}</td>
                  <td className="p-4 text-center font-semibold text-slate-700">{order.quantity}</td>
                  <td className="p-4 text-right font-bold text-slate-900">{displayPrice}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 최종 결제 합계 및 결제 안내 */}
        <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="bg-slate-50/60 border border-slate-100 rounded-2xl p-4 text-xs text-slate-500 max-w-md w-full">
            <h4 className="font-bold text-slate-700 mb-1">무통장 결제(송금) 계좌 정보</h4>
            <p className="mb-2">아래 계좌로 총 결제금액을 입금해 주시면 확인 즉시 발송됩니다.</p>
            <div className="bg-white border border-slate-200 p-2.5 rounded-xl font-mono text-xs font-bold text-slate-800 flex justify-between">
              <span>{profile?.bankName || "국민은행"} {profile?.accountNumber || "123456-12-123456"}</span>
              <span className="text-slate-400 font-normal">예금주: {profile?.accountHolder || "주식회사 이지데스크"}</span>
            </div>
          </div>
          <div className="text-right w-full sm:w-auto">
            <span className="text-xs font-bold text-slate-400 block mb-1">최종 결제 금액 (부가세 포함)</span>
            <span className="text-2xl font-black text-slate-800">{displayPrice}</span>
          </div>
        </div>

      </div>

      {/* 인쇄 전용 CSS 스타일 주입 */}
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background-color: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function PrintOrderPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-slate-600 font-bold text-sm">주문서를 생성하는 중입니다...</p>
      </div>
    }>
      <PrintOrderContent />
    </Suspense>
  );
}
