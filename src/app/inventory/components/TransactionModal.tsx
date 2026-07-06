import React, { useState } from 'react';
import { X, ArrowRightLeft } from 'lucide-react';
import { InventoryItem } from '../types';

interface TxFormState {
  itemId: string;
  quantity: string;
  price: string;
  operator: string;
  note: string;
}

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  txType: 'in' | 'out' | 'adjust';
  txForm: TxFormState;
  setTxForm: React.Dispatch<React.SetStateAction<TxFormState>>;
  items: InventoryItem[];
  onSubmit: (e: React.FormEvent) => void;
  highlightFields: Record<string, boolean>;
  commonTags?: { id: string; name: string }[];
  autocompleteData?: {
    partners: string[];
    staff: string[];
    departments: string[];
    projects: string[];
  };
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  txType,
  txForm,
  setTxForm,
  items,
  onSubmit,
  highlightFields,
  commonTags = [],
  autocompleteData = { partners: [], staff: [], departments: [], projects: [] }
}) => {
  const [activeTagTab, setActiveTagTab] = useState<'tags' | 'partners' | 'staff' | 'projects'>('tags');

  const handleTagToggle = (tagName: string) => {
    const noteText = txForm.note || '';
    if (noteText.includes(`#${tagName}`)) {
      setTxForm(prev => ({
        ...prev,
        note: noteText.replace(new RegExp(`\\s*#${tagName}`, 'g'), '').trim()
      }));
    } else {
      setTxForm(prev => ({
        ...prev,
        note: noteText ? `${noteText} #${tagName}` : `#${tagName}`
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* 모달 헤더 */}
        <div className={`text-white px-6 py-5 flex items-center justify-between ${
          txType === 'in' 
            ? 'bg-gradient-to-r from-blue-600 to-indigo-700' 
            : txType === 'out' 
            ? 'bg-gradient-to-r from-rose-600 to-red-700' 
            : 'bg-gradient-to-r from-purple-600 to-indigo-700'
        }`}>
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5" />
              <span>
                {txType === 'in' ? '안전재고 매입 입고' : txType === 'out' ? '출고 등록 (AI 자동완성 연동)' : '재고 실사 수량 보정'}
              </span>
            </h3>
            <p className="text-[10px] text-slate-200 mt-1">
              {txType === 'out' 
                ? 'AI 음성/자연어 명령 파싱 실행 시 폼에 내용이 즉시 채워집니다.' 
                : '정확한 수량을 입력하여 현재고를 안전하게 보존합니다.'}
            </p>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-slate-200 hover:text-white p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 모달 폼 바디 */}
        <form onSubmit={onSubmit}>
          <div className="p-6 space-y-4">
            
            {/* 대상 품목 선택 */}
            <div className={`transition-all duration-350 ${highlightFields.itemId ? 'ring-2 ring-emerald-500 rounded-xl p-1 bg-emerald-50/50 animate-pulse' : ''}`}>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">대상 품목</label>
              <select
                required
                value={txForm.itemId}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  const matchedItem = items.find(it => String(it.id) === selectedId);
                  setTxForm(prev => ({
                    ...prev,
                    itemId: selectedId,
                    price: matchedItem ? String(matchedItem.price) : ''
                  }));
                }}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white font-medium cursor-pointer"
              >
                <option value="">-- 재고 품목을 선택하세요 --</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    [{item.type === 'material' ? '자재' : '제품'}] {item.name} (현재고: {item.stock}개)
                  </option>
                ))}
              </select>
            </div>

            {/* 변동 수량 & 단가 */}
            <div className="grid grid-cols-2 gap-3">
              <div className={`transition-all duration-350 ${highlightFields.quantity ? 'ring-2 ring-emerald-500 rounded-xl p-1 bg-emerald-50/50 animate-pulse' : ''}`}>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  {txType === 'adjust' ? '실사 최종 수량' : '수량'}
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={txForm.quantity}
                  onChange={(e) => setTxForm(prev => ({ ...prev, quantity: e.target.value }))}
                  placeholder="0"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">단가 (₩)</label>
                <input
                  type="number"
                  required
                  value={txForm.price}
                  onChange={(e) => setTxForm(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="0"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
            </div>

            {/* 담당 오퍼레이터 */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">담당 오퍼레이터</label>
              <input
                type="text"
                required
                value={txForm.operator}
                onChange={(e) => setTxForm(prev => ({ ...prev, operator: e.target.value }))}
                placeholder="예: 홍길동 과장"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-slate-50/50"
              />
            </div>

            {/* 메모 및 변동 사유 */}
            <div className={`transition-all duration-350 ${highlightFields.note ? 'ring-2 ring-emerald-500 rounded-xl p-1 bg-emerald-50/50 animate-pulse' : ''}`}>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">변동 사유 / 메모</label>
                <span className="text-[9px] text-slate-400">항목 클릭 시 메모에 자동 추가됨</span>
              </div>
              
              {/* 마스터 데이터 종류별 탭 헤더 */}
              <div className="flex items-center gap-0.5 mb-1.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveTagTab('tags')}
                  className={`flex-1 py-1 rounded text-[9px] font-black transition-all cursor-pointer border-none ${
                    activeTagTab === 'tags' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800 bg-transparent'
                  }`}
                >
                  🏷️ 태그
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTagTab('partners')}
                  className={`flex-1 py-1 rounded text-[9px] font-black transition-all cursor-pointer border-none ${
                    activeTagTab === 'partners' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800 bg-transparent'
                  }`}
                >
                  🏢 거래처
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTagTab('staff')}
                  className={`flex-1 py-1 rounded text-[9px] font-black transition-all cursor-pointer border-none ${
                    activeTagTab === 'staff' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800 bg-transparent'
                  }`}
                >
                  👤 담당자
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTagTab('projects')}
                  className={`flex-1 py-1 rounded text-[9px] font-black transition-all cursor-pointer border-none ${
                    activeTagTab === 'projects' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800 bg-transparent'
                  }`}
                >
                  🚀 프로젝트
                </button>
              </div>

              {/* 활성화된 탭 기준 칩 버튼 리스트 */}
              <div className="flex flex-wrap gap-1 mb-2.5 bg-slate-50 p-2 rounded-xl border border-slate-100 max-h-[75px] overflow-y-auto">
                {activeTagTab === 'tags' && (
                  commonTags.length === 0 ? (
                    <span className="text-[8.5px] text-slate-400 py-1 pl-1">등록된 공통 태그가 없습니다.</span>
                  ) : (
                    commonTags.map(tag => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => handleTagToggle(tag.name)}
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold transition-all cursor-pointer border ${
                          (txForm.note || '').includes(`#${tag.name}`)
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-3xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        #{tag.name}
                      </button>
                    ))
                  )
                )}

                {activeTagTab === 'partners' && (
                  (autocompleteData?.partners || []).length === 0 ? (
                    <span className="text-[8.5px] text-slate-400 py-1 pl-1">등록된 거래처가 없습니다.</span>
                  ) : (
                    (autocompleteData?.partners || []).map((partner, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleTagToggle(partner)}
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold transition-all cursor-pointer border ${
                          (txForm.note || '').includes(`#${partner}`)
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-3xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        #{partner}
                      </button>
                    ))
                  )
                )}

                {activeTagTab === 'staff' && (
                  (autocompleteData?.staff || []).length === 0 ? (
                    <span className="text-[8.5px] text-slate-400 py-1 pl-1">등록된 직원이 없습니다.</span>
                  ) : (
                    (autocompleteData?.staff || []).map((staffMember, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleTagToggle(staffMember)}
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold transition-all cursor-pointer border ${
                          (txForm.note || '').includes(`#${staffMember}`)
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-3xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        #{staffMember}
                      </button>
                    ))
                  )
                )}

                {activeTagTab === 'projects' && (
                  (autocompleteData?.projects || []).length === 0 ? (
                    <span className="text-[8.5px] text-slate-400 py-1 pl-1">등록된 프로젝트가 없습니다.</span>
                  ) : (
                    (autocompleteData?.projects || []).map((project, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleTagToggle(project)}
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold transition-all cursor-pointer border ${
                          (txForm.note || '').includes(`#${project}`)
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-3xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        #{project}
                      </button>
                    ))
                  )
                )}
              </div>

              <textarea
                value={txForm.note}
                onChange={(e) => setTxForm(prev => ({ ...prev, note: e.target.value }))}
                placeholder={
                  txType === 'in' 
                    ? '거래처 납품 건, 정기 조달 등 입고 메모' 
                    : txType === 'out' 
                    ? '고객 발송 건, 생산라인 공급 등 출고 메모' 
                    : '정기 창고 전수 조사 실사 조정 사유'
                }
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              ></textarea>
            </div>

          </div>

          {/* 모달 푸터 버튼 */}
          <div className="bg-slate-50 px-6 py-4 flex justify-end space-x-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-500 font-semibold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              className={`px-5 py-2.5 rounded-xl text-white font-bold text-xs shadow-md flex items-center space-x-1.5 cursor-pointer ${
                txType === 'in' 
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-100' 
                  : txType === 'out' 
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-100' 
                  : 'bg-purple-600 hover:bg-purple-700 shadow-purple-100'
              }`}
            >
              <span>
                {txType === 'in' ? '입고 승인' : txType === 'out' ? '출고 승인' : '보정 완료'}
              </span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
