'use client';

import { apiFetch } from '@/lib/api';
import React, { useState, useEffect } from 'react';
import { Sparkles, User, Briefcase, Phone, Mail, CheckCircle2, RefreshCw, Send } from 'lucide-react';

export default function CardPreviewMessage({
  tagContent,
  onConfirmSuccess
}: {
  tagContent: string;
  onConfirmSuccess: (msg: string) => void;
}) {
  const [card, setCard] = useState<any>(null);
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const parsed = JSON.parse(tagContent);
      setCard(parsed);
      setName(parsed.name || '');
      setPosition(parsed.position || '');
      setPhone(parsed.phone || '');
      setEmail(parsed.email || '');
      setCompanyName(parsed.companyName || parsed.partnerName || '');
    } catch (err) {
      console.error('명함 태그 파싱 실패:', err);
    }
  }, [tagContent]);

  if (!card) return <div className="text-rose-500 font-bold p-2">명함 데이터를 파싱하지 못했습니다.</div>;

  const actionType = card.actionType;
  const partnerId = card.partnerId;
  const existingContact = card.existingContact;

  const handleConfirmSubmit = async () => {
    setSaving(true);
    try {
      const response = await apiFetch('/api/easybot/ocr/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType,
          name,
          position,
          phone,
          email,
          partnerId,
          partnerName: companyName,
          existingContactId: existingContact?.id,
          cardImageUrl: card.cardImageUrl || ''
        })
      });

      const data = await response.json();
      if (data.success) {
        setSaved(true);
        onConfirmSuccess(data.message);
      } else {
        alert(data.error || '명함 DB 등록 처리에 실패했습니다.');
      }
    } catch (err: any) {
      alert('서버 등록 통신 오류: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="my-3 border border-indigo-100 rounded-2xl bg-white shadow-md overflow-hidden text-slate-800 max-w-sm animate-in zoom-in-95 duration-200">
      {/* 카드 헤더 */}
      <div className="bg-gradient-to-r from-indigo-50/50 to-violet-50/30 px-4 py-3 border-b border-indigo-50 flex items-center gap-2">
        <Sparkles size={14} className="text-indigo-600 animate-pulse" />
        <span className="text-xs font-black text-slate-800">이지봇 AI 명함 분석 리포트</span>
      </div>

      {/* 정보 입력 및 보정 양식 */}
      <div className="p-4 space-y-3 text-[11px]">
        {/* 성명 및 직급 */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <label className="text-[10px] text-slate-450 font-extrabold flex items-center gap-1"><User size={10} />성명</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)}
              disabled={saving || saved}
              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50/20 font-bold"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-slate-450 font-extrabold flex items-center gap-1"><Briefcase size={10} />직책/직급</label>
            <input 
              type="text" 
              value={position} 
              onChange={e => setPosition(e.target.value)}
              disabled={saving || saved}
              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50/20 font-bold"
            />
          </div>
        </div>

        {/* 회사명 */}
        <div className="space-y-1">
          <label className="text-[10px] text-slate-450 font-extrabold">🏢 소속 회사명</label>
          <div className="flex gap-1.5 items-center">
            <input 
              type="text" 
              value={companyName} 
              onChange={e => setCompanyName(e.target.value)}
              disabled={saving || saved}
              className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50/20 font-bold text-xs"
            />
            {partnerId ? (
              <span className="shrink-0 bg-emerald-50 border border-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full text-[9px] font-black">매칭완료</span>
            ) : (
              <span className="shrink-0 bg-amber-50 border border-amber-100 text-amber-600 px-2 py-0.5 rounded-full text-[9px] font-black">신규회사</span>
            )}
          </div>
        </div>

        {/* 연락망 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <label className="text-[10px] text-slate-450 font-extrabold flex items-center gap-1"><Phone size={10} />전화번호</label>
            <input 
              type="text" 
              value={phone} 
              onChange={e => setPhone(e.target.value)}
              disabled={saving || saved}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50/20 font-bold font-mono"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-slate-450 font-extrabold flex items-center gap-1"><Mail size={10} />이메일</label>
            <input 
              type="text" 
              value={email} 
              onChange={e => setEmail(e.target.value)}
              disabled={saving || saved}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50/20 font-bold"
            />
          </div>
        </div>

        {/* AI 지능형 판정 결과 라벨 */}
        <div className="p-3 rounded-xl border leading-normal mt-2.5">
          {actionType === 'update_info' ? (
            <div className="border-indigo-550 bg-indigo-50/20 text-indigo-750 text-[10px] font-medium space-y-1">
              <p className="font-extrabold text-indigo-700 flex items-center gap-1">⚡ 동일 소속 연락망 변동 감지</p>
              <p>기존 명함 데이터와 소속명이 일치하여, 본 레코드의 승진 직급 및 변경 정보를 최신으로 **덮어쓰기 업데이트**합니다.</p>
            </div>
          ) : actionType === 'career_transition' ? (
            <div className="border-amber-50 bg-amber-50/20 text-amber-750 text-[10px] font-medium space-y-1">
              <p className="font-extrabold text-amber-700 flex items-center gap-1">🚀 스마트 이직(소속 회사 이동) 감지</p>
              <p>이전 <strong>{existingContact?.position || '담당자'}</strong> 소속회사 이력을 보관 비활성(퇴사) 처리하고, <strong>새로운 회사 소속의 명함첩 연락망</strong>으로 분리 신설합니다.</p>
            </div>
          ) : (
            <div className="border-slate-100 bg-slate-50/40 text-slate-600 text-[10px] font-medium space-y-1">
              <p className="font-extrabold text-slate-700">🆕 신규 명함 연락망 접수</p>
              <p>일치하는 기존 담당자가 발견되지 않아, 명함첩의 신규 거래처 담당자로 안전하게 추가 등록을 수행합니다.</p>
            </div>
          )}
        </div>
      </div>

      {/* 최종 확정 액션 버튼 */}
      <div className="px-4 py-3 bg-slate-50 border-t border-indigo-50 flex items-center justify-end">
        {saved ? (
          <div className="text-emerald-600 font-extrabold text-xs flex items-center gap-1.5 py-1.5">
            <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
            명함첩 등록 성공 완료!
          </div>
        ) : (
          <button
            onClick={handleConfirmSubmit}
            disabled={saving || !name}
            className="w-full py-2.5 text-xs font-bold text-white rounded-xl shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer border-none"
            style={{ backgroundColor: '#4f46e5' }}
          >
            {saving ? (
              <>
                <RefreshCw size={12} className="animate-spin" />
                DB에 반영하는 중...
              </>
            ) : actionType === 'update_info' ? (
              <>
                <Send size={12} />
                최신 정보로 갱신 적용 ⚡
              </>
            ) : actionType === 'career_transition' ? (
              <>
                <Send size={12} />
                기존 이력 보존 & 이직 등록 🚀
              </>
            ) : (
              <>
                <Send size={12} />
                명함첩 신규 등록 완료
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
