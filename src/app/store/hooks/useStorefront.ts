import { apiFetch } from '@/lib/api';
import { useState, useEffect, useMemo } from "react";
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
    customerMemo: '',
    isTaxRequested: false,
    businessNumber: '',
    companyName: '',
    representativeName: '',
    taxEmail: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);

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

  // Cart State
  const [cart, setCart] = useState<{ product: StoreProduct; quantity: number }[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCartLoaded, setIsCartLoaded] = useState(false);
  
  // Category Filtering State
  const [selectedCategory, setSelectedCategory] = useState('전체');

  // New B2B Partner Order Gratitude Flag
  const [isNewPartnerOrder, setIsNewPartnerOrder] = useState(false);

  // 📂 B2B OCR & File Attachment States
  const [attachmentBase64, setAttachmentBase64] = useState('');
  const [attachmentFilename, setAttachmentFilename] = useState('');
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [ocrParsedTotalAmount, setOcrParsedTotalAmount] = useState<number | null>(null);
  const [ocrParsedTotalQty, setOcrParsedTotalQty] = useState<number | null>(null);

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

    // 🔔 다른 페이지(예: 예약 등)의 헤더 장바구니 버튼 클릭을 처리하는 리스너
    const handleOpenCart = () => setIsCartOpen(true);
    if (typeof window !== 'undefined') {
      window.addEventListener('open-cart', handleOpenCart);
      return () => window.removeEventListener('open-cart', handleOpenCart);
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
      const res = await apiFetch('/api/products?status=ACTIVE&limit=10000');
      const json = await res.json();
      if (json.success) {
        // status가 ACTIVE인 모든 판매 중 상품을 UI에 100% 노출 (카테고리 필터링 전면 해제)
        setProducts(json.products || []);
      }
    } catch (e) {
      console.error('Failed to fetch store products:', e);
    } finally {
      setLoading(false);
    }
  };

  // 🛒 장바구니 로컬스토리지 복구
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('egdesk_store_cart');
        if (stored) {
          setCart(JSON.parse(stored));
        }
      } catch (e) {
        console.error('Failed to load cart from localStorage:', e);
      } finally {
        setIsCartLoaded(true);
      }
    }
  }, []);

  // 🛒 장바구니 상태 변경 시 로컬스토리지 동기화 및 전역 이벤트 발생
  useEffect(() => {
    if (!isCartLoaded) return;
    if (typeof window !== 'undefined') {
      try {
        if (cart.length === 0) {
          localStorage.removeItem('egdesk_store_cart');
        } else {
          localStorage.setItem('egdesk_store_cart', JSON.stringify(cart));
        }
        window.dispatchEvent(new Event('cart-updated'));
      } catch (e) {
        console.error('Failed to save cart to localStorage:', e);
      }
    }
  }, [cart, isCartLoaded]);

  const addToCart = (product: StoreProduct, qty: number) => {
    setCart(prev => {
      const idx = prev.findIndex(item => item.product.id === product.id);
      if (idx > -1) {
        const newCart = [...prev];
        newCart[idx] = { ...newCart[idx], quantity: newCart[idx].quantity + qty };
        return newCart;
      } else {
        return [...prev, { product, quantity: qty }];
      }
    });
    alert(`🛒 장바구니에 [${product.name}] 상품 ${qty}개가 담겼습니다.`);
    closeModal();
  };

  const updateCartQuantity = (productId: string, newQty: number) => {
    if (newQty < 1) return;
    setCart(prev => 
      prev.map(item => 
        item.product.id === productId ? { ...item, quantity: newQty } : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const submitCartOrder = async (
    e: React.FormEvent,
    cartForm: OrderForm,
    cartAppliedPoints: number,
    cartPointCustomerId: number | null,
    cartAppliedCoupon: AppliedCoupon | null
  ) => {
    e.preventDefault();
    if (cart.length === 0) {
      alert("장바구니가 비어 있습니다.");
      return;
    }
    if (!cartForm.customerName || !cartForm.customerPhone) {
      alert("이름과 연락처를 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalOriginalPrice = cart.reduce((sum, item) => {
      const p = getNumericPrice(item.product.price);
      return sum + (p * item.quantity);
    }, 0);

    const couponDiscount = cartAppliedCoupon ? cartAppliedCoupon.discountAmount : 0;
    const finalCartPrice = Math.max(0, totalOriginalPrice - couponDiscount - cartAppliedPoints);

    const firstProdName = cart[0].product.name;
    const resolvedProductName = cart.length > 1 ? `${firstProdName} 외 ${cart.length - 1}건` : firstProdName;
    
    let detailedMemo = `[장바구니 통합 주문 상세]\n`;
    cart.forEach(item => {
      const unitP = getNumericPrice(item.product.price);
      detailedMemo += `- ${item.product.name} x ${item.quantity}개 (${(unitP * item.quantity).toLocaleString()}원)\n`;
    });
    if (cartForm.customerMemo) {
      detailedMemo += `\n[고객 메모]: ${cartForm.customerMemo}`;
    }
    if (cartForm.isTaxRequested) {
      detailedMemo += `\n\n[사업자 세금계산서 신청]\n- 상호명: ${cartForm.companyName || '-'}\n- 사업자번호: ${cartForm.businessNumber || '-'}\n- 대표자명: ${cartForm.representativeName || '-'}\n- 이메일: ${cartForm.taxEmail || '-'}`;
    }
    if (cartAppliedCoupon) {
      detailedMemo += `\n[쿠폰사용: ${cartAppliedCoupon.code} (-${couponDiscount.toLocaleString()}원 할인)]`;
    }
    if (cartAppliedPoints > 0) {
      detailedMemo += `\n[포인트사용: -${cartAppliedPoints.toLocaleString()}원 할인]`;
    }

    try {
      const res = await apiFetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: cartForm.customerName,
          customerPhone: cartForm.customerPhone,
          productName: resolvedProductName,
          quantity: totalQty.toString(),
          totalPrice: finalCartPrice.toString(),
          deliveryMethod: cartForm.deliveryMethod,
          shippingAddress: cartForm.shippingAddress,
          customerMemo: detailedMemo.trim(),
          status: '결제대기',
          isTaxRequested: cartForm.isTaxRequested,
          businessNumber: cartForm.businessNumber,
          companyName: cartForm.companyName,
          representativeName: cartForm.representativeName,
          taxEmail: cartForm.taxEmail,
          attachmentBase64,
          attachmentFilename
        })
      });
      const json = await res.json();
      if (json.success) {
        if (cartAppliedPoints > 0 && cartPointCustomerId) {
          await apiFetch('/api/points', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              customerId: cartPointCustomerId,
              amount: -cartAppliedPoints,
              reason: `스토어 장바구니 통합 결제 포인트 사용`
            })
          }).catch(err => console.error('장바구니 주문 성공 후 포인트 실차감 요청 실패:', err));
        }

        clearCart();
        setIsNewPartnerOrder(!!json.isNewPartner);
        setSuccessOrderId(json.id);
        setOrderSuccess(true);
        return json.id;
      } else {
        alert("주문 접수 중 오류가 발생했습니다.");
        return null;
      }
    } catch (err) {
      alert("네트워크 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
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
    setSuccessOrderId(null);
    setIsNewPartnerOrder(false);
    setAttachmentBase64('');
    setAttachmentFilename('');
    setOcrParsedTotalAmount(null);
    setOcrParsedTotalQty(null);
    setIsOcrLoading(false);
  };

  const closeModal = () => {
    setSelectedProduct(null);
    setSuccessOrderId(null);
    setIsNewPartnerOrder(false);
    setAttachmentBase64('');
    setAttachmentFilename('');
    setOcrParsedTotalAmount(null);
    setOcrParsedTotalQty(null);
    setIsOcrLoading(false);
  };

  const handleOcrUpload = async (file: File) => {
    if (!file) return;
    setIsOcrLoading(true);
    setAttachmentFilename(file.name);

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const base64Str = await base64Promise;
      setAttachmentBase64(base64Str);

      // OCR 분석 API 호출 (기존 수주서 OCR 재사용)
      const res = await apiFetch('/api/estimates/ocr-sales-order?action=analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Str,
          filename: file.name,
          mimeType: file.type
        })
      });
      
      const data = await res.json();
      if (data.success) {
        const parsed = data;

        // 1. 사업자 세금계산서 신청 및 기본 고객 정보 가입 바인딩
        const newForm = {
          customerName: parsed.partner_manager || '',
          customerPhone: parsed.partner_phone || '',
          quantity: 1,
          deliveryMethod: '배송',
          shippingAddress: parsed.address || '',
          customerMemo: `[B2B AI 발주서 자동 매칭 주문]\n- 발주번호: ${parsed.document_number || '없음'}\n- 발주일자: ${parsed.document_date || '없음'}`,
          isTaxRequested: true,
          businessNumber: parsed.business_number || '',
          companyName: parsed.partner_name || '임시 B2B 거래처',
          representativeName: parsed.representative || '',
          taxEmail: parsed.email || ''
        };

        // 2. 수량 매칭 및 단품 / 장바구니 모달 자동 팝업 분기
        let totalAmount = 0;
        let totalQty = 0;

        if (parsed.items && Array.isArray(parsed.items) && parsed.items.length > 0) {
          totalQty = parsed.items.reduce((acc: number, item: any) => acc + (Number(item.quantity) || 0), 0);
          totalAmount = parsed.items.reduce((acc: number, item: any) => acc + ((Number(item.quantity) || 0) * (Number(item.unit_price) || 0)), 0);

          if (parsed.items.length === 1) {
            // 💡 단일 품목인 경우 -> 단품 주문 모달 자동 팝업
            const firstItem = parsed.items[0];
            const firstItemName = String(firstItem.product_name || '').replace(/\s/g, '').toLowerCase();
            
            // 상점 상품 목록에서 최적 매치 찾기
            const matchedProduct = products.find(p => {
              const nameClean = String(p.name).replace(/\s/g, '').toLowerCase();
              return nameClean.includes(firstItemName) || firstItemName.includes(nameClean);
            }) || products[0]; // 없으면 첫번째 상품 폴백

            if (matchedProduct) {
              const parsedQty = Number(firstItem.quantity) || 1;
              newForm.quantity = parsedQty;
              newForm.deliveryMethod = matchedProduct.available_methods ? matchedProduct.available_methods.split(',')[0] : '배송';
              
              // 폼 세팅 및 단품 모달 오픈
              setForm(newForm);
              setSelectedProduct(matchedProduct);
            }
          } else {
            // 💡 복수 품목인 경우 -> 장바구니 맵핑 후 장바구니 모달 자동 팝업
            const newCartItems: { product: StoreProduct; quantity: number }[] = [];
            
            for (const item of parsed.items) {
              const itemNameClean = String(item.product_name || '').replace(/\s/g, '').toLowerCase();
              const matchedProd = products.find(p => {
                const nameClean = String(p.name).replace(/\s/g, '').toLowerCase();
                return nameClean.includes(itemNameClean) || itemNameClean.includes(nameClean);
              });
              
              if (matchedProd) {
                newCartItems.push({
                  product: matchedProd,
                  quantity: Number(item.quantity) || 1
                });
              }
            }
            
            // 장바구니를 파싱 상품들로 갈아끼우기 (사용자 확인 가능하도록 장바구니 갱신)
            if (newCartItems.length > 0) {
              setCart(newCartItems);
              setForm(newForm);
              setIsCartOpen(true);
            } else {
              alert("발주서 내 품목들이 상점 상품 목록과 매칭되지 않습니다.");
            }
          }
        } else {
          alert("발주서 내에서 품목 목록을 찾지 못했습니다.");
        }

        // 실물 합계와 수량 보관 (이중 가드 실물 수치 대조용)
        setOcrParsedTotalAmount(totalAmount || Number(parsed.total_amount) || null);
        setOcrParsedTotalQty(totalQty || null);

        // 기존 거래처 중복 체크 API 호출하여 정보 자동완성 트리거 보정
        if (parsed.business_number && parsed.business_number.replace(/[^0-9]/g, '').length === 10) {
          try {
            const bizCheckRes = await apiFetch(`/api/partners?action=check-biz&bizNo=${parsed.business_number.replace(/[^0-9]/g, '')}`);
            const bizCheck = await bizCheckRes.json();
            if (bizCheck.success && bizCheck.partner) {
              const p = bizCheck.partner;
              setForm(prev => ({
                ...prev,
                companyName: p.company_name || prev.companyName,
                representativeName: p.representative || prev.representativeName,
                taxEmail: p.email || prev.taxEmail,
                customerName: p.manager_name || prev.customerName,
                customerPhone: p.manager_phone || prev.customerPhone
              }));
            }
          } catch (e) {
            console.error('OCR 파싱 후 사업자번호 조회 실시간 확인 실패:', e);
          }
        }
      } else {
        alert("발주서 분석에 실패했습니다. 올바른 문서 형식인지 확인해 주세요.");
      }
    } catch (err: any) {
      alert("발주서 해독 중 오류가 발생했습니다: " + err.message);
    } finally {
      setIsOcrLoading(false);
    }
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
    if (form.isTaxRequested) {
      memo += `\n\n[사업자 세금계산서 신청]\n- 상호명: ${form.companyName || '-'}\n- 사업자번호: ${form.businessNumber || '-'}\n- 대표자명: ${form.representativeName || '-'}\n- 이메일: ${form.taxEmail || '-'}`;
    }
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
          isTaxRequested: form.isTaxRequested,
          businessNumber: form.businessNumber,
          companyName: form.companyName,
          representativeName: form.representativeName,
          taxEmail: form.taxEmail,
          attachmentBase64,
          attachmentFilename
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

        setIsNewPartnerOrder(!!json.isNewPartner);
        setSuccessOrderId(json.id);
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

  // 🏢 menu_category 기준 고유 카테고리 목록 추출 ('미분류'는 비어있을 때 폴백 및 맨 뒤 정렬)
  const categories = useMemo(() => {
    const rawCats = Array.from(new Set(products.map(p => p.menu_category || '미분류')));
    const filteredCats = rawCats.filter(c => c !== '미분류');
    const hasUnclassified = rawCats.includes('미분류');
    return ['전체', ...filteredCats, ...(hasUnclassified ? ['미분류'] : [])];
  }, [products]);

  const filteredProducts = products.filter((p: StoreProduct) => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
    if (selectedCategory === '전체') {
      return matchesSearch;
    } else if (selectedCategory === '미분류') {
      return matchesSearch && !p.menu_category;
    } else {
      return matchesSearch && p.menu_category === selectedCategory;
    }
  });

  return {
    products,
    searchTerm,
    setSearchTerm,
    loading,
    selectedCategory,
    setSelectedCategory,
    categories,
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
    cart,
    setCart,
    isCartOpen,
    setIsCartOpen,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    submitCartOrder,
    isNewPartnerOrder,
    setIsNewPartnerOrder,
    successOrderId,
    setSuccessOrderId,
    attachmentBase64,
    attachmentFilename,
    isOcrLoading,
    ocrParsedTotalAmount,
    ocrParsedTotalQty,
    handleOcrUpload,
  };
}
