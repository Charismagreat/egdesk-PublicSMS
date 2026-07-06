'use client';

import { apiFetch } from '@/lib/api';
import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, FileText, DollarSign, Calendar, Phone, Plus, Check } from 'lucide-react';

export default function ReceiptPreviewMessage({ tagContent }: { tagContent: string }) {
  const [receipt, setReceipt] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('법인카드');
  const [memo, setMemo] = useState('');
  const [payee, setPayee] = useState('');
  const [cardApprovalNo, setCardApprovalNo] = useState('');
  
  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const [selectedMainCat, setSelectedMainCat] = useState('판매비와관리비');
  const [selectedMidCat, setSelectedMidCat] = useState('복리후생비');
  const [selectedSubCat, setSelectedSubCat] = useState('직원식대');
  
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // 1. 카테고리 정보 로드
  useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await apiFetch('/api/expenses/categories');
        const json = await res.json();
        if (json.success) {
          setDbCategories(json.categories);
        }
      } catch (err) {
        console.error('이지봇 영수증 카테고리 로드 실패:', err);
      }
    };
    fetchCats();
  }, []);

  // 2. 3단계 카테고리 구조 동적 빌딩
  const ACCOUNT_CATEGORIES = useMemo(() => {
    const structure: Record<string, Record<string, string[]>> = {};
    if (!dbCategories || dbCategories.length === 0) {
      return {
        "판매비와관리비": {
          "복리후생비": ["직원식대", "직원야근식대", "음료및간식비"]
        }
      };
    }
    dbCategories.forEach(cat => {
      const main = cat.main_category;
      const mid = cat.mid_category;
      const sub = cat.sub_category;
      if (!structure[main]) structure[main] = {};
      if (!structure[main][mid]) structure[main][mid] = [];
      if (!structure[main][mid].includes(sub)) structure[main][mid].push(sub);
    });
    return structure;
  }, [dbCategories]);

  // 3. 수신한 OCR 데이터 파싱 및 초기화
  useEffect(() => {
    try {
      const parsed = JSON.parse(tagContent);
      setReceipt(parsed);
      setTitle(parsed.title || '');
      setAmount(parsed.amount ? String(parsed.amount) : '');
      setExpenseDate(parsed.expense_date || new Date().toISOString().slice(0, 10));
      setPaymentMethod(parsed.payment_method || '법인카드');
      setMemo(parsed.memo || '');
      setPayee(parsed.payee || parsed.merchant || '');
      setCardApprovalNo(parsed.card_approval_no || '');

      // OCR 카테고리(중분류 수준)의 지능형 소분류 맵핑
      if (parsed.category && dbCategories.length > 0) {
        const OCR_MID_CAT_MAP: Record<string, string> = {
          "복리후생비": "복리후생비",
          "여비교통비": "여비교통비",
          "소모품비": "소모품비",
          "접대비": "접대비(기업업무추진비)",
          "임차료": "지급임차료",
          "세금공과금": "세금과공과",
          "기타": "지급수수료"
        };
        const targetMidCat = OCR_MID_CAT_MAP[parsed.category] || parsed.category;
        const matchedCats = dbCategories.filter(cat => cat.mid_category === targetMidCat);

        if (matchedCats.length > 0) {
          const titleLower = (parsed.title || '').toLowerCase();
          let subCat = matchedCats[0].sub_category;
          
          if (targetMidCat === "복리후생비") {
            if (titleLower.includes("음료") || titleLower.includes("커피") || titleLower.includes("간식") || titleLower.includes("라떼")) {
              const found = matchedCats.find(c => c.sub_category === "음료및간식비");
              if (found) subCat = found.sub_category;
            } else if (titleLower.includes("야식") || titleLower.includes("야근")) {
              const found = matchedCats.find(c => c.sub_category === "직원야근식대");
              if (found) subCat = found.sub_category;
            } else if (titleLower.includes("식대") || titleLower.includes("식사")) {
              const found = matchedCats.find(c => c.sub_category === "직원식대");
              if (found) subCat = found.sub_category;
            }
          } else if (targetMidCat === "여비교통비" && titleLower.includes("택시")) {
            const found = matchedCats.find(c => c.sub_category === "택시비");
            if (found) subCat = found.sub_category;
          }
          
          setSelectedSubCat(subCat);
          
          // 역으로 대/중분류 매핑
          for (const mainCat of Object.keys(ACCOUNT_CATEGORIES)) {
            for (const midCat of Object.keys(ACCOUNT_CATEGORIES[mainCat])) {
              if (ACCOUNT_CATEGORIES[mainCat][midCat].includes(subCat)) {
                setSelectedMainCat(mainCat);
                setSelectedMidCat(midCat);
                break;
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('영수증 파싱 실패:', err);
    }
  }, [tagContent, dbCategories, ACCOUNT_CATEGORIES]);

  const handleMainCatChange = (mainCat: string) => {
    setSelectedMainCat(mainCat);
    const midCats = Object.keys(ACCOUNT_CATEGORIES[mainCat] || {});
    if (midCats.length > 0) {
      const firstMid = midCats[0];
      setSelectedMidCat(firstMid);
      const subCats = ACCOUNT_CATEGORIES[mainCat][firstMid] || [];
      if (subCats.length > 0) setSelectedSubCat(subCats[0]);
    }
  };

  const handleMidCatChange = (midCat: string) => {
    setSelectedMidCat(midCat);
    const subCats = ACCOUNT_CATEGORIES[selectedMainCat][midCat] || [];
    if (subCats.length > 0) setSelectedSubCat(subCats[0]);
  };

  const handleConfirmSubmit = async () => {
    if (!title || !amount) {
      alert('적요와 금액은 필수 입력 항목입니다.');
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          category: selectedSubCat,
          amount: Number(amount),
          expense_date: expenseDate,
          payment_method: paymentMethod,
          memo,
          payee,
          requisition_date: expenseDate,
          card_approval_no: cardApprovalNo || null,
          ai_analysis: JSON.stringify({ ocrParsed: true, source: 'EASYBOT_OCR' })
        })
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
      } else {
        alert(data.error || '지출 내역 등록 처리에 실패했습니다.');
      }
    } catch (err: any) {
      alert('지출 등록 통신 에러: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!receipt) return <div className="text-rose-500 font-bold p-2 text-xs">영수증 데이터를 파싱하지 못했습니다.</div>;

  return (
    <div className="my-3 border border-rose-100 rounded-2xl bg-white shadow-md overflow-hidden text-slate-800 max-w-sm animate-in zoom-in-95 duration-200">
      <div className="bg-gradient-to-r from-rose-50/50 to-pink-50/30 px-4 py-3 border-b border-rose-50 flex items-center gap-2">
        <Sparkles size={14} className="text-rose-500 animate-pulse" />
        <span className="text-xs font-black text-slate-800">이지봇 AI 영수증 분석 리포트</span>
      </div>

      <div className="p-4 space-y-3 text-[11px]">
        {/* 적요 */}
        <div className="space-y-1">
          <label className="text-[10px] text-slate-450 font-extrabold flex items-center gap-1"><FileText size={10} />적요 (지출 용도)</label>
          <input 
            type="text" 
            value={title} 
            onChange={e => setTitle(e.target.value)}
            disabled={saving || saved}
            className="w-full px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 bg-slate-50/20 font-bold text-xs"
          />
        </div>

        {/* 3단 계정과목 */}
        <div className="grid grid-cols-3 gap-1.5">
          <div className="space-y-1">
            <label className="text-[9px] text-slate-450 font-extrabold">대분류</label>
            <select
              value={selectedMainCat}
              onChange={e => handleMainCatChange(e.target.value)}
              disabled={saving || saved}
              className="w-full px-1 py-1.5 border border-slate-200 rounded-lg bg-slate-50/20 font-bold text-[10px] cursor-pointer"
            >
              {Object.keys(ACCOUNT_CATEGORIES).map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] text-slate-450 font-extrabold">중분류</label>
            <select
              value={selectedMidCat}
              onChange={e => handleMidCatChange(e.target.value)}
              disabled={saving || saved}
              className="w-full px-1 py-1.5 border border-slate-200 rounded-lg bg-slate-50/20 font-bold text-[10px] cursor-pointer"
            >
              {Object.keys(ACCOUNT_CATEGORIES[selectedMainCat] || {}).map(mid => (
                <option key={mid} value={mid}>{mid}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] text-slate-450 font-extrabold">소분류</label>
            <select
              value={selectedSubCat}
              onChange={e => setSelectedSubCat(e.target.value)}
              disabled={saving || saved}
              className="w-full px-1 py-1.5 border border-slate-200 rounded-lg bg-slate-50/20 font-bold text-[10px] cursor-pointer"
            >
              {(ACCOUNT_CATEGORIES[selectedMainCat]?.[selectedMidCat] || []).map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 금액 및 날짜 */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <label className="text-[10px] text-slate-450 font-extrabold flex items-center gap-1"><DollarSign size={10} />지출 금액 (원)</label>
            <input 
              type="number" 
              value={amount} 
              onChange={e => setAmount(e.target.value)}
              disabled={saving || saved}
              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 bg-slate-50/20 font-bold font-mono text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-slate-450 font-extrabold flex items-center gap-1"><Calendar size={10} />품의 일자</label>
            <input 
              type="date" 
              value={expenseDate} 
              onChange={e => setExpenseDate(e.target.value)}
              disabled={saving || saved}
              className="w-full px-1 py-1 border border-slate-200 rounded-lg focus:outline-none bg-slate-50/20 font-bold text-[10px] cursor-pointer"
            />
          </div>
        </div>

        {/* 결제 수단 및 가맹점 */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <label className="text-[10px] text-slate-450 font-extrabold flex items-center gap-1"><Phone size={10} />결제 수단</label>
            <select
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value)}
              disabled={saving || saved}
              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg bg-slate-50/20 font-bold text-[10px] cursor-pointer"
            >
              {["법인카드", "개인신용카드", "계좌송금", "현금", "기타"].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-slate-450 font-extrabold flex items-center gap-1">🏢 가맹점/상호명</label>
            <input 
              type="text" 
              value={payee} 
              onChange={e => setPayee(e.target.value)}
              disabled={saving || saved}
              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 bg-slate-50/20 font-bold text-xs"
            />
          </div>
        </div>

        {/* 비고(태그) */}
        <div className="space-y-1">
          <label className="text-[10px] text-slate-450 font-extrabold flex items-center gap-1"><Plus size={10} />비고 (지출 태그)</label>
          <input 
            type="text" 
            value={memo} 
            onChange={e => setMemo(e.target.value)}
            disabled={saving || saved}
            className="w-full px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 bg-slate-50/20 font-bold text-xs"
          />
        </div>

        {/* 카드 승인번호 (결제수단이 카드계열일 때 노출) */}
        {paymentMethod.includes("카드") && (
          <div className="space-y-1">
            <label className="text-[10px] text-slate-450 font-extrabold flex items-center gap-1">💳 카드 승인번호 (중복체크용)</label>
            <input 
              type="text" 
              value={cardApprovalNo} 
              onChange={e => setCardApprovalNo(e.target.value)}
              disabled={saving || saved}
              placeholder="영수증상 승인번호 8자리"
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 bg-slate-50/20 font-bold text-xs"
            />
          </div>
        )}

        {/* 등록 버튼 */}
        <div className="pt-1.5">
          {saved ? (
            <div className="w-full py-2 bg-emerald-50 text-emerald-600 rounded-xl font-black text-center border border-emerald-100 flex items-center justify-center gap-1 text-xs">
              <Check size={14} className="shrink-0" /> 지출결의서 등록이 완료되었습니다!
            </div>
          ) : (
            <button
              onClick={handleConfirmSubmit}
              disabled={saving}
              className="w-full py-2 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white rounded-xl font-black shadow-md shadow-rose-500/10 cursor-pointer border-none flex items-center justify-center gap-1 transition-all text-xs"
            >
              {saving ? '장부 적재 중...' : '지출결의서 장부 즉시 등록'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
