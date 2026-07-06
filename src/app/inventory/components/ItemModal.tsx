import React from 'react';
import { X, Sparkles } from 'lucide-react';
import { InventoryItem, ItemFormState } from '../types';
import { getTagColorClass } from './InventoryTable';

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItem: InventoryItem | null;
  itemForm: ItemFormState;
  setItemForm: React.Dispatch<React.SetStateAction<ItemFormState>>;
  onSubmit: (e: React.FormEvent) => void;
  globalTags: string[];
  selectedTags: string[];
  setSelectedTags: React.Dispatch<React.SetStateAction<string[]>>;
  newTagInput: string;
  setNewTagInput: (val: string) => void;
  onAddGlobalTag: (tag: string) => void;
  onRemoveGlobalTag: (tag: string) => void;
}

export const ItemModal: React.FC<ItemModalProps> = ({
  isOpen,
  onClose,
  selectedItem,
  itemForm,
  setItemForm,
  onSubmit,
  globalTags,
  selectedTags,
  setSelectedTags,
  newTagInput,
  setNewTagInput,
  onAddGlobalTag,
  onRemoveGlobalTag
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
      <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* 모달 헤더 */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white px-6 py-5 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <span>{selectedItem ? '품목 수정' : '신규 품목 추가'}</span>
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">
              AI 비전 명세서 추출 후 값이 자동으로 매핑되어 채워질 수 있습니다.
            </p>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 모달 폼 바디 */}
        <form onSubmit={onSubmit}>
          <div className="p-6 space-y-4 max-h-[500px] overflow-y-auto">
            
            {/* 자재 vs 제품 타입 */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">품목 종류</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={!!selectedItem}
                  onClick={() => setItemForm(prev => ({ ...prev, type: 'material' }))}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                    itemForm.type === 'material'
                      ? 'border-blue-500 bg-blue-50 text-blue-950'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-500'
                  }`}
                >
                  자재 (공급 단가 & 거래처 관리)
                </button>
                <button
                  type="button"
                  disabled={!!selectedItem}
                  onClick={() => setItemForm(prev => ({ ...prev, type: 'product' }))}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                    itemForm.type === 'product'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-950'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-500'
                  }`}
                >
                  제품 (매출 단가 관리)
                </button>
              </div>
            </div>

            {/* 1. 카테고리 & 품목명 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">카테고리</label>
                <input
                  type="text"
                  required
                  value={itemForm.category}
                  onChange={(e) => setItemForm(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="예: 전동부품"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">품목명</label>
                <input
                  type="text"
                  required
                  value={itemForm.name}
                  onChange={(e) => setItemForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="예: 초경량 모터"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
            </div>

            {/* 2. 규격 & 단위 구분 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">규격 (세부 스펙)</label>
                <input
                  type="text"
                  value={itemForm.spec || ''}
                  onChange={(e) => setItemForm(prev => ({ ...prev, spec: e.target.value }))}
                  placeholder="예: 15mm x 150mm, 250g, 13온스"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">입출고 단위 구분</label>
                <select
                  value={itemForm.unitType || 'count'}
                  onChange={(e) => {
                    const val = e.target.value;
                    setItemForm(prev => {
                      const newForm = { ...prev, unitType: val };
                      if (val === 'count') {
                        newForm.unitValue = '개';
                        newForm.boxContains = '';
                      } else if (val === 'weight') {
                        newForm.unitValue = 'g';
                        newForm.boxContains = '';
                      } else if (val === 'box') {
                        newForm.unitValue = '박스';
                        newForm.boxContains = '10';
                      }
                      return newForm;
                    });
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white font-semibold cursor-pointer"
                >
                  <option value="count">개수 (개)</option>
                  <option value="weight">중량/부피 (g, kg, L 등)</option>
                  <option value="box">박스 (BOX)</option>
                </select>
              </div>
            </div>

            {/* 단위별 상세 입력 폼 */}
            {itemForm.unitType === 'weight' && (
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl">
                <div>
                  <label className="text-[10px] font-bold text-indigo-600 block mb-1">중량/부피 세부 단위</label>
                  <select
                    value={itemForm.unitValue || 'g'}
                    onChange={(e) => setItemForm(prev => ({ ...prev, unitValue: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-250 text-xs focus:ring-1 focus:ring-indigo-500 outline-none bg-white font-medium cursor-pointer"
                  >
                    <option value="g">g (그램)</option>
                    <option value="kg">kg (킬로그램)</option>
                    <option value="ton">ton (톤)</option>
                    <option value="ml">ml (밀리리터)</option>
                    <option value="L">L (리터)</option>
                    <option value="kL">kL (킬로리터)</option>
                    <option value="m3">m³ (세제곱미터)</option>
                    <option value="km3">km³ (세제곱킬로미터)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-indigo-600 block mb-1">단위 수량 (소수점 지원)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="n.00"
                    className="w-full px-3 py-2 rounded-lg border border-slate-250 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                  <span className="text-[9px] text-slate-400 mt-1 block">소수점 둘째 자리까지 지원</span>
                </div>
              </div>
            )}

            {itemForm.unitType === 'box' && (
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-indigo-100 animate-in fade-in slide-in-from-top-1 duration-150">
                <div>
                  <label className="text-[10px] font-bold text-indigo-600 block mb-1">박스당 입수량 (추가 단위 표시)</label>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      required
                      value={itemForm.boxContains || ''}
                      onChange={(e) => setItemForm(prev => ({ ...prev, boxContains: e.target.value }))}
                      placeholder="10"
                      className="w-full px-3 py-2 rounded-lg border border-slate-250 pr-12 text-xs focus:ring-1 focus:ring-indigo-500 outline-none font-bold"
                    />
                    <span className="absolute right-3 text-[10px] text-indigo-500 font-bold bg-indigo-50 px-1.5 py-0.5 rounded">n개입</span>
                  </div>
                </div>
                <div className="flex flex-col justify-center">
                  <span className="text-xs text-slate-655 font-semibold block">최종 규격화 단위명:</span>
                  <span className="text-xs font-bold text-indigo-655 mt-0.5 bg-indigo-50/50 border border-indigo-100 rounded-lg px-2 py-1 inline-block w-fit">
                    1박스 ({itemForm.boxContains || '10'}개입)
                  </span>
                </div>
              </div>
            )}

            {/* 3. 공급 단가 & 거래처 */}
            <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  {itemForm.type === 'material' ? '공급 단가 (매입가)' : '매출 단가 (판매가)'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400">₩</span>
                  <input
                    type="number"
                    required
                    value={itemForm.price}
                    onChange={(e) => setItemForm(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="0"
                    className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none animate-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  {itemForm.type === 'material' ? '주 매입 거래처' : '주요 거래처'}
                </label>
                <input
                  type="text"
                  value={itemForm.partner || ''}
                  onChange={(e) => setItemForm(prev => ({ ...prev, partner: e.target.value }))}
                  placeholder={itemForm.type === 'material' ? '예: 한성정밀' : '예: 주요 거래처'}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
            </div>

            {/* 4. 창고 적재 위치 & 안전 재고량 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">창고 적재 위치</label>
                <input
                  type="text"
                  value={itemForm.location || ''}
                  onChange={(e) => setItemForm(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="예: A홀 3번 선반"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">안전(적정) 재고량</label>
                <input
                  type="number"
                  required
                  value={itemForm.safeStock}
                  onChange={(e) => setItemForm(prev => ({ ...prev, safeStock: e.target.value }))}
                  placeholder="10"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
            </div>

            {/* 5. 최초 기초 재고 & 바코드 번호 */}
            <div className="grid grid-cols-2 gap-3">
              {!selectedItem ? (
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">최초 기초 재고</label>
                  <input
                    type="number"
                    required
                    value={itemForm.stock}
                    onChange={(e) => setItemForm(prev => ({ ...prev, stock: e.target.value }))}
                    placeholder="0"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>
              ) : (
                <div className="flex flex-col justify-center">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">현재 품목 정보 수정 중</span>
                  <span className="text-[10px] text-indigo-650 font-semibold bg-indigo-50 px-2 py-1 rounded w-fit mt-1">
                    기존 재고: {itemForm.stock} 개
                  </span>
                </div>
              )}
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  바코드 식별 번호 (EAN/QR 등)
                </label>
                <input
                  type="text"
                  name="barcode_capture"
                  value={itemForm.barcode || ''}
                  onChange={(e) => setItemForm(prev => ({ ...prev, barcode: e.target.value }))}
                  placeholder="리더기로 쏘거나 직접 기입"
                  className="w-full px-3 py-2.5 rounded-xl border border-indigo-200 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-indigo-50/20 font-bold text-indigo-950 placeholder-indigo-300"
                />
              </div>
            </div>

            {/* 6. 다이내믹 커스텀 멀티 태그 빌더 */}
            <div className="border-t border-slate-100 pt-3">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                품목 관리 태그 (복수 선택 및 커스텀 추가)
              </label>
              
              {/* 적용된 태그 배지 목록 */}
              <div className="flex flex-wrap gap-1.5 mb-2 min-h-[32px] p-2 bg-slate-50/60 border border-slate-150 rounded-xl items-center">
                {selectedTags.length === 0 ? (
                  <span className="text-[10px] text-slate-400 font-medium">아래 태그 풀에서 터치하여 추가하거나 새 태그를 만드세요.</span>
                ) : (
                  selectedTags.map((tag) => (
                    <span 
                      key={tag}
                      className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold px-2.5 py-1 rounded-full shadow-2xs flex items-center gap-1 group transition-all"
                    >
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedTags(prev => prev.filter(t => t !== tag))}
                        className="text-indigo-400 hover:text-indigo-750 font-bold focus:outline-none text-[9px] bg-indigo-100/50 hover:bg-indigo-200/50 px-1 rounded-full cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  ))
                )}
              </div>

              {/* 사용 가능한 글로벌 태그 풀 목록 */}
              <div className="flex flex-wrap gap-1.5 mb-3 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[9px] text-slate-400 font-bold w-full block mb-1">매장 마스터 태그 풀 (터치 시 품목에 즉각 바인딩):</span>
                {globalTags.filter(t => !selectedTags.includes(t)).length === 0 ? (
                  <span className="text-[9px] text-slate-400">모든 태그가 적용되었습니다.</span>
                ) : (
                  globalTags.filter(t => !selectedTags.includes(t)).map((tag) => (
                    <span
                      key={tag}
                      className="relative pl-2.5 pr-6 py-1 rounded-full bg-white border border-slate-200 text-slate-655 text-[10px] font-semibold cursor-pointer hover:border-indigo-400 hover:text-indigo-600 transition-all shadow-3xs flex items-center gap-1.5"
                      onClick={() => setSelectedTags(prev => [...prev, tag])}
                    >
                      <span>{tag}</span>
                      <button
                        type="button"
                        title="대장에서 영구 삭제"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`'${tag}' 태그를 마스터 목록에서 영구히 제거하시겠습니까?`)) {
                            onRemoveGlobalTag(tag);
                          }
                        }}
                        className="absolute right-1.5 text-slate-350 hover:text-red-500 font-black text-[9px] hover:bg-slate-100 rounded p-0.5 cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  ))
                )}
              </div>

              {/* 실시간 커스텀 태그 추가 인풋 */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  placeholder="예: 긴급조달필요, A급자재, 추천"
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newTagInput.trim()) {
                        onAddGlobalTag(newTagInput.trim());
                        setSelectedTags(prev => [...prev, newTagInput.trim()]);
                        setNewTagInput('');
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newTagInput.trim()) {
                      onAddGlobalTag(newTagInput.trim());
                      setSelectedTags(prev => [...prev, newTagInput.trim()]);
                      setNewTagInput('');
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 text-white hover:bg-slate-700 text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  태그 추가
                </button>
              </div>
            </div>

            {/* 비고 및 상세 설명 */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">비고 및 상세 설명</label>
              <textarea
                value={itemForm.description}
                onChange={(e) => setItemForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="품목에 대한 고유 규격이나 품질 체크 포인트 등을 자유롭게 기록하세요."
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
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 flex items-center space-x-1.5 cursor-pointer"
            >
              <span>{selectedItem ? '수정 완료' : '품목 등록'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
