"use client";

import { apiFetch } from '@/lib/api';
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { verifyTableToken } from "@/lib/table-token-helper";

export function useTableOrder() {
  const { tableId } = useParams();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("전체");
  
  // 실시간 검색어 상태
  const [searchTerm, setSearchTerm] = useState("");

  const [cart, setCart] = useState<CartState>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  
  // 보안 토큰 유효성 상태
  const [isTokenValid, setIsTokenValid] = useState<boolean>(true);
  const [tokenError, setTokenError] = useState<string>('');

  // 쿠폰 상태
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponError, setCouponError] = useState('');

  // 포인트 적립/사용 관련 상태
  const [phoneForPoints, setPhoneForPoints] = useState('010-');
  const [pointBalance, setPointBalance] = useState<number | null>(null);
  const [pointCustomerId, setPointCustomerId] = useState<number | null>(null);
  const [usePointsInput, setUsePointsInput] = useState('');
  const [appliedPoints, setAppliedPoints] = useState<number>(0);
  const [otpCode, setOtpCode] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [pointError, setPointError] = useState('');
  const [pointInfo, setPointInfo] = useState('');
  const [isOtpSending, setIsOtpSending] = useState(false);
  const [isOtpVerifying, setIsOtpVerifying] = useState(false);
  const [showPointGuide, setShowPointGuide] = useState(false); // 포인트 안내 팝업 상태
  const [pointEarningRate, setPointEarningRate] = useState<number>(1); // 포인트 적립 비율 (기본값 1%)

  // 테넌트 ID 상태
  const [tenantId, setTenantId] = useState<string>('default');

  // 보안 토큰 및 관리자 세션 검증
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    const tenantParam = urlParams.get('tenantId') || urlParams.get('tenant');
    const tableStr = String(tableId || '');

    if (tenantParam) {
      setTenantId(tenantParam);
      sessionStorage.setItem(`table_tenant_${tableStr}`, tenantParam);
    } else {
      const savedTenant = sessionStorage.getItem(`table_tenant_${tableStr}`);
      if (savedTenant) setTenantId(savedTenant);
    }

    const checkAccess = async () => {
      // 1. 👑 관리자/직원 로그인 세션 확인 (관리자는 보안 토큰 없이도 주문 페이지 자유 접근 허용)
      try {
        const meRes = await apiFetch('/api/auth/me');
        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.user || meData.success) {
            setIsTokenValid(true);
            setTokenError('');
            if (meData.tenant_id) {
              setTenantId(meData.tenant_id);
              sessionStorage.setItem(`table_tenant_${tableStr}`, meData.tenant_id);
            }
            return;
          }
        }
      } catch (e) {
        // 비로그인 손님인 경우 계속 진행
      }

      // 2. 🔒 비로그인 고객의 경우 QR 보안 토큰 검증
      const sessionTokenKey = `table_token_${tableStr}`;
      const savedToken = sessionStorage.getItem(sessionTokenKey);
      const activeToken = tokenParam || savedToken;

      if (activeToken && verifyTableToken(tableStr, activeToken)) {
        setIsTokenValid(true);
        setTokenError('');
        sessionStorage.setItem(sessionTokenKey, activeToken);
        
        // 🎨 주소창 URL 마스킹 (History API State Masking - token 파라미터를 숨김)
        if (tokenParam) {
          const cleanUrl = `${window.location.pathname}`;
          window.history.replaceState({}, '', cleanUrl);
        }
      } else {
        setIsTokenValid(false);
        setTokenError(`⚠️ 유효하지 않은 접근이거나 보안 토큰이 일치하지 않습니다. 올바른 테이블 ${tableStr}번 QR 코드를 다시 스캔해 주세요.`);
      }
    };

    checkAccess();
  }, [tableId]);

  useEffect(() => {
    fetchProducts();
    fetchPointEarningRate();
  }, []);

  const fetchPointEarningRate = async () => {
    try {
      const res = await apiFetch('/api/settings?key=point_earning_rate');
      const data = await res.json();
      if (data.success && data.value !== null) {
        const rateVal = Number(data.value);
        if (!isNaN(rateVal)) {
          setPointEarningRate(rateVal);
        }
      }
    } catch (e) {
      console.error('Failed to fetch point earning rate:', e);
    }
  };

  const fetchProducts = async () => {
    try {
      // ⚡ 백엔드 API 라우트 자체에서 전체 전량 수집(all=true)을 처리하여 1회 DB 통신으로 수집
      const res = await apiFetch('/api/products?all=true');
      const json = await res.json();
      
      if (json.success && Array.isArray(json.products)) {
        const allProducts: Product[] = json.products;

        // 1차: '테이블용' 카테고리가 지정된 상품만 필터링
        const tableOrderProducts = allProducts.filter((p: any) => 
          p.category === '테이블용'
        );
        
        // 2차 스마트 폴백: '테이블용'으로 지정된 메뉴가 1개 이상이면 전용 메뉴판 노출,
        // 지정된 '테이블용' 메뉴가 0개라면 사장님이 등록하신 전체 활성 상품 목록을 자동 노출
        if (tableOrderProducts.length > 0) {
          setProducts(tableOrderProducts);
        } else {
          setProducts(allProducts);
        }
      }
    } catch (e) {
      console.error("테이블오더 상품 목록 로드 실패:", e);
    } finally {
      // ⚡ 로딩 완료 가드 해제
      setLoading(false);
    }
  };

  const getNumericPrice = (priceStr: string) => {
    if (!priceStr) return 0;
    const num = Number(priceStr.replace(/[^0-9]/g, ''));
    return isNaN(num) ? 0 : num;
  };

  const updateCart = (productId: string, delta: number) => {
    setCart(prev => {
      const current = prev[productId] || 0;
      const next = Math.max(0, current + delta);
      const newCart = { ...prev };
      if (next === 0) delete newCart[productId];
      else newCart[productId] = next;
      return newCart;
    });
  };

  const clearCart = () => {
    setCart({});
    setCouponCode('');
    setAppliedCoupon(null);
    setCouponError('');
    setPhoneForPoints('010-');
    setPointBalance(null);
    setPointCustomerId(null);
    setUsePointsInput('');
    setAppliedPoints(0);
    setOtpCode('');
    setIsOtpSent(false);
    setIsOtpVerified(false);
    setPointError('');
    setPointInfo('');
  };

  const resetPointState = () => {
    setPhoneForPoints('010-');
    setPointBalance(null);
    setPointCustomerId(null);
    setUsePointsInput('');
    setAppliedPoints(0);
    setOtpCode('');
    setIsOtpSent(false);
    setIsOtpVerified(false);
    setPointError('');
    setPointInfo('');
  };

  const categories = ['전체', ...Array.from(new Set(products.map(p => p.menu_category).filter((x): x is string => !!x)))];

  const filteredProducts = (activeCategory === "전체" 
    ? products 
    : products.filter(p => p.menu_category === activeCategory)
  ).filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const cartItemsCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotalAmount = Object.entries(cart).reduce((total, [id, qty]) => {
    const p = products.find(prod => prod.id === id);
    if (!p) return total;
    return total + (getNumericPrice(p.price) * qty);
  }, 0);

  // 실결제 최종 예정금액 및 예상 적립 포인트 실시간 계산 (동적 적립률 적용)
  const finalEarningBasis = Math.max(0, cartTotalAmount - (appliedCoupon ? appliedCoupon.discountAmount : 0) - appliedPoints);
  const expectedPoints = Math.floor(finalEarningBasis * (pointEarningRate / 100));

  // 포인트 조회 핸들러
  const handleLookupPoints = async () => {
    if (!phoneForPoints) return;
    setPointError('');
    setPointInfo('');
    setAppliedPoints(0);
    setIsOtpVerified(false);
    setIsOtpSent(false);

    try {
      const res = await apiFetch(`/api/points?phone=${encodeURIComponent(phoneForPoints)}`);
      const json = await res.json();
      if (json.success) {
        setPointBalance(json.balance);
        setPointCustomerId(json.customerId);
        setPointInfo(`조정/확인 완료: 현재 보유 포인트 ${json.balance.toLocaleString()}p`);
      } else {
        // 고객 정보가 없는 경우 즉시 Soft Sign-up 가상 생성 처리 연동
        const registerRes = await apiFetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `단골_${phoneForPoints.slice(-4)}`,
            phone: phoneForPoints,
            tags: '테이블적립,임시'
          })
        });
        const registerJson = await registerRes.json();
        if (registerJson.success) {
          setPointBalance(0);
          setPointCustomerId(registerJson.id);
          setPointInfo(`단골 등록 성공! 웰컴 0p 적립되었습니다.`);
        } else {
          setPointError('적립 회원 조회 중 오류가 발생했습니다.');
        }
      }
    } catch (e) {
      setPointError('서버 연결 중 오류가 발생했습니다.');
    }
  };

  // 포인트 적용 및 OTP 발송
  const handleRequestOtp = async () => {
    if (!phoneForPoints) {
      alert('휴대전화번호를 입력해 주세요.');
      return;
    }
    if (!usePointsInput) {
      alert('사용할 포인트를 입력해 주세요.');
      return;
    }
    
    setPointError('');
    setPointInfo('');
    
    const pointsToUse = Number(usePointsInput);
    if (isNaN(pointsToUse) || pointsToUse <= 0) {
      const errMsg = '올바른 포인트를 입력하세요.';
      setPointError(errMsg);
      alert(errMsg);
      return;
    }

    if (pointBalance === null || pointsToUse > pointBalance) {
      const errMsg = `사용 가능한 포인트 잔액이 부족합니다. (현재 보유: ${pointBalance || 0}p)`;
      setPointError(errMsg);
      alert(errMsg);
      return;
    }

    if (pointsToUse < 1000) {
      const errMsg = '적립금은 최소 1,000p 이상부터 사용 가능합니다.';
      setPointError(errMsg);
      alert(errMsg);
      return;
    }

    setIsOtpSending(true);
    try {
      const res = await apiFetch('/api/points/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', phone: phoneForPoints })
      });
      const json = await res.json();
      if (json.success) {
        setIsOtpSent(true);
        if (json.testCode) {
          setPointInfo(`인증번호(4자리)가 발급되었습니다. (테스트 번호: ${json.testCode})`);
          alert(`[인증번호 발송 완료]\n\n테스트용 인증번호는 [${json.testCode}] 입니다.\n아래 인증번호 입력 칸에 입력 후 승인해 주세요.`);
        } else {
          setPointInfo('인증번호(4자리)가 SMS로 정상 발급되었습니다.');
          alert('인증번호(4자리)가 문자로 발송되었습니다.\n아래 입력 칸에 수신된 번호를 입력하세요.');
        }
      } else {
        const errMsg = json.error || '인증번호 발송에 실패했습니다.';
        setPointError(errMsg);
        alert(errMsg);
      }
    } catch (e) {
      setPointError('OTP 전송 중 오류가 발생했습니다.');
      alert('OTP 전송 중 네트워크 오류가 발생했습니다.');
    } finally {
      setIsOtpSending(false);
    }
  };

  // OTP 인증코드 검증 및 실제 차감 할인 적용
  const handleVerifyOtp = async () => {
    if (!phoneForPoints || !otpCode) return;
    setPointError('');
    setPointInfo('');

    setIsOtpVerifying(true);
    try {
      const res = await apiFetch('/api/points/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', phone: phoneForPoints, code: otpCode })
      });
      const json = await res.json();
      if (json.success) {
        setIsOtpVerified(true);
        setAppliedPoints(Number(usePointsInput));
        setPointInfo(`본인인증 완료! -${Number(usePointsInput).toLocaleString()}원 할인이 최종 적용됩니다.`);
      } else {
        setPointError(json.error);
      }
    } catch (e) {
      setPointError('OTP 검증 처리 중 오류가 발생했습니다.');
    } finally {
      setIsOtpVerifying(false);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setCouponError('');
    if (cartTotalAmount === 0) return;
    
    const cartItems = Object.entries(cart).map(([id, qty]) => {
      const p = products.find(prod => prod.id === id);
      return {
        product_id: id,
        category: p?.category || '',
        menu_category: p?.menu_category || '',
        quantity: qty,
        unit_price: p ? getNumericPrice(p.price) : 0
      };
    }).filter(item => item.unit_price > 0);

    try {
      const res = await apiFetch('/api/coupons/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode, orderAmount: cartTotalAmount, cart_items: cartItems })
      });
      const json = await res.json();
      
      if (json.success) {
        setAppliedCoupon(json.coupon);
      } else {
        setAppliedCoupon(null);
        setCouponError(json.error);
      }
    } catch(e) {
      setCouponError('쿠폰 조회 중 오류가 발생했습니다.');
    }
  };

  const submitOrder = async () => {
    if (cartItemsCount === 0) return;
    
    if (!isTokenValid) {
      alert("⚠️ 보안 토큰이 불일치하거나 거부된 접근입니다. 올바른 테이블 QR 코드를 새로 스캔해 주세요.");
      return;
    }

    // 포인트 사용 금액이 적용되었으나 인증되지 않은 상태 차단
    if (Number(usePointsInput) > 0 && !isOtpVerified) {
      alert("포인트 차감 결제를 위해 SMS OTP 인증을 먼저 진행해 주세요.");
      return;
    }

    setIsSubmitting(true);

    const orderedItems = Object.entries(cart).map(([id, qty]) => {
      const p = products.find(prod => prod.id === id);
      return { product: p, qty };
    }).filter((i): i is { product: Product; qty: number } => !!i.product);

    if (orderedItems.length === 0) {
      setIsSubmitting(false);
      return;
    }

    const firstItemName = orderedItems[0].product.name;
    const productName = orderedItems.length > 1 ? `${firstItemName} 외 ${orderedItems.length - 1}건` : firstItemName;
    let customerMemo = orderedItems.map(i => `${i.product.name} ${i.qty}개`).join('\n');
    
    const originalPrice = cartTotalAmount;
    const discountAmount = appliedCoupon ? appliedCoupon.discountAmount : 0;
    const finalPrice = Math.max(0, originalPrice - discountAmount - appliedPoints);

    if (appliedCoupon) {
      customerMemo += `\n[쿠폰사용: ${appliedCoupon.code} (-${discountAmount.toLocaleString()}원 할인)]`;
    }
    if (appliedPoints > 0) {
      customerMemo += `\n[포인트차감: -${appliedPoints.toLocaleString()}원 사용]`;
    }
    
    try {
      const res = await apiFetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId || 'default',
          customerName: `테이블 ${tableId}번`,
          customerPhone: phoneForPoints || '010-0000-0000',
          productName,
          quantity: cartItemsCount.toString(),
          totalPrice: finalPrice.toString(),
          deliveryMethod: '매장에서',
          shippingAddress: '',
          customerMemo,
          status: '결제대기'
        })
      });
      const json = await res.json();
      if (json.success) {
        // 실제 결제 및 차감에 연계된 포인트 소모 API 호출
        if (appliedPoints > 0 && pointCustomerId) {
          await apiFetch('/api/points', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              customerId: pointCustomerId,
              amount: -appliedPoints,
              reason: `테이블오더 [T-${tableId}] 결제 포인트 차감 사용`
            })
          }).catch(err => console.error('주문 성공 후 포인트 실차감 요청 실패:', err));
        }

        setOrderSuccess(true);
        setCart({});
        setCouponCode('');
        setAppliedCoupon(null);
        setCouponError('');
        setPhoneForPoints('010-');
        setPointBalance(null);
        setPointCustomerId(null);
        setUsePointsInput('');
        setAppliedPoints(0);
        setOtpCode('');
        setIsOtpSent(false);
        setIsOtpVerified(false);
        setPointError('');
        setPointInfo('');
        
        setTimeout(() => {
          setOrderSuccess(false);
        }, 3000);
      } else {
        alert(json.error || "주문 접수 중 오류가 발생했습니다.");
      }
    } catch (e) {
      alert("네트워크 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    tableId,
    products,
    loading,
    isTokenValid,
    tokenError,
    activeCategory, setActiveCategory,
    searchTerm, setSearchTerm,
    cart,
    updateCart,
    clearCart,
    resetPointState,
    categories,
    filteredProducts,
    cartItemsCount,
    cartTotalAmount,
    finalEarningBasis,
    expectedPoints,
    phoneForPoints, setPhoneForPoints,
    pointBalance,
    pointCustomerId,
    usePointsInput, setUsePointsInput,
    appliedPoints,
    otpCode, setOtpCode,
    isOtpSent, setIsOtpSent,
    isOtpVerified,
    pointError,
    pointInfo,
    isOtpSending,
    isOtpVerifying,
    showPointGuide, setShowPointGuide,
    pointEarningRate,
    couponCode, setCouponCode,
    appliedCoupon, setAppliedCoupon,
    couponError,
    handleLookupPoints,
    handleRequestOtp,
    handleVerifyOtp,
    handleApplyCoupon,
    submitOrder,
    isSubmitting,
    orderSuccess, setOrderSuccess,
    getNumericPrice
  };
}
