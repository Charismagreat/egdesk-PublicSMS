"use client";

import { apiFetch } from '@/lib/api';
import { useState, useEffect } from "react";
import { MessageSquare, Save, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

export default function SmsLimitSettingsCard() {
  const [limit, setLimit] = useState<number>(150); // 기본값 150건
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 현재 설정된 일일 제한 건수 가져오기
  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await apiFetch("/api/settings?key=daily_sms_limit");
        const data = await res.json();
        if (data.success && data.value !== null) {
          const fetchedLimit = Number(data.value);
          if (!isNaN(fetchedLimit)) {
            setLimit(fetchedLimit);
          }
        }
      } catch (err) {
        console.error("SMS 한도 설정 로드 실패:", err);
        setMessage({ type: "error", text: "설정을 불러오는 중 오류가 발생했습니다." });
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  // 설정 저장하기
  const handleSave = async () => {
    if (limit < 1 || limit > 450) {
      setMessage({ type: "error", text: "일일 발송 제한량은 1건에서 450건 사이여야 합니다." });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const res = await apiFetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "daily_sms_limit",
          value: String(limit),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: "일일 문자 발송 한도 설정이 성공적으로 저장되었습니다." });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: "error", text: data.error || "설정 저장에 실패했습니다." });
      }
    } catch (err) {
      console.error("SMS 한도 설정 저장 실패:", err);
      setMessage({ type: "error", text: "서버와 연결 중 오류가 발생했습니다." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 text-slate-400 animate-spin mr-2" />
        <span className="text-slate-500 font-semibold text-sm">SMS 발송 한도 설정을 불러오고 있습니다...</span>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
      {/* 카드 헤더 */}
      <div className="flex items-center justify-between border-b pb-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500 border border-indigo-100 shadow-sm">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">일일 무료 문자 발송 제한 설정</h3>
            <p className="text-xs text-slate-400 font-medium">통신망 차단 및 스팸 등록 방지를 위한 안전 일일 발송 한도를 설정합니다.</p>
          </div>
        </div>
        <span className="text-xs bg-indigo-50 text-indigo-600 font-bold px-2.5 py-1 rounded-full border border-indigo-100/50">
          안전 가드 작동중
        </span>
      </div>

      {/* 설정 폼 및 제어 파트 */}
      <div className="space-y-6">
        <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-100 flex flex-col md:flex-row items-center md:justify-between gap-6">
          <div className="flex-1 w-full space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                일일 발송 제한 건수
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={1}
                  max={450}
                  value={limit}
                  onChange={(e) => {
                    const val = Math.min(450, Math.max(1, Number(e.target.value)));
                    setLimit(isNaN(val) ? 150 : val);
                  }}
                  className="w-20 px-2.5 py-1.5 border border-slate-200 rounded-xl text-center font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                />
                <span className="text-slate-800 font-bold text-sm">건</span>
              </div>
            </div>
            
            {/* 슬라이더 제어 */}
            <div className="pt-3">
              <input
                type="range"
                min={1}
                max={450}
                step={5}
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-bold px-1 mt-1">
                <span>1건</span>
                <span>150건 (권장)</span>
                <span>300건</span>
                <span>450건 (최대)</span>
              </div>
            </div>
          </div>
        </div>

        {/* 안내 문구 */}
        <div className="flex gap-2.5 bg-indigo-50/50 border border-indigo-100 p-3.5 rounded-2xl">
          <AlertCircle className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
          <div className="text-xs text-indigo-700 leading-relaxed font-medium">
            <p className="font-bold mb-0.5">⚠️ 안전한 발송을 위한 권장 사항</p>
            <p>이동통신사의 개인 무료 문자 요금제는 일반적으로 하루 <strong>150건</strong>을 상한선으로 제한하고 있습니다.</p>
            <p className="mt-1">한도를 최대 <strong>450건</strong>까지 조절할 수 있으나, 단시간에 과다 발송 시 통신사에서 차단 및 스팸 신고 조치가 적용될 수 있으므로 분산 발송을 권장합니다.</p>
          </div>
        </div>

        {/* 메시지 및 저장 피드백 */}
        {message && (
          <div
            className={`flex items-center gap-2 p-3.5 rounded-xl border text-xs font-semibold ${
              message.type === "success"
                ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                : "bg-rose-50 border-rose-100 text-rose-700"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* 저장 버튼 */}
        <div className="flex justify-end pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-bold transition-all border-0 shadow-md ${
              saving
                ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                : "bg-slate-900 text-white hover:bg-slate-800 active:scale-95 cursor-pointer shadow-slate-900/10"
            }`}
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>설정 저장하기</span>
          </button>
        </div>
      </div>
    </div>
  );
}
