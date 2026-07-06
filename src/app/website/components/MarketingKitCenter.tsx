import React from "react";
import { 
  Download, QrCode, ShieldCheck, ExternalLink, Copy, Check, Heart 
} from "lucide-react";
import { WebsiteConfig } from "../types";

interface MarketingKitCenterProps {
  config: WebsiteConfig;
  qrCodeDataUrl: string;
  copiedLink: boolean;
  copiedSms: boolean;
  copyToClipboard: (text: string, type: "link" | "sms") => void;
}

export const MarketingKitCenter: React.FC<MarketingKitCenterProps> = ({
  config,
  qrCodeDataUrl,
  copiedLink,
  copiedSms,
  copyToClipboard,
}) => {
  const shortUrl = `http://${config.customDomain}`;
  const smsMarketingText = `[${config.title}] AI 홈페이지 오픈 안내!\n\n저희 매장의 새로운 소식과 상품 리스트를 모바일에서 편하게 둘러보고 즉시 예약해 보세요.\n\n🔗 모바일 홈페이지 바로가기:\n${shortUrl}\n\n📞 문의: ${config.contactPhone}`;

  return (
    <div className="mt-8 bg-white border border-slate-100 rounded-3xl p-6 relative z-10 shadow-sm hover:shadow-md transition-all backdrop-blur-md shrink-0 text-slate-800">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 가상 URL 및 QR 코드 제어 패널 */}
        <div className="flex flex-col sm:flex-row items-center gap-6 bg-slate-50 border border-slate-200/60 p-5 rounded-3xl shadow-inner w-full text-left">
          {/* 좌측 QR 코드 프리뷰 카드 */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shrink-0 text-center relative group shadow-sm">
            {qrCodeDataUrl ? (
              <img
                src={qrCodeDataUrl}
                alt="EGDESK QR Code"
                className="w-[100px] h-[100px] rounded-lg transition-transform group-hover:scale-105"
              />
            ) : (
              <div className="w-[100px] h-[100px] bg-slate-200 rounded-lg flex items-center justify-center">
                <QrCode className="w-8 h-8 text-slate-400 animate-pulse" />
              </div>
            )}
            <a
              href={qrCodeDataUrl}
              download={`${config.title}_QR.png`}
              className="mt-3 inline-flex items-center gap-1 text-[10px] font-black text-pink-600 hover:text-pink-500 tracking-wider uppercase transition-colors cursor-pointer border-0 bg-transparent p-0 font-sans"
            >
              <Download className="w-3.5 h-3.5" /> 다운로드
            </a>
          </div>

          {/* 중간 텍스트 및 단축 URL 정보 */}
          <div className="flex-1 text-center sm:text-left min-w-0">
            <span className="bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-3 py-1 rounded-full border border-emerald-200 shadow-sm inline-flex items-center gap-1.5 mb-2.5">
              <ShieldCheck className="w-3.5 h-3.5" /> 제작 및 배포 서버 실시간 활성화됨
            </span>
            <h2 className="text-xl font-extrabold text-slate-800 mb-1.5">
              모바일 단축 URL 및 매장 QR 코드 발급
            </h2>
            <p className="text-slate-500 text-xs leading-relaxed mb-3 font-medium">
              이지데스크가 발급한 가상 주소지입니다. 해당 링크를 QR 코드로 매장 테이블이나 리플렛에 인쇄해 배치하면, 손님이 폰으로 스캔하여 예약을 즉시 등록할 수 있습니다.
            </p>

            {/* 주소 복사란 */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
              <div className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between gap-2 overflow-hidden shadow-inner font-medium">
                <span className="text-xs text-slate-655 font-mono select-all truncate font-medium">
                  {shortUrl}
                </span>
                <button
                  type="button"
                  onClick={() => window.open(shortUrl, "_blank")}
                  className="p-0 border-0 bg-transparent cursor-pointer text-slate-400 hover:text-slate-655"
                >
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(shortUrl, "link")}
                className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-extrabold py-3 px-5 rounded-xl transition-all flex items-center justify-center gap-1 shadow shrink-0 active:scale-95 border-0 cursor-pointer"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? "복사완료" : "주소 복사"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 우측 웰컴 홍보문자 SMS 마케팅 연동 모듈 */}
        <div className="bg-slate-50 border border-slate-200 p-5 rounded-3xl w-full flex flex-col justify-between shadow-inner text-left">
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Heart className="w-4 h-4 text-pink-500 fill-pink-500 animate-bounce" />
              <h3 className="text-xs font-black tracking-wider text-pink-600 uppercase">무료 홍보 문자 연동 키트</h3>
            </div>
            <p className="text-slate-500 text-[10.5px] leading-relaxed mb-3 font-medium">
              방금 빌드한 모바일 홈페이지의 URL과 소개 텍스트를 담아 고객들에게 발송할 수 있는 **마케팅 문자 서식**이 동적 연동되었습니다. 단추를 눌러 복사하여 전송해 보세요.
            </p>

            {/* 문자 내용 프리뷰 텍스트 박스 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 text-[10.5px] leading-relaxed text-slate-600 font-mono shadow-inner max-h-[105px] overflow-y-auto no-scrollbar font-medium whitespace-pre-line text-left">
              {smsMarketingText}
            </div>
          </div>

          <button
            type="button"
            onClick={() => copyToClipboard(smsMarketingText, "sms")}
            className="w-full mt-4 bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-95 text-white text-xs font-extrabold py-3 px-5 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95 border-0 cursor-pointer"
          >
            {copiedSms ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedSms ? "홍보문자 복사완료! ✨" : "마케팅용 SMS 홍보 서식 클립보드 복사"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
