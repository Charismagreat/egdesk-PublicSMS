"use client";

import React, { useRef, useState, useMemo, useEffect } from "react";
import { Upload, RefreshCw, FileText, Sparkles, Bot } from "lucide-react";
import { convertToKoreanNumber } from "../utils";
import { DbExpenseCategory, DbExpenseTag } from "../types";

export interface ReceiptScanCardProps {
  isAnalyzingReceipt: boolean;
  isSubmittingExpense: boolean;
  newExpense: any;
  setNewExpense: React.Dispatch<React.SetStateAction<any>>;
  handleFileUpload: (file: File) => void;
  handleRegisterExpense: () => Promise<void>;
  resetExpenseForm: () => void;
  dbCategories: DbExpenseCategory[];
  dbTags: DbExpenseTag[];
  autocompleteData: {
    partners: string[];
    staff: string[];
    departments: string[];
    projects: string[];
  };
}

export default function ReceiptScanCard({
  isAnalyzingReceipt,
  isSubmittingExpense,
  newExpense,
  setNewExpense,
  handleFileUpload,
  handleRegisterExpense,
  resetExpenseForm,
  dbCategories,
  dbTags,
  autocompleteData,
}: ReceiptScanCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 1. 실시간 DB 데이터 기반으로 3단 계정과목구조 동적 useMemo 빌딩
  const ACCOUNT_CATEGORIES = useMemo(() => {
    const structure: Record<string, Record<string, string[]>> = {};
    if (!dbCategories || dbCategories.length === 0) {
      return {
        "판매비와관리비": {
          "복리후생비": ["직원야근식대"]
        }
      };
    }
    dbCategories.forEach(cat => {
      const main = cat.main_category;
      const mid = cat.mid_category;
      const sub = cat.sub_category;
      if (!structure[main]) {
        structure[main] = {};
      }
      if (!structure[main][mid]) {
        structure[main][mid] = [];
      }
      if (!structure[main][mid].includes(sub)) {
        structure[main][mid].push(sub);
      }
    });
    return structure;
  }, [dbCategories]);

  // 2. 실시간 DB 데이터 기반으로 지출 태그 명칭 배열 동적 useMemo 빌딩
  const PRESET_TAGS = useMemo(() => {
    if (!dbTags || dbTags.length === 0) {
      return ["SCM팀", "정기지출", "긴급비용"];
    }
    return dbTags.map(t => t.name);
  }, [dbTags]);

  const PAYMENT_METHODS = ["법인카드", "개인신용카드", "계좌송금", "현금", "기타"];

  // 3단계 계정과목 동적 연동을 위한 상태 선언
  const [selectedMainCat, setSelectedMainCat] = useState<string>("판매비와관리비");
  const [selectedMidCat, setSelectedMidCat] = useState<string>("복리후생비");

  // 🏷️ 적요란 '@' 지능형 자동완성 제어용 상태
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchWord, setSearchWord] = useState("");
  const [atIndex, setAtIndex] = useState(-1);
  const [activeSuggestIndex, setActiveSuggestIndex] = useState(0);

  // 🏷️ 적요란 '@' 태그 개별 신속 교체(Quick-Switch)용 상태
  const [activeSwitchTag, setActiveSwitchTag] = useState<{
    label: string;
    start: number;
    end: number;
    type: 'partner' | 'staff' | 'department' | 'project';
  } | null>(null);
  const [showSwitchOptions, setShowSwitchOptions] = useState(false);

  // 전체 자동완성 후보군 취합
  const allSuggestItems = useMemo(() => {
    if (!autocompleteData) return [];
    const items: Array<{ label: string; value: string; type: 'partner' | 'staff' | 'department' | 'project' }> = [];
    
    if (autocompleteData.staff) {
      autocompleteData.staff.forEach(name => {
        items.push({ label: name, value: name, type: 'staff' });
      });
    }
    if (autocompleteData.departments) {
      autocompleteData.departments.forEach(name => {
        items.push({ label: name, value: name, type: 'department' });
      });
    }
    if (autocompleteData.partners) {
      autocompleteData.partners.forEach(name => {
        items.push({ label: name, value: name, type: 'partner' });
      });
    }
    if (autocompleteData.projects) {
      autocompleteData.projects.forEach(name => {
        items.push({ label: name, value: name, type: 'project' });
      });
    }
    return items;
  }, [autocompleteData]);

  // 필터링된 추천 항목 목록 연산
  const filteredSuggestions = useMemo(() => {
    if (!showSuggestions) return [];
    const cleanWord = searchWord.toLowerCase().trim();
    if (!cleanWord) {
      const staffGroup = allSuggestItems.filter(i => i.type === 'staff').slice(0, 3);
      const deptGroup = allSuggestItems.filter(i => i.type === 'department').slice(0, 3);
      const partnerGroup = allSuggestItems.filter(i => i.type === 'partner').slice(0, 3);
      const projGroup = allSuggestItems.filter(i => i.type === 'project').slice(0, 3);
      return [...staffGroup, ...deptGroup, ...partnerGroup, ...projGroup];
    }
    return allSuggestItems.filter(item => 
      item.label.toLowerCase().includes(cleanWord)
    );
  }, [allSuggestItems, showSuggestions, searchWord]);

  // newExpense.category (소분류) 변경 시 대분류/중분류 역동기화 추적
  useEffect(() => {
    if (!newExpense.category) return;
    
    let found = false;
    for (const mainCat of Object.keys(ACCOUNT_CATEGORIES)) {
      for (const midCat of Object.keys(ACCOUNT_CATEGORIES[mainCat])) {
        if (ACCOUNT_CATEGORIES[mainCat][midCat].includes(newExpense.category)) {
          setSelectedMainCat(mainCat);
          setSelectedMidCat(midCat);
          found = true;
          break;
        }
      }
      if (found) break;
    }
  }, [newExpense.category, ACCOUNT_CATEGORIES]);

  // DB 카테고리 로드 완료 후, 초깃값 세팅이 하드코딩값과 불일치할 수 있으므로 강제 보정
  useEffect(() => {
    if (dbCategories.length > 0) {
      const mainCats = Object.keys(ACCOUNT_CATEGORIES);
      if (mainCats.length > 0) {
        const firstMain = mainCats[0];
        const midCats = Object.keys(ACCOUNT_CATEGORIES[firstMain] || {});
        if (midCats.length > 0) {
          const firstMid = midCats[0];
          const subCats = ACCOUNT_CATEGORIES[firstMain][firstMid] || [];
          if (subCats.length > 0 && !subCats.includes(newExpense.category)) {
            setNewExpense(prev => ({ ...prev, category: subCats[0] }));
            setSelectedMainCat(firstMain);
            setSelectedMidCat(firstMid);
          }
        }
      }
    }
  }, [dbCategories]);

  const handleMainCatChange = (mainCat: string) => {
    setSelectedMainCat(mainCat);
    const midCats = Object.keys(ACCOUNT_CATEGORIES[mainCat] || {});
    if (midCats.length > 0) {
      const firstMid = midCats[0];
      setSelectedMidCat(firstMid);
      const subCats = ACCOUNT_CATEGORIES[mainCat][firstMid] || [];
      if (subCats.length > 0) {
        setNewExpense(prev => ({ ...prev, category: subCats[0] }));
      }
    }
  };

  const handleMidCatChange = (midCat: string) => {
    setSelectedMidCat(midCat);
    const subCats = ACCOUNT_CATEGORIES[selectedMainCat][midCat];
    if (subCats.length > 0) {
      setNewExpense(prev => ({ ...prev, category: subCats[0] }));
    }
  };

  // 비고 란 쉼표 구분 태그 토글 헬퍼 함수
  const toggleTag = (tag: string) => {
    const currentMemo = newExpense.memo || "";
    let tags = currentMemo
      .split(",")
      .map(t => t.trim())
      .filter(t => t !== "");

    if (tags.includes(tag)) {
      tags = tags.filter(t => t !== tag);
    } else {
      tags.push(tag);
    }
    
    setNewExpense(prev => ({
      ...prev,
      memo: tags.join(", ")
    }));
  };

  // 🏷️ 적요 하이라이트 렌더러 함수
  const renderHighlightedText = (text: string) => {
    if (!text) {
      return (
        <span className="text-slate-350 select-none">
          예: 대신정기화물 택배발송비&#10;1) 효성 1공장 1 BOX&#10;2) 동우일렉트릭 1 BOX
        </span>
      );
    }
    
    const regex = /@([^\s@]+)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      const matchIndex = match.index;
      const fullMatch = match[0];
      const name = match[1];
      
      if (matchIndex > lastIndex) {
        parts.push(text.slice(lastIndex, matchIndex));
      }
      
      let type: 'staff' | 'department' | 'partner' | 'project' = 'partner';
      if (autocompleteData?.staff?.includes(name)) {
        type = 'staff';
      } else if (autocompleteData?.departments?.includes(name)) {
        type = 'department';
      } else if (autocompleteData?.projects?.includes(name)) {
        type = 'project';
      } else if (autocompleteData?.partners?.includes(name)) {
        type = 'partner';
      }
      
      const badgeClass = {
        staff: "text-blue-600 underline decoration-2 decoration-blue-300 font-black cursor-pointer bg-blue-50/30 px-1 py-0.5 rounded",
        department: "text-emerald-600 underline decoration-2 decoration-emerald-300 font-black cursor-pointer bg-emerald-50/30 px-1 py-0.5 rounded",
        partner: "text-rose-600 underline decoration-2 decoration-rose-300 font-black cursor-pointer bg-rose-50/30 px-1 py-0.5 rounded",
        project: "text-indigo-600 underline decoration-2 decoration-indigo-300 font-black cursor-pointer bg-indigo-50/30 px-1 py-0.5 rounded"
      }[type];
      
      parts.push(
        <span key={`hl-${matchIndex}`} className={`${badgeClass} pointer-events-auto`}>
          {fullMatch}
        </span>
      );
      
      lastIndex = regex.lastIndex;
    }
    
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }
    
    return parts;
  };

  const handleTextareaClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    const value = e.currentTarget.value;
    const cursorPos = e.currentTarget.selectionStart;
    
    const regex = /@([^\s@]+)/g;
    let match;
    
    while ((match = regex.exec(value)) !== null) {
      const start = match.index;
      const end = regex.lastIndex;
      const name = match[1];
      
      if (cursorPos >= start && cursorPos <= end) {
        let type: 'staff' | 'department' | 'partner' | 'project' = 'partner';
        if (autocompleteData?.staff?.includes(name)) {
          type = 'staff';
        } else if (autocompleteData?.departments?.includes(name)) {
          type = 'department';
        } else if (autocompleteData?.projects?.includes(name)) {
          type = 'project';
        } else if (autocompleteData?.partners?.includes(name)) {
          type = 'partner';
        }
        
        setActiveSwitchTag({
          label: name,
          start,
          end,
          type
        });
        setShowSwitchOptions(true);
        setShowSuggestions(false);
        return;
      }
    }
    
    setShowSwitchOptions(false);
  };

  const executeQuickSwitch = (newLabel: string) => {
    if (!activeSwitchTag) return;
    
    const value = newExpense.title;
    const { start, end } = activeSwitchTag;
    
    const textBefore = value.slice(0, start);
    const textAfter = value.slice(end);
    
    const replacement = `@${newLabel} `;
    const newValue = textBefore + replacement + textAfter;
    
    setNewExpense(prev => ({ ...prev, title: newValue }));
    setShowSwitchOptions(false);
    setActiveSwitchTag(null);
    
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCursorPos = start + replacement.length;
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 10);
  };

  const selectSuggestion = (item: { label: string; value: string; type: string }) => {
    const value = newExpense.title;
    const cursorPos = textareaRef.current?.selectionStart || 0;
    
    const textBefore = value.slice(0, atIndex);
    const textAfter = value.slice(cursorPos);
    
    const replacement = `@${item.label} `;
    const newValue = textBefore + replacement + textAfter;
    
    setNewExpense(prev => ({ ...prev, title: newValue }));
    setShowSuggestions(false);
    
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCursorPos = atIndex + replacement.length;
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 10);
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    setNewExpense(prev => ({ ...prev, title: value }));
    
    const beforeCursor = value.slice(0, cursorPos);
    const lastAtIdx = beforeCursor.lastIndexOf("@");
    
    if (lastAtIdx !== -1) {
      const wordAfterAt = beforeCursor.slice(lastAtIdx + 1);
      const hasSpace = /\s/.test(wordAfterAt);
      
      if (!hasSpace) {
        setShowSuggestions(true);
        setSearchWord(wordAfterAt);
        setAtIndex(lastAtIdx);
        setActiveSuggestIndex(0);
        return;
      }
    }
    
    setShowSuggestions(false);
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showSuggestions || filteredSuggestions.length === 0) return;
    
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSuggestIndex(prev => (prev + 1) % filteredSuggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSuggestIndex(prev => (prev - 1 + filteredSuggestions.length) % filteredSuggestions.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      selectSuggestion(filteredSuggestions[activeSuggestIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setShowSuggestions(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
      <h2 className="text-lg font-black text-slate-800 flex items-center justify-between border-b pb-3 mb-2">
        <div className="flex items-center">
          <Bot className="w-5 h-5 mr-2 text-rose-500 animate-bounce" />
          AI 영수증 자율 스캔 및 검수
        </div>
        <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">PDF / 이미지 지원</span>
      </h2>

      {/* 드롭존 영역 */}
      <div 
        data-easybot-hint="지출 영수증 파일 업로드 영역: 이곳에 지출 증빙용 이미지(PNG, JPG, WEBP)나 PDF 파일을 드래그 앤 드롭하거나 클릭하여 업로드하면, AI가 자동으로 텍스트를 인식(OCR)하여 지출 일자, 공급자명, 금액 등을 파악하고 지출 전표 생성을 도와줍니다."
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center group ${
          isAnalyzingReceipt 
            ? 'border-rose-400 bg-rose-50/20' 
            : 'border-slate-200 hover:border-rose-300 hover:bg-slate-50/50'
        }`}
      >
        <input 
          type="file" 
          ref={fileInputRef}
          className="hidden"
          accept="image/jpeg,image/png,image/jpg,image/webp,application/pdf"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file);
          }}
        />
        
        {isAnalyzingReceipt ? (
          <div className="space-y-3">
            <RefreshCw className="w-10 h-10 text-rose-500 animate-spin mx-auto" />
            <p className="font-extrabold text-xs text-rose-500">Gemini AI가 영수증 글자와 금액을 해독하고 있습니다...</p>
            <p className="text-[10px] text-slate-400 font-semibold">비목(카테고리) 자율 분류 분석 연산 작동 중</p>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="w-10 h-10 text-slate-350 mx-auto group-hover:text-rose-455 transition-colors" />
            <p className="font-extrabold text-xs text-slate-700">여기에 영수증 이미지 또는 전자영수증 PDF를 드래그 앤 드롭하세요</p>
            <p className="text-[10px] text-slate-455 font-semibold">또는 이 영역을 클릭하여 PC 내부 파일을 선택하세요</p>
          </div>
        )}
      </div>

      {/* AI 인식 결과 검수 & 등록 폼 */}
      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-inner space-y-4">
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center justify-between border-b pb-2 mb-2">
          <span className="flex items-center text-rose-500 font-extrabold text-[11px]">
            <FileText className="w-3.5 h-3.5 mr-1" />
            📝 지출결의서 규격 실물 검수 및 자동 기입
          </span>
          <button 
            onClick={resetExpenseForm}
            className="text-[10px] font-bold text-slate-455 hover:text-slate-700 cursor-pointer transition-colors border-none bg-transparent"
          >
            초기화
          </button>
        </h3>

        <div className="grid grid-cols-3 gap-3.5 text-left">
          {/* 적요 */}
          <div className="col-span-3 relative">
            <label className="block text-[10px] font-extrabold text-slate-500 mb-1">적요 (지출 용도 및 상세 내역) *</label>
            
            <div className="relative w-full h-[84px] rounded-xl overflow-hidden border border-slate-250 bg-white focus-within:ring-2 focus-within:ring-rose-500 focus-within:border-transparent transition-all shadow-2xs">
              <div className="absolute inset-0 px-3.5 py-2.5 font-bold text-xs leading-relaxed text-slate-800 pointer-events-none select-none whitespace-pre-wrap break-all overflow-y-auto max-h-[84px] text-left">
                {renderHighlightedText(newExpense.title)}
              </div>

              <textarea 
                ref={textareaRef}
                rows={3}
                placeholder="예: 대신정기화물 택배발송비&#10;1) 효성 1공장 1 BOX&#10;2) 동우일렉트릭 1 BOX"
                value={newExpense.title}
                onChange={handleTextareaChange}
                onKeyDown={handleTextareaKeyDown}
                onClick={handleTextareaClick}
                className="w-full h-full bg-transparent text-transparent caret-rose-500 outline-none border-none font-bold text-xs leading-relaxed px-3.5 py-2.5 resize-none absolute inset-0 z-10 text-left focus:ring-0"
              />
            </div>

            {/* 자동완성 목록 */}
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 mt-1 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-lg max-h-[160px] overflow-y-auto z-50 divide-y divide-slate-100/50 text-left">
                {filteredSuggestions.map((item, index) => {
                  const typeBadge = {
                    staff: { label: "임직원", class: "bg-blue-50 text-blue-600 border-blue-100" },
                    department: { label: "사내부서", class: "bg-emerald-50 text-emerald-600 border-emerald-100" },
                    partner: { label: "거래처", class: "bg-rose-50 text-rose-600 border-rose-100" },
                    project: { label: "프로젝트", class: "bg-indigo-50 text-indigo-600 border-indigo-100" }
                  }[item.type];

                  return (
                    <div
                      key={`${item.type}-${item.value}-${index}`}
                      onClick={() => selectSuggestion(item)}
                      className={`flex items-center justify-between p-2.5 cursor-pointer text-[10.5px] font-extrabold transition-all ${
                        index === activeSuggestIndex 
                          ? 'bg-rose-50/70 text-rose-600' 
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="truncate">{item.label}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-black border uppercase tracking-wide shrink-0 ${typeBadge.class}`}>
                        {typeBadge.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 퀵 스위치 */}
            {showSwitchOptions && activeSwitchTag && (
              <div className="absolute left-0 right-0 mt-1 bg-white/95 backdrop-blur-md border border-rose-100 rounded-2xl shadow-xl p-3 z-50 animate-fade-in space-y-2 text-left">
                <div className="flex items-center justify-between border-b pb-1.5">
                  <span className="text-[10px] font-black text-rose-500 flex items-center">
                    🔄 태그 신속 변경 ({
                      { staff: "임직원", department: "사내부서", partner: "거래처", project: "프로젝트" }[activeSwitchTag.type]
                    })
                  </span>
                  <button
                    onClick={() => setShowSwitchOptions(false)}
                    className="text-[9px] font-bold text-slate-455 hover:text-slate-750 border-none bg-transparent cursor-pointer"
                  >
                    ✕ 닫기
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto py-0.5 pr-1">
                  {autocompleteData[activeSwitchTag.type === 'staff' ? 'staff' : 
                                    activeSwitchTag.type === 'department' ? 'departments' : 
                                    activeSwitchTag.type === 'partner' ? 'partners' : 'projects']
                    ?.filter(val => val !== activeSwitchTag.label)
                    .map((val, idx) => {
                      const badgeStyle = {
                        staff: "bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100",
                        department: "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100",
                        partner: "bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100",
                        project: "bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100"
                      }[activeSwitchTag.type];

                      return (
                        <button
                          type="button"
                          key={`sw-${idx}`}
                          onClick={() => executeQuickSwitch(val)}
                          className={`px-2 py-1 rounded-lg text-[9.5px] font-extrabold border transition-all cursor-pointer shadow-3xs ${badgeStyle}`}
                        >
                          {val}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {/* 계정과목 */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 mb-1">계정 대분류 *</label>
            <select 
              value={selectedMainCat}
              onChange={e => handleMainCatChange(e.target.value)}
              className="w-full border border-slate-250 rounded-xl px-3.5 py-2.5 outline-none font-bold text-xs bg-white focus:ring-2 focus:ring-rose-500 transition-all text-slate-700 cursor-pointer"
            >
              {Object.keys(ACCOUNT_CATEGORIES).map(mainCat => (
                <option key={mainCat} value={mainCat}>{mainCat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 mb-1">계정 중분류 *</label>
            <select 
              value={selectedMidCat}
              onChange={e => handleMidCatChange(e.target.value)}
              className="w-full border border-slate-250 rounded-xl px-3.5 py-2.5 outline-none font-bold text-xs bg-white focus:ring-2 focus:ring-rose-500 transition-all text-slate-700 cursor-pointer"
            >
              {Object.keys(ACCOUNT_CATEGORIES[selectedMainCat] || {}).map(midCat => (
                <option key={midCat} value={midCat}>{midCat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 mb-1">계정 소분류 *</label>
            <select 
              value={newExpense.category}
              onChange={e => setNewExpense(prev => ({ ...prev, category: e.target.value }))}
              className="w-full border border-slate-250 rounded-xl px-3.5 py-2.5 outline-none font-bold text-xs bg-white focus:ring-2 focus:ring-rose-500 transition-all text-slate-700 cursor-pointer"
            >
              {(ACCOUNT_CATEGORIES[selectedMainCat]?.[selectedMidCat] || []).map(subCat => (
                <option key={subCat} value={subCat}>{subCat}</option>
              ))}
            </select>
          </div>

          {/* 결제 수단 */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 mb-1">결제 수단 *</label>
            <select 
              value={newExpense.payment_method}
              onChange={e => {
                const method = e.target.value;
                setNewExpense(prev => ({ 
                  ...prev, 
                  payment_method: method,
                  // 카드가 아닐 때는 승인번호 강제 공백 초기화
                  card_approval_no: method.includes("카드") ? prev.card_approval_no : "" 
                }));
              }}
              className="w-full border border-slate-250 rounded-xl px-3.5 py-2.5 outline-none font-bold text-xs bg-white focus:ring-2 focus:ring-rose-500 transition-all text-slate-700 cursor-pointer"
            >
              {PAYMENT_METHODS.map(method => (
                <option key={method} value={method}>{method}</option>
              ))}
            </select>
          </div>

          {/* 카드 승인번호 (신용카드 결제 시 노출/활성화) */}
          {newExpense.payment_method?.includes("카드") ? (
            <div className="animate-fade-in">
              <label className="block text-[10px] font-extrabold text-rose-500 mb-1">카드 승인번호 (8자리) *</label>
              <input 
                type="text"
                placeholder="승인번호 8자리 입력"
                maxLength={8}
                value={newExpense.card_approval_no || ""}
                onChange={e => setNewExpense(prev => ({ ...prev, card_approval_no: e.target.value.replace(/[^0-9]/g, '') }))}
                className="w-full border border-rose-250 rounded-xl px-3.5 py-2.5 outline-none font-bold text-xs bg-white focus:ring-2 focus:ring-rose-500 transition-all text-slate-805"
              />
            </div>
          ) : (
            <div>
              <label className="block text-[10px] font-extrabold text-slate-350 mb-1">카드 승인번호</label>
              <input 
                type="text"
                disabled={true}
                placeholder="카드 결제 시 입력 가능"
                value=""
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none font-semibold text-xs bg-slate-100/70 text-slate-400 cursor-not-allowed"
              />
            </div>
          )}

          {/* 거래처명 */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 mb-1">영수인/가맹점명/거래처명 *</label>
            <input 
              type="text"
              placeholder="예: 홍길동 또는 이지커피숍"
              value={newExpense.payee || ""}
              onChange={e => setNewExpense(prev => ({ ...prev, payee: e.target.value }))}
              className="w-full border border-slate-250 rounded-xl px-3.5 py-2.5 outline-none font-bold text-xs bg-white focus:ring-2 focus:ring-rose-500 transition-all text-slate-805"
            />
          </div>

          {/* 품의 일자 */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 mb-1">품의 일자 *</label>
            <input 
              type="date"
              value={newExpense.requisition_date || ""}
              onChange={e => setNewExpense(prev => ({ ...prev, requisition_date: e.target.value }))}
              className="w-full border border-slate-250 rounded-xl px-3.5 py-2 outline-none font-bold text-xs bg-white focus:ring-2 focus:ring-rose-500 transition-all text-slate-700 cursor-pointer"
            />
          </div>

          {/* 실제 지출일 */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 mb-1">실제 지출일 (승인 시 가능)</label>
            <input 
              type="date"
              disabled={true}
              value={newExpense.actual_expense_date || ""}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2 outline-none font-bold text-xs bg-slate-100/70 text-slate-400 cursor-not-allowed"
            />
          </div>

          {/* 공제액 */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 mb-1">공제액 (차감액 ₩)</label>
            <div className="relative">
              <input 
                type="number"
                disabled={true}
                placeholder="승인 시 입력 가능"
                value={newExpense.deduction_amount || ""}
                className="w-full border border-slate-200 rounded-xl pl-3.5 pr-8 py-2.5 outline-none font-semibold text-xs bg-slate-100/70 text-slate-400 cursor-not-allowed"
              />
              <span className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 font-extrabold text-[10px]">원</span>
            </div>
          </div>

          {/* 송금수수료 */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 mb-1">송금수수료 (가산액 ₩)</label>
            <div className="relative">
              <input 
                type="number"
                disabled={true}
                placeholder="승인 시 입력 가능"
                value={newExpense.transfer_fee || ""}
                className="w-full border border-slate-200 rounded-xl pl-3.5 pr-8 py-2.5 outline-none font-semibold text-xs bg-slate-100/70 text-slate-400 cursor-not-allowed"
              />
              <span className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 font-extrabold text-[10px]">원</span>
            </div>
          </div>

          <p className="col-span-3 text-[9px] text-amber-600 font-extrabold bg-amber-50 p-2.5 rounded-xl border border-amber-100 flex items-center gap-1.5 mt-1 leading-normal">
            ⚠️ 안내: 신규 등록 지출은 '결재 대기' 상태이므로 [실제 지출일/공제액/수수료] 항목을 기입할 수 없습니다. 대표자 승인(APPROVED) 및 계좌송금/현금 수단인 건만 승인 완료 후 사후 기입이 허용됩니다.
          </p>

          {/* 지출 금액 */}
          <div className="col-span-3">
            <label className="block text-[10px] font-extrabold text-slate-500 mb-1">지출 금액 (원화 ₩) *</label>
            <div className="relative">
              <input 
                type="number"
                placeholder="금액을 입력하세요"
                value={newExpense.amount}
                onChange={e => setNewExpense(prev => ({ ...prev, amount: e.target.value }))}
                className="w-full border border-slate-250 rounded-xl pl-3.5 pr-10 py-2.5 outline-none font-black text-xs bg-white focus:ring-2 focus:ring-rose-500 transition-all text-slate-800"
              />
              <span className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 font-extrabold text-[10px]">원</span>
            </div>
            {newExpense.amount && Number(newExpense.amount) > 0 && (
              <div className="mt-1.5 px-3 py-1.5 bg-gradient-to-r from-rose-50 to-slate-50 border border-rose-100 rounded-xl flex items-center justify-between animate-fade-in shadow-3xs">
                <span className="text-[10px] font-black text-rose-600 font-sans tracking-tight">
                  {convertToKoreanNumber(Number(newExpense.amount))}
                </span>
                <span className="text-[9px] font-bold text-slate-400 font-mono">
                  (₩{Number(newExpense.amount).toLocaleString()}원)
                </span>
              </div>
            )}
            {newExpense.amount && (
              <div className="mt-1.5 px-3 py-2 bg-gradient-to-r from-slate-900 to-slate-950 text-white rounded-xl flex items-center justify-between animate-fade-in shadow-3xs border border-slate-850">
                <span className="text-[9px] font-black text-rose-300 font-sans tracking-tight">
                  💸 최종 지급액 (승인액 - 공제액 + 수수료)
                </span>
                <span className="text-xs font-black font-mono text-white">
                  {((Number(newExpense.amount) || 0) - (Number(newExpense.deduction_amount) || 0) + (Number(newExpense.transfer_fee) || 0)).toLocaleString()}원
                </span>
              </div>
            )}
          </div>

          {/* 비고 및 지출 태그 */}
          <div className="col-span-3">
            <label className="block text-[10px] font-extrabold text-slate-500 mb-1">비고 (지출 태그 입력)</label>
            <input 
              type="text"
              placeholder="태그를 쉼표(,)로 구분하여 입력하거나 아래 추천 태그를 클릭해 보세요"
              value={newExpense.memo || ""}
              onChange={e => setNewExpense(prev => ({ ...prev, memo: e.target.value }))}
              className="w-full border border-slate-250 rounded-xl px-3.5 py-2.5 outline-none font-semibold text-xs bg-white focus:ring-2 focus:ring-rose-500 transition-all text-slate-800"
            />
            
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PRESET_TAGS.map(tag => {
                const isSelected = (newExpense.memo || "")
                  .split(",")
                  .map(t => t.trim())
                  .includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-2.5 py-1.5 rounded-full text-[9px] font-bold border transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-rose-500 text-white border-rose-500 shadow-3xs border-none' 
                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    #{tag}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button 
            type="button"
            data-easybot-hint="지출 대장 즉시 등록 버튼: AI가 추출하거나 사용자가 수동으로 검수한 지출 명세(일자, 공급자, 금액, 결제수단 등)를 최종 검토한 뒤, 이 버튼을 누르면 실제 지출 대장(ledger) 데이터베이스에 정식 전표로 등록 및 보관됩니다."
            onClick={handleRegisterExpense}
            disabled={isSubmittingExpense || !newExpense.title || !newExpense.amount}
            className="px-6 py-2.5 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white rounded-xl font-black text-xs shadow-md shadow-rose-500/10 hover:opacity-95 disabled:bg-slate-350 disabled:shadow-none transition-all cursor-pointer border-none flex items-center"
          >
            <Sparkles className="w-3.5 h-3.5 mr-2 animate-pulse" />
            {isSubmittingExpense ? "지출 대장 등록 중..." : "지출 대장 등록"}
          </button>
        </div>
      </div>
    </div>
  );
}
