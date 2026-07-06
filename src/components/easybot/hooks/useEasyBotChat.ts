import { apiFetch } from '@/lib/api';
import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { 
  parseInboundExcelHeader, 
  getExcelColumnsAndRawData, 
  parseInboundExcelWithMapping 
} from '@/app/inventory/utils/inbound-excel';

interface Message {
  role: 'user' | 'bot';
  content: string;
  timestamp: string;
  sql?: string | null;
  sqlSuccess?: boolean | null;
  sqlError?: string | null;
  isCardPhoto?: boolean;
  cardPhotoBase64?: string;
  isPdfFile?: boolean;
  pdfFileName?: string;
}

export function useEasyBotChat({
  voiceEnabled,
  speakImportantNotesOnly,
  stopSpeaking,
  screenshotBlob,
  setScreenshotBlob,
  setScreenshotPreview,
  screenRecordBlob,
  setScreenRecordBlob,
  setScreenRecordPreview
}: {
  voiceEnabled: boolean;
  speakImportantNotesOnly: (text: string) => void;
  stopSpeaking: () => void;
  screenshotBlob: Blob | null;
  setScreenshotBlob: (blob: Blob | null) => void;
  setScreenshotPreview: (url: string | null) => void;
  screenRecordBlob: Blob | null;
  setScreenRecordBlob: (blob: Blob | null) => void;
  setScreenRecordPreview: (url: string | null) => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'bot',
      content: '반갑습니다! 무엇을 도와드릴까요?\n- **"AI 브리핑 분석해줘"** 라고 하시면 시각 통계를 분석합니다.\n- 📤 하단의 **업로드 아이콘**을 클릭해 명함 또는 영수증 파일을 전송하시면 자동으로 명함첩에 똑똑하게 등록해 드립니다!',
      timestamp: '방금 전'
    }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 피드백 관련 상태
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackContact, setFeedbackContact] = useState("");
  const [feedbackType, setFeedbackType] = useState<"suggest" | "bug" | "other">("suggest");
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messagesRef = useRef<Message[]>([]);
  const pathnameRef = useRef<string>('');
  const voiceEnabledRef = useRef<boolean>(false);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    voiceEnabledRef.current = voiceEnabled;
  }, [voiceEnabled]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const formatTimestamp = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? '오후' : '오전';
    const formattedHours = hours % 12 || 12;
    return `${ampm} ${formattedHours}:${minutes}`;
  };

  const handleCardPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    stopSpeaking();

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isExcel = file.name.toLowerCase().endsWith('.xlsx') || 
                    file.name.toLowerCase().endsWith('.xls') || 
                    file.name.toLowerCase().endsWith('.csv');

    const timeStr = formatTimestamp();

    if (isExcel) {
      // 1. 유저 메시지 노출 (엑셀 파일 업로드 상태 지표)
      setMessages(prev => [
        ...prev,
        {
          role: 'user',
          content: `📊 자율입고 엑셀 파일을 업로드합니다. (${file.name})`,
          timestamp: timeStr,
          isCardPhoto: false,
          isPdfFile: false
        }
      ]);

      // 2. 봇 분석 대기 메시지 노출
      setMessages(prev => [
        ...prev,
        {
          role: 'bot',
          content: '🔄 엑셀 파일의 시그니처 및 매핑 정보를 검증하고 있습니다. 잠시만 기다려 주세요... ⚡',
          timestamp: timeStr
        }
      ]);

      try {
        // A. 엑셀 시그니처 추출
        const sig = await parseInboundExcelHeader(file);
        
        // B. 저장된 엑셀 시그니처 목록 조회
        const sigRes = await apiFetch("/api/inventory/inbounds/excel-signatures");
        const sigData = await sigRes.json();
        
        let matchedConfig: any = null;
        if (sigData.success) {
          matchedConfig = sigData.configs?.find((c: any) => c.header_signature === sig);
        }

        if (matchedConfig) {
          // 저장된 시그니처가 매칭된다면 즉시 파싱 및 보라색 자율입고 프리뷰 출력
          const configMapping = JSON.parse(matchedConfig.mapping_info);
          const excelMeta = await getExcelColumnsAndRawData(file);
          const result = parseInboundExcelWithMapping(
            excelMeta.rawRows,
            excelMeta.headerRowIndex,
            configMapping,
            file.name
          );

          // 이지봇 프리뷰 카드 페이로드 빌드
          const payload = {
            partner_name: result.partner_name,
            inbound_date: result.inbound_date,
            file_url: file.name,
            items: result.items
          };

          setMessages(prev => {
            const updated = [...prev];
            updated.pop(); // 대기 메시지 제거
            updated.push({
              role: 'bot',
              content: `[INBOUND_EXCEL_PREVIEW:${JSON.stringify(payload)}]`,
              timestamp: formatTimestamp()
            });
            return updated;
          });
        } else {
          // 처음 본 양식인 경우 안내 메시지 출력
          setMessages(prev => {
            const updated = [...prev];
            updated.pop(); // 대기 메시지 제거
            updated.push({
              role: 'bot',
              content: `⚠️ 처음 인식된 입고 엑셀/CSV 양식입니다. 정확한 자율 입고 처리를 위해, **[재고 관리 AI]** 페이지의 **'엑셀 자율입고'** 메뉴에서 최초 1회 매핑 규칙을 등록해 주세요.`,
              timestamp: formatTimestamp()
            });
            return updated;
          });
        }
      } catch (err: any) {
        setMessages(prev => {
          const updated = [...prev];
          updated.pop();
          updated.push({
            role: 'bot',
            content: `❌ 엑셀 분석 중 오류가 발생했습니다: ${err.message}`,
            timestamp: formatTimestamp()
          });
          return updated;
        });
      } finally {
        setIsLoading(false);
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Str = reader.result as string;

      if (isPdf) {
        setMessages(prev => [
          ...prev,
          {
            role: 'user',
            content: `📁 PDF 문서를 검증하여 등록해 주세요. (${file.name})`,
            timestamp: timeStr,
            isCardPhoto: false,
            isPdfFile: true,
            pdfFileName: file.name,
            cardPhotoBase64: base64Str
          }
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          {
            role: 'user',
            content: '',
            timestamp: timeStr,
            isCardPhoto: true,
            isPdfFile: false,
            cardPhotoBase64: base64Str
          }
        ]);
      }

      setMessages(prev => [
        ...prev,
        {
          role: 'bot',
          content: '🔄 업로드하신 문서를 AI가 정밀 분석 및 국세청 검증을 수행하고 있습니다. 잠시만 기다려 주세요... ⚡',
          timestamp: timeStr
        }
      ]);

      try {
        const response = await apiFetch('/api/easybot/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64Str })
        });

        const data = await response.json();

        if (data.success && data.detectedItems && data.detectedItems.length > 0) {
          setMessages(prev => {
            const updated = [...prev];
            updated.pop();

            data.detectedItems.forEach((item: any) => {
              if (item.itemType === 'BUSINESS_LICENSE') {
                const licensePayload = {
                  status: item.status,
                  existingId: item.existingId,
                  existingType: item.existingType,
                  diff: item.diff,
                  checksum: item.checksum,
                  nts: item.nts,
                  data: item.data
                };
                updated.push({
                  role: 'bot',
                  content: `[LICENSE_PREVIEW:${JSON.stringify(licensePayload)}]`,
                  timestamp: formatTimestamp()
                });
              } else if (item.itemType === 'BUSINESS_CARD') {
                const cardPayload = {
                  ...item.data,
                  actionType: item.actionType,
                  partnerId: item.partnerId,
                  partnerName: item.partnerName,
                  existingContact: item.existingContact,
                  cardImageUrl: base64Str
                };
                updated.push({
                  role: 'bot',
                  content: `[CARD_PREVIEW:${JSON.stringify(cardPayload)}]`,
                  timestamp: formatTimestamp()
                });
              } else if (item.itemType === 'RECEIPT') {
                const receiptPayload = {
                  ...item.data
                };
                updated.push({
                  role: 'bot',
                  content: `[RECEIPT_PREVIEW:${JSON.stringify(receiptPayload)}]`,
                  timestamp: formatTimestamp()
                });
              } else if (item.itemType === 'FINANCIAL_STATEMENT') {
                const financialPayload = {
                  status: item.status,
                  partnerId: item.partnerId,
                  companyType: item.companyType,
                  matchedCompanyName: item.matchedCompanyName,
                  pdfFilePath: item.pdfFilePath,
                  data: item.data,
                  partnersList: data.partnersList
                };
                updated.push({
                  role: 'bot',
                  content: `[FINANCIAL_PREVIEW:${JSON.stringify(financialPayload)}]`,
                  timestamp: formatTimestamp()
                });
              } else if (item.itemType === 'RESUME') {
                const resumePayload = {
                  ...item.data
                };
                updated.push({
                  role: 'bot',
                  content: `[RESUME_PREVIEW:${JSON.stringify(resumePayload)}]`,
                  timestamp: formatTimestamp()
                });
              } else if (item.itemType === 'PURCHASE_INVOICE') {
                const purchasePayload = {
                  partnerId: item.partnerId,
                  data: item.data,
                  trackedItemsList: item.trackedItemsList,
                  partnersList: data.partnersList
                };
                updated.push({
                  role: 'bot',
                  content: `[PURCHASE_INVOICE_PREVIEW:${JSON.stringify(purchasePayload)}]`,
                  timestamp: formatTimestamp()
                });
              } else if (item.itemType === 'COMPETITOR_PRICE_CAPTURE') {
                const competitorPayload = {
                  matchedItemId: item.matchedItemId,
                  matchedItemName: item.matchedItemName,
                  data: item.data,
                  trackedItemsList: item.trackedItemsList
                };
                updated.push({
                  role: 'bot',
                  content: `[COMPETITOR_PRICE_PREVIEW:${JSON.stringify(competitorPayload)}]`,
                  timestamp: formatTimestamp()
                });
              } else if (item.itemType === 'MEDICAL_CERTIFICATE') {
                const medicalPayload = {
                  ...item.data,
                  matchedOperatorId: item.matchedOperatorId,
                  matchedOperatorName: item.matchedOperatorName,
                  operatorsList: item.operatorsList
                };
                updated.push({
                  role: 'bot',
                  content: `[MEDICAL_PREVIEW:${JSON.stringify(medicalPayload)}]`,
                  timestamp: formatTimestamp()
                });
              } else if (item.itemType === 'FACILITY_PLATE') {
                const platePayload = {
                  data: item.data
                };
                updated.push({
                  role: 'bot',
                  content: `[FACILITY_PLATE_PREVIEW:${JSON.stringify(platePayload)}]`,
                  timestamp: formatTimestamp()
                });
              } else if (item.itemType === 'FACILITY_CHECKLIST') {
                const checklistPayload = {
                  matchedEquipmentId: item.matchedEquipmentId,
                  matchedEquipmentName: item.matchedEquipmentName,
                  facilitiesList: item.facilitiesList,
                  data: item.data
                };
                updated.push({
                  role: 'bot',
                  content: `[FACILITY_CHECKLIST_PREVIEW:${JSON.stringify(checklistPayload)}]`,
                  timestamp: formatTimestamp()
                });
              } else if (item.itemType === 'INBOUND_ESTIMATE') {
                const estimatePayload = {
                  partnerId: item.partnerId,
                  data: item.data,
                  trackedItemsList: item.trackedItemsList,
                  partnersList: item.partnersList || data.partnersList
                };
                updated.push({
                  role: 'bot',
                  content: `[INBOUND_ESTIMATE_PREVIEW:${JSON.stringify(estimatePayload)}]`,
                  timestamp: formatTimestamp()
                });
              } else if (item.itemType === 'LEGAL_DOCUMENT') {
                const legalPayload = {
                  ...item.data
                };
                updated.push({
                  role: 'bot',
                  content: `[LEGAL_PREVIEW:${JSON.stringify(legalPayload)}]`,
                  timestamp: formatTimestamp()
                });
              } else if (item.itemType === 'INVENTORY_INBOUND') {
                const inboundPayload = {
                  data: item.data,
                  inventoryItemsList: data.inventoryItemsList || []
                };
                updated.push({
                  role: 'bot',
                  content: `[INBOUND_PREVIEW:${JSON.stringify(inboundPayload)}]`,
                  timestamp: formatTimestamp()
                });
              }
            });
            return updated;
          });
        } else {
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: 'bot',
              content: `❌ 문서 판독 실패: ${data.error || '알 수 없는 판독 오류'}`,
              timestamp: formatTimestamp()
            };
            return updated;
          });
        }
      } catch (err: any) {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'bot',
            content: `❌ 문서 스캔 중 통신 오류가 발생했습니다: ${err.message}`,
            timestamp: formatTimestamp()
          };
          return updated;
        });
      } finally {
        setIsLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCardConfirmSuccess = (successMsg: string) => {
    setMessages(prev => [
      ...prev,
      {
        role: 'bot',
        content: `✅ ${successMsg}`,
        timestamp: formatTimestamp()
      }
    ]);
  };

  const sendUserMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    setIsLoading(true);
    stopSpeaking();

    const timeStr = formatTimestamp();

    const updatedMessages = [
      ...messagesRef.current,
      {
        role: 'user' as const,
        content: textToSend,
        timestamp: timeStr
      }
    ];
    setMessages(updatedMessages);

    try {
      const response = await apiFetch('/api/easybot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: textToSend,
          chatHistory: updatedMessages.map(m => ({
            role: m.role,
            content: m.content
          })),
          localStorageContext: typeof window !== 'undefined' ? { ...window.localStorage } : {},
          currentUrl: pathnameRef.current,
          focusedUiHint: typeof window !== 'undefined' ? (window as any).currentEasyBotHint || null : null
        })
      });

      const data = await response.json();

      if (data.success) {
        setMessages(prev => [
          ...prev,
          {
            role: 'bot',
            content: data.reply || data.answer,
            timestamp: formatTimestamp(),
            sql: data.sql || null,
            sqlSuccess: data.sqlSuccess !== undefined ? data.sqlSuccess : null,
            sqlError: data.sqlError || null
          }
        ]);

        if (voiceEnabledRef.current) {
          speakImportantNotesOnly(data.reply || data.answer);
        }

        if (data.redirectUrl) {
          setTimeout(() => {
            router.push(data.redirectUrl);
          }, 1800);
        }
      } else {
        setMessages(prev => [
          ...prev,
          {
            role: 'bot',
            content: `죄송합니다. 오류가 발생했습니다.\n- *상세 사유:* ${data.error || '서버 응답 규격이 올바르지 않습니다.'}`,
            timestamp: formatTimestamp()
          }
        ]);
      }
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          role: 'bot',
          content: `네트워크 연결에 실패했습니다.\n- *에러 내용:* ${err.message || '인터넷 통신 장애'}`,
          timestamp: formatTimestamp()
        }
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 50);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || isLoading) return;

    const userText = inputVal;
    setInputVal('');
    await sendUserMessage(userText);
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim()) {
      alert("피드백 내용을 입력해 주세요.");
      return;
    }

    setIsSendingFeedback(true);
    try {
      const formData = new FormData();
      formData.append("companyName", "이지데스크 B2B 회원사");
      formData.append("senderName", "운영자 사장님");
      formData.append("contact", feedbackContact || "미기입");
      formData.append("feedbackType", feedbackType === "bug" ? "버그 제보" : feedbackType === "suggest" ? "기능 제안" : "기타 문의");
      formData.append("feedbackText", feedbackText);
      formData.append("currentUrl", pathname || window.location.pathname);

      if (screenshotBlob) {
        formData.append("screenshot", screenshotBlob, "screenshot.png");
      }
      if (screenRecordBlob) {
        formData.append("recording", screenRecordBlob, "recording.webm");
      }

      const res = await apiFetch("/api/support/feedback", {
        method: "POST",
        body: formData
      });

      const data = await res.json();
      if (data.success) {
        alert("개발사로 피드백이 실시간으로 전송 완료되었습니다! 🚀\n신속하게 확인하여 카카오톡 채널로 대응해 드리겠습니다.");
        setFeedbackText("");
        setFeedbackContact("");
        setScreenshotBlob(null);
        setScreenshotPreview(null);
        setScreenRecordBlob(null);
        setScreenRecordPreview(null);
        setIsFeedbackOpen(false);
      } else {
        alert(data.error || "피드백 전송에 실패했습니다. 대행사 설정을 확인하세요.");
      }
    } catch (err: any) {
      console.error(err);
      alert("통신 중 오류가 발생했습니다: " + err.message);
    } finally {
      setIsSendingFeedback(false);
    }
  };

  return {
    messages,
    setMessages,
    inputVal,
    setInputVal,
    isLoading,
    isFeedbackOpen,
    setIsFeedbackOpen,
    feedbackText,
    setFeedbackText,
    feedbackContact,
    setFeedbackContact,
    feedbackType,
    setFeedbackType,
    isSendingFeedback,
    messagesEndRef,
    textareaRef,
    fileInputRef,
    scrollToBottom,
    handleCardPhotoUpload,
    handleCardConfirmSuccess,
    sendUserMessage,
    handleSendMessage,
    handleSubmitFeedback
  };
}
