"use client";

import { apiFetch } from '@/lib/api';
import { Layers, FolderOpen } from "lucide-react";

import React, { useState, useEffect, useRef } from "react";
import { usePersistedState } from "@/hooks/usePersistedState";
import { 
  Plus, Trash2, Printer, Mail, Send, Check, RefreshCw, 
  ArrowLeft, FileText, Settings, Coins, Sparkles, X, Contact
} from "lucide-react";
import Link from "next/link";
const formatBusinessNumber = (numStr: string) => {
  const clean = String(numStr || "").replace(/[^0-9]/g, "");
  if (clean.length <= 3) return clean;
  if (clean.length <= 5) return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  return `${clean.slice(0, 3)}-${clean.slice(3, 5)}-${clean.slice(5)}`;
};

const formatSpec = (specStr: string): string => {
  if (!specStr) return "-";
  const trimmed = String(specStr).trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.spec && String(parsed.spec).trim()) return parsed.spec;
      if (parsed.remark && String(parsed.remark).trim()) return parsed.remark;
      if (parsed.type) {
        const typeLabels: Record<string, string> = {
          "DIRECT_PROCESS": "직접가공비",
          "OUTSOURCE_PROCESS": "외주가공비",
          "EXTRA_COST": "기타부대비용",
          "MATERIAL": "원자재/상품"
        };
        return typeLabels[parsed.type] || parsed.type;
      }
      return "-";
    } catch {
      return specStr;
    }
  }
  return specStr;
};

// 수주 건 조회 및 복수 선택용 컴포넌트
interface OrderLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (selected: any[]) => void;
  orders: any[];
  buyerName?: string;
}

function OrderLookupModal({ isOpen, onClose, onSelect, orders, buyerName }: OrderLookupModalProps) {
  const [search, setSearch] = React.useState(buyerName || "");
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  const filtered = orders.filter(o => {
    const custName = o.customer_name || "";
    const idStr = o.id || "";
    const q = search.trim().toLowerCase();
    
    const hasProductMatch = o.items?.some((it: any) => 
      (it.product_name || "").toLowerCase().includes(q)
    );
    
    return custName.toLowerCase().includes(q) || idStr.toLowerCase().includes(q) || hasProductMatch;
  });

  const handleToggle = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleConfirm = () => {
    const selected = orders.filter(o => selectedIds.includes(o.id));
    onSelect(selected);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-[32px] max-w-2xl w-full p-6 md:p-8 shadow-2xl relative text-left space-y-6 animate-scale-up">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-indigo-500" />
            <h3 className="text-base font-extrabold text-slate-800 font-sans">수주 내역 (받은 발주서) 불러오기</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="바이어 상호명 또는 품목명으로 수주 검색..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-500 font-bold font-sans"
            />
            {search && (
              <button 
                onClick={() => setSearch("")} 
                className="px-3 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl text-xs font-bold transition-all shrink-0 font-sans"
              >
                초기화
              </button>
            )}
          </div>

          <div className="overflow-y-auto max-h-[300px] border border-slate-100 rounded-2xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold">
                  <th className="py-2.5 px-4 w-10 text-center">선택</th>
                  <th className="py-2.5 px-2">수주번호</th>
                  <th className="py-2.5 px-2">거래처</th>
                  <th className="py-2.5 px-2">품목명</th>
                  <th className="py-2.5 px-2 text-right">수량</th>
                  <th className="py-2.5 px-4 text-right">총 금액</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400 font-medium font-sans">
                      검색된 수주 내역이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filtered.map((o, idx) => (
                    <tr key={o.id || idx} className="hover:bg-slate-50/50 cursor-pointer" onClick={() => handleToggle(o.id)}>
                      <td className="py-2.5 px-4 text-center" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(o.id)}
                          onChange={() => handleToggle(o.id)}
                          className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                        />
                      </td>
                      <td className="py-2.5 px-2 font-mono font-bold text-slate-500">{o.id}</td>
                      <td className="py-2.5 px-2 font-bold text-slate-800 font-sans">{o.customer_name}</td>
                      <td className="py-2.5 px-2 text-slate-700 font-medium font-sans">
                        {o.items && o.items.length > 0
                          ? o.items.length > 1
                            ? `${o.items[0].product_name} 외 ${o.items.length - 1}건`
                            : o.items[0].product_name
                          : o.product_name || "-"}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-650">
                        {o.items && o.items.length > 0
                          ? `${o.items.reduce((acc: number, cur: any) => acc + (Number(cur.quantity) || 0), 0)}개`
                          : `${o.quantity || 1}개`}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-black text-slate-700">
                        {o.total_amount !== undefined
                          ? `${Number(o.total_amount).toLocaleString()}원`
                          : o.total_price
                          ? `${Number(o.total_price).toLocaleString()}원`
                          : "0원"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <span className="text-xs font-bold text-slate-500 font-sans">선택된 수주 건수: <span className="text-indigo-600 font-black font-mono">{selectedIds.length}</span>건</span>
          <div className="flex gap-2">
            <button 
              onClick={onClose} 
              className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer font-sans"
            >
              취소
            </button>
            <button 
              onClick={handleConfirm}
              disabled={selectedIds.length === 0}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-black transition-all cursor-pointer font-sans"
            >
              명세서 품목에 적용
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

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

interface ProcessItem {
  processName: string;
  quantity: number;
  unitPrice: number;
  remark: string;
}

export default function DeliveryStatementWritePage() {
  // 1. 상태 보존용 Persisted States (v2 키 변경으로 이전 캐시 원천 초기화)
  const [supplier, setSupplier, isSupplierRestored] = usePersistedState("egdesk_gen_stmt_supplier_v2", {
    businessNumber: "",
    companyName: "",
    representative: "",
    address: "",
    phone: "",
    fax: "",
    email: ""
  });
  const [buyer, setBuyer, isBuyerRestored] = usePersistedState("egdesk_gen_stmt_buyer_v2", {
    companyName: "",
    departmentName: "",
    managerName: "",
    phone: "",
    email: ""
  });
  const [meta, setMeta, isMetaRestored] = usePersistedState("egdesk_gen_stmt_meta_v2", {
    estimateNumber: "",
    estimateDate: "",
    writerName: "",
    writerPhone: ""
  });
  
  // 초기 샘플 제거 및 빈 폼 시작
  const [materials, setMaterials, isMaterialsRestored] = usePersistedState<MaterialItem[]>("egdesk_gen_stmt_materials_v2", [
    { itemCode: "", productName: "", spec: "", quantity: 0, unitPrice: 0, remark: "" }
  ]);
  
  const [memo, setMemo, isMemoRestored] = usePersistedState("egdesk_gen_stmt_memo_v2", "");

  const [extraCosts, setExtraCosts, isExtraCostsRestored] = usePersistedState<ExtraCostItem[]>("egdesk_gen_stmt_extra_costs_v2", [
    { name: "", amount: 0, remark: "" }
  ]);

  // 특기사항 템플릿 상태 보존 (초기 기본 2종 장착)
  const [memoTemplates, setMemoTemplates] = usePersistedState<{ id: string; title: string; content: string }[]>("egdesk_gen_stmt_memo_templates_v2", [
    {
      id: "tpl-default-1",
      title: "기본 조건 템플릿",
      content: `1. 본 거래명세서의 유효기간은 발행일로부터 30일입니다.\n2. 납품 조건: 지정 장소 상차도 인도.\n3. 결제 조건: 계약 시 30%, 납품 검수 완료 후 70% 현금 지불`
    },
    {
      id: "tpl-default-2",
      title: "납기 및 하자 템플릿",
      content: `1. 외함 규격 변경 시 재료비 및 도장 비용이 추가 정산됩니다.\n2. 납기일: 발주 후 3주일 이내 (상호 협의 가능).\n3. 하자보증기간: 검수 완료 및 납품 후 1년.`
    }
  ]);

  // 모든 세션 로드 완료 여부
  const isRestored = isSupplierRestored && isBuyerRestored && isMetaRestored && isMaterialsRestored && isMemoRestored && isExtraCostsRestored;

  // 발송 모달 제어 상태 (옴니채널 다중 선택 지원)
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [orderList, setOrderList] = useState<any[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<("EMAIL" | "SMS" | "FAX" | "DIRECT")[]>([]);
  const [sendEmailAddress, setSendEmailAddress] = useState("");
  const [sendSmsPhone, setSendSmsPhone] = useState("");
  const [sendFaxNumber, setSendFaxNumber] = useState("");
  const [sendDirectMemo, setSendDirectMemo] = useState("");
  const [isSending, setIsSending] = useState(false);

  // 💡 자사 직인 도장 이미지 상태 (로컬스토리지가 아닌 메모리 상태로 관리하여 용량 초과 방어)
  const [sealImage, setSealImage] = useState<string | null>(null);

  // 시스템 설정의 발송 채널별 활성화 가능 여부 상태
  const [isEmailConfigured, setIsEmailConfigured] = useState(false);
  const [isSmsConfigured, setIsSmsConfigured] = useState(false);
  const [isFaxConfigured, setIsFaxConfigured] = useState(false);

  // 재고 관리 AI 데이터 연동용 품목 마스터 상태
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);

  // B2B 거래처 소속 담당자 리스트 상태 및 드롭다운 제어 상태
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

  // 거래처 파트너 자동완성용 상태
  const [partners, setPartners] = useState<any[]>([]);
  const [showPartnerDropdown, setShowPartnerDropdown] = useState(false);

  // 📇 거래처 세션 복원 시 소속 담당자 명단 백필 복구
  useEffect(() => {
    if (!isRestored || partners.length === 0 || !buyer.companyName) return;
    const currentPartner = partners.find(p => p.company_name === buyer.companyName);
    if (currentPartner && Array.isArray(currentPartner.contacts)) {
      setPartnerContacts(currentPartner.contacts);
    } else {
      setPartnerContacts([]);
    }
  }, [isRestored, partners, buyer.companyName]);

  // 📇 시스템 설정의 발송 채널별 활성/연동 자격 증명 확인
  useEffect(() => {
    const checkChannelsConfig = async () => {
      try {
        const fetchVal = async (key: string) => {
          const res = await apiFetch(`/api/settings?key=${key}`);
          const data = await res.json();
          return data.success && data.value ? data.value : "";
        };

        // 1. 이메일 SMTP 체크
        const smtpHost = await fetchVal("email_smtp_host");
        const smtpUser = await fetchVal("email_smtp_user");
        const smtpPass = await fetchVal("email_smtp_pass");
        setIsEmailConfigured(!!(smtpHost && smtpUser && smtpPass));

        // 2. 문자 기기 체크 (연결된 기기가 하나라도 있는지)
        const smsDevicesStr = await fetchVal("sms_devices");
        let smsOk = false;
        if (smsDevicesStr) {
          try {
            const devices = JSON.parse(smsDevicesStr);
            if (Array.isArray(devices)) {
              smsOk = devices.some((d: any) => d.isConnected === true);
            }
          } catch (e) {}
        }
        setIsSmsConfigured(smsOk);

        // 3. 팩스 API 체크
        const faxEnable = await fetchVal("fax_enable");
        const faxLinkId = await fetchVal("fax_link_id");
        const faxApiKey = await fetchVal("fax_api_key");
        const faxSender = await fetchVal("fax_sender_number");
        setIsFaxConfigured(faxEnable === "1" && !!(faxLinkId && faxApiKey && faxSender));
      } catch (err) {
        console.error("발송 설정 상태 확인 실패:", err);
      }
    };

    checkChannelsConfig();
  }, []);

  useEffect(() => {
    apiFetch("/api/partners")
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.partners)) {
          setPartners(data.partners);
        }
      })
      .catch(err => console.error("거래처 목록 로드 실패:", err));
  }, []);

  useEffect(() => {
    apiFetch("/api/estimates/process?action=so_list")
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.salesOrders)) {
          setOrderList(data.salesOrders);
        }
      })
      .catch(err => console.error("수주 목록 로드 실패:", err));
  }, []);

  useEffect(() => {
    apiFetch("/api/inventory")
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setInventoryItems(data.data);
        }
      })
      .catch(err => console.error("재고 마스터 정보 로드 실패:", err));
  }, []);

  // 🛡️ 구버전 캐시 및 더미 데이터(고압 차단기 등) 강제 감지 후 자동 소거 방어막
  useEffect(() => {
    if (!isRestored) return;
    const hasDummy = materials.some(it => 
      it.productName.includes("고압 차단기") || 
      it.productName.includes("SUS304") ||
      it.unitPrice === 850000
    );
    if (hasDummy) {
      setMaterials([{ itemCode: "", productName: "", spec: "", quantity: 0, unitPrice: 0, remark: "" }]);
      setExtraCosts([{ name: "", amount: 0, remark: "" }]);
    }
  }, [isRestored, materials, setMaterials, setExtraCosts]);

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

  // 💡 마운트 시 시스템설정에서 등록한 최신 직인 도장 이미지 로드
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

  useEffect(() => {
    if (!isRestored) return;
    if (supplier.companyName) return;

    apiFetch("/api/settings?key=my_company_profile")
      .then(res => res.json())
      .then(data => {
        if (data.success && data.value) {
          try {
            const profile = JSON.parse(data.value);
            setSupplier({
              businessNumber: profile.businessNumber || "306-81-93458",
              companyName: profile.companyName || "주식회사 쿠스",
              representative: profile.representative || "김진수",
              address: profile.address || "서울특별시 금천구 가산디지털2로 274",
              phone: profile.phone || "1599-6277",
              fax: profile.fax || "02-715-9989",
              email: profile.email || "sales@koos.co.kr"
            });
          } catch(e) {}
        }
      })
      .catch(() => {
        setSupplier({
          businessNumber: "306-81-93458",
          companyName: "주식회사 쿠스 (송배전기기 전문)",
          representative: "김진수",
          address: "서울특별시 금천구 가산디지털2로 274",
          phone: "1599-6277",
          fax: "02-715-9989",
          email: "sales@koos.co.kr"
        });
      });
  }, [isRestored, supplier.companyName]);

  // 3. 거래명세번호 및 오늘 날짜 자동 생성 (Early Return Guard 준수)
  useEffect(() => {
    if (!isRestored) return;
    if (meta.estimateNumber) return;

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000);
    setMeta(prev => ({
      ...prev,
      estimateNumber: `DST-${yyyy}${mm}${dd}-${random}`,
      estimateDate: `${yyyy}-${mm}-${dd}`
    }));
  }, [isRestored, meta.estimateNumber]);

  // 📇 바이어 정보가 존재할 때 최신 거래처 정보를 동기화하는 백필 이펙트
  useEffect(() => {
    if (!isRestored) return;
    if (partners && partners.length > 0 && buyer.companyName) {
      const match = partners.find(p => p.company_name === buyer.companyName);
      if (match) {
        const latestEmail = match.manager_email || match.email || "";
        const latestPhone = match.manager_phone || match.phone || "";
        const latestManagerName = match.manager_name || "";
        const latestPosition = match.manager_position || "";
        
        // 사용자가 드롭다운에서 선택한 소속 담당자 정보와 현재 폼 성함이 일치하는 상태라면 자동 동기화를 차단하여 롤백 현상을 방지합니다.
        const hasContactMatch = match.contacts?.some((c: any) => c.name === buyer.managerName);
        if (hasContactMatch) return;

        // 폼이 완전히 비어있거나, 성함 조회가 불가한 경우 최초 1회만 대표자로 세팅합니다.
        if (!buyer.managerName && (buyer.email !== latestEmail || buyer.phone !== latestPhone || (latestPosition && buyer.departmentName !== latestPosition))) {
          setBuyer(prev => ({
            ...prev,
            email: latestEmail,
            phone: latestPhone,
            managerName: latestManagerName,
            departmentName: latestPosition || prev.departmentName
          }));
        }
      }
    }
  }, [isRestored, partners, buyer.companyName]);

  if (!isRestored) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-indigo-600">
        <RefreshCw className="w-10 h-10 animate-spin mr-3" />
        <span className="text-sm font-extrabold tracking-widest uppercase">거래명세 시스템 환경 복원 중...</span>
      </div>
    );
  }

  // 4. 실시간 원가 합산 계산 공식
  const materialsTotal = materials.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);
  const extraCostsTotal = extraCosts.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
  const directProcessTotal = 0;
  const outsourceProcessTotal = 0;
  const processTotal = 0;

  // 일반관리비 = 가공비의 10%
  const generalAdminCost = 0;
  // 기업이윤 = (가공비 + 일반관리비)의 10%
  const businessProfit = 0;
  // 재료관리비 = 재료비의 5%
  const materialManageCost = 0;

  // 최종 거래명세금액 (재료비 + 기타 부대 비용)
  const grandTotal = materialsTotal + extraCostsTotal;

  // 5. 폼 제어 핸들러
  const handleSelectOrders = (selectedOrders: any[]) => {
    if (selectedOrders.length === 0) return;
    
    // 첫 수주 건 기준으로 바이어 정보 바인딩
    const first = selectedOrders[0];
    setBuyer(prev => ({
      ...prev,
      companyName: first.customer_name || "",
      phone: first.customer_phone || "",
      managerName: first.customer_manager || prev.managerName || "",
      email: prev.email || ""
    }));

    // 품목 목록 구성 (각 수주건의 items 배열을 평탄화하여 복원, 없으면 o 자체 정보 폴백)
    const itemsList: any[] = [];
    selectedOrders.forEach(o => {
      if (o.items && Array.isArray(o.items) && o.items.length > 0) {
        o.items.forEach((it: any) => {
          itemsList.push({
            itemCode: it.item_code || "",
            productName: it.product_name || "",
            spec: it.spec ? formatSpec(it.spec) : "",
            quantity: Number(it.quantity) || 0,
            unitPrice: Number(it.unit_price) || 0,
            remark: o.id ? `수주:${o.id}` : ""
          });
        });
      } else {
        const qty = Number(o.quantity) || 1;
        const total = Number(o.total_price) || 0;
        const price = qty > 0 ? Math.round(total / qty) : total;
        itemsList.push({
          itemCode: "",
          productName: o.product_name || "",
          spec: "",
          quantity: qty,
          unitPrice: price,
          remark: o.id ? `수주:${o.id}` : ""
        });
      }
    });
    
    setMaterials(itemsList.length > 0 ? itemsList : [{ itemCode: "", productName: "", spec: "", quantity: 0, unitPrice: 0, remark: "" }]);
  };

  const handleAddMaterial = () => {
    setMaterials([...materials, { itemCode: "", productName: "", spec: "", quantity: 0, unitPrice: 0, remark: "" }]);
  };

  const handleRemoveMaterial = (index: number) => {
    if (materials.length === 1) return;
    setMaterials(materials.filter((_, idx) => idx !== index));
  };

  const handleItemCodeLookup = (index: number, codeValue: string, isBlur = false) => {
    const code = String(codeValue).trim().toUpperCase();

    // 품목코드를 싹 비운 경우, 해당 행의 모든 상세 정보(품명, 규격, 수량, 단가)도 깨끗이 초기화합니다.
    if (!code) {
      setMaterials(prev => {
        const latest = [...prev];
        if (latest[index]) {
          latest[index].itemCode = "";
          latest[index].productName = "";
          latest[index].spec = "";
          latest[index].quantity = 0;
          latest[index].unitPrice = 0;
        }
        return latest;
      });
      return;
    }

    // 1. itemCode 입력값은 실시간으로 materials 상태에 반영해 줍니다. (blur 시점에는 아래의 매칭 성공 시점에만 정규화)
    if (!isBlur) {
      setMaterials(prev => {
        const latest = [...prev];
        if (latest[index]) {
          latest[index].itemCode = codeValue;
        }
        return latest;
      });
    }

    // 공통 상태 적용 헬퍼
    const applyMatched = (matched: any) => {
      setMaterials(prev => {
        const latest = [...prev];
        if (latest[index]) {
          // 중요: 진짜 매칭이 성공한 경우에만 itemCode를 바코드 또는 INV- ID 형태로 깔끔하게 교정합니다.
          latest[index].itemCode = matched.barcode || `INV-${matched.id}`;
          latest[index].productName = matched.name || "";
          latest[index].spec = matched.spec || "";
          latest[index].unitPrice = Number(matched.price) || 0;
          if (!latest[index].quantity || latest[index].quantity === 0) {
            latest[index].quantity = 1;
          }
        }
        return latest;
      });
    };

    // 1차로 로컬 캐시에서 신속 매핑 시도
    const matchedLocal = inventoryItems.find(item => {
      const itemBarcode = String(item.barcode || "").trim().toUpperCase();
      const invId = `INV-${item.id}`;
      const isPureNumber = /^\d+$/.test(code);
      const isIdMatch = isPureNumber && Number(item.id) === Number(code);
      return itemBarcode === code || invId === code || isIdMatch;
    });

    if (matchedLocal) {
      applyMatched(matchedLocal);
    } else {
      // 2차로 캐시에 없는 경우 백엔드 데이터베이스 전체를 대상으로 비동기 개별 쿼리 검색 요청
      apiFetch(`/api/inventory?code=${encodeURIComponent(code)}`)
        .then(res => res.json())
        .then(resData => {
          if (resData.success && resData.data && resData.data.length > 0) {
            const matchedServer = resData.data[0];
            applyMatched(matchedServer);
          } else {
            // 조회에 완전히 실패했고 포커스아웃(onBlur) 시점이라면 억지 보정하지 않고 입력한 날 값을 정돈해줍니다.
            if (isBlur) {
              setMaterials(prev => {
                const latest = [...prev];
                if (latest[index]) {
                  latest[index].itemCode = codeValue;
                }
                return latest;
              });
            }
          }
        })
        .catch(err => console.error("품목 비동기 조회 실패:", err));
    }
  };

  const handleMaterialChange = (index: number, field: keyof MaterialItem, value: any) => {
    if (field === "itemCode") {
      // 품목코드 입력인 경우, 덮어쓰기 오작동을 방지하기 위해 handleItemCodeLookup 함수에서 itemCode 값과 조회를 일괄 담당합니다.
      handleItemCodeLookup(index, value, false);
      return;
    }

    const updated = [...materials];
    if (field === "quantity" || field === "unitPrice") {
      updated[index][field] = Number(value) || 0;
    } else {
      updated[index][field] = value;
    }
    setMaterials(updated);
  };

  // 기타 부대 비용 제어 핸들러
  const handleAddExtraCost = () => {
    setExtraCosts([...extraCosts, { name: "", amount: 0, remark: "" }]);
  };

  const handleRemoveExtraCost = (index: number) => {
    if (extraCosts.length === 1) return;
    setExtraCosts(extraCosts.filter((_, idx) => idx !== index));
  };

  const handleExtraCostChange = (index: number, field: keyof ExtraCostItem, value: any) => {
    const updated = [...extraCosts];
    if (field === "amount") {
      updated[index][field] = Number(value) || 0;
    } else {
      updated[index][field] = value;
    }
    setExtraCosts(updated);
  };

  // 작성 내용 완전히 초기화
  const handleResetForm = () => {
    if (window.confirm("작성 중인 모든 거래명세서 내용을 초기화하고 빈 양식으로 시작하시겠습니까?")) {
      setExtraCosts([{ name: "", amount: 0, remark: "" }]);
      setSupplier({
        businessNumber: "",
        companyName: "",
        representative: "",
        address: "",
        phone: "",
        fax: "",
        email: ""
      });
      setBuyer({
        companyName: "",
        departmentName: "",
        managerName: "",
        phone: "",
        email: ""
      });
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      const random = Math.floor(1000 + Math.random() * 9000);
      setMeta({
        estimateNumber: `DST-${yyyy}${mm}${dd}-${random}`,
        estimateDate: `${yyyy}-${mm}-${dd}`,
        writerName: "",
        writerPhone: ""
      });
      setMaterials([{ itemCode: "", productName: "", spec: "", quantity: 0, unitPrice: 0, remark: "" }]);
      setMemo("");

      // 회사 정보 설정 다시 로드
      apiFetch("/api/settings?key=my_company_profile")
        .then(res => res.json())
        .then(data => {
          if (data.success && data.value) {
            try {
              const profile = JSON.parse(data.value);
              setSupplier({
                businessNumber: profile.businessNumber || "",
                companyName: profile.companyName || "",
                representative: profile.representative || "",
                address: profile.address || "",
                phone: profile.phone || "",
                fax: profile.fax || "",
                email: profile.email || ""
              });
            } catch(e) {}
          }
        });
    }
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


  // 6. 발송 핸들러 시뮬레이션
  const handleOpenSend = () => {
    if (!buyer.companyName) {
      alert("공급받는자 상호명을 먼저 입력해 주세요.");
      return;
    }

    const matchedPartner = partners.find(p => p.company_name === buyer.companyName);
    const partnerFax = matchedPartner?.fax || "";
    const primaryContact = matchedPartner?.contacts?.find((c: any) => c.is_primary === 1 || c.is_primary === "1");

    // 각 발송 채널별 개별 상태 채우기
    setSendEmailAddress(buyer.email || primaryContact?.email || matchedPartner?.manager_email || matchedPartner?.email || "");
    setSendSmsPhone(buyer.phone || primaryContact?.phone || matchedPartner?.manager_phone || matchedPartner?.phone || "");
    setSendFaxNumber(partnerFax);
    setSendDirectMemo("");

    // 설정이 활성화된 사용 가능한 채널 중 최우선 채널로 초기 탑재, 전부 불가능할 시 직접 전달 기본 체크
    const initialChannels: ("EMAIL" | "SMS" | "FAX" | "DIRECT")[] = [];
    if (isEmailConfigured) initialChannels.push("EMAIL");
    else if (isSmsConfigured) initialChannels.push("SMS");
    else if (isFaxConfigured) initialChannels.push("FAX");
    else initialChannels.push("DIRECT");
    
    setSelectedChannels(initialChannels);
    setIsSendModalOpen(true);
  };

  const handleSendExecute = async () => {
    // 선택된 채널이 최소 하나 이상인지 검증
    if (selectedChannels.length === 0) {
      alert("발송할 채널을 최소 하나 이상 선택해 주세요.");
      return;
    }

    // 각 선택된 채널별로 인풋 기입 유무 검증
    if (selectedChannels.includes("EMAIL") && !sendEmailAddress.trim()) {
      alert("이메일 수신 주소를 입력해 주세요.");
      return;
    }
    if (selectedChannels.includes("SMS") && !sendSmsPhone.trim()) {
      alert("문자 수신 휴대폰 번호를 입력해 주세요.");
      return;
    }
    if (selectedChannels.includes("FAX") && !sendFaxNumber.trim()) {
      alert("팩스 수신 번호를 입력해 주세요.");
      return;
    }

    setIsSending(true);
    try {
      // 💡 일반 품목 및 기타 부대 비용 목록을 단일 API 전송 스키마로 취합
      const payloadItems: any[] = [];
      
      materials.forEach((m) => {
        if (m.productName && m.productName.trim()) {
          payloadItems.push({
            product_id: "",
            item_code: m.itemCode || "",
            product_name: m.productName,
            quantity: m.quantity || 0,
            unit_price: m.unitPrice || 0,
            amount: (m.quantity || 0) * (m.unitPrice || 0),
            delivery_date: "",
            spec: JSON.stringify({
              type: "MATERIAL",
              spec: m.spec || "",
              remark: m.remark || ""
            })
          });
        }
      });

      extraCosts.forEach((e) => {
        if (e.name && e.name.trim()) {
          payloadItems.push({
            product_id: "",
            item_code: "EXTRA-COST",
            product_name: e.name,
            quantity: 1,
            unit_price: e.amount || 0,
            amount: e.amount || 0,
            delivery_date: "",
            spec: JSON.stringify({
              type: "EXTRA_COST",
              remark: e.remark || ""
            })
          });
        }
      });

      if (payloadItems.length === 0) {
        alert("최소 1개 이상의 유효한 거래명세 품목(상품 또는 기타 비용)을 입력해 주세요.");
        setIsSending(false);
        return;
      }

      // 💡 실제 데이터베이스에 일반 거래명세서 적재 API 호출
      const payload = {
        type: "OUTBOUND",
        direction_status: "SENT",
        partner_name: buyer.companyName,
        partner_phone: buyer.phone || sendSmsPhone,
        partner_manager: buyer.managerName || "-",
        items: payloadItems,
        tags: JSON.stringify({ 
          is_statement: true,
          is_manufacture: false,
          materialsTotal,
          extraCostsTotal,
          directProcessTotal: 0,
          outsourceProcessTotal: 0,
          generalAdminCost: 0,
          businessProfit: 0,
          materialManageCost: 0,
          grandTotal: materialsTotal + extraCostsTotal,
          document_memo: memo // 💡 대장의 상세비고 컬럼과 연계 표시
        }),
        send_method: selectedChannels.join(","),
        send_target: selectedChannels.map(ch => {
          if (ch === "EMAIL") return sendEmailAddress;
          if (ch === "SMS") return sendSmsPhone;
          if (ch === "FAX") return sendFaxNumber;
          return sendDirectMemo.trim() || "직접 전달";
        }).join(",")
      };

      const res = await apiFetch("/api/estimates", {
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

        alert(`[발송 성공]\n\n일반 거래명세서가 성공적으로 적재 및 발송 확정되었습니다!\n\n${reports}`);
      } else {
        alert(`발송 실패: ${resJson.error || "알 수 없는 오류"}`);
      }
    } catch (err) {
      console.error(err);
      alert("발송 및 저장 중 네트워크 오류가 발생했습니다.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div 
      className="min-h-screen bg-slate-50 text-slate-800 p-0 font-sans selection:bg-indigo-500 selection:text-white"
      data-easybot-hint="일반 거래명세 작성 AI: 재료비, 가공비, 일반관리비, 기업이윤 연산 및 옴니채널 발송을 담당합니다."
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
                <span>(일반)보낼 거래명세서 작성 AI</span>
              </h1>
              <div className="hidden sm:flex items-center gap-1.5 ml-2">
                <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-bold">오토세이브 가동</span>
              </div>
            </div>
            <p className="text-slate-500 mt-2 text-sm pl-13">
              재료비, 가공비, 간접비 항목을 포함한 일반 거래명세서 양식입니다.
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
              거래명세서 인쇄 / PDF
            </button>
            <button
              onClick={handleOpenSend}
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-600/10 transition-all cursor-pointer active:scale-95"
            >
              <Mail className="w-3.5 h-3.5" />
              거래명세서 발송
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
                {/* 공급자 정보 */}
                <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-200/60 space-y-4 text-left">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">공급자 정보 (자사)</span>
                    <Settings className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold mb-1">상호명</label>
                      <input 
                        type="text" 
                        value={supplier.companyName}
                        onChange={e => setSupplier({ ...supplier, companyName: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold mb-1">대표자</label>
                        <input 
                          type="text" 
                          value={supplier.representative}
                          onChange={e => setSupplier({ ...supplier, representative: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold mb-1">사업자등록번호</label>
                        <input 
                          type="text" 
                          value={formatBusinessNumber(supplier.businessNumber)}
                          onChange={e => setSupplier({ ...supplier, businessNumber: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-mono font-bold text-slate-800 outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold mb-1">사업장 주소</label>
                      <input 
                        type="text" 
                        value={supplier.address}
                        onChange={e => setSupplier({ ...supplier, address: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold mb-1">대표 전화번호</label>
                        <input 
                          type="text" 
                          value={supplier.phone}
                          onChange={e => setSupplier({ ...supplier, phone: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold mb-1">팩스번호</label>
                        <input 
                          type="text" 
                          value={supplier.fax}
                          onChange={e => setSupplier({ ...supplier, fax: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold mb-1">대표 이메일 주소</label>
                      <input 
                        type="email" 
                        value={supplier.email}
                        onChange={e => setSupplier({ ...supplier, email: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 공급받는자 정보 및 작성 정보 */}
                <div className="space-y-4 text-left">
                  <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-200/60 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">공급받는자 정보 (바이어)</span>
                      <button
                        onClick={() => setIsOrderModalOpen(true)}
                        className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-md font-bold text-[9px] border border-indigo-200/40 transition-all flex items-center gap-1 cursor-pointer font-sans"
                      >
                        <Layers className="w-2.5 h-2.5" />
                        수주 건 선택
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <label className="block text-[10px] text-slate-500 font-bold mb-1">바이어 회사명 *</label>
                        <input 
                          type="text" 
                          value={buyer.companyName}
                          onChange={e => {
                            setBuyer({ ...buyer, companyName: e.target.value });
                            setShowPartnerDropdown(true);
                          }}
                          onFocus={() => setShowPartnerDropdown(true)}
                          onBlur={() => setTimeout(() => setShowPartnerDropdown(false), 200)}
                          placeholder="상호명 입력"
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                        />
                        {showPartnerDropdown && buyer.companyName.trim().length > 0 && (
                          (() => {
                            const filtered = partners.filter(p => 
                              p.type && p.type.split(',').includes('BUYER') &&
                              p.company_name.toLowerCase().includes(buyer.companyName.toLowerCase())
                            );
                            if (filtered.length === 0) return null;
                            return (
                              <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto z-50 divide-y divide-slate-100">
                                {filtered.map(p => (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                    }}
                                    onClick={() => {
                                      setBuyer({
                                        companyName: p.company_name,
                                        departmentName: p.manager_position || p.department_name || "",
                                        managerName: p.manager_name || "",
                                        phone: p.manager_phone || p.phone || "",
                                        email: p.manager_email || p.email || ""
                                      });
                                      setPartnerContacts(p.contacts || []);
                                      setIsContactDropdownOpen(false);
                                      setShowPartnerDropdown(false);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all flex justify-between items-center"
                                  >
                                    <span>{p.company_name}</span>
                                    {p.manager_name && (
                                      <span className="text-[10px] text-slate-400 font-normal">{p.manager_name} ({p.manager_phone || p.phone || ""})</span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            );
                          })()
                        )}
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold mb-1">직급/부서</label>
                        <input 
                          type="text" 
                          value={buyer.departmentName}
                          onChange={e => setBuyer({ ...buyer, departmentName: e.target.value })}
                          placeholder="직급/부서 입력"
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-[10px] text-slate-500 font-bold">담당자 성함</label>
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
                                  {partnerContacts.map((c: any) => (
                                    <button
                                      key={c.id}
                                      type="button"
                                      onClick={() => {
                                        setBuyer({
                                          ...buyer,
                                          managerName: c.name,
                                          phone: c.phone || "",
                                          departmentName: c.position || "",
                                          email: c.email || ""
                                        });
                                        setIsContactDropdownOpen(false);
                                      }}
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
                          onChange={e => setBuyer({ ...buyer, managerName: e.target.value })}
                          placeholder="담당자 입력"
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold mb-1">담당 연락처</label>
                        <input 
                          type="text" 
                          value={buyer.phone}
                          onChange={e => setBuyer({ ...buyer, phone: e.target.value })}
                          placeholder="연락처 입력"
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-200/60 space-y-4">
                    <span className="text-[10px] font-black text-slate-500 border-b border-slate-200 pb-2 block uppercase tracking-widest">거래명세 번호 및 작성자 정보</span>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold mb-1">거래명세번호</label>
                        <input 
                          type="text" 
                          value={meta.estimateNumber}
                          className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2 text-xs font-mono font-bold text-slate-500 outline-none cursor-not-allowed"
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold mb-1">거래명세 발행일자</label>
                        <input 
                          type="date" 
                          value={meta.estimateDate}
                          onChange={e => setMeta({ ...meta, estimateDate: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800 outline-none cursor-pointer focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold mb-1">거래명세서 작성자</label>
                        <input 
                          type="text" 
                          value={meta.writerName}
                          onChange={e => setMeta({ ...meta, writerName: e.target.value })}
                          placeholder="작성자 성명"
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold mb-1">작성자 연락처</label>
                        <input 
                          type="text" 
                          value={meta.writerPhone}
                          onChange={e => setMeta({ ...meta, writerPhone: e.target.value })}
                          placeholder="작성자 연락처"
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 세션 1: 상품 명세 */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-sm font-extrabold text-slate-800">상품 명세</h3>
                </div>
                <button
                  onClick={handleAddMaterial}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg font-bold text-[10px] border border-indigo-200/40 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  상품 추가
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold">
                      <th className="py-2.5 pl-1">품명 *</th>
                      <th className="py-2.5">규격</th>
                      <th className="py-2.5 w-16 text-center">수량</th>
                      <th className="py-2.5 w-28 text-right">단가 (원)</th>
                      <th className="py-2.5 w-32 text-right">금액 (원)</th>
                      <th className="py-2.5">비고</th>
                      <th className="py-2.5 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {materials.map((it, idx) => (
                      <tr key={idx} className="group hover:bg-slate-50/50">
                        <td className="py-2.5 pr-2 pl-1">
                          <div className="flex gap-1.5 items-center">
                            <input 
                              type="text" 
                              value={it.itemCode || ""}
                              onChange={e => handleMaterialChange(idx, "itemCode", e.target.value)}
                              onBlur={e => handleItemCodeLookup(idx, e.target.value, true)}
                              placeholder="품목코드 (INV-)"
                              className="w-24 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 outline-none focus:border-indigo-500 shrink-0 font-mono font-bold"
                            />
                            <input 
                              type="text" 
                              value={it.productName || ""}
                              onChange={e => handleMaterialChange(idx, "productName", e.target.value)}
                              placeholder="상품명 입력"
                              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 outline-none focus:border-indigo-500"
                            />
                          </div>
                        </td>
                        <td className="py-2.5 pr-2">
                          <input 
                            type="text" 
                            value={it.spec || ""}
                            onChange={e => handleMaterialChange(idx, "spec", e.target.value)}
                            placeholder="규격"
                            className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 outline-none focus:border-indigo-500"
                          />
                        </td>
                        <td className="py-2.5 pr-2">
                          <input 
                            type="number" 
                            value={it.quantity || ""}
                            onChange={e => handleMaterialChange(idx, "quantity", e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-xs font-mono font-bold text-center text-slate-855 outline-none focus:border-indigo-500"
                          />
                        </td>
                        <td className="py-2.5 pr-2">
                          <input 
                            type="number" 
                            value={it.unitPrice || ""}
                            onChange={e => handleMaterialChange(idx, "unitPrice", e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-mono font-bold text-right text-slate-855 outline-none focus:border-indigo-500"
                          />
                        </td>
                        <td className="py-2.5 pr-3 text-right font-mono font-black text-slate-700">
                          {((it.quantity || 0) * (it.unitPrice || 0)).toLocaleString()}원
                        </td>
                        <td className="py-2.5 pr-2">
                          <input 
                            type="text" 
                            value={it.remark || ""}
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

            {/* 세션 1-2: 기타 부대 비용 */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 space-y-4 shadow-sm text-left">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-sm font-extrabold text-slate-800">기타 부대 비용</h3>
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
                    {extraCosts.map((it, idx) => (
                      <tr key={idx} className="group hover:bg-slate-50/50">
                        <td className="py-2.5 pr-2 pl-1">
                          <input 
                            type="text" 
                            value={it.name}
                            onChange={e => handleExtraCostChange(idx, "name", e.target.value)}
                            placeholder="비용 항목명 입력 (예: 화물 배송비, 현장 설치비)"
                            className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 outline-none focus:border-indigo-500"
                          />
                        </td>
                        <td className="py-2.5 pr-2 text-right">
                          <input 
                            type="number" 
                            value={it.amount || ""}
                            onChange={e => handleExtraCostChange(idx, "amount", e.target.value)}
                            placeholder="0"
                            className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-mono font-bold text-right text-slate-855 outline-none focus:border-indigo-500"
                          />
                        </td>
                        <td className="py-2.5 pr-2 pl-4">
                          <input 
                            type="text" 
                            value={it.remark}
                            onChange={e => handleExtraCostChange(idx, "remark", e.target.value)}
                            placeholder="비고 입력 (예: 5톤 탑차 운반 비용)"
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
                <span className="text-xs font-bold text-slate-500">기타 부대 비용 합계액:</span>
                <span className="text-sm font-black text-indigo-600 font-mono">{extraCostsTotal.toLocaleString()}원</span>
              </div>
            </div>

            {/* 최종 거래명세 금액 */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-indigo-50 border border-indigo-100 rounded-2xl p-5 shadow-inner gap-4">
                <div>
                  <span className="text-xs md:text-sm font-black text-indigo-600 uppercase tracking-wide block">최종 거래명세 금액 (부가세 별도)</span>
                  <span className="text-[10px] md:text-xs text-slate-500 font-medium block mt-1">입력된 상품 품목 및 기타 부대 비용의 공급가액 총합계입니다.</span>
                </div>
                <div className="text-3xl font-black text-indigo-750 font-mono shrink-0">
                  {grandTotal.toLocaleString()}원
                </div>
              </div>
            </div>

              {/* 세션 6: 특기사항 */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 space-y-4 text-left shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4.5 h-4.5 text-indigo-600" />
                    <h3 className="text-sm font-black text-slate-850">특기사항</h3>
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
                  placeholder="특기사항을 기입해주세요 (예: 거래명세 유효기간, 납품 및 결제 조건 등)..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-semibold leading-relaxed text-slate-800 outline-none focus:border-indigo-500 resize-none"
                  rows={4}
                />
              </div>


          </div>

          {/* 우측 실시간 A4 스타일 미리보기 및 원가 명세 (4단) */}
          <div className="xl:col-span-4 space-y-6 print:block print:w-full print:p-0 print:m-0">
            
            {/* A4 프린트 인쇄 레이아웃 미리보기 모듈 */}
            <div className="bg-white text-slate-800 border border-slate-200 rounded-3xl p-5 space-y-4 shadow-md block text-left text-[9px] font-medium leading-normal relative overflow-hidden hidden md:block print:block print:w-full print:border-none print:shadow-none print:p-0 print:m-0">
              {/* 상단 인쇄용 워터마크 안내 */}
              <div className="absolute top-2 right-2 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded text-[8px] font-bold text-slate-400 flex items-center gap-0.5 pointer-events-none print:hidden">
                <Printer className="w-2.5 h-2.5" />
                인쇄 전용 A4 프리뷰
              </div>

              <div className="text-center space-y-1 border-b border-slate-300 pb-3">
                <h2 className="text-sm font-black tracking-widest text-slate-900">거 래 명 세 서</h2>
              </div>

              <div className="flex gap-4 border-b border-slate-200 pb-3">
                {/* 공급받는자 */}
                <div className="w-[45%] shrink-0 space-y-1.5">
                  <div className="flex gap-1"><span className="text-slate-400 w-20 shrink-0 font-bold">거래명세번호:</span><span className="font-mono text-slate-700 font-bold">{meta.estimateNumber || "자동 생성대기"}</span></div>
                  <div className="flex gap-1"><span className="text-slate-400 w-20 shrink-0 font-bold">거래명세일자:</span><span className="text-slate-700 font-bold">{meta.estimateDate || "발행 당일"}</span></div>
                  <div className="flex gap-1"><span className="text-slate-400 w-20 shrink-0 font-bold">수신처:</span><span className="text-slate-900 font-bold underline decoration-slate-300 decoration-2 underline-offset-2">{buyer.companyName || "미확인 바이어"} 귀하</span></div>
                  <div className="flex gap-1"><span className="text-slate-400 w-20 shrink-0 font-bold">담당자:</span><span className="text-slate-700 font-bold">{buyer.departmentName} {buyer.managerName}</span></div>
                  <div className="flex gap-1"><span className="text-slate-400 w-20 shrink-0 font-bold">연락처:</span><span className="text-slate-700">{buyer.phone || "-"}</span></div>
                  <div className="flex gap-1"><span className="text-slate-400 w-20 shrink-0 font-bold">이메일:</span><span className="text-slate-700">{buyer.email || "-"}</span></div>
                </div>

                {/* 공급자 */}
                <div className="w-[55%] shrink-0 border-l border-slate-200 pl-4 space-y-1">
                  <div className="flex gap-1"><span className="text-slate-400 w-20 shrink-0 font-bold">등록번호:</span><span className="font-mono text-slate-800 font-bold">{formatBusinessNumber(supplier.businessNumber)}</span></div>
                  <div className="flex gap-1"><span className="text-slate-400 w-20 shrink-0 font-bold">공급자명:</span><span className="text-slate-900 font-bold">{supplier.companyName}</span></div>
                  <div className="flex gap-1"><span className="text-slate-400 w-20 shrink-0 font-bold">대표자:</span><span className="text-slate-850">{supplier.representative} (인)</span></div>
                  <div className="flex gap-1"><span className="text-slate-400 w-20 shrink-0 font-bold">소재지:</span><span className="text-slate-700 leading-tight">{supplier.address}</span></div>
                  <div className="flex gap-1"><span className="text-slate-400 w-20 shrink-0 font-bold">연락처:</span><span className="text-slate-700">{supplier.phone}</span></div>
                  <div className="flex gap-1"><span className="text-slate-400 w-20 shrink-0 font-bold">이메일:</span><span className="text-slate-700">{supplier.email}</span></div>
                  {(meta.writerName || meta.writerPhone) && (
                    <div className="flex gap-1"><span className="text-slate-400 w-20 shrink-0 font-bold">작성자/연락처:</span><span className="text-slate-700 font-bold">{meta.writerName || "-"} / {meta.writerPhone || "-"}</span></div>
                  )}
                </div>
              </div>

              {/* 총액 선언 */}
              <div className="bg-slate-50 border border-slate-200 p-2 text-center text-slate-800 flex justify-between px-4 font-bold rounded-lg">
                <span>합계 거래명세 금액:</span>
                <span className="underline underline-offset-2 font-black text-slate-900">₩{grandTotal.toLocaleString()}원 (부가세 별도)</span>
              </div>

              {/* 품목 요약 테이블 */}
              <div className="space-y-2">
                <span className="font-bold text-slate-400 text-[8px] uppercase tracking-wider block">거래명세 품목 세부 명세</span>
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
                    {/* 일반 거래명세 상품 목록 전체 출력 */}
                    {materials.filter(m => m.productName).map((m, idx) => (
                      <tr key={`m-${idx}`} className="text-slate-755">
                        <td className="py-1 pl-1 text-slate-450 font-bold font-mono">{m.itemCode || `INV-${idx + 1}`}</td>
                        <td className="py-1 break-all whitespace-normal" title={m.productName}>
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

                    {/* 기타 부대 비용 목록 전체 출력 */}
                    {extraCosts.filter(e => e.name).map((e, idx) => (
                      <tr key={`e-${idx}`} className="text-slate-755 bg-slate-50/20">
                        <td className="py-1 pl-1 text-indigo-500 font-bold font-mono">EXTRA</td>
                        <td className="py-1 break-all whitespace-normal" title={e.name}>
                          {e.name}
                          {e.remark && (
                            <span className="text-[7.5px] text-slate-400 ml-1 font-medium">({e.remark})</span>
                          )}
                        </td>
                        <td className="py-1">-</td>
                        <td className="py-1 text-center font-mono">1</td>
                        <td className="py-1 text-right font-mono pr-1">{e.amount ? e.amount.toLocaleString() : "0"}</td>
                        <td className="py-1 text-right font-mono pr-1">{e.amount ? e.amount.toLocaleString() : "0"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 특기사항 영역 */}
              {memo && memo.trim() && (
                <div className="border-t border-slate-200 pt-2.5 space-y-1 text-left">
                  <span className="font-bold text-slate-400 text-[7px] uppercase tracking-wider block">특기 사항</span>
                  <div className="bg-slate-50 border border-slate-150 rounded-xl p-2 text-[8px] text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">
                    {memo}
                  </div>
                </div>
              )}

              {/* 하단 서명 명의 */}
              <div className="pt-2 text-right text-slate-500 font-bold text-[8px] relative space-y-1 pb-3">
                <div>위와 같이 거래명세서를 제출합니다.</div>
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
                    <span className="text-slate-400 font-medium ml-1">(인)</span>
                  )}
                </div>
              </div>
            </div>

          </div>

        </div>

      {/* 7. 다중 채널 발송 시뮬레이터 모달 */}
      {isSendModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-[32px] max-w-md w-full p-6 md:p-8 shadow-2xl relative text-left space-y-6 animate-scale-up">
            
            <button 
              onClick={() => setIsSendModalOpen(false)}
              className="absolute top-5 right-5 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>

            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Send className="w-5 h-5 text-indigo-500" />
                <span>채널별 거래명세서 발송</span>
              </h3>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                작성 완료된 일반 거래명세서를 원하는 채널로 즉시 발송합니다.
              </p>
            </div>

            {/* 발송 채널 선택 (다중 선택 지원) */}
            <div className="space-y-2">
              <label className="block text-[10px] text-slate-500 font-bold">발송 채널 선택 (복수 선택 가능) *</label>
              <div className="grid grid-cols-4 gap-1.5">
                {(["EMAIL", "SMS", "FAX", "DIRECT"] as const).map(ch => {
                  const isSelected = selectedChannels.includes(ch);
                  const isConfigured = 
                    ch === "EMAIL" ? isEmailConfigured :
                    ch === "SMS" ? isSmsConfigured :
                    ch === "FAX" ? isFaxConfigured : true;

                  return (
                    <button
                      key={ch}
                      type="button"
                      disabled={!isConfigured}
                      onClick={() => {
                        if (!isConfigured) return;
                        if (isSelected) {
                          if (selectedChannels.length > 1) {
                            setSelectedChannels(selectedChannels.filter(c => c !== ch));
                          }
                        } else {
                          setSelectedChannels([...selectedChannels, ch]);
                        }
                      }}
                      className={`py-2 px-1 text-center text-[10px] font-black rounded-lg transition select-none border flex flex-col items-center justify-center gap-0.5 ${
                        !isConfigured
                          ? "bg-slate-100 border-slate-200 text-slate-300 opacity-55 cursor-not-allowed"
                          : isSelected
                            ? "bg-indigo-600 border-indigo-600 text-white shadow cursor-pointer"
                            : "bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-850 cursor-pointer"
                      }`}
                    >
                      <span className="truncate">
                        {ch === "EMAIL" && (isSelected ? "✓ 이메일" : "📧 이메일")}
                        {ch === "SMS" && (isSelected ? "✓ 문자" : "💬 문자")}
                        {ch === "FAX" && (isSelected ? "✓ 팩스" : "📠 팩스")}
                        {ch === "DIRECT" && (isSelected ? "✓ 직접" : "🤝 직접")}
                      </span>
                      {!isConfigured && (
                        <span className="text-[7px] text-rose-500 font-bold tracking-tight">설정 필요</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              {selectedChannels.includes("EMAIL") && (
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold mb-1.5">이메일 수신 주소 *</label>
                  <input 
                    type="text" 
                    value={sendEmailAddress}
                    onChange={e => setSendEmailAddress(e.target.value)}
                    placeholder="이메일 주소 입력"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              {selectedChannels.includes("SMS") && (
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold mb-1.5">문자 수신 휴대폰 번호 *</label>
                  <input 
                    type="text" 
                    value={sendSmsPhone}
                    onChange={e => setSendSmsPhone(e.target.value)}
                    placeholder="휴대폰 번호 입력"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              {selectedChannels.includes("FAX") && (
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold mb-1.5">팩스 수신 번호 *</label>
                  <input 
                    type="text" 
                    value={sendFaxNumber}
                    onChange={e => setSendFaxNumber(e.target.value)}
                    placeholder="FAX 번호 입력"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              {selectedChannels.includes("DIRECT") && (
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold mb-1.5">직접 전달 상세 메모</label>
                  <input 
                    type="text" 
                    value={sendDirectMemo}
                    onChange={e => setSendDirectMemo(e.target.value)}
                    placeholder="예: 지상현 대표 대면 전달, 퀵 발송, 종이 출력 등"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs text-slate-500 leading-relaxed font-semibold">
                <div className="flex justify-between items-center text-[10px] font-black text-indigo-500 uppercase tracking-wider border-b border-slate-200/50 pb-1.5 mb-1">
                  <span>실시간 발송 요약</span>
                  <span>FreeSMS 크레딧 무료</span>
                </div>
                <div><b>발송 대상 거래명세서:</b> {meta.estimateNumber}</div>
                <div><b>수신 바이어명:</b> {buyer.companyName} {buyer.managerName} 귀하</div>
                <div><b>최종 거래명세 금액:</b> {grandTotal.toLocaleString()}원</div>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setIsSendModalOpen(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-250 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer"
              >
                취소
              </button>
              <button 
                onClick={handleSendExecute}
                disabled={isSending}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/10"
              >
                {isSending ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>전송 처리 중...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>발송 확정</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 수주 건 다중 선택 모달 */}
      {isOrderModalOpen && (
        <OrderLookupModal 
          isOpen={isOrderModalOpen}
          onClose={() => setIsOrderModalOpen(false)}
          onSelect={handleSelectOrders}
          orders={orderList}
          buyerName={buyer.companyName}
        />
      )}

    </div>
  </div>
);
}