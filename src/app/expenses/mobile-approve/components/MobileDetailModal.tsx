'use client';

import React from 'react';
import { X, Check, AlertCircle } from 'lucide-react';
import { MobileExpense, SuggestItem } from '../types';

interface MobileDetailModalProps {
  selectedExpense: MobileExpense;
  onClose: () => void;
  isEditing: boolean;
  setIsEditing: (b: boolean) => void;
  editTitle: string;
  setEditTitle: (s: string) => void;
  editAmount: number;
  setEditAmount: (n: number) => void;
  editCategory: string;
  setEditCategory: (s: string) => void;
  editPaymentMethod: string;
  setEditPaymentMethod: (s: string) => void;
  editExpenseDate: string;
  setEditExpenseDate: (s: string) => void;
  editMemo: string;
  setEditMemo: (s: string) => void;
  editActualExpenseDate: string;
  setEditActualExpenseDate: (s: string) => void;
  editDeductionAmount: number;
  setEditDeductionAmount: (n: number) => void;
  editTransferFee: number;
  setEditTransferFee: (n: number) => void;
  dbCategories: any[];
  dbTags: any[];
  getCategoryDetails: (subCat: string) => { main: string; mid: string; sub: string };
  getTaggedInfo: (title: string) => { department: string; staff: string; project: string };
  handleUpdateDirect: () => void;
  handleDeleteDirect: (id: string) => void;
  handleDirectApprove: (id: string, e: React.MouseEvent) => void;
  setOpinionModalType: (t: 'REJECTED' | 'HOLD' | null) => void;
  isSubmitting: boolean;
  showSuggestions: boolean;
  filteredSuggestions: SuggestItem[];
  activeSuggestIndex: number;
  selectSuggestion: (item: SuggestItem) => void;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  toggleEditTag: (tag: string) => void;
  showAttachment: boolean;
  setShowAttachment: (b: boolean) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

export default function MobileDetailModal({
  selectedExpense,
  onClose,
  isEditing,
  setIsEditing,
  editTitle,
  editAmount,
  setEditAmount,
  editCategory,
  setEditCategory,
  editPaymentMethod,
  setEditPaymentMethod,
  editExpenseDate,
  setEditExpenseDate,
  editMemo,
  setEditMemo,
  editActualExpenseDate,
  setEditActualExpenseDate,
  editDeductionAmount,
  setEditDeductionAmount,
  editTransferFee,
  setEditTransferFee,
  dbCategories,
  dbTags,
  getCategoryDetails,
  getTaggedInfo,
  handleUpdateDirect,
  handleDeleteDirect,
  handleDirectApprove,
  setOpinionModalType,
  isSubmitting,
  showSuggestions,
  filteredSuggestions,
  activeSuggestIndex,
  selectSuggestion,
  handleInputChange,
  handleInputKeyDown,
  toggleEditTag,
  showAttachment,
  setShowAttachment,
  inputRef
}: MobileDetailModalProps) {
  const catDetails = getCategoryDetails(selectedExpense.category);
  const taggedInfo = getTaggedInfo(selectedExpense.title);
  const hasTags = taggedInfo.department !== "-" || taggedInfo.staff !== "-" || taggedInfo.project !== "-";
  
  const aiPayee = (() => {
    try {
      const parsed = JSON.parse(selectedExpense.ai_analysis || '{}');
      return parsed.payee || '';
    } catch(e) { return ''; }
  })();
  
  const isPdf = selectedExpense.attachment_url?.toLowerCase().endsWith('.pdf');

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-end justify-center p-0">
      <div className="bg-white rounded-t-3xl w-full max-w-md max-h-[92vh] flex flex-col shadow-2xl border-t border-slate-100 animate-slide-up">
        
        {/* 모달 헤더 */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <h4 className="text-xs font-black text-slate-800">
              {isEditing ? "✏️ 지출 명세 즉석 수정" : "🔍 기안서 정밀 상세 검수"}
            </h4>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors border-none bg-transparent cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 모달 본문 - 스크롤 가능 영역 */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1 text-slate-700">
          
          {isEditing ? (
            /* ✏️ 수정 모드 폼 */
            <div className="space-y-3.5">
              {/* 적요(품명) */}
              <div className="relative">
                <label className="block text-[9px] font-extrabold text-slate-400 mb-1">지출 명세(적요)</label>
                <input 
                  id="edit-title-input"
                  ref={inputRef}
                  type="text"
                  value={editTitle}
                  onChange={handleInputChange}
                  onKeyDown={handleInputKeyDown}
                  placeholder="예: 사무용 A4용지 구입 @개발부 @홍길동"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none font-bold text-[11px] bg-slate-50 focus:ring-2 focus:ring-rose-500 text-slate-800"
                />
                <span className="block text-[8px] text-slate-400 mt-1 pl-1">
                  💡 적요에 @부서명, @담당자명, @프로젝트명을 넣으면 자동 매핑됩니다.
                </span>

                {/* 🔮 플로팅 자동완성 드롭다운 (모바일 수정 화면 전용) */}
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <div id="autocomplete-dropdown" className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto z-60 animate-scale-up p-1">
                    {filteredSuggestions.map((item, index) => {
                      const isSelected = index === activeSuggestIndex;
                      return (
                        <div
                          key={`${item.type}-${item.value}`}
                          onClick={() => selectSuggestion(item)}
                          className={`flex items-center justify-between p-2 rounded-lg text-[10px] font-black cursor-pointer transition-colors ${
                            isSelected ? "bg-rose-50 text-rose-700" : "hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            {item.type === 'staff' && '👤'}
                            {item.type === 'department' && '🏢'}
                            {item.type === 'project' && '🚀'}
                            {item.type === 'partner' && '🤝'}
                            {item.label}
                          </span>
                          <span className="text-[7.5px] font-extrabold px-1 py-0.5 rounded bg-slate-100 text-slate-400">
                            {item.type === 'staff' && '임직원'}
                            {item.type === 'department' && '부서'}
                            {item.type === 'project' && '프로젝트'}
                            {item.type === 'partner' && '거래처'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 금액 */}
              <div>
                <label className="block text-[9px] font-extrabold text-slate-400 mb-1">품의 금액 (원)</label>
                <input 
                  type="number"
                  value={editAmount}
                  onChange={e => setEditAmount(Number(e.target.value))}
                  placeholder="금액을 입력하세요"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none font-bold text-[11px] bg-slate-50 focus:ring-2 focus:ring-rose-500 text-slate-800"
                />
              </div>

              {/* 계정과목 */}
              <div>
                <label className="block text-[9px] font-extrabold text-slate-440 mb-1">계정과목 소분류 지정</label>
                <select 
                  value={editCategory}
                  onChange={e => setEditCategory(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none font-bold text-[11px] bg-slate-50 focus:ring-2 focus:ring-rose-500 text-slate-800"
                >
                  <option value="">계정과목 선택</option>
                  {dbCategories?.map(c => (
                    <option key={c.id} value={c.sub_category}>
                      [{c.main_category}] {c.sub_category}
                    </option>
                  ))}
                </select>
              </div>

              {/* 실제 지출일, 공제액, 송금수수료 즉석 수정란 */}
              {(() => {
                const isApproved = selectedExpense.approval_status === 'APPROVED';
                const isTransferOrCash = ['계좌송금', '계좌이체', '현금'].includes(editPaymentMethod);
                const isEditable = isApproved && isTransferOrCash;

                return (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/70 space-y-3">
                    <span className="block font-black text-slate-700 text-[9.5px]">💰 실제 지출 집행 상세 기입</span>
                    <div>
                      <label className={`block text-[8px] font-bold mb-0.5 ${!isEditable ? 'text-slate-400' : 'text-slate-400'}`}>실제 지출일</label>
                      <input 
                        type="date"
                        disabled={!isEditable}
                        value={editActualExpenseDate}
                        onChange={e => setEditActualExpenseDate(e.target.value)}
                        className={`w-full border border-slate-200 rounded-xl px-2.5 py-1.5 outline-none font-bold text-[10.5px] transition-all ${
                          !isEditable 
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-150' 
                            : 'bg-white focus:ring-2 focus:ring-rose-500 text-slate-800'
                        }`}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={`block text-[8px] font-bold mb-0.5 ${!isEditable ? 'text-slate-400' : 'text-slate-400'}`}>공제액 (₩)</label>
                        <input 
                          type="number"
                          disabled={!isEditable}
                          value={editDeductionAmount || ""}
                          onChange={e => setEditDeductionAmount(Number(e.target.value) || 0)}
                          placeholder="공제액"
                          className={`w-full border border-slate-200 rounded-xl px-2.5 py-1.5 outline-none font-bold text-[10.5px] transition-all ${
                            !isEditable 
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-150' 
                              : 'bg-white focus:ring-2 focus:ring-rose-500 text-slate-800'
                          }`}
                        />
                      </div>
                      <div>
                        <label className={`block text-[8px] font-bold mb-0.5 ${!isEditable ? 'text-slate-400' : 'text-slate-400'}`}>송금수수료 (₩)</label>
                        <input 
                          type="number"
                          disabled={!isEditable}
                          value={editTransferFee || ""}
                          onChange={e => setEditTransferFee(Number(e.target.value) || 0)}
                          placeholder="송금수수료"
                          className={`w-full border border-slate-200 rounded-xl px-2.5 py-1.5 outline-none font-bold text-[10.5px] transition-all ${
                            !isEditable 
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-150' 
                              : 'bg-white focus:ring-2 focus:ring-rose-500 text-slate-800'
                          }`}
                        />
                      </div>
                    </div>

                    {/* 비활성화 시 모바일 룰 설명 추가 */}
                    {!isEditable && (
                      <div className="p-2 bg-amber-50 border border-amber-100 rounded-xl text-[8px] font-bold text-amber-700 leading-normal">
                        ⚠️ 안내: 실제 지출일/공제액/수수료는 결제승인이 완료되고 결제수단이 '계좌송금' 또는 '현금'인 지출 건만 사후 수정 기입할 수 있습니다.
                      </div>
                    )}

                    {/* 실시간 최종 실지출액 프리뷰 */}
                    <div className="p-2 bg-slate-900 text-white rounded-lg flex items-center justify-between text-[9px] font-black border border-slate-800">
                      <span className="text-rose-300">💸 예상 실지급액:</span>
                      <span className="font-mono">
                        {((Number(editAmount) || 0) - (Number(editDeductionAmount) || 0) + (Number(editTransferFee) || 0)).toLocaleString()}원
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* 품의일자 및 결제 수단 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-extrabold text-slate-400 mb-1">품의일자</label>
                  <input 
                    type="date"
                    value={editExpenseDate}
                    onChange={e => setEditExpenseDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none font-bold text-[11px] bg-slate-50 focus:ring-2 focus:ring-rose-500 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-extrabold text-slate-400 mb-1">결제 수단</label>
                  <select
                    value={editPaymentMethod}
                    onChange={e => setEditPaymentMethod(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none font-bold text-[11px] bg-slate-50 focus:ring-2 focus:ring-rose-500 text-slate-800"
                  >
                    <option value="">결제 수단 선택</option>
                    <option value="법인카드">법인카드</option>
                    <option value="개인카드">개인카드</option>
                    <option value="현금">현금</option>
                    <option value="계좌이체">계좌이체</option>
                  </select>
                </div>
              </div>

              {/* 메모/태그 */}
              <div>
                <label className="block text-[9px] font-extrabold text-slate-400 mb-1">지출 태그 목록 (쉼표 구분)</label>
                <input 
                  type="text"
                  value={editMemo}
                  onChange={e => setEditMemo(e.target.value)}
                  placeholder="예: 비품, 소모품, 상반기"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none font-bold text-[11px] bg-slate-50 focus:ring-2 focus:ring-rose-500 text-slate-800"
                />

                {/* 프리셋 태그 추천 칩 목록 (모바일 전용 원클릭 토글 칩) */}
                {dbTags && dbTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5 max-h-24 overflow-y-auto p-0.5">
                    {dbTags.map(tag => {
                      const isSelected = (editMemo || "")
                        .split(",")
                        .map(t => t.trim())
                        .includes(tag.name);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => toggleEditTag(tag.name)}
                          className={`px-2 py-0.5 rounded-full text-[8.5px] font-extrabold border transition-all cursor-pointer ${
                            isSelected 
                              ? "bg-rose-500 border-rose-500 text-white shadow-3xs" 
                              : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                          }`}
                        >
                          #{tag.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 저장 / 취소 버튼 */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleUpdateDirect}
                  disabled={isSubmitting}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-[10px] shadow-sm border-none cursor-pointer active:scale-95 transition-all"
                >
                  💾 즉시 수정 완료
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-black text-[10px] border-none cursor-pointer"
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            /* 🔍 일반 뷰 모드 */
            <div className="space-y-4">
              {/* 1. 기안 제목/적요 */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="block text-[8px] text-slate-400 font-extrabold mb-1">지출 적요 (품명)</span>
                <h2 className="text-sm font-black text-slate-800 leading-snug whitespace-pre-line">
                  {selectedExpense.title}
                </h2>
              </div>

              {/* 2. 결제 수단 및 금액 정보 */}
              <div className="bg-gradient-to-r from-rose-500 to-rose-600 text-white p-3.5 rounded-xl shadow-xs flex justify-between items-center">
                <div>
                  <span className="block text-[8.5px] text-rose-100 font-extrabold">결제 수단</span>
                  <span className="text-[10px] font-black">{selectedExpense.payment_method}</span>
                </div>
                <div className="text-right">
                  <span className="block text-[8.5px] text-rose-100 font-extrabold">최종 품의액</span>
                  <span className="text-base font-black font-mono">{selectedExpense.amount.toLocaleString()}원</span>
                </div>
              </div>

              {/* 2-2. 최종 실지출액 요약 (모바일 상세 뷰) */}
              <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-xs flex justify-between items-center border border-slate-800">
                <div className="space-y-1">
                  <span className="block text-[8.5px] text-rose-300 font-extrabold leading-none">💸 최종 지급액</span>
                  <div className="text-[9.5px] font-bold text-slate-400">
                    (공제: -{(selectedExpense.deduction_amount || 0).toLocaleString()}원 / 수수료: +{(selectedExpense.transfer_fee || 0).toLocaleString()}원)
                  </div>
                </div>
                <div className="text-right">
                  <span className="block text-[8.5px] text-slate-400 font-extrabold">실제 지출일</span>
                  <span className="text-[10px] font-black font-mono">
                    {selectedExpense.actual_expense_date || "미집행"}
                  </span>
                  <span className="block text-sm font-black font-mono text-rose-400 mt-0.5">
                    {((Number(selectedExpense.amount) || 0) - (Number(selectedExpense.deduction_amount) || 0) + (Number(selectedExpense.transfer_fee) || 0)).toLocaleString()}원
                  </span>
                </div>
              </div>

              {/* 3. 계정과목 상세 계층 구조 */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 grid grid-cols-2 gap-2">
                <div>
                  <span className="block text-[8px] text-slate-400 font-extrabold mb-0.5">계정과목 대분류</span>
                  <span className={`inline-flex px-1.5 py-0.5 rounded-md text-[8.5px] font-black ${
                    catDetails.main === "판매비와관리비" ? "bg-blue-50 border border-blue-100 text-blue-700" :
                    catDetails.main === "제조/물류원가" ? "bg-amber-50 border border-amber-100 text-amber-700" :
                    catDetails.main === "영업외비용" ? "bg-purple-50 border border-purple-100 text-purple-700" :
                    "bg-slate-100 border border-slate-200 text-slate-700"
                  }`}>
                    {catDetails.main}
                  </span>
                </div>
                <div>
                  <span className="block text-[8px] text-slate-400 font-extrabold mb-0.5">중분류 〉 소분류</span>
                  <span className="font-black text-slate-800 text-[10px] block mt-0.5">
                    {catDetails.mid} 〉 <span className="underline decoration-indigo-300 font-extrabold">{catDetails.sub}</span>
                  </span>
                </div>
              </div>

              {/* 4. 품의일자 및 부서/담당자/프로젝트 병합 그리드 */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 grid grid-cols-2 gap-2">
                <div>
                  <span className="block text-[8px] text-slate-400 font-extrabold mb-0.5">품의일자 (기안일)</span>
                  <span className="font-extrabold text-slate-800 text-[10px] font-mono block mt-1">{selectedExpense.expense_date}</span>
                </div>
                <div>
                  <span className="block text-[8px] text-slate-400 font-extrabold mb-0.5">부서/담당자/프로젝트</span>
                  {hasTags ? (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {taggedInfo.department !== "-" && (
                        <span className="inline-flex px-1.5 py-0.5 rounded bg-blue-50 border border-blue-100 text-blue-700 text-[8px] font-bold">
                          🏢 {taggedInfo.department}
                        </span>
                      )}
                      {taggedInfo.staff !== "-" && (
                        <span className="inline-flex px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-100 text-emerald-700 text-[8px] font-bold">
                          👤 {taggedInfo.staff}
                        </span>
                      )}
                      {taggedInfo.project !== "-" && (
                        <span className="inline-flex px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-100 text-indigo-700 text-[8px] font-bold">
                          🚀 {taggedInfo.project}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="font-bold text-slate-400 text-[10px] block mt-1">-</span>
                  )}
                </div>
              </div>

              {/* 6. AI 분석 혹은 일반 가맹점/거래처명 */}
              {aiPayee && (
                <div className="bg-rose-50/40 p-2.5 rounded-xl border border-rose-100/70">
                  <span className="block text-[8px] text-rose-500 font-extrabold mb-0.5">🏢 영수인 / 가맹점 / 거래처</span>
                  <span className="font-black text-rose-700 text-[10px]">{aiPayee}</span>
                </div>
              )}

              {/* 7. 지출 태그들 */}
              {selectedExpense.memo && (
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="block text-[8px] text-slate-400 font-extrabold mb-0.5">🏷️ 지출 태그 목록</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedExpense.memo.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                      <span key={tag} className="inline-flex px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-500 text-[8.5px] font-extrabold">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 8. 첨부 영수증 실물 - 상시 노출 영역 */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-2">
                <span className="block text-[8px] text-slate-400 font-extrabold mb-0.5">📄 첨부 영수증 실물</span>
                
                {selectedExpense.attachment_url ? (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setShowAttachment(!showAttachment)}
                      className={`w-full py-1.5 rounded-lg text-[9px] font-black flex items-center justify-center gap-1.5 transition-all shadow-3xs cursor-pointer ${
                        showAttachment 
                          ? 'bg-slate-800 hover:bg-slate-900 text-white' 
                          : 'bg-white hover:bg-slate-100 border border-slate-200 text-slate-700'
                      }`}
                    >
                      {showAttachment ? '🙈 영수증 실물 접기' : '📄 영수증 실물 원본 보기'}
                    </button>

                    {/* 아코디언 활성화 시 인라인 뷰어 기동 */}
                    {showAttachment && (
                      <div className="w-full mt-1.5 p-1 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-inner space-y-1.5 animate-scale-up">
                        {isPdf ? (
                          <iframe 
                            src={selectedExpense.attachment_url} 
                            className="w-full h-80 rounded-lg border-none"
                            title="PDF 영수증 미리보기"
                          />
                        ) : (
                          <img 
                            src={selectedExpense.attachment_url} 
                            alt="영수증 실물" 
                            className="w-full max-h-80 object-contain rounded-lg border bg-slate-50"
                          />
                        )}
                        <div className="p-1 text-center border-t border-slate-100">
                          <a 
                            href={selectedExpense.attachment_url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="inline-flex items-center text-blue-600 font-extrabold hover:underline gap-0.5 text-[8.5px]"
                          >
                            🔍 원본 파일 새 창에서 크게 보기
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-2.5 px-3 bg-slate-100/70 border border-slate-200/50 rounded-lg text-[9.5px] text-slate-400 font-bold text-center flex items-center justify-center gap-1">
                    ⚠️ 첨부된 영수증 실물 파일이 없는 지출 건입니다.
                  </div>
                )}
              </div>

              {/* 9. 대표자 전용 즉석 수정 및 삭제 트리거 버튼 바 */}
              <div className="bg-slate-100/50 p-2.5 rounded-xl border border-slate-200/50 flex gap-2 justify-end">
                <button
                  id="edit-trigger-btn"
                  onClick={() => setIsEditing(true)}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[9px] font-black flex items-center gap-1 shadow-3xs transition-all active:scale-95 cursor-pointer"
                >
                  ✏️ 지출 수정
                </button>
                <button
                  id="delete-trigger-btn"
                  onClick={() => handleDeleteDirect(selectedExpense.id)}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-lg text-[9px] font-black flex items-center gap-1 shadow-3xs transition-all active:scale-95 cursor-pointer"
                >
                  🗑️ 지출 삭제
                </button>
              </div>

              {/* 결재 상태 피드백 히스토리 */}
              {selectedExpense.approval_status && selectedExpense.approval_status !== 'PENDING' && (
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="block text-[8px] text-slate-400 font-extrabold mb-0.5">상태 히스토리</span>
                  <span className="font-extrabold text-slate-800 text-[10px]">
                    현재 {selectedExpense.approval_status === 'APPROVED' ? '🟢 승인 완료' : selectedExpense.approval_status === 'REJECTED' ? '🔴 반려됨' : '🟡 보류중'} 상태입니다.
                  </span>
                  {selectedExpense.approval_memo && (
                    <p className="text-[9px] text-slate-450 mt-1 pl-1 border-l border-slate-200">💬 사유: {selectedExpense.approval_memo}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 모달 하단 - 대표자 의사 결정 액션 바 */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2 shrink-0">
          {/* 대기 상태일 때만 의사결정 단추 활성화 */}
          {(selectedExpense.approval_status || 'PENDING') === 'PENDING' ? (
            <>
              <button 
                id="approve-btn"
                onClick={(e) => handleDirectApprove(selectedExpense.id, e)}
                disabled={isSubmitting}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-[10px] shadow-sm flex items-center justify-center gap-1 border-none cursor-pointer active:scale-95 transition-all"
              >
                <Check className="w-3 h-3" />
                승인
              </button>
              <button 
                id="reject-btn"
                onClick={() => setOpinionModalType('REJECTED')}
                disabled={isSubmitting}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-[10px] shadow-sm flex items-center justify-center gap-1 border-none cursor-pointer active:scale-95 transition-all"
              >
                <X className="w-3 h-3" />
                반려
              </button>
              <button 
                id="hold-btn"
                onClick={() => setOpinionModalType('HOLD')}
                disabled={isSubmitting}
                className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black text-[10px] shadow-sm flex items-center justify-center gap-1 border-none cursor-pointer active:scale-95 transition-all"
              >
                <AlertCircle className="w-3 h-3" />
                보류
              </button>
            </>
          ) : (
            <button 
              id="modal-close-btn"
              onClick={onClose}
              className="w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-black text-[10px] border-none cursor-pointer active:scale-95 transition-all text-center"
            >
              닫기
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
