"use client";

import React, { useState, useEffect } from "react";
import { 
  ShieldAlert, X, Calendar, Paperclip, FileText, ExternalLink, 
  ListTodo, CheckSquare, Square, ShieldCheck, Loader2, Sparkles, 
  CheckCircle2, XCircle, Plus, Bot, ToggleLeft, ToggleRight,
  MessageSquare, Send, Users, Zap
} from "lucide-react";
import { apiFetch } from '@/lib/api';

interface GovernanceDetailModalProps {
  selectedEvent: any;
  eventDueDate: string;
  setEventDueDate: (val: string) => void;
  handleSaveEventDueDate: () => void;
  handleCloseDetail: () => void;
  selectedActions: string[];
  setSelectedActions: React.Dispatch<React.SetStateAction<string[]>>;
  actionReports: { action: string; success: boolean; detail: string }[] | null;
  isExecuting: boolean;
  handleExecuteActions: (options?: { saveAutoRule?: boolean; smsPayload?: any }) => void;
  handleApproveLeave: (id: string) => void;
  handleRejectLeave: (id: string) => void;
  handleApproveCancelRequest: (evt: any) => void;
  handleRejectCancelRequest: (evt: any) => void;
  handleRemoveAction: (e: React.MouseEvent, code: string) => void;
  handleOpenDocumentModal: (title: string, url: string, rawText?: string) => void;
  loadData: () => void;
}

export default function GovernanceDetailModal({
  selectedEvent,
  eventDueDate,
  setEventDueDate,
  handleSaveEventDueDate,
  handleCloseDetail,
  selectedActions,
  setSelectedActions,
  actionReports,
  isExecuting,
  handleExecuteActions,
  handleApproveLeave,
  handleRejectLeave,
  handleApproveCancelRequest,
  handleRejectCancelRequest,
  handleRemoveAction,
  handleOpenDocumentModal,
  loadData,
}: GovernanceDetailModalProps) {
  const isResolved = selectedEvent?.status === 'RESOLVED';
  const [customActionTitle, setCustomActionTitle] = useState("");
  const [customActionDesc, setCustomActionDesc] = useState("");
  const [isAddingAction, setIsAddingAction] = useState(false);
  const [customActions, setCustomActions] = useState<any[]>([]);
  const [saveAutoRuleOnExecute, setSaveAutoRuleOnExecute] = useState(false);
  const [matchedSmsAction, setMatchedSmsAction] = useState<any | null>(null);

  // 🤖 자연어 지시 기반 AI 자율 조치 생성 상태
  const [naturalPrompt, setNaturalPrompt] = useState("");
  const [isParsingNatural, setIsParsingNatural] = useState(false);
  const [customActionPayloads, setCustomActionPayloads] = useState<{ [key: string]: any }>({});

  // 📱 1회성 맞춤 문자 추가 상태
  const [allOperators, setAllOperators] = useState<any[]>([]);
  const [isAddingAdhocSms, setIsAddingAdhocSms] = useState(false);
  const [adhocSelectedOpIds, setAdhocSelectedOpIds] = useState<string[]>([]);
  const [adhocCustomPhone, setAdhocCustomPhone] = useState("");
  const [adhocMessage, setAdhocMessage] = useState("");

  // 📱 문자 관제 활성 자동 발송 규칙 실시간 매칭 (상시 기본 탑재)
  useEffect(() => {
    if (!selectedEvent) return;

    // 🧹 새 모달 진입 시 이전 커스텀/1회성 작업 상태 완전 리셋
    setCustomActions([]);
    setCustomActionPayloads({});
    setIsAddingAction(false);
    setIsAddingAdhocSms(false);
    setAdhocSelectedOpIds([]);
    setAdhocCustomPhone("");
    setNaturalPrompt("");
    setCustomActionTitle("");
    setCustomActionDesc("");

    let isMounted = true;
    (async () => {
      try {
        const [autoRes, tmplRes, opRes] = await Promise.all([
          apiFetch('/api/automation').then(r => r.json()).catch(() => ({ rules: {} })),
          apiFetch('/api/message-templates').then(r => r.json()).catch(() => ({ templates: [] })),
          apiFetch('/api/operators').then(r => r.json()).catch(() => ({ operators: [] }))
        ]);

        let rules = autoRes?.rules || {};
        const templates = tmplRes?.templates || [];
        const operators = opRes?.operators || [];
        if (isMounted) setAllOperators(operators);

        const title = selectedEvent.title || '';
        const docTitle = selectedEvent.data?.doc_title || '';
        const isDeleteOrHold = 
          selectedEvent.type === 'RAG_HOLD' || 
          selectedEvent.type === 'TASK_CANCEL_REQUEST' ||
          title.includes('삭제') || title.includes('취소') || 
          docTitle.includes('삭제') || docTitle.includes('취소');

        // 거래처명 및 상신자명 추출
        let partnerName = '엘에스';
        const titleMatch = title.match(/\[상신\]\s*([^\s]+)/i);
        if (titleMatch && titleMatch[1]) {
          partnerName = titleMatch[1];
        } else if (selectedEvent.data?.partner_name || selectedEvent.data?.customer_name) {
          partnerName = selectedEvent.data.partner_name || selectedEvent.data.customer_name;
        }
        const submitterName = selectedEvent.created_by || selectedEvent.data?.operator || '이주용';
        const docIdText = selectedEvent.data?.doc_id || selectedEvent.doc_id || selectedEvent.id || '';

        let templateTitle = '수주등록';
        let finalMessage = '';
        let targetRuleTitle = 'B2B 수주 확정 알림';
        let targetRecipients: { name: string; phone: string; dept?: string }[] = [];

        if (isDeleteOrHold) {
          // 🗑️ 삭제/취소 승인 건 전용 기본 문자 구성
          targetRuleTitle = '데이터 삭제/취소 승인 완료 알림';
          templateTitle = '삭제/취소 승인 통보';
          finalMessage = `[이지데스크] ${partnerName} 건(${docIdText})의 삭제/취소 요청이 최고관리자에 의해 최종 승인 완료되었습니다.`;
          
          // 수신자: 상신자/요청자 우선 매칭 + 주요 관리자
          const matchedOp = operators.find((o: any) => o.name === submitterName || o.username === submitterName);
          if (matchedOp && matchedOp.phone) {
            targetRecipients.push({ name: matchedOp.name, phone: matchedOp.phone, dept: matchedOp.department });
          }
          operators.filter((o: any) => o.name !== submitterName).slice(0, 2).forEach((o: any) => {
            if (o.phone) targetRecipients.push({ name: o.name, phone: o.phone, dept: o.department });
          });
        } else {
          // 📦 신규 수주/상신 건 전용 기본 문자 구성
          const isSales = title.includes('수주') || title.includes('발주') || docTitle.includes('수주') || docTitle.includes('발주');
          const ruleKey = isSales ? 'sales_order_confirmed' : Object.keys(rules)[0] || 'sales_order_confirmed';
          const targetRule = rules[ruleKey] || Object.values(rules).find((r: any) => r.enabled);

          if (targetRule && targetRule.enabled) {
            const tmpl = templates.find((t: any) => String(t.id) === String(targetRule.templateId)) || templates[0];
            templateTitle = tmpl?.title || '수주등록';
            const templateRawContent = tmpl?.content || '새로운 수주가 들어왔습니다. {거래처명}';
            targetRuleTitle = targetRule.title || 'B2B 수주 확정 알림';

            finalMessage = templateRawContent
              .replace(/{거래처명}/g, partnerName)
              .replace(/{상호}/g, partnerName)
              .replace(/{상신자명}/g, submitterName)
              .replace(/{담당자명}/g, submitterName);

            const targetOpIds = targetRule.targetOperatorIds || (targetRule.targetOperatorId ? [String(targetRule.targetOperatorId)] : []);
            if (targetRule.targetType === 'ALL_OPERATORS') {
              targetRecipients = operators.map((o: any) => ({ name: o.name, phone: o.phone, dept: o.department }));
            } else if ((targetRule.targetType === 'OPERATORS' || targetRule.targetType === 'OPERATOR') && targetOpIds.length > 0) {
              targetRecipients = operators
                .filter((o: any) => targetOpIds.map(String).includes(String(o.id)))
                .map((o: any) => ({ name: o.name, phone: o.phone, dept: o.department }));
            } else if (targetRule.targetType === 'CUSTOM' && targetRule.targetPhone) {
              targetRecipients = targetRule.targetPhone.split(',').map((p: string) => ({ name: '직접입력', phone: p.trim() }));
            }
          }
        }

        if (targetRecipients.length === 0 && operators.length > 0) {
          targetRecipients = operators.slice(0, 2).map((o: any) => ({ name: o.name, phone: o.phone, dept: o.department }));
        }

        if (!finalMessage) {
          finalMessage = `[이지데스크] ${partnerName} 업무 건에 대한 최고관리자의 관제 조치가 완료되었습니다.`;
        }

        if (isMounted) {
          const newSmsAction = {
            code: "SMS_AUTO_NOTIFY",
            label: `[📱 AI 자동 문자 발송] ${targetRuleTitle}`,
            description: `템플릿: '${templateTitle}' · 수신: ${targetRecipients.map(r => r.name).join(', ')} (총 ${targetRecipients.length}명)`,
            isSmsAction: true,
            templateTitle,
            finalMessage,
            targetRecipients,
            smsPayload: {
              templateTitle,
              message: finalMessage,
              phones: targetRecipients.map(r => r.phone).filter(Boolean),
              operatorNames: targetRecipients.map(r => r.name)
            }
          };
          setMatchedSmsAction(newSmsAction);
          setSelectedActions(prev => {
            const withoutNotify = prev.filter(c => c !== "NOTIFY_USER");
            return withoutNotify.includes("SMS_AUTO_NOTIFY") ? withoutNotify : ["SMS_AUTO_NOTIFY", ...withoutNotify];
          });

          // 1회성 문자 기본 추천 문구 프리필
          setAdhocMessage(
            isDeleteOrHold
              ? `[긴급 공유] ${partnerName} 수주 건(${docIdText})이 최고관리자 승인으로 취소/삭제되었습니다. 연관 부서는 생산 및 출하 준비를 중단 바랍니다.`
              : `[업무 공유] ${partnerName} 관련 관제 조치 사항을 전사 유관 부서에 전달드립니다.`
          );
        }
      } catch (err) {
        console.error("SMS auto rule matching error:", err);
      }
    })();

    return () => { isMounted = false; };
  }, [selectedEvent]);

  if (!selectedEvent) return null;

  // 📷 사진 및 서류 첨부 파일 통합 추출
  const rawPhotos = [
    ...(Array.isArray(selectedEvent.photos) ? selectedEvent.photos : []),
    ...(Array.isArray(selectedEvent.data?.photos) ? selectedEvent.data.photos : []),
    ...(Array.isArray(selectedEvent.images) ? selectedEvent.images : []),
    ...(Array.isArray(selectedEvent.data?.images) ? selectedEvent.data.images : []),
  ];

  const rawFiles = [
    ...(Array.isArray(selectedEvent.attachments) ? selectedEvent.attachments : []),
    ...(Array.isArray(selectedEvent.data?.attachments) ? selectedEvent.data.attachments : []),
    ...(Array.isArray(selectedEvent.files) ? selectedEvent.files : []),
    ...(Array.isArray(selectedEvent.data?.files) ? selectedEvent.data.files : []),
    ...(selectedEvent.file_url || selectedEvent.data?.file_url ? [{ 
      name: selectedEvent.data?.matched_filename || selectedEvent.matched_filename || '상신 첨부 서류 파일', 
      url: selectedEvent.file_url || selectedEvent.data?.file_url 
    }] : [])
  ];

  const modalPhotos: any[] = [...rawPhotos];
  const modalFiles: any[] = [];

  rawFiles.forEach((fItem: any) => {
    const fUrl = fItem.url || fItem.preview || fItem.base64 || '';
    const fName = fItem.name || fItem.filename || '';
    const fType = fItem.fileType || fItem.type || '';

    const isImg = 
      fType === 'IMAGE' || 
      fType?.startsWith('image/') || 
      fName?.match(/\.(jpg|jpeg|png|gif|webp|heic)$/i) || 
      fUrl?.match(/\.(jpg|jpeg|png|gif|webp|heic)/i) ||
      fUrl?.startsWith('data:image/');

    if (isImg) {
      if (!modalPhotos.some(p => (p.url || p.preview || p.name) === (fUrl || fName))) {
        modalPhotos.push(fItem);
      }
    } else {
      if (!modalFiles.some(f => (f.url || f.name) === (fUrl || fName))) {
        modalFiles.push(fItem);
      }
    }
  });

  const isDeleteOrHoldEvent = 
    selectedEvent.type === 'RAG_HOLD' || 
    selectedEvent.type === 'TASK_CANCEL_REQUEST' ||
    (selectedEvent.title || '').includes('삭제') || 
    (selectedEvent.title || '').includes('취소') || 
    (selectedEvent.data?.doc_title || '').includes('삭제') || 
    (selectedEvent.data?.doc_title || '').includes('취소');

  const isSalesOrderEvent = !isDeleteOrHoldEvent && (
    (selectedEvent.title || '').includes('수주') || 
    (selectedEvent.title || '').includes('발주') || 
    (selectedEvent.data?.doc_title || '').includes('수주') || 
    (selectedEvent.data?.doc_title || '').includes('발주')
  );

  const attachedFileName = modalFiles[0]?.name || modalPhotos[0]?.name || selectedEvent.data?.matched_filename || 'LS발주서.xlsx';

  const orderRegisterAction = isSalesOrderEvent ? {
    code: "auto_register_sales_order",
    label: `[📦 B2B 수주 대장 자동 등록] ${attachedFileName ? `${attachedFileName} 실물 분석` : '발주서 파싱'}`,
    description: `상신 첨부 파일(${attachedFileName})의 실물 품목·수량·금액을 AI가 정밀 분석하여 수주 대장(crm_sales_orders)에 수주서 즉시 자동 적재`,
    isOrderAction: true,
    fileName: attachedFileName
  } : null;

  // 🗑️ 삭제/취소 요청 건 전용 추천 액션
  const deleteApprovalAction = isDeleteOrHoldEvent ? {
    code: "DELETE_APPROVED_DATA",
    label: `[🗑️ 데이터 최종 삭제 승인 (Soft Delete)]`,
    description: `최고관리자 승인에 따라 대상 문서(${selectedEvent.data?.doc_title || selectedEvent.title}) 및 연관 데이터를 대장에서 안전하게 삭제(폐기) 처리`,
    isDeleteAction: true
  } : null;

  const baseDefaultActions = selectedEvent.data?.suggested_actions || [
    { code: "NOTIFY_USER", label: "관리자 / 담당자 알림 발송", description: "관제 이벤트를 담당 관리자에게 즉시 알림" },
    { code: "LOG_AUDIT", label: isDeleteOrHoldEvent ? "[📝 거버넌스 삭제 승인 감사 로그 보존]" : "감사 로그 보존", description: "본 사건 처리 이력을 전사 거버넌스 원장에 기록" },
  ];

  const defaultActionsList = [
    ...(deleteApprovalAction ? [deleteApprovalAction] : []),
    ...(orderRegisterAction ? [orderRegisterAction] : []),
    ...(matchedSmsAction ? [matchedSmsAction] : []),
    ...baseDefaultActions.filter((a: any) => 
      a.code !== "NOTIFY_USER" && 
      a.code !== "auto_register_sales_order" && 
      a.code !== "scan_received_order"
    )
  ];

  const actionsList = [...defaultActionsList, ...customActions];

  const handleAddCustomAction = () => {
    if (!customActionTitle.trim()) {
      alert("추가할 자율 대행 작업 제목을 입력해 주세요.");
      return;
    }
    const newCode = `CUSTOM_${Date.now()}`;
    const newAction = {
      code: newCode,
      label: customActionTitle.trim(),
      description: customActionDesc.trim() || "최고관리자가 추가한 수동 조치 시나리오",
    };
    setCustomActions((prev) => [...prev, newAction]);
    setSelectedActions((prev) => [...prev, newCode]);
    setCustomActionTitle("");
    setCustomActionDesc("");
    setIsAddingAction(false);
  };

  // 📱 1회성 맞춤 문자 추가 핸들러
  const handleAddAdhocSms = () => {
    if (!adhocMessage.trim()) {
      alert("발송할 알림 문자 메시지 내용을 입력해 주세요.");
      return;
    }
    
    let targetRecipients: { name: string; phone: string; dept?: string }[] = [];
    const selectedOps = allOperators.filter((o: any) => adhocSelectedOpIds.includes(String(o.id)));
    selectedOps.forEach((o: any) => {
      if (o.phone) targetRecipients.push({ name: o.name, phone: o.phone, dept: o.department });
    });

    if (adhocCustomPhone.trim()) {
      adhocCustomPhone.split(',').map(p => p.trim()).filter(Boolean).forEach(p => {
        targetRecipients.push({ name: '직접입력', phone: p });
      });
    }

    if (targetRecipients.length === 0) {
      alert("문자를 수신할 부서/담당자 또는 전화번호를 최소 1개 이상 선택해 주세요.");
      return;
    }

    const newCode = `SMS_ADHOC_${Date.now()}`;
    const newSmsAction = {
      code: newCode,
      label: `[📱 1회성 추가 문자 발송] ${targetRecipients.map(r => r.name).slice(0, 3).join(', ')}${targetRecipients.length > 3 ? ` 외 ${targetRecipients.length - 3}명` : ''}`,
      description: `수신: ${targetRecipients.map(r => r.name).join(', ')} (총 ${targetRecipients.length}명)`,
      isSmsAction: true,
      isAdhocSms: true,
      templateTitle: '1회성 맞춤 공유',
      finalMessage: adhocMessage.trim(),
      targetRecipients,
      smsPayload: {
        templateTitle: '1회성 맞춤 공유',
        message: adhocMessage.trim(),
        phones: targetRecipients.map(r => r.phone).filter(Boolean),
        operatorNames: targetRecipients.map(r => r.name)
      }
    };

    setCustomActions((prev) => [...prev, newSmsAction]);
    setSelectedActions((prev) => [...prev, newCode]);
    setIsAddingAdhocSms(false);
  };

  // 🤖 자연어 지시 기반 AI 자율 조치 생성 핸들러
  const handleGenerateNaturalAction = async (promptToUse?: string) => {
    const query = promptToUse || naturalPrompt;
    if (!query.trim()) {
      alert("원하시는 작업 지시를 자연어로 입력해 주세요.");
      return;
    }
    setIsParsingNatural(true);
    try {
      const res = await apiFetch("/api/governance?action=parse_natural_action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          natural_prompt: query.trim(),
          event_info: selectedEvent,
          operators: allOperators
        })
      });
      const data = await res.json();
      if (data.success && data.actions && data.actions.length > 0) {
        const newActions = data.actions;
        setCustomActions((prev) => [...prev, ...newActions]);
        setSelectedActions((prev) => [...prev, ...newActions.map((a: any) => a.code)]);
        
        const newPayloads: any = {};
        newActions.forEach((a: any) => {
          newPayloads[a.code] = a;
        });
        setCustomActionPayloads((prev) => ({ ...prev, ...newPayloads }));
        setNaturalPrompt("");
        setIsAddingAction(false);
      } else {
        alert("AI 작업 분석 실패: " + (data.error || "결과를 생성하지 못했습니다."));
      }
    } catch (err: any) {
      alert("AI 통신 오류: " + err.message);
    } finally {
      setIsParsingNatural(false);
    }
  };

  const displayTitle = (selectedEvent.title || '')
    .replace(/^AI 결재 보류:\s*/g, '')
    .replace(/^AI 결재 보류\s*/g, '')
    .trim();

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-6 animate-scale-in text-left">
        
        {/* 모달 헤더 */}
        <div className="flex justify-between items-start border-b border-slate-100 pb-4">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-5.5 h-5.5 text-rose-500 animate-pulse shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-800">AI 관제 원장</h3>
                <span className="text-[10px] font-black bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                  {selectedEvent.type}
                </span>
              </div>
              <p className="text-sm font-black text-indigo-950 mt-1">
                {displayTitle}
              </p>
            </div>
          </div>
          <button 
            onClick={handleCloseDetail}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors border-none bg-transparent cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 이벤트 속성 상세 컴팩트 명세 보드 */}
        <div className="bg-slate-50/80 border border-slate-200/70 rounded-2xl p-3.5 space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider">이벤트 데이터 명세</h4>
            <span className="text-[10px] font-mono font-bold bg-slate-200/70 text-slate-600 px-2 py-0.5 rounded-md">
              ID: {selectedEvent.id}
            </span>
          </div>

          {/* 슬림 컴팩트 4컬럼 메타 그리드 */}
          <div className="bg-white p-2.5 rounded-xl border border-slate-200/60 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
            <div>
              <span className="text-slate-400 font-medium block text-[10px]">발생 유형</span>
              <span className="font-bold text-slate-800 shrink-0">{selectedEvent.type}</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block text-[10px]">요청 종류</span>
              <span className="font-extrabold text-indigo-600 truncate block">
                {selectedEvent.data?.doc_type === 'mobile_request' || selectedEvent.data?.doc_type === 'mobile_req' ? '모바일 현장 상신' : (selectedEvent.data?.doc_type || '관제 요청')}
              </span>
            </div>
            <div className="col-span-2 sm:col-span-2">
              <span className="text-slate-400 font-medium block text-[10px]">요청 식별 번호</span>
              <span className="font-mono font-bold text-slate-700 truncate block">{selectedEvent.data?.doc_id || selectedEvent.id}</span>
            </div>
          </div>

          {/* 비즈니스 별 세부 명세 영역 */}
          {selectedEvent.type === 'STORE_ORDER' && (
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/60 grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400 font-medium block text-[10px]">주문 고객</span>
                <span className="font-bold text-slate-800">{selectedEvent.data.customer_name} ({selectedEvent.data.customer_phone})</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block text-[10px]">주문 품목</span>
                <span className="font-bold text-slate-800">{selectedEvent.data.product_name} ({selectedEvent.data.quantity}개)</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block text-[10px]">결제 금액</span>
                <span className="font-bold text-slate-800">{Number(selectedEvent.data.total_price || 0).toLocaleString()}원</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block text-[10px]">배송지 주소</span>
                <span className="font-bold text-slate-800 truncate block">{selectedEvent.data.shipping_address || '직접 수령'}</span>
              </div>
              {selectedEvent.data.customer_memo && (
                <div className="col-span-2 border-t border-slate-100 pt-1.5 mt-0.5">
                  <span className="text-slate-400 font-medium block text-[10px]">고객 메모</span>
                  <span className="font-medium text-slate-700 whitespace-pre-wrap">{selectedEvent.data.customer_memo}</span>
                </div>
              )}
            </div>
          )}

          {selectedEvent.type === 'RAG_HOLD' && (
            <div className="space-y-2">
              {selectedEvent.data?.reason && (
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/60 space-y-1">
                  <span className="text-slate-400 font-medium block text-[10px]">현장 요청 사항 (음성 변환)</span>
                  <span className="font-semibold text-indigo-950 text-xs block leading-relaxed whitespace-pre-wrap">
                    {selectedEvent.data.reason}
                  </span>
                </div>
              )}

              {/* 📷 1. [상신 첨부 현장 사진 썸네일 미리보기 리스트] */}
              {modalPhotos.length > 0 && (
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/60 space-y-1.5">
                  <span className="text-[10px] font-black text-indigo-700 flex items-center gap-1">
                    <Paperclip className="w-3 h-3 text-indigo-600" />
                    <span>등록된 현장 사진 ({modalPhotos.length}건)</span>
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {modalPhotos.map((photo: any, idx: number) => {
                      const imgUrl = photo.preview || photo.base64 || photo.url || photo;
                      const imgName = photo.name || `현장사진_${idx + 1}`;
                      return (
                        <a
                          key={idx}
                          href={typeof imgUrl === 'string' ? imgUrl : '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group relative rounded-xl overflow-hidden border border-slate-200 aspect-video bg-slate-100 flex flex-col justify-end p-1.5 transition-all hover:border-indigo-400"
                        >
                          {typeof imgUrl === 'string' && (
                            <img src={imgUrl} alt={imgName} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          )}
                          <div className="relative z-10 bg-slate-900/70 backdrop-blur-3xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md truncate">
                            {imgName}
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 📎 2. [상신 첨부 서류 파일 다운로드/미리보기 리스트] */}
              {modalFiles.length > 0 && (
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/60 space-y-1.5">
                  <span className="text-[10px] font-black text-indigo-700 flex items-center gap-1">
                    <Paperclip className="w-3 h-3 text-indigo-600" />
                    <span>상신 첨부 서류 ({modalFiles.length}건)</span>
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {modalFiles.map((att: any, attIdx: number) => {
                      const fileUrl = att.url || att.preview || att.base64;
                      const fileName = att.name || att.filename || `서류파일_${attIdx + 1}`;
                      return (
                        <a
                          key={attIdx}
                          href={fileUrl || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-extrabold text-[11px] px-2.5 py-1 rounded-lg border border-indigo-200/80 transition-all cursor-pointer text-decoration-none"
                        >
                          <FileText className="w-3 h-3 text-indigo-600 shrink-0" />
                          <span className="truncate max-w-[200px]">{fileName}</span>
                          <ExternalLink className="w-3 h-3 text-indigo-400 shrink-0" />
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
          {(selectedEvent.type === 'TASK_CANCEL_REQUEST' || selectedEvent.data?.has_cancel_request) && (
            <div className="bg-white p-2.5 rounded-xl border border-rose-200/80 grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400 font-medium block text-[10px]">상신 취소 요청자</span>
                <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 inline-block">
                  👤 {selectedEvent.data?.cancel_request_operator || selectedEvent.data?.operator || '임직원'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block text-[10px]">대상 업무 ID</span>
                <span className="font-mono font-bold text-slate-800">{selectedEvent.data?.doc_id || selectedEvent.data?.id || '-'}</span>
              </div>
              <div className="col-span-2 border-t border-rose-100 pt-1.5 mt-0.5">
                <span className="text-slate-400 font-medium block text-[10px]">취소 신청 사유</span>
                <span className="font-semibold text-rose-950 text-xs block leading-relaxed whitespace-pre-wrap">
                  {selectedEvent.data?.cancel_log?.note || selectedEvent.data?.reason || '직원 취소 요청 건입니다.'}
                </span>
              </div>
            </div>
          )}
          {selectedEvent.type === 'LOW_STOCK' && (
            <div className="bg-white p-2.5 rounded-xl border border-rose-200/80 grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400 font-medium block text-[10px]">상품 코드</span>
                <span className="font-mono font-bold text-slate-800">{selectedEvent.data.barcode || `INV-${selectedEvent.data.id}`}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block text-[10px]">상품 명</span>
                <span className="font-bold text-slate-855">{selectedEvent.data.name || selectedEvent.data.itemName}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block text-[10px]">현재고 / 안전재고 한도</span>
                <span className="font-bold text-rose-600">{selectedEvent.data.quantity}개 / {selectedEvent.data.safety_stock || selectedEvent.data.safetyStock}개</span>
              </div>
            </div>
          )}

          {selectedEvent.type === 'LEAVE_APPROVAL_REQUEST' && (
            <div className="bg-white p-2.5 rounded-xl border border-indigo-200/80 grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400 font-medium block text-[10px]">연차/휴가 신청자</span>
                <span className="font-bold text-slate-800">{selectedEvent.data.employee_name || '임직원'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block text-[10px]">휴가 종류 (소요 일수)</span>
                <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg text-xs w-fit inline-block">
                  {selectedEvent.data.leave_type_str} ({selectedEvent.data.days_spent}일)
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block text-[10px]">휴가 희망 기간</span>
                <span className="font-bold text-slate-800">
                  {selectedEvent.data.leave_type === 'HALF_AM'
                    ? `${selectedEvent.data.start_date} 오전`
                    : selectedEvent.data.leave_type === 'HALF_PM'
                    ? `${selectedEvent.data.start_date} 오후`
                    : `${selectedEvent.data.start_date} ~ ${selectedEvent.data.end_date}`}
                </span>
              </div>
              <div className="col-span-2 border-t border-slate-100 pt-1.5 mt-0.5">
                <span className="text-slate-400 font-medium block text-[10px]">휴가 신청 상세 사유</span>
                <span className="font-semibold text-slate-800 bg-slate-50 p-2.5 rounded-xl block leading-relaxed border border-slate-150 whitespace-pre-wrap">
                  {selectedEvent.data.reason || '사유가 기재되지 않았습니다.'}
                </span>
              </div>
            </div>
          )}
        </div>

          {/* 🟢 1. 관제 조치 완료 건일 때: 실행 결과 보고서 카드 시각화 */}
        {isResolved && (
          <div className="bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-white border border-emerald-200 rounded-3xl p-5 shadow-xs space-y-4 text-left animate-fade-in">
            <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-2xl bg-emerald-100/80 text-emerald-700">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                </span>
                <div>
                  <h4 className="text-sm font-black text-slate-850 flex items-center gap-1.5">
                    <span>관제 조치 완료 보고서</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black">
                      RESOLVED
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium">본 안건에 대한 관제 조치 및 자율 작업 실행이 성공적으로 완결되었습니다.</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-bold block">조치 완료 일시</span>
                <span className="text-xs font-black text-emerald-700 font-mono">
                  {selectedEvent.resolved_at || selectedEvent.data?.updated_at || selectedEvent.created_at}
                </span>
              </div>
            </div>

            {/* 조치자 및 처리 사유/결과 */}
            <div className="bg-white/90 border border-emerald-150 rounded-2xl p-4 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-bold flex items-center gap-1">
                  👤 최종 조치자: <strong className="text-slate-800">{selectedEvent.data?.updated_by || '최고관리자'}</strong>
                </span>
                <span className="text-slate-500 font-bold flex items-center gap-1">
                  📅 상신 일시: <span className="font-mono text-slate-700">{selectedEvent.created_at}</span>
                </span>
              </div>

              <div className="border-t border-slate-100 pt-2.5">
                <span className="text-[11px] font-black text-emerald-800 block mb-1">📋 실행 결과 및 감사 사유</span>
                <div className="bg-slate-50 border border-slate-150 rounded-xl p-3 text-xs text-slate-700 font-semibold leading-relaxed whitespace-pre-wrap">
                  {selectedEvent.data?.reason || '최고관리자에 의해 자율 조치 및 연동 등록이 완료되었습니다.'}
                </div>
              </div>

              {/* 바로가기 액션 버튼 */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                <a
                  href="/estimates"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-xs transition-all text-decoration-none"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>수주 대장 (견적/발주/수주) 확인하기</span>
                </a>
                {modalFiles.length > 0 && (
                  <a
                    href={modalFiles[0]?.url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all text-decoration-none"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-600" />
                    <span>상신 실물 서류 열람 ({modalFiles[0]?.name || '서류'})</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 📅 관제 대상 건 처리 일시 (완료 마감일 due_date) 지정 및 변경 컨트롤 바 (일반 업무 상신 대기 상태일 때만 렌더링) */}
        {!isResolved && !isDeleteOrHoldEvent && (
          <div className="bg-gradient-to-r from-indigo-50/80 via-purple-50/40 to-slate-50 border border-indigo-150 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-indigo-900 font-extrabold text-xs">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span>📅 관제 대상 처리 일시 (완료 마감일 due_date) 지정/변경</span>
              </div>
              <span className="text-[10px] text-indigo-600 bg-indigo-100/80 font-bold px-2 py-0.5 rounded-md">
                모바일 포털 주/월 연동
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={eventDueDate}
                onChange={(e) => setEventDueDate(e.target.value)}
                className="bg-white border border-indigo-200 rounded-xl px-3 py-2 text-xs font-extrabold text-slate-800 outline-none focus:border-indigo-500 flex-1 shadow-2xs"
              />
              <button
                type="button"
                onClick={handleSaveEventDueDate}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs whitespace-nowrap active:scale-95 flex items-center gap-1"
              >
                <span>처리 일시 저장</span>
              </button>
            </div>
          </div>
        )}

        {/* AI 추천 자율 대행 액션 리스트 및 최고관리자 항목 추가/제거 (대기 상태일 때만 노출) */}
        {!isResolved && !actionReports && selectedEvent.type !== 'LEAVE_APPROVAL_REQUEST' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <ListTodo className="w-4 h-4 text-indigo-650" />
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">AI 권장 자율 대행 조치 시나리오</h4>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingAdhocSms((prev) => !prev);
                    setIsAddingAction(false);
                  }}
                  className="inline-flex items-center gap-1 bg-purple-50 hover:bg-purple-100 text-purple-700 font-extrabold text-[11px] px-2.5 py-1 rounded-lg border border-purple-200 transition-all cursor-pointer shadow-2xs"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-purple-600" />
                  <span>+ 1회성 문자 추가</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingAction((prev) => !prev);
                    setIsAddingAdhocSms(false);
                  }}
                  className="inline-flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-[11px] px-2.5 py-1 rounded-lg border border-indigo-200 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-indigo-600" />
                  <span>+ 추천 작업 추가</span>
                </button>
                <span className="text-[10px] text-indigo-600 bg-indigo-50 font-bold px-2 py-0.5 rounded-md border border-indigo-100 hidden sm:inline-block">
                  선택/제거/추가 가능
                </span>
              </div>
            </div>

            {/* 📱 1회성 맞춤 알림 문자 인라인 작성 폼 */}
            {isAddingAdhocSms && (
              <div className="bg-gradient-to-br from-purple-50/90 via-indigo-50/60 to-white border border-purple-200 rounded-2xl p-4 space-y-3.5 animate-fade-in shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-purple-950 flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-purple-600" />
                    <span>📱 1회성 맞춤 문자 추가 발송 설정</span>
                  </span>
                  <span className="text-[10px] bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded-full border border-purple-200">
                    0원 무료 SMS 연동
                  </span>
                </div>

                {/* 부서 원클릭 다중 선택 칩 */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-700 block">👥 수신 부서/팀 원클릭 선택:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from(new Set(allOperators.map((o: any) => o.department || '기타'))).map((dept) => {
                      const deptOps = allOperators.filter((o: any) => (o.department || '기타') === dept);
                      const isDeptAllSelected = deptOps.length > 0 && deptOps.every((o: any) => adhocSelectedOpIds.includes(String(o.id)));

                      return (
                        <button
                          key={dept}
                          type="button"
                          onClick={() => {
                            const deptOpIds = deptOps.map((o: any) => String(o.id));
                            if (isDeptAllSelected) {
                              setAdhocSelectedOpIds((prev) => prev.filter((id) => !deptOpIds.includes(id)));
                            } else {
                              setAdhocSelectedOpIds((prev) => Array.from(new Set([...prev, ...deptOpIds])));
                            }
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                            isDeptAllSelected
                              ? 'bg-purple-600 text-white border-purple-700 shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-purple-50 hover:text-purple-700'
                          }`}
                        >
                          {dept} ({deptOps.length}명)
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 개별 임직원 선택 칩 */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-700 block">👤 개별 담당자 선택:</span>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-white/80 rounded-xl border border-slate-200">
                    {allOperators.map((op: any) => {
                      const isSelected = adhocSelectedOpIds.includes(String(op.id));
                      return (
                        <button
                          key={op.id}
                          type="button"
                          onClick={() => {
                            setAdhocSelectedOpIds((prev) =>
                              isSelected ? prev.filter((id) => id !== String(op.id)) : [...prev, String(op.id)]
                            );
                          }}
                          className={`px-2 py-0.8 rounded-md text-[11px] font-bold transition-all border cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {op.name} {op.department ? `(${op.department})` : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 직접 전화번호 입력 */}
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-700 block">📞 직접 번호 입력 (쉼표로 구분):</span>
                  <input
                    type="text"
                    value={adhocCustomPhone}
                    onChange={(e) => setAdhocCustomPhone(e.target.value)}
                    placeholder="예: 010-1234-5678, 010-9876-5432"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* 발송 메시지 입력란 */}
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-700 block">✍️ 발송 메시지 내용:</span>
                  <textarea
                    value={adhocMessage}
                    onChange={(e) => setAdhocMessage(e.target.value)}
                    rows={3}
                    placeholder="전송할 알림 문구를 입력하세요."
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 leading-relaxed"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingAdhocSms(false)}
                    className="px-3 py-1.5 text-slate-500 hover:bg-slate-200/60 rounded-xl text-xs font-bold transition-all border-none bg-transparent cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleAddAdhocSms}
                    className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs flex items-center gap-1"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>1회성 문자 목록에 추가</span>
                  </button>
                </div>
              </div>
            )}

            {/* 🤖 ✨ 최고관리자 자연어 스마트 AI 자율 조치 생성 폼 */}
            {isAddingAction && (
              <div className="bg-gradient-to-br from-indigo-50/90 via-slate-50 to-white border border-indigo-200 rounded-2xl p-4 space-y-3.5 animate-fade-in shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
                    <span>✨ AI 자연어 스마트 자율 조치 생성기</span>
                  </span>
                  <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full border border-indigo-200">
                    이메일 / 지식 / 태스크 / 재고 자동 생성
                  </span>
                </div>

                {/* 빠른 추천 예시 지시 칩 */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-700 block">💡 빠른 예시 지시문 클릭:</span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setNaturalPrompt("생산팀과 자재팀에 이번 수주 취소 공문 이메일을 정중하게 발송해줘.")}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50 transition-all cursor-pointer text-left shadow-2xs"
                    >
                      📧 생산·자재팀 취소 공문 이메일
                    </button>
                    <button
                      type="button"
                      onClick={() => setNaturalPrompt("이번 취소 사유와 고객사 클레임 내용을 지식관리에 '수주 취소 재발방지 가이드'로 등록해줘.")}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50 transition-all cursor-pointer text-left shadow-2xs"
                    >
                      🧠 지식관리에 재발방지 가이드 등록
                    </button>
                    <button
                      type="button"
                      onClick={() => setNaturalPrompt("영업부 담당자에게 거래처 방문 및 고객 사후 관리 스냅태스크를 배정해줘.")}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white text-amber-700 border border-amber-200 hover:bg-amber-50 transition-all cursor-pointer text-left shadow-2xs"
                    >
                      📋 영업부 사후 관리 태스크 배정
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-700 block">✍️ 원하시는 지시를 자연어로 입력하세요:</span>
                  <textarea
                    value={naturalPrompt}
                    onChange={(e) => setNaturalPrompt(e.target.value)}
                    rows={3}
                    placeholder="예: 생산팀에 취소 공문 이메일 보내고, 이 건의 취소 사유를 지식관리에 '수주 취소 사례'로 등록해줘."
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                  />
                </div>

                <div className="flex justify-between items-center pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingAction(false)}
                    className="px-3 py-1.5 text-slate-500 hover:bg-slate-200/60 rounded-xl text-xs font-bold transition-all border-none bg-transparent cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGenerateNaturalAction()}
                    disabled={isParsingNatural || !naturalPrompt.trim()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    {isParsingNatural ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>AI 의도 분석 및 작업 카드 생성 중...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>AI 자율 액션 카드 생성 ✨</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2.5">
              {actionsList.map((act: any) => {
                const isSelected = selectedActions.includes(act.code);
                const isCustom = act.code.startsWith("CUSTOM_");
                const isSms = act.isSmsAction;
                const isEmail = act.isEmailAction;
                const isKnowledge = act.isKnowledgeAction;
                const isTask = act.isTaskAction;

                return (
                  <div
                    key={act.code}
                    onClick={() => {
                      setSelectedActions((prev) =>
                        isSelected ? prev.filter((c) => c !== act.code) : [...prev, act.code]
                      );
                    }}
                    className={`rounded-2xl border transition-all cursor-pointer overflow-hidden ${
                      isEmail
                        ? isSelected
                          ? "bg-gradient-to-br from-blue-50/90 to-indigo-50/70 border-indigo-300 shadow-sm"
                          : "bg-slate-50/60 border-slate-200 opacity-70 hover:opacity-100"
                        : isKnowledge
                          ? isSelected
                            ? "bg-gradient-to-br from-emerald-50/90 to-teal-50/70 border-emerald-300 shadow-sm"
                            : "bg-slate-50/60 border-slate-200 opacity-70 hover:opacity-100"
                        : isTask
                          ? isSelected
                            ? "bg-gradient-to-br from-amber-50/90 to-orange-50/70 border-amber-300 shadow-sm"
                            : "bg-slate-50/60 border-slate-200 opacity-70 hover:opacity-100"
                        : isSms
                          ? isSelected
                            ? "bg-gradient-to-br from-purple-50/90 to-indigo-50/70 border-purple-300 shadow-sm"
                            : "bg-slate-50/60 border-slate-200 opacity-70 hover:opacity-100"
                        : act.isDeleteAction
                          ? isSelected
                            ? "bg-gradient-to-br from-rose-50/90 to-amber-50/70 border-rose-300 shadow-sm"
                            : "bg-slate-50/60 border-slate-200 opacity-70 hover:opacity-100"
                        : act.isOrderAction
                          ? isSelected
                            ? "bg-gradient-to-br from-blue-50/90 to-cyan-50/70 border-blue-300 shadow-sm"
                            : "bg-slate-50/60 border-slate-200 opacity-70 hover:opacity-100"
                          : isSelected
                            ? "bg-indigo-50/60 border-indigo-300 shadow-2xs p-3.5"
                            : "bg-slate-50/50 border-slate-200/60 opacity-60 hover:opacity-100 p-3.5"
                    }`}
                  >
                    {act.isEmailAction ? (
                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <button type="button" className="text-indigo-600 border-none bg-transparent cursor-pointer p-0">
                              {isSelected ? <CheckSquare className="w-4.5 h-4.5" /> : <Square className="w-4.5 h-4.5 text-slate-400" />}
                            </button>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-xs font-black ${isSelected ? "text-indigo-950" : "text-slate-700"}`}>
                                {act.label}
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-black border border-blue-200">
                                📧 비즈니스 공문 이메일
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-black border border-indigo-200">
                                AI 자동 정중 작성
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => handleRemoveAction(e, act.code)}
                            className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all border-none bg-transparent cursor-pointer shrink-0"
                            title="해당 작업 항목 제거/해제"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="ml-7 bg-white/90 border border-indigo-150 rounded-xl p-3 shadow-2xs space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-bold text-indigo-900 border-b border-indigo-50 pb-1">
                            <span>수신: {act.to || act.description}</span>
                            <span className="text-[10px] text-slate-400 font-normal">제목: {act.subject || '공문 안내'}</span>
                          </div>
                          <p className="text-xs text-slate-800 font-medium whitespace-pre-wrap leading-relaxed">
                            {act.body || act.description}
                          </p>
                        </div>
                      </div>
                    ) : act.isKnowledgeAction ? (
                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <button type="button" className="text-emerald-600 border-none bg-transparent cursor-pointer p-0">
                              {isSelected ? <CheckSquare className="w-4.5 h-4.5" /> : <Square className="w-4.5 h-4.5 text-slate-400" />}
                            </button>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-xs font-black ${isSelected ? "text-emerald-950" : "text-slate-700"}`}>
                                {act.label}
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black border border-emerald-200">
                                🧠 사내 지식 RAG 영구 색인
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-black border border-teal-200">
                                재발방지 아카이빙
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => handleRemoveAction(e, act.code)}
                            className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all border-none bg-transparent cursor-pointer shrink-0"
                            title="해당 작업 항목 제거/해제"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="ml-7 bg-white/90 border border-emerald-150 rounded-xl p-3 shadow-2xs space-y-1.5">
                          <span className="text-[11px] font-bold text-emerald-900 block border-b border-emerald-50 pb-1">
                            문서 제목: {act.title || act.label}
                          </span>
                          <p className="text-xs text-slate-800 font-medium whitespace-pre-wrap leading-relaxed">
                            {act.content || act.description}
                          </p>
                        </div>
                      </div>
                    ) : act.isTaskAction ? (
                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <button type="button" className="text-amber-600 border-none bg-transparent cursor-pointer p-0">
                              {isSelected ? <CheckSquare className="w-4.5 h-4.5" /> : <Square className="w-4.5 h-4.5 text-slate-400" />}
                            </button>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-xs font-black ${isSelected ? "text-amber-950" : "text-slate-700"}`}>
                                {act.label}
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black border border-amber-200">
                                📋 모바일 스냅태스크 배정
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 text-[10px] font-black border border-orange-200">
                                담당: {act.assignee || '담당자'}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => handleRemoveAction(e, act.code)}
                            className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all border-none bg-transparent cursor-pointer shrink-0"
                            title="해당 작업 항목 제거/해제"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="ml-7 bg-white/90 border border-amber-150 rounded-xl p-3 shadow-2xs space-y-1">
                          <p className="text-xs text-slate-800 font-medium whitespace-pre-wrap leading-relaxed">
                            {act.content || act.description}
                          </p>
                        </div>
                      </div>
                    ) : act.isDeleteAction ? (
                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <button type="button" className="text-rose-600 border-none bg-transparent cursor-pointer p-0">
                              {isSelected ? <CheckSquare className="w-4.5 h-4.5" /> : <Square className="w-4.5 h-4.5 text-slate-400" />}
                            </button>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-xs font-black ${isSelected ? "text-rose-950" : "text-slate-700"}`}>
                                {act.label}
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black border border-rose-200">
                                🗑️ 데이터 영구 폐기
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black border border-amber-200">
                                🛡️ RAG 규정 준수 승인
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => handleRemoveAction(e, act.code)}
                            className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all border-none bg-transparent cursor-pointer shrink-0"
                            title="해당 작업 항목 제거/해제"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="ml-7 bg-white/90 border border-rose-150 rounded-xl p-3 shadow-2xs space-y-1">
                          <p className="text-xs text-rose-950 font-semibold leading-relaxed">
                            {act.description}
                          </p>
                        </div>
                      </div>
                    ) : act.isOrderAction ? (
                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <button type="button" className="text-blue-600 border-none bg-transparent cursor-pointer p-0">
                              {isSelected ? <CheckSquare className="w-4.5 h-4.5" /> : <Square className="w-4.5 h-4.5 text-slate-400" />}
                            </button>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-xs font-black ${isSelected ? "text-blue-950" : "text-slate-700"}`}>
                                {act.label}
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black border border-blue-200">
                                📑 실물 데이터 파싱
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-700 text-[10px] font-black border border-cyan-200">
                                📦 수주 대장 자동 연동
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => handleRemoveAction(e, act.code)}
                            className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all border-none bg-transparent cursor-pointer shrink-0"
                            title="해당 작업 항목 제거/해제"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* 파일명 및 설명 박스 */}
                        <div className="ml-7 bg-white/90 border border-blue-100 rounded-xl p-3 shadow-2xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-blue-600 flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              상신 첨부 서류: {act.fileName || 'LS발주서.xlsx'}
                            </span>
                            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.2 rounded">
                              자동 파싱 준비완료
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 font-semibold leading-relaxed">
                            {act.description}
                          </p>
                        </div>
                      </div>
                    ) : isSms ? (
                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <button type="button" className="text-indigo-600 border-none bg-transparent cursor-pointer p-0">
                              {isSelected ? <CheckSquare className="w-4.5 h-4.5" /> : <Square className="w-4.5 h-4.5 text-slate-400" />}
                            </button>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-xs font-black ${isSelected ? "text-indigo-950" : "text-slate-700"}`}>
                                {act.label}
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-black border border-indigo-200">
                                0원 무료 P2P SMS
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-black border border-purple-200">
                                ⚡ 문자 관제 규칙 연동
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => handleRemoveAction(e, act.code)}
                            className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all border-none bg-transparent cursor-pointer shrink-0"
                            title="해당 작업 항목 제거/해제"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* 수신자 명단 태그 */}
                        <div className="flex items-center gap-1.5 flex-wrap pl-7">
                          <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                            <Users className="w-3 h-3 text-indigo-600" />
                            수신 대상:
                          </span>
                          {act.targetRecipients && act.targetRecipients.map((r: any, rIdx: number) => (
                            <span key={rIdx} className="px-2 py-0.5 rounded-md bg-white border border-indigo-200 text-indigo-900 text-[11px] font-extrabold shadow-2xs">
                              {r.name} {r.dept ? `(${r.dept})` : ''} {r.phone ? `· ${r.phone}` : ''}
                            </span>
                          ))}
                          <span className="text-[10px] font-bold text-indigo-600">
                            [총 {act.targetRecipients?.length || 0}명 수신]
                          </span>
                        </div>

                        {/* 발송 문구 미리보기 말풍선 */}
                        <div className="ml-7 bg-white/90 border border-indigo-100 rounded-xl p-3 shadow-2xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-indigo-600 flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" />
                              연결 템플릿: &apos;{act.templateTitle}&apos;
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold">자동 치환 적용됨</span>
                          </div>
                          <p className="text-xs text-slate-800 font-semibold whitespace-pre-wrap leading-relaxed">
                            &ldquo;{act.finalMessage}&rdquo;
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <button type="button" className="text-indigo-600 border-none bg-transparent cursor-pointer p-0">
                            {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-400" />}
                          </button>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className={`text-xs font-bold block ${isSelected ? "text-indigo-950 font-black" : "text-slate-800"}`}>
                                {act.label}
                              </span>
                              {isCustom && (
                                <span className="px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 text-[9px] font-black shrink-0">
                                  직접 추가됨
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 font-medium leading-relaxed block">{act.description}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => handleRemoveAction(e, act.code)}
                          className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all border-none bg-transparent cursor-pointer shrink-0"
                          title="해당 작업 항목 제거/해제"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 🤖 향후 동일 유형 이벤트 AI 자율 자동 실행 규칙 등록 스위치 */}
            <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-3.5 flex items-center justify-between gap-3 mt-3">
              <div className="space-y-0.5">
                <span className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>동일 유형 업무 발생 시 AI 자율 자동 실행 규칙으로 승인 등록</span>
                </span>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  스위치를 켜고 자율 작업을 실행하면, 향후 동일한 유형의 업무 발생 시 관리자 수동 승인 없이 AI가 자동으로 승인 대행합니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSaveAutoRuleOnExecute(!saveAutoRuleOnExecute)}
                className={`p-1 rounded-full transition-colors cursor-pointer border-none bg-transparent shrink-0 ${
                  saveAutoRuleOnExecute ? 'text-indigo-600' : 'text-slate-300'
                }`}
                title="AI 자율 자동 실행 규칙 활성화 토글"
              >
                {saveAutoRuleOnExecute ? (
                  <ToggleRight className="w-8 h-8 text-indigo-600" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-slate-300" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* 작업 수행 결과 리포트 출력 */}
        {actionReports && (
          <div className="space-y-3 animate-fade-in">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">AI 자율 대행 수행 보고서</h4>
            </div>
            <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 bg-white overflow-hidden text-left">
              {actionReports.map((rep, idx) => (
                <div key={idx} className="p-4 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${rep.success ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`}></span>
                    <span className="text-xs font-black text-slate-850 uppercase">{rep.action}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-sm ${rep.success ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                      {rep.success ? "성공" : "실패"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-650 font-semibold pl-4 leading-relaxed">{rep.detail}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 모달 푸터 버튼 */}
        <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
          <button
            onClick={handleCloseDetail}
            className="bg-white hover:bg-slate-50 text-slate-700 font-bold px-5 py-3 rounded-xl border border-slate-200 shadow-xs text-xs transition-colors cursor-pointer"
          >
            {isResolved ? "닫기" : actionReports ? "닫기 및 리프레시" : "검토 보류"}
          </button>
          
          {isResolved ? null : !actionReports && (selectedEvent.type === 'TASK_CANCEL_REQUEST' || selectedEvent.data?.has_cancel_request) ? (
            <div className="flex gap-2">
              <button
                onClick={() => handleRejectCancelRequest(selectedEvent)}
                disabled={isExecuting}
                className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold px-5 py-3 rounded-xl shadow-xs text-xs border border-rose-200 cursor-pointer transition-all flex items-center gap-1.5"
              >
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>취소 기각 (상신 유지)</span>
              </button>
              <button
                onClick={() => handleApproveCancelRequest(selectedEvent)}
                disabled={isExecuting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl shadow-xs text-xs border-none cursor-pointer flex items-center gap-1.5 transition-all shadow-sm"
              >
                {isExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>취소 승인 및 데이터 삭제 ⚡</span>
              </button>
            </div>
          ) : !actionReports && selectedEvent.type === 'LEAVE_APPROVAL_REQUEST' ? (
            <div className="flex gap-2">
              <button
                onClick={() => handleRejectLeave(selectedEvent.data.id)}
                disabled={isExecuting}
                className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold px-6 py-3 rounded-xl shadow-xs text-xs border border-rose-200 cursor-pointer transition-all"
              >
                기각 및 반려
              </button>
              <button
                onClick={() => handleApproveLeave(selectedEvent.data.id)}
                disabled={isExecuting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl shadow-xs text-xs border-none cursor-pointer flex items-center gap-1.5 transition-all"
              >
                {isExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>최종 결재 승인</span>
              </button>
            </div>
          ) : !actionReports ? (
            <button
              onClick={() => {
                const selectedSmsActions = actionsList.filter(
                  (act: any) => act.isSmsAction && selectedActions.includes(act.code)
                );
                const smsPayloadList = selectedSmsActions.map((a: any) => a.smsPayload).filter(Boolean);

                handleExecuteActions({ 
                  saveAutoRule: saveAutoRuleOnExecute,
                  smsPayload: selectedActions.includes('SMS_AUTO_NOTIFY') ? matchedSmsAction?.smsPayload : undefined,
                  smsPayloadList: smsPayloadList,
                  customActionPayloads: customActionPayloads
                });
              }}
              disabled={isExecuting || selectedActions.length === 0}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white font-bold px-6 py-3 rounded-xl shadow-xs text-xs border-none cursor-pointer flex items-center gap-2 transition-all"
            >
              {isExecuting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AI 자율 대행 처리 중...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 animate-pulse" />
                  <span>선택한 자율 작업 실행 ⚡</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => {
                handleCloseDetail();
                loadData();
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl shadow-xs text-xs border-none cursor-pointer flex items-center gap-1.5 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>최종 관제 완료 및 리스트업 갱신</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
