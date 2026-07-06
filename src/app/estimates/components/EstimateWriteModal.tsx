"use client";

import { apiFetch } from '@/lib/api';
import React, { useState } from "react";
import { Sparkles, Plus, X } from "lucide-react";
import { Partner } from "../types";

interface EstimateWriteModalProps {
  isOpen: boolean;
  onClose: () => void;
  partners: Partner[];
  onSuccess: () => void;
}

export default function EstimateWriteModal({
  isOpen,
  onClose,
  partners,
  onSuccess
}: EstimateWriteModalProps) {
  const [selectedPartnerId, setSelectedPartnerId] = useState("direct");
  const [writePartner, setWritePartner] = useState("");
  const [writeManager, setWriteManager] = useState("");
  const [writePhone, setWritePhone] = useState("");
  const [writeEmail, setWriteEmail] = useState(""); // 수신 이메일 주소
  const [writeFax, setWriteFax] = useState("");     // 수신 FAX 번호
  const [writeItems, setWriteItems] = useState<Array<{ item_code: string; product_name: string; spec: string; quantity: number; unit_price: number }>>([
    { item_code: "BEAN-ETH1K", product_name: "에티오피아 예가체프 G1 워시드 원두 1kg", spec: "1kg/백", quantity: 15, unit_price: 18500 }
  ]);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingResult, setPricingResult] = useState<any>(null);
  const [myProfile, setMyProfile] = useState<any>(null);

  // 발송 패널 제어 상태
  const [showSendPanel, setShowSendPanel] = useState(false);
  const [sendMethod, setSendMethod] = useState<'EMAIL' | 'SMS' | 'FAX'>('EMAIL');
  const [sendTarget, setSendTarget] = useState("");

  React.useEffect(() => {
    if (!isOpen) return;
    apiFetch('/api/settings?key=my_company_profile')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.value) {
          try {
            setMyProfile(JSON.parse(data.value));
          } catch(e) {}
        }
      });
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    setPricingResult(null);
    setWritePartner("");
    setWriteManager("");
    setWritePhone("");
    setWriteEmail("");
    setWriteFax("");
    setSelectedPartnerId("direct");
    setWriteItems([
      { item_code: "BEAN-ETH1K", product_name: "에티오피아 예가체프 G1 워시드 원두 1kg", spec: "1kg/백", quantity: 15, unit_price: 18500 }
    ]);
    setShowSendPanel(false);
    onClose();
  };

  // AI 동적 견적 가격 연산 요청
  const handleCalculatePricing = async () => {
    if (!writePartner.trim()) {
      alert("바이어 성함/상호명을 적어주세요.");
      return;
    }
    setPricingLoading(true);
    try {
      const res = await apiFetch("/api/estimates/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partner_name: writePartner,
          partner_id: selectedPartnerId === "direct" ? "" : selectedPartnerId,
          items: writeItems
        })
      });
      const data = await res.json();
      if (data.success) {
        setPricingResult(data);
      } else {
        alert(data.error || "가격 제안 실패");
      }
    } catch (e) {
      alert("가격 제안 실패");
    } finally {
      setPricingLoading(false);
    }
  };

  // 1. 견적서 임시 저장 (DRAFT)
  const handleSaveDraft = async () => {
    if (!pricingResult) return;
    try {
      const res = await apiFetch("/api/estimates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "OUTBOUND",
          direction_status: "DRAFT",
          partner_name: writePartner,
          partner_phone: writePhone,
          partner_manager: writeManager,
          partner_id: selectedPartnerId === "direct" ? "" : selectedPartnerId,
          email: writeEmail,
          items: pricingResult.calculatedItems,
          memo: pricingResult.aiLetter
        })
      });
      const data = await res.json();
      if (data.success) {
        handleClose();
        onSuccess();
        alert(data.message || "견적서가 임시 저장 상태로 성공적으로 등록되었습니다.");
      } else {
        alert(data.error || "임시 저장 실패");
      }
    } catch (e) {
      alert("임시 저장 중 네트워크 에러 발생");
    }
  };

  // 2. 견적서 등록 (SENT, 발송 없음)
  const handleRegisterOnly = async () => {
    if (!pricingResult) return;
    try {
      const res = await apiFetch("/api/estimates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "OUTBOUND",
          direction_status: "SENT",
          partner_name: writePartner,
          partner_phone: writePhone,
          partner_manager: writeManager,
          partner_id: selectedPartnerId === "direct" ? "" : selectedPartnerId,
          email: writeEmail,
          items: pricingResult.calculatedItems,
          memo: pricingResult.aiLetter
        })
      });
      const data = await res.json();
      if (data.success) {
        handleClose();
        onSuccess();
        alert(data.message || "견적서가 공식 등록 완료되었습니다.");
      } else {
        alert(data.error || "견적 등록 실패");
      }
    } catch (e) {
      alert("견적 등록 중 네트워크 에러 발생");
    }
  };

  // 3. 견적서 최종 발송 (선택 채널 연동)
  const handleExecuteSend = async () => {
    if (!pricingResult) return;
    if (!sendTarget.trim()) {
      alert("발송 수신처를 입력해 주세요.");
      return;
    }
    try {
      const res = await apiFetch("/api/estimates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "OUTBOUND",
          direction_status: "SENT",
          partner_name: writePartner,
          partner_phone: writePhone,
          partner_manager: writeManager,
          partner_id: selectedPartnerId === "direct" ? "" : selectedPartnerId,
          email: writeEmail,
          items: pricingResult.calculatedItems,
          memo: pricingResult.aiLetter,
          send_method: sendMethod,
          send_target: sendTarget
        })
      });
      const data = await res.json();
      if (data.success) {
        handleClose();
        onSuccess();
        alert(data.message || "선택하신 수단으로 견적서 발송이 성공적으로 완료되었습니다!");
      } else {
        alert(data.error || "견적 발송 실패");
      }
    } catch (e) {
      alert("견적 발송 중 네트워크 에러 발생");
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] max-w-2xl w-full p-6 md:p-8 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] animate-scale-up">
        <button onClick={handleClose} className="absolute top-5 right-5 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
          <span>AI 최적 가격 제안 및 보낼 견적서 기획</span>
        </h3>

        <div className="space-y-5 flex-1 overflow-y-auto pr-1">
          {/* 공급자 정보 (우리 회사) - ReadOnly 고정 */}
          {myProfile && (
            <div className="bg-slate-50/50 p-4.5 rounded-2xl border border-indigo-100/35 space-y-2.5 text-left">
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block flex items-center gap-1">
                🏢 공급자 정보 (우리 회사)
              </span>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-semibold text-slate-600">
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold">상호명</span>
                  <span className="text-slate-800 font-extrabold">{myProfile.companyName || "(주)쿠스"}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold">대표자</span>
                  <span className="text-slate-800 font-extrabold">{myProfile.representative || "차민수"}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold">사업자번호</span>
                  <span className="text-slate-800 font-mono font-extrabold">{myProfile.businessNumber || "731-81-02023"}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold">대표전화</span>
                  <span className="text-slate-800 font-mono font-extrabold">{myProfile.phone || "010-7216-5884"}</span>
                </div>
              </div>
            </div>
          )}

          {/* B2B 바이어 선택 및 정보 입력 */}
          <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div>
              <label className="text-[10px] text-slate-400 font-bold block mb-1">B2B 거래처 바이어 선택 🤝</label>
              <select
                value={selectedPartnerId}
                onChange={e => {
                  const ptId = e.target.value;
                  setSelectedPartnerId(ptId);
                  if (ptId === "direct") {
                    setWritePartner("");
                    setWriteManager("");
                    setWritePhone("");
                    setWriteEmail("");
                    setWriteFax("");
                  } else {
                    const target = partners.find(p => p.id === ptId);
                    if (target) {
                      setWritePartner(target.company_name);
                      setWritePhone(target.phone || "");
                      setWriteEmail((target as any).email || "");
                      setWriteFax((target as any).fax || "");
                    }
                  }
                }}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold"
              >
                <option value="direct">직접 입력 (신규 바이어)</option>
                {partners.filter(p => p.type === 'BUYER').map(pt => (
                  <option key={pt.id} value={pt.id}>{pt.company_name} ({pt.vip_level})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">바이어 성함/상호명 *</label>
                <input 
                  type="text" 
                  placeholder="예: 유재석 (단골VIP)"
                  value={writePartner}
                  onChange={e => setWritePartner(e.target.value)}
                  disabled={selectedPartnerId !== "direct"}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold disabled:bg-slate-100/70 disabled:text-slate-500"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">수신인명 (담당자)</label>
                <input 
                  type="text" 
                  placeholder="예: 홍길동"
                  value={writeManager}
                  onChange={e => setWriteManager(e.target.value)}
                  disabled={selectedPartnerId !== "direct"}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold disabled:bg-slate-100/70 disabled:text-slate-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">수신처 연락처 *</label>
                <input 
                  type="text" 
                  placeholder="010-7777-7777"
                  value={writePhone}
                  onChange={e => setWritePhone(e.target.value)}
                  disabled={selectedPartnerId !== "direct"}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold disabled:bg-slate-100/70 disabled:text-slate-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">수신처 이메일 주소</label>
                <input 
                  type="email" 
                  placeholder="example@email.com"
                  value={writeEmail}
                  onChange={e => setWriteEmail(e.target.value)}
                  disabled={selectedPartnerId !== "direct"}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold disabled:bg-slate-100/70 disabled:text-slate-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">수신처 FAX 번호</label>
                <input 
                  type="text" 
                  placeholder="예: 02-1234-5678"
                  value={writeFax}
                  onChange={e => setWriteFax(e.target.value)}
                  disabled={selectedPartnerId !== "direct"}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold disabled:bg-slate-100/70 disabled:text-slate-500"
                />
              </div>
            </div>
          </div>

          {/* 품목 입력란 B2B */}
          <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="flex justify-between items-center border-b border-slate-200 pb-1.5 mb-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">제안 품목 및 수량</span>
              <button
                type="button"
                onClick={() => {
                  setWriteItems([...writeItems, { item_code: "", product_name: "", spec: "", quantity: 1, unit_price: 10000 }]);
                }}
                className="p-1 text-indigo-650 hover:bg-indigo-50 rounded-lg border border-indigo-150 flex items-center gap-0.5 text-[9px] font-black cursor-pointer"
              >
                <Plus className="w-3 h-3" /> 품목 추가
              </button>
            </div>

            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
              {writeItems.map((item, idx) => (
                <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 text-left relative">
                  <div className="flex justify-between items-center">
                    <label className="block text-[9px] font-black text-indigo-600 uppercase tracking-wider">품목 #{idx + 1}</label>
                    {writeItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setWriteItems(writeItems.filter((_, i) => i !== idx));
                        }}
                        className="text-[9px] font-bold text-rose-500 hover:text-rose-700 cursor-pointer"
                      >
                        삭제
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 mb-1">품목코드</label>
                      <input 
                        type="text" 
                        placeholder="예: ITEM-001"
                        value={item.item_code}
                        onChange={e => {
                          const next = [...writeItems];
                          next[idx].item_code = e.target.value;
                          setWriteItems(next);
                        }}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[9px] font-bold text-slate-400 mb-1">품명 *</label>
                      <input 
                        type="text" 
                        placeholder="예: 예가체프 원두"
                        value={item.product_name}
                        onChange={e => {
                          const next = [...writeItems];
                          next[idx].product_name = e.target.value;
                          setWriteItems(next);
                        }}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 mb-1">규격</label>
                      <input 
                        type="text" 
                        placeholder="예: 1kg"
                        value={item.spec}
                        onChange={e => {
                          const next = [...writeItems];
                          next[idx].spec = e.target.value;
                          setWriteItems(next);
                        }}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 mb-1">수량 *</label>
                      <input 
                        type="number" 
                        value={item.quantity}
                        onChange={e => {
                          const next = [...writeItems];
                          next[idx].quantity = parseInt(e.target.value) || 0;
                          setWriteItems(next);
                        }}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-center"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 mb-1">기준단가 (원) *</label>
                      <input 
                        type="number" 
                        value={item.unit_price}
                        onChange={e => {
                          const next = [...writeItems];
                          next[idx].unit_price = parseInt(e.target.value) || 0;
                          setWriteItems(next);
                        }}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-right font-mono"
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <button
              type="button"
              onClick={handleCalculatePricing}
              disabled={pricingLoading}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer mt-2"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              {pricingLoading ? "AI가 우수고객 이력 및 볼륨 디스카운트 단가 연산 중..." : "AI 볼륨 할인 및 단가 계산 실행"}
            </button>
          </div>

          {/* 동적 가격 결과 및 비즈니스 서한 초안 */}
          {pricingResult && (
            <div className="space-y-4 bg-indigo-50/20 p-5 rounded-2xl border border-indigo-100 animate-scale-up">
              <div className="flex justify-between items-center border-b border-indigo-100 pb-2">
                <span className="text-xs font-black text-indigo-950 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> AI 최적 동적 단가 산정 성공!
                </span>
                <span className="text-[10px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded-md">
                  {pricingResult.isVip ? "우수고객 우대 적용됨 (+5% 추가)" : "볼륨 할인 반영"}
                </span>
              </div>

              <div className="space-y-2 text-xs font-semibold">
                {pricingResult.calculatedItems.map((item: any, idx: number) => (
                  <div key={idx} className="bg-white p-3 rounded-xl border border-slate-100 flex justify-between">
                    <div>
                      <span className="font-bold text-slate-800">{item.product_name} ({item.quantity}개)</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">기존 단가 대비 {item.discount_applied} 할인</span>
                    </div>
                    <span className="font-bold text-indigo-600 text-right">
                      {item.amount.toLocaleString()}원 
                      <br />
                      <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">개당 {item.unit_price.toLocaleString()}원</span>
                    </span>
                  </div>
                ))}
                
                <div className="flex justify-between items-center text-sm font-black text-slate-800 border-t border-indigo-100 pt-3 px-1">
                  <span>최종 제안 합계 견적액</span>
                  <span className="text-indigo-600 text-base font-extrabold">{pricingResult.totalProposedAmount.toLocaleString()}원</span>
                </div>
              </div>

              {/* AI 레터 초안 */}
              <div className="space-y-2">
                <span className="text-[10px] font-black text-indigo-900 uppercase tracking-widest block">AI 품격 있는 맞춤 비즈니스 서한 편지글</span>
                <textarea
                  value={pricingResult.aiLetter}
                  onChange={e => setPricingResult((prev: any) => ({ ...prev, aiLetter: e.target.value }))}
                  className="w-full h-36 p-4 bg-white border border-indigo-100 rounded-2xl text-xs text-slate-700 leading-relaxed outline-none"
                />
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 border-t border-slate-100 pt-4 flex flex-col gap-3">
          {/* 발송 옵션 선택 패널 */}
          {showSendPanel && (
            <div className="bg-indigo-50/40 p-4.5 rounded-2xl border border-indigo-100/60 text-xs font-bold space-y-3.5 animate-scale-up text-left">
              <span className="text-indigo-950 font-black flex items-center gap-1">✉️ 견적서 발송 방식 및 수신처 선택</span>
              
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input 
                    type="radio" 
                    name="sendMethod" 
                    value="EMAIL" 
                    checked={sendMethod === 'EMAIL'} 
                    onChange={() => {
                      setSendMethod('EMAIL');
                      setSendTarget(writeEmail);
                    }}
                    className="text-indigo-650 focus:ring-indigo-500" 
                  />
                  <span>이메일 발송</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input 
                    type="radio" 
                    name="sendMethod" 
                    value="SMS" 
                    checked={sendMethod === 'SMS'} 
                    onChange={() => {
                      setSendMethod('SMS');
                      setSendTarget(writePhone);
                    }}
                    className="text-indigo-650 focus:ring-indigo-500" 
                  />
                  <span>휴대폰 문자</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input 
                    type="radio" 
                    name="sendMethod" 
                    value="FAX" 
                    checked={sendMethod === 'FAX'} 
                    onChange={() => {
                      setSendMethod('FAX');
                      setSendTarget(writeFax);
                    }}
                    className="text-indigo-650 focus:ring-indigo-500" 
                  />
                  <span>팩스 발송</span>
                </label>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">
                  {sendMethod === 'EMAIL' ? '수신 이메일 주소 *' : sendMethod === 'SMS' ? '수신 연락처 *' : '수신 FAX 번호 *'}
                </label>
                <input
                  type="text"
                  value={sendTarget}
                  onChange={e => setSendTarget(e.target.value)}
                  placeholder={sendMethod === 'EMAIL' ? 'example@email.com' : sendMethod === 'SMS' ? '010-1234-5678' : '02-1234-5678'}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleExecuteSend}
                  disabled={!sendTarget.trim()}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  견적서 최종 발송
                </button>
                <button
                  type="button"
                  onClick={() => setShowSendPanel(false)}
                  className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-2.5">
            <button onClick={handleClose} className="px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-xs">
              닫기
            </button>
            <button 
              type="button"
              onClick={handleSaveDraft}
              disabled={!pricingResult}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl disabled:opacity-50 cursor-pointer"
            >
              견적서 임시 저장
            </button>
            <button 
              type="button"
              onClick={handleRegisterOnly}
              disabled={!pricingResult}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl disabled:opacity-50 cursor-pointer"
            >
              견적서 등록
            </button>
            <button 
              type="button"
              onClick={() => {
                setShowSendPanel(true);
                // 기본값 세팅
                if (sendMethod === 'EMAIL') setSendTarget(writeEmail);
                else if (sendMethod === 'SMS') setSendTarget(writePhone);
                else setSendTarget(writeFax);
              }}
              disabled={!pricingResult}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl disabled:opacity-50 cursor-pointer"
            >
              견적서 발송
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
