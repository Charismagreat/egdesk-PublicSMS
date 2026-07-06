'use client';

import { apiFetch } from '@/lib/api';
import React, { useState, useEffect } from 'react';
import { Sparkles, User, Phone, RefreshCw } from 'lucide-react';

export default function LicensePreviewMessage({
  tagContent,
  onConfirmSuccess
}: {
  tagContent: string;
  onConfirmSuccess: (msg: string) => void;
}) {
  const [license, setLicense] = useState<any>(null);
  const [companyName, setCompanyName] = useState('');
  const [businessNumber, setBusinessNumber] = useState('');
  const [representative, setRepresentative] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [managerName, setManagerName] = useState('');
  const [memo, setMemo] = useState('');
  
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const parsed = JSON.parse(tagContent);
      setLicense(parsed);
      const ocrData = parsed.data || {};
      setCompanyName(ocrData.companyName || '');
      setBusinessNumber(ocrData.businessNumber || '');
      setRepresentative(ocrData.representative || '');
      setAddress(ocrData.address || '');
      setPhone(ocrData.phone || '');
      setManagerName(ocrData.managerName || '');
      setMemo(ocrData.memo || '');
    } catch (err) {
      console.error('사업자등록증 태그 파싱 실패:', err);
    }
  }, [tagContent]);

  if (!license) return <div className="text-rose-500 font-bold p-2 text-xs">사업자등록증 데이터를 파싱하지 못했습니다.</div>;

  const status = license.status;
  const checksum = license.checksum || { isValid: true, message: '' };
  const nts = license.nts || { isValidated: false, status: 'UNKNOWN', statusText: '' };
  const existingId = license.existingId;

  const handleConfirmSubmit = async () => {
    setSaving(true);
    try {
      const response = await apiFetch('/api/easybot/ocr/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileType: 'BUSINESS_LICENSE',
          status,
          existingId,
          data: {
            companyName,
            businessNumber,
            representative,
            address,
            phone,
            managerName,
            memo
          }
        })
      });

      const resData = await response.json();
      if (resData.success) {
        setSaved(true);
        onConfirmSuccess(resData.message);
      } else {
        alert(resData.error || '사업자등록증 DB 저장 처리에 실패했습니다.');
      }
    } catch (err: any) {
      alert('서버 등록 통신 오류: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const isBlocked = !checksum.isValid || nts.status === 'CLOSED' || nts.status === 'NOT_FOUND';

  return (
    <div className="my-3 border border-indigo-100 rounded-2xl bg-white shadow-md overflow-hidden text-slate-800 max-w-sm animate-in zoom-in-95 duration-200">
      {/* 카드 헤더 */}
      <div className="bg-gradient-to-r from-emerald-50/50 to-teal-50/30 px-4 py-3 border-b border-indigo-50 flex items-center gap-2">
        <Sparkles size={14} className="text-emerald-600 animate-pulse" />
        <span className="text-xs font-black text-slate-800">이지봇 AI 사업자등록증 리포트</span>
      </div>

      {/* 2중 국세청 검증 가이드 바 */}
      <div className="px-4 pt-3 shrink-0">
        <div className={`p-2.5 rounded-xl border text-[10px] font-bold space-y-1 ${
          isBlocked
            ? 'bg-rose-50 border-rose-200 text-rose-800'
            : nts.status === 'SUSPENDED'
            ? 'bg-amber-50 border-amber-200 text-amber-800'
            : nts.status === 'ACTIVE'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-slate-50 border-slate-200 text-slate-700'
        }`}>
          <div className="flex items-center justify-between pb-1 border-b border-slate-100/50 font-black">
            <span className="flex items-center gap-1">🛡️ 국세청 실시간 진위 검증</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[8px] font-black uppercase ${
              isBlocked
                ? 'bg-rose-500 text-white'
                : nts.status === 'SUSPENDED'
                ? 'bg-amber-500 text-white'
                : nts.status === 'ACTIVE'
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-205 text-slate-500'
            }`}>
              {!checksum.isValid
                ? '체크섬 오류'
                : nts.status === 'CLOSED'
                ? '폐업'
                : nts.status === 'SUSPENDED'
                ? '휴업'
                : nts.status === 'ACTIVE'
                ? '정상가동'
                : '미확인'}
            </span>
          </div>
          <div className="flex justify-between items-center text-[9px] text-slate-450">
            <span>1차 체계 검증 (Checksum)</span>
            <span className={checksum.isValid ? 'text-emerald-600 font-extrabold' : 'text-rose-600 font-extrabold'}>{checksum.message}</span>
          </div>
          <div className="flex justify-between items-start text-[9px] text-slate-450 gap-2">
            <span>2차 국세청 실시간 가동 상태</span>
            <span className={`text-right ${nts.status === 'ACTIVE' ? 'text-emerald-600 font-extrabold' : isBlocked ? 'text-rose-600 font-extrabold' : 'text-slate-650'}`}>{nts.statusText}</span>
          </div>
        </div>
      </div>

      {/* 정보 입력 및 보정 양식 */}
      <div className="p-4 space-y-3 text-[11px]">
        {/* 상호 및 등록번호 */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <label className="text-[10px] text-slate-450 font-extrabold flex items-center gap-1">🏢 상호 (회사명)</label>
            <input 
              type="text" 
              value={companyName} 
              onChange={e => setCompanyName(e.target.value)}
              disabled={saving || saved || isBlocked}
              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50/20 font-bold"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-slate-450 font-extrabold flex items-center gap-1">🔢 사업자번호</label>
            <input 
              type="text" 
              value={businessNumber} 
              onChange={e => setBusinessNumber(e.target.value)}
              disabled={saving || saved || isBlocked}
              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50/20 font-bold font-mono"
            />
          </div>
        </div>

        {/* 대표자 및 주소 */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <label className="text-[10px] text-slate-450 font-extrabold flex items-center gap-1"><User size={10} />대표자 성함</label>
            <input 
              type="text" 
              value={representative} 
              onChange={e => setRepresentative(e.target.value)}
              disabled={saving || saved || isBlocked}
              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50/20 font-bold"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-slate-450 font-extrabold flex items-center gap-1"><Phone size={10} />대표 연락처</label>
            <input 
              type="text" 
              value={phone} 
              onChange={e => setPhone(e.target.value)}
              disabled={saving || saved || isBlocked}
              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50/20 font-bold"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] text-slate-450 font-extrabold flex items-center gap-1">📍 본점 소재 주소</label>
          <input 
            type="text" 
            value={address} 
            onChange={e => setAddress(e.target.value)}
            disabled={saving || saved || isBlocked}
            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50/20 font-bold text-xs"
          />
        </div>

        {/* B2B 매칭 플래그 가이드 */}
        {status === 'UPDATE_PARTNER' && license.diff && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-2.5 space-y-1.5 text-[9px] text-amber-800 leading-relaxed font-bold">
            <span className="block font-black text-[10px]">⚠️ 대표자/주소 변동 사항 감지</span>
            <div className="divide-y divide-amber-100/50">
              {license.diff.companyName.changed && <div>• 상호명: {license.diff.companyName.old} ➡️ {companyName}</div>}
              {license.diff.representative.changed && <div>• 대표자: {license.diff.representative.old} ➡️ {representative}</div>}
              {license.diff.address.changed && <div>• 주소: {license.diff.address.old} ➡️ {address}</div>}
            </div>
            <span className="block text-slate-400 mt-1">※ 기존 누적 거래 실적은 100% 보존되며, 메모 열에 옛 정보가 누적 보관됩니다.</span>
          </div>
        )}

        {status === 'ALREADY_REGISTERED' && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-2 text-[9px] text-blue-700 font-extrabold">
            🟢 이미 동일 정보로 등록이 완료된 중복 거래처입니다.
          </div>
        )}
      </div>

      {/* 액션 버튼 */}
      <div className="px-4 pb-4 border-t border-slate-100 pt-3 flex gap-2">
        {saved ? (
          <div className="w-full py-2.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-xl font-bold text-center text-[11px]">
            B2B 거래처 등록 및 2중 검증 완료!
          </div>
        ) : (
          <button
            type="button"
            disabled={saving || isBlocked}
            onClick={handleConfirmSubmit}
            className={`w-full py-2.5 rounded-xl text-white font-extrabold text-[11px] flex items-center justify-center gap-1.5 transition-all shadow-3xs cursor-pointer border-none ${
              isBlocked
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                : status === 'UPDATE_PARTNER'
                ? 'bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-600/10'
                : 'bg-slate-900 hover:bg-slate-800'
            }`}
          >
            {saving ? (
              <>
                <RefreshCw size={11} className="animate-spin" />
                <span>B2B 원터치 가동 중...</span>
              </>
            ) : isBlocked ? (
              <span>부적격 사업자 (등록 불가)</span>
            ) : status === 'UPDATE_PARTNER' ? (
              <span>기존 바이어 변동 갱신 승인 ⚡</span>
            ) : (
              <span>B2B 신규 바이어 등록 승인 🚀</span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
