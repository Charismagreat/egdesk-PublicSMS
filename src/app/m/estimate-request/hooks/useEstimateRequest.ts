"use client";

import { useState, useEffect } from "react";
import { Product, CheckStatusMsg, SelectedEstimateItem } from "../types";

export function useEstimateRequest() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 실시간 검색어 상태
  const [searchTerm, setSearchTerm] = useState("");
  
  // 장바구니 형태 수량 관리
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  
  // 고객 B2B 정보 입력 상태
  const [partnerName, setPartnerName] = useState("");
  const [partnerPhone, setPartnerPhone] = useState("");
  const [businessNumber, setBusinessNumber] = useState("");
  const [representative, setRepresentative] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  
  // 조회 및 검증 상태
  const [isCheckPerformed, setIsCheckPerformed] = useState(false);
  const [isNewPartner, setIsNewPartner] = useState(false);
  const [checkStatusMsg, setCheckStatusMsg] = useState<CheckStatusMsg | null>(null);
  
  // 사업자등록증 첨부 및 AI OCR 상태
  const [uploading, setUploading] = useState(false);
  const [licenseFileUrl, setLicenseFileUrl] = useState("");
  const [ocrScanning, setOcrScanning] = useState(false);
  const [ocrSuccessMsg, setOcrSuccessMsg] = useState("");
  
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  useEffect(() => {
    fetchEstimateProducts();
  }, []);

  const fetchEstimateProducts = async () => {
    try {
      const res = await fetch("/api/estimates");
      const data = await res.json();
      if (data.success) {
        const rawProducts = data.products;
        const resolvedProducts = (rawProducts && rawProducts.rows) 
          ? rawProducts.rows 
          : (Array.isArray(rawProducts) ? rawProducts : []);

        setProducts(resolvedProducts);
        
        // 초기 수량은 모두 0으로 세팅
        const initialQtys: Record<string, number> = {};
        resolvedProducts.forEach((p: Product) => {
          initialQtys[p.id] = 0;
        });
        setQuantities(initialQtys);
      }
    } catch (e) {
      console.error("Failed to load products:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustQuantity = (productId: string, amount: number) => {
    setQuantities(prev => {
      const current = prev[productId] || 0;
      const next = Math.max(0, current + amount);
      return { ...prev, [productId]: next };
    });
  };

  // B2B 사업자 번호 실시간 중복 가입 체크
  const handleCheckBusiness = async () => {
    if (!businessNumber.trim()) {
      alert("사업자등록번호를 입력해 주세요.");
      return;
    }
    
    const cleanedBiz = businessNumber.replace(/[^0-9]/g, "");
    if (cleanedBiz.length !== 10) {
      alert("사업자등록번호 10자리를 정확히 입력해 주세요. (예: 123-45-67890)");
      return;
    }

    setLoading(true);
    setCheckStatusMsg(null);

    try {
      const res = await fetch(`/api/partners?action=check-biz&business_number=${businessNumber}`);
      const data = await res.json();
      
      setIsCheckPerformed(true);
      if (data.success && data.exists) {
        // 이미 가입된 파트너
        const pt = data.partner;
        setIsNewPartner(false);
        setPartnerName(pt.company_name);
        setPartnerPhone(pt.phone || pt.manager_phone || "");
        setRepresentative(pt.representative || "");
        setEmail(pt.email || "");
        setAddress(pt.address || "");
        setLicenseFileUrl(pt.business_license_url || "");
        setCheckStatusMsg({
          type: 'success',
          text: `기존 B2B 등록 파트너 [${pt.company_name}] 정보가 무결하게 연결되었습니다. 추가 양식 작성 없이 바로 수량만 정해 견적 요청이 가능합니다. 🤝`
        });
      } else {
        // 미가입 신규 파트너
        setIsNewPartner(true);
        // 필드 초기화
        setPartnerName("");
        setPartnerPhone("");
        setRepresentative("");
        setEmail("");
        setAddress("");
        setLicenseFileUrl("");
        setOcrSuccessMsg("");
        setCheckStatusMsg({
          type: 'info',
          text: "등록되지 않은 B2B 파트너로 확인되었습니다. 첫 견적 요청과 거래처 등록을 위해 아래 상세 폼 작성 및 사업자등록증을 첨부해 주세요. 🎨"
        });
      }
    } catch (e) {
      alert("거래처 중복 검증 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 사업자등록증 업로드 및 Gemini Vision AI OCR 파싱 스캔
  const handleLicenseUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("최대 10MB 크기 이하의 파일만 업로드할 수 있습니다.");
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      alert("사업자등록증은 JPG, PNG, WEBP 이미지 및 PDF 형식만 첨부 가능합니다.");
      return;
    }

    setUploading(true);
    setOcrScanning(true);
    setOcrSuccessMsg("");

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;

        const ocrRes = await fetch("/api/estimates/ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: base64Data,
            filename: file.name,
            document_type: "license",
            mimeType: file.type
          })
        });

        const ocrResult = await ocrRes.json();
        if (ocrResult.success) {
          if (ocrResult.company_name) setPartnerName(ocrResult.company_name);
          if (ocrResult.representative) setRepresentative(ocrResult.representative);
          if (ocrResult.address) setAddress(ocrResult.address);
          if (ocrResult.phone) setPartnerPhone(ocrResult.phone);
          if (ocrResult.email) setEmail(ocrResult.email);

          setLicenseFileUrl(base64Data);
          setOcrSuccessMsg(`AI가 사업자등록증 정보를 완벽 해독했습니다! 상호명[${ocrResult.company_name}], 대표자[${ocrResult.representative}] 등을 자동 입력 완료했습니다. ✨`);
        } else {
          alert("AI OCR 스캔 실패: " + ocrResult.error);
        }
        setOcrScanning(false);
        setUploading(false);
      };
      
      reader.onerror = () => {
        alert("파일 읽기에 실패했습니다.");
        setOcrScanning(false);
        setUploading(false);
      };

      reader.readAsDataURL(file);

    } catch (err) {
      alert("네트워크 통신 중 오류가 발생했습니다.");
      setOcrScanning(false);
      setUploading(false);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 유효성 검사
    const selectedItems = products
      .filter(p => (quantities[p.id] || 0) > 0)
      .map(p => ({
        product_id: p.id,
        product_name: p.name,
        quantity: quantities[p.id],
        unit_price: parseFloat(p.price) || 0
      }));

    if (selectedItems.length === 0) {
      alert("최소 1개 이상의 품목의 수량을 선택해 주세요.");
      return;
    }
    if (!businessNumber.trim()) {
      alert("사업자등록번호를 입력하고 중복 조회를 완료해 주세요.");
      return;
    }
    if (!isCheckPerformed) {
      alert("[중복 조회] 버튼을 눌러 가입 여부를 먼저 확인해 주세요.");
      return;
    }

    if (isNewPartner) {
      if (!partnerName.trim()) {
        alert("상호명을 입력해 주세요. (사업자등록증 첨부 시 자동 완성)");
        return;
      }
      if (!partnerPhone.trim()) {
        alert("대표 번호/연락처를 적어주세요.");
        return;
      }
      if (!representative.trim()) {
        alert("대표자 성함을 적어주세요.");
        return;
      }
      if (!email.trim()) {
        alert("계산서 수령 이메일을 적어주세요.");
        return;
      }
      if (!address.trim()) {
        alert("사업장 주소를 적어주세요.");
        return;
      }
      if (!licenseFileUrl) {
        alert("첫 견적 요청을 접수하려면 사업자등록증 사본(이미지/PDF)을 첨부해 주세요.");
        return;
      }
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/estimates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "INBOUND",
          direction_status: "REQUESTED",
          partner_name: partnerName,
          partner_phone: partnerPhone,
          items: selectedItems,
          business_license_url: licenseFileUrl,
          
          is_new_partner: isNewPartner,
          business_number: businessNumber,
          representative: representative,
          email: email,
          address: address
        })
      });
      const data = await res.json();
      if (data.success) {
        setSubmittedId(data.estimateId);
      } else {
        alert("신청 실패: " + data.error);
      }
    } catch (err) {
      alert("전송 중 네트워크 에러가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = products.filter((p) => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return {
    products,
    loading,
    searchTerm, setSearchTerm,
    quantities, setQuantities,
    partnerName, setPartnerName,
    partnerPhone, setPartnerPhone,
    businessNumber, setBusinessNumber,
    representative, setRepresentative,
    email, setEmail,
    address, setAddress,
    isCheckPerformed,
    isNewPartner,
    checkStatusMsg,
    uploading,
    licenseFileUrl,
    ocrScanning,
    ocrSuccessMsg,
    submitting,
    submittedId,
    filteredProducts,
    handleAdjustQuantity,
    handleCheckBusiness,
    handleLicenseUpload,
    handleSubmitRequest
  };
}
