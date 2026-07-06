"use client";

import { apiFetch } from '@/lib/api';
import React, { useState, useEffect } from "react";
import { Mail, Shield, Server, Key, Sparkles, RefreshCw, Send, CheckCircle2, AlertTriangle, Eye, EyeOff, Info } from "lucide-react";

export default function SmtpSettingsCard() {
  const [smtpHost, setSmtpHost] = useState("smtp.gmail.com");
  const [smtpPort, setSmtpPort] = useState("465");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [testEmail, setTestEmail] = useState("");
  
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

        const host = await fetchVal("email_smtp_host");
        const port = await fetchVal("email_smtp_port");
        const user = await fetchVal("email_smtp_user");
        const pass = await fetchVal("email_smtp_pass");

        if (host) setSmtpHost(host);
        if (port) setSmtpPort(port);
        if (user) setSmtpUser(user);
        if (pass) setSmtpPass(pass);
      } catch (err) {
        console.error("SMTP 설정 로드 실패:", err);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      setMessage({ type: "error", text: "모든 SMTP 필수 입력값을 기입해 주세요." });
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
        saveVal("email_smtp_host", smtpHost),
        saveVal("email_smtp_port", smtpPort),
        saveVal("email_smtp_user", smtpUser),
        saveVal("email_smtp_pass", smtpPass)
      ]);

      setMessage({ type: "success", text: "발송 메일 SMTP 계정이 데이터베이스에 성공적으로 영속 저장되었습니다. 🟢" });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error("SMTP 저장 오류:", err);
      setMessage({ type: "error", text: "설정 저장 도중 서버 오류가 발생했습니다." });
    } finally {
      setLoading(false);
    }
  };

  const handleTestMail = async () => {
    setTesting(true);
    setTestMessage(null);

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass || !testEmail) {
      setTestMessage({ type: "error", text: "SMTP 설정 값과 테스트용 수신 메일 주소를 모두 채워주세요." });
      setTesting(false);
      return;
    }

    try {
      const res = await apiFetch("/api/settings/smtp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: smtpHost,
          port: smtpPort,
          user: smtpUser,
          pass: smtpPass,
          to: testEmail
        })
      });
      const data = await res.json();
      if (data.success) {
        setTestMessage({ type: "success", text: "SMTP 연결 및 테스트 메일 발송에 완벽하게 성공했습니다! 🟢" });
      } else {
        setTestMessage({ type: "error", text: `연결 실패: ${data.error}` });
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
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-indigo-50/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100 shadow-sm shrink-0">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-[16px] font-bold text-slate-800 flex items-center gap-2">
              발송 메일 SMTP 계정 설정
              <span className="text-[10px] font-extrabold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100">
                정식 메일 서버 연동
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">직원의 모바일 명함 전송이나 시스템 안내 메일 발송 시 활용될 정식 SMTP 발송 메일 서버를 등록합니다.</p>
          </div>
        </div>
        <span className="text-xs bg-emerald-50 text-emerald-700 font-bold px-2.5 py-1 rounded-full border border-emerald-100">
          오직 DB 연동
        </span>
      </div>

      {/* 설정 폼 */}
      <div className="p-6 space-y-6">
        
        {/* 구글(Gmail) 연동 전제 안내 가이드 */}
        <div className="bg-blue-50/40 border border-blue-100 rounded-xl p-4.5 space-y-2.5">
          <span className="text-[10px] font-black text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            구글(Gmail) 발송 계정 연동 가이드
          </span>
          <div className="text-[11px] text-blue-950/80 leading-relaxed space-y-1.5">
            <p>본 시스템은 안정적인 연동을 위해 <strong>구글(Gmail) 서비스</strong>를 기본 권장합니다.</p>
            <ol className="list-decimal pl-4.5 space-y-1">
              <li>사용할 구글 계정으로 로그인한 뒤, <strong>[Google 계정 관리 &gt; 보안]</strong> 메뉴로 이동합니다.</li>
              <li>구글 로그인 영역에서 <strong>[2단계 인증]</strong>을 반드시 활성화합니다.</li>
              <li>2단계 인증 상세 페이지 하단의 <strong>[앱 비밀번호]</strong> 메뉴로 이동합니다.</li>
              <li>앱 이름을 <code className="bg-white/80 px-1 border border-slate-200 rounded text-indigo-600 font-bold">EGDesk</code> 등으로 적은 뒤 생성 버튼을 누르면 <strong>16자리의 영문 임시 비밀번호</strong>가 생성됩니다.</li>
              <li>생성된 16자리 암호(공백 제외)를 하단의 <strong>발송 이메일 비밀번호</strong> 필드에 기입해 주세요.</li>
            </ol>
            <p className="mt-1 text-slate-500">※ Gmail 연동 시 호스트는 <code className="bg-white/80 px-1 rounded border">smtp.gmail.com</code>, 포트는 SSL 보안을 위해 <code className="bg-white/80 px-1 rounded border">465</code>를 사용합니다.</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* SMTP 호스트 */}
            <div className="space-y-1.5 text-left">
              <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <Server className="w-3.5 h-3.5" /> SMTP 서버 호스트
              </label>
              <input 
                type="text" 
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3.5 py-2 text-xs font-bold focus:border-indigo-500 focus:outline-none bg-slate-50/50"
                placeholder="smtp.gmail.com"
                required
              />
            </div>

            {/* SMTP 포트 */}
            <div className="space-y-1.5 text-left">
              <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <Server className="w-3.5 h-3.5" /> SMTP 서버 포트
              </label>
              <input 
                type="text" 
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3.5 py-2 text-xs font-bold focus:border-indigo-500 focus:outline-none bg-slate-50/50"
                placeholder="465 (또는 587)"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* SMTP User */}
            <div className="space-y-1.5 text-left">
              <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" /> 발송용 이메일 주소 (ID)
              </label>
              <input 
                type="email" 
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3.5 py-2 text-xs font-bold focus:border-indigo-500 focus:outline-none bg-slate-50/50"
                placeholder="example@gmail.com"
                required
              />
            </div>

            {/* SMTP Pass */}
            <div className="space-y-1.5 text-left relative">
              <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <Key className="w-3.5 h-3.5" /> 발송 이메일 비밀번호 (앱 비밀번호)
              </label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={smtpPass}
                  onChange={(e) => setSmtpPass(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg pl-3.5 pr-10 py-2 text-xs font-bold focus:border-indigo-500 focus:outline-none bg-slate-50/50"
                  placeholder="구글 앱 비밀번호 16자리"
                  required
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
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-xs font-extrabold transition-all shadow-sm flex items-center gap-1.5"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
              <span>SMTP 설정 정보 저장</span>
            </button>
          </div>
        </form>

        {/* 🧪 메일 실시간 발송 테스트 영역 */}
        <div className="border-t border-slate-100 pt-6 mt-6 space-y-4">
          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 text-left">
            <Send className="w-4 h-4 text-indigo-600" />
            실시간 메일 연동 테스트
          </h4>
          <p className="text-[11px] text-slate-400 text-left">
            입력된 설정을 바탕으로 실제 메일이 전송되는지 확인하기 위해 본인의 또 다른 이메일 주소로 테스트 이메일을 발송해 봅니다.
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            <input 
              type="email" 
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="flex-1 border border-slate-200 rounded-lg px-3.5 py-2 text-xs font-bold focus:border-indigo-500 focus:outline-none bg-slate-50/50"
              placeholder="테스트 메일을 수신할 이메일 주소"
            />
            <button
              type="button"
              onClick={handleTestMail}
              disabled={testing}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white disabled:bg-slate-400 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shrink-0"
            >
              {testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>테스트 메일 전송</span>
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
