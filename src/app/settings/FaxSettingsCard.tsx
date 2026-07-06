"use client";

import { apiFetch } from '@/lib/api';
import React, { useState, useEffect } from "react";
import { Printer, Shield, Key, Sparkles, RefreshCw, Send, CheckCircle2, AlertTriangle, Eye, EyeOff, Info, Check } from "lucide-react";

export default function FaxSettingsCard() {
  const [faxEnable, setFaxEnable] = useState(false);
  const [faxProvider, setFaxProvider] = useState("popbill");
  const [faxLinkId, setFaxLinkId] = useState("");
  const [faxApiKey, setFaxApiKey] = useState("");
  const [faxSenderNumber, setFaxSenderNumber] = useState("");
  const [testFaxNumber, setTestFaxNumber] = useState("");
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [testMessage, setTestMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    // 1. 데이터베이스에서 기존 설정 불러오기
    async function loadSettings() {
      try {
        const fetchVal = async (key: string) => {
          const res = await apiFetch(`/api/settings?key=${key}`);
          const data = await res.json();
          return data.success && data.value ? data.value : "";
        };

        const enable = await fetchVal("fax_enable");
        const provider = await fetchVal("fax_api_provider");
        const linkId = await fetchVal("fax_link_id");
        const apiKey = await fetchVal("fax_api_key");
        const senderNumber = await fetchVal("fax_sender_number");

        setFaxEnable(enable === "1");
        if (provider) setFaxProvider(provider);
        if (linkId) setFaxLinkId(linkId);
        if (apiKey) setFaxApiKey(apiKey);
        if (senderNumber) setFaxSenderNumber(senderNumber);
      } catch (err) {
        console.error("팩스 설정 로드 실패:", err);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (faxEnable && (!faxLinkId || !faxApiKey || !faxSenderNumber)) {
      setMessage({ type: "error", text: "팩스 발신을 활성화하려면 연동 자격 증명(Link ID, API Key, 발신 번호)을 모두 기입해야 합니다." });
      setLoading(false);
      return;
    }

    try {
      const saveVal = async (key: string, value: string) => {
        const res = await apiFetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, value })
        });
        return res.json();
      };

      // 순차적으로 병렬 저장
      await Promise.all([
        saveVal("fax_enable", faxEnable ? "1" : "0"),
        saveVal("fax_api_provider", faxProvider),
        saveVal("fax_link_id", faxLinkId),
        saveVal("fax_api_key", faxApiKey),
        saveVal("fax_sender_number", faxSenderNumber)
      ]);

      setMessage({ type: "success", text: "인터넷 팩스(Fax) 발신 설정 정보가 성공적으로 영속 저장되었습니다. 🟢" });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error("팩스 설정 저장 오류:", err);
      setMessage({ type: "error", text: "설정 저장 도중 서버 오류가 발생했습니다." });
    } finally {
      setLoading(false);
    }
  };

  const handleTestFax = async () => {
    setTesting(true);
    setTestMessage(null);

    if (!faxLinkId || !faxApiKey || !faxSenderNumber || !testFaxNumber) {
      setTestMessage({ type: "error", text: "팩스 API 설정 값과 테스트용 수신 팩스 번호를 모두 채워주세요." });
      setTesting(false);
      return;
    }

    try {
      const res = await apiFetch("/api/settings/fax/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: faxProvider,
          linkId: faxLinkId,
          apiKey: faxApiKey,
          senderNumber: faxSenderNumber,
          to: testFaxNumber
        })
      });
      const data = await res.json();
      if (data.success) {
        setTestMessage({ type: "success", text: data.message || "팩스 발송 시뮬레이션 테스트가 완료되었습니다. 🟢" });
      } else {
        setTestMessage({ type: "error", text: `팩스 전송 실패: ${data.error}` });
      }
    } catch (err: any) {
      setTestMessage({ type: "error", text: `테스트 요청 중 에러 발생: ${err.message}` });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
      
      {/* 카드 헤더 */}
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-emerald-50/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100 shadow-sm shrink-0">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-[16px] font-bold text-slate-800 flex items-center gap-2">
              팩스(Fax) 발신 설정
              <span className="text-[10px] font-extrabold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-100">
                방안 A: 인터넷 팩스 API (SaaS)
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">B2B 거래처로 견적서를 직접 팩스 기기로 발송하기 위한 인터넷 팩스 API 서비스 설정을 제어합니다.</p>
          </div>
        </div>
        <span className="text-xs bg-emerald-50 text-emerald-700 font-bold px-2.5 py-1 rounded-full border border-emerald-100">
          실시간 연동
        </span>
      </div>

      {/* 설정 폼 */}
      <div className="p-6 space-y-6">
        
        {/* 가이드 영역 */}
        <div className="bg-emerald-50/40 border border-emerald-100 rounded-xl p-4.5 space-y-2.5">
          <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            인터넷 팩스(SaaS) 연동 가이드
          </span>
          <div className="text-[11px] text-emerald-950/80 leading-relaxed space-y-1.5">
            <p>본 시스템은 안정적인 팩스 통신 인프라 제공을 위해 <strong>인터넷 팩스 전문 API (예: 팝빌)</strong> 연동을 지원합니다.</p>
            <ol className="list-decimal pl-4.5 space-y-1">
              <li>인터넷 팩스 서비스(Popbill 등)에 회원 가입을 진행합니다.</li>
              <li>마이페이지 또는 개발자 센터에서 <strong>[Link ID]</strong>(가입아이디)와 <strong>[SecretKey]</strong>(인증키)를 발급받습니다.</li>
              <li>인터넷 팩스사 사이트에서 팩스 발신에 사용할 <strong>[공인 발신자 번호]</strong>를 등록 및 승인받습니다.</li>
              <li>발급 및 승인받은 세부 내역을 하단 입력란에 입력한 후 설정을 저장해 주시기 바랍니다.</li>
            </ol>
            <p className="mt-1 text-slate-500">※ 인터넷 팩스 API 발송은 통신사 회선 이용으로 인해 발송 장수당 약간의 연동 크레딧 요금이 발생할 수 있습니다.</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          
          {/* 활성화 토글 */}
          <div className="flex items-center justify-between p-4.5 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2.5">
              <Printer className="w-4 h-4 text-slate-500" />
              <div className="text-left">
                <span className="text-xs font-bold text-slate-800 block">견적서 팩스 발송 기능 활성화</span>
                <span className="text-[10px] text-slate-450 block">활성화 시, 보낼 견적서 모달에서 팩스(FAX) 발송 옵션이 정식 동작합니다.</span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={faxEnable} 
                onChange={(e) => setFaxEnable(e.target.checked)} 
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* API 공급업체 */}
            <div className="space-y-1.5 text-left">
              <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" /> 팩스 API 공급업체
              </label>
              <select
                value={faxProvider}
                onChange={(e) => setFaxProvider(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-xs font-bold focus:border-emerald-500 focus:outline-none bg-slate-50/50"
              >
                <option value="popbill">팝빌 (Popbill - 권장)</option>
                <option value="bizfree">비즈프리 (Bizfree)</option>
              </select>
            </div>

            {/* 링키지 ID */}
            <div className="space-y-1.5 text-left">
              <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" /> 연동 링크 ID (Link ID)
              </label>
              <input 
                type="text" 
                value={faxLinkId}
                onChange={(e) => setFaxLinkId(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3.5 py-2 text-xs font-bold focus:border-emerald-500 focus:outline-none bg-slate-50/50"
                placeholder="팝빌 가입 ID 입력"
                required={faxEnable}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* API 인증키 */}
            <div className="space-y-1.5 text-left relative">
              <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <Key className="w-3.5 h-3.5" /> API 인증키 (SecretKey)
              </label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={faxApiKey}
                  onChange={(e) => setFaxApiKey(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg pl-3.5 pr-10 py-2 text-xs font-bold focus:border-emerald-500 focus:outline-none bg-slate-50/50"
                  placeholder="SecretKey 문자열 입력"
                  required={faxEnable}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* 발신자 번호 */}
            <div className="space-y-1.5 text-left">
              <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <Printer className="w-3.5 h-3.5" /> 공인 발신자 팩스 번호
              </label>
              <input 
                type="text" 
                value={faxSenderNumber}
                onChange={(e) => setFaxSenderNumber(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3.5 py-2 text-xs font-bold focus:border-emerald-500 focus:outline-none bg-slate-50/50"
                placeholder="예: 02-1234-5678"
                required={faxEnable}
              />
            </div>
          </div>

          {/* 저장 피드백 메시지 */}
          {message && (
            <div className={`p-3 rounded-lg border text-xs font-bold text-left flex items-start gap-2 ${
              message.type === "success" 
                ? "bg-emerald-50 border-emerald-100 text-emerald-800" 
                : "bg-rose-50 border-rose-100 text-rose-800"
            }`}>
              {message.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
              <span>{message.text}</span>
            </div>
          )}

          {/* 설정 저장 버튼 */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl text-xs font-extrabold transition-all shadow-sm flex items-center gap-1.5"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>팩스(Fax) 설정 정보 저장</span>
            </button>
          </div>
        </form>

        {/* 🧪 팩스 실시간 발송 테스트 영역 */}
        <div className="border-t border-slate-100 pt-6 mt-6 space-y-4">
          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 text-left">
            <Send className="w-4 h-4 text-emerald-600" />
            실시간 팩스 연동 테스트
          </h4>
          <p className="text-[11px] text-slate-400 text-left">
            입력된 API 설정을 바탕으로 임의의 가상/실제 번호로 테스트 팩스를 송출해 봅니다.
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            <input 
              type="text" 
              value={testFaxNumber}
              onChange={(e) => setTestFaxNumber(e.target.value)}
              className="flex-1 border border-slate-200 rounded-lg px-3.5 py-2 text-xs font-bold focus:border-emerald-500 focus:outline-none bg-slate-50/50"
              placeholder="테스트 팩스를 수신할 팩스 번호 (예: 02-1234-5678)"
            />
            <button
              type="button"
              onClick={handleTestFax}
              disabled={testing}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white disabled:bg-slate-400 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shrink-0"
            >
              {testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>테스트 팩스 송출</span>
            </button>
          </div>

          {/* 테스트 피드백 메시지 */}
          {testMessage && (
            <div className={`p-3 rounded-lg border text-xs font-bold text-left flex items-start gap-2 animate-fade-in ${
              testMessage.type === "success" 
                ? "bg-emerald-50 border-emerald-100 text-emerald-800" 
                : "bg-rose-50 border-rose-100 text-rose-800"
            }`}>
              {testMessage.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
              <span className="break-all">{testMessage.text}</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
