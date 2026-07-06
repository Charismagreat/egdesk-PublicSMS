'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Sparkles, X, Send, RotateCcw, Bot, Terminal, ShieldAlert, Maximize2, Minimize2, Mic, MicOff, Volume2, VolumeX, Camera, Mail, CheckCircle2, User, Phone, Briefcase, RefreshCw, Calendar, DollarSign, Check, FileText, Plus, Layers, MousePointerClick, Video, VideoOff, Scale, ArrowRight, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import html2canvas from 'html2canvas';

// 📂 외부 분기 처리된 AI 프리뷰 카드 컴포넌트 임포트
import FinancialStatementPreviewMessage from './easybot/previews/FinancialStatementPreviewMessage';
import ResumePreviewCard from './easybot/previews/ResumePreviewCard';
import LegalPreviewCard from './easybot/previews/LegalPreviewCard';
import CardPreviewMessage from './easybot/previews/CardPreviewMessage';
import ReceiptPreviewMessage from './easybot/previews/ReceiptPreviewMessage';
import MedicalPreviewCard from './easybot/previews/MedicalPreviewCard';
import RndSpacePreviewCard from './easybot/previews/RndSpacePreviewCard';
import RndLogPreviewCard from './easybot/previews/RndLogPreviewCard';
import InboundPreviewMessage from './easybot/previews/InboundPreviewMessage';
import LicensePreviewMessage from './easybot/previews/LicensePreviewMessage';
import PurchaseInvoicePreviewMessage from './easybot/previews/PurchaseInvoicePreviewMessage';
import InboundEstimatePreviewMessage from './easybot/previews/InboundEstimatePreviewMessage';
import FacilityPlatePreviewMessage from './easybot/previews/FacilityPlatePreviewMessage';
import FacilityChecklistPreviewMessage from './easybot/previews/FacilityChecklistPreviewMessage';
import CompetitorPricePreviewMessage from './easybot/previews/CompetitorPricePreviewMessage';
import InboundExcelPreviewCard from './easybot/previews/InboundExcelPreviewCard';

// ⚓ 커스텀 훅 임포트
import { useEasyBotVoice } from './easybot/hooks/useEasyBotVoice';
import { useEasyBotScreenshot } from './easybot/hooks/useEasyBotScreenshot';
import { useEasyBotChat } from './easybot/hooks/useEasyBotChat';

interface Message {
  role: 'user' | 'bot';
  content: string;
  timestamp: string;
  sql?: string | null;
  sqlSuccess?: boolean | null;
  sqlError?: string | null;
  isCardPhoto?: boolean; // 명함 이미지 썸네일 노출 여부
  cardPhotoBase64?: string; // 명함 이미지 Base64 데이터
  isPdfFile?: boolean; // PDF 파일 노출 여부
  pdfFileName?: string; // PDF 파일명
}

// React 19 무의존성 안전 마크다운 렌더러 컴포넌트 (밝은 색 테마 버전)
function SafeMarkdown({ content }: { content: string }) {
  const router = useRouter(); // Next.js 라우터 훅 연동

  if (!content) return null;

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let currentTable: { headers: string[]; rows: string[][] } | null = null;
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let codeBlockLang = '';

  const parseInlineStyles = (text: string, isUserMessage: boolean = false): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let keyIndex = 0;

    const boldClass = isUserMessage ? "font-extrabold text-white underline decoration-pink-300 underline-offset-2" : "font-bold text-violet-750";
    const codeClass = isUserMessage 
      ? "px-2 py-0.5 rounded bg-white/20 text-white font-mono text-xs border border-white/30" 
      : "px-2 py-0.5 rounded bg-rose-50 text-rose-650 font-mono text-xs border border-rose-100";
    const linkClass = isUserMessage
      ? "text-white underline font-bold hover:opacity-80 transition-opacity cursor-pointer"
      : "text-violet-600 underline font-bold hover:text-violet-850 transition-colors cursor-pointer";

    while (remaining.length > 0) {
      const boldMatch = remaining.match(/\*\*(.*?)\*\*/);
      const codeMatch = remaining.match(/`(.*?)`/);
      const linkMatch = remaining.match(/\[(.*?)\]\((.*?)\)/);

      if (!boldMatch && !codeMatch && !linkMatch) {
        parts.push(<span key={`txt-${keyIndex}`}>{remaining}</span>);
        break;
      }

      const boldIndex = boldMatch ? remaining.indexOf(boldMatch[0]) : Infinity;
      const codeIndex = codeMatch ? remaining.indexOf(codeMatch[0]) : Infinity;
      const linkIndex = linkMatch ? remaining.indexOf(linkMatch[0]) : Infinity;

      const minIndex = Math.min(boldIndex, codeIndex, linkIndex);

      if (minIndex === boldIndex) {
        if (boldIndex > 0) {
          parts.push(<span key={`txt-${keyIndex}`}>{remaining.substring(0, boldIndex)}</span>);
          keyIndex++;
        }
        parts.push(<strong key={`bold-${keyIndex}`} className={boldClass}>{boldMatch![1]}</strong>);
        keyIndex++;
        remaining = remaining.substring(boldIndex + boldMatch![0].length);
      } else if (minIndex === codeIndex) {
        if (codeIndex > 0) {
          parts.push(<span key={`txt-${keyIndex}`}>{remaining.substring(0, codeIndex)}</span>);
          keyIndex++;
        }
        parts.push(
          <code key={`code-${keyIndex}`} className={codeClass}>
            {codeMatch![1]}
          </code>
        );
        keyIndex++;
        remaining = remaining.substring(codeIndex + codeMatch![0].length);
      } else {
        if (linkIndex > 0) {
          parts.push(<span key={`txt-${keyIndex}`}>{remaining.substring(0, linkIndex)}</span>);
          keyIndex++;
        }
        const linkText = linkMatch![1];
        const linkUrl = linkMatch![2];

        const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
          if (!linkUrl.startsWith('http://') && !linkUrl.startsWith('https://')) {
            e.preventDefault();
            router.push(linkUrl);
          }
        };

        parts.push(
          <a key={`link-${keyIndex}`} href={linkUrl} onClick={handleLinkClick} className={linkClass}>
            {linkText}
          </a>
        );
        keyIndex++;
        remaining = remaining.substring(linkIndex + linkMatch![0].length);
      }
    }

    return parts;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('```')) {
      if (inCodeBlock) {
        inCodeBlock = false;
        const codeText = codeBlockContent.join('\n');
        elements.push(
          <div key={`code-block-${i}`} className="my-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-950 font-mono text-xs text-emerald-450 shadow-sm">
            <div className="flex items-center justify-between bg-slate-900/90 px-4 py-2.5 text-[10px] text-slate-400 border-b border-slate-800">
              <span className="flex items-center gap-1.5 text-slate-350 font-semibold">
                <Terminal size={12} className="text-violet-400" />
                {codeBlockLang || 'code'}
              </span>
              <span className="text-slate-500 uppercase tracking-wider font-bold">SQLite Engine</span>
            </div>
            <pre className="p-4 overflow-x-auto leading-relaxed text-slate-250">
              <code>{codeText}</code>
            </pre>
          </div>
        );
        codeBlockContent = [];
        codeBlockLang = '';
      } else {
        inCodeBlock = true;
        codeBlockLang = line.substring(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(lines[i]);
      continue;
    }

    if (line.startsWith('|')) {
      const cells = line.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      
      if (cells.every(c => c.startsWith('-'))) {
        continue;
      }

      if (!currentTable) {
        currentTable = { headers: cells, rows: [] };
      } else {
        currentTable.rows.push(cells);
      }
      continue;
    } else {
      if (currentTable) {
        const tableObj = currentTable;
        currentTable = null;
        elements.push(
          <div key={`table-${i}`} className="my-4 overflow-x-auto rounded-xl border border-slate-150 shadow-sm bg-white">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-150">
                  {tableObj.headers.map((h, idx) => (
                    <th key={`th-${idx}`} className="p-3 font-bold text-slate-700 tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80">
                {tableObj.rows.map((row, rIdx) => (
                  <tr key={`tr-${rIdx}`} className="hover:bg-slate-50/50 transition-colors">
                    {row.map((cell, cIdx) => (
                      <td key={`td-${cIdx}`} className="p-3 text-slate-650 leading-relaxed font-medium">
                        {parseInlineStyles(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
    }

    if (line.startsWith('#')) {
      const depth = line.match(/^#+/)?.[0].length || 1;
      const titleText = line.replace(/^#+\s*/, '');
      const headingClass = depth === 1 
        ? "text-[15px] font-black text-slate-800 mt-5 mb-2 pb-1 border-b border-slate-150" 
        : depth === 2 
        ? "text-sm font-bold text-violet-750 mt-4 mb-1.5" 
        : "text-xs font-bold text-slate-700 mt-3 mb-1";
      
      elements.push(
        <div key={`h-${i}`} className={headingClass}>
          {parseInlineStyles(titleText)}
        </div>
      );
      continue;
    }

    if (line.startsWith('-') || line.startsWith('*')) {
      const listText = line.replace(/^[-*]\s*/, '');
      elements.push(
        <div key={`li-${i}`} className="flex items-start gap-2.5 my-1.5 pl-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-400 mt-1.5 shrink-0" />
          <span className="text-slate-650 leading-relaxed font-medium">{parseInlineStyles(listText)}</span>
        </div>
      );
      continue;
    }

    if (line) {
      elements.push(
        <p key={`p-${i}`} className="my-2 leading-relaxed text-slate-650 font-medium">
          {parseInlineStyles(lines[i])}
        </p>
      );
    }
  }

  // 아직 렌더링되지 않은 잔여 테이블 배출
  if (currentTable) {
    const tableObj = currentTable;
    elements.push(
      <div key="table-final" className="my-4 overflow-x-auto rounded-xl border border-slate-150 shadow-sm bg-white">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-150">
              {tableObj.headers.map((h, idx) => (
                <th key={`th-${idx}`} className="p-3 font-bold text-slate-700 tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/80">
            {tableObj.rows.map((row, rIdx) => (
              <tr key={`tr-${rIdx}`} className="hover:bg-slate-50/50 transition-colors">
                {row.map((cell, cIdx) => (
                  <td key={`td-${cIdx}`} className="p-3 text-slate-650 leading-relaxed font-medium">
                    {parseInlineStyles(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return <div className="space-y-1">{elements}</div>;
}

function UserMarkdown({ content }: { content: string }) {
  if (!content) return null;
  return <p className="leading-relaxed font-bold tracking-wide break-words text-white">{content}</p>;
}

export default function EasyBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [widgetOpacity, setWidgetOpacity] = useState(1.0); // 대화창 투명도 상태 (1.0, 0.8, 0.6, 0.4 순환)
  const [autoGuideEnabled, setAutoGuideEnabled] = useState(true); // 마우스 호버 시 2.5초 후 자동 가이드 설명 모드

  const pathname = usePathname();
  const router = useRouter();

  // ⚓ 커스텀 훅 호출
  const voice = useEasyBotVoice();
  const screenshot = useEasyBotScreenshot();
  const chat = useEasyBotChat({
    voiceEnabled: voice.voiceEnabled,
    speakImportantNotesOnly: voice.speakImportantNotesOnly,
    stopSpeaking: voice.stopSpeaking,
    screenshotBlob: screenshot.screenshotBlob,
    setScreenshotBlob: screenshot.setScreenshotBlob,
    setScreenshotPreview: screenshot.setScreenshotPreview,
    screenRecordBlob: screenshot.screenRecordBlob,
    setScreenRecordBlob: screenshot.setScreenRecordBlob,
    setScreenRecordPreview: screenshot.setScreenRecordPreview
  });

  // 음성 세터 주입
  useEffect(() => {
    voice.setInputValSetter(() => chat.setInputVal);
  }, [chat.setInputVal, voice]);

  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 🧭 마우스 호버 및 입력 포커스 시 data-easybot-hint를 실시간 수집하는 전역 리스너
  useEffect(() => {
    const handleInteraction = (e: Event) => {
      const target = e.target as HTMLElement;
      if (!target) return;
      
      if (target.closest("[data-easybot-widget]")) {
        if (hoverTimerRef.current) {
          clearTimeout(hoverTimerRef.current);
          hoverTimerRef.current = null;
        }
        return;
      }
      
      const hintElement = target.closest("[data-easybot-hint]");
      if (hintElement) {
        const hintText = hintElement.getAttribute("data-easybot-hint");
        if (hintText) {
          (window as any).currentEasyBotHint = hintText;

          if (false && autoGuideEnabled && e.type === "mouseover") {
            if (hoverTimerRef.current) {
              clearTimeout(hoverTimerRef.current);
            }
            hoverTimerRef.current = setTimeout(() => {
              triggerAutoQuery(hintText);
            }, 2500);
          }
        }
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
    };

    window.addEventListener("mouseover", handleInteraction, { passive: true });
    window.addEventListener("focusin", handleInteraction, { passive: true });
    window.addEventListener("mouseout", handleMouseOut, { passive: true });

    return () => {
      window.removeEventListener("mouseover", handleInteraction);
      window.removeEventListener("focusin", handleInteraction);
      window.removeEventListener("mouseout", handleMouseOut);
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
    };
  }, [autoGuideEnabled]);

  const getQueryFromHint = (hint: string): string => {
    const parts = hint.split(":");
    if (parts.length > 0 && parts[0].trim().length < 30) {
      return `이 부분(${parts[0].trim()})은 어떻게 사용해?`;
    }
    return "이 부분은 어떻게 사용해?";
  };

  const triggerAutoQuery = async (hintText: string) => {
    if (typeof window !== 'undefined') {
      (window as any).currentEasyBotHint = hintText;
    }
    setIsOpen(true);
    const autoQuery = getQueryFromHint(hintText);
    await chat.sendUserMessage(autoQuery);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      chat.handleSendMessage(e);
    }
  };

  // 150ms 타이머 대화창 하단 자동 스크롤
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        chat.scrollToBottom();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen, chat.messages]);

  // textarea 높이 자동 맞춤
  useEffect(() => {
    const textarea = chat.textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 100)}px`;
    }
  }, [chat.inputVal]);

  if (
    pathname === '/login' || 
    pathname.startsWith('/interpretation-ai') || 
    pathname.startsWith('/form-management-new/print') || 
    pathname.startsWith('/shared/view') || 
    pathname.startsWith('/store') || 
    pathname.startsWith('/table-order') || 
    pathname.startsWith('/booking') || 
    pathname.startsWith('/m/') || 
    pathname.startsWith('/expenses/mobile-approve') ||
    pathname.startsWith('/employee') ||
    pathname.startsWith('/estimates/web-view') ||
    pathname.startsWith('/estimates/print-pdf') ||
    pathname.startsWith('/estimates/manufacture-webview') ||
    pathname.startsWith('/import-customs/web-view')
  ) {
    return null;
  }

  return (
    <>
      {/* 1. 이지봇 플로팅 트리거 단추 (Harmonic Indigo 그라데이션) */}
      <button
        data-easybot-widget="trigger"
        onClick={() => {
          setIsOpen(!isOpen);
          voice.stopSpeaking();
        }}
        className="ignore-capture fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer focus:outline-none print:hidden"
        style={{
          background: 'linear-gradient(135deg, #7000ff 0%, #bc2a8d 50%, #f91f7f 100%)',
          boxShadow: '0 8px 24px rgba(112, 0, 255, 0.25)'
        }}
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </button>

      {/* 2. 대화창 본체 레이아웃 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            data-easybot-widget="panel"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: widgetOpacity, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 45, scale: 0.95 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            className={`ignore-capture fixed right-6 z-40 flex flex-col overflow-hidden border border-slate-100 bg-white/95 shadow-2xl backdrop-blur-md transition-all duration-200 print:hidden ${
              isMaximized 
                ? 'bottom-24 left-6 top-6 rounded-3xl' 
                : 'bottom-24 h-[640px] max-h-[82vh] w-[390px] rounded-3xl'
            }`}
          >
            {/* 헤더 바 */}
            <div 
              className="bg-white border-b border-slate-50 px-5 py-4.5 flex justify-between items-center shrink-0"
              style={{ userSelect: 'none' }}
            >
              <div className="flex items-center gap-3.5">
                <div 
                  className="flex h-9 w-9 items-center justify-center rounded-2xl text-white shadow-sm"
                  style={{ background: 'linear-gradient(135deg, #7000ff 0%, #b137a4 100%)' }}
                >
                  <Bot size={17} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-800 tracking-wide">이지데스크 AI 이지봇</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-[9px] text-slate-400 font-bold">인공지능 어시스턴트 온라인</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {/* 피드백 전송 버튼 */}
                <button
                  onClick={() => chat.setIsFeedbackOpen(true)}
                  className="p-2.5 rounded-xl text-indigo-500 hover:bg-indigo-50 transition-colors flex items-center gap-1 font-bold text-[10px] cursor-pointer"
                  title="개발사 실시간 건의/버그 제보"
                >
                  <Mail size={12} />
                  <span>피드백</span>
                </button>

                <div className="w-px h-3.5 bg-slate-100 mx-1" />

                {/* 대화창 투명도 순환 스위치 */}
                <button
                  onClick={() => setWidgetOpacity(prev => prev === 1.0 ? 0.8 : prev === 0.8 ? 0.6 : prev === 0.6 ? 0.4 : 1.0)}
                  className="p-2.5 rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-colors flex text-[10px] font-black"
                  title={`투명도 조절 (현재: ${widgetOpacity * 100}%)`}
                >
                  {widgetOpacity === 1.0 ? "불투명" : `투명 ${widgetOpacity}`}
                </button>

                {/* 최대화/이전크기 복원 */}
                <button
                  onClick={() => setIsMaximized(!isMaximized)}
                  className="p-2.5 rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-colors flex"
                  title={isMaximized ? "이전 크기로" : "최대화"}
                >
                  {isMaximized ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                </button>

                {/* 초기화 */}
                <button
                  onClick={() => {
                    chat.setMessages([
                      {
                        role: 'bot',
                        content: '대화 기록이 성공적으로 초기화되었습니다! 무엇이든 물어보세요. 😊',
                        timestamp: '방금 전'
                      }
                    ]);
                    voice.stopSpeaking();
                  }}
                  className="p-2.5 rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-colors flex"
                  title="대화 기록 초기화"
                >
                  <RotateCcw size={15} />
                </button>
                
                {/* 닫기 */}
                <button
                  onClick={() => {
                    setIsOpen(false);
                    voice.stopSpeaking();
                  }}
                  className="p-2.5 rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-colors flex"
                  title="닫기"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* 메시지 보드 영역 */}
            <div className="flex-1 min-h-0 overflow-y-auto p-5 pb-6 space-y-6 bg-[#fafafb] custom-scrollbar pt-6">
              {chat.messages.map((msg, index) => {
                const hasContent = typeof msg.content === 'string';
                const isCardPreview = msg.role === 'bot' && hasContent && msg.content.startsWith('[CARD_PREVIEW:');
                const isLicensePreview = msg.role === 'bot' && hasContent && msg.content.startsWith('[LICENSE_PREVIEW:');
                const isFinancialPreview = msg.role === 'bot' && hasContent && msg.content.startsWith('[FINANCIAL_PREVIEW:');
                const isReceiptPreview = msg.role === 'bot' && hasContent && msg.content.startsWith('[RECEIPT_PREVIEW:');
                const isInboundPreview = msg.role === 'bot' && hasContent && msg.content.startsWith('[INBOUND_PREVIEW:');
                const isResumePreview = msg.role === 'bot' && hasContent && msg.content.startsWith('[RESUME_PREVIEW:');
                const isMedicalPreview = msg.role === 'bot' && hasContent && msg.content.startsWith('[MEDICAL_PREVIEW:');
                const isPurchaseInvoicePreview = msg.role === 'bot' && hasContent && msg.content.startsWith('[PURCHASE_INVOICE_PREVIEW:');
                const isCompetitorPricePreview = msg.role === 'bot' && hasContent && msg.content.startsWith('[COMPETITOR_PRICE_PREVIEW:');
                const isFacilityPlatePreview = msg.role === 'bot' && hasContent && msg.content.startsWith('[FACILITY_PLATE_PREVIEW:');
                const isFacilityChecklistPreview = msg.role === 'bot' && hasContent && msg.content.startsWith('[FACILITY_CHECKLIST_PREVIEW:');
                const isLegalPreview = msg.role === 'bot' && hasContent && msg.content.startsWith('[LEGAL_PREVIEW:');
                const isRndSpacePreview = msg.role === 'bot' && hasContent && msg.content.startsWith('[RND_SPACE_PREVIEW:');
                const isRndLogPreview = msg.role === 'bot' && hasContent && msg.content.startsWith('[RND_LOG_PREVIEW:');
                                const isInboundEstimatePreview = msg.role === 'bot' && hasContent && msg.content.startsWith('[INBOUND_ESTIMATE_PREVIEW:');
                const isInboundExcelPreview = msg.role === 'bot' && hasContent && msg.content.startsWith('[INBOUND_EXCEL_PREVIEW:');
                
                const tagContent = isCardPreview && hasContent
                  ? msg.content.substring(14, msg.content.length - 1) 
                  : isLicensePreview && hasContent
                  ? msg.content.substring(17, msg.content.length - 1)
                  : isReceiptPreview && hasContent
                  ? msg.content.substring(17, msg.content.length - 1) 
                  : isFinancialPreview && hasContent
                  ? msg.content.substring(19, msg.content.length - 1)
                  : isInboundPreview && hasContent
                  ? msg.content.substring(17, msg.content.length - 1)
                  : isResumePreview && hasContent
                  ? msg.content.substring(16, msg.content.length - 1)
                  : isMedicalPreview && hasContent
                  ? msg.content.substring(17, msg.content.length - 1)
                  : isPurchaseInvoicePreview && hasContent
                  ? msg.content.substring(26, msg.content.length - 1)
                  : isCompetitorPricePreview && hasContent
                  ? msg.content.substring(26, msg.content.length - 1)
                  : isFacilityPlatePreview && hasContent
                  ? msg.content.substring(24, msg.content.length - 1)
                  : isFacilityChecklistPreview && hasContent
                  ? msg.content.substring(28, msg.content.length - 1)
                  : isLegalPreview && hasContent
                  ? msg.content.substring(15, msg.content.length - 1)
                  : isRndSpacePreview && hasContent
                  ? msg.content.substring(19, msg.content.length - 1)
                  : isRndLogPreview && hasContent
                  ? msg.content.substring(17, msg.content.length - 1)
                  : isInboundEstimatePreview && hasContent
                  ? msg.content.substring(26, msg.content.length - 1)
                  : isInboundExcelPreview && hasContent
                  ? msg.content.substring(24, msg.content.length - 1)
                  : '';
                const isCustomPreview = isCardPreview || isLicensePreview || isReceiptPreview || isFinancialPreview || isInboundPreview || isResumePreview || isMedicalPreview || isPurchaseInvoicePreview || isCompetitorPricePreview || isFacilityPlatePreview || isFacilityChecklistPreview || isLegalPreview || isRndSpacePreview || isRndLogPreview || isInboundEstimatePreview || isInboundExcelPreview;

                return (
                  <div key={index} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'bot' && (
                      <div 
                        className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm mt-0.5 animate-bounce-subtle"
                        style={{ background: 'linear-gradient(135deg, #7000ff 0%, #b137a4 100%)' }}
                      >
                        <Bot size={15} />
                      </div>
                    )}

                    <div className="flex flex-col max-w-[85%]">
                      <div className={`p-4 rounded-3xl text-xs font-bold leading-relaxed tracking-wide shadow-3xs border transition ${
                        msg.role === 'user'
                          ? 'bg-slate-900 text-white rounded-br-none border-slate-950 font-semibold'
                          : isCustomPreview
                          ? 'bg-transparent border-none shadow-none p-0 !max-w-full'
                          : 'bg-white text-slate-800 rounded-bl-none border-slate-50'
                      }`}>
                        {/* 1. 명함 실물 썸네일 렌더링 지원 (유저 메시지용) */}
                        {msg.isCardPhoto && msg.cardPhotoBase64 && (
                          <div className="mb-2 max-w-[180px] overflow-hidden rounded-xl border border-white/20 shadow-inner bg-black/5">
                            <img src={msg.cardPhotoBase64} alt="명함 업로드 원본" className="w-full h-auto object-contain max-h-[110px]" />
                          </div>
                        )}

                        {/* PDF 업로드 정보 렌더링 지원 (유저 메시지용) */}
                        {msg.isPdfFile && (
                          <div className="mb-2 p-3 max-w-[220px] rounded-xl border border-white/20 bg-white/10 text-white flex items-center gap-2 font-bold select-none">
                            <span className="text-lg">📁</span>
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] truncate leading-tight">{msg.pdfFileName}</p>
                              <p className="text-[8px] opacity-70">PDF 문서</p>
                            </div>
                          </div>
                        )}

                        {/* 2. 일반 텍스트 렌더링 분기 */}
                        {msg.role === 'user' ? (
                          <UserMarkdown content={msg.content} />
                        ) : isCardPreview ? (
                          <CardPreviewMessage tagContent={tagContent} onConfirmSuccess={chat.handleCardConfirmSuccess} />
                        ) : isLicensePreview ? (
                          <LicensePreviewMessage tagContent={tagContent} onConfirmSuccess={chat.handleCardConfirmSuccess} />
                        ) : isReceiptPreview ? (
                          <ReceiptPreviewMessage tagContent={tagContent} />
                        ) : isResumePreview ? (
                          <ResumePreviewCard tagContent={tagContent} onConfirmSuccess={chat.handleCardConfirmSuccess} />
                        ) : isMedicalPreview ? (
                          <MedicalPreviewCard tagContent={tagContent} onConfirmSuccess={chat.handleCardConfirmSuccess} />
                        ) : isFinancialPreview ? (
                          <FinancialStatementPreviewMessage tagContent={tagContent} onConfirmSuccess={chat.handleCardConfirmSuccess} />
                        ) : isInboundPreview ? (
                          <InboundPreviewMessage tagContent={tagContent} onConfirmSuccess={chat.handleCardConfirmSuccess} />
                        ) : isInboundEstimatePreview ? (
                          <InboundEstimatePreviewMessage tagContent={tagContent} onConfirmSuccess={chat.handleCardConfirmSuccess} />
                        ) : isInboundExcelPreview ? (
                          <InboundExcelPreviewCard tagContent={tagContent} onConfirmSuccess={chat.handleCardConfirmSuccess} />
                        ) : isPurchaseInvoicePreview ? (
                          <PurchaseInvoicePreviewMessage tagContent={tagContent} onConfirmSuccess={chat.handleCardConfirmSuccess} />
                        ) : isCompetitorPricePreview ? (
                          <CompetitorPricePreviewMessage tagContent={tagContent} onConfirmSuccess={chat.handleCardConfirmSuccess} />
                        ) : isFacilityPlatePreview ? (
                          <FacilityPlatePreviewMessage tagContent={tagContent} onConfirmSuccess={chat.handleCardConfirmSuccess} />
                        ) : isFacilityChecklistPreview ? (
                          <FacilityChecklistPreviewMessage tagContent={tagContent} onConfirmSuccess={chat.handleCardConfirmSuccess} />
                        ) : isLegalPreview ? (
                          <LegalPreviewCard tagContent={tagContent} onConfirmSuccess={chat.handleCardConfirmSuccess} />
                        ) : isRndSpacePreview ? (
                          <RndSpacePreviewCard tagContent={tagContent} onConfirmSuccess={chat.handleCardConfirmSuccess} />
                        ) : isRndLogPreview ? (
                          <RndLogPreviewCard tagContent={tagContent} onConfirmSuccess={chat.handleCardConfirmSuccess} />
                        ) : (
                          <SafeMarkdown content={msg.content} />
                        )}
                      </div>

                      {/* SQL 디버거 터미널 출력 */}
                      {!isCustomPreview && msg.sql && (
                        <div className="mt-2.5 border border-slate-950 rounded-2xl bg-slate-900 text-slate-100 overflow-hidden shadow-md max-w-sm animate-in fade-in duration-200">
                          <div className="bg-slate-950 px-3.5 py-2 flex items-center justify-between border-b border-slate-800/80">
                            <span className="text-[9px] font-black tracking-widest text-slate-400 flex items-center gap-1.5">
                              <Terminal size={10} className="text-violet-400" />
                              지능형 에이전트 SQL 엔진
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-extrabold ${msg.sqlSuccess ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                              {msg.sqlSuccess ? 'SUCCESS' : 'ERROR'}
                            </span>
                          </div>
                          <div className="p-3.5 space-y-2 font-mono text-[9px] leading-relaxed">
                            <div className="text-violet-300 overflow-x-auto whitespace-pre-wrap select-all font-semibold leading-normal">
                              {msg.sql}
                            </div>
                            {!msg.sqlSuccess && msg.sqlError && (
                              <div className="pt-2 border-t border-slate-800 text-rose-400 flex items-start gap-1">
                                <ShieldAlert size={10} className="shrink-0 mt-0.5" />
                                <span className="font-bold">{msg.sqlError}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <span className={`text-[8.5px] text-slate-400 mt-1.5 px-1 font-bold ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                );
              })}
              
              {chat.isLoading && (
                <div className="flex gap-4 justify-start items-center animate-pulse">
                  <div 
                    className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm"
                    style={{ background: 'linear-gradient(135deg, #7000ff 0%, #b137a4 100%)' }}
                  >
                    <Bot size={15} />
                  </div>
                  <div className="p-3 rounded-2xl bg-white border border-slate-50 text-[10px] font-black text-slate-400 tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                    <span>이지봇 분석 중...</span>
                  </div>
                </div>
              )}
              
              <div ref={chat.messagesEndRef} />
            </div>

            {/* 입력 영역 바 */}
            <form 
              onSubmit={chat.handleSendMessage}
              className="bg-white border-t border-slate-50 p-4 flex gap-2 shrink-0 items-end"
            >
              <input 
                type="file" 
                ref={chat.fileInputRef} 
                onChange={chat.handleCardPhotoUpload} 
                accept="image/*,application/pdf,.xlsx,.xls,.csv" 
                className="hidden" 
              />

              <button
                type="button"
                onClick={() => chat.fileInputRef.current?.click()}
                disabled={chat.isLoading}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-350 hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition cursor-pointer disabled:opacity-50"
                style={{ marginBottom: '2px' }}
                title="명함, 영수증, 계약서 OCR 전송"
              >
                <Upload size={14} />
              </button>

              {voice.speechSupported && (
                <button
                  type="button"
                  onClick={voice.toggleSpeechRecognition}
                  disabled={chat.isLoading}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition cursor-pointer disabled:opacity-50 ${
                    voice.isListening 
                      ? 'bg-rose-50 border-rose-200 text-rose-650 animate-pulse' 
                      : 'bg-slate-50 border-slate-200 hover:border-slate-350 hover:bg-slate-100 text-slate-500 hover:text-slate-700'
                  }`}
                  style={{ marginBottom: '2px' }}
                  title={voice.isListening ? "음성 인식 중..." : "음성 마이크 켜기"}
                >
                  {voice.isListening ? <Mic size={14} /> : <MicOff size={14} />}
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  if (voice.voiceEnabled) {
                    voice.stopSpeaking();
                  }
                  voice.setVoiceEnabled(!voice.voiceEnabled);
                }}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition cursor-pointer ${
                  voice.voiceEnabled 
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-650' 
                    : 'bg-slate-50 border-slate-200 hover:border-slate-350 hover:bg-slate-100 text-slate-500 hover:text-slate-700'
                }`}
                style={{ marginBottom: '2px' }}
                title={voice.voiceEnabled ? "음성 피드백 켜짐 (주의사항 낭독)" : "음성 피드백 꺼짐"}
              >
                {voice.voiceEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
              </button>

              <div className="flex-1 min-w-0 bg-slate-50 border border-slate-200 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 rounded-xl px-3 py-1 flex items-center transition">
                <textarea
                  ref={chat.textareaRef}
                  value={chat.inputVal}
                  onChange={(e) => chat.setInputVal(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={chat.isLoading}
                  placeholder="지시 사항이나 질문을 입력하세요..."
                  className="w-full bg-transparent border-none outline-none resize-none max-h-[100px] text-xs font-semibold text-slate-800 py-1.5 leading-relaxed placeholder:text-slate-400 placeholder:font-bold custom-scrollbar"
                  rows={1}
                />
              </div>

              <button
                type="submit"
                disabled={!chat.inputVal.trim() || chat.isLoading}
                className="flex shrink-0 items-center justify-center rounded-xl text-white transition hover:opacity-90 active:scale-95 cursor-pointer disabled:opacity-30 disabled:scale-100 disabled:cursor-default"
                style={{
                  height: '36px',
                  width: '36px',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(45deg, #f91f7f 0%, #7000ff 100%)',
                  border: 'none',
                  outline: 'none',
                  marginBottom: '2px'
                }}
              >
                <Send size={14} style={{ color: '#ffffff' }} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 💬 개발사 피드백 실시간 접수 모달 */}
      <AnimatePresence>
        {chat.isFeedbackOpen && (
          <div className="ignore-capture fixed inset-0 bg-black/45 backdrop-blur-3xs flex items-center justify-center z-[100] p-4 text-slate-800">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 border border-slate-100 shadow-2xl relative block"
            >
              <button 
                onClick={() => {
                  chat.setIsFeedbackOpen(false);
                  chat.setFeedbackText("");
                  chat.setFeedbackContact("");
                  screenshot.setScreenshotBlob(null);
                  screenshot.setScreenshotPreview(null);
                  screenshot.setScreenRecordBlob(null);
                  screenshot.setScreenRecordPreview(null);
                }} 
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="space-y-1 block">
                <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  💬 개발사 실시간 피드백 전송
                </h4>
                <p className="text-[10px] text-slate-400 font-bold">
                  프로그램 사용 중 발생하는 에러/기능 제안을 즉시 개발사 카카오톡 채널로 제보합니다.
                </p>
              </div>

              <div className="space-y-3 text-xs font-bold block">
                <div className="space-y-1 block">
                  <label className="text-[10px] text-slate-455 uppercase tracking-widest block font-extrabold">문의/제보 유형</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'suggest', label: '💡 기능 제안' },
                      { key: 'bug', label: '⚠️ 버그 제보' },
                      { key: 'other', label: '❓ 기타 문의' }
                    ].map((type) => (
                      <button
                        key={type.key}
                        type="button"
                        onClick={() => chat.setFeedbackType(type.key as any)}
                        className={`py-2 rounded-xl border text-[10px] font-black transition-all cursor-pointer ${
                          chat.feedbackType === type.key
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-3xs'
                            : 'bg-slate-50/50 border-slate-100 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1 block">
                  <label className="text-[10px] text-slate-455 uppercase tracking-widest block font-extrabold">회신받으실 연락처 (선택)</label>
                  <input
                    type="text"
                    value={chat.feedbackContact}
                    onChange={(e) => chat.setFeedbackContact(e.target.value)}
                    placeholder="예: 010-1234-5678 또는 이메일 주소"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-xs"
                  />
                </div>

                <div className="space-y-1 block">
                  <label className="text-[10px] text-slate-455 uppercase tracking-widest block font-extrabold">건의 및 버그 설명 (필수)</label>
                  <textarea
                    value={chat.feedbackText}
                    onChange={(e) => chat.setFeedbackText(e.target.value)}
                    placeholder="접수 즉시 개발사 카카오톡 채널로 실시간 알림 전송되며, 상세 접수 후 신속히 패치해 드리겠습니다."
                    rows={4}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold resize-none leading-relaxed text-xs"
                  />
                </div>

                <div className="space-y-1 block border-t border-slate-100 pt-3">
                  <label className="text-[10px] text-slate-455 uppercase tracking-widest block font-extrabold mb-1">자료 첨부 (선택)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={screenshot.handleCaptureScreenshot}
                      className="flex items-center justify-center gap-1.5 py-2 rounded-xl border border-slate-200 hover:border-indigo-400 bg-white hover:bg-indigo-50/20 text-slate-700 hover:text-indigo-700 transition-all font-bold text-[10px] cursor-pointer"
                    >
                      <Camera size={13} className="text-slate-500" />
                      화면 스크린샷 캡처
                    </button>
                    <button
                      type="button"
                      onClick={screenshot.handleStartRecording}
                      disabled={screenshot.isRecording}
                      className={`flex items-center justify-center gap-1.5 py-2 rounded-xl border transition-all font-bold text-[10px] cursor-pointer ${
                        screenshot.isRecording 
                          ? 'bg-rose-50 border-rose-200 text-rose-650'
                          : 'border-slate-200 hover:border-rose-450 bg-white hover:bg-rose-50/20 text-slate-700 hover:text-rose-650'
                      }`}
                    >
                      <Video size={13} className={screenshot.isRecording ? "text-rose-500 animate-pulse" : "text-slate-500"} />
                      {screenshot.isRecording ? "녹화 진행 중..." : "화면 녹화 (동영상)"}
                    </button>
                  </div>

                  {(screenshot.screenshotPreview || screenshot.screenRecordPreview) && (
                    <div className="flex gap-2.5 mt-2 p-2 bg-slate-50/80 rounded-2xl border border-slate-100">
                      {screenshot.screenshotPreview && (
                        <div className="relative group w-[75px] h-[75px] rounded-xl border border-slate-200 overflow-hidden bg-white shrink-0 shadow-2xs">
                          <img src={screenshot.screenshotPreview} alt="Screenshot preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => {
                              screenshot.setScreenshotBlob(null);
                              screenshot.setScreenshotPreview(null);
                            }}
                            className="absolute -top-1 -right-1 bg-slate-900/80 text-white rounded-full p-1 hover:bg-rose-600 transition-colors shadow-sm"
                          >
                            <X size={10} />
                          </button>
                          <div 
                            onClick={() => {
                              screenshot.setCanvasImage(screenshot.screenshotPreview);
                              screenshot.setIsEditingScreenshot(true);
                            }}
                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[9px] font-black cursor-pointer transition-opacity"
                          >
                            편집
                          </div>
                        </div>
                      )}
                      {screenshot.screenRecordPreview && (
                        <div className="relative w-[120px] h-[75px] rounded-xl border border-slate-200 overflow-hidden bg-black shrink-0 shadow-2xs">
                          <video src={screenshot.screenRecordPreview} className="w-full h-full object-cover" controls={false} muted autoPlay loop playsInline />
                          <button
                            type="button"
                            onClick={() => {
                              screenshot.setScreenRecordBlob(null);
                              screenshot.setScreenRecordPreview(null);
                            }}
                            className="absolute -top-1 -right-1 bg-slate-900/80 text-white rounded-full p-1 hover:bg-rose-600 transition-colors shadow-sm z-10"
                          >
                            <X size={10} />
                          </button>
                          <div className="absolute bottom-1 right-1 bg-black/60 text-white px-1 py-0.5 rounded text-[8px] font-extrabold tracking-wide">
                            VIDEO
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={chat.handleSubmitFeedback}
                disabled={chat.isSendingFeedback || !chat.feedbackText.trim()}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {chat.isSendingFeedback ? (
                  <>
                    <RefreshCw size={12} className="animate-spin" />
                    피드백 실시간 전송 중...
                  </>
                ) : (
                  <>
                    <Send size={12} />
                    개발사 카카오톡으로 전송하기
                  </>
                )}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🔴 화면 녹화 중 플로팅 제어기 */}
      <AnimatePresence>
        {screenshot.isRecording && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="ignore-capture fixed bottom-6 left-6 z-[999] bg-slate-900/95 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-800 flex items-center gap-3.5 backdrop-blur-md print:hidden"
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-xs font-black tracking-wide">화면 녹화 중</span>
            </div>
            <div className="h-4 w-px bg-slate-700" />
            <div className="text-xs font-mono font-bold text-slate-300">
              {String(Math.floor(screenshot.recordingSeconds / 60)).padStart(2, '0')}:
              {String(screenshot.recordingSeconds % 60).padStart(2, '0')} / 00:30
            </div>
            <button
              type="button"
              onClick={screenshot.handleStopRecording}
              className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-xl text-[10px] font-black tracking-wide transition-all shadow-md shadow-rose-600/20 cursor-pointer border-none"
            >
              녹화 완료
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 📸 스크린샷 캔버스 편집 모달 */}
      <AnimatePresence>
        {screenshot.isEditingScreenshot && (
          <div className="ignore-capture fixed inset-0 bg-black/60 backdrop-blur-2xs flex items-center justify-center z-[110] p-4 text-slate-800 select-none print:hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-[96vw] w-full h-[92vh] max-h-[92vh] p-6 border border-slate-100 shadow-2xl relative flex flex-col justify-between select-none"
              style={{ height: '92vh', maxHeight: '92vh' }}
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 shrink-0">
                <div className="space-y-0.5">
                  <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                    ✂️ 스크린샷 마스킹 편집기
                  </h4>
                  <p className="text-[10px] text-slate-400 font-bold">
                    개인정보나 중요 재무 정보는 블러 펜(투명 흑색 마스킹)으로 지워주시고, 강조할 부분은 빨간 펜을 쓰세요.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => screenshot.setIsEditingScreenshot(false)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 flex items-center justify-center bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 my-2">
                <canvas
                  ref={screenshot.canvasRef}
                  onMouseDown={screenshot.startDrawing}
                  onMouseMove={screenshot.draw}
                  onMouseUp={screenshot.stopDrawing}
                  onMouseLeave={screenshot.stopDrawing}
                  onTouchStart={screenshot.startDrawing}
                  onTouchMove={screenshot.draw}
                  onTouchEnd={screenshot.stopDrawing}
                  className="max-w-full max-h-full block bg-slate-950"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => screenshot.setDrawingMode('pen')}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                      screenshot.drawingMode === 'pen'
                        ? 'bg-rose-50 border-rose-200 text-rose-600 shadow-3xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    빨간 펜
                  </button>
                  <button
                    type="button"
                    onClick={() => screenshot.setDrawingMode('blur')}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                      screenshot.drawingMode === 'blur'
                        ? 'bg-slate-950 border-slate-850 text-white shadow-3xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-800" />
                    블러(마스킹)
                  </button>
                  <button
                    type="button"
                    onClick={() => screenshot.setDrawingMode('none')}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                      screenshot.drawingMode === 'none'
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-750 shadow-3xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <MousePointerClick size={12} />
                    이동/선택 모드
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (screenshot.canvasImage && screenshot.canvasRef.current) {
                        const canvas = screenshot.canvasRef.current;
                        const ctx = canvas.getContext('2d');
                        if (!ctx) return;
                        const img = new Image();
                        img.onload = () => {
                          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        };
                        img.src = screenshot.canvasImage;
                      }
                    }}
                    className="flex items-center justify-center p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
                    title="초기화"
                  >
                    <RotateCcw size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={screenshot.handleSaveEditedScreenshot}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer transition-all border-none"
                  >
                    첨부 완료
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
