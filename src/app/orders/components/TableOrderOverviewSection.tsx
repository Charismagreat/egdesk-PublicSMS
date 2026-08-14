"use client";

import React, { useState } from "react";
import { Order } from "../types";
import { 
  Utensils, 
  CheckCircle2, 
  ExternalLink, 
  Printer, 
  Clock, 
  CreditCard, 
  RefreshCw,
  Sparkles,
  Receipt,
  X,
  Maximize2
} from "lucide-react";

interface TableOrderOverviewSectionProps {
  orders: Order[];
  onUpdateOrder: (id: string, updates: Partial<Order>) => Promise<void>;
  onBulkUpdateStatus: (status: string) => Promise<void>;
  onFetchData: () => Promise<void>;
}

export function TableOrderOverviewSection({
  orders,
  onUpdateOrder,
  onFetchData
}: TableOrderOverviewSectionProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [selectedTableForModal, setSelectedTableForModal] = useState<string | null>(null);

  // 테이블 번호 목록 (기본 1~12번 + DB에 새로 발견되는 테이블 번호 포함)
  const defaultTableIds = Array.from({ length: 12 }, (_, i) => String(i + 1));
  
  // orders 내 customer_name에서 테이블 번호 추출
  const dbTableIds: string[] = [];
  orders.forEach(o => {
    const name = o.customer_name || o.customerName || "";
    const match = name.match(/테이블\s*(\d+)번?/);
    if (match && match[1] && !defaultTableIds.includes(match[1]) && !dbTableIds.includes(match[1])) {
      dbTableIds.push(match[1]);
    }
  });

  const allTableIds = [...defaultTableIds, ...dbTableIds].sort((a, b) => Number(a) - Number(b));

  // 테이블별 주문 그룹핑 함수
  const getOrdersForTable = (tableNum: string) => {
    return orders.filter(o => {
      const name = o.customer_name || o.customerName || "";
      return name.includes(`테이블 ${tableNum}`) || name.includes(`테이블${tableNum}`);
    });
  };

  // 해당 테이블 결제완료 처리
  const handleBulkCompletePayment = async (tableNum: string, tableOrders: Order[]) => {
    const unpaidOrders = tableOrders.filter(o => o.status !== '결제완료' && o.status !== '주문취소');
    if (unpaidOrders.length === 0) {
      alert(`테이블 ${tableNum}번에 미결제 주문이 없습니다.`);
      return;
    }

    if (!confirm(`테이블 ${tableNum}번의 ${unpaidOrders.length}건 주문을 모두 [결제완료]로 처리하시겠습니까?`)) {
      return;
    }

    setLoadingAction(`pay_${tableNum}`);
    try {
      for (const ord of unpaidOrders) {
        await onUpdateOrder(ord.id, { status: '결제완료' });
      }
      await onFetchData();
      alert(`테이블 ${tableNum}번의 주문이 [결제완료] 처리되었습니다.`);
    } catch (e) {
      alert('결제 처리 중 오류가 발생했습니다.');
    } finally {
      setLoadingAction(null);
    }
  // 일시 정보(날짜+시간) 포맷팅 헬퍼
  const formatDateTime = (dateStr?: string, createdAt?: string) => {
    const raw = dateStr || createdAt;
    if (!raw) return '방금';
    // 만약 "2026-08-14" 처럼 날짜만 있고 createdAt에 시분초가 있는 경우
    if (raw.length === 10 && createdAt && createdAt.length > 10) {
      return createdAt.substring(0, 16);
    }
    // "2026-08-14 14:18:23" -> "2026-08-14 14:18"
    if (raw.length >= 16) {
      return raw.substring(0, 16);
    }
    return raw;
  };

  // 영수증/주문서 인쇄 팝업 (동적 영수증 설정 연동)
  const handlePrintTableReceipt = async (tableNum: string, tableOrders: Order[]) => {
    const validOrders = tableOrders.filter(o => o.status !== '주문취소');
    if (validOrders.length === 0) {
      alert('출력할 주문 내역이 없습니다.');
      return;
    }

    // 영수증 커스텀 설정 및 회사업체 프로필 동적 패칭
    let receiptSettings = {
      paperWidth: "80mm",
      customMessage: "방문해 주셔서 진심으로 감사합니다.\n늘 최선을 다하겠습니다.",
      noticeText: "★ 네이버 영수증 리뷰 작성 시 음료수 1캔 무료 증정! ★\nWi-Fi: EGDESK_GUEST / Pass: egdesk1234\n주차 등록은 카운터 문의 (2시간 무료)",
      showCompanyProfile: true,
      qrType: "REVIEW",
      qrUrl: "https://m.place.naver.com",
      qrLabel: "🎁 영수증 리뷰 작성하고 음료수 받자!"
    };

    let companyProfile = {
      companyName: "주식회사 이지데스크",
      representative: "홍길동",
      businessNumber: "123-45-67890",
      phone: "02-123-4567"
    };

    try {
      const [settingRes, profileRes] = await Promise.all([
        apiFetch('/api/settings?key=receipt_settings').catch(() => null),
        apiFetch('/api/settings?key=my_company_profile').catch(() => null)
      ]);

      if (settingRes) {
        const sJson = await settingRes.json();
        if (sJson.success && sJson.value) {
          receiptSettings = { ...receiptSettings, ...JSON.parse(sJson.value) };
        }
      }

      if (profileRes) {
        const pJson = await profileRes.json();
        if (pJson.success && pJson.value) {
          companyProfile = { ...companyProfile, ...JSON.parse(pJson.value) };
        }
      }
    } catch (e) {
      console.warn("영수증 설정 패칭 실패 (기본값 적용):", e);
    }

    const printWindow = window.open('', '_blank', 'width=450,height=650');
    if (!printWindow) return alert('팝업이 차단되었습니다. 팝업 허용 후 다시 시도해주세요.');

    const grandTotal = validOrders.reduce((sum, o) => {
      const p = Number(String(o.total_price || o.totalPrice || '0').replace(/[^0-9]/g, ''));
      return sum + (isNaN(p) ? 0 : p);
    }, 0);

    const nowStr = new Date().toLocaleString('ko-KR');

    // 용지 폭에 따른 CSS 규격 (80mm: 300px, 58mm: 220px)
    const is58mm = receiptSettings.paperWidth === "58mm";
    const paperWidthPx = is58mm ? "220px" : "300px";

    // 텍스트 줄바꿈(\n, \\n, \r\n)을 완벽하게 HTML <br/>로 치환하는 만능 포맷터
    const formatLineBreaks = (text: any) => {
      if (!text) return "";
      return String(text)
        .replace(/\\r\\n/g, "<br/>")
        .replace(/\\n/g, "<br/>")
        .replace(/\r\n/g, "<br/>")
        .replace(/\n/g, "<br/>");
    };

    const formattedCustomMsg = formatLineBreaks(receiptSettings.customMessage);
    const formattedNoticeText = formatLineBreaks(receiptSettings.noticeText);

    // QR 이미지 URL 생성
    const qrImgUrl = receiptSettings.showQr && receiptSettings.qrUrl
      ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(receiptSettings.qrUrl)}`
      : "";

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>영수증 (테이블 ${tableNum}번)</title>
        <style>
          body { 
            font-family: 'Malgun Gothic', sans-serif; 
            padding: 10px; 
            color: #0f172a; 
            background: #fff;
            margin: 0;
            display: flex;
            justify-content: center;
          }
          .receipt-box { 
            width: ${paperWidthPx}; 
            box-sizing: border-box; 
            font-size: ${is58mm ? '11px' : '12px'};
          }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 12px; }
          .header h2 { margin: 0 0 5px 0; font-size: ${is58mm ? '16px' : '18px'}; font-weight: 900; }
          .header p { margin: 0; font-size: 10px; color: #64748b; }
          .item { border-bottom: 1px dashed #cbd5e1; padding: 8px 0; }
          .item-title { font-weight: bold; font-size: ${is58mm ? '12px' : '13px'}; margin-bottom: 3px; }
          .item-memo { font-size: 10px; color: #475569; background: #f1f5f9; padding: 4px 6px; border-radius: 4px; margin-top: 4px; line-height: 1.4; white-space: pre-line; word-break: break-word; }
          .item-flex { display: flex; justify-content: space-between; margin-top: 4px; font-weight: bold; }
          .total { border-top: 2px solid #000; margin-top: 12px; padding-top: 10px; display: flex; justify-content: space-between; font-size: ${is58mm ? '14px' : '15px'}; font-weight: 900; }
          
          .footer-section { text-align: center; margin-top: 15px; border-top: 1px dashed #94a3b8; padding-top: 12px; }
          .custom-msg { font-weight: bold; margin-bottom: 8px; font-size: ${is58mm ? '11px' : '12px'}; line-height: 1.6; white-space: pre-line; word-break: break-word; }
          .notice-box { text-align: left; background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px; border-radius: 6px; font-size: 10px; line-height: 1.6; color: #334155; margin-bottom: 10px; white-space: pre-line; word-break: break-word; }
          .company-info { font-size: 9px; color: #64748b; margin-top: 8px; line-height: 1.4; border-top: 1px dotted #cbd5e1; padding-top: 6px; }
          .qr-section { margin-top: 12px; padding-top: 8px; border-top: 1px dashed #cbd5e1; text-align: center; }
          .qr-img { width: 90px; height: 90px; margin: 0 auto; display: block; }
          .qr-label { font-size: 10px; font-weight: bold; color: #d97706; margin-top: 4px; }
          
          @media print {
            body { padding: 0; }
            .receipt-box { width: 100%; }
          }
        </style>
      </head>
      <body>
        <div class="receipt-box">
          <div class="header">
            <h2>영수증 (테이블 ${tableNum}번)</h2>
            <p>출력일시: ${nowStr}</p>
          </div>
          
          ${validOrders.map((o, idx) => {
            const pName = o.product_name || o.productName || '상품명 없음';
            const pPrice = Number(String(o.total_price || o.totalPrice || '0').replace(/[^0-9]/g, '')).toLocaleString();
            const memo = o.customer_memo || o.customerMemo || '';
            const formattedMemo = memo ? memo.replace(/\r\n/g, "<br/>").replace(/\n/g, "<br/>") : '';
            return `
              <div class="item">
                <div class="item-title">${validOrders.length - idx}차 주문 - ${pName}</div>
                ${formattedMemo ? `<div class="item-memo">메모: ${formattedMemo}</div>` : ''}
                <div class="item-flex">
                  <span>상태: ${o.status || '접수'}</span>
                  <span>${pPrice}원</span>
                </div>
              </div>
            `;
          }).join('')}

          <div class="total">
            <span>누적 총 결제액</span>
            <span>${grandTotal.toLocaleString()}원</span>
          </div>

          <!-- 영수증 하단 커스텀 영역 동적 인쇄 -->
          <div class="footer-section">
            ${formattedCustomMsg ? `<div class="custom-msg">${formattedCustomMsg}</div>` : ''}
            
            ${formattedNoticeText ? `<div class="notice-box">${formattedNoticeText}</div>` : ''}

            ${receiptSettings.showCompanyProfile ? `
              <div class="company-info">
                <div>${companyProfile.companyName} | 대표: ${companyProfile.representative}</div>
                <div>사업자번호: ${companyProfile.businessNumber} | TEL: ${companyProfile.phone}</div>
              </div>
            ` : ''}

            ${qrImgUrl ? `
              <div class="qr-section">
                <img src="${qrImgUrl}" class="qr-img" alt="Receipt QR" />
                ${receiptSettings.qrLabel ? `<div class="qr-label">${receiptSettings.qrLabel}</div>` : ''}
              </div>
            ` : ''}
          </div>

        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const selectedOrders = selectedTableForModal ? getOrdersForTable(selectedTableForModal) : [];
  // ⚡ 현재 이용 중인 미결제 활성 주문만 정밀 필터링 (이전 손님의 결제완료 주문 배제)
  const selectedActiveOrders = selectedOrders.filter(o => o.status !== '주문취소' && o.status !== '결제완료');
  const selectedGrandTotal = selectedActiveOrders.reduce((sum, o) => {
    const p = Number(String(o.total_price || o.totalPrice || '0').replace(/[^0-9]/g, ''));
    return sum + (isNaN(p) ? 0 : p);
  }, 0);

  return (
    <div className="space-y-6">
      
      {/* 탭 안내 헤더 바 */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-3xl p-6 shadow-md flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0">
            <Utensils className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-black flex items-center gap-2">
              실시간 테이블 주문 통합 모니터링
              <Sparkles className="w-5 h-5 text-amber-200" />
            </h2>
            <p className="text-orange-100 text-xs mt-0.5 font-medium">
              각 테이블 카드를 클릭하시면 전체 1차, 2차 세부 주문 내역을 팝업창에서 시원하게 조망하실 수 있습니다.
            </p>
          </div>
        </div>

        <button
          onClick={onFetchData}
          className="bg-white/10 hover:bg-white/20 text-white font-bold px-4 py-2.5 rounded-2xl backdrop-blur-md transition-all text-xs flex items-center gap-1.5 border border-white/20 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>새로고침</span>
        </button>
      </div>

      {/* 테이블 그리드 리스트 (4열 반응형) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {allTableIds.map(tableNum => {
          const tableOrders = getOrdersForTable(tableNum);
          // 현재 식사 중인 미결제 활성 주문 목록 (결제완료/주문취소 제외)
          const activeOrders = tableOrders.filter(o => o.status !== '주문취소' && o.status !== '결제완료');
          const hasOrders = activeOrders.length > 0;
          const isOccupied = hasOrders;

          // 누적 금액 계산
          const totalAmount = activeOrders.reduce((sum, o) => {
            const p = Number(String(o.total_price || o.totalPrice || '0').replace(/[^0-9]/g, ''));
            return sum + (isNaN(p) ? 0 : p);
          }, 0);

          // 결제 완료 미완료 여부
          const hasUnpaid = activeOrders.some(o => o.status !== '결제완료');

          return (
            <div 
              key={tableNum}
              className={`rounded-3xl border transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-lg ${
                isOccupied 
                  ? 'bg-white border-orange-200 ring-2 ring-orange-500/10 cursor-pointer hover:-translate-y-1' 
                  : 'bg-slate-50/70 border-slate-200 opacity-90'
              }`}
              onClick={() => {
                if (hasOrders) setSelectedTableForModal(tableNum);
              }}
            >
              {/* 카드 헤더 */}
              <div className={`p-4 border-b flex items-center justify-between ${
                isOccupied ? 'bg-orange-50/70 border-orange-100' : 'bg-slate-100/60 border-slate-200'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="font-black text-slate-800 text-base">
                    테이블 {tableNum}번
                  </span>
                  {isOccupied ? (
                    <span className="bg-orange-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                      이용중 ({activeOrders.length}건)
                    </span>
                  ) : (
                    <span className="bg-slate-200 text-slate-500 font-bold text-[10px] px-2 py-0.5 rounded-full">
                      빈 테이블
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {hasOrders && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTableForModal(tableNum);
                      }}
                      className="text-orange-600 bg-orange-100 hover:bg-orange-200 p-1.5 rounded-lg text-xs font-bold transition-all border-0 cursor-pointer flex items-center gap-1"
                      title="전체 주문 내역 팝업 열기"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span className="text-[10px]">상세보기</span>
                    </button>
                  )}
                  <a
                    href={`/table-order/${tableNum}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-slate-400 hover:text-orange-600 p-1.5 rounded-lg hover:bg-white transition-colors"
                    title={`테이블 ${tableNum}번 오더 페이지 열기`}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* 본문 주문 내역 바디 */}
              <div className="p-4 flex-1 space-y-3 min-h-[160px] flex flex-col justify-between">
                {!hasOrders ? (
                  <div className="my-auto text-center py-6">
                    <p className="text-slate-400 text-xs font-bold">주문 내역 없음</p>
                    <p className="text-slate-400 text-[10px] mt-0.5">손님 대기 중</p>
                  </div>
                ) : (
                  <div className="space-y-2.5 overflow-y-auto max-h-[220px] pr-1 scrollbar-thin">
                    {activeOrders.map((ord, idx) => {
                      const pName = ord.product_name || ord.productName || '상품명 없음';
                      const pPrice = Number(String(ord.total_price || ord.totalPrice || '0').replace(/[^0-9]/g, ''));
                      const memo = ord.customer_memo || ord.customerMemo || '';
                      const isPaid = ord.status === '결제완료';

                      return (
                        <div 
                          key={ord.id || idx}
                          className="bg-slate-50 border border-slate-200/80 rounded-2xl p-2.5 text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-orange-650 text-[10px] bg-orange-100 px-2 py-0.5 rounded-md">
                              {activeOrders.length - idx}차 주문
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {ord.status || '접수'}
                            </span>
                          </div>

                          <div className="font-bold text-slate-800">
                            <p className="text-xs text-slate-900 line-clamp-1">{pName}</p>
                            {memo && (
                              <p className="text-[10px] text-slate-500 font-normal bg-white p-1.5 rounded-lg border border-slate-100 mt-1">
                                {memo}
                              </p>
                            )}
                          </div>

                          <div className="flex justify-between items-center text-[11px] pt-0.5 border-t border-slate-200/40">
                            <span className="text-slate-400 font-medium">{formatDateTime(ord.order_date, ord.created_at)}</span>
                            <span className="font-black text-slate-800">{pPrice.toLocaleString()}원</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 누적 합계 금액 */}
                {hasOrders && (
                  <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">누적 결제 예정금액</span>
                    <span className="text-base font-black text-orange-650">
                      {totalAmount.toLocaleString()}원
                    </span>
                  </div>
                )}
              </div>

              {/* 하단 관리 버튼 그룹 */}
              {hasOrders && (
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  {hasUnpaid && (
                    <button
                      onClick={() => handleBulkCompletePayment(tableNum, activeOrders)}
                      disabled={loadingAction === `pay_${tableNum}`}
                      className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 border-0 cursor-pointer transition-colors"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>결제 완료</span>
                    </button>
                  )}
                  
                  <button
                    onClick={() => handlePrintTableReceipt(tableNum, activeOrders)}
                    className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1 border border-slate-200 cursor-pointer transition-colors"
                    title="테이블 1차/2차 영수증 인쇄"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-600" />
                    <span>영수증</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 테이블 상세 전체 내용 팝업 모달 */}
      {selectedTableForModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-2xl p-6 sm:p-8 shadow-2xl space-y-6 relative max-h-[90vh] flex flex-col">
            
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-2xl flex items-center justify-center">
                  <Utensils className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    테이블 {selectedTableForModal}번 주문 상세 내역
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTableForModal(null)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors border-0 bg-transparent cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* 모달 본문 리스트 */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
              {selectedActiveOrders.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-sm font-bold">
                  접수된 주문 항목이 없습니다.
                </div>
              ) : (
                selectedActiveOrders.map((ord, idx) => {
                  const pName = ord.product_name || ord.productName || '상품명 없음';
                  const pPrice = Number(String(ord.total_price || ord.totalPrice || '0').replace(/[^0-9]/g, ''));
                  const qty = ord.quantity || '1';
                  const memo = ord.customer_memo || ord.customerMemo || '';
                  const isPaid = ord.status === '결제완료';

                  return (
                    <div
                      key={ord.id || idx}
                      className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/70 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-orange-600 bg-orange-100 px-3 py-1 rounded-xl text-xs">
                            {selectedActiveOrders.length - idx}차 주문
                          </span>
                          <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {formatDateTime(ord.order_date, ord.created_at)}
                          </span>
                        </div>

                        {/* 개별 주문 상태 개별 조절 selector */}
                        <div className="flex items-center gap-2">
                          <select
                            value={ord.status || '결제대기'}
                            onChange={e => onUpdateOrder(ord.id, { status: e.target.value })}
                            className={`text-xs font-black px-3 py-1.5 rounded-xl border outline-none cursor-pointer ${
                              isPaid 
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                                : 'bg-amber-100 text-amber-900 border-amber-300'
                            }`}
                          >
                            <option value="접수완료">접수완료</option>
                            <option value="결제대기">결제대기</option>
                            <option value="결제완료">결제완료</option>
                            <option value="상품준비중">조리중/준비중</option>
                            <option value="주문취소">주문취소</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between items-start">
                          <h4 className="text-base font-black text-slate-900 leading-snug">{pName}</h4>
                          <span className="text-sm font-extrabold text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                            {qty}개
                          </span>
                        </div>

                        {memo && (
                          <div className="bg-white p-3 rounded-xl border border-slate-200/80 text-xs text-slate-700 font-normal leading-relaxed whitespace-pre-line">
                            <span className="font-bold text-slate-400 block text-[10px] mb-0.5">손님 메모:</span>
                            {memo}
                          </div>
                        )}
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-slate-200/60 font-black">
                        <span className="text-slate-500 text-xs font-bold">주문 금액</span>
                        <span className="text-base text-orange-650">{pPrice.toLocaleString()}원</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* 모달 푸터 액션 바 */}
            <div className="border-t border-slate-200 pt-4 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/80 -mx-6 sm:-mx-8 -mb-6 sm:-mb-8 p-4 sm:p-6 rounded-b-3xl">
              <div>
                <span className="text-xs font-bold text-slate-500 block">테이블 전체 누적 결제액</span>
                <span className="text-2xl font-black text-orange-650">
                  {selectedGrandTotal.toLocaleString()}원
                </span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => handlePrintTableReceipt(selectedTableForModal, selectedOrders)}
                  className="flex-1 sm:flex-none px-4 py-3 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 border border-slate-200 cursor-pointer shadow-xs transition-colors"
                >
                  <Printer className="w-4 h-4 text-slate-600" />
                  <span>영수증 인쇄</span>
                </button>

                {selectedActiveOrders.some(o => o.status !== '결제완료') && (
                  <button
                    onClick={() => {
                      handleBulkCompletePayment(selectedTableForModal, selectedOrders);
                      setSelectedTableForModal(null);
                    }}
                    className="flex-1 sm:flex-none px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 border-0 cursor-pointer shadow-md transition-colors"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>전체 결제 완료</span>
                  </button>
                )}

                <button
                  onClick={() => setSelectedTableForModal(null)}
                  className="px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-2xl text-xs border-0 cursor-pointer transition-colors"
                >
                  닫기
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

