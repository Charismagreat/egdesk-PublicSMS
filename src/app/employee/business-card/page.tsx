"use client";
import { apiFetch } from '@/lib/api';
import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { 
  Camera, User, Building, Phone, Mail, FileText, Check, 
  ArrowLeft, RefreshCw, Smartphone, ChevronDown, ChevronUp, Image as ImageIcon, Send, AlertTriangle
} from "lucide-react";
import Link from "next/link";

interface EmployeeInfo {
  id: number;
  name: string;
  email: string;
  myCardImageUrl: string;
}

interface ParsedCard {
  id: number;
  partnerId: string;
  name: string;
  position: string;
  phone: string;
  email: string;
  company: string;
}

export default function MobileBusinessCardPage() {
  const [employee, setEmployee] = useState<EmployeeInfo | null>(null);
  const [isAccordionOpen, setIsAccordionOpen] = useState(false);
  const [isUploadingMyCard, setIsUploadingMyCard] = useState(false);
  
  // 상대방 명함 OCR 촬영 상태
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrSuccess, setOcrSuccess] = useState(false);
  const [cardImagePreview, setCardImagePreview] = useState<string | null>(null);
  
  // OCR 파싱 데이터 상태
  const [parsedName, setParsedName] = useState("");
  const [parsedPosition, setParsedPosition] = useState("");
  const [parsedPhone, setParsedPhone] = useState("");
  const [parsedEmail, setParsedEmail] = useState("");
  const [parsedCompany, setParsedCompany] = useState("");
  const [contactId, setContactId] = useState<number | null>(null);
  const [partnerId, setPartnerId] = useState("");

  // 토스트 메시지 상태
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "info">("success");

  // SMTP 에러 팝업 모달 상태
  const [smtpError, setSmtpError] = useState<string | null>(null);

  const myCardFileInputRef = useRef<HTMLInputElement>(null);
  const ocrFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 1. 현재 로그인한 직원 세션 데이터 조회
    apiFetch("/api/employee/me")
      .then(res => res.json())
      .then(data => {
        if (data.success && data.user) {
          setEmployee(data.user);
          if (data.isSimulated) {
            showToast("데모 로그인 상태입니다. (시뮬레이션 모드 가동)", "info");
          }
        } else {
          showToast("직원 계정 조회 실패: " + data.error, "error");
        }
      })
      .catch(err => {
        console.error(err);
        showToast("세션 연결 실패", "error");
      });
  }, []);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => {
      setToastMessage("");
    }, 3500);
  };

  // 본인 명함 이미지 업로드 처리 함수
  const handleMyCardUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !employee) return;

    setIsUploadingMyCard(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        const res = await apiFetch("/api/employee/business-card/my-card-setup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            operatorId: employee.id,
            image: base64String
          })
        });
        const data = await res.json();
        if (data.success) {
          setEmployee({
            ...employee,
            myCardImageUrl: data.myCardImageUrl
          });
          showToast("본인 모바일 명함 등록이 성공적으로 완료되었습니다.", "success");
        } else {
          showToast("명함 등록 실패: " + data.error, "error");
        }
      } catch (err: any) {
        showToast("업로드 중 오류 발생: " + err.message, "error");
      } finally {
        setIsUploadingMyCard(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // 상대방 명함 사진 촬영 및 OCR 분석 처리 함수
  const handleOcrCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsOcrProcessing(true);
    setOcrSuccess(false);
    setCardImagePreview(URL.createObjectURL(file));

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        const res = await apiFetch("/api/employee/business-card/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: base64String
          })
        });
        const data = await res.json();
        if (data.success && data.parsed) {
          const p = data.parsed as ParsedCard;
          setParsedName(p.name || "");
          setParsedPosition(p.position || "");
          setParsedPhone(p.phone || "");
          setParsedEmail(p.email || "");
          setParsedCompany(p.company || "");
          setContactId(p.id);
          setPartnerId(p.partnerId);
          setOcrSuccess(true);
          showToast("AI OCR 명함 정보 추출 및 등록에 성공했습니다.", "success");
        } else {
          showToast("분석 오류: " + (data.error || "명함 정보 추출 실패"), "error");
        }
      } catch (err: any) {
        showToast("AI 통신 오류: " + err.message, "error");
      } finally {
        setIsOcrProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // 주소록 연락처 파일(.vcf) 다운로드 실행
  const handleDownloadVcard = () => {
    if (!parsedName) {
      showToast("연락처를 생성할 성명 정보가 없습니다.", "error");
      return;
    }
    const params = new URLSearchParams({
      name: parsedName,
      phone: parsedPhone,
      email: parsedEmail,
      company: parsedCompany,
      position: parsedPosition
    });
    window.location.href = `/api/employee/business-card/vcard?${params.toString()}`;
    showToast("vCard 주소록 파일을 생성하여 저장했습니다.", "success");
  };

  // 상대방에게 내 명함 자동 발송 요청
  const handleSendMyCard = async () => {
    if (!employee) return;
    if (!parsedPhone && !parsedEmail) {
      showToast("전송할 상대방 연락처(휴대폰/이메일)가 없습니다.", "error");
      return;
    }

    if (!employee.myCardImageUrl) {
      showToast("사전에 내 모바일 명함을 먼저 등록해주세요.", "error");
      setIsAccordionOpen(true);
      return;
    }

    try {
      showToast("내 명함을 상대방에게 전송하는 중...", "info");
      const res = await apiFetch("/api/employee/business-card/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operatorId: employee.id,
          targetPhone: parsedPhone,
          targetEmail: parsedEmail,
          targetName: parsedName
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast("상대방에게 문자/이메일 전송에 성공했습니다!", "success");
      } else {
        if (data.error && (data.error.includes("SMTP") || data.error.includes("이메일") || data.error.includes("발송용"))) {
          setSmtpError(data.error);
        } else {
          showToast("전송 실패: " + data.error, "error");
        }
      }
    } catch (err: any) {
      showToast("발송 오류: " + err.message, "error");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans max-w-md mx-auto shadow-xl relative pb-8">
      {/* 1. 모바일용 고품격 헤더 */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-3 flex items-center justify-between shadow-sm">
        <Link href="/" className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <h1 className="text-sm font-black tracking-tight text-slate-900 flex items-center gap-1.5">
          <Smartphone className="w-4 h-4 text-indigo-600 animate-pulse" />
          이지데스크 명함 비서
        </h1>
        {employee ? (
          <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 rounded-full py-1 pl-1.5 pr-2.5">
            <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black uppercase overflow-hidden">
              {employee.myCardImageUrl ? (
                <img src={employee.myCardImageUrl} alt="profile" className="w-full h-full object-cover" />
              ) : (
                employee.name.charAt(0)
              )}
            </div>
            <span className="text-[10px] font-extrabold text-indigo-950">{employee.name}</span>
          </div>
        ) : (
          <div className="w-14 h-5 bg-slate-100 rounded animate-pulse"></div>
        )}
      </header>

      {/* 2. 토스트 팝업 알림 (Toast) */}
      {toastMessage && (
        <div className={`fixed top-14 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-xs p-3.5 rounded-xl border shadow-lg text-xs font-bold leading-normal transition-all duration-300 animate-bounce ${
          toastType === "success" 
            ? "bg-emerald-50 border-emerald-100 text-emerald-800" 
            : toastType === "error" 
              ? "bg-rose-50 border-rose-100 text-rose-800" 
              : "bg-indigo-50 border-indigo-100 text-indigo-800"
        }`}>
          {toastMessage}
        </div>
      )}

      {/* 3. 본인 명함 관리 영역 (접이식 아코디언) */}
      {employee && (
        <section className="bg-white border-b border-slate-100">
          <button 
            onClick={() => setIsAccordionOpen(!isAccordionOpen)}
            className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-indigo-600" />
              내 모바일 명함 파일 관리
              {!employee.myCardImageUrl && (
                <span className="ml-1 text-[9px] font-black text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 animate-pulse">
                  등록 필요
                </span>
              )}
            </span>
            {isAccordionOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          
          {isAccordionOpen && (
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col gap-4">
              <div className="text-[10px] text-slate-500 leading-normal">
                미팅한 상대방에게 문자/이메일로 전송될 본인의 모바일 명함 이미지(명함 앞면 사진 등)를 등록해주세요.
              </div>
              
              {/* 본인 명함 프리뷰 */}
              <div className="w-full aspect-[1.6/1] bg-slate-100 border-2 border-dashed border-slate-200 rounded-xl overflow-hidden relative flex flex-col items-center justify-center text-slate-400">
                {employee.myCardImageUrl ? (
                  <img src={employee.myCardImageUrl} alt="내 명함" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <ImageIcon className="w-8 h-8 stroke-1 mb-1" />
                    <span className="text-[10px] font-bold">등록된 명함 이미지가 없습니다.</span>
                  </>
                )}
                {isUploadingMyCard && (
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin" />
                  </div>
                )}
              </div>

              {/* 본인 명함 업로드 버튼 */}
              <input 
                type="file" 
                accept="image/*" 
                ref={myCardFileInputRef}
                onChange={handleMyCardUpload}
                className="hidden" 
              />
              <button
                type="button"
                onClick={() => myCardFileInputRef.current?.click()}
                className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all w-full text-center shadow"
              >
                {employee.myCardImageUrl ? "내 명함 사진 교체하기" : "내 명함 사진 등록하기"}
              </button>
            </div>
          )}
        </section>
      )}

      {/* 4. 메인 카메라 촬영 & 업로드 영역 */}
      <main className="p-4 flex flex-col gap-5 flex-1 justify-center">
        
        {/* 상대방 명함 촬영 박스 */}
        {!cardImagePreview ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-sm flex flex-col items-center gap-4 relative py-12">
            <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner">
              <Camera className="w-8 h-8" />
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="text-sm font-extrabold text-slate-900">상대방 명함 촬영하기</h2>
              <p className="text-[10px] text-slate-500 leading-relaxed max-w-xs mx-auto">
                명함 앞면을 카메라 앵글 중앙에 맞춰 흔들림 없이 찍어주세요. 촬영 즉시 AI OCR이 정보를 자동 분석합니다.
              </p>
            </div>

            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              ref={ocrFileInputRef}
              onChange={handleOcrCapture}
              className="hidden" 
            />
            <button
              onClick={() => ocrFileInputRef.current?.click()}
              className="mt-2 py-3 px-6 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md active:scale-95 duration-150 transform transition-all flex items-center gap-1.5"
            >
              <Camera className="w-4 h-4" />
              명함 촬영 및 업로드
            </button>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold text-slate-400">촬영된 명함 원본</span>
              <button 
                onClick={() => {
                  setCardImagePreview(null);
                  setOcrSuccess(false);
                }}
                className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> 다시 찍기
              </button>
            </div>
            <div className="w-full aspect-[1.6/1] bg-slate-100 rounded-xl overflow-hidden border border-slate-200 relative">
              <img src={cardImagePreview} alt="상대 명함" className="w-full h-full object-cover" />
              {isOcrProcessing && (
                <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
                  <div className="text-center">
                    <p className="text-xs font-black text-indigo-950">AI 분석 대행 구동 중</p>
                    <p className="text-[9px] text-slate-500 mt-1">이미지 텍스트 파싱 및 DB 적재 프로세스 진행 중...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 5. OCR 결과 분석 에디터 및 액션 컨트롤 (성공 시 노출) */}
        {ocrSuccess && (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col gap-4">
            <h3 className="text-xs font-black text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-600" />
              AI OCR 판독 정보 컨펌
            </h3>
            
            {/* 파싱 데이터 폼 */}
            <div className="flex flex-col gap-3">
              {/* 성명 */}
              <div className="flex items-center border border-slate-100 rounded-lg px-3 py-1 bg-slate-50/50">
                <User className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-2" />
                <input 
                  type="text" 
                  value={parsedName} 
                  onChange={(e) => setParsedName(e.target.value)} 
                  className="w-full bg-transparent border-0 outline-none text-xs font-bold py-1"
                  placeholder="성명"
                />
              </div>

              {/* 회사명 */}
              <div className="flex items-center border border-slate-100 rounded-lg px-3 py-1 bg-slate-50/50">
                <Building className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-2" />
                <input 
                  type="text" 
                  value={parsedCompany} 
                  onChange={(e) => setParsedCompany(e.target.value)} 
                  className="w-full bg-transparent border-0 outline-none text-xs font-bold py-1"
                  placeholder="회사명"
                />
              </div>

              {/* 직책 */}
              <div className="flex items-center border border-slate-100 rounded-lg px-3 py-1 bg-slate-50/50">
                <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-2" />
                <input 
                  type="text" 
                  value={parsedPosition} 
                  onChange={(e) => setParsedPosition(e.target.value)} 
                  className="w-full bg-transparent border-0 outline-none text-xs font-bold py-1"
                  placeholder="부서 및 직책"
                />
              </div>

              {/* 전화번호 */}
              <div className="flex items-center border border-slate-100 rounded-lg px-3 py-1 bg-slate-50/50">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-2" />
                <input 
                  type="text" 
                  value={parsedPhone} 
                  onChange={(e) => setParsedPhone(e.target.value)} 
                  className="w-full bg-transparent border-0 outline-none text-xs font-bold py-1"
                  placeholder="휴대전화번호"
                />
              </div>

              {/* 이메일 */}
              <div className="flex items-center border border-slate-100 rounded-lg px-3 py-1 bg-slate-50/50">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-2" />
                <input 
                  type="text" 
                  value={parsedEmail} 
                  onChange={(e) => setParsedEmail(e.target.value)} 
                  className="w-full bg-transparent border-0 outline-none text-xs font-bold py-1"
                  placeholder="이메일 주소"
                />
              </div>
            </div>

            {/* 기능 실행 버튼 목록 */}
            <div className="flex flex-col gap-2 mt-2">
              <button
                type="button"
                onClick={handleDownloadVcard}
                className="py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all w-full text-center flex items-center justify-center gap-1.5 shadow"
              >
                <Smartphone className="w-3.5 h-3.5" />
                내 폰 주소록에 자동 추가
              </button>

              <button
                type="button"
                onClick={handleSendMyCard}
                className="py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl text-xs font-bold transition-all w-full text-center flex items-center justify-center gap-1.5 shadow"
              >
                <Send className="w-3.5 h-3.5" />
                내 명함 상대방에게 자동 전송
              </button>
            </div>
          </div>
        )}

      </main>

      {/* 6. SMTP 설정 에러 알림 모달 */}
      {smtpError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-fade-in" onClick={() => setSmtpError(null)}></div>
          <div className="bg-white rounded-2xl w-full max-w-xs shadow-2xl relative z-10 overflow-hidden text-center p-5 border border-slate-100 flex flex-col items-center gap-4 animate-scale-up">
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center shadow-inner shrink-0">
              <AlertTriangle className="w-6 h-6 animate-bounce" />
            </div>
            
            <div className="space-y-1.5 text-left">
              <h3 className="text-sm font-black text-slate-900 text-center">발송 계정 설정 필요</h3>
              <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
                {smtpError}
              </p>
            </div>

            <div className="flex gap-2 w-full mt-1">
              <button
                type="button"
                onClick={() => setSmtpError(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-extrabold transition-all"
              >
                닫기
              </button>
              <Link
                href="/settings"
                className="flex-1 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-extrabold transition-all flex items-center justify-center"
              >
                설정 페이지로 이동
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
