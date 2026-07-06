import React from "react";
import { X, Phone, MapPin, Calendar, Package, AlertCircle, RefreshCw, DollarSign, Truck, Coins, ShoppingBag } from "lucide-react";
import { Customer, CustomerHistory, PointHistoryItem } from "../types";

interface HistoryModalProps {
  showHistoryModal: boolean;
  setShowHistoryModal: (show: boolean) => void;
  selectedCustomer: Customer | null;
  setSelectedCustomer: (customer: Customer | null) => void;
  customerHistory: CustomerHistory | null;
  setCustomerHistory: (history: CustomerHistory | null) => void;
  isLoadingHistory: boolean;
  activeHistoryTab: 'orders' | 'cancelled' | 'transactions' | 'deliveries' | 'points';
  setActiveHistoryTab: (tab: 'orders' | 'cancelled' | 'transactions' | 'deliveries' | 'points') => void;
  pointBalance: number;
  pointHistory: PointHistoryItem[];
  adjustAmount: string;
  setAdjustAmount: (val: string) => void;
  adjustReason: string;
  setAdjustReason: (val: string) => void;
  isAdjusting: boolean;
  handleAdjustPoints: () => Promise<void>;
}

export function HistoryModal({
  showHistoryModal,
  setShowHistoryModal,
  selectedCustomer,
  setSelectedCustomer,
  customerHistory,
  setCustomerHistory,
  isLoadingHistory,
  activeHistoryTab,
  setActiveHistoryTab,
  pointBalance,
  pointHistory,
  adjustAmount,
  setAdjustAmount,
  adjustReason,
  setAdjustReason,
  isAdjusting,
  handleAdjustPoints
}: HistoryModalProps) {
  if (!showHistoryModal || !selectedCustomer) return null;

  const handleClose = () => {
    setShowHistoryModal(false);
    setSelectedCustomer(null);
    setCustomerHistory(null);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300 animate-fade-in">
      <div className="bg-white/95 backdrop-blur-md rounded-3xl w-full max-w-5xl h-[85vh] shadow-2xl flex flex-col overflow-hidden border border-slate-200/50 animate-scale-up">
        
        {/* 모달 헤더 (PC용 단일행 고정 배열) */}
        <div className="relative p-8 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex justify-between items-center gap-4">
          <div className="absolute top-0 right-0 left-0 h-full overflow-hidden pointer-events-none opacity-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-400 via-transparent to-transparent"></div>
          
          <div className="relative z-10 flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-400 to-indigo-500 flex items-center justify-center font-extrabold text-2xl text-white shadow-lg shadow-indigo-500/25 shrink-0 select-none">
              {selectedCustomer.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h3 className="text-2xl font-bold tracking-tight">{selectedCustomer.name}</h3>
                {selectedCustomer.tags && (
                  <span className="bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border border-blue-400/30 text-blue-300 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                    {selectedCustomer.tags}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-x-4 gap-y-1 mt-1.5 text-sm text-slate-300">
                <span className="flex items-center"><Phone className="w-3.5 h-3.5 mr-1 text-slate-400" /> {selectedCustomer.phone}</span>
                {selectedCustomer.address && (
                  <span className="flex items-center"><MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" /> {selectedCustomer.address}</span>
                )}
                <span className="flex items-center"><Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" /> 가입일: {new Date(selectedCustomer.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          
          <button 
            onClick={handleClose} 
            className="relative z-10 bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white p-2 rounded-xl transition-all border border-white/10 shadow-2xs cursor-pointer border-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 모달 콘텐츠 영역 */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {isLoadingHistory ? (
            <div className="space-y-6 animate-pulse">
              <div className="grid grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-24 bg-slate-100 rounded-2xl border border-slate-200/60"></div>
                ))}
              </div>
              <div className="h-10 bg-slate-100 rounded-xl w-80"></div>
              <div className="space-y-3">
                <div className="h-12 bg-slate-100 rounded-xl"></div>
                <div className="h-20 bg-slate-100 rounded-xl"></div>
              </div>
            </div>
          ) : customerHistory ? (
            <>
              {/* 요약 통계 카드 그리드 (PC용 4열 고정) */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/30 border border-blue-100 rounded-2xl p-4 flex items-center justify-between shadow-xs transition-all hover:scale-[1.02]">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">전체 주문 수</p>
                    <h4 className="text-2xl font-black text-slate-800 mt-1">{customerHistory.stats.totalOrders} <span className="text-sm font-normal text-slate-500">건</span></h4>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                    <Package className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-gradient-to-br from-rose-50/50 to-orange-50/30 border border-rose-100 rounded-2xl p-4 flex items-center justify-between shadow-xs transition-all hover:scale-[1.02]">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">주문 취소</p>
                    <h4 className="text-2xl font-black text-slate-800 mt-1">{customerHistory.stats.cancelledOrders} <span className="text-sm font-normal text-slate-500">건</span></h4>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-gradient-to-br from-amber-50/50 to-yellow-50/30 border border-amber-100 rounded-2xl p-4 flex items-center justify-between shadow-xs transition-all hover:scale-[1.02]">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">반품 수</p>
                    <h4 className="text-2xl font-black text-slate-800 mt-1">{customerHistory.stats.returnedOrders} <span className="text-sm font-normal text-slate-500">건</span></h4>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                    <RefreshCw className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-50/50 to-teal-50/30 border border-emerald-100 rounded-2xl p-4 flex items-center justify-between shadow-xs transition-all hover:scale-[1.02]">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">누적 결제액</p>
                    <h4 className="text-2xl font-black text-slate-800 mt-1">{customerHistory.stats.totalAmount.toLocaleString()} <span className="text-sm font-normal text-slate-500">원</span></h4>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* 탭 내비게이션 */}
              <div className="border-b border-slate-200/80 flex space-x-6 overflow-x-auto scrollbar-none py-1">
                {[
                  { id: 'orders', label: '주문 이력', icon: Package, count: customerHistory.orders.length },
                  { id: 'cancelled', label: '취소/반품 내역', icon: RefreshCw, count: customerHistory.stats.cancelledOrders + customerHistory.stats.returnedOrders },
                  { id: 'transactions', label: '거래 내역', icon: DollarSign, count: customerHistory.transactions.length },
                  { id: 'deliveries', label: '배송 정보', icon: Truck, count: customerHistory.deliveries.length },
                  { id: 'points', label: '적립금 내역', icon: Coins, count: pointHistory.length },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeHistoryTab === tab.id;
                  return (
                    <button
                       key={tab.id}
                       onClick={() => setActiveHistoryTab(tab.id as any)}
                       className={`flex items-center space-x-2 pb-3.5 text-sm font-semibold transition-all border-b-2 whitespace-nowrap outline-none border-none bg-transparent cursor-pointer ${
                         isActive
                           ? 'border-indigo-650 text-indigo-600 scale-[1.02]'
                           : 'border-transparent text-slate-505 hover:text-slate-800'
                       }`}
                    >
                       <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                       <span>{tab.label}</span>
                       <span className={`text-xs px-2 py-0.5 rounded-full font-bold transition-all ${
                         isActive ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'
                       }`}>
                         {tab.count}
                       </span>
                    </button>
                  );
                })}
              </div>

              {/* 탭 콘텐츠 패널 */}
              <div className="flex-1">
                
                {/* 1. 주문 이력 탭 */}
                {activeHistoryTab === 'orders' && (
                  <div className="space-y-4">
                    {customerHistory.orders.length === 0 ? (
                      <div className="py-16 text-center bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center">
                        <ShoppingBag className="w-12 h-12 text-slate-300 mb-3" />
                        <p className="font-semibold text-slate-500">주문 내역이 없습니다.</p>
                      </div>
                    ) : (
                      <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
                        <table className="w-full text-left text-sm border-collapse">
                          <thead className="bg-slate-50/80 text-slate-655 font-semibold border-b border-slate-200/80">
                            <tr>
                              <th className="p-4">주문번호</th>
                              <th className="p-4">주문일시</th>
                              <th className="p-4">상품명</th>
                              <th className="p-4">수량</th>
                              <th className="p-4 text-right">주문금액</th>
                              <th className="p-4 text-center">주문상태</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white text-xs font-medium">
                            {customerHistory.orders.map((order: any) => {
                              const isCancelled = order.status === '주문취소' || order.status === '취소완료' || order.status === '취소';
                              const isReturned = order.status === '반품신청' || order.status === '반품완료' || order.status === '반품';
                              return (
                                <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                                  <td className="p-4 font-mono font-bold text-slate-800 text-xs">{order.id}</td>
                                  <td className="p-4 text-slate-505 text-xs">
                                    {new Date(order.order_date).toLocaleString()}
                                  </td>
                                  <td className="p-4 font-bold text-slate-800">{order.product_name}</td>
                                  <td className="p-4 text-slate-600">{order.quantity || 1}개</td>
                                  <td className="p-4 text-right font-black text-slate-800 font-mono">
                                    {Number(order.total_price || 0).toLocaleString()}원
                                  </td>
                                  <td className="p-4 text-center">
                                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${
                                      isCancelled 
                                        ? 'bg-rose-50 border-rose-100 text-rose-700' 
                                        : isReturned 
                                        ? 'bg-amber-50 border-amber-100 text-amber-700'
                                        : order.status === '배송완료' 
                                        ? 'bg-indigo-50 border-indigo-100 text-indigo-700'
                                        : order.status === '배송중'
                                        ? 'bg-blue-50 border-blue-100 text-blue-700'
                                        : 'bg-emerald-50 border-emerald-100 text-emerald-700'
                                    }`}>
                                      {order.status}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. 취소/반품 내역 탭 */}
                {activeHistoryTab === 'cancelled' && (
                  <div className="space-y-4">
                    {customerHistory.orders.filter((o: any) => 
                      o.status === '주문취소' || o.status === '취소완료' || o.status === '취소' ||
                      o.status === '반품신청' || o.status === '반품완료' || o.status === '반품'
                    ).length === 0 ? (
                      <div className="py-16 text-center bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center">
                        <RefreshCw className="w-12 h-12 text-slate-300 mb-3" />
                        <p className="font-semibold text-slate-500">취소 또는 반품 처리된 이력이 없습니다.</p>
                      </div>
                    ) : (
                      <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
                        <table className="w-full text-left text-sm border-collapse">
                          <thead className="bg-slate-50/80 text-slate-655 font-semibold border-b border-slate-200/80">
                            <tr>
                              <th className="p-4">주문번호</th>
                              <th className="p-4">주문일시</th>
                              <th className="p-4">상품명</th>
                              <th className="p-4 text-right">환불/정산 예정금액</th>
                              <th className="p-4 text-center">구분</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white text-xs font-medium">
                            {customerHistory.orders
                              .filter((o: any) => 
                                o.status === '주문취소' || o.status === '취소완료' || o.status === '취소' ||
                                o.status === '반품신청' || o.status === '반품완료' || o.status === '반품'
                              )
                              .map((order: any) => {
                                const isCancelled = order.status === '주문취소' || order.status === '취소완료' || order.status === '취소';
                                return (
                                  <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                                    <td className="p-4 font-mono font-bold text-slate-800 text-xs">{order.id}</td>
                                    <td className="p-4 text-slate-505 text-xs">
                                      {new Date(order.order_date).toLocaleString()}
                                    </td>
                                    <td className="p-4 font-bold text-slate-800">{order.product_name}</td>
                                    <td className="p-4 text-right font-black text-rose-600 font-mono">
                                      {Number(order.total_price || 0).toLocaleString()}원
                                    </td>
                                    <td className="p-4 text-center">
                                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${
                                        isCancelled 
                                          ? 'bg-rose-50 border-rose-100 text-rose-700' 
                                          : 'bg-amber-50 border-amber-100 text-amber-700'
                                      }`}>
                                        {isCancelled ? '주문취소' : '반품처리'}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. 거래 내역 탭 */}
                {activeHistoryTab === 'transactions' && (
                  <div className="space-y-4">
                    {customerHistory.transactions.length === 0 ? (
                      <div className="py-16 text-center bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center">
                        <DollarSign className="w-12 h-12 text-slate-300 mb-3" />
                        <p className="font-semibold text-slate-500">거래(결제) 내역이 존재하지 않습니다.</p>
                      </div>
                    ) : (
                      <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
                        <table className="w-full text-left text-sm border-collapse">
                          <thead className="bg-slate-50/80 text-slate-655 font-semibold border-b border-slate-200/80">
                            <tr>
                              <th className="p-4">거래 ID</th>
                              <th className="p-4">거래일시</th>
                              <th className="p-4">결제유형</th>
                              <th className="p-4 text-right">거래금액</th>
                              <th className="p-4 text-center">상태</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white text-xs font-medium">
                            {customerHistory.transactions.map((tx: any) => {
                              return (
                                <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                                  <td className="p-4 font-mono font-bold text-slate-800 text-xs">{tx.id}</td>
                                  <td className="p-4 text-slate-505 text-xs">
                                    {new Date(tx.order_date).toLocaleString()}
                                  </td>
                                  <td className="p-4 text-slate-700 font-bold">
                                    {tx.payment_method || '신용카드'}
                                  </td>
                                  <td className="p-4 text-right font-black text-indigo-650 font-mono">
                                    {Number(String(tx.amount || '0').replace(/[^0-9]/g, '')).toLocaleString()}원
                                  </td>
                                  <td className="p-4 text-center">
                                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${
                                      tx.status === '결제완료' || tx.status === '배송완료'
                                        ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                                        : 'bg-rose-50 border-rose-100 text-rose-700'
                                    }`}>
                                      {tx.status}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. 배송 정보 탭 (PC용 2열 고정) */}
                {activeHistoryTab === 'deliveries' && (
                  <div className="space-y-6">
                    {customerHistory.deliveries.length === 0 ? (
                      <div className="py-16 text-center bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center">
                        <Truck className="w-12 h-12 text-slate-300 mb-3" />
                        <p className="font-semibold text-slate-500">등록된 배송 정보가 존재하지 않습니다.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-6">
                        {customerHistory.deliveries.map((delivery: any) => {
                          return (
                            <div key={delivery.id} className="bg-slate-50/40 border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-4 hover:border-indigo-200 transition-all text-xs font-medium">
                              <div className="flex justify-between items-center pb-3 border-b border-slate-200/60">
                                <div className="flex items-center space-x-2">
                                  <span className="font-extrabold text-slate-800 text-sm">배송 ID: {delivery.id}</span>
                                  <span className={`inline-flex px-2 py-0.5 rounded-full text-2xs font-extrabold border ${
                                    delivery.status === '배송완료' 
                                      ? 'bg-indigo-50 border-indigo-100 text-indigo-700' 
                                      : 'bg-blue-50 border-blue-100 text-blue-700'
                                  }`}>
                                    {delivery.status}
                                  </span>
                                </div>
                                <span className="text-xs text-slate-400 font-mono">운송장: {delivery.tracking_number || '-'}</span>
                              </div>

                              <div className="space-y-2 text-xs text-slate-655 font-semibold">
                                <div className="flex items-start">
                                  <span className="w-20 font-bold text-slate-400 shrink-0">수령인</span>
                                  <span className="font-bold text-slate-800">{delivery.recipient_name || selectedCustomer.name}</span>
                                </div>
                                <div className="flex items-start">
                                  <span className="w-20 font-bold text-slate-400 shrink-0">연락처</span>
                                  <span className="font-mono">{delivery.recipient_phone || selectedCustomer.phone}</span>
                                </div>
                                {delivery.carrier && (
                                  <div className="flex items-start">
                                    <span className="w-20 font-bold text-slate-400 shrink-0">택배사</span>
                                    <span className="text-slate-800">{delivery.carrier}</span>
                                  </div>
                                )}
                                <div className="flex items-start">
                                  <span className="w-20 font-bold text-slate-400 shrink-0">배송지 주소</span>
                                  <span className="text-slate-700 break-all font-bold">{delivery.address || selectedCustomer.shipping_address || selectedCustomer.address || '-'}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* 5. 적립금(포인트) 내역 탭 (PC용 12열 그리드 고정) */}
                {activeHistoryTab === 'points' && (
                  <div className="space-y-6">
                    
                    {/* 적립금 대시보드 요약 및 수동 충전 폼 */}
                    <div className="grid grid-cols-12 gap-6 animate-fade-in">
                      
                      {/* 적립금 잔액 카드 */}
                      <div className="col-span-5 bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 text-white rounded-3xl p-6 shadow-md border border-indigo-600/30 flex flex-col justify-between relative overflow-hidden h-44">
                        <div className="absolute top-0 right-0 p-3 opacity-15">
                          <Coins className="w-28 h-28 text-white" />
                        </div>
                        <div className="relative z-10">
                          <p className="text-xs text-indigo-200 font-bold uppercase tracking-wider">보유 적립 포인트</p>
                          <h3 className="text-3xl font-black mt-2 font-mono">{pointBalance.toLocaleString()} <span className="text-lg font-bold">p</span></h3>
                        </div>
                        <div className="relative z-10 text-[10px] text-indigo-200 font-medium">
                          이지데스크 무료 SMS 연계 포인트 실시간 연동 중
                        </div>
                      </div>

                      {/* 포인트 수동 조정 폼 (PC용 고정 수평) */}
                      <div className="col-span-7 bg-slate-50 border border-slate-200 rounded-3xl p-5 shadow-inner space-y-4">
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center">
                          <Coins className="w-4 h-4 mr-1.5 text-indigo-600 animate-bounce" />
                          점주 전용 적립금 수동 지급 / 차감
                        </h4>
                        <div className="flex gap-3">
                          <div className="flex-1">
                            <input 
                              type="number"
                              value={adjustAmount}
                              onChange={e => setAdjustAmount(e.target.value)}
                              placeholder="금액 입력 (예: 5000 또는 -2000)"
                              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none font-bold text-xs bg-white focus:ring-2 focus:ring-indigo-500 shadow-sm"
                            />
                          </div>
                          <div className="flex-[2]">
                            <input 
                              type="text"
                              value={adjustReason}
                              onChange={e => setAdjustReason(e.target.value)}
                              placeholder="조정 사유를 상세하게 기록하세요..."
                              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none font-semibold text-xs bg-white focus:ring-2 focus:ring-indigo-500 shadow-sm"
                            />
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-1">
                          <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                            * 지급 시 **양수(5000)**, 차감 시 **음수(-2000)**를 입력해 주세요. 모든 내역은 추적 보관됩니다.
                          </p>
                          <button
                            onClick={handleAdjustPoints}
                            disabled={isAdjusting}
                            className="px-5 py-2.5 bg-gradient-to-r from-indigo-650 to-blue-600 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-500/10 hover:opacity-95 disabled:bg-slate-400 disabled:shadow-none transition-all cursor-pointer border-0"
                          >
                            {isAdjusting ? '적용 중...' : '적용하기'}
                          </button>
                        </div>
                      </div>

                    </div>

                    {/* 적립금 상세 타임라인 */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-black text-slate-805 tracking-wider">포인트 적립 및 사용 이력 타임라인</h4>
                      
                      {pointHistory.length === 0 ? (
                        <div className="py-16 text-center bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center">
                          <Coins className="w-12 h-12 text-slate-300 mb-3" />
                          <p className="font-semibold text-slate-500">포인트 이용 내역이 아직 존재하지 않습니다.</p>
                        </div>
                      ) : (
                        <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
                          <table className="w-full text-left text-sm border-collapse">
                            <thead className="bg-slate-50/80 text-slate-655 font-semibold border-b border-slate-200/80">
                              <tr>
                                <th className="p-4">일시</th>
                                <th className="p-4">유형</th>
                                <th className="p-4">변동 포인트</th>
                                <th className="p-4">변동 후 잔액</th>
                                <th className="p-4">내용/사유</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white text-xs font-medium">
                              {pointHistory.map((history: any) => {
                                const isEarn = history.transaction_type === 'EARN';
                                const isUse = history.transaction_type === 'USE';
                                const isAmtPositive = history.amount > 0;
                                
                                return (
                                  <tr key={history.id} className="hover:bg-slate-50/60 transition-colors">
                                    <td className="p-4 text-slate-505 font-mono">
                                      {new Date(history.created_at).toLocaleString()}
                                    </td>
                                    <td className="p-4">
                                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                        isEarn
                                          ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                                          : isUse
                                          ? 'bg-rose-50 border-rose-100 text-rose-700'
                                          : 'bg-indigo-50 border-indigo-100 text-indigo-700'
                                      }`}>
                                        {isEarn ? '구매적립' : isUse ? '결제사용' : '점주조정'}
                                      </span>
                                    </td>
                                    <td className={`p-4 font-bold font-mono ${isAmtPositive ? 'text-emerald-650' : 'text-rose-650'}`}>
                                      {isAmtPositive ? `+${history.amount.toLocaleString()}` : `${history.amount.toLocaleString()}`} p
                                    </td>
                                    <td className="p-4 font-bold text-slate-700 font-mono">
                                      {Number(history.balance_after || 0).toLocaleString()} p
                                    </td>
                                    <td className="p-4 text-slate-655 font-bold">{history.description || '-'}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                  </div>
                )}

              </div>
            </>
          ) : (
            <div className="py-20 text-center flex flex-col items-center">
              <AlertCircle className="w-12 h-12 text-slate-350 mb-3" />
              <p className="font-semibold text-slate-500">데이터를 로드하는 중 오류가 발생했습니다.</p>
            </div>
          )}
        </div>

        {/* 모달 푸터 */}
        <div className="p-4 bg-slate-50/80 border-t border-slate-200/80 flex justify-end">
          <button 
            onClick={handleClose} 
            className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold transition-all shadow-xs cursor-pointer border-none"
          >
            닫기
          </button>
        </div>

      </div>
    </div>
  );
}
