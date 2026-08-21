"use client";

import React, { useState, useEffect } from "react";
import { Mail, CheckCircle2, RefreshCw, Send, Inbox, ShieldCheck, ArrowRight, Zap, ExternalLink } from "lucide-react";
import { apiFetch } from "@/lib/api";

export default function DriveGmailManager() {
  const [gmailInfo, setGmailInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchGmailStatus = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/google-drive/gmail");
      const data = await res.json();
      if (data.success) {
        setGmailInfo(data);
      }
    } catch (err) {
      console.error("Fetch Gmail status error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGmailStatus();
  }, []);

  const isConnected = gmailInfo?.isConnected;

  return (
    <div className="space-y-6">
      {/* 1. G메일 연동 상태 카드 */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">연동 G메일(Gmail) 계정 관제</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Google Workspace 및 사내 G메일 계정을 연동하여 수발신 메일 모니터링 및 AI 자동 업무를 지원합니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${
              isConnected ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-slate-100 text-slate-600"
            }`}>
              <CheckCircle2 className={`w-4 h-4 ${isConnected ? "text-emerald-600" : "text-slate-400"}`} />
              <span>{isConnected ? "G메일 실시간 연동됨" : "인증 대기 중"}</span>
            </div>

            <button
              onClick={fetchGmailStatus}
              disabled={loading}
              className="p-2 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              title="새로고침"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
            <span className="text-xs font-bold text-slate-400 block mb-1">연동된 이메일 계정</span>
            <span className="font-bold text-slate-800 text-sm font-mono truncate block">
              {gmailInfo?.email || "Google 계정 연동 시 자동 할당"}
            </span>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
            <span className="text-xs font-bold text-slate-400 block mb-1">메일 동기화 엔진</span>
            <span className="font-bold text-emerald-600 text-sm block">
              {gmailInfo?.syncStatus || "정상 가동 중"}
            </span>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
            <span className="text-xs font-bold text-slate-400 block mb-1">최근 상태 점검 시각</span>
            <span className="font-bold text-slate-700 text-xs font-mono block mt-1">
              {gmailInfo?.lastSyncedAt ? new Date(gmailInfo.lastSyncedAt).toLocaleTimeString() : "-"}
            </span>
          </div>
        </div>
      </div>

      {/* 2. G메일 기반 AI 자동화 기능 카드 */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h4 className="font-bold text-slate-800 text-xs flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            G메일 스마트 연동 자동화 기능
          </h4>
          <a
            href="/mail-management-ai"
            className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
          >
            <span>메일 관리 AI로 이동</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-100 space-y-2">
            <div className="flex items-center gap-2 text-rose-700 font-bold text-xs">
              <Inbox className="w-4 h-4" />
              <span>첨부파일 자동 아카이빙</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              수신 메일의 견적서, 발주서, 영수증, 통관 서류 첨부파일을 감지하여 구글 드라이브 및 사내 스냅태스크로 자동 저장합니다.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-2">
            <div className="flex items-center gap-2 text-blue-700 font-bold text-xs">
              <Send className="w-4 h-4" />
              <span>AI 자동 답장 및 안내 메일</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              거래처 견적 요청 및 고객 문의 메일을 분석하여 최적의 초안을 생성하고 원터치 발송을 지원합니다.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 space-y-2">
            <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs">
              <ShieldCheck className="w-4 h-4" />
              <span>스팸 및 피싱 메일 감지</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              위험 링크 및 사기성 메일을 사전에 필터링하여 임직원 업무 보안을 강화합니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
