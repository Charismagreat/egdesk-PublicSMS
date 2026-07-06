import { apiFetch } from '@/lib/api';
import { useState, useEffect } from "react";
import { StoreProduct, OrderForm, AppliedCoupon, VoiceStep } from "../types";

export function useStorefront() {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  // Modal State
  const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(null);
  const [form, setForm] = useState<OrderForm>({
    customerName: '',
    customerPhone: '',
    quantity: 1,
    deliveryMethod: '배송',
    shippingAddress: '',
    customerMemo: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  // Coupon State
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponError, setCouponError] = useState('');

  // 포인트 적립/사용 관련 추가 상태
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
  const [showPointGuide, setShowPointGuide] = useState(false); // 포인트 안내 모달 상태 추가
  const [pointEarningRate, setPointEarningRate] = useState<number>(1); // 포인트 적립 비율 상태 추가 (기본값 1%)

  // Voice Wizard State
  const [voiceStep, setVoiceStep] = useState<VoiceStep>('IDLE');
  const [transcript, setTranscript] = useState('');
  const [recognition, setRecognition] = useState<any>(null);
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = true;
        rec.lang = 'ko-KR';
        
        rec.onstart = () => setIsListening(true);
        rec.onend = () => setIsListening(false);
        rec.onerror = (e: any) => { console.error(e); setIsListening(false); };
        
        setRecognition(rec);
      }
    }
  }, []);

  const startListening = (onResult: (text: string) => void) => {
    if (!recognition) return alert("이 브라우저에서는 음성 인식을 지원하지 않습니다.");
    recognition.onresult = (e: any) => {
      let current = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        current += e.results[i][0].transcript;
      }
      setTranscript(current);
      if (e.results[e.results.length - 1].isFinal) {
        onResult(current);
      }
    };
    recognition.start();
  };

  const stopListening = () => {
    if (recognition) recognition.stop();
  };

  const handleVoiceOrderStart = () => {
    setVoiceStep('LISTENING_PRODUCT');
    setTranscript('');
    startListening((text) => {
      // Find matching product
      let matched = null;
      for (const p of products) {
        if (text.includes(p.name) || p.name.includes(text.replace(/\s/g, ''))) {
          matched = p;
          break;
        }
      }
      if (!matched && products.length > 0) matched = products[0]; // fallback to first
      
      if (matched) {
        setSelectedProduct(matched);
        setVoiceStep('CONFIRMING_PRODUCT');
      } else {
        alert("일치하는 상품을 찾지 못했습니다.");
        setVoiceStep('IDLE');
      }
    });
  };

  const handleConfirmProduct = (confirmed: boolean) => {
    if (confirmed) {
      setVoiceStep('LISTENING_DETAILS');
      setTranscript('');
      const allowed = selectedProduct?.available_methods ? selectedProduct.available_methods.split(',') : ['매장에서', '가져가기', '배달', '배송'];
      setForm(prev => ({...prev, deliveryMethod: allowed[0]}));
      
      startListening((text) => {
        // Parse details
        const parsedForm = { ...form };
        
        // Extract phone
        const phoneMatch = text.match(/(010|02|031|032|033|041|042|043|044|051|052|053|054|055|061|062|063|064)[\s-]*\d{3,4}[\s-]*\d{4}/);
        if (phoneMatch) parsedForm.customerPhone = phoneMatch[0].replace(/\s/g, '');
        
        // Extract delivery method
        if (text.includes("배달") && allowed.includes("배달")) parsedForm.deliveryMethod = "배달";
        else if ((text.includes("택배") || text.includes("배송")) && allowed.includes("배송")) parsedForm.deliveryMethod = "배송";
        else if ((text.includes("포장") || text.includes("가져가") || text.includes("픽업")) && allowed.includes("가져가기")) parsedForm.deliveryMethod = "가져가기";
        else if (text.includes("매장") && allowed.includes("매장에서")) parsedForm.deliveryMethod = "매장에서";
        
        // Extract quantity
        const quantityMatch = text.match(/([0-9]+)\s*(개|박스|병)/) || text.match(/(한|두|세|네|다섯)\s*(개|박스|병)/);
        if (quantityMatch) {
          const qMap: any = { '한':1, '두':2, '세':3, '네':4, '다섯':5 };
          parsedForm.quantity = parseInt(quantityMatch[1]) || qMap[quantityMatch[1]] || 1;
        }
        
        // Simple name/address logic
        if (!parsedForm.customerName) {
           const words = text.split(/\s+/);
           parsedForm.customerName = words[0].replace('입니다', '').replace('이구요', '');
        }
        if (['배달', '배송'].includes(parsedForm.deliveryMethod)) {
           // Rest of text as address roughly
           parsedForm.shippingAddress = text.replace(phoneMatch?.[0] || '', '').replace(parsedForm.customerName, '').substring(0, 50).trim();
        }
        
        // Save raw transcript
        parsedForm.customerMemo = `[음성 주문 원본]: ${text}`;
        
        setForm(parsedForm);
        setVoiceStep('IDLE'); // End wizard, show form
      });
    } else {
      setVoiceStep('IDLE');
      setSelectedProduct(null);
    }
  };

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
      const res = await apiFetch('/api/products');
      const json = await res.json();
      if (json.success) {
        const storeProducts = json.products.filter((p: any) => p.category === '스토어용' || !p.category || p.category === '일반상품');
        setProducts(storeProducts);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // 포인트 조회 핸들러
  const handleLookupPoints = async () => {
    if (!form.customerPhone) {
      setPointError('휴대폰 번호를 먼저 입력해주세요.');
      return;
    }
    setPointError('');
    setPointInfo('');
    setAppliedPoints(0);
    setIsOtpVerified(false);
    setIsOtpSent(false);

    try {
      const res = await apiFetch(`/api/points?phone=${encodeURIComponent(form.customerPhone)}`);
      const json = await res.json();
      if (json.success) {
        setPointBalance(json.balance);
        setPointCustomerId(json.customerId);
        setPointInfo(`조회 성공: 현재 보유 포인트 ${json.balance.toLocaleString()}p`);
      } else {
        // 고객 정보가 없는 경우 가상 Soft Sign-up 즉시 연동 생성
        const registerRes = await apiFetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.customerName || `온라인고객`,
            phone: form.customerPhone,
            tags: '스토어적립,임시'
          })
        });
        const registerJson = await registerRes.json();
        if (registerJson.success) {
          setPointBalance(0);
          setPointCustomerId(registerJson.id);
          setPointInfo(`단골 등록 완료! 웰컴 0p 적립되었습니다.`);
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
    if (!form.customerPhone || !usePointsInput) return;
    setPointError('');
    setPointInfo('');
    
    const pointsToUse = Number(usePointsInput);
    if (isNaN(pointsToUse) || pointsToUse <= 0) {
      setPointError('올바른 포인트를 입력하세요.');
      return;
    }

    if (pointBalance === null || pointsToUse > pointBalance) {
      setPointError(`잔액이 부족합니다. (보유: ${pointBalance || 0}p)`);
      return;
    }

    if (pointsToUse < 1000) {
      setPointError('적립금은 최소 1,000p 이상부터 사용 가능합니다.');
      return;
    }

    setIsOtpSending(true);
    try {
      const res = await apiFetch('/api/points/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', phone: form.customerPhone })
      });
      const json = await res.json();
      if (json.success) {
        setIsOtpSent(true);
        setPointInfo('인증번호(4자리)가 SMS로 정상 발송되었습니다.');
      } else {
        setPointError(json.error);
      }
    } catch (e) {
      setPointError('OTP 전송 중 오류가 발생했습니다.');
    } finally {
      setIsOtpSending(false);
    }
  };

  // OTP 인증코드 검증 및 실제 차감 할인 적용
  const handleVerifyOtp = async () => {
    if (!form.customerPhone || !otpCode) return;
    setPointError('');
    setPointInfo('');

    setIsOtpVerifying(true);
    try {
      const res = await apiFetch('/api/points/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', phone: form.customerPhone, code: otpCode })
      });
      const json = await res.json();
      if (json.success) {
        setIsOtpVerified(true);
        setAppliedPoints(Number(usePointsInput));
        setPointInfo(`인증 완료! -${Number(usePointsInput).toLocaleString()}원 할인이 최종 적용됩니다.`);
      } else {
        setPointError(json.error);
      }
    } catch (e) {
      setPointError('OTP 검증 중 오류가 발생했습니다.');
    } finally {
      setIsOtpVerifying(false);
    }
  };

  const openModal = (product: StoreProduct) => {
    setSelectedProduct(product);
    setForm({
      customerName: '',
      customerPhone: '',
      quantity: 1,
      deliveryMethod: product.available_methods ? product.available_methods.split(',')[0] : '배송',
      shippingAddress: '',
      customerMemo: ''
    });
    setCouponCode('');
    setAppliedCoupon(null);
    setCouponError('');
    setPointBalance(null);
    setPointCustomerId(null);
    setUsePointsInput('');
    setAppliedPoints(0);
    setOtpCode('');
    setIsOtpSent(false);
    setIsOtpVerified(false);
    setPointError('');
    setPointInfo('');
    setOrderSuccess(false);
  };

  const closeModal = () => {
    setSelectedProduct(null);
  };

  const getNumericPrice = (priceStr: string) => {
    if (!priceStr) return 0;
    const num = Number(priceStr.replace(/[^0-9]/g, ''));
    return isNaN(num) ? 0 : num;
  };

  const submitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    if (!form.customerName || !form.customerPhone) {
      alert("이름과 연락처를 입력해주세요.");
      return;
    }

    // 포인트 사용 금액이 지정되었으나 인증하지 않은 경우 주문 불허
    if (Number(usePointsInput) > 0 && !isOtpVerified) {
      alert("포인트 결제 할인을 적용하기 위해 SMS OTP 인증을 완료해 주세요.");
      return;
    }

    setIsSubmitting(true);
    const unitPrice = getNumericPrice(selectedProduct.price);
    const isTbd = selectedProduct.price === '상담후결정';
    const originalPrice = unitPrice * form.quantity;
    const discountAmount = appliedCoupon ? appliedCoupon.discountAmount : 0;
    const finalPrice = Math.max(0, originalPrice - discountAmount - appliedPoints);

    const totalPrice = isTbd ? '상담후결정' : finalPrice.toString();
    const status = isTbd ? '견적요청' : '결제대기';
    
    // Add coupon and point info to memo
    let memo = form.customerMemo || '';
    if (appliedCoupon && !isTbd) {
      memo += `\n[쿠폰사용: ${appliedCoupon.code} (-${discountAmount.toLocaleString()}원 할인)]`;
    }
    if (appliedPoints > 0 && !isTbd) {
      memo += `\n[포인트사용: -${appliedPoints.toLocaleString()}원 할인]`;
    }

    try {
      const res = await apiFetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: form.customerName,
          customerPhone: form.customerPhone,
          productName: selectedProduct.name,
          quantity: form.quantity.toString(),
          totalPrice,
          deliveryMethod: form.deliveryMethod,
          shippingAddress: form.shippingAddress,
          customerMemo: memo.trim(),
          status,
        })
      });
      const json = await res.json();
      if (json.success) {
        // 실제 결제 및 차감에 연계된 포인트 소모 API 호출
        if (appliedPoints > 0 && pointCustomerId && !isTbd) {
          await apiFetch('/api/points', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              customerId: pointCustomerId,
              amount: -appliedPoints, // 차감은 음수
              reason: `스토어 [${selectedProduct.name}] 결제 포인트 차감 사용`
            })
          }).catch(err => console.error('주문 성공 후 포인트 실차감 요청 실패:', err));
        }

        setOrderSuccess(true);
      } else {
        alert("주문 접수 중 오류가 발생했습니다.");
      }
    } catch (e) {
      alert("네트워크 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setCouponError('');
    const unitPrice = getNumericPrice(selectedProduct?.price || '');
    if (unitPrice === 0) {
      setCouponError('가격이 정해지지 않은 상품에는 쿠폰을 쓸 수 없습니다.');
      return;
    }
    
    const orderAmount = unitPrice * form.quantity;
    const cartItems = [
      {
        product_id: selectedProduct?.id,
        category: selectedProduct?.category || '',
        menu_category: selectedProduct?.menu_category || '',
        quantity: form.quantity,
        unit_price: unitPrice
      }
    ];
    
    try {
      const res = await apiFetch('/api/coupons/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode, orderAmount, cart_items: cartItems })
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

  const filteredProducts = products.filter((p: StoreProduct) => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return {
    products,
    searchTerm,
    setSearchTerm,
    loading,
    selectedProduct,
    setSelectedProduct,
    form,
    setForm,
    isSubmitting,
    orderSuccess,
    couponCode,
    setCouponCode,
    appliedCoupon,
    setAppliedCoupon,
    couponError,
    setCouponError,
    pointBalance,
    setPointBalance,
    pointCustomerId,
    usePointsInput,
    setUsePointsInput,
    appliedPoints,
    setAppliedPoints,
    otpCode,
    setOtpCode,
    isOtpSent,
    setIsOtpSent,
    isOtpVerified,
    setIsOtpVerified,
    pointError,
    setPointError,
    pointInfo,
    setPointInfo,
    isOtpSending,
    isOtpVerifying,
    showPointGuide,
    setShowPointGuide,
    pointEarningRate,
    voiceStep,
    setVoiceStep,
    transcript,
    isListening,
    handleVoiceOrderStart,
    handleConfirmProduct,
    stopListening,
    handleLookupPoints,
    handleRequestOtp,
    handleVerifyOtp,
    openModal,
    closeModal,
    getNumericPrice,
    submitOrder,
    handleApplyCoupon,
    filteredProducts,
  };
}
