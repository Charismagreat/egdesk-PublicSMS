"use client";

import { apiFetch } from '@/lib/api';
import React, { useState, useEffect } from "react";
import { Upload, X, FileText, CheckCircle2, RefreshCw, Sparkles, Plus, Trash2, Calendar, Database, AlertCircle } from "lucide-react";

interface PurchaseOrderOcrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PurchaseOrderOcrModal({
  isOpen,
  onClose,
  onSuccess
}: PurchaseOrderOcrModalProps) {
  const [ocrScanning, setOcrScanning] = useState(false);
  const [ocrSuccess, setOcrSuccess] = useState(false);
  const [ocrFilename, setOcrFilename] = useState("");
  const [receiverMatched, setReceiverMatched] = useState<boolean>(true);
  const [myCompanyName, setMyCompanyName] = useState<string>("주식회사 쿠스");
  const [userRole, setUserRole] = useState<string>("SUB_OPERATOR");
  const [userName, setUserName] = useState<string>("");
  const [forceBypass, setForceBypass] = useState<boolean>(false);
  const [bypassReason, setBypassReason] = useState<string>("");
  
  // 납기일 상태 (기본 오늘로부터 7일 후)
  const [deliveryDate, setDeliveryDate] = useState<string>("");

  const [ocrForm, setOcrForm] = useState({
    partner_name: "",
    partner_phone: "",
    partner_manager: "",
    business_number: "",
    representative: "",
    address: "",
    document_number: "",
    document_date: "",
    document_memo: "",
    transaction_type: "자재구매",
    originalTotalAmount: 0,
    originalTotalQuantity: 0,
    items: [] as Array<{
      item_code?: string;
      product_name: string;
      quantity: number;
      unit_price: number;
      amount: number;
      billing_type: string;
      billing_type_name: string;
      unit: string;
      delivery_date: string;
      has_cost_breakdown: boolean;
      cost_breakdown: {
        material_cost: number;
        processing_cost: number;
        overhead_cost: number;
        other_expenses: number;
        delivery_expense: number;
      };
    }>
  });

  useEffect(() => {
    async function fetchUserRole() {
      try {
        const res = await apiFetch("/api/auth/me");
        const data = await res.json();
        if (data.success) {
          setUserRole(data.role || "SUB_OPERATOR");
          setUserName(data.username || "");
        }
      } catch (e) {
        console.error("세션 조회 실패:", e);
      }
    }

    if (isOpen) {
      fetchUserRole();
      // 기본 납기일 세팅 (7일 후)
      const future = new Date();
      future.setDate(future.getDate() + 7);
      const yyyy = future.getFullYear();
      const mm = String(future.getMonth() + 1).padStart(2, "0");
      const dd = String(future.getDate()).padStart(2, "0");
      setDeliveryDate(`${yyyy}-${mm}-${dd}`);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const resetOcrState = () => {
    setOcrScanning(false);
    setOcrSuccess(false);
    setOcrFilename("");
    setReceiverMatched(true);
    setForceBypass(false);
    setBypassReason("");
    setOcrForm({
      partner_name: "",
      partner_phone: "",
      partner_manager: "",
      business_number: "",
      representative: "",
      address: "",
      document_number: "",
      document_date: "",
      document_memo: "",
      transaction_type: "자재구매",
      originalTotalAmount: 0,
      originalTotalQuantity: 0,
      items: []
    });
  };

  const handleClose = () => {
    resetOcrState();
    onClose();
  };

  // AI 거래유형 추천 판독 알고리즘
  const detectTransactionType = (filename: string, memo: string): string => {
    const textToSearch = `${filename} ${memo}`.toLowerCase();
    
    if (
      textToSearch.includes("임가공") || 
      textToSearch.includes("가공") || 
      textToSearch.includes("도금") || 
      textToSearch.includes("절삭") || 
      textToSearch.includes("도장") ||
      textToSearch.includes("cnc") ||
      textToSearch.includes("밀링")
    ) {
      return "임가공";
    }
    
    if (
      textToSearch.includes("외주") || 
      textToSearch.includes("작업") || 
      textToSearch.includes("용역") || 
      textToSearch.includes("공사") || 
      textToSearch.includes("설치") || 
      textToSearch.includes("시공") || 
      textToSearch.includes("개발")
    ) {
      return "외주작업";
    }

    // 기본값 자재구매
    return "자재구매";
  };

  // 파일 업로드 OCR 처리
  const handleOcrFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrScanning(true);
    setOcrSuccess(false);
    setOcrFilename(file.name);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      try {
        const res = await apiFetch("/api/estimates/ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: base64Data,
            filename: file.name,
            mimeType: file.type,
            document_type: "estimate" // 자사가 바이어(받는자)로 맵핑되게 함
          })
        });
        const data = await res.json();
        if (data.success) {
          // 거래유형 자동 감지
          const memo = data.document_memo || "";
          const recommendedType = detectTransactionType(file.name, memo);

          // 품목 가공 (billing_type 및 5대원가 초기화)
          const parsedItems = (data.items || []).map((it: any) => {
            const qty = Number(it.quantity) || 1;
            const price = Number(it.unit_price) || 0;
            const amt = qty * price;
            return {
              item_code: it.item_code || it.itemCode || "",
              product_name: it.product_name || "품목명 없음",
              quantity: qty,
              unit_price: price,
              amount: amt,
              billing_type: "general",
              billing_type_name: "일반단가",
              unit: "EA",
              delivery_date: "",
              has_cost_breakdown: false,
              cost_breakdown: {
                material_cost: 0,
                processing_cost: 0,
                overhead_cost: 0,
                other_expenses: 0,
                delivery_expense: 0
              }
            };
          });

          setOcrForm({
            partner_name: data.partner_name || "",
            partner_phone: data.partner_phone || "",
            partner_manager: data.partner_manager || "",
            business_number: data.partner_business_number || "",
            representative: data.partner_representative || "",
            address: data.partner_address || "",
            document_number: data.document_number || "",
            document_date: data.document_date || "",
            document_memo: memo,
            transaction_type: recommendedType,
            originalTotalAmount: data.originalTotalAmount || 0,
            originalTotalQuantity: data.originalTotalQuantity || 0,
            items: parsedItems
          });

          setReceiverMatched(data.receiver_matched !== false);
          setMyCompanyName(data.my_company_name || "주식회사 쿠스");
          setOcrSuccess(true);
        } else {
          alert(data.error || "AI OCR 분석에 실패했습니다.");
        }
      } catch (err) {
        alert("통신 중 오류가 발생했습니다.");
      } finally {
        setOcrScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // 품목 합산금액 및 합계수량 계산
  const calculatedTotal = ocrForm.items.reduce((sum, it) => sum + (it.quantity * it.unit_price), 0);
  const calculatedTotalQuantity = ocrForm.items.reduce((sum, it) => sum + Number(it.quantity || 0), 0);
  const isAmountMatching = ocrForm.originalTotalAmount === calculatedTotal;
  const isQuantityMatching = ocrForm.originalTotalQuantity === calculatedTotalQuantity;

  // SCM DB에 직접 기입 등록 처리
  const handleSaveOcrPurchaseOrder = async () => {
    if (!ocrForm.partner_name || ocrForm.items.length === 0) {
      alert("거래처 상호와 최소 1개 이상의 품목은 필수입니다.");
      return;
    }

    // 금액 및 수량 불일치에 대한 이중 가드 컨펌 작동
    const hasAmountMismatch = ocrForm.originalTotalAmount > 0 && calculatedTotal !== ocrForm.originalTotalAmount;
    const hasQuantityMismatch = ocrForm.originalTotalQuantity > 0 && calculatedTotalQuantity !== ocrForm.originalTotalQuantity;

    if (hasAmountMismatch || hasQuantityMismatch) {
      let warningMsg = '[금액/수량 불일치 경고]\n\n';
      if (hasAmountMismatch) {
        warningMsg += `- 원본 명세서 금액(${ocrForm.originalTotalAmount.toLocaleString()}원)과 입력된 품목 합계금액(${calculatedTotal.toLocaleString()}원)이 일치하지 않습니다.\n`;
      }
      if (hasQuantityMismatch) {
        warningMsg += `- 원본 명세서 수량(${ocrForm.originalTotalQuantity.toLocaleString()}개)과 입력된 품목 합계수량(${calculatedTotalQuantity.toLocaleString()}개)이 일치하지 않습니다.\n`;
      }
      warningMsg += '\n이대로 강제로 공급사 발주서 등록을 진행하시겠습니까?';
      const confirmForce = window.confirm(warningMsg);
      if (!confirmForce) return;
    }

    try {
      // 5대 원가 및 금액 정수 처리
      const finalItems = ocrForm.items.map(it => {
        const qty = Number(it.quantity) || 0;
        const price = Number(it.unit_price) || 0;
        return {
          ...it,
          quantity: qty,
          unit_price: price,
          amount: qty * price,
          cost_breakdown: {
            material_cost: Number(it.cost_breakdown.material_cost) || 0,
            processing_cost: Number(it.cost_breakdown.processing_cost) || 0,
            overhead_cost: Number(it.cost_breakdown.overhead_cost) || 0,
            other_expenses: Number(it.cost_breakdown.other_expenses) || 0,
            delivery_expense: Number(it.cost_breakdown.delivery_expense) || 0
          }
        };
      });

      // API document_type 분기 설정 (거래 유형 및 발주에 매핑)
      let docType = "PURCHASE_ORDER_MATERIAL";
      if (ocrForm.transaction_type === "임가공") docType = "PURCHASE_ORDER_PROCESSING";
      if (ocrForm.transaction_type === "외주작업") docType = "PURCHASE_ORDER_OUTSOURCING";

      const payload = {
        document_type: docType,
        recipient_company: myCompanyName,
        recipient_address: "",
        recipient_contact: userName,
        recipient_phone: "",
        supplier_company: ocrForm.partner_name,
        supplier_address: ocrForm.address,
        supplier_owner: ocrForm.representative,
        supplier_phone: ocrForm.partner_phone,
        transaction_type: ocrForm.transaction_type,
        document_memo: `[AI OCR] ${ocrForm.document_memo || ""}\n납기일: ${deliveryDate}`,
        items: finalItems
      };

      const res = await apiFetch("/api/estimates/direct-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (data.success) {
        alert("공급사 발주서가 성공적으로 적재 및 섀도우 견적과 동시 연동되었습니다.");
        handleClose();
        onSuccess();
      } else {
        alert(data.error || "발주 등록 실패");
      }
    } catch (e) {
      alert("발주 등록 요청 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] border border-slate-100 max-w-3xl w-full p-6 md:p-8 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] text-slate-850">
        
        {/* 닫기 */}
        <button onClick={handleClose} className="absolute top-5 right-5 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors cursor-pointer">
          <X className="w-4 h-4" />
        </button>

        {/* 헤더 */}
        <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
          <span>공급사 발주서 스캔 등록 (AI OCR)</span>
        </h3>

        <div className="space-y-6 flex-1 overflow-y-auto pr-1">
          
          {/* 드롭존 */}
          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center bg-slate-50 relative min-h-[140px] overflow-hidden">
            {ocrScanning && (
              <div className="absolute inset-x-0 h-1 bg-indigo-500 animate-bounce z-20"></div>
            )}

            {ocrScanning ? (
              <div className="flex flex-col items-center space-y-2 text-center">
                <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                <span className="text-xs text-indigo-600 font-extrabold animate-pulse">Gemini Vision AI가 공급처 원본을 자동 분류 및 고해상도 판독 중...</span>
              </div>
            ) : ocrSuccess ? (
              <div className="text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <div>
                  <span className="text-xs font-bold text-slate-700 block">{ocrFilename} 스캔 완료!</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    공급처: {ocrForm.partner_name} | 거래 추천 유형: <b className="text-indigo-600">{ocrForm.transaction_type}</b>
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-3">
                <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                <div className="text-xs text-slate-500">공급처로부터 수신한 발주서(또는 주문서) 이미지 업로드 시 AI가 자동 분류 적재</div>
                <label className="inline-block px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-black text-[11px] rounded-xl border border-indigo-100 cursor-pointer shadow-sm">
                  발주서 파일 선택 (이미지 / PDF)
                  <input 
                    type="file" 
                    accept="image/*,application/pdf"
                    onChange={handleOcrFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>

          {/* 스캔 결과 폼 및 5대 비용/정산단위 보완 폼 */}
          {ocrSuccess && (
            <div className="space-y-5 animate-scale-up">
              
              {/* 수신자 가드 경고 */}
              {!receiverMatched && (
                <div className="bg-rose-50 border border-rose-100 text-rose-700 p-4 rounded-xl text-xs font-bold leading-normal flex items-start gap-2 text-left">
                  <span className="text-base shrink-0 mt-0.5">⚠️</span>
                  <div>
                    <span className="font-extrabold block text-rose-900 mb-1">수신인 불일치 경고</span>
                    본 공급문서의 청구 수신인이 우리 본사({myCompanyName})와 다르게 검출되었습니다. 
                    계열사 대리 발주 등 특수 목적이 아니라면 원본 정보를 재확인하십시오.
                  </div>
                </div>
              )}

              {/* 관리자 승인 우회 제어 */}
              {!receiverMatched && (userRole === 'SUPER_ADMIN' || userRole === 'PRESIDENT') && (
                <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl space-y-3 text-xs font-semibold text-left">
                  <span className="text-[10px] font-black text-amber-800 uppercase tracking-widest block">🛡️ 최고관리자 강제 승인 제어</span>
                  <label className="flex items-center gap-2 cursor-pointer text-amber-900 font-bold select-none">
                    <input 
                      type="checkbox" 
                      checked={forceBypass}
                      onChange={(e) => {
                        setForceBypass(e.target.checked);
                        if (!e.target.checked) setBypassReason("");
                      }}
                      className="rounded border-amber-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    경고를 무시하고 이 발주 거래를 DB에 강제 등록
                  </label>
                  {forceBypass && (
                    <div className="space-y-1.5 animate-scale-up">
                      <label className="block text-[10px] text-amber-700 font-bold">강제 등록 승인 사유 (5자 이상) *</label>
                      <input
                        type="text"
                        value={bypassReason}
                        onChange={(e) => setBypassReason(e.target.value)}
                        placeholder="예: 그룹 자회사 위탁 대리 발주건 승인"
                        className="w-full p-2.5 bg-white border border-amber-200 rounded-xl text-xs font-semibold outline-none focus:border-amber-500 text-slate-800"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* 기본 SCM 거래 메타 정보 */}
              <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-100 space-y-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block text-left">1. 거래 메타 정보 정보</span>
                
                {/* 금액 및 수량 실시간 대조 배지 바 */}
                <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-2.5 rounded-2xl text-[10px] border border-slate-200 text-left">
                  <div className="flex items-center space-x-1">
                    <span className="font-bold text-slate-500">실물총액:</span>
                    <input
                      type="number"
                      value={ocrForm.originalTotalAmount || ''}
                      onChange={(e) => setOcrForm({ ...ocrForm, originalTotalAmount: Number(e.target.value) || 0 })}
                      className="w-20 px-1.5 py-0.5 border border-slate-200 rounded text-slate-800 font-mono font-bold text-right focus:outline-none focus:border-indigo-500 bg-white"
                      placeholder="수동 입력"
                      title="명세서에 적힌 원본 최종 합계금액"
                    />
                    <span className="font-bold text-slate-500">원</span>
                  </div>
                  
                  <div className="h-3 w-px bg-slate-350 hidden md:block"></div>

                  <div className="flex items-center space-x-1">
                    <span className="font-bold text-slate-500">계산액:</span>
                    <span className="font-mono font-black text-slate-800">{calculatedTotal.toLocaleString()}원</span>
                  </div>

                  <div className="h-3 w-px bg-slate-350"></div>
                  {isAmountMatching ? (
                    <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded text-[9px] font-black flex items-center gap-0.5 leading-none">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      금액 일치
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 bg-rose-50 text-rose-600 border border-rose-200 rounded text-[9px] font-black flex items-center gap-0.5 leading-none animate-pulse">
                      <AlertCircle className="w-2.5 h-2.5" />
                      금액 불일치
                    </span>
                  )}

                  <div className="h-4 w-px bg-slate-300 w-full md:w-px md:h-3"></div>

                  <div className="flex items-center space-x-1">
                    <span className="font-bold text-slate-500">실물수량:</span>
                    <input
                      type="number"
                      value={ocrForm.originalTotalQuantity || ''}
                      onChange={(e) => setOcrForm({ ...ocrForm, originalTotalQuantity: Number(e.target.value) || 0 })}
                      className="w-14 px-1.5 py-0.5 border border-slate-200 rounded text-slate-800 font-mono font-bold text-right focus:outline-none focus:border-indigo-500 bg-white"
                      placeholder="수동 입력"
                      title="명세서에 적힌 원본 최종 합계 수량"
                    />
                    <span className="font-bold text-slate-500">개</span>
                  </div>

                  <div className="h-3 w-px bg-slate-350 hidden md:block"></div>

                  <div className="flex items-center space-x-1">
                    <span className="font-bold text-slate-500">계산수량:</span>
                    <span className="font-mono font-black text-slate-800">{calculatedTotalQuantity.toLocaleString()}개</span>
                  </div>

                  <div className="h-3 w-px bg-slate-350"></div>
                  {isQuantityMatching ? (
                    <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded text-[9px] font-black flex items-center gap-0.5 leading-none">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      수량 일치
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 bg-rose-50 text-rose-600 border border-rose-200 rounded text-[9px] font-black flex items-center gap-0.5 leading-none animate-pulse">
                      <AlertCircle className="w-2.5 h-2.5" />
                      수량 불일치
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-left">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">공급처 상호</label>
                    <input 
                      type="text" 
                      value={ocrForm.partner_name}
                      onChange={e => setOcrForm({ ...ocrForm, partner_name: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">연락처</label>
                    <input 
                      type="text" 
                      value={ocrForm.partner_phone}
                      onChange={e => setOcrForm({ ...ocrForm, partner_phone: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">대표자명</label>
                    <input 
                      type="text" 
                      value={ocrForm.representative}
                      onChange={e => setOcrForm({ ...ocrForm, representative: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-left">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">거래 유형 (AI 자동추천 완료)</label>
                    <div className="flex gap-1.5">
                      <input 
                        type="text" 
                        value={ocrForm.transaction_type}
                        onChange={e => setOcrForm({ ...ocrForm, transaction_type: e.target.value })}
                        className="flex-1 p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                      />
                      <div className="flex gap-1">
                        {["자재구매", "임가공", "외주작업"].map(t => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setOcrForm({ ...ocrForm, transaction_type: t })}
                            className={`px-2 py-1 rounded-lg text-[9px] font-black border transition cursor-pointer ${
                              ocrForm.transaction_type === t
                                ? "bg-indigo-600 border-indigo-600 text-white"
                                : "bg-white border-slate-200 text-slate-600"
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                      약정 납기일 지정
                    </label>
                    <input 
                      type="date" 
                      value={deliveryDate}
                      onChange={e => setDeliveryDate(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">소재지 주소</label>
                    <input 
                      type="text" 
                      value={ocrForm.address}
                      onChange={e => setOcrForm({ ...ocrForm, address: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* SCM 품목 정보 및 5대원가 토글 */}
              <div className="p-4 bg-white border border-slate-150 rounded-2xl text-left space-y-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block border-b border-slate-100 pb-1.5">
                  2. 세부 품목별 정산단위 및 5대비용 명세 조율
                </span>
                
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                  {ocrForm.items.map((item, idx) => (
                    <div key={idx} className="p-4 bg-slate-50/50 rounded-xl border border-slate-200 space-y-3 relative">
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 pr-2">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 mb-1">품목코드</label>
                          <input 
                            type="text" 
                            value={item.item_code || ""}
                            onChange={e => {
                              const newItems = [...ocrForm.items];
                              newItems[idx].item_code = e.target.value;
                              setOcrForm({ ...ocrForm, items: newItems });
                            }}
                            className="w-full p-1.5 bg-white border border-slate-200 rounded text-xs font-bold"
                            placeholder="코드"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-[9px] font-bold text-slate-500 mb-1">품명 및 규격 *</label>
                          <input 
                            type="text" 
                            value={item.product_name}
                            onChange={e => {
                              const newItems = [...ocrForm.items];
                              newItems[idx].product_name = e.target.value;
                              setOcrForm({ ...ocrForm, items: newItems });
                            }}
                            className="w-full p-1.5 bg-white border border-slate-200 rounded text-xs font-bold"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 mb-1">정산 방식</label>
                          <select
                            value={item.billing_type}
                            onChange={e => {
                              const type = e.target.value;
                              const newItems = [...ocrForm.items];
                              newItems[idx].billing_type = type;
                              if (type === "general") {
                                newItems[idx].billing_type_name = "일반단가";
                                newItems[idx].unit = "EA";
                              } else if (type === "lump_sum") {
                                newItems[idx].billing_type_name = "1식";
                                newItems[idx].unit = "식";
                                newItems[idx].quantity = 1;
                              } else if (type === "hourly") {
                                newItems[idx].billing_type_name = "시간당";
                                newItems[idx].unit = "Hour";
                              }
                              newItems[idx].amount = newItems[idx].quantity * newItems[idx].unit_price;
                              setOcrForm({ ...ocrForm, items: newItems });
                            }}
                            className="w-full p-1.5 bg-white border border-slate-200 rounded text-xs font-bold cursor-pointer text-slate-700"
                          >
                            <option value="general">일반단가 (EA)</option>
                            <option value="lump_sum">1식 정산 (식)</option>
                            <option value="hourly">시간당 정산 (Hour)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 mb-1">수량</label>
                          <input 
                            type="number" 
                            value={item.quantity}
                            disabled={item.billing_type === "lump_sum"}
                            onChange={e => {
                              const qty = Number(e.target.value) || 0;
                              const newItems = [...ocrForm.items];
                              newItems[idx].quantity = qty;
                              newItems[idx].amount = qty * newItems[idx].unit_price;
                              setOcrForm({ ...ocrForm, items: newItems });
                            }}
                            className="w-full p-1.5 bg-white border border-slate-200 rounded text-xs font-bold disabled:bg-slate-100"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 mb-1">단가 (원)</label>
                          <input 
                            type="number" 
                            value={item.unit_price}
                            onChange={e => {
                              const price = Number(e.target.value) || 0;
                              const newItems = [...ocrForm.items];
                              newItems[idx].unit_price = price;
                              newItems[idx].amount = newItems[idx].quantity * price;
                              setOcrForm({ ...ocrForm, items: newItems });
                            }}
                            className="w-full p-1.5 bg-white border border-slate-200 rounded text-xs font-bold"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pr-2">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 mb-1">정산단위</label>
                          <input 
                            type="text" 
                            value={item.unit}
                            onChange={e => {
                              const newItems = [...ocrForm.items];
                              newItems[idx].unit = e.target.value;
                              setOcrForm({ ...ocrForm, items: newItems });
                            }}
                            className="w-full p-1.5 bg-white border border-slate-200 rounded text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 mb-1">개별 납기일</label>
                          <input 
                            type="date" 
                            value={item.delivery_date || ""}
                            onChange={e => {
                              const newItems = [...ocrForm.items];
                              newItems[idx].delivery_date = e.target.value;
                              setOcrForm({ ...ocrForm, items: newItems });
                            }}
                            className="w-full p-1.5 bg-white border border-slate-200 rounded text-xs font-bold cursor-pointer"
                          />
                        </div>
                        <div className="flex items-center pt-5">
                          <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-650 cursor-pointer select-none">
                            <input 
                              type="checkbox" 
                              checked={item.has_cost_breakdown}
                              onChange={e => {
                                const newItems = [...ocrForm.items];
                                newItems[idx].has_cost_breakdown = e.target.checked;
                                setOcrForm({ ...ocrForm, items: newItems });
                              }}
                              className="rounded border-slate-300 text-indigo-600 w-3.5 h-3.5 cursor-pointer"
                            />
                            5대 원가 분석 추가
                          </label>
                        </div>
                        <div className="md:col-span-2 flex items-center justify-end pt-5">
                          <span className="text-[10px] font-bold text-slate-400">품목 총액:</span>
                          <span className="text-xs font-black text-indigo-600 ml-1.5 font-mono">
                            {(item.quantity * item.unit_price).toLocaleString()}원
                          </span>
                        </div>
                      </div>

                      {/* 5대 원가 입력 */}
                      {item.has_cost_breakdown && (
                        <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2 text-[9px]">
                          <span className="font-extrabold text-indigo-600 block">↳ 5대 비용 명세 분석</span>
                          <div className="grid grid-cols-5 gap-1.5">
                            <div>
                              <label className="block font-bold text-slate-500 mb-0.5">자재비</label>
                              <input 
                                type="number"
                                value={item.cost_breakdown.material_cost}
                                onChange={e => {
                                  const val = Number(e.target.value) || 0;
                                  const newItems = [...ocrForm.items];
                                  newItems[idx].cost_breakdown.material_cost = val;
                                  setOcrForm({ ...ocrForm, items: newItems });
                                }}
                                className="w-full p-1 bg-slate-50 border border-slate-200 rounded text-xs font-semibold"
                              />
                            </div>
                            <div>
                              <label className="block font-bold text-slate-500 mb-0.5">외주가공비</label>
                              <input 
                                type="number"
                                value={item.cost_breakdown.processing_cost}
                                onChange={e => {
                                  const val = Number(e.target.value) || 0;
                                  const newItems = [...ocrForm.items];
                                  newItems[idx].cost_breakdown.processing_cost = val;
                                  setOcrForm({ ...ocrForm, items: newItems });
                                }}
                                className="w-full p-1 bg-slate-50 border border-slate-200 rounded text-xs font-semibold"
                              />
                            </div>
                            <div>
                              <label className="block font-bold text-slate-500 mb-0.5">일반관리비</label>
                              <input 
                                type="number"
                                value={item.cost_breakdown.overhead_cost}
                                onChange={e => {
                                  const val = Number(e.target.value) || 0;
                                  const newItems = [...ocrForm.items];
                                  newItems[idx].cost_breakdown.overhead_cost = val;
                                  setOcrForm({ ...ocrForm, items: newItems });
                                }}
                                className="w-full p-1 bg-slate-50 border border-slate-200 rounded text-xs font-semibold"
                              />
                            </div>
                            <div>
                              <label className="block font-bold text-slate-500 mb-0.5">기타경비</label>
                              <input 
                                type="number"
                                value={item.cost_breakdown.other_expenses}
                                onChange={e => {
                                  const val = Number(e.target.value) || 0;
                                  const newItems = [...ocrForm.items];
                                  newItems[idx].cost_breakdown.other_expenses = val;
                                  setOcrForm({ ...ocrForm, items: newItems });
                                }}
                                className="w-full p-1 bg-slate-50 border border-slate-200 rounded text-xs font-semibold"
                              />
                            </div>
                            <div>
                              <label className="block font-bold text-slate-500 mb-0.5">운반비</label>
                              <input 
                                type="number"
                                value={item.cost_breakdown.delivery_expense}
                                onChange={e => {
                                  const val = Number(e.target.value) || 0;
                                  const newItems = [...ocrForm.items];
                                  newItems[idx].cost_breakdown.delivery_expense = val;
                                  setOcrForm({ ...ocrForm, items: newItems });
                                }}
                                className="w-full p-1 bg-slate-50 border border-slate-200 rounded text-xs font-semibold"
                              />
                            </div>
                          </div>
                          {/* 실시간 밸리데이션 */}
                          {(() => {
                            const sum = 
                              Number(item.cost_breakdown.material_cost) +
                              Number(item.cost_breakdown.processing_cost) +
                              Number(item.cost_breakdown.overhead_cost) +
                              Number(item.cost_breakdown.other_expenses) +
                              Number(item.cost_breakdown.delivery_expense);
                            const diff = item.amount - sum;
                            return (
                              <div className="flex justify-between items-center text-[9px] font-bold mt-1 border-t border-slate-100 pt-1 leading-none">
                                <span className="text-slate-400">비용 총합계: {sum.toLocaleString()}원</span>
                                {diff !== 0 ? (
                                  <span className="text-rose-500 font-extrabold animate-pulse">
                                    ⚠️ 차액: {diff > 0 ? `+${diff.toLocaleString()}` : diff.toLocaleString()}원
                                  </span>
                                ) : (
                                  <span className="text-emerald-600">✓ 비용 구성이 품목 합계와 일치합니다.</span>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 총액 패널 */}
              <div className="p-4 bg-indigo-50/40 rounded-2xl border border-indigo-100 flex items-center justify-between text-left shrink-0">
                <span className="text-xs font-extrabold text-slate-600">스캔 발주 등록 예정 총액 (총 {ocrForm.items.length}개 품목)</span>
                <span className="text-lg font-black text-indigo-700 font-mono">
                  {ocrForm.items.reduce((sum, it) => sum + it.amount, 0).toLocaleString()}원
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 푸터 버튼 */}
        <div className="mt-6 border-t border-slate-100 pt-4 flex gap-3 shrink-0">
          <button onClick={handleClose} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-extrabold text-xs cursor-pointer transition">
            취소
          </button>
          <button 
            onClick={handleSaveOcrPurchaseOrder}
            disabled={!ocrSuccess || (!receiverMatched && !forceBypass) || (forceBypass && bypassReason.trim().length < 5)}
            className={`flex-1 py-3 text-white font-extrabold text-xs rounded-xl disabled:opacity-40 transition cursor-pointer flex items-center justify-center gap-1.5 ${
              forceBypass 
                ? "bg-amber-600 hover:bg-amber-700" 
                : "bg-indigo-650 hover:bg-indigo-700"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            {forceBypass ? "⚠️ 관리자 강제 등록 실행" : "발주서 DB 등록 승인"}
          </button>
        </div>
      </div>
    </div>
  );
}
