"use client";

import { apiFetch } from '@/lib/api';
import { useState, useEffect } from "react";
import { Coins, Save, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

export default function PointSettingsCard() {
  const [rate, setRate] = useState<number>(1); // 기본값 1%
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 현재 설정된 적립률 가져오기
  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await apiFetch("/api/settings?key=point_earning_rate");
        const data = await res.json();
        if (data.success && data.value !== null) {
          const fetchedRate = Number(data.value);
          if (!isNaN(fetchedRate)) {
            setRate(fetchedRate);
          }
        }
      } catch (err) {
        console.error("포인트 설정 로드 실패:", err);
        setMessage({ type: "error", text: "설정을 불러오는 중 오류가 발생했습니다." });
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  // 설정 저장하기
  const handleSave = async () => {
    if (rate < 0 || rate > 20) {
      setMessage({ type: "error", text: "적립 비율은 0%에서 20% 사이여야 합니다." });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const res = await apiFetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "point_earning_rate",
          value: String(rate),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: "포인트 적립 비율 설정이 성공적으로 저장되었습니다." });
        // 3초 후 성공 메시지 사라지게 처리
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: "error", text: data.error || "설정 저장에 실패했습니다." });
      }
    } catch (err) {
      console.error("포인트 설정 저장 실패:", err);
      setMessage({ type: "error", text: "서버와 연결 중 오류가 발생했습니다." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 text-slate-400 animate-spin mr-2" />
        <span className="text-slate-500 font-semibold text-sm">포인트 적립 설정을 불러오고 있습니다...</span>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
      {/* 카드 헤더 */}
      <div className="flex items-center justify-between border-b pb-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 border border-amber-100 shadow-sm">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">단골 고객 포인트 적립 설정</h3>
            <p className="text-xs text-slate-400 font-medium">고객 구매 시 적립해 줄 실결제액 대비 포인트 비율을 직접 지정합니다.</p>
          </div>
        </div>
        <span className="text-xs bg-slate-100 text-slate-600 font-bold px-2.5 py-1 rounded-full border border-slate-200/50">
          실시간 연동
        </span>
      </div>

      {/* 설정 폼 및 제어 파트 */}
      <div className="space-y-6">
        <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-100 flex flex-col md:flex-row items-center md:justify-between gap-6">
          <div className="flex-1 w-full space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                포인트 적립 비율
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={rate}
                  onChange={(e) => {
                    const val = Math.min(20, Math.max(0, Number(e.target.value)));
                    setRate(isNaN(val) ? 0 : val);
                  }}
                  className="w-16 px-2.5 py-1.5 border border-slate-200 rounded-xl text-center font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                />
                <span className="text-slate-800 font-bold text-sm">%</span>
              </div>
            </div>
            
            {/* 슬라이더 제어 */}
            <div className="pt-3">
              <input
                type="range"
                min={0}
                max={20}
                step={1}
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-bold px-1 mt-1">
                <span>0% (적립 정지)</span>
                <span>5%</span>
                <span>10%</span>
                <span>15%</span>
                <span>20% (최대)</span>
              </div>
            </div>
          </div>
        </div>

        {/* 안내 문구 */}
        <div className="flex gap-2.5 bg-amber-50/50 border border-amber-100 p-3.5 rounded-2xl">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-700 leading-relaxed font-medium">
            <p className="font-bold mb-0.5">💡 알아두세요!</p>
            <p>적립 비율을 <strong>0%</strong>로 입력 시 단골 적립 시스템이 일시 정지되며, 고객용 주문 화면에서도 예상 적립금 뱃지가 표시되지 않습니다.</p>
            <p className="mt-1">비율을 변경하면 <strong>테이블오더</strong>와 <strong>온라인 쇼핑몰</strong>의 예상 적립금 노출과 실제 적립금이 즉각적으로 변경 적용됩니다.</p>
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
