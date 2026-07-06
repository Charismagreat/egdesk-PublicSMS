"use client";

import { apiFetch } from '@/lib/api';
import React, { useState } from "react";
import { Upload, X, FileText, CheckCircle2, RefreshCw, AlertCircle } from "lucide-react";

interface InboundStatementOcrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function InboundStatementOcrModal({
  isOpen,
  onClose,
  onSuccess
}: InboundStatementOcrModalProps) {
  const [ocrScanning, setOcrScanning] = useState(false);
  const [ocrSuccess, setOcrSuccess] = useState(false);
  const [ocrFilename, setOcrFilename] = useState("");
  const [receiverMatched, setReceiverMatched] = useState<boolean>(true);
  const [myCompanyName, setMyCompanyName] = useState<string>("주식회사 쿠스");
  const [userRole, setUserRole] = useState<string>("SUB_OPERATOR");
  const [userName, setUserName] = useState<string>("");
  const [forceBypass, setForceBypass] = useState<boolean>(false);
  const [bypassReason, setBypassReason] = useState<string>("");
  const [ocrForm, setOcrForm] = useState({
    partner_name: "",
    partner_phone: "",
    partner_manager: "",
    items: [] as Array<{ item_code?: string; product_name: string; spec?: string; quantity: number; unit_price: number; validItemCode?: string; valid_item_code?: string }>,
    file_url: "",
    business_number: "",
    representative: "",
    address: "",
    document_number: "",
    document_date: "",
    document_memo: "",
    originalTotalAmount: 0,
    originalTotalQuantity: 0
  });

  React.useEffect(() => {
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
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const resetOcrState = () => {
    setOcrScanning(false);
    setOcrSuccess(false);
    setOcrFilename("");
    setReceiverMatched(true);
    setMyCompanyName("주식회사 쿠스");
    setForceBypass(false);
    setBypassReason("");
    setOcrForm({
      partner_name: "",
      partner_phone: "",
      partner_manager: "",
      items: [],
      file_url: "",
      business_number: "",
      representative: "",
      address: "",
      document_number: "",
      document_date: "",
      document_memo: "",
      originalTotalAmount: 0,
      originalTotalQuantity: 0
    });
  };

  const handleClose = () => {
    resetOcrState();
    onClose();
  };

  // 실제 이미지/PDF 파일 업로드 후 AI OCR 가동
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
            document_type: "estimate"
          })
        });
        const data = await res.json();
        if (data.success) {
          setOcrScanning(false);
          setOcrSuccess(true);
          setOcrForm({
            partner_name: data.partner_name,
            partner_phone: data.partner_phone || "",
            partner_manager: data.partner_manager || "",
            items: data.items,
            file_url: base64Data,
            business_number: data.partner_business_number || "",
            representative: data.partner_representative || "",
            address: data.partner_address || "",
            document_number: data.document_number || "",
            document_date: data.document_date || "",
            document_memo: data.document_memo || "",
            originalTotalAmount: data.originalTotalAmount || 0,
            originalTotalQuantity: data.originalTotalQuantity || 0
          });
          setReceiverMatched(data.receiver_matched !== false);
          setMyCompanyName(data.my_company_name || "주식회사 쿠스");
        } else {
          setOcrScanning(false);
          alert(data.error || "OCR 파싱 실패");
        }
      } catch (err) {
        setOcrScanning(false);
        alert("OCR 파싱 실패");
      }
    };
    reader.onerror = () => {
      setOcrScanning(false);
      alert("파일을 읽는 도중 오류가 발생했습니다.");
    };
    reader.readAsDataURL(file);
  };

  // 품목 합산금액 및 합계수량 계산
  const calculatedTotal = ocrForm.items.reduce((sum, it) => sum + (it.quantity * it.unit_price), 0);
  const calculatedTotalQuantity = ocrForm.items.reduce((sum, it) => sum + Number(it.quantity || 0), 0);
  const isAmountMatching = ocrForm.originalTotalAmount === calculatedTotal;
  const isQuantityMatching = ocrForm.originalTotalQuantity === calculatedTotalQuantity;

  // OCR 완료된 받은 거래명세서 저장 실행
  const handleSaveOcrStatement = async () => {
    if (!ocrForm.partner_name || ocrForm.items.length === 0) return;

    // 금액 및 수량 불일치에 대한 이중 가드 컨펌 작동
    const hasAmountMismatch = ocrForm.originalTotalAmount > 0 && calculatedTotal !== ocrForm.originalTotalAmount;
    const hasQuantityMismatch = ocrForm.originalTotalQuantity > 0 && calculatedTotalQuantity !== ocrForm.originalTotalQuantity;

    if (hasAmountMismatch || hasQuantityMismatch) {
      let warningMsg = '[금액/수량 불일치 경고]\n\n';
      if (hasAmountMismatch) {
        warningMsg += `- 원본 거래명세서 금액(${ocrForm.originalTotalAmount.toLocaleString()}원)과 입력된 품목 합계금액(${calculatedTotal.toLocaleString()}원)이 일치하지 않습니다.\n`;
      }
      if (hasQuantityMismatch) {
        warningMsg += `- 원본 거래명세서 수량(${ocrForm.originalTotalQuantity.toLocaleString()}개)과 입력된 품목 합계수량(${calculatedTotalQuantity.toLocaleString()}개)이 일치하지 않습니다.\n`;
      }
      warningMsg += '\n이대로 강제로 받은 거래명세서 등록을 진행하시겠습니까?';
      const confirmForce = window.confirm(warningMsg);
      if (!confirmForce) return;
    }

    try {
      const tagsObj = {
        business_number: ocrForm.business_number,
        representative: ocrForm.representative,
        address: ocrForm.address,
        document_number: ocrForm.document_number,
        document_date: ocrForm.document_date,
        document_memo: ocrForm.document_memo,
        is_statement: true // 받은 거래명세서 식별 플래그 지정
      };

      const res = await apiFetch("/api/estimates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "INBOUND",
          direction_status: "RECEIVED", // 거래명세서는 수령/접수 완료
          partner_name: ocrForm.partner_name,
          partner_phone: ocrForm.partner_phone,
          partner_manager: ocrForm.partner_manager,
          items: ocrForm.items,
          ai_parsed: 1,
          file_url: ocrForm.file_url,
          tags: JSON.stringify(tagsObj),
          force_bypass: forceBypass,
          bypass_reason: bypassReason
        })
      });
      const data = await res.json();
      if (data.success) {
        handleClose();
        onSuccess();
        alert("AI OCR 분석 거래명세서가 성공적으로 대장에 적재되었습니다.");
      } else {
        alert(data.error || "명세서 등록 실패");
      }
    } catch (e) {
      alert("등록 중 오류 발생");
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] border border-slate-200 w-full max-w-xl p-6 md:p-8 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] animate-scale-up">
        {/* 닫기 버튼 */}
        <button onClick={handleClose} className="absolute top-5 right-5 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors cursor-pointer">
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-4">
          <Upload className="w-5 h-5 text-indigo-500" />
          <span>받은 거래명세서 스캔 등록 (AI OCR)</span>
        </h3>

        <div className="space-y-6 flex-1 overflow-y-auto pr-1">
          {/* 이미지 드롭존 */}
          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center bg-slate-50 relative min-h-[140px] overflow-hidden">
            {ocrScanning && (
              <div className="absolute inset-x-0 h-1 bg-indigo-500 animate-bounce z-20"></div>
            )}

            {ocrScanning ? (
              <div className="flex flex-col items-center space-y-2 text-center">
                <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                <span className="text-xs text-indigo-600 font-extrabold animate-pulse">Gemini Vision AI로 거래명세서 이미지 고해상도 OCR 스캔 중...</span>
              </div>
            ) : ocrSuccess ? (
              <div className="text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <div>
                  <span className="text-xs font-bold text-slate-700 block">{ocrFilename} 스캔 성공!</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">공급사, 연락처 및 {ocrForm.items.length}개 품목의 단가/수량 파싱 완료</span>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-3">
                <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                <div className="text-xs text-slate-500">거래명세서 사진/PDF 이미지 등록 시 AI가 데이터 자동 파싱</div>
                <label 
                  className="inline-block px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-black text-[11px] rounded-xl border border-indigo-100 cursor-pointer shadow-sm"
                >
                  거래명세서 파일 선택 (이미지 / PDF)
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

          {/* 스캔 결과 폼 */}
          {ocrSuccess && (
            <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-100 space-y-4 animate-scale-up">
              {!receiverMatched && (
                <div className="space-y-3">
                  <div className="bg-rose-50 border border-rose-100 text-rose-700 p-4 rounded-xl text-xs font-bold leading-normal flex items-start gap-2 text-left">
                    <span className="text-base shrink-0 mt-0.5">⚠️</span>
                    <div>
                      <span className="font-extrabold block text-rose-900 mb-1">수신인 불일치 (접수 거절)</span>
                      스캔 결과 해당 문서의 수신인이 본사({myCompanyName})와 일치하지 않습니다. 잘못된 외부 문서는 법정/재무적 리스크 방지를 위해 등록이 원천 차단됩니다.
                    </div>
                  </div>
                  
                  {(userRole === 'SUPER_ADMIN' || userRole === 'PRESIDENT') && (
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
                          className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                        />
                        불일치 경고를 무시하고 강제로 명세서 등록 승인
                      </label>
                      
                      {forceBypass && (
                        <div className="space-y-1.5 animate-scale-up">
                          <label className="block text-[10px] text-amber-700 font-bold">강제 승인 사유 입력 (5자 이상 필수) *</label>
                          <textarea
                            value={bypassReason}
                            onChange={(e) => setBypassReason(e.target.value)}
                            placeholder="예: 계열사 대리 수령 정산용 거래명세서 확인 완료"
                            className="w-full p-2.5 bg-white border border-amber-200 rounded-xl text-xs font-semibold outline-none focus:border-amber-500 text-slate-800"
                            rows={2}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

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

              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">스캔 데이터 상세 내역</span>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">공급처명</label>
                  <input 
                    type="text" 
                    value={ocrForm.partner_name}
                    onChange={e => setOcrForm(prev => ({ ...prev, partner_name: e.target.value }))}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">연락처</label>
                  <input 
                    type="text" 
                    value={ocrForm.partner_phone}
                    onChange={e => setOcrForm(prev => ({ ...prev, partner_phone: e.target.value }))}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">사업자번호</label>
                  <input 
                    type="text" 
                    value={ocrForm.business_number}
                    onChange={e => setOcrForm(prev => ({ ...prev, business_number: e.target.value }))}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">대표자명</label>
                  <input 
                    type="text" 
                    value={ocrForm.representative}
                    onChange={e => setOcrForm(prev => ({ ...prev, representative: e.target.value }))}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">담당자명</label>
                  <input 
                    type="text" 
                    value={ocrForm.partner_manager}
                    onChange={e => setOcrForm(prev => ({ ...prev, partner_manager: e.target.value }))}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">문서번호</label>
                  <input 
                    type="text" 
                    value={ocrForm.document_number}
                    onChange={e => setOcrForm(prev => ({ ...prev, document_number: e.target.value }))}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">발행일자</label>
                  <input 
                    type="text" 
                    value={ocrForm.document_date}
                    onChange={e => setOcrForm(prev => ({ ...prev, document_date: e.target.value }))}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">소재지 주소</label>
                  <input 
                    type="text" 
                    value={ocrForm.address}
                    onChange={e => setOcrForm(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">비고 및 설명</label>
                <textarea 
                  value={ocrForm.document_memo}
                  onChange={e => setOcrForm(prev => ({ ...prev, document_memo: e.target.value }))}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold resize-none"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-slate-400 font-bold block text-left">품목 리스트</label>
                <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                  {ocrForm.items.map((item, idx) => (
                    <div key={idx} className="bg-white p-3.5 rounded-2xl border border-slate-200 flex flex-col gap-1 text-xs font-semibold text-left">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 truncate pr-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-800">{item.product_name}</span>
                            {item.item_code && (
                              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-bold rounded">
                                {item.item_code}
                              </span>
                            )}
                            {(item.validItemCode || item.valid_item_code) && (
                              <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-black rounded border border-emerald-200">
                                유효품목코드: {item.validItemCode || item.valid_item_code}
                              </span>
                            )}
                          </div>
                          {item.spec && (
                            <span className="text-[10px] text-slate-500 block mt-0.5">
                              규격: {item.spec}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            단가: {item.unit_price.toLocaleString()}원
                          </span>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded text-center">{item.quantity}개</span>
                          <span className="text-[10px] font-black text-indigo-650 mt-1">
                            금액: {(item.quantity * item.unit_price).toLocaleString()}원
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 총액 패널 */}
              <div className="p-4 bg-indigo-50/40 rounded-2xl border border-indigo-100 flex items-center justify-between text-left shrink-0">
                <span className="text-xs font-extrabold text-slate-600">명세 등록 총 합계액 (총 {ocrForm.items.length}개 품목)</span>
                <span className="text-lg font-black text-indigo-700 font-mono">
                  {calculatedTotal.toLocaleString()}원
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 border-t border-slate-100 pt-4 flex gap-3">
          <button onClick={handleClose} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-xs cursor-pointer">
            취소
          </button>
          <button 
            onClick={handleSaveOcrStatement}
            disabled={!ocrSuccess || (!receiverMatched && !forceBypass) || (forceBypass && bypassReason.trim().length < 5)}
            className={`flex-1 py-3 text-white font-bold text-xs rounded-xl disabled:opacity-50 transition-colors cursor-pointer ${
              forceBypass 
                ? "bg-amber-600 hover:bg-amber-700" 
                : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {forceBypass ? "⚠️ 관리자 강제 승인 및 등록" : "받은 거래명세서 등록 승인"}
          </button>
        </div>
      </div>
    </div>
  );
}
