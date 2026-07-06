"use client";

import { apiFetch } from '@/lib/api';
import React, { useState, useEffect } from "react";
import { 
  X, FileText, Plus, RefreshCw, CheckCircle2, ExternalLink, ShieldAlert, Info 
} from "lucide-react";
import { createPortal } from "react-dom";
import { EstimateItem } from "../types";
import { base64ToBlob, parseEstimateMetadata } from "../utils";
import ProcessingOverlay from "../../../components/ProcessingOverlay";

interface EstimateDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  estimateId: string | null;
  userRole: string;
  onRefresh: () => void;
}

export default function EstimateDetailModal({
  isOpen,
  onClose,
  estimateId,
  userRole,
  onRefresh
}: EstimateDetailModalProps) {
  const [detailData, setDetailData] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isEditingDetail, setIsEditingDetail] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState<'info' | 'items'>('info');
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string>("");
  const [dbTags, setDbTags] = useState<any[]>([]);
  const [myProfile, setMyProfile] = useState<any | null>(null);

  // 편집 폼 상태
  const [editForm, setEditForm] = useState<{
    partner_name: string;
    partner_phone: string;
    partner_manager: string;
    tags: string;
    business_number: string;
    address: string;
    representative: string;
    document_number: string;
    document_date: string;
    document_memo: string;
    delivery_date: string;
    items: EstimateItem[];
  }>({
    partner_name: "",
    partner_phone: "",
    partner_manager: "",
    tags: "",
    business_number: "",
    address: "",
    representative: "",
    document_number: "",
    document_date: "",
    document_memo: "",
    delivery_date: "",
    items: []
  });

  // 메타데이터 분석 결과
  const detailMeta = detailData ? parseEstimateMetadata(detailData.estimate.tags || "") : null;

  // 바이어 발주서 스캔(다이렉트 수주) 여부 판단
  const isSalesOrderScan = !!(detailData && 
    detailData.estimate.type === 'OUTBOUND' && 
    detailData.estimate.direction_status === 'RECEIVED');

  // 거래명세서 여부 판단
  const isStatement = !!(detailData && 
    detailData.estimate.tags && 
    (() => {
      try {
        const parsed = JSON.parse(detailData.estimate.tags);
        return parsed.is_statement === true;
      } catch {
        return false;
      }
    })()
  );

  const docTypeName = isStatement ? "거래명세서" : (isSalesOrderScan ? "발주서" : "견적서");

  // 태그 프리셋 및 본사 프로필 로드
  useEffect(() => {
    if (isOpen) {
      apiFetch("/api/expenses/tags")
        .then((res) => res.json())
        .then((json) => {
          if (json.success) {
            setDbTags(json.tags || []);
          }
        })
        .catch((e) => console.error("태그 로드 에러:", e));

      apiFetch('/api/settings?key=my_company_profile')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.value) {
            try {
              setMyProfile(JSON.parse(data.value));
            } catch (e) {}
          }
        })
        .catch((e) => console.error("본사 프로필 로드 에러:", e));
    }
  }, [isOpen]);

  // 상세 데이터 패치
  const loadDetail = async (id: string) => {
    setDetailLoading(true);
    setDetailData(null);
    setIsEditingDetail(false);
    setActiveDetailTab('info');
    try {
      const res = await apiFetch(`/api/estimates?action=detail&estimateId=${id}`);
      const data = await res.json();
      if (data.success) {
        setDetailData(data);
      } else {
        alert(data.error || "견적 상세 정보를 불러오지 못했습니다.");
        onClose();
      }
    } catch (err) {
      alert("견적 상세 조회 중 네트워크 오류가 발생했습니다.");
      onClose();
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && estimateId) {
      loadDetail(estimateId);
    }
  }, [isOpen, estimateId]);

  // PDF Blob URL 매핑 및 해제
  useEffect(() => {
    const fileUrl = detailData?.estimate?.file_url || detailData?.estimate?.business_license_url;
    if (fileUrl) {
      if (fileUrl.startsWith("data:application/pdf") || fileUrl.toLowerCase().endsWith(".pdf")) {
        try {
          if (fileUrl.startsWith("data:application/pdf")) {
            const blob = base64ToBlob(fileUrl, "application/pdf");
            const url = URL.createObjectURL(blob);
            setPdfBlobUrl(url);
          } else {
            setPdfBlobUrl(fileUrl);
          }
        } catch (e) {
          console.error("PDF Blob 변환 에러:", e);
          setPdfBlobUrl(fileUrl);
        }
      } else {
        setPdfBlobUrl("");
      }
    } else {
      setPdfBlobUrl("");
    }
  }, [detailData]);

  useEffect(() => {
    return () => {
      if (pdfBlobUrl && pdfBlobUrl.startsWith("blob:")) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [pdfBlobUrl]);

  if (!isOpen) return null;

  // 편집 시작 핸들러
  const handleStartEdit = () => {
    if (!detailData) return;
    const meta = parseEstimateMetadata(detailData.estimate.tags || "");
    setEditForm({
      partner_name: detailData.estimate.partner_name,
      partner_phone: detailData.estimate.partner_phone,
      partner_manager: detailData.estimate.partner_manager || "",
      tags: meta.tags,
      business_number: meta.business_number,
      address: meta.address,
      representative: meta.representative,
      document_number: meta.document_number,
      document_date: meta.document_date,
      document_memo: meta.document_memo,
      delivery_date: meta.delivery_date || "",
      items: detailData.items.map((item: any) => ({
        id: item.id,
        product_id: item.product_id || '',
        item_code: item.item_code || '',
        product_name: item.product_name,
        spec: item.spec || '',
        quantity: item.quantity,
        unit_price: item.unit_price,
        amount: item.amount,
        delivery_date: item.delivery_date || '',
        valid_item_code: item.valid_item_code || ''
      }))
    });
    setIsEditingDetail(true);
  };

  const handleCancelEdit = () => {
    setIsEditingDetail(false);
  };

  const handleAddEditItem = () => {
    setEditForm(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          product_id: "",
          item_code: "",
          product_name: "",
          spec: "",
          quantity: 1,
          unit_price: 0,
          amount: 0,
          delivery_date: "",
          valid_item_code: ""
        }
      ]
    }));
  };

  const handleRemoveEditItem = (idx: number) => {
    setEditForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx)
    }));
  };

  const handleEditItemChange = (idx: number, field: string, value: any) => {
    setEditForm(prev => {
      const nextItems = [...prev.items];
      const target = { ...nextItems[idx] };
      
      if (field === 'quantity') {
        const qty = parseInt(value) || 0;
        target.quantity = qty;
        target.amount = qty * target.unit_price;
      } else if (field === 'unit_price') {
        const price = parseInt(value) || 0;
        target.unit_price = price;
        target.amount = target.quantity * price;
      } else if (field === 'product_name') {
        target.product_name = value;
      } else if (field === 'product_id') {
        target.product_id = value;
      } else if (field === 'item_code') {
        target.item_code = value;
      } else if (field === 'spec') {
        target.spec = value;
      } else if (field === 'delivery_date') {
        target.delivery_date = value;
      }
      
      nextItems[idx] = target;
      return { ...prev, items: nextItems };
    });
  };

  const handleSaveEditedEstimate = async () => {
    if (!editForm.partner_name.trim()) {
      alert("거래처/고객명은 필수 입력 항목입니다.");
      return;
    }
    if (editForm.items.length === 0) {
      alert(isSalesOrderScan ? "최소 1개 이상의 발주 품목이 필요합니다." : "최소 1개 이상의 견적 품목이 필요합니다.");
      return;
    }
    if (editForm.items.some(item => !item.product_name.trim())) {
      alert("품목명을 입력해 주세요.");
      return;
    }

    try {
      setIsProcessing(true);
      const tagsJsonString = JSON.stringify({
        tags: editForm.tags,
        business_number: editForm.business_number,
        address: editForm.address,
        representative: editForm.representative,
        document_number: editForm.document_number,
        document_date: editForm.document_date,
        document_memo: editForm.document_memo,
        delivery_date: editForm.delivery_date
      });

      const res = await apiFetch("/api/estimates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estimateId: estimateId,
          partner_name: editForm.partner_name,
          partner_phone: editForm.partner_phone,
          partner_manager: editForm.partner_manager,
          tags: tagsJsonString,
          items: editForm.items
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(`${docTypeName}가 성공적으로 수정되었습니다.`);
        setIsEditingDetail(false);
        onRefresh();
        if (estimateId) {
          loadDetail(estimateId);
        }
      } else {
        alert(data.error || "수정에 실패했습니다.");
      }
    } catch (err) {
      alert(`${docTypeName} 수정 중 네트워크 오류가 발생했습니다.`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteEstimate = async () => {
    if (!estimateId) return;
    if (!confirm(`정말로 이 ${docTypeName}를 완전히 삭제하시겠습니까? 관련 데이터가 영구 유실됩니다.`)) return;
    
    try {
      setIsProcessing(true);
      const res = await apiFetch(`/api/estimates?estimateId=${estimateId}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        alert(`${docTypeName} 및 세부 품목이 성공적으로 삭제되었습니다.`);
        onRefresh();
        onClose();
      } else {
        alert(data.error || "삭제에 실패했습니다.");
        if (data.error && (data.error.includes("보류") || data.error.includes("결재"))) {
          onRefresh();
          onClose();
        }
      }
    } catch (err) {
      alert(`${docTypeName} 삭제 중 네트워크 오류가 발생했습니다.`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTagToggle = (tagName: string) => {
    const currentTags = editForm.tags.split(",")
      .map(t => t.trim())
      .filter(Boolean);
    
    let nextTags: string[];
    if (currentTags.includes(tagName)) {
      nextTags = currentTags.filter(t => t !== tagName);
    } else {
      nextTags = [...currentTags, tagName];
    }
    
    setEditForm(prev => ({
      ...prev,
      tags: nextTags.join(", ")
    }));
  };

  return typeof window !== "undefined" ? createPortal(
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] max-w-4xl w-full p-6 md:p-8 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] animate-scale-up">
        <button 
          onClick={onClose} 
          className="absolute top-5 right-5 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex justify-between items-center mb-4 pr-8">
          <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-500" />
            <span>{isEditingDetail ? `${docTypeName} 상세 정보 수정 (최고관리자)` : `${docTypeName} 상세 내역 및 원본 파일 조회`}</span>
          </h3>
        </div>

        {detailLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
            <span className="text-xs text-slate-500 font-bold animate-pulse">DB에서 견적서 및 연동 품목들을 정밀하게 로딩 중...</span>
          </div>
        ) : detailData ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 overflow-y-auto pr-1">
            
            {/* 좌측: 견적 요약 및 상세 품목 테이블 (탭 분할 적용) */}
            <div className="space-y-4 flex flex-col h-[680px]">
              {/* 세련된 디자인의 두 탭 헤더 */}
              <div className="flex bg-slate-100/80 p-1 rounded-2xl shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveDetailTab('info')}
                  className={`flex-1 py-2.5 text-center text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                    activeDetailTab === 'info'
                      ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/40'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  📋 {isSalesOrderScan ? "발주 및 바이어 정보" : "견적 및 공급처 정보"}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDetailTab('items')}
                  className={`flex-1 py-2.5 text-center text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                    activeDetailTab === 'items'
                      ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/40'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  📦 {isSalesOrderScan ? "발주 품목 명세" : "견적 품목 명세"} ({isEditingDetail ? editForm.items.length : detailData.items.length}건)
                </button>
              </div>

              {/* 탭 내용 분기 */}
              <div className="flex-1 overflow-hidden flex flex-col min-h-0 pr-1 space-y-4">
                {activeDetailTab === 'info' && (
                  <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-100 space-y-3 animate-fade-in overflow-y-auto max-h-[670px]">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{isSalesOrderScan ? "발주서 마스터 정보" : "견적 마스터 정보"}</span>
                
                    {isEditingDetail ? (
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="text-slate-400 font-bold block mb-1">{isSalesOrderScan ? "발주서등록번호" : "견적 번호"}</label>
                          <span className="text-slate-500 font-black font-mono block p-2.5 bg-slate-100 rounded-xl">{detailData.estimate.id}</span>
                        </div>
                        <div>
                          <label className="text-slate-400 font-bold block mb-1">작성 일자</label>
                          <span className="text-slate-500 font-bold block p-2.5 bg-slate-100 rounded-xl">{detailData.estimate.created_at}</span>
                        </div>
                        <div>
                          <label className="text-slate-400 font-bold block mb-1">거래처/고객명 *</label>
                          <input 
                            type="text" 
                            value={editForm.partner_name}
                            onChange={e => setEditForm(prev => ({ ...prev, partner_name: e.target.value }))}
                            className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold outline-none focus:border-indigo-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-slate-400 font-bold block mb-1">담당자명</label>
                          <input 
                            type="text" 
                            value={editForm.partner_manager}
                            onChange={e => setEditForm(prev => ({ ...prev, partner_manager: e.target.value }))}
                            className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="text-slate-400 font-bold block mb-1">연락처</label>
                          <input 
                            type="text" 
                            value={editForm.partner_phone}
                            onChange={e => setEditForm(prev => ({ ...prev, partner_phone: e.target.value }))}
                            className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-slate-400 font-bold block mb-1">비고(태그) (쉼표로 구분)</label>
                          <input 
                            type="text" 
                            value={editForm.tags}
                            onChange={e => setEditForm(prev => ({ ...prev, tags: e.target.value }))}
                            className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold outline-none focus:border-indigo-500"
                            placeholder="예: 원두, 우수고객"
                          />
                          {/* 태그 추천 가이드 */}
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {dbTags.map(tag => {
                              const isSelected = editForm.tags.split(",")
                                .map(t => t.trim())
                                .filter(Boolean)
                                .includes(tag.name);
                              return (
                                <button
                                  key={tag.id}
                                  type="button"
                                  onClick={() => handleTagToggle(tag.name)}
                                  className={`px-2 py-0.5 rounded text-[9px] font-bold border transition-all ${
                                    isSelected 
                                      ? 'bg-indigo-600 text-white border-indigo-600' 
                                      : 'bg-white text-slate-500 border-slate-250 hover:bg-slate-50'
                                  }`}
                                >
                                  #{tag.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* B2B 공급처 정보 수정 영역 */}
                        <div className="col-span-2 border-t border-slate-200/60 my-1 pt-2">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{isSalesOrderScan ? "바이어 세부 정보 수정" : "공급처 세부 정보 수정"}</span>
                        </div>
                        <div>
                          <label className="text-slate-400 font-bold block mb-1">사업자번호</label>
                          <input 
                            type="text" 
                            value={editForm.business_number}
                            onChange={e => setEditForm(prev => ({ ...prev, business_number: e.target.value }))}
                            placeholder="123-45-67890"
                            className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="text-slate-400 font-bold block mb-1">대표자명</label>
                          <input 
                            type="text" 
                            value={editForm.representative}
                            onChange={e => setEditForm(prev => ({ ...prev, representative: e.target.value }))}
                            placeholder="대표자 이름"
                            className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-slate-400 font-bold block mb-1">소재지 주소</label>
                          <input 
                            type="text" 
                            value={editForm.address}
                            onChange={e => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                            placeholder={isSalesOrderScan ? "바이어 회사 주소" : "공급처 회사 주소"}
                            className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="text-slate-400 font-bold block mb-1">
                            {isStatement ? "문서 번호" : (isSalesOrderScan ? "문서 발주번호" : "문서 견적번호")}
                          </label>
                          <input 
                            type="text" 
                            value={editForm.document_number}
                            onChange={e => setEditForm(prev => ({ ...prev, document_number: e.target.value }))}
                            placeholder={isStatement ? "거래명세서 상의 문서번호" : (isSalesOrderScan ? "발주서 상의 발주번호" : "견적서 상의 견적번호")}
                            className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold font-mono outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="text-slate-400 font-bold block mb-1">
                            {isStatement ? "문서 일자" : (isSalesOrderScan ? "문서 발주일자" : "문서 견적일자")}
                          </label>
                          <input 
                            type="text" 
                            value={editForm.document_date}
                            onChange={e => setEditForm(prev => ({ ...prev, document_date: e.target.value }))}
                            placeholder="2026-06-03"
                            className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold outline-none focus:border-indigo-500"
                          />
                        </div>
                        {isSalesOrderScan && (
                          <div className="col-span-2">
                            <label className="text-slate-400 font-bold block mb-1">납기일</label>
                            <input 
                              type="text" 
                              value={editForm.delivery_date}
                              onChange={e => setEditForm(prev => ({ ...prev, delivery_date: e.target.value }))}
                              placeholder="2026-06-30"
                              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold outline-none focus:border-indigo-500"
                            />
                          </div>
                        )}
                        <div className="col-span-2">
                          <label className="text-slate-400 font-bold block mb-1">기타 (유효기간, 납기조건 등)</label>
                          <textarea 
                            value={editForm.document_memo}
                            onChange={e => setEditForm(prev => ({ ...prev, document_memo: e.target.value }))}
                            placeholder={isStatement ? "전달 메모, 인도 조건 등 거래명세서에 기재된 기타 정보" : (isSalesOrderScan ? "납기조건, 지불조건 등 발주서에 기재된 기타 정보" : "견적유효기간, 납기조건 등 견적서에 기재된 기타 정보")}
                            className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold outline-none focus:border-indigo-500 min-h-[60px] resize-none"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-y-2.5 text-xs">
                        <div>
                          <span className="text-slate-400 font-bold block">
                            {isStatement ? "명세서 번호" : (isSalesOrderScan ? "발주등록번호/발주번호" : "견적 번호")}
                          </span>
                          <span className="text-slate-800 font-black font-mono">{detailData.estimate.id}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold block">작성 일자</span>
                          <span className="text-slate-800 font-bold">{detailData.estimate.created_at}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold block">거래처/고객명</span>
                          <span className="text-slate-800 font-bold">{detailData.estimate.partner_name}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold block">담당자</span>
                          <span className="text-slate-800 font-bold">{detailData.estimate.partner_manager || '-'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold block">연락처</span>
                          <span className="text-slate-800 font-bold">{detailData.estimate.partner_phone}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold block">{isSalesOrderScan ? "발주 유형" : "견적 유형"}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black inline-block border ${detailData.estimate.type === 'INBOUND' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                            {isSalesOrderScan 
                              ? (detailData.estimate.direction_status === 'RECEIVED' ? '바이어 발주 (수신)' : '발송 (OUTBOUND)')
                              : (detailData.estimate.type === 'INBOUND' ? '수신 (INBOUND)' : '발송 (OUTBOUND)')}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold block">AI 판독 구분</span>
                          <span className="text-slate-800 font-bold">{detailData.estimate.ai_parsed ? '🧠 Gemini AI OCR' : '✍️ 수동 등록'}</span>
                        </div>
                        {detailData.estimate.type === 'OUTBOUND' && (detailData.estimate.sales_order_number || detailData.salesOrderNumber) && (
                          <div className="col-span-2 bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-150/60 flex justify-between items-center my-0.5 animate-fade-in">
                            <span className="text-indigo-600 font-bold">🔗 연동 수주번호</span>
                            <span className="text-slate-800 font-black font-mono text-xs">{detailData.estimate.sales_order_number || detailData.salesOrderNumber}</span>
                          </div>
                        )}
                        {detailData.estimate.type === 'INBOUND' && (detailData.estimate.purchase_order_number || detailData.purchaseOrderNumber) && (
                          <div className="col-span-2 bg-amber-50/50 p-2.5 rounded-xl border border-amber-150/60 flex justify-between items-center my-0.5 animate-fade-in">
                            <span className="text-amber-600 font-bold">🔗 연동 발주등록번호/발주번호</span>
                            <span className="text-slate-800 font-black font-mono text-xs">{detailData.estimate.purchase_order_number || detailData.purchaseOrderNumber}</span>
                          </div>
                        )}
                        <div className="col-span-2">
                          <span className="text-slate-400 font-bold block mb-1.5">비고(태그)</span>
                          <div className="flex flex-wrap gap-1.5">
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border ${detailData.estimate.ai_parsed ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-50 text-slate-650 border-slate-200'}`}>
                              {detailData.estimate.ai_parsed ? 'AI OCR' : '수동 등록'}
                            </span>
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border ${detailData.estimate.type === 'INBOUND' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                              {detailData.estimate.type === 'INBOUND' ? '수신' : '발송'}
                            </span>
                            {detailMeta?.tags ? detailMeta.tags.split(',').map((t: string) => t.trim()).filter(Boolean).map((tag: string, idx: number) => (
                              <span key={idx} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-[10px] font-black">
                                {tag}
                              </span>
                            )) : null}
                          </div>
                        </div>
                        {/* 공급처 추가 정보 조회 */}
                        <div className="col-span-2 border-t border-slate-200/60 my-1 pt-2">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{isSalesOrderScan ? "바이어 세부 정보" : "공급처 세부 정보"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold block">사업자번호</span>
                          <span className="text-slate-800 font-bold mt-1 inline-block">
                            {isSalesOrderScan
                              ? (detailMeta?.business_number || "-")
                              : (detailData.estimate.type === 'OUTBOUND' 
                                  ? (myProfile?.businessNumber || "-")
                                  : (detailMeta?.business_number || "-"))}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold block">대표자명</span>
                          <span className="text-slate-800 font-bold mt-1 inline-block">
                            {isSalesOrderScan
                              ? (detailMeta?.representative || "-")
                              : (detailData.estimate.type === 'OUTBOUND' 
                                  ? (myProfile?.representative || "-")
                                  : (detailMeta?.representative || "-"))}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-400 font-bold block">소재지 주소</span>
                          <span className="text-slate-800 font-bold mt-1 inline-block">
                            {isSalesOrderScan
                              ? (detailMeta?.address || "-")
                              : (detailData.estimate.type === 'OUTBOUND' 
                                  ? (myProfile?.address || "-")
                                  : (detailMeta?.address || "-"))}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold block">{isSalesOrderScan ? "문서 발주번호" : "문서 견적번호"}</span>
                          <span className="text-slate-800 font-black font-mono mt-1 inline-block">
                            {isSalesOrderScan
                              ? (detailData.estimate.sales_order_number || detailMeta?.document_number || "-")
                              : (detailData.estimate.type === 'OUTBOUND' 
                                  ? (detailData.estimate.id || "-")
                                  : (detailMeta?.document_number || "-"))}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold block">{isSalesOrderScan ? "문서 발주일자" : "문서 견적일자"}</span>
                          <span className="text-slate-800 font-bold mt-1 inline-block">
                            {isSalesOrderScan
                              ? (detailMeta?.document_date || "-")
                              : (detailData.estimate.type === 'OUTBOUND' 
                                  ? (detailData.estimate.created_at?.substring(0, 10) || "-")
                                  : (detailMeta?.document_date || "-"))}
                          </span>
                        </div>
                        {isSalesOrderScan && (
                          <div className="col-span-2">
                            <span className="text-slate-400 font-bold block">납기일</span>
                            <span className="text-slate-800 font-bold mt-1 inline-block">{detailMeta?.delivery_date || "-"}</span>
                          </div>
                        )}
                        <div className="col-span-2">
                          <span className="text-slate-400 font-bold block">기타 (유효기간, 납기조건 등)</span>
                          <span className="text-slate-800 font-bold whitespace-pre-wrap block bg-slate-100 p-2 rounded-xl mt-1 text-[11px] min-h-[40px]">
                            {detailMeta?.document_memo || "-"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeDetailTab === 'items' && (
                  <div className="space-y-4 animate-fade-in flex-1 flex flex-col min-h-0">
                    {/* 최종 합계액 */}
                    <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-100 flex justify-between items-center shrink-0">
                      <span className="text-xs font-black text-slate-600">{isSalesOrderScan ? "최종 발주 합계액" : "최종 견적 합계액"}</span>
                      <span className="text-base font-extrabold text-indigo-600">
                        {isEditingDetail 
                          ? editForm.items.reduce((acc, curr) => acc + (curr.quantity * curr.unit_price), 0).toLocaleString() 
                          : (detailData.estimate.total_amount || 0).toLocaleString()}원
                      </span>
                    </div>

                    {/* 견적 품목 명세 */}
                    <div className="space-y-2.5 flex-1 flex flex-col min-h-0">
                      <div className="flex justify-between items-center shrink-0">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                          {isSalesOrderScan ? "발주 품목 명세" : "견적 품목 명세"} ({isEditingDetail ? editForm.items.length : detailData.items.length}건)
                        </span>
                        {isEditingDetail && (
                          <button
                            type="button"
                            onClick={handleAddEditItem}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-[10px] font-black rounded-lg border border-indigo-100 flex items-center gap-0.5 transition-all shadow-sm"
                          >
                            <Plus className="w-3 h-3" /> 품목 추가
                          </button>
                        )}
                      </div>
                    
                      {isEditingDetail ? (
                        <div className="space-y-3 max-h-[540px] overflow-y-auto pr-1">
                          {editForm.items.map((item, idx) => (
                            <div key={idx} className="p-3.5 bg-slate-50/60 border border-slate-100 rounded-2xl space-y-2.5 animate-fade-in relative">
                              {/* 첫 번째 행: 품목코드, 품목명, 규격 */}
                              <div className="grid grid-cols-12 gap-2.5">
                                <div className="col-span-3">
                                  <label className="text-[10px] text-slate-400 font-bold block mb-1">품목코드</label>
                                  <input 
                                    type="text" 
                                    value={item.item_code || ''}
                                    onChange={e => handleEditItemChange(idx, 'item_code', e.target.value)}
                                    placeholder="코드 입력"
                                    className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none focus:border-indigo-500 transition-all shadow-sm"
                                  />
                                </div>
                                <div className="col-span-5">
                                  <label className="text-[10px] text-slate-400 font-bold block mb-1">품목명 *</label>
                                  <input 
                                    type="text" 
                                    value={item.product_name}
                                    onChange={e => handleEditItemChange(idx, 'product_name', e.target.value)}
                                    placeholder="품목명 입력"
                                    className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 transition-all shadow-sm"
                                    required
                                  />
                                </div>
                                <div className="col-span-4">
                                  <div className="flex justify-between items-center mb-1">
                                    <label className="text-[10px] text-slate-400 font-bold">규격</label>
                                    <span className="text-[9px] bg-indigo-50 text-indigo-500 font-black px-1.5 py-0.5 rounded">
                                      #{idx + 1}
                                    </span>
                                  </div>
                                  <input 
                                    type="text" 
                                    value={item.spec || ''}
                                    onChange={e => handleEditItemChange(idx, 'spec', e.target.value)}
                                    placeholder="규격 입력"
                                    className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 transition-all shadow-sm"
                                  />
                                </div>
                              </div>

                              {/* 두 번째 행: 수량, 단가, 공급금액, 삭제 버튼 가로 배치 */}
                              <div className="grid grid-cols-12 gap-2 items-center">
                                {/* 수량 */}
                                <div className="col-span-3">
                                  <label className="text-[9px] text-slate-400 font-bold block mb-1">수량</label>
                                  <input 
                                    type="number" 
                                    value={item.quantity}
                                    onChange={e => handleEditItemChange(idx, 'quantity', e.target.value)}
                                    className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-center outline-none focus:border-indigo-500 transition-all shadow-sm"
                                    min="1"
                                  />
                                </div>

                                {/* 단가 */}
                                <div className="col-span-4">
                                  <label className="text-[9px] text-slate-400 font-bold block mb-1">단가(원)</label>
                                  <input 
                                    type="number" 
                                    value={item.unit_price}
                                    onChange={e => handleEditItemChange(idx, 'unit_price', e.target.value)}
                                    className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-right outline-none focus:border-indigo-500 transition-all shadow-sm"
                                    min="0"
                                  />
                                </div>

                                {/* 공급금액 */}
                                <div className="col-span-4 text-right pr-1">
                                  <span className="text-[9px] text-slate-400 font-bold block">공급금액</span>
                                  <span className="text-xs font-extrabold text-indigo-650 block mt-0.5">
                                    {(item.quantity * item.unit_price).toLocaleString()}원
                                  </span>
                                </div>

                                {/* 삭제 버튼 */}
                                <div className="col-span-1 flex justify-end">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveEditItem(idx)}
                                    className="p-2 bg-white border border-slate-200 hover:bg-rose-50 hover:text-rose-500 text-slate-400 rounded-xl transition-all shadow-sm flex items-center justify-center shrink-0"
                                    title="품목 삭제"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                              {/* 세 번째 행: 납기일 (발주서 스캔 전용) */}
                              {isSalesOrderScan && (
                                <div className="grid grid-cols-12 gap-2.5 mt-2">
                                  <div className="col-span-12">
                                    <label className="text-[9px] text-slate-400 font-bold block mb-1">납기일</label>
                                    <input 
                                      type="text" 
                                      value={item.delivery_date || ''}
                                      onChange={e => handleEditItemChange(idx, 'delivery_date', e.target.value)}
                                      placeholder="2026-06-30"
                                      className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 transition-all shadow-sm"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        /* 조회 전용 일반 테이블 */
                        <div className="border border-slate-100 rounded-2xl overflow-auto max-h-[540px]">
                           {isSalesOrderScan ? (
                             <table className="w-full text-left text-xs font-semibold min-w-[700px]" style={{ tableLayout: "fixed" }}>
                               <colgroup><col style={{ width: "10%" }} /><col style={{ width: "15%" }} /><col style={{ width: "23%" }} /><col style={{ width: "12%" }} /><col style={{ width: "8%" }} /><col style={{ width: "10%" }} /><col style={{ width: "12%" }} /><col style={{ width: "10%" }} /></colgroup>
                               <thead>
                                 <tr className="border-b border-slate-100 text-slate-400 text-[10px]">
                                   <th className="py-2.5 px-3 sticky top-0 bg-slate-50 z-10">품목코드</th>
                                   <th className="py-2.5 px-3 sticky top-0 bg-slate-50 z-10">유효품목코드</th>
                                   <th className="py-2.5 px-3 sticky top-0 bg-slate-50 z-10">품목명</th>
                                   <th className="py-2.5 px-2 sticky top-0 bg-slate-50 z-10">규격</th>
                                   <th className="py-2.5 px-2 text-center sticky top-0 bg-slate-50 z-10">수량</th>
                                   <th className="py-2.5 px-2 text-right sticky top-0 bg-slate-50 z-10">단가</th>
                                   <th className="py-2.5 px-3 text-right sticky top-0 bg-slate-50 z-10">공급가액</th>
                                   <th className="py-2.5 px-2 text-center sticky top-0 bg-slate-50 z-10">납기일</th>
                                 </tr>
                               </thead>
                               <tbody>
                                 {detailData.items.map((item: any, idx: number) => (
                                   <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/40">
                                     <td className="py-3 px-3 text-slate-500 font-mono text-[11px] truncate" title={item.item_code || ""}>{item.item_code || "-"}</td>
                                     <td className="py-3 px-3 text-slate-800 font-mono text-[11px] truncate">
                                       {item.valid_item_code ? (
                                         <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-black rounded border border-emerald-250/60 shadow-sm">
                                           {item.valid_item_code}
                                         </span>
                                       ) : (
                                         <span className="text-slate-450 font-normal">-</span>
                                       )}
                                     </td>
                                     <td className="py-3 px-3 text-slate-800 font-bold" style={{ wordBreak: "keep-all", overflowWrap: "break-word" }}>{item.product_name}</td>
                                     <td className="py-3 px-2 text-slate-600 font-medium whitespace-nowrap truncate" title={item.spec || ""}>{item.spec || "-"}</td>
                                     <td className="py-3 px-2 text-center text-slate-600 font-bold whitespace-nowrap">{item.quantity}개</td>
                                     <td className="py-3 px-2 text-right text-slate-500 font-medium whitespace-nowrap">{(item.unit_price || 0).toLocaleString()}원</td>
                                     <td className="py-3 px-3 text-right text-indigo-600 font-bold whitespace-nowrap">{((item.quantity || 0) * (item.unit_price || 0)).toLocaleString()}원</td>
                                     <td className="py-3 px-2 text-center text-slate-600 font-bold whitespace-nowrap">{item.delivery_date || "-"}</td>
                                   </tr>
                                 ))}
                               </tbody>
                             </table>
                           ) : (
                             <table className="w-full text-left text-xs font-semibold min-w-[650px]" style={{ tableLayout: "fixed" }}>
                               <colgroup><col style={{ width: "14%" }} /><col style={{ width: "32%" }} /><col style={{ width: "16%" }} /><col style={{ width: "8%" }} /><col style={{ width: "14%" }} /><col style={{ width: "16%" }} /></colgroup>
                               <thead>
                                 <tr className="border-b border-slate-100 text-slate-400 text-[10px]">
                                   <th className="py-2.5 px-3 sticky top-0 bg-slate-50 z-10">품목코드</th>
                                   <th className="py-2.5 px-3 sticky top-0 bg-slate-50 z-10">품목명</th>
                                   <th className="py-2.5 px-2 sticky top-0 bg-slate-50 z-10">규격</th>
                                   <th className="py-2.5 px-2 text-center sticky top-0 bg-slate-50 z-10">수량</th>
                                   <th className="py-2.5 px-2 text-right sticky top-0 bg-slate-50 z-10">단가</th>
                                   <th className="py-2.5 px-3 text-right sticky top-0 bg-slate-50 z-10">공급가액</th>
                                 </tr>
                               </thead>
                               <tbody>
                                 {detailData.items.map((item: any, idx: number) => (
                                   <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/40">
                                     <td className="py-3 px-3 text-slate-500 font-mono text-[11px] truncate" title={item.item_code || ""}>{item.item_code || "-"}</td>
                                     <td className="py-3 px-3 text-slate-800 font-bold" style={{ wordBreak: "keep-all", overflowWrap: "break-word" }}>{item.product_name}</td>
                                     <td className="py-3 px-2 text-slate-600 font-medium whitespace-nowrap truncate" title={item.spec || ""}>{item.spec || "-"}</td>
                                     <td className="py-3 px-2 text-center text-slate-600 font-bold whitespace-nowrap">{item.quantity}개</td>
                                     <td className="py-3 px-2 text-right text-slate-500 font-medium whitespace-nowrap">{(item.unit_price || 0).toLocaleString()}원</td>
                                     <td className="py-3 px-3 text-right text-indigo-600 font-bold whitespace-nowrap">{((item.quantity || 0) * (item.unit_price || 0)).toLocaleString()}원</td>
                                   </tr>
                                 ))}
                               </tbody>
                             </table>
                           )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 우측: 원본 파일 미리보기 */}
            <div className="flex flex-col border border-slate-100 rounded-3xl bg-transparent relative h-[680px] shrink-0 overflow-hidden">
              <div className="flex justify-between items-center mt-4 mx-5 mb-3 shrink-0">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{`첨부 원본 ${docTypeName} 파일`}</span>
                {(() => {
                  const targetFileUrl = detailData?.estimate?.file_url || detailData?.estimate?.business_license_url;
                  return targetFileUrl ? (
                    <button
                      type="button"
                      onClick={() => {
                        const fileUrl = pdfBlobUrl || targetFileUrl;
                        if (!fileUrl) return;
                        if (fileUrl.startsWith("data:image/")) {
                          const newWindow = window.open();
                          if (newWindow) {
                            newWindow.document.write(`
                              <html>
                                <head>
                                  <title>원본 이미지 열람</title>
                                  <style>
                                    body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #0f172a; }
                                    img { max-width: 100%; max-height: 100vh; object-fit: contain; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3); }
                                  </style>
                                </head>
                                <body>
                                  <img src="${fileUrl}" alt="원본 이미지" />
                                </body>
                              </html>
                            `);
                            newWindow.document.close();
                          }
                        } else {
                          window.open(fileUrl, '_blank');
                        }
                      }}
                      className="py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] rounded-lg flex items-center gap-1 transition-all shadow-sm shrink-0"
                      title="새 창에서 원본 파일 열람 및 인쇄"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                      새 창 열람/인쇄
                    </button>
                  ) : null;
                })()}
              </div>

              {(() => {
                const targetFileUrl = detailData.estimate.file_url || detailData.estimate.business_license_url;
                return targetFileUrl ? (
                  <div className="flex-1 flex flex-col justify-between h-full">
                    {/* 이미지 파일 미리보기 */}
                    {/\.(jpg|jpeg|png|webp|heic|gif)$/i.test(targetFileUrl) || targetFileUrl.startsWith('data:image/') ? (
                      <div className="flex-1 bg-transparent overflow-hidden flex items-center justify-center relative group h-[620px] p-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={targetFileUrl} 
                          alt={`${docTypeName} 원본`} 
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ) : (targetFileUrl.startsWith("data:application/pdf") || targetFileUrl.toLowerCase().endsWith(".pdf")) ? (
                      <div className="flex-1 bg-transparent overflow-hidden relative group h-[620px] p-0">
                        {pdfBlobUrl ? (
                          <iframe 
                            src={`${pdfBlobUrl}#view=FitH`} 
                            className="w-full h-full border-none bg-transparent"
                            title={`PDF ${docTypeName} 미리보기`}
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-xs font-semibold gap-2 py-10">
                            <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
                            <span>PDF 문서 로딩 중...</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex-1 bg-transparent flex flex-col items-center justify-center p-6 text-center h-[620px]">
                        <FileText className="w-12 h-12 text-slate-300 mb-2" />
                        <span className="text-xs font-bold text-slate-700">문서 파일 형식 (PDF/기타)</span>
                        <span className="text-[10px] text-slate-400 mt-1 max-w-[200px] truncate block">{targetFileUrl}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center border-t border-slate-200/65 border-dashed bg-white p-6 text-center h-full">
                    <ShieldAlert className="w-10 h-10 text-slate-300 mb-2" />
                    <span className="text-xs font-bold text-slate-600">등록된 첨부 원본 파일이 없습니다.</span>
                    <span className="text-[10px] text-slate-400 mt-1">{`수동으로 등록하였거나 업로드 파일이 생략된 ${docTypeName}입니다.`}</span>
                  </div>
                );
              })()}
            </div>
          </div>
        ) : (
          <div className="py-20 text-center text-slate-400">데이터가 없습니다.</div>
        )}

        <div className="mt-6 border-t border-slate-100 pt-4 flex justify-between items-center">
          <div className="flex items-center gap-2 flex-wrap">
            {userRole === 'SUPER_ADMIN' && detailData && !isEditingDetail && (
              <>
                <button 
                  onClick={handleDeleteEstimate}
                  disabled={detailData.isLinked || detailData.isPendingDelete}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1 transition-all shadow-sm ${
                    (detailData.isLinked || detailData.isPendingDelete) 
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none opacity-60' 
                      : 'bg-rose-50 hover:bg-rose-100 text-rose-600'
                  }`}
                  title={
                    detailData.isLinked 
                      ? `이미 연동 완료된 ${docTypeName}입니다.` 
                      : detailData.isPendingDelete 
                        ? "현재 RAG 결재 대기 중인 문서입니다." 
                        : `${docTypeName} 완전히 삭제`
                  }
                >
                  🗑️ {isStatement ? "명세서 삭제" : (isSalesOrderScan ? "발주 삭제" : "견적 삭제")}
                </button>
                <button 
                  onClick={handleStartEdit} 
                  disabled={detailData.isLinked || detailData.isPendingDelete}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1 transition-all shadow-sm ${
                    (detailData.isLinked || detailData.isPendingDelete) 
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none opacity-60' 
                      : 'bg-amber-50 hover:bg-amber-100 text-amber-600'
                  }`}
                  title={
                    detailData.isLinked 
                      ? `이미 연동 완료된 ${docTypeName}입니다.` 
                      : detailData.isPendingDelete 
                        ? "현재 RAG 결재 대기 중인 문서입니다." 
                        : `${docTypeName} 상세 정보 수정`
                  }
                >
                  ✏️ {isStatement ? "명세서 수정" : (isSalesOrderScan ? "발주 수정" : "견적 수정")}
                </button>
                
                {/* 💡 이미 발주/수주로 전환된 견적서일 경우 경고 가이드 뱃지 표출 */}
                {detailData.isLinked && (
                  <span className="text-[10px] text-amber-600 font-extrabold bg-amber-50/50 px-2.5 py-1.5 rounded-xl border border-amber-100/70 flex items-center gap-1 shrink-0">
                    🔒 연동됨: 이 {docTypeName}는 이미 연동 완료되어 수정 및 삭제할 수 없습니다.
                  </span>
                )}

                {/* 💡 RAG 결재 대기 중인 경우 경고 가이드 뱃지 표출 */}
                {detailData.isPendingDelete && (
                  <span className="text-[10px] text-amber-700 font-extrabold bg-amber-50 px-2.5 py-1.5 rounded-xl border border-amber-100 flex items-center gap-1 shrink-0 animate-pulse">
                    ⏳ 결재 대기 중: 이 문서는 현재 삭제 요청에 대한 사내 RAG 결재 승인을 대기 중입니다.
                  </span>
                )}
              </>
            )}
          </div>
          <div className="flex gap-2">
            {isEditingDetail ? (
              <>
                <button 
                  onClick={handleCancelEdit} 
                  className="px-5 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-xs"
                >
                  취소
                </button>
                <button 
                  onClick={handleSaveEditedEstimate} 
                  className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md"
                >
                  저장
                </button>
              </>
            ) : (
              <button 
                onClick={onClose} 
                className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-md"
              >
                확인 완료
              </button>
            )}
          </div>
        </div>
        <ProcessingOverlay
          isOpen={isProcessing}
          title={`${docTypeName} 처리 중`}
          message={`AI 통제 센터가 ${docTypeName} 정보를 안전하게 업데이트 또는 삭제하는 중입니다.`}
        />
      </div>
    </div>,
    document.body
  ) : null;
}
