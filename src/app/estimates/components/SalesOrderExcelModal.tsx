"use client";

import { apiFetch } from '@/lib/api';
import React, { useState, useEffect } from "react";
import { Upload, X, FileText, CheckCircle2, RefreshCw, Sparkles, Database, Calendar } from "lucide-react";
import { createPortal } from "react-dom";
import ProcessingOverlay from "../../../components/ProcessingOverlay";
import { 
  parsePurchaseOrderExcel, 
  ExcelParsedPurchaseOrder, 
  getExcelColumnsAndRawData, 
  parseExcelWithMapping, 
  ExcelColumnMapping 
} from "../utils";

interface SalesOrderExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preParsedData?: ExcelParsedPurchaseOrder | null;
  uploadedFile?: File | null;
}

export default function SalesOrderExcelModal({
  isOpen,
  onClose,
  onSuccess,
  preParsedData,
  uploadedFile
}: SalesOrderExcelModalProps) {
  const [parsing, setParsing] = useState(false);
  const [parseSuccess, setParseSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<"upload" | "mapping" | "review">("upload");
  const [filename, setFilename] = useState("");
  const [excelData, setExcelData] = useState<{
    columns: string[];
    rawRows: any[][];
    headerRowIndex: number;
  } | null>(null);
  const [fileObject, setFileObject] = useState<File | null>(null);

  const [mapping, setMapping] = useState<ExcelColumnMapping>({
    partner_name: "",
    partner_phone: "",
    business_number: "",
    representative: "",
    partner_manager: "",
    document_number: "",
    document_date: "",
    address: "",
    document_memo: "",
    item_code: "",
    product_name: "",
    spec: "",
    quantity: "",
    unit_price: "",
    delivery_date: ""
  });
  const [headerSignature, setHeaderSignature] = useState("");
  const [rememberFormat, setRememberFormat] = useState(true);
  
  const [myCompanyName, setMyCompanyName] = useState<string>("주식회사 쿠스");
  const [userRole, setUserRole] = useState<string>("SUB_OPERATOR");
  const [userName, setUserName] = useState<string>("");
  const [deliveryDate, setDeliveryDate] = useState<string>("");

  const [form, setForm] = useState({
    partner_name: "",
    partner_phone: "",
    partner_manager: "",
    business_number: "",
    representative: "",
    address: "",
    document_number: "",
    document_date: "",
    document_memo: "",
    items: [] as Array<{
      item_code?: string;
      product_name: string;
      spec?: string;
      quantity: number;
      unit_price: number;
      amount: number;
      delivery_date?: string;
    }>
  });

  const isDirectField = (field: string): boolean => {
    const val = mapping[field as keyof ExcelColumnMapping] || "";
    return val === "__DIRECT__" || val.startsWith("__DIRECT_VALUE__:");
  };

  const renderLabel = (label: string, field: string) => {
    const isDirect = isDirectField(field);
    return (
      <div className="flex items-center gap-1.5 mb-1">
        <label className="text-[10px] text-slate-450 font-black block">{label}</label>
        {isDirect ? (
          <span className="px-1.5 py-0.5 bg-amber-50/70 text-amber-700 border border-amber-200/60 text-[9px] font-black rounded-md flex items-center shadow-sm select-none">
            ✍️ 직접 입력됨
          </span>
        ) : (
          <span className="px-1.5 py-0.5 bg-blue-50/70 text-blue-700 border border-blue-200/60 text-[9px] font-black rounded-md flex items-center shadow-sm select-none">
            ⚡ 엑셀 자동추출
          </span>
        )}
      </div>
    );
  };

  const getInputClassName = (field: string) => {
    const isDirect = isDirectField(field);
    return `w-full p-2.5 rounded-xl text-xs font-bold outline-none border transition-colors ${
      isDirect
        ? "bg-amber-50/20 border-amber-200 text-amber-900 focus:border-amber-450"
        : "bg-white border-slate-200 focus:border-indigo-500"
    }`;
  };

  useEffect(() => {
    async function fetchUserRoleAndCompany() {
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

      try {
        const resSettings = await apiFetch("/api/production/grant");
        const dataSettings = await resSettings.json();
        if (dataSettings.success && dataSettings.companyProfile?.company_name) {
          setMyCompanyName(dataSettings.companyProfile.company_name);
        }
      } catch (e) {
        console.error("회사 정보 조회 실패:", e);
      }
    }

    if (isOpen) {
      fetchUserRoleAndCompany();
      const future = new Date();
      future.setDate(future.getDate() + 7);
      const yyyy = future.getFullYear();
      const mm = String(future.getMonth() + 1).padStart(2, "0");
      const dd = String(future.getDate()).padStart(2, "0");
      setDeliveryDate(`${yyyy}-${mm}-${dd}`);

      if (uploadedFile) {
        const processFile = async (file: File) => {
          setParsing(true);
          setParseSuccess(false);
          setFilename(file.name);
          setFileObject(file);

          try {
            const res = await getExcelColumnsAndRawData(file);
            setExcelData(res);

            // 엑셀 헤더 시그니처 분석
            const parsedTmp = await parsePurchaseOrderExcel(file);
            const sig = parsedTmp.header_signature;
            setHeaderSignature(sig);

            let loadedMapping: ExcelColumnMapping | null = null;
            try {
              const sigRes = await apiFetch("/api/estimates/excel-signatures");
              const sigData = await sigRes.json();
              if (sigData.success && Array.isArray(sigData.configs)) {
                const matched = sigData.configs.find((c: any) => c.header_signature === sig);
                if (matched && matched.mapping_info) {
                  loadedMapping = JSON.parse(matched.mapping_info);
                }
              }
            } catch (sigErr) {
              console.error("이전 매핑 설정 불러오기 실패:", sigErr);
            }

            if (loadedMapping) {
              setMapping(loadedMapping);
            } else {
              const cols = res.columns;
              const getRecommended = (keywords: string[]) => {
                for (const col of cols) {
                  const c = col.toLowerCase().trim();
                  for (const kw of keywords) {
                    if (c.includes(kw.toLowerCase())) return col;
                  }
                }
                return "";
              };

              const initialMapping: ExcelColumnMapping = {
                partner_name: getRecommended(['바이어', '상호', '업체명', '고객사', '거래처', '회사', '공급', 'buyer', 'partner']),
                partner_phone: getRecommended(['연락처', '전화번호', '휴대폰', '전화', 'phone', 'tel']),
                business_number: getRecommended(['사업자', '사업자등록', '등록번호', 'business', 'no']),
                representative: getRecommended(['대표', '대표자', '성명', '대표명', 'owner', 'ceo']),
                partner_manager: getRecommended(['담당자', '바이어담당', 'manager', 'contact']),
                document_number: getRecommended(['발주번호', '주문번호', '문서번호', 'po', 'order', 'doc']),
                document_date: getRecommended(['발주일자', '등록일자', '일자', '날짜', 'date']),
                address: getRecommended(['주소', '소재지', '사업장', 'address']),
                document_memo: getRecommended(['비고', '메모', 'memo', 'note']),
                item_code: getRecommended(['품목코드', '코드', 'code', 'Code', 'itemcode']),
                product_name: getRecommended(['품명', '상품명', '품목명', '자재명', '품목', 'product', 'item']),
                spec: getRecommended(['규격', '사양', 'spec', 'Spec', 'size']),
                quantity: getRecommended(['수량', 'qty', 'Qty', 'quantity', 'count']),
                unit_price: getRecommended(['단가', 'price', 'Price', 'cost']),
                delivery_date: getRecommended(['납기', '납기일', '납기일자', '예정일', 'delivery'])
              };
              setMapping(initialMapping);
            }
            
            setStep("mapping");
          } catch (err) {
            alert("엑셀 파일 로드 중 오류가 발생했습니다.");
            setFilename("");
            setStep("upload");
          } finally {
            setParsing(false);
          }
        };
        processFile(uploadedFile);
      } else if (preParsedData) {
        setForm({
          partner_name: preParsedData.partner_name || "",
          partner_phone: preParsedData.partner_phone || "",
          partner_manager: preParsedData.partner_manager || "",
          business_number: preParsedData.business_number || "",
          representative: preParsedData.representative || "",
          address: preParsedData.address || "",
          document_number: preParsedData.document_number || "",
          document_date: preParsedData.document_date || "",
          document_memo: preParsedData.document_memo || "",
          items: (preParsedData.items || []).map(it => ({
            item_code: it.item_code || "",
            product_name: it.product_name || "",
            spec: it.spec || "",
            quantity: Number(it.quantity) || 1,
            unit_price: Number(it.unit_price) || 0,
            amount: (Number(it.quantity) || 1) * (Number(it.unit_price) || 0),
            delivery_date: it.delivery_date || ""
          }))
        });
        setHeaderSignature(preParsedData.header_signature || "");
        setFilename("업로드된 엑셀 파일");
        setParseSuccess(true);
        setStep("review");
      }
    }
  }, [isOpen, preParsedData, uploadedFile]);

  if (!isOpen) return null;

  const resetState = () => {
    setParsing(false);
    setParseSuccess(false);
    setStep("upload");
    setExcelData(null);
    setFileObject(null);
    setFilename("");
    setHeaderSignature("");
    setRememberFormat(true);
    setForm({
      partner_name: "",
      partner_phone: "",
      partner_manager: "",
      business_number: "",
      representative: "",
      address: "",
      document_number: "",
      document_date: "",
      document_memo: "",
      items: []
    });
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleExcelFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsing(true);
    setParseSuccess(false);
    setFilename(file.name);
    setFileObject(file);

    try {
      const res = await getExcelColumnsAndRawData(file);
      setExcelData(res);

      const cols = res.columns;
      const getRecommended = (keywords: string[]) => {
        for (const col of cols) {
          const c = col.toLowerCase().trim();
          for (const kw of keywords) {
            if (c.includes(kw.toLowerCase())) return col;
          }
        }
        return "";
      };

      const initialMapping: ExcelColumnMapping = {
        partner_name: getRecommended(['바이어', '상호', '업체명', '고객사', '거래처', '회사', '공급', 'buyer', 'partner']),
        partner_phone: getRecommended(['연락처', '전화번호', '휴대폰', '전화', 'phone', 'tel']),
        business_number: getRecommended(['사업자', '사업자등록', '등록번호', 'business', 'no']),
        representative: getRecommended(['대표', '대표자', '성명', '대표명', 'owner', 'ceo']),
        partner_manager: getRecommended(['담당자', '바이어담당', 'manager', 'contact']),
        document_number: getRecommended(['발주번호', '주문번호', '문서번호', 'po', 'order', 'doc']),
        document_date: getRecommended(['발주일자', '등록일자', '일자', '날짜', 'date']),
        address: getRecommended(['주소', '소재지', '사업장', 'address']),
        document_memo: getRecommended(['비고', '메모', 'memo', 'note']),
        item_code: getRecommended(['품목코드', '코드', 'code', 'Code', 'itemcode']),
        product_name: getRecommended(['품명', '상품명', '품목명', '자재명', '품목', 'product', 'item']),
        spec: getRecommended(['규격', '사양', 'spec', 'Spec', 'size']),
        quantity: getRecommended(['수량', 'qty', 'Qty', 'quantity', 'count']),
        unit_price: getRecommended(['단가', 'price', 'Price', 'cost']),
        delivery_date: getRecommended(['납기', '납기일', '납기일자', '예정일', 'delivery'])
      };

      setMapping(initialMapping);
      setStep("mapping");
    } catch (err) {
      alert("엑셀 파일 로드 중 오류가 발생했습니다.");
      setFilename("");
    } finally {
      setParsing(false);
    }
  };

  const handleRunParsing = () => {
    if (!mapping.product_name) {
      alert("수주 정보 적재를 위해 품명(필수) 매핑은 반드시 설정되어야 합니다.");
      return;
    }
    if (!excelData || !fileObject) return;

    setParsing(true);
    try {
      const parsedData = parseExcelWithMapping(
        excelData.rawRows,
        excelData.headerRowIndex,
        mapping,
        fileObject.name
      );

      setForm({
        partner_name: parsedData.partner_name || "",
        partner_phone: parsedData.partner_phone || "",
        partner_manager: parsedData.partner_manager || "",
        business_number: parsedData.business_number || "",
        representative: parsedData.representative || "",
        address: parsedData.address || "",
        document_number: parsedData.document_number || "",
        document_date: parsedData.document_date || "",
        document_memo: parsedData.document_memo || "",
        items: (parsedData.items || []).map(it => ({
          item_code: it.item_code || "",
          product_name: it.product_name || "",
          spec: it.spec || "",
          quantity: Number(it.quantity) || 1,
          unit_price: Number(it.unit_price) || 0,
          amount: (Number(it.quantity) || 1) * (Number(it.unit_price) || 0),
          delivery_date: it.delivery_date || ""
        }))
      });
      setHeaderSignature(parsedData.header_signature || "");
      setParseSuccess(true);
      setStep("review");
    } catch (err) {
      alert("매핑 적용 파싱 중 오류가 발생했습니다. 선택한 필드를 확인해 주세요.");
    } finally {
      setParsing(false);
    }
  };

  const handleSaveSalesOrder = async () => {
    if (!form.partner_name || form.items.length === 0) {
      alert("바이어 상호와 최소 1개 이상의 품목은 필수입니다.");
      return;
    }

    try {
      setIsProcessing(true);

      // 파일 객체를 Base64 데이터 URL로 인코딩하여 원본 복원 지원
      let fileUrl = "";
      if (fileObject) {
        try {
          fileUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(fileObject);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (e) => reject(e);
          });
        } catch (fileErr) {
          console.error("엑셀 파일 Base64 변환 실패:", fileErr);
          fileUrl = filename || "excel_import.xlsx";
        }
      } else if (preParsedData && preParsedData.file_url) {
        fileUrl = preParsedData.file_url;
      } else {
        fileUrl = filename || "excel_import.xlsx";
      }

      const finalItems = form.items.map(it => {
        const qty = Number(it.quantity) || 0;
        const price = Number(it.unit_price) || 0;
        return {
          item_code: it.item_code || "",
          product_name: it.product_name,
          spec: it.spec || "",
          quantity: qty,
          unit_price: price,
          delivery_date: it.delivery_date || ""
        };
      });

      const payload = {
        partner_name: form.partner_name,
        partner_phone: form.partner_phone,
        partner_manager: form.partner_manager,
        items: finalItems,
        file_url: fileUrl,
        business_number: form.business_number,
        representative: form.representative,
        address: form.address,
        document_number: form.document_number || `SO-${Date.now()}`,
        document_date: form.document_date || new Date().toISOString().substring(0, 10),
        delivery_date: deliveryDate,
        document_memo: `[엑셀 일괄등록] ${form.document_memo || ""}`,
        approvers: []
      };

      const res = await apiFetch("/api/estimates/ocr-sales-order?action=save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (data.success) {
        // 학습 시그니처 영속 등록
        if (rememberFormat && headerSignature) {
          try {
            await apiFetch("/api/estimates/excel-signatures", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                header_signature: headerSignature,
                partner_name: form.partner_name,
                transaction_type: "자재구매",
                mapping_info: JSON.stringify(mapping)
              })
            });
          } catch (sigErr) {
            console.error("엑셀 자동 승인 시그니처 등록 실패:", sigErr);
          }
        }

        alert("바이어 발주서가 성공적으로 접수 대장(수주 대장)에 적재되었습니다.");
        handleClose();
        onSuccess();
      } else {
        alert(data.error || "수주 등록 실패");
      }
    } catch (e) {
      alert("수주 등록 요청 중 오류가 발생했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

  return typeof window !== "undefined" ? createPortal(
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] border border-slate-100 max-w-xl w-full p-6 md:p-8 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] text-slate-850 animate-scale-up">
        
        {/* 닫기 */}
        <button 
          onClick={handleClose} 
          disabled={parsing}
          className="absolute top-5 right-5 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors cursor-pointer disabled:opacity-55"
        >
          <X className="w-4 h-4" />
        </button>

        {/* 헤더 */}
        <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-4">
          <Upload className="w-5 h-5 text-indigo-500" />
          <span>바이어 발주서 엑셀 등록 (수주 대장)</span>
        </h3>

        <div className="space-y-6 flex-1 overflow-y-auto pr-1">
          
          {/* 1. 파일 업로드 단계 (upload) */}
          {step === "upload" && (
            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center bg-slate-50 relative min-h-[140px] overflow-hidden shrink-0">
              {parsing && (
                <div className="absolute inset-x-0 h-1 bg-indigo-500 animate-bounce z-20"></div>
              )}

              {parsing ? (
                <div className="flex flex-col items-center space-y-2 text-center">
                  <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                  <span className="text-xs text-indigo-600 font-extrabold animate-pulse">엑셀 데이터 셀 스캔 및 컬럼 헤더 자동 분석 중...</span>
                </div>
              ) : (
                <div className="text-center space-y-3">
                  <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                  <div className="text-xs text-slate-500">바이어(고객)로부터 수신한 발주서 엑셀 파일(.xlsx, .xls)을 선택해 주세요.</div>
                  <label className="inline-block px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-black text-[11px] rounded-xl border border-indigo-100 cursor-pointer shadow-sm">
                    발주서 파일 선택 (Excel)
                    <input 
                      type="file" 
                      accept=".xlsx,.xls"
                      onChange={handleExcelFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>
          )}

          {/* 2. 컬럼 매핑 단계 (mapping) */}
          {step === "mapping" && excelData && (
            <div className="space-y-5 animate-scale-up text-left">
              <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-2xl text-xs font-bold leading-normal text-indigo-900">
                ⚡ 엑셀 파일 로드 완료! 적재될 데이터 필드와 엑셀 열(Column) 헤더를 지정해 주세요.
              </div>

              {/* 바이어 메타 매핑 */}
              <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-100 space-y-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  1. 바이어 정보 매핑
                </span>
                
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "바이어 상호 *", field: "partner_name" },
                    { label: "연락처", field: "partner_phone" },
                    { label: "사업자등록번호", field: "business_number" },
                    { label: "대표자명", field: "representative" },
                    { label: "담당자명", field: "partner_manager" },
                    { label: "문서 발주번호", field: "document_number" },
                    { label: "문서 발주일자", field: "document_date" },
                    { label: "소재지 주소", field: "address" },
                    { label: "기타 비고", field: "document_memo" },
                  ].map((item) => {
                    const currentVal = mapping[item.field as keyof ExcelColumnMapping] || "";
                    const isDirect = currentVal === "__DIRECT__" || currentVal.startsWith("__DIRECT_VALUE__:");
                    const directValue = currentVal.startsWith("__DIRECT_VALUE__:") ? currentVal.substring("__DIRECT_VALUE__:".length) : "";

                    return (
                      <div key={item.field} className="space-y-1">
                        <label className="text-[10px] text-slate-500 font-bold block">{item.label}</label>
                        <select
                          value={isDirect ? "__DIRECT__" : currentVal}
                          onChange={(e) => {
                            if (e.target.value === "__DIRECT__") {
                              setMapping({ ...mapping, [item.field]: "__DIRECT_VALUE__:" });
                            } else {
                              setMapping({ ...mapping, [item.field]: e.target.value });
                            }
                          }}
                          className={`w-full p-2 bg-white border rounded-xl text-xs font-bold outline-none focus:border-indigo-500 cursor-pointer ${
                            isDirect 
                              ? "border-amber-300 bg-amber-50/10 text-amber-900 focus:border-amber-500" 
                              : "border-slate-200"
                          }`}
                        >
                          <option value="">(매핑 안함)</option>
                          <option value="__DIRECT__">✍️ 직접 입력...</option>
                          {excelData.columns.map(col => (
                            <option key={col} value={col}>{col}</option>
                          ))}
                        </select>
                        {isDirect && (
                          <input
                            type="text"
                            value={directValue}
                            onChange={(e) => {
                              setMapping({ ...mapping, [item.field]: `__DIRECT_VALUE__:${e.target.value}` });
                            }}
                            placeholder="값 직접 입력"
                            className="w-full p-2 bg-amber-50/20 border border-amber-200 text-amber-900 rounded-xl text-xs font-bold outline-none focus:border-amber-450 animate-scale-up"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 품목 정보 매핑 */}
              <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-100 space-y-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  2. 세부 품목 매핑
                </span>
                
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "품명 * (필수)", field: "product_name" },
                    { label: "품목코드", field: "item_code" },
                    { label: "규격(Spec)", field: "spec" },
                    { label: "수량", field: "quantity" },
                    { label: "단가 (원)", field: "unit_price" },
                    { label: "개별 납기일", field: "delivery_date" },
                  ].map((item) => {
                    const currentVal = mapping[item.field as keyof ExcelColumnMapping] || "";
                    const isDirect = currentVal === "__DIRECT__" || currentVal.startsWith("__DIRECT_VALUE__:");
                    const directValue = currentVal.startsWith("__DIRECT_VALUE__:") ? currentVal.substring("__DIRECT_VALUE__:".length) : "";

                    return (
                      <div key={item.field} className="space-y-1">
                        <label className="text-[10px] text-slate-500 font-bold block">{item.label}</label>
                        <select
                          value={isDirect ? "__DIRECT__" : currentVal}
                          onChange={(e) => {
                            if (e.target.value === "__DIRECT__") {
                              setMapping({ ...mapping, [item.field]: "__DIRECT_VALUE__:" });
                            } else {
                              setMapping({ ...mapping, [item.field]: e.target.value });
                            }
                          }}
                          className={`w-full p-2 bg-white border rounded-xl text-xs font-bold outline-none focus:border-indigo-500 cursor-pointer ${
                            isDirect
                              ? "border-amber-300 bg-amber-50/10 text-amber-900 focus:border-amber-500"
                              : item.field === "product_name" && !mapping.product_name 
                                ? "border-rose-300 focus:border-rose-500 bg-rose-50/20" 
                                : "border-slate-200"
                          }`}
                        >
                          <option value="">(매핑 안함)</option>
                          <option value="__DIRECT__">✍️ 직접 입력...</option>
                          {excelData.columns.map(col => (
                            <option key={col} value={col}>{col}</option>
                          ))}
                        </select>
                        {isDirect && (
                          <input
                            type="text"
                            value={directValue}
                            onChange={(e) => {
                              setMapping({ ...mapping, [item.field]: `__DIRECT_VALUE__:${e.target.value}` });
                            }}
                            placeholder="값 직접 입력"
                            className="w-full p-2 bg-amber-50/20 border border-amber-200 text-amber-900 rounded-xl text-xs font-bold outline-none focus:border-amber-450 animate-scale-up"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 3. 데이터 검토 및 조율 단계 (review) */}
          {step === "review" && parseSuccess && (
            <div className="space-y-5 animate-scale-up text-slate-800">
              
              {/* 바이어 메타 정보 */}
              <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-100 space-y-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  1. 바이어 메타 정보
                </span>

                <div className="grid grid-cols-2 gap-3 text-left">
                  <div>
                    {renderLabel("바이어명 *", "partner_name")}
                    <input 
                      type="text" 
                      value={form.partner_name}
                      onChange={e => setForm({ ...form, partner_name: e.target.value })}
                      className={getInputClassName("partner_name")}
                      placeholder="상호명을 입력해 주세요."
                      required
                    />
                  </div>
                  <div>
                    {renderLabel("연락처", "partner_phone")}
                    <input 
                      type="text" 
                      value={form.partner_phone}
                      onChange={e => setForm({ ...form, partner_phone: e.target.value })}
                      className={getInputClassName("partner_phone")}
                      placeholder="연락처를 입력해 주세요."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-left">
                  <div>
                    {renderLabel("사업자번호", "business_number")}
                    <input 
                      type="text" 
                      value={form.business_number}
                      onChange={e => setForm({ ...form, business_number: e.target.value })}
                      className={getInputClassName("business_number")}
                      placeholder="사업자번호를 입력해 주세요."
                    />
                  </div>
                  <div>
                    {renderLabel("대표자명", "representative")}
                    <input 
                      type="text" 
                      value={form.representative}
                      onChange={e => setForm({ ...form, representative: e.target.value })}
                      className={getInputClassName("representative")}
                      placeholder="대표자명을 입력해 주세요."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-left">
                  <div>
                    {renderLabel("담당자명", "partner_manager")}
                    <input 
                      type="text" 
                      value={form.partner_manager}
                      onChange={e => setForm({ ...form, partner_manager: e.target.value })}
                      className={getInputClassName("partner_manager")}
                      placeholder="담당자명을 입력해 주세요."
                    />
                  </div>
                  <div>
                    {renderLabel("문서 발주번호", "document_number")}
                    <input 
                      type="text" 
                      value={form.document_number}
                      onChange={e => setForm({ ...form, document_number: e.target.value })}
                      className={getInputClassName("document_number")}
                      placeholder="고객 발주서 상의 고유번호"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-left">
                  <div>
                    {renderLabel("문서 발주일자", "document_date")}
                    <input 
                      type="text" 
                      value={form.document_date}
                      onChange={e => setForm({ ...form, document_date: e.target.value })}
                      className={getInputClassName("document_date")}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <label className="text-[10px] text-slate-450 font-black block">납기일</label>
                      <span className="px-1.5 py-0.5 bg-slate-100/70 text-slate-600 border border-slate-200 text-[9px] font-black rounded-md flex items-center shadow-sm select-none">
                        📅 임의 입력
                      </span>
                    </div>
                    <input 
                      type="date" 
                      value={deliveryDate}
                      onChange={e => setDeliveryDate(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold cursor-pointer outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="text-left">
                  {renderLabel("소재지 주소", "address")}
                  <input 
                    type="text" 
                    value={form.address}
                    onChange={e => setForm({ ...form, address: e.target.value })}
                    className={getInputClassName("address")}
                    placeholder="주소를 입력해 주세요."
                  />
                </div>

                <div className="text-left">
                  {renderLabel("기타 비고", "document_memo")}
                  <textarea 
                    value={form.document_memo}
                    onChange={e => setForm({ ...form, document_memo: e.target.value })}
                    className={`${getInputClassName("document_memo")} resize-none`}
                    rows={2}
                    placeholder="비고 내용을 입력해 주세요."
                  />
                </div>
              </div>

              {/* 품목 정보 명세 조율 */}
              <div className="space-y-2 text-left">
                <label className="text-[10px] text-slate-400 font-bold block">2. 세부 품목 및 단가 조율</label>
                
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                  {form.items.map((item, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col gap-2.5 text-xs font-semibold">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 mb-0.5">품명 *</label>
                        <input 
                          type="text" 
                          value={item.product_name}
                          onChange={e => {
                            const newItems = [...form.items];
                            newItems[idx].product_name = e.target.value;
                            setForm({ ...form, items: newItems });
                          }}
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 mb-0.5">품목코드</label>
                          <input 
                            type="text" 
                            value={item.item_code || ""}
                            onChange={e => {
                              const newItems = [...form.items];
                              newItems[idx].item_code = e.target.value;
                              setForm({ ...form, items: newItems });
                            }}
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500"
                            placeholder="품목코드"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-555 mb-0.5">규격(Spec)</label>
                          <input 
                            type="text" 
                            value={item.spec || ""}
                            onChange={e => {
                              const newItems = [...form.items];
                              newItems[idx].spec = e.target.value;
                              setForm({ ...form, items: newItems });
                            }}
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500"
                            placeholder="규격"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 mb-0.5">수량</label>
                          <input 
                            type="number" 
                            value={item.quantity}
                            onChange={e => {
                              const qty = Number(e.target.value) || 0;
                              const newItems = [...form.items];
                              newItems[idx].quantity = qty;
                              newItems[idx].amount = qty * newItems[idx].unit_price;
                              setForm({ ...form, items: newItems });
                            }}
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 mb-0.5">단가 (원)</label>
                          <input 
                            type="number" 
                            value={item.unit_price}
                            onChange={e => {
                              const price = Number(e.target.value) || 0;
                              const newItems = [...form.items];
                              newItems[idx].unit_price = price;
                              newItems[idx].amount = newItems[idx].quantity * price;
                              setForm({ ...form, items: newItems });
                            }}
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-550 border-t border-slate-100 pt-2 flex-wrap gap-2">
                        <div className="flex items-center gap-1">
                          <label className="text-[9px] font-bold text-slate-500 shrink-0">개별 납기일</label>
                          <input 
                            type="date" 
                            value={item.delivery_date || ""}
                            onChange={e => {
                              const newItems = [...form.items];
                              newItems[idx].delivery_date = e.target.value;
                              setForm({ ...form, items: newItems });
                            }}
                            className="p-1 bg-slate-50 border border-slate-200 rounded text-[10px] font-bold cursor-pointer outline-none"
                          />
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-slate-400">금액:</span>
                          <span className="text-xs font-black text-indigo-600 ml-1.5 font-mono">
                            {(item.quantity * item.unit_price).toLocaleString()}원
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 자동 승인 여부 토글 */}
              {headerSignature && (
                <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-xl text-left">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-indigo-900 select-none">
                    <input 
                      type="checkbox"
                      checked={rememberFormat}
                      onChange={(e) => setRememberFormat(e.target.checked)}
                      className="rounded border-indigo-300 text-indigo-600 w-4 h-4 cursor-pointer focus:ring-indigo-500"
                    />
                    이 엑셀 양식 기억하기 (다음 업로드 시 바로 자동 등록) ⚡
                  </label>
                  <p className="text-[10px] text-slate-400 mt-1 pl-6 leading-normal">
                    활성화 시, 다음에 동일한 컬럼 구조({headerSignature.split("|").slice(0, 4).join(", ")}...)를 가진 엑셀 업로드 시 화면 대기 없이 즉각 백그라운드로 안전하게 자동 등록 완료됩니다.
                  </p>
                </div>
              )}

              {/* 총액 패널 */}
              <div className="p-4 bg-indigo-50/40 rounded-2xl border border-indigo-100 flex items-center justify-between text-left shrink-0">
                <span className="text-xs font-extrabold text-slate-600">수주 등록 예정 총액 (총 {form.items.length}개 품목)</span>
                <span className="text-lg font-black text-indigo-700 font-mono">
                  {form.items.reduce((sum, it) => sum + it.amount, 0).toLocaleString()}원
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 푸터 버튼 */}
        <div className="mt-6 border-t border-slate-100 pt-4 flex gap-3 shrink-0">
          {step === "review" ? (
            <button 
              onClick={() => {
                setStep("mapping");
                setParseSuccess(false);
              }}
              disabled={parsing}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs disabled:opacity-50 cursor-pointer transition-colors"
            >
              이전 단계 (매핑 수정)
            </button>
          ) : (
            <button 
              onClick={handleClose} 
              disabled={parsing}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-xs disabled:opacity-50 cursor-pointer transition-colors"
            >
              취소
            </button>
          )}
          
          {step === "mapping" ? (
            <button 
              onClick={handleRunParsing}
              disabled={!mapping.product_name || parsing}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl disabled:opacity-50 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              데이터 분석 및 다음 단계
            </button>
          ) : (
            <>
              <button 
                onClick={handleClose} 
                disabled={parsing}
                className="py-3 px-6 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-xs disabled:opacity-50 cursor-pointer transition-colors"
              >
                취소
              </button>
              <button 
                onClick={handleSaveSalesOrder}
                disabled={!parseSuccess || step !== "review"}
                className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl disabled:opacity-50 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                수주 등록 승인
              </button>
            </>
          )}
        </div>
        <ProcessingOverlay
          isOpen={isProcessing}
          title="바이어 발주서 등록 승인 중"
          message="엑셀 데이터를 검증하고 안전하게 수주 정보로 변환하여 시스템 대장에 등록 중입니다."
        />
      </div>
    </div>,
    document.body
  ) : null;
}
