"use client";

import { apiFetch } from '@/lib/api';
import React, { useState, useEffect, useRef } from "react";
import { usePersistedState } from "@/hooks/usePersistedState";
import { 
  Plus, Trash2, Printer, Mail, Send, Check, RefreshCw, 
  ArrowLeft, FileText, Settings, Coins, Sparkles, X, Contact
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const formatBusinessNumber = (numStr: string) => {
  const clean = String(numStr || "").replace(/[^0-9]/g, "");
  if (clean.length <= 3) return clean;
  if (clean.length <= 5) return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  return `${clean.slice(0, 3)}-${clean.slice(3, 5)}-${clean.slice(5)}`;
};

interface MaterialItem {
  itemCode: string;
  productName: string;
  spec: string;
  quantity: number;
  unitPrice: number;
  remark: string;
}

interface ExtraCostItem {
  name: string;
  amount: number;
  remark: string;
}

export default function PurchaseOrderWritePage() {
  const router = useRouter();

  // 1. 상태 보존용 Persisted States (발주서 작성 키 셋팅)
  const [supplier, setSupplier, isSupplierRestored] = usePersistedState("egdesk_gen_po_supplier_v2", {
    businessNumber: "",
    companyName: "",
    representative: "",
    address: "",
    phone: "",
    fax: "",
    email: ""
  });
  const [buyer, setBuyer, isBuyerRestored] = usePersistedState("egdesk_gen_po_vendor_v2", {
    companyName: "",
    departmentName: "",
    managerName: "",
    phone: "",
    email: ""
  });
  const [meta, setMeta, isMetaRestored] = usePersistedState("egdesk_gen_po_meta_v2", {
    poNumber: "",
    poDate: "",
    deliveryDate: "",
    writerName: "",
    writerPhone: ""
  });
  
  const [materials, setMaterials, isMaterialsRestored] = usePersistedState<MaterialItem[]>("egdesk_gen_po_items_v2", [
    { itemCode: "", productName: "", spec: "", quantity: 0, unitPrice: 0, remark: "" }
  ]);
  
  const [memo, setMemo, isMemoRestored] = usePersistedState("egdesk_gen_po_memo_v2", "");

  const [extraCosts, setExtraCosts, isExtraCostsRestored] = usePersistedState<ExtraCostItem[]>("egdesk_gen_po_extra_costs_v2", [
    { name: "", amount: 0, remark: "" }
  ]);

  // 특기사항 템플릿 상태 보존
  const [memoTemplates, setMemoTemplates] = usePersistedState<{ id: string; title: string; content: string }[]>("egdesk_gen_po_memo_templates_v2", [
    {
      id: "tpl-default-1",
      title: "기본 조건 템플릿",
      content: `1. 납품 장소: 본사 창고 (지정 위치 상차도 인도)\n2. 검수 조건: 납품 후 3일 이내 육안 검사 및 전수 검사 완료\n3. 결제 조건: 마감일 기준 익월 25일 현금 결제`
    },
    {
      id: "tpl-default-2",
      title: "납기 및 지체상금 템플릿",
      content: `1. 납기 예정일 준수 필수 (지연 발생 시 사전에 공식 서면 보고 필요)\n2. 납기 지연 시 지체일수당 발주 금액의 0.15% 상당의 지체상금을 공제합니다.\n3. 하자보증기간: 자재 보증 검수완료일로부터 1년.`
    }
  ]);

  // 모든 세션 로드 완료 여부
  const isRestored = isSupplierRestored && isBuyerRestored && isMetaRestored && isMaterialsRestored && isMemoRestored && isExtraCostsRestored;

  // 발송 모달 제어 상태 (옴니채널 다중 선택 지원)
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState<("EMAIL" | "SMS" | "FAX" | "DIRECT")[]>([]);
  const [sendEmailAddress, setSendEmailAddress] = useState("");
  const [sendSmsPhone, setSendSmsPhone] = useState("");
  const [sendFaxNumber, setSendFaxNumber] = useState("");
  const [sendDirectMemo, setSendDirectMemo] = useState("");
  const [isSending, setIsSending] = useState(false);

  // 직인 도장 이미지 상태
  const [sealImage, setSealImage] = useState<string | null>(null);

  // 시스템 설정의 발송 채널별 활성화 여부
  const [isEmailConfigured, setIsEmailConfigured] = useState(false);
  const [isSmsConfigured, setIsSmsConfigured] = useState(false);
  const [isFaxConfigured, setIsFaxConfigured] = useState(false);

  // 재고 관리 AI 데이터 연동용 품목 마스터 상태
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);

  // B2B 거래처 소속 담당자 리스트
  const [partnerContacts, setPartnerContacts] = useState<any[]>([]);
  const [isContactDropdownOpen, setIsContactDropdownOpen] = useState(false);
  const contactDropdownRef = useRef<HTMLDivElement>(null);

  // 📇 외부 클릭 시 담당자 선택 팝오버 자동 닫기
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (contactDropdownRef.current && !contactDropdownRef.current.contains(event.target as Node)) {
        setIsContactDropdownOpen(false);
      }
    }
    if (isContactDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isContactDropdownOpen]);

  // 거래처 파트너 실시간 검색용 상태
  const [partners, setPartners] = useState<any[]>([]);
  const [showPartnerDropdown, setShowPartnerDropdown] = useState(false);

  // 거래처 복원 시 소속 담당자 백필
  useEffect(() => {
    if (!isRestored || partners.length === 0 || !buyer.companyName) return;
    const currentPartner = partners.find(p => p.company_name === buyer.companyName);
    if (currentPartner && Array.isArray(currentPartner.contacts)) {
      setPartnerContacts(currentPartner.contacts);
    } else {
      setPartnerContacts([]);
    }
  }, [isRestored, partners, buyer.companyName]);

  // 채널 정보 연동 확인
  useEffect(() => {
    const checkChannelsConfig = async () => {
      try {
        const checkKey = async (key: string) => {
          const res = await apiFetch(`/api/settings?key=${key}`);
          const d = await res.json();
          return !!(d.success && d.value && JSON.parse(d.value).host);
        };
        const mailConfigured = await checkKey("smtp_settings");
        const smsConfigured = await checkKey("sms_settings");
        setIsEmailConfigured(mailConfigured);
        setIsSmsConfigured(smsConfigured);
      } catch (e) {
        console.error("채널 상태 로드 실패:", e);
      }
    };
    if (isRestored) {
      checkChannelsConfig();
    }
  }, [isRestored]);

  // 파트너 정보 로드
  useEffect(() => {
    apiFetch("/api/partners")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.partners) {
          setPartners(data.partners);
        }
      });
  }, []);

  // 재고 데이터 로드
  useEffect(() => {
    apiFetch("/api/inventory")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.inventories) {
          setInventoryItems(data.inventories);
        }
      });
  }, []);

  // 🏷️ 브라우저 탭 타이틀 동기화
  useEffect(() => {
    document.title = "보낼 발주서 작성 AI";
  }, []);

  // 로그인 사용자(작성자) 프로필 정보 자동 로드 및 세팅 (crm_operators 연동)
  useEffect(() => {
    if (isMetaRestored) {
      apiFetch("/api/employee/me")
        .then(res => res.json())
        .then(data => {
          if (data.success && data.user) {
            setMeta(prev => ({
              ...prev,
              writerName: prev.writerName || data.user.name || "",
              writerPhone: prev.writerPhone || data.user.phone || ""
            }));
          }
        })
        .catch(err => console.error("현재 로그인 사용자 정보 로드 실패:", err));
    }
  }, [isMetaRestored, setMeta]);

  // 자사 기본 프로필에서 직인 도장 이미지 로드
  useEffect(() => {
    apiFetch("/api/settings?key=my_company_profile")
      .then(res => res.json())
      .then(data => {
        if (data.success && data.value) {
          try {
            const profile = JSON.parse(data.value);
            if (profile.sealImages && profile.sealImages.length > 0) {
              setSealImage(profile.sealImages[0]);
            }
          } catch(e) {}
        }
      })
      .catch(err => console.error("직인 로드 실패:", err));
  }, []);

  // 자사 기본 프로필 로드 (발주처 기본값 셋업)
  useEffect(() => {
    if (!isRestored) return;
    // 발주처 기본값이 비어있을 때만 자사 프로필 로드
    if (!supplier.companyName) {
      apiFetch("/api/settings?key=my_company_profile")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.value) {
            const p = JSON.parse(data.value);
            setSupplier({
              businessNumber: p.businessNumber || "",
              companyName: p.companyName || "",
              representative: p.representative || "",
              address: p.address || "",
              phone: p.phone || "",
              fax: p.fax || "",
              email: p.email || ""
            });
          }
        });
    }
  }, [isRestored]);

  // 문서번호 & 오늘날짜 기본값 설정
  useEffect(() => {
    if (!isRestored) return;
    const now = new Date();
    const formattedDate = now.toISOString().substring(0, 10);
    
    if (!meta.poDate) {
      setMeta(prev => ({
        ...prev,
        poDate: formattedDate
      }));
    }
    
    if (!meta.poNumber) {
      const yy = String(now.getFullYear()).slice(-2);
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const hh = String(now.getHours()).padStart(2, '0');
      const min = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      setMeta(prev => ({
        ...prev,
        poNumber: `PO-${yy}${mm}${dd}-${hh}${min}${ss}`
      }));
    }
  }, [isRestored]);

  if (!isRestored) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400 font-bold text-sm">
        세션 데이터를 안전하게 백필하는 중...
      </div>
    );
  }

  // 계산 연산 헬퍼들
  const materialsTotal = materials.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const extraCostsTotal = extraCosts.reduce((sum, item) => sum + item.amount, 0);
  const grandTotal = materialsTotal + extraCostsTotal;

  // 거래처 파트너 선택 처리
  const handleSelectPartner = (p: any) => {
    setBuyer({
      companyName: p.company_name,
      departmentName: p.manager_position || p.department_name || "",
      managerName: p.manager_name || "",
      phone: p.manager_phone || p.phone || "",
      email: p.manager_email || p.email || ""
    });
    setSendEmailAddress(p.manager_email || p.email || "");
    setSendSmsPhone(p.manager_phone || p.phone || "");
    setSendFaxNumber(p.fax || "");

    if (Array.isArray(p.contacts)) {
      setPartnerContacts(p.contacts);
    } else {
      setPartnerContacts([]);
    }
    setShowPartnerDropdown(false);
  };

  // 거래처 담당자 선택 처리
  const handleSelectContact = (c: any) => {
    setBuyer(prev => ({
      ...prev,
      departmentName: c.position || "",
      managerName: c.name || "",
      phone: c.phone || prev.phone,
      email: c.email || prev.email
    }));
    if (c.email) setSendEmailAddress(c.email);
    if (c.phone) setSendSmsPhone(c.phone);
    setIsContactDropdownOpen(false);
  };

  // 품목 추가/삭제/변경 핸들러
  const handleAddMaterial = () => {
    setMaterials([...materials, { itemCode: "", productName: "", spec: "", quantity: 0, unitPrice: 0, remark: "" }]);
  };

  const handleRemoveMaterial = (index: number) => {
    if (materials.length === 1) {
      setMaterials([{ itemCode: "", productName: "", spec: "", quantity: 0, unitPrice: 0, remark: "" }]);
      return;
    }
    setMaterials(materials.filter((_, i) => i !== index));
  };

  const handleMaterialChange = (index: number, field: keyof MaterialItem, value: any) => {
    const next = [...materials];
    if (field === "quantity" || field === "unitPrice") {
      next[index][field] = Number(value) || 0;
    } else {
      next[index][field] = value as string;
    }
    setMaterials(next);
  };

  // 품목 마스터 실시간 검색 매핑
  const handleSelectInventoryItem = (index: number, code: string) => {
    const item = inventoryItems.find(inv => inv.item_code === code || inv.barcode === code);
    if (!item) return;

    const next = [...materials];
    next[index].itemCode = item.item_code || "";
    next[index].productName = item.product_name || "";
    next[index].spec = item.spec || "";
    next[index].unitPrice = item.unit_price || item.purchase_price || 0;
    setMaterials(next);
  };

  // 추가비용 추가/삭제/변경 핸들러
  const handleAddExtraCost = () => {
    setExtraCosts([...extraCosts, { name: "", amount: 0, remark: "" }]);
  };

  const handleRemoveExtraCost = (index: number) => {
    if (extraCosts.length === 1) {
      setExtraCosts([{ name: "", amount: 0, remark: "" }]);
      return;
    }
    setExtraCosts(extraCosts.filter((_, i) => i !== index));
  };

  const handleExtraCostChange = (index: number, field: keyof ExtraCostItem, value: any) => {
    const next = [...extraCosts];
    if (field === "amount") {
      next[index][field] = Number(value) || 0;
    } else {
      next[index][field] = value as string;
    }
    setExtraCosts(next);
  };

  // 직인 도장 이미지 업로드
  const handleSealUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSealImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // 특기사항 템플릿 제어 핸들러
  const handleSaveAsTemplate = () => {
    if (!memo.trim()) {
      alert("먼저 특기사항 란에 내용을 작성해 주세요.");
      return;
    }
    const title = window.prompt("저장할 특기사항 템플릿의 이름을 입력해 주세요:");
    if (!title || !title.trim()) return;
    
    const newTpl = {
      id: `tpl-${Date.now()}`,
      title: title.trim(),
      content: memo
    };
    setMemoTemplates([...memoTemplates, newTpl]);
    alert(`"${title.trim()}" 템플릿이 저장되었습니다!`);
  };

  const handleDeleteTemplate = (id: string, title: string) => {
    if (window.confirm(`"${title}" 템플릿을 삭제하시겠습니까?`)) {
      setMemoTemplates(memoTemplates.filter(t => t.id !== id));
    }
  };

  // 폼 리셋
  const handleResetForm = () => {
    if (!window.confirm("입력 중이던 모든 발주 내용을 초기화하시겠습니까?")) return;
    
    // 발주처 기본값 재로드
    apiFetch("/api/settings?key=my_company_profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.value) {
          const p = JSON.parse(data.value);
          setSupplier({
            businessNumber: p.businessNumber || "",
            companyName: p.companyName || "",
            representative: p.representative || "",
            address: p.address || "",
            phone: p.phone || "",
            fax: p.fax || "",
            email: p.email || ""
          });
        }
      });

    setBuyer({ companyName: "", departmentName: "", managerName: "", phone: "", email: "" });
    
    const now = new Date();
    const formattedDate = now.toISOString().substring(0, 10);
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');

    setMeta({
      poNumber: `PO-${yy}${mm}${dd}-${hh}${min}${ss}`,
      poDate: formattedDate,
      deliveryDate: "",
      writerName: "",
      writerPhone: ""
    });

    setMaterials([{ itemCode: "", productName: "", spec: "", quantity: 0, unitPrice: 0, remark: "" }]);
    setMemo("");
    setExtraCosts([{ name: "", amount: 0, remark: "" }]);
    setSealImage(null);
    setSelectedChannels([]);
  };

  // 발송 모달 열기 핸들러
  const handleOpenSend = () => {
    if (!buyer.companyName.trim()) {
      alert("수신 공급처(파트너)를 지정해야 발주서 전송 및 저장이 가능합니다.");
      return;
    }
    if (materials.length === 0 || materials[0].productName.trim() === "") {
      alert("발주할 품목 정보를 최소 1개 이상 작성해야 합니다.");
      return;
    }

    const defaultChannels: ("EMAIL" | "SMS" | "FAX" | "DIRECT")[] = [];
    if (buyer.email && isEmailConfigured) defaultChannels.push("EMAIL");
    if (buyer.phone && isSmsConfigured) defaultChannels.push("SMS");
    if (defaultChannels.length === 0) defaultChannels.push("DIRECT");

    setSelectedChannels(defaultChannels);
    setSendEmailAddress(buyer.email || "");
    setSendSmsPhone(buyer.phone || "");
    setIsSendModalOpen(true);
  };

  // 채널 체크 토글
  const handleToggleChannel = (ch: "EMAIL" | "SMS" | "FAX" | "DIRECT") => {
    if (selectedChannels.includes(ch)) {
      setSelectedChannels(selectedChannels.filter(c => c !== ch));
    } else {
      setSelectedChannels([...selectedChannels, ch]);
    }
  };

  // 실제 발주서 기안 및 전송 처리
  const handleSendAction = async () => {
    if (selectedChannels.length === 0) {
      alert("최소 1개 이상의 발송/전달 수단을 선택해야 합니다.");
      return;
    }
    if (selectedChannels.includes("EMAIL") && !sendEmailAddress.trim()) {
      alert("이메일 주소를 입력해 주세요.");
      return;
    }
    if (selectedChannels.includes("SMS") && !sendSmsPhone.trim()) {
      alert("수신인 문자 번호를 입력해 주세요.");
      return;
    }

    setIsSending(true);

    try {
      // 품목 정제
      const payloadItems = materials
        .filter(m => m.productName.trim().length > 0)
        .map(m => ({
          product_name: m.productName,
          spec: m.spec,
          quantity: m.quantity,
          unit_price: m.unitPrice,
          item_code: m.itemCode || ""
        }));

      // 백엔드 수동 발주서 API 페이로드 구성
      const payload = {
        action: "create_purchase_order_manual",
        vendor_name: buyer.companyName,
        vendor_phone: buyer.phone || sendSmsPhone,
        vendor_manager: buyer.managerName || "-",
        total_amount: grandTotal,
        items: payloadItems,
        // 추가 메타를 JSON 태그 형태로 우회 적재
        tags: JSON.stringify({
          grandTotal,
          deliveryDate: meta.deliveryDate,
          document_memo: memo
        })
      };

      const res = await apiFetch("/api/estimates/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const resJson = await res.json();

      if (resJson.success) {
        setIsSendModalOpen(false);
        const reports = selectedChannels.map(ch => {
          if (ch === "EMAIL") return `- 이메일: ${sendEmailAddress}`;
          if (ch === "SMS") return `- 문자: ${sendSmsPhone}`;
          if (ch === "FAX") return `- 팩스: ${sendFaxNumber}`;
          return `- 직접 전달: ${sendDirectMemo.trim() || "메모 없음"}`;
        }).join("\n");

        alert(`[발주서 작성 성공]\n\n수동 기안 발주서가 성공적으로 대장에 등록 및 발송 처리되었습니다!\n\n${reports}`);
        
        // 작성 캐시 비우기
        sessionStorage.removeItem("egdesk_gen_po_items_v2");
        sessionStorage.removeItem("egdesk_gen_po_vendor_v2");
        sessionStorage.removeItem("egdesk_gen_po_meta_v2");
        sessionStorage.removeItem("egdesk_gen_po_memo_v2");
        sessionStorage.removeItem("egdesk_gen_po_extra_costs_v2");

        // 대장으로 돌아가기
        router.push("/estimates");
      } else {
        alert(`발주 등록 실패: ${resJson.error || "알 수 없는 오류"}`);
      }
    } catch (err) {
      console.error(err);
      alert("발주서 등록 처리 중 오류가 발생했습니다.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div 
      className="min-h-screen bg-slate-50 text-slate-800 p-0 font-sans selection:bg-indigo-500 selection:text-white"
      data-easybot-hint="보낼 발주서 작성 AI: 공급처 선택 및 자재 소요 품목에 대한 수동 발주서 기안 및 옴니채널 발송을 담당합니다."
    >
      <style dangerouslySetInnerHTML={{ __html: "@media print { @page { size: A4 portrait; margin: 10mm; } html, body { height: 100%; overflow: hidden; background: #fff; margin: 0 !important; padding: 0 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }" }} />
      <div className="w-full space-y-8 relative px-4 py-6 md:px-8 md:py-8">
        {/* 상단 액션바 */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6 print:hidden">
          <div>
            <div className="flex items-center gap-3">
              <Link 
                href="/estimates" 
                className="p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-indigo-600 transition-all active:scale-95 shadow-sm"
              >
                <ArrowLeft className="w-6 h-6" />
              </Link>
              <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                <FileText className="w-8 h-8 text-indigo-600" />
                <span>보낼 발주서 작성 AI</span>
              </h1>
              <div className="hidden sm:flex items-center gap-1.5 ml-2">
                <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-bold">오토세이브 가동</span>
              </div>
            </div>
            <p className="text-slate-500 mt-2 text-sm pl-13">
              선택한 공급사(거래처)로 보낼 자재 발주 품목 및 발주 조건 작성 양식입니다.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleResetForm}
              className="px-4 py-3 bg-white hover:bg-slate-50 border border-slate-200 text-rose-600 hover:text-rose-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              내용 비우기
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              발주서 인쇄 / PDF
            </button>
            <button
              onClick={handleOpenSend}
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-600/10 transition-all cursor-pointer active:scale-95"
            >
              <Mail className="w-3.5 h-3.5" />
              발주서 저장 및 발송
            </button>
          </div>
        </div>

        {/* 폼 및 미리보기 2단 레이아웃 */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start print:block print:p-0 print:gap-0">
          
          {/* 좌측 입력 폼 (8단 확장) */}
          <div className="xl:col-span-8 space-y-6 print:hidden">
            
            {/* 세션 0: 기본 정보 및 수발신자 메타 */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 space-y-6 shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <FileText className="w-4 h-4 text-indigo-500" />
                <h3 className="text-sm font-extrabold text-slate-800">기본 정보 및 수발신처 입력</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. 발주자 정보 (본사) */}
                <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-200/60 space-y-4 text-left">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">🏢 발주자 정보 (본사)</span>
                    <Settings className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold mb-1">상호명</label>
                      <input
                        type="text"
                        value={supplier.companyName}
                        onChange={(e) => setSupplier({ ...supplier, companyName: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold mb-1">대표자명</label>
                        <input
                          type="text"
                          value={supplier.representative}
                          onChange={(e) => setSupplier({ ...supplier, representative: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold mb-1">사업자번호</label>
                        <input
                          type="text"
                          value={supplier.businessNumber}
                          onChange={(e) => setSupplier({ ...supplier, businessNumber: formatBusinessNumber(e.target.value) })}
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-mono font-bold text-slate-800 outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold mb-1">소재지 주소</label>
                      <input
                        type="text"
                        value={supplier.address}
                        onChange={(e) => setSupplier({ ...supplier, address: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold mb-1">대표전화</label>
                        <input
                          type="text"
                          value={supplier.phone}
                          onChange={(e) => setSupplier({ ...supplier, phone: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold mb-1">팩스번호</label>
                        <input
                          type="text"
                          value={supplier.fax}
                          onChange={(e) => setSupplier({ ...supplier, fax: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold mb-1">대표 이메일 주소</label>
                      <input
                        type="text"
                        value={supplier.email}
                        onChange={(e) => setSupplier({ ...supplier, email: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 우측 단락: 공급처 정보 + 발주서 정보 */}
                <div className="space-y-4 text-left">
                  {/* 2. 공급처 정보 (공급사) */}
                  <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-200/60 space-y-4">
                    <span className="text-[10px] font-black text-slate-500 border-b border-slate-200 pb-2 block uppercase tracking-widest">🤝 공급처 정보 (공급사)</span>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <label className="block text-[10px] text-slate-500 font-bold mb-1">공급사명 *</label>
                        <input
                          type="text"
                          placeholder="상호명 입력"
                          value={buyer.companyName}
                          onFocus={() => setShowPartnerDropdown(true)}
                          onBlur={() => setTimeout(() => setShowPartnerDropdown(false), 200)}
                          onChange={(e) => {
                            setBuyer({ ...buyer, companyName: e.target.value });
                            setShowPartnerDropdown(true);
                          }}
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                        />
                        
                        {showPartnerDropdown && buyer.companyName.trim().length > 0 && (
                          (() => {
                            const filtered = partners.filter(p => 
                              p.type && p.type.split(',').includes('VENDOR') &&
                              p.company_name.toLowerCase().includes(buyer.companyName.toLowerCase())
                            );
                            if (filtered.length === 0) return null;
                            return (
                              <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-50 divide-y divide-slate-100">
                                {filtered.map((p, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => handleSelectPartner(p)}
                                    className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all flex justify-between items-center"
                                  >
                                    <span>{p.company_name}</span>
                                    {p.manager_name && (
                                      <span className="text-[10px] text-slate-400 font-normal">
                                        {p.manager_name} ({p.manager_phone || p.phone || ""})
                                      </span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            );
                          })()
                        )}
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold mb-1">소속 부서</label>
                        <input
                          type="text"
                          value={buyer.departmentName}
                          onChange={(e) => setBuyer({ ...buyer, departmentName: e.target.value })}
                          placeholder="부서 입력"
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-[10px] text-slate-500 font-bold">담당자명</label>
                          {partnerContacts.length > 0 && (
                            <div className="relative" ref={contactDropdownRef}>
                              <button
                                type="button"
                                onClick={() => setIsContactDropdownOpen(!isContactDropdownOpen)}
                                className="text-[10px] text-indigo-600 hover:text-indigo-800 font-black flex items-center gap-0.5 transition-all"
                              >
                                <Contact className="w-3.5 h-3.5" />
                                담당자 선택
                              </button>
                              {isContactDropdownOpen && (
                                <div className="absolute right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl w-60 max-h-48 overflow-y-auto z-50 divide-y divide-slate-100">
                                  {partnerContacts.map((c: any, i) => (
                                    <button
                                      key={i}
                                      type="button"
                                      onClick={() => handleSelectContact(c)}
                                      className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition-all font-bold text-slate-700 flex justify-between items-center"
                                    >
                                      <div className="flex flex-col">
                                        <span className="text-slate-800">{c.name} {c.position ? `[${c.position}]` : ""}</span>
                                        <span className="text-[10px] text-slate-400 font-normal mt-0.5">{c.email || "이메일 미기입"}</span>
                                      </div>
                                      <span className="text-[10px] text-slate-500 font-normal shrink-0 pl-2">{c.phone || "연락처 없음"}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <input
                          type="text"
                          value={buyer.managerName}
                          onChange={(e) => setBuyer({ ...buyer, managerName: e.target.value })}
                          placeholder="담당자 입력"
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold mb-1">담당 연락처</label>
                        <input
                          type="text"
                          value={buyer.phone}
                          onChange={(e) => setBuyer({ ...buyer, phone: e.target.value })}
                          placeholder="연락처 입력"
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1">
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold mb-1">이메일</label>
                        <input
                          type="text"
                          value={buyer.email}
                          onChange={(e) => setBuyer({ ...buyer, email: e.target.value })}
                          placeholder="이메일 주소 입력"
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 3. 발주 번호 및 작성자 정보 */}
                  <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-200/60 space-y-4">
                    <span className="text-[10px] font-black text-slate-500 border-b border-slate-200 pb-2 block uppercase tracking-widest">📝 발주 번호 및 작성자 정보</span>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold mb-1">발주번호</label>
                        <input
                          type="text"
                          value={meta.poNumber}
                          className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2 text-xs font-mono font-bold text-slate-500 outline-none cursor-not-allowed"
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold mb-1">발주 발행일자</label>
                        <input
                          type="date"
                          value={meta.poDate}
                          onChange={(e) => setMeta({ ...meta, poDate: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800 outline-none cursor-pointer focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold mb-1">발주서 작성자</label>
                        <input
                          type="text"
                          value={meta.writerName}
                          onChange={(e) => setMeta({ ...meta, writerName: e.target.value })}
                          placeholder="작성자 성명"
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold mb-1">작성자 연락처</label>
                        <input
                          type="text"
                          value={meta.writerPhone}
                          onChange={(e) => setMeta({ ...meta, writerPhone: e.target.value })}
                          placeholder="작성자 연락처"
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1">
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold mb-1">납기 예정일</label>
                        <input
                          type="date"
                          value={meta.deliveryDate}
                          onChange={(e) => setMeta({ ...meta, deliveryDate: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800 outline-none cursor-pointer focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 세션 1: 발주 품목 상세 입력 */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 space-y-4 shadow-sm text-left">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-sm font-extrabold text-slate-800">발주 품목 내역 리스트</h3>
                </div>
                <button
                  onClick={handleAddMaterial}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg font-bold text-[10px] border border-indigo-200/40 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  품목 추가
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold">
                      <th className="py-2.5 pl-1">자재코드 / 품명 *</th>
                      <th className="py-2.5">규격</th>
                      <th className="py-2.5 w-16 text-center">수량</th>
                      <th className="py-2.5 w-28 text-right">단가 (원)</th>
                      <th className="py-2.5 w-32 text-right">금액 (원)</th>
                      <th className="py-2.5 pl-4">비고</th>
                      <th className="py-2.5 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {materials.map((item, idx) => (
                      <tr key={idx} className="group hover:bg-slate-50/50">
                        <td className="py-2.5 pr-2 pl-1">
                          <div className="flex gap-1.5 items-center relative">
                            <input
                              type="text"
                              value={item.itemCode || ""}
                              onChange={e => handleMaterialChange(idx, "itemCode", e.target.value)}
                              placeholder="자재코드"
                              className="w-24 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 outline-none focus:border-indigo-500 shrink-0 font-mono font-bold"
                            />
                            <div className="w-full relative">
                              <input
                                type="text"
                                value={item.productName || ""}
                                onChange={e => handleMaterialChange(idx, "productName", e.target.value)}
                                placeholder="소재 품명 입력"
                                className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 outline-none focus:border-indigo-500 font-bold"
                              />
                              {/* 품목 마스터 실시간 검색 */}
                              {item.productName && !inventoryItems.find(inv => inv.product_name === item.productName) && (
                                <div className="absolute left-0 right-0 mt-1 max-h-36 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-50 divide-y divide-slate-100">
                                  {inventoryItems
                                    .filter(inv => inv.product_name.toLowerCase().includes(item.productName.toLowerCase()))
                                    .slice(0, 5)
                                    .map((inv, i) => (
                                      <button
                                        key={i}
                                        type="button"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => handleSelectInventoryItem(idx, inv.item_code)}
                                        className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all flex justify-between items-center"
                                      >
                                        <span>📦 {inv.product_name}</span>
                                        <span className="text-[10px] text-slate-400 font-normal">{inv.item_code} ({inv.spec || "규격없음"})</span>
                                      </button>
                                    ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 pr-2">
                          <input
                            type="text"
                            value={item.spec || ""}
                            onChange={e => handleMaterialChange(idx, "spec", e.target.value)}
                            placeholder="규격"
                            className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 outline-none focus:border-indigo-500 font-bold"
                          />
                        </td>
                        <td className="py-2.5 pr-2">
                          <input
                            type="number"
                            value={item.quantity || ""}
                            onChange={e => handleMaterialChange(idx, "quantity", e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-xs font-mono font-bold text-center text-slate-855 outline-none focus:border-indigo-500"
                          />
                        </td>
                        <td className="py-2.5 pr-2">
                          <input
                            type="number"
                            value={item.unitPrice || ""}
                            onChange={e => handleMaterialChange(idx, "unitPrice", e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-mono font-bold text-right text-slate-855 outline-none focus:border-indigo-500"
                          />
                        </td>
                        <td className="py-2.5 pr-3 text-right font-mono font-black text-slate-700">
                          {((item.quantity || 0) * (item.unitPrice || 0)).toLocaleString()}원
                        </td>
                        <td className="py-2.5 pr-2 pl-4">
                          <input
                            type="text"
                            value={item.remark || ""}
                            onChange={e => handleMaterialChange(idx, "remark", e.target.value)}
                            placeholder="비고"
                            className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 outline-none focus:border-indigo-500"
                          />
                        </td>
                        <td className="py-2.5 text-center">
                          <button
                            onClick={() => handleRemoveMaterial(idx)}
                            disabled={materials.length === 1}
                            className="p-1.5 text-slate-450 hover:text-rose-500 disabled:opacity-30 rounded-lg hover:bg-rose-500/10 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 세션 2: 추가 비용 설정 (물류 배송비 등) */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 space-y-4 shadow-sm text-left">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-sm font-extrabold text-slate-800">추가 비용 설정 (물류 배송비 등)</h3>
                </div>
                <button
                  onClick={handleAddExtraCost}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg font-bold text-[10px] border border-indigo-200/40 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  비용 추가
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold">
                      <th className="py-2.5 pl-1">비용 명칭 *</th>
                      <th className="py-2.5 w-48 text-right">금액 (원)</th>
                      <th className="py-2.5 pl-4">비고 (세부 사유)</th>
                      <th className="py-2.5 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {extraCosts.map((item, idx) => (
                      <tr key={idx} className="group hover:bg-slate-50/50">
                        <td className="py-2.5 pr-2 pl-1">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleExtraCostChange(idx, "name", e.target.value)}
                            placeholder="비용 항목명 입력 (예: 화물 배송비, 탁송료)"
                            className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 outline-none focus:border-indigo-500 font-bold"
                          />
                        </td>
                        <td className="py-2.5 pr-2 text-right">
                          <input
                            type="number"
                            value={item.amount || ""}
                            onChange={(e) => handleExtraCostChange(idx, "amount", e.target.value)}
                            placeholder="0"
                            className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-mono font-bold text-right text-slate-855 outline-none focus:border-indigo-500"
                          />
                        </td>
                        <td className="py-2.5 pr-2 pl-4">
                          <input
                            type="text"
                            value={item.remark}
                            onChange={(e) => handleExtraCostChange(idx, "remark", e.target.value)}
                            placeholder="세부사항 입력"
                            className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 outline-none focus:border-indigo-500"
                          />
                        </td>
                        <td className="py-2.5 text-center">
                          <button
                            onClick={() => handleRemoveExtraCost(idx)}
                            disabled={extraCosts.length === 1}
                            className="p-1.5 text-slate-450 hover:text-rose-500 disabled:opacity-30 rounded-lg hover:bg-rose-500/10 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <span className="text-xs font-bold text-slate-500">추가 비용 합계액:</span>
                <span className="text-sm font-black text-indigo-600 font-mono">{extraCostsTotal.toLocaleString()}원</span>
              </div>
            </div>

            {/* 최종 발주 금액 */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-indigo-50 border border-indigo-100 rounded-2xl p-5 shadow-inner gap-4">
                <div>
                  <span className="text-xs md:text-sm font-black text-indigo-600 uppercase tracking-wide block">최종 발주 금액 (부가세 별도)</span>
                  <span className="text-[10px] md:text-xs text-slate-500 font-medium block mt-1">입력된 발주 품목 및 추가 비용의 공급가액 총합계입니다.</span>
                </div>
                <div className="text-3xl font-black text-indigo-750 font-mono shrink-0">
                  {grandTotal.toLocaleString()}원
                </div>
              </div>
            </div>

            {/* 세션 3: 특기사항 */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 space-y-4 text-left shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4.5 h-4.5 text-indigo-600" />
                  <h3 className="text-sm font-black text-slate-855">발주 조건 및 특기사항</h3>
                </div>
                
                {/* 템플릿 액션 영역 */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleSaveAsTemplate}
                    className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100/80 text-indigo-600 rounded-xl font-bold text-[10px] transition-all cursor-pointer shadow-sm active:scale-95 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3 text-indigo-500" />
                    현재 내용 템플릿 저장
                  </button>
                  
                  {memoTemplates.length > 0 && (
                    <div className="flex items-center gap-1.5 overflow-x-auto max-w-xs sm:max-w-md py-0.5 no-scrollbar">
                      {memoTemplates.map(tpl => (
                        <div
                          key={tpl.id}
                          className="flex items-center bg-slate-100 hover:bg-slate-200/60 border border-slate-200/60 rounded-xl pl-2.5 pr-1.5 py-1 text-[10px] font-bold text-slate-600 gap-1 shrink-0"
                        >
                          <button
                            onClick={() => {
                              if (memo.trim() && !window.confirm("현재 작성된 특기사항 내용을 덮어쓰시겠습니까?")) return;
                              setMemo(tpl.content);
                            }}
                            className="hover:text-indigo-600 transition-colors"
                          >
                            {tpl.title}
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(tpl.id, tpl.title)}
                            className="p-0.5 text-slate-400 hover:text-rose-500 rounded transition-all active:scale-90"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <textarea 
                value={memo}
                onChange={e => setMemo(e.target.value)}
                placeholder="발주 조건, 납품 위치, 지체상금 조항, 하자보증 조건 등을 자유롭게 입력하세요..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-semibold leading-relaxed text-slate-800 outline-none focus:border-indigo-500 resize-none"
                rows={4}
              />
            </div>
          </div>

          {/* 우측 실시간 A4 발주서 미리보기 렌더러 (4단 축소) */}
          <div className="xl:col-span-4 space-y-6 print:block print:w-full print:p-0 print:m-0">
            <div className="bg-white text-slate-800 border border-slate-200 rounded-3xl p-5 space-y-4 shadow-md block text-left text-[9px] font-medium leading-normal relative overflow-hidden hidden md:block print:block print:w-full print:border-none print:shadow-none print:p-0 print:m-0">
              
              {/* 상단 인쇄용 워터마크 안내 */}
              <div className="absolute top-2 right-2 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded text-[8px] font-bold text-slate-400 flex items-center gap-0.5 pointer-events-none print:hidden">
                <Printer className="w-2.5 h-2.5" />
                인쇄 전용 A4 프리뷰
              </div>

              <div className="text-center space-y-1 border-b border-slate-300 pb-3">
                <h2 className="text-sm font-black tracking-widest text-slate-900">발  주  서</h2>
              </div>

              <div className="flex gap-4 border-b border-slate-200 pb-3">
                {/* 공급처 (수신) */}
                <div className="w-[45%] shrink-0 space-y-1.5">
                  <div className="flex gap-1"><span className="text-slate-400 w-20 shrink-0 font-bold">발주번호:</span><span className="font-mono text-slate-700 font-bold">{meta.poNumber || "자동 생성대기"}</span></div>
                  <div className="flex gap-1"><span className="text-slate-400 w-20 shrink-0 font-bold">발주일자:</span><span className="text-slate-700 font-bold">{meta.poDate || "발행 당일"}</span></div>
                  <div className="flex gap-1"><span className="text-slate-400 w-20 shrink-0 font-bold">공급처:</span><span className="text-slate-900 font-bold underline decoration-slate-300 decoration-2 underline-offset-2">{buyer.companyName || "미확인 공급사"} 귀하</span></div>
                  <div className="flex gap-1"><span className="text-slate-400 w-20 shrink-0 font-bold">담당자:</span><span className="text-slate-700 font-bold">{buyer.departmentName} {buyer.managerName}</span></div>
                  <div className="flex gap-1"><span className="text-slate-400 w-20 shrink-0 font-bold">연락처:</span><span className="text-slate-700">{buyer.phone || "-"}</span></div>
                  <div className="flex gap-1"><span className="text-slate-400 w-20 shrink-0 font-bold">이메일:</span><span className="text-slate-700">{buyer.email || "-"}</span></div>
                </div>

                {/* 발주자 (자사) */}
                <div className="w-[55%] shrink-0 border-l border-slate-200 pl-4 space-y-1 relative">
                  <div className="flex gap-1"><span className="text-slate-400 w-20 shrink-0 font-bold">등록번호:</span><span className="font-mono text-slate-800 font-bold">{formatBusinessNumber(supplier.businessNumber)}</span></div>
                  <div className="flex gap-1"><span className="text-slate-400 w-20 shrink-0 font-bold">발주자명:</span><span className="text-slate-900 font-bold">{supplier.companyName}</span></div>
                  <div className="flex gap-1"><span className="text-slate-400 w-20 shrink-0 font-bold">대표자:</span><span className="text-slate-850">{supplier.representative} (인)</span></div>
                  <div className="flex gap-1"><span className="text-slate-400 w-20 shrink-0 font-bold">소재지:</span><span className="text-slate-700 leading-tight">{supplier.address}</span></div>
                  <div className="flex gap-1"><span className="text-slate-400 w-20 shrink-0 font-bold">대표전화:</span><span className="text-slate-700">{supplier.phone}</span></div>
                  <div className="flex gap-1"><span className="text-slate-400 w-20 shrink-0 font-bold">이메일:</span><span className="text-slate-700">{supplier.email}</span></div>
                </div>
              </div>

              {/* 총액 선언 */}
              <div className="bg-slate-50 border border-slate-200 p-2 text-center text-slate-800 flex justify-between px-4 font-bold rounded-lg">
                <span>합계 발주 금액:</span>
                <span className="underline underline-offset-2 font-black text-slate-900">₩{grandTotal.toLocaleString()}원 (부가세 별도)</span>
              </div>

              {/* 품목 요약 테이블 */}
              <div className="space-y-2">
                <span className="font-bold text-slate-400 text-[8px] uppercase tracking-wider block">발주 품목 세부 명세</span>
                <table className="w-full text-left text-[8px] border-t border-b border-slate-200 divide-y divide-slate-100">
                  <thead>
                    <tr className="text-slate-400 bg-slate-50/50">
                      <th className="py-1 pl-1 w-14">코드</th>
                      <th className="py-1 w-28">상품명</th>
                      <th className="py-1 w-16">규격</th>
                      <th className="py-1 w-8 text-center">수량</th>
                      <th className="py-1 w-16 text-right pr-1">단가 (원)</th>
                      <th className="py-1 w-20 text-right pr-1">금액 (원)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {materials.filter(m => m.productName).map((m, idx) => (
                      <tr key={`m-${idx}`} className="text-slate-755">
                        <td className="py-1 pl-1 text-slate-450 font-bold font-mono">{m.itemCode || `INV-${idx + 1}`}</td>
                        <td className="py-1 break-all whitespace-normal">
                          {m.productName}
                          {m.remark && (
                            <span className="text-[7.5px] text-slate-400 ml-1 font-medium">({m.remark})</span>
                          )}
                        </td>
                        <td className="py-1 break-all whitespace-normal">{m.spec || "-"}</td>
                        <td className="py-1 text-center font-mono">{m.quantity}</td>
                        <td className="py-1 text-right font-mono pr-1">{m.unitPrice ? m.unitPrice.toLocaleString() : "0"}</td>
                        <td className="py-1 text-right font-mono pr-1">{((m.quantity || 0) * (m.unitPrice || 0)).toLocaleString()}</td>
                      </tr>
                    ))}
                    {extraCosts.filter(e => e.name).map((e, idx) => (
                      <tr key={`e-${idx}`} className="text-slate-755 bg-emerald-50/10">
                        <td className="py-1 pl-1 text-emerald-600 font-bold font-mono">추가</td>
                        <td className="py-1 break-all whitespace-normal">
                          {e.name}
                          {e.remark && (
                            <span className="text-[7.5px] text-slate-400 ml-1 font-medium">({e.remark})</span>
                          )}
                        </td>
                        <td className="py-1 break-all whitespace-normal">-</td>
                        <td className="py-1 text-center font-mono">1</td>
                        <td className="py-1 text-right font-mono pr-1">{e.amount ? e.amount.toLocaleString() : "0"}</td>
                        <td className="py-1 text-right font-mono pr-1">{e.amount ? e.amount.toLocaleString() : "0"}</td>
                      </tr>
                    ))}
                    {materials.filter(m => m.productName).length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 font-bold">
                          입력된 발주 품목이 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* 특기사항 */}
              {memo && (
                <div className="bg-slate-50/50 border border-slate-150 p-2 rounded-lg text-left">
                  <span className="font-bold text-slate-400 text-[8px] uppercase tracking-wider block mb-1">📜 발주 조건 및 특기사항</span>
                  <p className="text-[8px] text-slate-600 whitespace-pre-wrap leading-normal font-medium">{memo}</p>
                </div>
              )}

              {/* 하단 서명 명의 */}
              <div className="pt-2 text-right text-slate-500 font-bold text-[8px] relative space-y-1 pb-3">
                <div>위와 같이 발주서를 제출합니다.</div>
                <div className="inline-block text-slate-900 font-extrabold text-[9px] relative pr-8 pb-1">
                  {supplier.companyName} 대표 {supplier.representative}
                  {sealImage ? (
                    <img
                      src={sealImage}
                      alt="회사직인"
                      className="absolute right-2 -top-2.5 w-6 h-6 object-contain pointer-events-none z-10"
                      style={{ mixBlendMode: "multiply" }}
                    />
                  ) : (
                    <label className="text-slate-400 hover:text-indigo-650 font-medium ml-1 cursor-pointer print:hidden">
                      (인)
                      <input type="file" accept="image/*" onChange={handleSealUpload} className="hidden" />
                    </label>
                  )}
                </div>
              </div>

              {/* 하단 각인 */}
              <div className="text-center text-[7px] text-slate-450 pt-2 border-t border-slate-200 flex items-center justify-between font-mono">
                <span>이지데스크 전사 공급망 관리 솔루션 (SCM v2)</span>
                <span>PO-AUTHENTIC-SECURED</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 발송 설정 모달 (옴니채널 오케스트레이션) */}
      {isSendModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] border border-slate-200 w-full max-w-md p-6 md:p-8 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] animate-scale-up">
            <button 
              onClick={() => setIsSendModalOpen(false)} 
              className="absolute top-5 right-5 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-4">
              <Mail className="w-5 h-5 text-indigo-500" />
              <span>발주서 저장 및 옴니채널 발송</span>
            </h3>

            <div className="space-y-5 flex-1 overflow-y-auto pr-1">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150 text-left">
                <span className="text-[10px] text-slate-400 font-bold block mb-1">발주 대상 거래처</span>
                <span className="text-xs font-black text-slate-800">{buyer.companyName} ({buyer.managerName || "담당자 없음"})</span>
                
                <span className="text-[10px] text-slate-400 font-bold block mt-3 mb-1">최종 발주 합계 금액</span>
                <span className="text-sm font-black text-indigo-600 font-mono">₩{grandTotal.toLocaleString()}원</span>
              </div>

              {/* 채널 선택 체크박스 목록 */}
              <div className="space-y-3">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">발송 수단 선택</span>
                
                {/* 1. EMAIL */}
                <div className={`p-4 rounded-2xl border transition-all ${selectedChannels.includes("EMAIL") ? "bg-indigo-50/30 border-indigo-200" : "bg-white border-slate-200 hover:bg-slate-50/50"}`}>
                  <label className="flex items-start gap-3 cursor-pointer select-none text-left">
                    <input 
                      type="checkbox" 
                      checked={selectedChannels.includes("EMAIL")}
                      onChange={() => handleToggleChannel("EMAIL")}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 mt-1"
                    />
                    <div className="flex-1 space-y-1">
                      <span className="text-xs font-black text-slate-700 block">이메일 발송</span>
                      <span className="text-[9px] text-slate-400 block">공식 발주서 PDF 사본을 거래처 메일 주소로 전송합니다.</span>
                      {selectedChannels.includes("EMAIL") && (
                        <input
                          type="email"
                          value={sendEmailAddress}
                          onChange={(e) => setSendEmailAddress(e.target.value)}
                          placeholder="수신 메일 주소 입력"
                          className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 mt-2"
                        />
                      )}
                    </div>
                  </label>
                </div>

                {/* 2. SMS */}
                <div className={`p-4 rounded-2xl border transition-all ${selectedChannels.includes("SMS") ? "bg-indigo-50/30 border-indigo-200" : "bg-white border-slate-200 hover:bg-slate-50/50"}`}>
                  <label className="flex items-start gap-3 cursor-pointer select-none text-left">
                    <input 
                      type="checkbox" 
                      checked={selectedChannels.includes("SMS")}
                      onChange={() => handleToggleChannel("SMS")}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 mt-1"
                    />
                    <div className="flex-1 space-y-1">
                      <span className="text-xs font-black text-slate-700 block">카카오톡 / 문자 알림 발송</span>
                      <span className="text-[9px] text-slate-400 block">모바일 웹 대장 링크를 포함한 문자 메시지를 전송합니다.</span>
                      {selectedChannels.includes("SMS") && (
                        <input
                          type="text"
                          value={sendSmsPhone}
                          onChange={(e) => setSendSmsPhone(e.target.value)}
                          placeholder="수신 전화번호 입력"
                          className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 mt-2"
                        />
                      )}
                    </div>
                  </label>
                </div>

                {/* 3. DIRECT (직접 전달) */}
                <div className={`p-4 rounded-2xl border transition-all ${selectedChannels.includes("DIRECT") ? "bg-indigo-50/30 border-indigo-200" : "bg-white border-slate-200 hover:bg-slate-50/50"}`}>
                  <label className="flex items-start gap-3 cursor-pointer select-none text-left">
                    <input 
                      type="checkbox" 
                      checked={selectedChannels.includes("DIRECT")}
                      onChange={() => handleToggleChannel("DIRECT")}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 mt-1"
                    />
                    <div className="flex-1 space-y-1">
                      <span className="text-xs font-black text-slate-700 block">직접 전달 (대장 즉시 등록)</span>
                      <span className="text-[9px] text-slate-400 block">외부 전송 없이 대장에 발주 내역만 등록합니다. (예: 전화/대면 지시 등)</span>
                      {selectedChannels.includes("DIRECT") && (
                        <input
                          type="text"
                          value={sendDirectMemo}
                          onChange={(e) => setSendDirectMemo(e.target.value)}
                          placeholder="비고 메모 (예: 대표님 구두 승인 건)"
                          className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 mt-2"
                        />
                      )}
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-4 flex gap-3">
              <button 
                onClick={() => setIsSendModalOpen(false)} 
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-xs cursor-pointer"
              >
                취소
              </button>
              <button
                onClick={handleSendAction}
                disabled={isSending}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isSending ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>발주서 기안 및 전송</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
