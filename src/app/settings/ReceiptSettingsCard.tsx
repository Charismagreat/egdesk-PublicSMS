"use client";

import React, { useState, useEffect } from "react";
import { Printer, Save, QrCode, Building, Info, FileText, CheckCircle2, Sparkles } from "lucide-react";
import { apiFetch } from "@/lib/api";

export interface ReceiptSettings {
  paperWidth: "80mm" | "58mm";
  customMessage: string;
  noticeText: string;
  showCompanyProfile: boolean;
  qrType: "NONE" | "REVIEW" | "WIFI" | "CUSTOM";
  qrUrl: string;
  qrLabel: string;
}

export default function ReceiptSettingsCard() {
  const [settings, setSettings] = useState<ReceiptSettings>({
    paperWidth: "80mm",
    customMessage: "방문해 주셔서 진심으로 감사합니다. 늘 최선을 다하겠습니다.",
    noticeText: "★ 네이버 영수증 리뷰 작성 시 음료수 1캔 무료 증정! ★\nWi-Fi: EGDESK_GUEST / Pass: egdesk1234\n주차 등록은 카운터 문의 (2시간 무료)",
    showCompanyProfile: true,
    qrType: "REVIEW",
    qrUrl: "https://m.place.naver.com",
    qrLabel: "🎁 영수증 리뷰 작성하고 음료수 받자!"
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // DB에서 receipt_settings 및 회사 정보 로드
  useEffect(() => {
    async function loadReceiptSettings() {
      try {
        const res = await apiFetch("/api/settings?key=receipt_settings");
        const json = await res.json();
        if (json.success && json.value) {
          const parsed = JSON.parse(json.value);
          setSettings(prev => ({ ...prev, ...parsed }));
        }
      } catch (err) {
        console.error("영수증 설정 로드 실패:", err);
      } finally {
        setLoading(false);
      }
    }
    loadReceiptSettings();
  }, []);

  // 설정 저장
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      const res = await apiFetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "receipt_settings",
          value: JSON.stringify(settings)
        })
      });
      const json = await res.json();
      if (json.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert(json.error || "저장 중 오류가 발생했습니다.");
      }
    } catch (err) {
      alert("서버 통신 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  // QR 이미지 인코딩 URL 생성 함수 (QR Server API 활용)
  const getQrImageUrl = (url: string) => {
    if (!url) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(url)}`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm text-center">
        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-xs text-slate-400 font-bold">영수증 설정을 불러오는 중입니다...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
      
      {/* 타이틀 헤더 */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-2xl flex items-center justify-center">
            <Printer className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              📄 영수증 & 인쇄 설정
              <Sparkles className="w-4 h-4 text-amber-500" />
            </h2>
            <p className="text-slate-500 text-xs font-medium mt-0.5">
              영수증 용지 규격, 하단 감사 문구, 사업자 정보 표출 및 리뷰 QR 코드 인쇄를 커스텀 설정합니다.
            </p>
          </div>
        </div>

        {saveSuccess && (
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>설정이 저장되었습니다</span>
          </span>
        )}
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* 왼쪽 8열: 양식 입력 커스텀 컨트롤 */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* 1. 용지 폭 규격 선택 */}
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-orange-600" />
              <span>영수증 용지 규격 선택</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSettings(s => ({ ...s, paperWidth: "80mm" }))}
                className={`p-3 rounded-2xl border text-xs font-bold transition-all border-none cursor-pointer text-left flex items-center justify-between ${
                  settings.paperWidth === "80mm"
                    ? "bg-orange-500 text-white ring-2 ring-orange-300 shadow-sm"
                    : "bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                <div>
                  <p className="font-black text-sm">80mm (표준 포스용)</p>
                  <p className={`text-[10px] ${settings.paperWidth === "80mm" ? "text-orange-100" : "text-slate-400"}`}>
                    대부분의 POS / 주방 프린터 용지
                  </p>
                </div>
                {settings.paperWidth === "80mm" && <CheckCircle2 className="w-5 h-5 text-white" />}
              </button>

              <button
                type="button"
                onClick={() => setSettings(s => ({ ...s, paperWidth: "58mm" }))}
                className={`p-3 rounded-2xl border text-xs font-bold transition-all border-none cursor-pointer text-left flex items-center justify-between ${
                  settings.paperWidth === "58mm"
                    ? "bg-orange-500 text-white ring-2 ring-orange-300 shadow-sm"
                    : "bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                <div>
                  <p className="font-black text-sm">58mm (소형 미니용)</p>
                  <p className={`text-[10px] ${settings.paperWidth === "58mm" ? "text-orange-100" : "text-slate-400"}`}>
                    휴대용 단말기 / 무선 미니 프린터
                  </p>
                </div>
                {settings.paperWidth === "58mm" && <CheckCircle2 className="w-5 h-5 text-white" />}
              </button>
            </div>
          </div>

          {/* 2. 감사 인사 문구 */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">감사 인사 문구</label>
            <input
              type="text"
              value={settings.customMessage}
              onChange={e => setSettings(s => ({ ...s, customMessage: e.target.value }))}
              placeholder="예: 방문해 주셔서 진심으로 감사합니다."
              className="w-full border border-slate-200 rounded-2xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-orange-500 text-xs font-bold text-slate-800"
            />
          </div>

          {/* 3. 안내 문구 (Wi-Fi, 주차, 이벤트 등) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex justify-between">
              <span>매장 안내 문구 (줄바꿈 가능)</span>
              <span className="text-[10px] font-normal text-slate-400">Wi-Fi, 주차, 이벤트 안내 등</span>
            </label>
            <textarea
              rows={4}
              value={settings.noticeText}
              onChange={e => setSettings(s => ({ ...s, noticeText: e.target.value }))}
              placeholder="영수증 하단에 출력될 안내글을 줄바꿈하여 작성하세요."
              className="w-full border border-slate-200 rounded-2xl p-3.5 outline-none focus:ring-2 focus:ring-orange-500 text-xs font-medium text-slate-800 leading-relaxed"
            />
          </div>

          {/* 4. 사업자 정보 표출 여부 토글 */}
          <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-slate-500" />
              <div>
                <p className="text-xs font-bold text-slate-800">사업자 프로필 정보 표시</p>
                <p className="text-[10px] text-slate-400">상호명, 대표자, 사업자등록번호, 전화번호 영수증 하단 포함</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showCompanyProfile}
                onChange={e => setSettings(s => ({ ...s, showCompanyProfile: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
            </label>
          </div>

          {/* 5. QR 코드 인쇄 설정 (확장 제안) */}
          <div className="bg-orange-50/60 p-4 sm:p-5 rounded-2xl border border-orange-200/80 space-y-3">
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-orange-600" />
              <h4 className="text-xs font-black text-slate-900">영수증 QR 코드 인쇄 설정 (확장)</h4>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">QR 코드 유형</label>
                <select
                  value={settings.qrType}
                  onChange={e => setSettings(s => ({ ...s, qrType: e.target.value as any }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold bg-white text-slate-800 outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="NONE">사용 안 함</option>
                  <option value="REVIEW">네이버 영수증 리뷰 작성</option>
                  <option value="WIFI">Wi-Fi 접속 연결</option>
                  <option value="CUSTOM">직접 URL 입력</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">QR 링크 / 이동 URL</label>
                <input
                  type="text"
                  disabled={settings.qrType === "NONE"}
                  value={settings.qrUrl}
                  onChange={e => setSettings(s => ({ ...s, qrUrl: e.target.value }))}
                  placeholder="https://..."
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium bg-white text-slate-800 outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-slate-100"
                />
              </div>
            </div>

            {settings.qrType !== "NONE" && (
              <div className="space-y-1 pt-1">
                <label className="text-[11px] font-bold text-slate-600">QR 하단 혜택/안내 문구</label>
                <input
                  type="text"
                  value={settings.qrLabel}
                  onChange={e => setSettings(s => ({ ...s, qrLabel: e.target.value }))}
                  placeholder="예: 🎁 영수증 리뷰 작성 시 음료수 1캔 서비스!"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold bg-white text-slate-800 outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-2xl text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer border-0 disabled:bg-slate-400"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "저장 중..." : "영수증 인쇄 설정 저장하기"}</span>
          </button>
        </div>

        {/* 오른쪽 5열: 실시간 영수증 라이브 미리보기 (Live Receipt Preview) */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="w-full max-w-[340px] space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-black text-slate-600 flex items-center gap-1">
                <span>👁️ 영수증 인쇄 미리보기</span>
              </span>
              <span className="text-[10px] font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-md">
                {settings.paperWidth} 모드
              </span>
            </div>

            {/* 영수증 종이 가상 카드 */}
            <div 
              className={`bg-white border-2 border-dashed border-slate-300 shadow-lg p-5 font-mono text-slate-800 mx-auto transition-all duration-200 ${
                settings.paperWidth === "58mm" ? "w-[240px] text-[10px]" : "w-[300px] text-xs"
              }`}
            >
              {/* 영수증 상단 샘플 */}
              <div className="text-center border-b-2 border-black pb-3 mb-3">
                <p className="font-black text-base tracking-tight">테이블 1번 수주 영수증</p>
                <p className="text-[9px] text-slate-500">2026. 08. 14. 오후 02:30</p>
              </div>

              {/* 영수증 품목 샘플 */}
              <div className="space-y-2 border-b border-dashed border-slate-400 pb-3 mb-3">
                <div className="flex justify-between font-bold">
                  <span>1차 - 로라 플레이트 1개</span>
                  <span>110,000원</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>2차 - 음료/추가 2개</span>
                  <span>10,000원</span>
                </div>
              </div>

              <div className="flex justify-between font-black text-sm border-b-2 border-black pb-3 mb-3">
                <span>누적 총 결제액</span>
                <span>120,000원</span>
              </div>

              {/* 영수증 하단 커스텀 영역 (실시간 렌더링) */}
              <div className="text-center space-y-3 pt-1">
                
                {/* 커스텀 인사말 */}
                {settings.customMessage && (
                  <p className="font-bold text-slate-800 leading-snug">{settings.customMessage}</p>
                )}

                {/* 매장 안내 문구 (줄바꿈) */}
                {settings.noticeText && (
                  <div className="bg-slate-50 p-2 rounded border border-slate-200 text-[10px] text-slate-600 leading-relaxed whitespace-pre-line text-left">
                    {settings.noticeText}
                  </div>
                )}

                {/* 사업자 프로필 */}
                {settings.showCompanyProfile && (
                  <div className="text-[9px] text-slate-500 border-t border-dotted border-slate-300 pt-2 space-y-0.5">
                    <p>주식회사 이지데스크 | 대표: 홍길동</p>
                    <p>사업자번호: 123-45-67890 | TEL: 02-123-4567</p>
                  </div>
                )}

                {/* QR 코드 실시간 이미지 표출 */}
                {settings.qrType !== "NONE" && settings.qrUrl && (
                  <div className="pt-2 border-t border-slate-200 flex flex-col items-center space-y-1">
                    <img 
                      src={getQrImageUrl(settings.qrUrl)} 
                      alt="Receipt QR" 
                      className="w-20 h-20 border p-1 bg-white"
                    />
                    {settings.qrLabel && (
                      <p className="text-[9px] font-black text-orange-600">{settings.qrLabel}</p>
                    )}
                  </div>
                )}
              </div>

            </div>

            <p className="text-[10px] text-center text-slate-400 font-medium">
              * 위 미리보기는 실물 감열지 영수증 출력 모스에 맞춰 100% 동일하게 인쇄됩니다.
            </p>
          </div>
        </div>

      </form>

    </div>
  );
}
