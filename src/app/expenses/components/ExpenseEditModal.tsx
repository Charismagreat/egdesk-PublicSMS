"use client";

import React, { useState, useEffect, useMemo } from "react";
import { X, Save, ShieldCheck, HelpCircle, XCircle } from "lucide-react";
import { Expense } from "../types";

export interface ExpenseEditModalProps {
  editExpense: Expense | null;
  setEditExpense: (expense: Expense | null) => void;
  handleUpdateExpense: (id: string, updatedExpense: any) => Promise<{ success: boolean; error?: string }>;
  handleApproveExpense: (id: string, status: 'APPROVED' | 'REJECTED' | 'HOLD', memo?: string) => Promise<{ success: boolean; error?: string }>;
  userRole: string;
  hasAdminAccess: boolean;
  fetchExpenses: () => Promise<void>;
  showToast?: (msg: string, type?: "success" | "error" | "warn") => void;
}

export default function ExpenseEditModal({
  editExpense,
  setEditExpense,
  handleUpdateExpense,
  handleApproveExpense,
  userRole,
  hasAdminAccess,
  fetchExpenses,
  showToast,
}: ExpenseEditModalProps) {
  const [formFields, setFormFields] = useState<any>({
    title: "",
    category: "",
    amount: 0,
    payment_method: "",
    actual_expense_date: "",
    deduction_amount: 0,
    transfer_fee: 0,
    memo: "",
    payee: "",
    requisition_date: "",
    card_approval_no: "",
  });

  const [approvalMemo, setApprovalMemo] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  // 🔑 승인 및 지출 증빙 수정 권한 상태 가드레일 도출
  const isApproved = formFields.approval_status === "APPROVED";
  const isTransferOrCash = ["계좌송금", "계좌이체", "현금"].includes(formFields.payment_method);
  const isEditable = isApproved && isTransferOrCash; // APPROVED 이며 계좌송금/현금인 건만 증빙 정보 입력 가능

  useEffect(() => {
    if (editExpense) {
      let payeeVal = "";
      let requisitionDateVal = editExpense.expense_date;

      try {
        if (editExpense.ai_analysis) {
          const parsed = JSON.parse(editExpense.ai_analysis);
          payeeVal = parsed.payee || "";
          requisitionDateVal = parsed.requisition_date || editExpense.expense_date;
        }
      } catch (e) {}

      setFormFields({
        ...editExpense,
        payee: payeeVal,
        requisition_date: requisitionDateVal,
        deduction_amount: editExpense.deduction_amount || 0,
        transfer_fee: editExpense.transfer_fee || 0,
        actual_expense_date: editExpense.actual_expense_date || "",
        card_approval_no: editExpense.card_approval_no || "",
      });

      setApprovalMemo(editExpense.approval_memo || "");
    }
  }, [editExpense]);

  if (!editExpense) return null;

  const handleFieldChange = (key: string, value: any) => {
    setFormFields(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const alertUser = (msg: string, type: "success" | "error" | "warn" = "success") => {
    if (showToast) {
      showToast(msg, type);
    } else {
      alert(msg);
    }
  };

  // 일반 장부 인라인 정보 수정 저장
  const onSaveClick = async () => {
    if (!formFields.title || !formFields.amount) {
      alertUser("적요 및 지출 금액은 필수 입력 사항입니다.", "warn");
      return;
    }

    setIsSaving(true);
    try {
      // 폼 메타 데이터를 ai_analysis와 동기화
      let parsedAi = {};
      try {
        parsedAi = JSON.parse(formFields.ai_analysis || "{}");
      } catch (e) {}

      const updatedPayload = {
        title: formFields.title,
        category: formFields.category,
        amount: Number(formFields.amount),
        payment_method: formFields.payment_method,
        actual_expense_date: formFields.actual_expense_date || null,
        deduction_amount: Number(formFields.deduction_amount) || 0,
        transfer_fee: Number(formFields.transfer_fee) || 0,
        memo: formFields.memo || "",
        expense_date: formFields.requisition_date,
        card_approval_no: formFields.card_approval_no || null,
        ai_analysis: JSON.stringify({
          ...parsedAi,
          payee: formFields.payee,
          requisition_date: formFields.requisition_date,
          approval_date: formFields.requisition_date
        })
      };

      const result = await handleUpdateExpense(editExpense.id, updatedPayload);
      if (result.success) {
        alertUser("지출 결의서의 기입 내역이 저장되었습니다.", "success");
        setEditExpense(null);
      } else {
        alertUser("저장 실패: " + result.error, "error");
      }
    } catch (e) {
      alertUser("저장 중 알 수 없는 에러가 발생했습니다.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // 결재 보류/승인/반려 의사 결정 처리 (대표자/최고관리자 권한)
  const onApproveClick = async (status: 'APPROVED' | 'REJECTED' | 'HOLD') => {
    setIsSaving(true);
    try {
      const result = await handleApproveExpense(editExpense.id, status, approvalMemo);
      if (result.success) {
        const stateWord = status === 'APPROVED' ? '승인' : status === 'REJECTED' ? '반려' : '결재 보류';
        alertUser(`지출 결의서 결재가 [${stateWord}] 처리되었습니다.`, "success");
        setEditExpense(null);
      } else {
        alertUser("결재 처리 실패: " + result.error, "error");
      }
    } catch (e) {
      alertUser("결재 통신 중 에러가 발생했습니다.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-100 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-fade-in flex flex-col text-slate-800">
        
        {/* 모달 헤더 */}
        <div className="p-5 border-b border-slate-150 flex justify-between items-center select-none shrink-0">
          <h2 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            📄 지출결의서 상세 정보 및 결재 수선
          </h2>
          <button 
            type="button"
            onClick={() => setEditExpense(null)}
            className="text-slate-400 hover:text-slate-700 p-1.5 hover:bg-slate-50 rounded-full border-none bg-transparent cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 모달 콘텐트 본문 */}
        <div className="p-6 space-y-4 overflow-y-auto text-left text-xs">
          
          <div className="grid grid-cols-2 gap-3.5">
            
            {/* 적요 */}
            <div className="col-span-2">
              <label className="block text-[10px] font-extrabold text-slate-500 mb-1">적요 (지출 상세 사유) *</label>
              <textarea 
                rows={2}
                value={formFields.title}
                onChange={e => handleFieldChange('title', e.target.value)}
                className="w-full border border-slate-250 rounded-xl px-3.5 py-2.5 outline-none font-bold text-xs bg-white text-slate-805 resize-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>

            {/* 계정과목 */}
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 mb-1">계정과목 (비목 소분류)</label>
              <input 
                type="text"
                disabled={true}
                value={formFields.category}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none font-bold text-xs bg-slate-50 text-slate-500 cursor-not-allowed"
              />
            </div>

            {/* 결제수단 */}
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 mb-1">결제수단 *</label>
              <input 
                type="text"
                disabled={true}
                value={formFields.payment_method}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none font-bold text-xs bg-slate-50 text-slate-500 cursor-not-allowed"
              />
            </div>

            {/* 카드 승인번호 */}
            {formFields.payment_method?.includes("카드") ? (
              <div>
                <label className="block text-[10px] font-extrabold text-rose-500 mb-1">카드 승인번호 (8자리) *</label>
                <input 
                  type="text"
                  placeholder="승인번호 입력"
                  maxLength={8}
                  value={formFields.card_approval_no || ""}
                  onChange={e => handleFieldChange('card_approval_no', e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full border border-rose-250 rounded-xl px-3.5 py-2.5 outline-none font-bold text-xs bg-white text-slate-805"
                />
              </div>
            ) : (
              <div>
                <label className="block text-[10px] font-extrabold text-slate-350 mb-1">카드 승인번호</label>
                <input 
                  type="text"
                  disabled={true}
                  placeholder="카드 결제 시 제공"
                  value=""
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none font-semibold text-xs bg-slate-100/70 text-slate-400 cursor-not-allowed"
                />
              </div>
            )}

            {/* 영수인/거래처 */}
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 mb-1">영수인/가맹점명/거래처명 *</label>
              <input 
                type="text"
                value={formFields.payee}
                onChange={e => handleFieldChange('payee', e.target.value)}
                className="w-full border border-slate-250 rounded-xl px-3.5 py-2.5 outline-none font-bold text-xs bg-white text-slate-805 focus:ring-2 focus:ring-rose-500/20"
              />
            </div>

            {/* 품의 일자 */}
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 mb-1">품의 일자 *</label>
              <input 
                type="date"
                value={formFields.requisition_date}
                onChange={e => handleFieldChange('requisition_date', e.target.value)}
                className="w-full border border-slate-250 rounded-xl px-3.5 py-2 outline-none font-bold text-xs bg-white text-slate-700 cursor-pointer focus:ring-2 focus:ring-rose-500/20"
              />
            </div>

            {/* 지출 금액 */}
            <div className="col-span-2">
              <label className="block text-[10px] font-extrabold text-slate-500 mb-1">원화 지출액 *</label>
              <div className="relative">
                <input 
                  type="number"
                  value={formFields.amount}
                  onChange={e => handleFieldChange('amount', Number(e.target.value) || 0)}
                  className="w-full border border-slate-250 rounded-xl pl-3.5 pr-8 py-2.5 outline-none font-black text-xs bg-white text-slate-805 focus:ring-2 focus:ring-rose-500/20"
                />
                <span className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 font-extrabold text-[10px]">원</span>
              </div>
            </div>

            {/* 비고(태그) */}
            <div className="col-span-2">
              <label className="block text-[10px] font-extrabold text-slate-500 mb-1">비고 (지출태그)</label>
              <input 
                type="text"
                value={formFields.memo || ""}
                onChange={e => handleFieldChange('memo', e.target.value)}
                className="w-full border border-slate-250 rounded-xl px-3.5 py-2.5 outline-none font-bold text-xs bg-white text-slate-805 focus:ring-2 focus:ring-rose-500/20"
              />
            </div>

            {/* 🔒 APPROVED 사후 지출 증빙 기입 섹션 (가드레일 제한 작동) */}
            <div className="col-span-2 border-t border-slate-100 pt-4.5 space-y-3.5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-800 flex items-center">
                  🔒 사후 지출 증빙 정보 (결재 완료 후 적용)
                </span>
                {!isEditable && (
                  <span className="text-[9px] bg-slate-100 border text-slate-500 px-2 py-0.5 rounded font-black select-none border-slate-200">
                    편집 제한 비활성
                  </span>
                )}
              </div>

              {!isApproved ? (
                <p className="text-[9.5px] text-amber-600 font-bold bg-amber-50 p-2.5 rounded-xl leading-normal border border-amber-100">
                  ⚠️ 본 내역은 아직 '결재 대기/보류' 상태입니다. 대표자 결재가 완료(APPROVED)된 건만 지출 증빙을 기입할 수 있습니다.
                </p>
              ) : !isTransferOrCash ? (
                <p className="text-[9.5px] text-slate-500 font-bold bg-slate-50 p-2.5 rounded-xl leading-normal border border-slate-200">
                  ℹ️ 법인카드 및 개인신용카드 지출수단은 카드사 가맹 결제가 발생하므로 [공제액/수수료/실지출일] 사후 작성을 제한하며 카드 명세서로 대체합니다.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3.5 bg-rose-50/20 p-4 border border-rose-100 rounded-2xl animate-fade-in">
                  <div>
                    <label className="block text-[10px] font-extrabold text-rose-600 mb-1">실제 지출일 (이체 실행일)</label>
                    <input 
                      type="date"
                      value={formFields.actual_expense_date || ""}
                      onChange={e => handleFieldChange('actual_expense_date', e.target.value)}
                      className="w-full border border-rose-200 rounded-xl px-3 py-1.5 outline-none font-bold text-xs bg-white text-slate-700 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-rose-600 mb-1">공제액 (차감원금 ₩)</label>
                    <input 
                      type="number"
                      value={formFields.deduction_amount || ""}
                      onChange={e => handleFieldChange('deduction_amount', Number(e.target.value) || 0)}
                      className="w-full border border-rose-200 rounded-xl px-3 py-1.5 outline-none font-bold text-xs bg-white text-slate-805"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-extrabold text-rose-600 mb-1">송금수수료 (가산원금 ₩)</label>
                    <input 
                      type="number"
                      value={formFields.transfer_fee || ""}
                      onChange={e => handleFieldChange('transfer_fee', Number(e.target.value) || 0)}
                      className="w-full border border-rose-200 rounded-xl px-3 py-1.5 outline-none font-bold text-xs bg-white text-slate-805"
                    />
                  </div>
                  <div className="col-span-2 flex items-center justify-between font-bold text-[10px] text-slate-800 border-t border-rose-200/50 pt-2 font-mono">
                    <span>최종 실지급액:</span>
                    <span className="font-black text-rose-600">
                      {((formFields.amount || 0) - (formFields.deduction_amount || 0) + (formFields.transfer_fee || 0)).toLocaleString()}원
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 👥 대표자 결재 승인 전용 섹션 (최고관리자/대표자 권한 노출) */}
            {hasAdminAccess && (
              <div className="col-span-2 border-t border-slate-100 pt-4.5 space-y-3">
                <span className="text-[10px] font-black text-slate-800 flex items-center">
                  🛡️ 대표자/최고관리자 결재 심사 센터
                </span>
                <div>
                  <label className="block text-[9.5px] font-extrabold text-slate-500 mb-1">결재 심사 피드백 메모 (반려/보류 사유 기입)</label>
                  <input 
                    type="text"
                    placeholder="결재 결정 시 비고에 남길 상세 피드백 문구를 남기세요."
                    value={approvalMemo}
                    onChange={e => setApprovalMemo(e.target.value)}
                    className="w-full border border-slate-250 rounded-xl px-3.5 py-2 outline-none font-bold text-xs bg-white text-slate-805 focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
                <div className="flex gap-2 w-full">
                  <button
                    type="button"
                    onClick={() => onApproveClick('HOLD')}
                    disabled={isSaving}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black text-[10px] border-none cursor-pointer shadow-3xs transition-all active:scale-95 disabled:opacity-40"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    보류 (HOLD)
                  </button>
                  <button
                    type="button"
                    onClick={() => onApproveClick('REJECTED')}
                    disabled={isSaving}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-[10px] border-none cursor-pointer shadow-3xs transition-all active:scale-95 disabled:opacity-40"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    반려 (REJECT)
                  </button>
                  <button
                    type="button"
                    onClick={() => onApproveClick('APPROVED')}
                    disabled={isSaving}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-black text-[10px] border-none cursor-pointer shadow-3xs transition-all active:scale-95 disabled:opacity-40"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    승인 (APPROVE)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 모달 하단 버튼 */}
        <div className="p-5 border-t border-slate-150 flex justify-end gap-2 shrink-0">
          <button 
            type="button"
            onClick={() => setEditExpense(null)}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl font-bold text-xs cursor-pointer shadow-3xs transition-all"
          >
            취소
          </button>
          <button 
            type="button"
            onClick={onSaveClick}
            disabled={isSaving}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-805 text-white rounded-xl font-bold text-xs shadow-md hover:opacity-95 transition-all cursor-pointer border-none flex items-center gap-1.5"
          >
            <Save className="w-4 h-4 text-white" />
            내역 저장
          </button>
        </div>

      </div>
    </div>
  );
}
