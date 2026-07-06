'use client';

import { apiFetch } from '@/lib/api';
import React from 'react';
import { useExpenses, Expense } from '@/hooks/useExpenses';
import MobileApproveHeader from './components/MobileApproveHeader';
import MobileStatsBoard from './components/MobileStatsBoard';
import MobileApproveLedger from './components/MobileApproveLedger';
import MobileDetailModal from './components/MobileDetailModal';
import MobileSpeechOpinionModal from './components/MobileSpeechOpinionModal';
import { StatsRange, SuggestItem, MobileExpense } from './types';

export default function MobileApprovePage() {
  const {
    expenses,
    fetchExpenses,
    handleApproveExpense,
    dbCategories,
    dbTags,
    dbDepartments,
    dbEmployees,
    dbProjects,
    autocompleteData
  } = useExpenses();

  // TypeScript 컴파일용 캐스팅
  const typedExpenses = expenses as MobileExpense[];

  // 1. 모바일 탭 관리 상태 (대기, 전체, 반려/보류)
  const [activeTab, setActiveTab] = React.useState<'pending' | 'all' | 'rejected_hold'>('pending');

  // 1-2. 모바일 결재 상세 내 첨부파일 원본 보기 아코디언 토글 상태
  const [showAttachment, setShowAttachment] = React.useState(false);

  // 1-3. 대표자 모바일 즉석 수정(금액 포함) 폼 상태 변수
  const [isEditing, setIsEditing] = React.useState(false);
  const [editTitle, setEditTitle] = React.useState('');
  const [editAmount, setEditAmount] = React.useState<number>(0);
  const [editCategory, setEditCategory] = React.useState('');
  const [editPaymentMethod, setEditPaymentMethod] = React.useState('');
  const [editExpenseDate, setEditExpenseDate] = React.useState('');
  const [editMemo, setEditMemo] = React.useState('');
  const [editActualExpenseDate, setEditActualExpenseDate] = React.useState('');
  const [editDeductionAmount, setEditDeductionAmount] = React.useState<number>(0);
  const [editTransferFee, setEditTransferFee] = React.useState<number>(0);

  // 1-4. 반려/보류 음성 인식(Speech-to-Text) 보조 상태 변수
  const [isListening, setIsListening] = React.useState(false);
  const recognitionRef = React.useRef<any>(null);

  // 1-5. 대표자 모바일 수정 화면 내 '@' 태그 자동완성 보조 상태 변수
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [searchWord, setSearchWord] = React.useState('');
  const [atIndex, setAtIndex] = React.useState(-1);
  const [activeSuggestIndex, setActiveSuggestIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  // 전체 자동완성 후보군 취합 (모바일)
  const allSuggestItems = React.useMemo(() => {
    const items: SuggestItem[] = [];
    
    if (dbEmployees) {
      dbEmployees.forEach(emp => {
        items.push({ label: emp.name, value: emp.name, type: 'staff' });
      });
    }
    if (dbDepartments) {
      dbDepartments.forEach(dept => {
        items.push({ label: dept.name, value: dept.name, type: 'department' });
      });
    }
    if (dbProjects) {
      dbProjects.forEach(proj => {
        items.push({ label: proj.name, value: proj.name, type: 'project' });
      });
    }
    if (autocompleteData?.partners) {
      autocompleteData.partners.forEach(name => {
        items.push({ label: name, value: name, type: 'partner' });
      });
    }
    return items;
  }, [dbEmployees, dbDepartments, dbProjects, autocompleteData]);

  // 필터링된 추천 항목 목록 연산 (모바일)
  const filteredSuggestions = React.useMemo(() => {
    if (!showSuggestions) return [];
    const cleanWord = searchWord.toLowerCase().trim();
    if (!cleanWord) {
      // 검색어가 비어있을 때는 타입별로 앞의 몇 개만 취함
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

  // 자동완성 항목 선택 적용 핸들러 (모바일)
  const selectSuggestion = (item: SuggestItem) => {
    const value = editTitle;
    const cursorPos = inputRef.current?.selectionStart || 0;
    
    const textBefore = value.slice(0, atIndex);
    const textAfter = value.slice(cursorPos);
    
    const replacement = `@${item.label} `;
    const newValue = textBefore + replacement + textAfter;
    
    setEditTitle(newValue);
    setShowSuggestions(false);
    
    // 포커스 회복
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const newCursorPos = atIndex + replacement.length;
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 10);
  };

  // 인풋 실시간 @ 입력 감지 리스너 (모바일)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    
    setEditTitle(value);
    
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

  // 인풋 키보드 조작 인터셉트 리스너 (모바일)
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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

  // 지출 태그 쉼표 구분 토글 헬퍼 (모바일)
  const toggleEditTag = (tag: string) => {
    const currentMemo = editMemo || "";
    let tags = currentMemo
      .split(",")
      .map(t => t.trim())
      .filter(t => t !== "");

    if (tags.includes(tag)) {
      tags = tags.filter(t => t !== tag);
    } else {
      tags.push(tag);
    }
    
    setEditMemo(tags.join(", "));
  };

  // 2. 실시간 다차원 지출 분석 필터 상태
  const [statsRange, setStatsRange] = React.useState<StatsRange>('all');
  const [statsCategory, setStatsCategory] = React.useState<string>('ALL');
  const [statsTag, setStatsTag] = React.useState<string>('ALL');

  // 3. 모바일 대장 검색어 상태
  const [searchQuery, setSearchQuery] = React.useState('');

  // 4. 결재 의견 입력 및 상세 보기 모달 제어용 상태
  const [selectedExpense, setSelectedExpense] = React.useState<Expense | null>(null);
  const [approvalOpinion, setApprovalOpinion] = React.useState('');
  const [opinionModalType, setOpinionModalType] = React.useState<'REJECTED' | 'HOLD' | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // 🔄 selectedExpense가 바뀔 때 수정 폼 데이터 자동 바인딩 및 동기화
  React.useEffect(() => {
    if (selectedExpense) {
      setEditTitle(selectedExpense.title);
      setEditAmount(selectedExpense.amount);
      setEditCategory(selectedExpense.category);
      setEditPaymentMethod(selectedExpense.payment_method);
      setEditExpenseDate(selectedExpense.expense_date);
      setEditMemo(selectedExpense.memo || '');
      setEditActualExpenseDate(selectedExpense.actual_expense_date || '');
      setEditDeductionAmount(selectedExpense.deduction_amount || 0);
      setEditTransferFee(selectedExpense.transfer_fee || 0);
      setIsEditing(false); // 새로운 창이 열릴 때는 뷰 모드로 시작
    }
  }, [selectedExpense]);

  // 📂 계정과목 대/중/소 동적 역산 매핑 헬퍼
  const getCategoryDetails = React.useCallback((subCat: string) => {
    if (!subCat) return { main: "기타", mid: "기타", sub: "-" };

    // 1. DB 연동 데이터에서 소분류가 일치하는지 먼저 실시간 역탐색
    const dbMatch = dbCategories?.find(c => c.sub_category === subCat);
    if (dbMatch) {
      return {
        main: dbMatch.main_category,
        mid: dbMatch.mid_category,
        sub: dbMatch.sub_category
      };
    }

    // 2. Fallback: 하드코딩 맵 기반 매핑 역탐색
    const ACCOUNT_CATEGORIES_MAP: Record<string, string[]> = {
      "판매비와관리비": ["복리후생비", "소모품비", "여비교통비", "임차료", "통신비", "세금과공과", "도서인쇄비", "회의비", "광고선전비", "교육훈련비", "차량유지비"],
      "제조/물류원가": ["외주가공비", "운반비", "포장비", "원재료비", "부재료비", "전력비", "가스수도비", "수선비", "임금", "잡급"],
      "영업외비용": ["이자비용", "기부금", "기타영업외비용"],
      "기타": ["잡손실", "기타소분류"]
    };

    for (const main of Object.keys(ACCOUNT_CATEGORIES_MAP)) {
      if (ACCOUNT_CATEGORIES_MAP[main].includes(subCat)) {
        return {
          main,
          mid: subCat, // 중분류명이 없는 전통적 맵일 땐 소분류명을 임시로 중분류로 활용
          sub: subCat
        };
      }
    }

    return {
      main: "기타",
      mid: "기타",
      sub: subCat
    };
  }, [dbCategories]);

  // 호환성용 getMainCategory
  const getMainCategory = React.useCallback((subCat: string): string => {
    return getCategoryDetails(subCat).main;
  }, [getCategoryDetails]);

  // 🏷️ 적요란 '@' 태그 파싱 헬퍼 함수
  const getTaggedInfo = React.useCallback((title: string) => {
    if (!title) return { department: "-", staff: "-", project: "-" };
    const regex = /@([^\s@]+)/g;
    let match;
    let department = "-";
    let staff = "-";
    let project = "-";
    
    while ((match = regex.exec(title)) !== null) {
      const name = match[1];
      if (dbEmployees?.some(e => e.name === name)) {
        staff = name;
      } else if (dbDepartments?.some(d => d.name === name)) {
        department = name;
      } else if (dbProjects?.some(p => p.name === name)) {
        project = name;
      }
    }
    return { department, staff, project };
  }, [dbEmployees, dbDepartments, dbProjects]);

  // 📅 기간 계산 헬퍼
  const getStartDateLimit = (range: StatsRange) => {
    const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
    now.setHours(0,0,0,0);
    if (range === 'today') return now.toISOString().slice(0, 10);
    if (range === 'week') {
      const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return d.toISOString().slice(0, 10);
    }
    if (range === 'month') {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      return d.toISOString().slice(0, 10);
    }
    if (range === '3month') {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 3);
      return d.toISOString().slice(0, 10);
    }
    return '';
  };

  // 📊 1. 다차원 필터링에 기반한 실시간 지출 집계 연산 (Aggregation)
  const filteredForStats = React.useMemo(() => {
    return typedExpenses.filter(exp => {
      // 1-1. 기간 필터
      const startLimit = getStartDateLimit(statsRange);
      if (startLimit && exp.expense_date < startLimit) return false;
      
      // 1-2. 계정과목 대분류 필터
      if (statsCategory !== 'ALL') {
        const mainCat = getMainCategory(exp.category);
        if (mainCat !== statsCategory) return false;
      }

      // 1-3. 태그 필터
      if (statsTag !== 'ALL') {
        if (!exp.memo || !exp.memo.split(',').map((t: string) => t.trim()).includes(statsTag)) return false;
      }

      return true;
    });
  }, [typedExpenses, statsRange, statsCategory, statsTag]);

  // 실시간 합계 금액 계산 (최종 실지출액 기준)
  const totalStatsAmount = React.useMemo(() => {
    return filteredForStats.reduce((sum, exp) => sum + ((Number(exp.amount) || 0) - (Number(exp.deduction_amount) || 0) + (Number(exp.transfer_fee) || 0)), 0);
  }, [filteredForStats]);

  // 🏷️ 고유 태그 목록 계산 (필터링 드롭다운용)
  const allUniqueTags = React.useMemo(() => {
    const tagsSet = new Set<string>();
    typedExpenses.forEach(exp => {
      if (exp.memo) {
        exp.memo.split(',').map((t: string) => t.trim()).filter(Boolean).forEach((t: string) => tagsSet.add(t));
      }
    });
    return Array.from(tagsSet);
  }, [typedExpenses]);

  // 📋 2. 모바일 메인 결재/검색 리스트 필터링 연산
  const mainFilteredExpenses = React.useMemo(() => {
    return typedExpenses.filter(exp => {
      // 2-1. 탭별 분기
      const status = exp.approval_status || 'PENDING';
      if (activeTab === 'pending') {
        if (status !== 'PENDING') return false;
      } else if (activeTab === 'rejected_hold') {
        if (status !== 'REJECTED' && status !== 'HOLD') return false;
      }

      // 2-2. 검색어 필터 (전체 탭 등에서 가동)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTitle = exp.title.toLowerCase().includes(query);
        const matchesMemo = exp.memo ? exp.memo.toLowerCase().includes(query) : false;
        const matchesCategory = exp.category.toLowerCase().includes(query);
        const matchesPayee = (() => {
          try {
            const parsed = JSON.parse(exp.ai_analysis || '{}');
            return parsed.payee ? parsed.payee.toLowerCase().includes(query) : false;
          } catch(e) { return false; }
        })();

        if (!matchesTitle && !matchesMemo && !matchesCategory && !matchesPayee) return false;
      }

      return true;
    });
  }, [typedExpenses, activeTab, searchQuery]);

  // 🟢 승인 즉시 처리 핸들러
  const handleDirectApprove = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("🟢 이 지출 건을 즉시 결재 승인하시겠습니까?")) return;
    
    setIsSubmitting(true);
    const res = await handleApproveExpense(id, 'APPROVED', '대표자 모바일 원클릭 승인 완료');
    setIsSubmitting(false);

    if (res.success) {
      alert("✅ 승인 처리가 정상적으로 완료되었습니다.");
      setSelectedExpense(null);
    } else {
      alert("❌ 승인 실패: " + res.error);
    }
  };

  // 🔄 보류/반려 재심사 처리 핸들러
  const handleReconsiderApprove = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("🔄 이 보류/반려 건에 대해 재심사 후 즉시 승인 처리하시겠습니까?")) return;
    
    setIsSubmitting(true);
    const res = await handleApproveExpense(id, 'APPROVED', '재심사 및 즉시 승인 완료');
    setIsSubmitting(false);

    if (res.success) {
      alert("✅ 재심사 승인이 완료되었습니다.");
    } else {
      alert("❌ 처리 실패: " + res.error);
    }
  };

  // 🔴/🟡 반려/보류 최종 전산 처리 제출 핸들러
  const handleOpinionSubmit = async () => {
    if (!selectedExpense || !opinionModalType) return;
    if (!approvalOpinion.trim()) {
      alert("⚠️ 반려 또는 보류 사유를 반드시 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    const res = await handleApproveExpense(selectedExpense.id, opinionModalType, approvalOpinion.trim());
    setIsSubmitting(false);

    if (res.success) {
      alert(`✅ 정상적으로 [${opinionModalType === 'REJECTED' ? '반려' : '보류'}] 처리되었습니다.`);
      setApprovalOpinion('');
      setOpinionModalType(null);
      setSelectedExpense(null);
    } else {
      alert("❌ 처리 실패: " + res.error);
    }
  };

  // 🗑️ 대표자 지출 즉시 영구 삭제 핸들러 (모바일 전산 삭제)
  const handleDeleteDirect = async (id: string) => {
    if (!confirm("🚨 이 지출 건을 대장에서 완전히 영구 삭제하시겠습니까?\n삭제된 건은 절대 복구할 수 없습니다.")) return;

    setIsSubmitting(true);
    try {
      const res = await apiFetch(`/api/expenses?id=${id}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      setIsSubmitting(false);

      if (json.success) {
        alert("✅ 지출 내역이 대장에서 성공적으로 완전히 소거되었습니다.");
        setSelectedExpense(null);
        fetchExpenses(); // 목록 동기화
      } else {
        alert("❌ 삭제 처리 실패: " + json.error);
      }
    } catch (e: any) {
      setIsSubmitting(false);
      alert("❌ 통신 오류: " + e.message);
    }
  };

  // 💾 대표자 지출 기입 정보 즉시 갱신 핸들러 (모바일 금액 포함 수정)
  const handleUpdateDirect = async () => {
    if (!selectedExpense) return;
    if (!editTitle.trim()) {
      alert("⚠️ 지출 명세(적요)를 반드시 기입해 주세요.");
      return;
    }
    if (Number(editAmount) <= 0) {
      alert("⚠️ 올바른 지출 금액을 지정해 주세요.");
      return;
    }
    if (!editCategory) {
      alert("⚠️ 계정과목 소분류를 지정해 주세요.");
      return;
    }
    if (!editExpenseDate) {
      alert("⚠️ 품의일자를 입력해 주세요.");
      return;
    }
    if (!editPaymentMethod) {
      alert("⚠️ 결제 수단을 입력해 주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiFetch('/api/expenses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedExpense.id,
          title: editTitle.trim(),
          category: editCategory,
          amount: Number(editAmount),
          expense_date: editExpenseDate,
          payment_method: editPaymentMethod,
          attachment_url: selectedExpense.attachment_url || '',
          ai_analysis: selectedExpense.ai_analysis || '',
          memo: editMemo.trim(),
          actual_expense_date: editActualExpenseDate || null,
          deduction_amount: editDeductionAmount,
          transfer_fee: editTransferFee
        })
      });
      const json = await res.json();
      setIsSubmitting(false);

      if (json.success) {
        alert("✅ 지출 명세가 성공적으로 갱신 적용되었습니다.");
        setIsEditing(false);
        // 상세 결재 뷰어도 즉시 업데이트 반영
        setSelectedExpense({
          ...selectedExpense,
          title: editTitle.trim(),
          category: editCategory,
          amount: Number(editAmount),
          expense_date: editExpenseDate,
          payment_method: editPaymentMethod,
          memo: editMemo.trim(),
          actual_expense_date: editActualExpenseDate || null,
          deduction_amount: editDeductionAmount,
          transfer_fee: editTransferFee
        });
        fetchExpenses(); // 목록 동기화
      } else {
        alert("❌ 정보 수정 실패: " + json.error);
      }
    } catch (e: any) {
      setIsSubmitting(false);
      alert("❌ 통신 오류: " + e.message);
    }
  };

  // 🎙️ Web Speech API 기반 음성 받아쓰기(STT) 비서 토글러
  const handleToggleSpeech = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("⚠️ 이 기기 또는 브라우저는 음성 인식을 지원하지 않습니다. 구글 크롬 또는 모바일 순정 브라우저를 이용해주세요.");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.lang = 'ko-KR';
      rec.interimResults = false;
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setApprovalOpinion(prev => {
            const base = prev.trim();
            return base ? `${base} ${transcript}` : transcript;
          });
        }
      };

      rec.onerror = (err: any) => {
        console.error("Speech recognition error:", err);
        alert("🎙️ 음성 인식 중 마이크 신호를 잃었거나 권한이 차단되었습니다.");
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (e) {
      console.error("Speech recognition start error:", e);
      setIsListening(false);
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 pb-20 shadow-2xl relative border-x border-slate-200">
      
      {/* 📱 최상단 내비게이션 바 */}
      <MobileApproveHeader />

      <div className="p-4 space-y-4">
        
        {/* 📊 1. 실시간 다차원 지출 분석 전광판 */}
        <MobileStatsBoard
          statsRange={statsRange}
          setStatsRange={setStatsRange}
          statsCategory={statsCategory}
          setStatsCategory={setStatsCategory}
          statsTag={statsTag}
          setStatsTag={setStatsTag}
          totalStatsAmount={totalStatsAmount}
          filteredCount={filteredForStats.length}
          allUniqueTags={allUniqueTags}
        />

        {/* 📱 결재 대장 피드 및 3단 탭, 검색 */}
        <MobileApproveLedger
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          expensesCountPending={typedExpenses.filter(e => e.approval_status === 'PENDING' || !e.approval_status).length}
          expensesCountRejectedHold={typedExpenses.filter(e => e.approval_status === 'REJECTED' || e.approval_status === 'HOLD').length}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          mainFilteredExpenses={mainFilteredExpenses}
          getMainCategory={getMainCategory}
          setSelectedExpense={setSelectedExpense}
          setShowAttachment={setShowAttachment}
          handleReconsiderApprove={handleReconsiderApprove}
          isSubmitting={isSubmitting}
        />

      </div>

      {/* ================= 상세 기안 검수 모달 ================= */}
      {selectedExpense && (
        <MobileDetailModal
          selectedExpense={selectedExpense}
          onClose={() => { setSelectedExpense(null); setIsEditing(false); }}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          editTitle={editTitle}
          setEditTitle={setEditTitle}
          editAmount={editAmount}
          setEditAmount={setEditAmount}
          editCategory={editCategory}
          setEditCategory={setEditCategory}
          editPaymentMethod={editPaymentMethod}
          setEditPaymentMethod={setEditPaymentMethod}
          editExpenseDate={editExpenseDate}
          setEditExpenseDate={setEditExpenseDate}
          editMemo={editMemo}
          setEditMemo={setEditMemo}
          editActualExpenseDate={editActualExpenseDate}
          setEditActualExpenseDate={setEditActualExpenseDate}
          editDeductionAmount={editDeductionAmount}
          setEditDeductionAmount={setEditDeductionAmount}
          editTransferFee={editTransferFee}
          setEditTransferFee={setEditTransferFee}
          dbCategories={dbCategories}
          dbTags={dbTags}
          getCategoryDetails={getCategoryDetails}
          getTaggedInfo={getTaggedInfo}
          handleUpdateDirect={handleUpdateDirect}
          handleDeleteDirect={handleDeleteDirect}
          handleDirectApprove={handleDirectApprove}
          setOpinionModalType={setOpinionModalType}
          isSubmitting={isSubmitting}
          showSuggestions={showSuggestions}
          filteredSuggestions={filteredSuggestions}
          activeSuggestIndex={activeSuggestIndex}
          selectSuggestion={selectSuggestion}
          handleInputChange={handleInputChange}
          handleInputKeyDown={handleInputKeyDown}
          toggleEditTag={toggleEditTag}
          showAttachment={showAttachment}
          setShowAttachment={setShowAttachment}
          inputRef={inputRef}
        />
      )}

      {/* ================= 반려 / 보류 사유 기입 모달 ================= */}
      {opinionModalType && selectedExpense && (
        <MobileSpeechOpinionModal
          opinionModalType={opinionModalType}
          onClose={() => { setOpinionModalType(null); setApprovalOpinion(''); }}
          approvalOpinion={approvalOpinion}
          setApprovalOpinion={setApprovalOpinion}
          isListening={isListening}
          handleToggleSpeech={handleToggleSpeech}
          handleOpinionSubmit={handleOpinionSubmit}
          isSubmitting={isSubmitting}
        />
      )}

    </div>
  );
}
