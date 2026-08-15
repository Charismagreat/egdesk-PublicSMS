"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Users, 
  Clock, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  BellRing, 
  XCircle,
  UtensilsCrossed,
  Sparkles,
  ShoppingBag,
  Plus,
  Minus,
  X,
  ChevronRight,
  Timer
} from "lucide-react";

export default function CustomerWaitingStatusPage() {
  const params = useParams();
  const router = useRouter();
  const waitingId = params?.id as string;

  const [waitingData, setWaitingData] = useState<any>(null);
  const [aheadCount, setAheadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // ⏱️ 5분 입장 타이머 카운트다운
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  // 🍽️ 사전 메뉴 주문(Pre-order) 모달 및 장바구니 상태
  const [isPreOrderModalOpen, setIsPreOrderModalOpen] = useState<boolean>(false);
  const [productList, setProductList] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("전체");
  const [cart, setCart] = useState<{ [productId: string]: { item: any; quantity: number } }>({});
  const [submittingPreOrder, setSubmittingPreOrder] = useState<boolean>(false);

  // 대기 상태 단건 조회 함수
  const fetchStatus = async () => {
    if (!waitingId) return;
    try {
      setRefreshing(true);
      const res = await fetch(`/api/waitings?id=${waitingId}`);
      if (!res.ok) return;
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) return;
      const data = await res.json();
      if (data.success && data.waiting) {
        setWaitingData(data.waiting);
        setAheadCount(data.aheadCount || 0);

        // 만약 방금 호출(CALLED)되었을 때 진동 알림
        if (data.waiting.status === 'CALLED' && typeof window !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate([200, 100, 200, 100, 400]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch waiting status:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [waitingId]);

  // 메뉴(상품) 목록 로드 - 테이블용 메뉴만 엄격 필터링
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = await fetch('/api/products?all=true');
        if (!res.ok) return;
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) return;
        const json = await res.json();
        if (json.success && Array.isArray(json.products)) {
          // 💡 테이블오더 전용 상품('테이블용')만 필터링
          const tableOnly = json.products.filter((p: any) => 
            p.category === '테이블용' || (p.category && p.category.includes('테이블'))
          );
          setProductList(tableOnly);
        }
      } catch (err) {
        console.error('Failed to load products for pre-order:', err);
      }
    };
    loadProducts();
  }, []);

  // 5분 카운트다운 타이머 계산
  useEffect(() => {
    if (waitingData?.status === 'CALLED' && waitingData?.called_at) {
      const calledTime = new Date(waitingData.called_at.replace(' ', 'T')).getTime();
      const expireTime = calledTime + 5 * 60 * 1000;

      const updateTimer = () => {
        const now = Date.now();
        const diff = Math.max(0, Math.floor((expireTime - now) / 1000));
        setRemainingSeconds(diff);
      };

      updateTimer();
      const timerInterval = setInterval(updateTimer, 1000);
      return () => clearInterval(timerInterval);
    } else {
      setRemainingSeconds(null);
    }
  }, [waitingData?.status, waitingData?.called_at]);

  // 장바구니 수량 조절
  const handleUpdateCart = (product: any, delta: number) => {
    setCart(prev => {
      const current = prev[product.id]?.quantity || 0;
      const nextQty = current + delta;
      if (nextQty <= 0) {
        const next = { ...prev };
        delete next[product.id];
        return next;
      }
      return {
        ...prev,
        [product.id]: {
          item: product,
          quantity: nextQty
        }
      };
    });
  };

  // 장바구니 계산
  const cartItems = Object.values(cart);
  const cartTotalQty = cartItems.reduce((sum, i) => sum + i.quantity, 0);
  const cartTotalAmount = cartItems.reduce((sum, i) => {
    const p = Number(String(i.item.price || '0').replace(/[^0-9]/g, ''));
    return sum + p * i.quantity;
  }, 0);

  // 사전 주문 제출
  const handleSubmitPreOrder = async () => {
    if (cartItems.length === 0) {
      alert('주문하실 메뉴를 1개 이상 담아주세요.');
      return;
    }

    setSubmittingPreOrder(true);
    try {
      const orderItems = cartItems.map(c => ({
        id: c.item.id,
        name: c.item.name,
        price: Number(String(c.item.price || '0').replace(/[^0-9]/g, '')),
        quantity: c.quantity
      }));

      const res = await fetch('/api/waitings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: waitingId,
          action: 'pre_order',
          preOrders: orderItems,
          preOrderTotal: cartTotalAmount
        })
      });

      const data = await res.json();
      if (data.success) {
        alert('사전 메뉴 주문이 접수되었습니다! 착석 시 테이블로 자동 전달됩니다.');
        setIsPreOrderModalOpen(false);
        fetchStatus();
      } else {
        alert(data.error || '사전 주문 저장에 실패했습니다.');
      }
    } catch (e) {
      alert('사전 주문 중 오류가 발생했습니다.');
    } finally {
      setSubmittingPreOrder(false);
    }
  };

  // 대기 취소 처리
  const handleCancel = async () => {
    if (!confirm('대기를 취소하시겠습니까? 취소 후에는 다시 등록하셔야 합니다.')) {
      return;
    }
    try {
      const res = await fetch('/api/waitings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: waitingId, action: 'cancel' })
      });
      const data = await res.json();
      if (data.success) {
        alert('대기가 취소되었습니다.');
        router.push('/waiting');
      }
    } catch (err) {
      alert('취소 처리 중 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-600 text-sm font-bold">대기 정보를 불러오는 중입니다...</p>
        </div>
      </div>
    );
  }

  if (!waitingData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center space-y-4 border border-slate-200 shadow-sm">
          <XCircle className="w-12 h-12 text-slate-400 mx-auto" />
          <h2 className="text-lg font-black text-slate-800">대기 정보를 찾을 수 없습니다</h2>
          <p className="text-xs text-slate-500">이미 취소되었거나 유효하지 않은 대기표입니다.</p>
          <button
            onClick={() => router.push('/waiting')}
            className="w-full py-3 bg-orange-600 text-white font-bold text-xs rounded-xl border-0 cursor-pointer"
          >
            새로 대기 등록하기
          </button>
        </div>
      </div>
    );
  }

  const isCalled = waitingData.status === 'CALLED';
  const isSeated = waitingData.status === 'SEATED';
  const isCancelled = waitingData.status === 'CANCELLED';

  // 파싱된 기존 사전 주문 내역
  let existingPreOrders: any[] = [];
  if (waitingData.pre_orders) {
    try {
      existingPreOrders = typeof waitingData.pre_orders === 'string' ? JSON.parse(waitingData.pre_orders) : waitingData.pre_orders;
    } catch (e) {}
  }

  // 메뉴 서브 카테고리 추출
  const menuCategories = Array.from(new Set(
    productList.map(p => p.menu_category || p.menuGroup || p.sub_category || "").filter(Boolean)
  ));
  const categories = menuCategories.length > 0 ? ["전체", ...menuCategories] : [];
  const filteredProducts = activeCategory === "전체" || categories.length === 0
    ? productList 
    : productList.filter(p => (p.menu_category || p.menuGroup || p.sub_category) === activeCategory);

  // 타이머 분:초 포맷
  const timerMinutes = remainingSeconds !== null ? Math.floor(remainingSeconds / 60) : 0;
  const timerSecs = remainingSeconds !== null ? remainingSeconds % 60 : 0;
  const formattedTimer = `${String(timerMinutes).padStart(2, '0')}:${String(timerSecs).padStart(2, '0')}`;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between py-6 px-4 sm:px-6">
      <div className="max-w-md mx-auto w-full space-y-5">
        
        {/* 상단 헤더 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600">
              <UtensilsCrossed className="w-4 h-4" />
            </div>
            <span className="text-sm font-black text-slate-900">모바일 대기표</span>
          </div>

          <button
            onClick={fetchStatus}
            disabled={refreshing}
            className="p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-orange-600' : ''}`} />
            <span>새로고침</span>
          </button>
        </div>

        {/* 🚨 1. 입장 호출 알림 배너 + 5분 입장 타이머 (호출되었을 때) */}
        {isCalled && (
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white rounded-3xl p-6 shadow-xl shadow-emerald-600/20 text-center space-y-3 animate-fade-in">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-white/20 rounded-2xl animate-bounce">
              <BellRing className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-2xl font-black">테이블이 준비되었습니다!</h2>
            <p className="text-emerald-100 text-xs font-medium">
              지금 매장 카운터로 입장해 주시기 바랍니다.
            </p>

            {/* ⏱️ 5분 유예 카운트다운 타이머 */}
            {remainingSeconds !== null && (
              <div className="bg-black/20 backdrop-blur-md rounded-2xl py-3 px-4 inline-flex items-center gap-2.5 border border-white/20 shadow-inner">
                <Timer className="w-4 h-4 text-amber-300 animate-pulse" />
                <span className="text-xs font-bold text-emerald-100">입장 유예 시간:</span>
                <span className={`text-base font-black tracking-wider ${remainingSeconds < 60 ? 'text-rose-300 animate-ping' : 'text-white'}`}>
                  {formattedTimer}
                </span>
              </div>
            )}
          </div>
        )}

        {/* 2. 착석 완료 안내 */}
        {isSeated && (
          <div className="bg-slate-900 text-white rounded-3xl p-6 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <h2 className="text-xl font-black">착석이 완료되었습니다</h2>
            <p className="text-slate-400 text-xs">
              {waitingData.assigned_table ? `테이블 ${waitingData.assigned_table}번에 착석하셨습니다.` : '즐거운 식사 되세요!'}
            </p>
          </div>
        )}

        {/* 3. 대기표 메인 카드 */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm text-center space-y-6 relative overflow-hidden">
          
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400">내 대기 번호</span>
            <div className="text-6xl font-black text-orange-600 tracking-tight flex items-center justify-center gap-2">
              <span>{waitingData.waiting_no}</span>
              <span className="text-2xl text-slate-400 font-bold">번</span>
            </div>
            <p className="text-slate-600 font-bold text-xs pt-1">
              {waitingData.customer_name} ({waitingData.party_size}명)
            </p>
          </div>

          {/* 내 앞 대기 팀 현황 */}
          {!isCalled && !isSeated && !isCancelled && (
            <div className="bg-orange-50/80 rounded-2xl p-5 border border-orange-200/60 space-y-1">
              <span className="text-xs font-bold text-orange-800">현재 내 앞 대기</span>
              <div className="text-3xl font-black text-slate-900">
                {aheadCount === 0 ? (
                  <span className="text-orange-650 flex items-center justify-center gap-1">
                    <Sparkles className="w-5 h-5" />
                    다음 입장 차례입니다!
                  </span>
                ) : (
                  <span>{aheadCount}팀</span>
                )}
              </div>
              <p className="text-[11px] text-orange-700 font-medium pt-1">
                예상 대기 시간: 약 {Math.max(3, aheadCount * 8)}분
              </p>
            </div>
          )}

          {/* 🍽️ 사전 메뉴 주문(Pre-order) 섹션 */}
          {!isSeated && !isCancelled && (
            <div className="border border-orange-200 bg-orange-50/40 rounded-2xl p-4 text-left space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-orange-600" />
                  기다리는 동안 메뉴 사전 주문
                </span>
                {existingPreOrders.length > 0 && (
                  <span className="text-[10px] font-extrabold bg-orange-600 text-white px-2 py-0.5 rounded-full">
                    접수 완료
                  </span>
                )}
              </div>

              {existingPreOrders.length > 0 ? (
                <div className="space-y-1.5 bg-white p-3 rounded-xl border border-orange-100 text-xs">
                  {existingPreOrders.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-slate-700">
                      <span>{item.name} × {item.quantity}</span>
                      <span className="font-bold">{(item.price * item.quantity).toLocaleString()}원</span>
                    </div>
                  ))}
                  <div className="border-t border-slate-100 pt-1.5 flex justify-between items-center font-black text-orange-600">
                    <span>사전 주문 합계</span>
                    <span>{Number(waitingData.pre_order_total || 0).toLocaleString()}원</span>
                  </div>
                  <p className="text-[10px] text-slate-400 pt-1">
                    ✓ 착석 시 해당 테이블로 주문이 자동 전달됩니다.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  메뉴를 미리 골라두시면 착석 즉시 주방으로 전달되어 빠르게 식사하실 수 있습니다.
                </p>
              )}

              <button
                type="button"
                onClick={() => setIsPreOrderModalOpen(true)}
                className="w-full py-3 bg-white hover:bg-orange-50 text-orange-700 border border-orange-300 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <span>{existingPreOrders.length > 0 ? '사전 주문 메뉴 변경하기' : '메뉴 미리 주문하기'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* 접수 상세 정보 */}
          <div className="border-t border-slate-100 pt-4 text-xs text-slate-500 space-y-2 text-left">
            <div className="flex justify-between">
              <span className="text-slate-400">접수 일시</span>
              <span className="font-bold text-slate-700">{waitingData.created_at || '방금'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">연락처</span>
              <span className="font-bold text-slate-700">{waitingData.customer_phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">상태</span>
              <span className={`font-black px-2 py-0.5 rounded-md text-[10px] ${
                isCalled ? 'bg-emerald-100 text-emerald-800' :
                isSeated ? 'bg-slate-200 text-slate-800' :
                isCancelled ? 'bg-red-100 text-red-700' :
                'bg-amber-100 text-amber-900'
              }`}>
                {isCalled ? '입장 호출 중' : isSeated ? '착석 완료' : isCancelled ? '대기 취소' : '대기 접수중'}
              </span>
            </div>
          </div>

          {/* 대기 취소 버튼 */}
          {!isSeated && !isCancelled && (
            <button
              onClick={handleCancel}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-2xl transition-all border-0 cursor-pointer"
            >
              대기 취소하기
            </button>
          )}

        </div>

        {/* 안내문구 */}
        <div className="bg-slate-100/80 rounded-2xl p-4 text-[11px] text-slate-500 space-y-1">
          <p className="font-bold text-slate-700 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-orange-600" />
            유의사항
          </p>
          <p>• 호출 문자를 받으신 후 5분 내로 매장에 오지 않으시면 다음 순서로 넘어갑니다.</p>
          <p>• 새로고침 버튼을 누르시면 실시간으로 대기 순서를 확인하실 수 있습니다.</p>
        </div>

      </div>

      {/* 🍽️ 사전 메뉴 주문 팝업 모달 */}
      {isPreOrderModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 relative max-h-[90vh] flex flex-col">
            
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">메뉴 사전 주문</h3>
                  <p className="text-[11px] text-slate-400">착석 시 해당 테이블로 자동 전달됩니다.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPreOrderModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors border-0 bg-transparent cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 카테고리 탭 (2개 이상 있을 때만 노출) */}
            {categories.length > 1 && (
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none shrink-0">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
                      activeCategory === cat
                        ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {/* 메뉴 리스트 */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin">
              {filteredProducts.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs font-bold">
                  등록된 메뉴가 없습니다.
                </div>
              ) : (
                filteredProducts.map((p) => {
                  const pPrice = Number(String(p.price || '0').replace(/[^0-9]/g, ''));
                  const currentQty = cart[p.id]?.quantity || 0;

                  return (
                    <div
                      key={p.id}
                      className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3 transition-all"
                    >
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <h4 className="text-xs font-black text-slate-900 truncate">{p.name}</h4>
                        <p className="text-xs font-bold text-orange-650">{pPrice.toLocaleString()}원</p>
                      </div>

                      {/* 수량 조절 버튼 */}
                      <div className="flex items-center gap-2 shrink-0">
                        {currentQty > 0 ? (
                          <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-xl border border-slate-200 shadow-2xs">
                            <button
                              type="button"
                              onClick={() => handleUpdateCart(p, -1)}
                              className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 border-0 cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-black text-slate-900 w-4 text-center">{currentQty}</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateCart(p, 1)}
                              className="w-6 h-6 rounded-lg bg-orange-600 hover:bg-orange-700 flex items-center justify-center text-white border-0 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleUpdateCart(p, 1)}
                            className="px-3 py-1.5 bg-white hover:bg-orange-50 text-orange-600 border border-orange-300 font-bold text-xs rounded-xl transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>담기</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* 모달 하단 장바구니 바 및 제출 */}
            <div className="border-t border-slate-100 pt-3 shrink-0 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-bold">선택 품목: <span className="text-slate-900 font-black">{cartTotalQty}개</span></span>
                <span className="text-sm font-black text-orange-600">{cartTotalAmount.toLocaleString()}원</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPreOrderModalOpen(false)}
                  className="px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl border-0 cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="button"
                  disabled={submittingPreOrder || cartTotalQty === 0}
                  onClick={handleSubmitPreOrder}
                  className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-black text-xs rounded-xl border-0 cursor-pointer shadow-md shadow-orange-600/20 transition-all flex items-center justify-center gap-1.5"
                >
                  {submittingPreOrder ? '저장 중...' : `${cartTotalQty}개 메뉴 사전 주문 접수하기`}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      <footer className="text-center text-[10px] text-slate-400 py-4">
        © EGDESK Smart Waiting System
      </footer>
    </div>
  );
}
