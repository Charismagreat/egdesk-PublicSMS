// HMR trigger timestamp: 2026-06-12 13:50:00
'use client';

import { apiFetch } from '@/lib/api';
import React, { useState, useEffect } from 'react';
import { usePersistedState } from "@/hooks/usePersistedState";
import { 
  FileText, 
  Plus, 
  Settings, 
  Printer, 
  Trash2, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  XCircle,
  FileCheck,
  RefreshCw,
  Search,
  ChevronRight,
  HelpCircle,
  Database,
  History,
  Info,
  Copy,
  Download,
  Upload
} from 'lucide-react';

import WebTemplateEditor from './components/WebTemplateEditor';

interface WebTemplate {
  id: number;
  template_name: string;
  document_type: string;
  html_content: string;
  is_active: number;
  updated_at: string;
  updated_by: string;
}

interface PrintLog {
  id: number;
  template_id: number;
  record_id: string;
  record_name: string;
  print_data: string;
  issue_date: string;
  uuid: string;
  updated_at: string;
  updated_by: string;
  template_name: string;
  document_type: string;
  html_content?: string;
}

export default function FormManagementNewPage() {
  const [activeTab, setActiveTab, isActiveTabRestored] = usePersistedState<'templates' | 'logs'>('egdesk_form_activeTab', 'templates');
  const [viewMode, setViewMode, isViewModeRestored] = usePersistedState<'list' | 'editor'>('egdesk_form_viewMode', 'list');
  const [templates, setTemplates] = useState<WebTemplate[]>([]);
  const [logs, setLogs] = useState<PrintLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [previewLog, setPreviewLog] = useState<PrintLog | null>(null);
  
  // 발급/출력 이력 조회 관련 상태 (검색, 페이징)
  const [logSearchQuery, setLogSearchQuery, isLogSearchQueryRestored] = usePersistedState('egdesk_form_logSearchQuery', '');
  const [logCurrentPage, setLogCurrentPage, isLogCurrentPageRestored] = usePersistedState('egdesk_form_logCurrentPage', 1);
  const [logPerPage, setLogPerPage, isLogPerPageRestored] = usePersistedState('egdesk_form_logPerPage', 10);
  
  // 편집용 상태
  const [selectedTemplateId, setSelectedTemplateId, isSelectedTemplateIdRestored] = usePersistedState<number | undefined>('egdesk_form_selectedTemplateId', undefined);
  
  // 인쇄용 선택 모달 상태 (AI 자동 동적 쿼리 및 수기 완결 구조 전격 도입)
  const [printTemplateId, setPrintTemplateId] = useState<number | null>(null);
  const [printTemplateName, setPrintTemplateName] = useState<string>('');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printStep, setPrintStep] = useState<'search' | 'configure'>('search');
  
  // 1단계 AI 검색 상태
  const [searchKeyword, setSearchKeyword, isSearchKeywordRestored] = usePersistedState('egdesk_form_searchKeyword', '');
  const [aiSearching, setAiSearching] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  
  // AI SQL 쿼리 조회용 상태
  const [generatedSql, setGeneratedSql] = useState<string | null>(null);
  const [showSql, setShowSql] = useState(false);

  // 2단계 수동 편집 데이터 상태
  const [companyProfile, setCompanyProfile] = useState<any>({});
  const [manualData, setManualData, isManualDataRestored] = usePersistedState('egdesk_form_manualData', {
    record_id: 'MANUAL',
    staff_name: '',
    department: '',
    position: '',
    resident_id: '',
    address: '',
    usage: '',
    employment_period: '',
    issue_dept: '',
    issue_phone: '',
    issue_email: '',
    issue_fax: '',
    issue_year: '',
    issue_month: '',
    issue_day: ''
  });

  // SCM용 입력 데이터 상태
  const [scmData, setScmData] = useState<any>({
    recipient_company: '',
    recipient_address: '',
    recipient_contact: '',
    recipient_phone: '',
    supplier_company: '',
    supplier_address: '',
    supplier_owner: '',
    supplier_phone: '',
    transaction_type: '자재구매',
    document_memo: '',
    items: [
      {
        product_name: '',
        billing_type: 'general',
        billing_type_name: '일반단가',
        unit: 'EA',
        quantity: 1,
        unit_price: 0,
        amount: 0,
        delivery_date: '',
        has_cost_breakdown: false,
        cost_breakdown: {
          material_cost: 0,
          processing_cost: 0,
          overhead_cost: 0,
          other_expenses: 0,
          delivery_expense: 0
        }
      }
    ]
  });

  const activePrintTemplate = templates.find(t => t.id === printTemplateId);
  const isScmTemplate = activePrintTemplate?.document_type && (
    activePrintTemplate.document_type.startsWith('ESTIMATE_') ||
    activePrintTemplate.document_type.startsWith('PURCHASE_ORDER_')
  );

  // 모든 세션 상태 복원이 완료되었는지 감시하는 플래그
  const isRestored = isActiveTabRestored && isViewModeRestored && isLogSearchQueryRestored && isLogCurrentPageRestored && isLogPerPageRestored && isSelectedTemplateIdRestored && isSearchKeywordRestored && isManualDataRestored;

  // 가져오기 중복 시 모달 상태
  const [importConflictData, setImportConflictData] = useState<any | null>(null);
  const [isImportConflictModalOpen, setIsImportConflictModalOpen] = useState(false);

  // 양식 다운로드 (내보내기)
  const handleDownloadTemplate = (tmpl: WebTemplate) => {
    try {
      const backupData = {
        template_name: tmpl.template_name,
        document_type: tmpl.document_type || '',
        html_content: tmpl.html_content || '',
        web_html_content: (tmpl as any).web_html_content || '',
        is_active: tmpl.is_active !== undefined ? tmpl.is_active : 1,
        is_print_active: (tmpl as any).is_print_active !== undefined ? (tmpl as any).is_print_active : 1,
        is_web_active: (tmpl as any).is_web_active !== undefined ? (tmpl as any).is_web_active : 1,
      };

      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      a.download = `[양식백업]_${tmpl.template_name.replace(/\s+/g, '_')}_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`양식 백업 파일 다운로드 중 오류가 발생했습니다: ${err.message}`);
    }
  };

  // 양식 가져오기 파일 선택 핸들러
  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const importedData = JSON.parse(text);

        if (!importedData.template_name || (!importedData.html_content && !importedData.web_html_content)) {
          alert('유효한 양식 백업 파일(JSON)이 아닙니다. 필수 데이터가 유실되었습니다.');
          return;
        }

        const isDuplicate = templates.some(t => t.template_name === importedData.template_name);
        if (isDuplicate) {
          const existing = templates.find(t => t.template_name === importedData.template_name);
          setImportConflictData({ ...importedData, existingId: existing?.id });
          setIsImportConflictModalOpen(true);
        } else {
          await executeImportApi(importedData, 'duplicate');
        }
      } catch (err: any) {
        alert(`파일을 읽는 중 에러가 발생했습니다: ${err.message}`);
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  // 양식 가져오기 API 실행
  const executeImportApi = async (data: any, actionType: 'overwrite' | 'duplicate') => {
    try {
      const res = await apiFetch('/api/templates-new/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          actionType
        })
      });
      const resData = await res.json();
      if (resData.success) {
        alert(resData.message || '양식을 성공적으로 가져왔습니다.');
        setIsImportConflictModalOpen(false);
        setImportConflictData(null);
        await loadTemplates();
      } else {
        alert(`양식 가져오기 실패: ${resData.error}`);
      }
    } catch (err: any) {
      alert(`서버 요청 중 오류가 발생했습니다: ${err.message}`);
    }
  };

  // 템플릿 목록 로드
  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/templates-new');
      const data = await res.json();
      if (data.success) {
        setTemplates(data.templates || []);
      } else {
        console.error('템플릿 목록 로드 실패:', data.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // 발급/출력 이력 목록 로드
  const loadLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await apiFetch('/api/templates-new/print-log');
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
      } else {
        console.error('발급/출력 이력 조회 실패:', data.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    if (isRestored) {
      loadTemplates();
    }
  }, [isRestored]);

  useEffect(() => {
    if (isRestored && activeTab === 'logs') {
      loadLogs();
    }
  }, [activeTab, isRestored]);

  // 발급/출력 이력 실시간 검색 필터링 로직
  const filteredLogs = logs.filter((log) => {
    const query = logSearchQuery.toLowerCase().trim();
    if (!query) return true;
    
    return (
      (log.template_name && log.template_name.toLowerCase().includes(query)) ||
      (log.record_id && log.record_id.toLowerCase().includes(query)) ||
      (log.record_name && log.record_name.toLowerCase().includes(query)) ||
      (log.updated_by && log.updated_by.toLowerCase().includes(query)) ||
      (log.document_type && log.document_type.toLowerCase().includes(query)) ||
      String(log.id).includes(query)
    );
  });

  // 페이징 계산
  const totalLogPages = Math.ceil(filteredLogs.length / logPerPage) || 1;
  const pagedLogs = filteredLogs.slice(
    (logCurrentPage - 1) * logPerPage,
    logCurrentPage * logPerPage
  );

  // 엑셀(CSV) 다운로드 함수
  const handleDownloadExcel = () => {
    if (filteredLogs.length === 0) {
      alert('다운로드할 발급/출력 이력이 없습니다.');
      return;
    }
    
    // CSV 헤더 정의
    const headers = ['발급/출력번호', '양식 템플릿명', '연동 데이터 소스', '출력 대상 식별(ID)', '대상 명칭', '출력 담당자', '출력 일자'];
    
    // 데이터 행 생성
    const rows = filteredLogs.map(log => [
      log.id,
      log.template_name || '(삭제된 양식)',
      log.document_type || 'AI 동적 쿼리',
      log.record_id,
      log.record_name,
      log.updated_by,
      log.issue_date
    ]);
    
    // CSV 포맷팅 (쉼표 및 개행 처리, 한글 및 특수문자 안전 처리)
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => {
        const strVal = String(val === null || val === undefined ? '' : val);
        return `"${strVal.replace(/"/g, '""')}"`;
      }).join(','))
    ].join('\r\n');
    
    // 한글 깨짐 방지 BOM 추가
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // 파일명 생성 (YYYYMMDD 포맷)
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const filename = `발급_출력대장_출력로그_${yyyy}${mm}${dd}.csv`;
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 템플릿 삭제 (소프트 삭제)
  const handleDeleteTemplate = async (id: number, name: string) => {
    if (!confirm(`'${name}' 양식을 정말로 삭제하시겠습니까?\n삭제된 양식은 소프트 삭제 처리되어 복구가 가능합니다.`)) {
      return;
    }

    try {
      const res = await apiFetch(`/api/templates-new?id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        alert('양식이 소프트 삭제되었습니다.');
        loadTemplates();
      } else {
        alert(`삭제 실패: ${data.error}`);
      }
    } catch (e) {
      console.error(e);
      alert('템플릿 삭제 오류가 발생했습니다.');
    }
  };

  // 재직기간 자동 계산 헬퍼 함수
  const calculateEmploymentPeriod = (joinedDateStr?: string, resignedDateStr?: string) => {
    if (!joinedDateStr) return '';
    const cleanDate = (dateStr: string) => dateStr.replace(/[^0-9-]/g, '');
    const start = new Date(cleanDate(joinedDateStr));
    const end = resignedDateStr ? new Date(cleanDate(resignedDateStr)) : new Date();
    
    if (isNaN(start.getTime())) return joinedDateStr;
    
    let years = end.getFullYear() - start.getFullYear();
    let months = end.getMonth() - start.getMonth();
    let days = end.getDate() - start.getDate();
    if (days < 0) months -= 1;
    if (months < 0) {
      years -= 1;
      months += 12;
    }
    
    let periodText = '';
    if (years > 0) periodText += `${years}년 `;
    if (months > 0) periodText += `${months}개월`;
    if (periodText === '') periodText = '1개월 미만';
    
    const formatDate = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}.${m}.${d}`;
    };
    
    return `${formatDate(start)} ~ ${resignedDateStr ? formatDate(end) : '현재 재직 중'} (${periodText.trim()})`;
  };

  // 출력 설정 모달 열기
  const handleOpenPrintModal = async (template: WebTemplate) => {
    setPrintTemplateId(template.id);
    setPrintTemplateName(template.template_name);
    setIsPrintModalOpen(true);
    
    // 회사 기본 정보 사전 로딩
    let currentProfile = {};
    try {
      const res = await apiFetch(`/api/templates-new?action=detail&id=${template.id}`);
      const data = await res.json();
      if (data.success && data.companyProfile) {
        setCompanyProfile(data.companyProfile);
        currentProfile = data.companyProfile;
      }
    } catch (err) {
      console.error('회사 프로필 사전 로드 실패:', err);
    }

    const isScm = template.document_type && (
      template.document_type.startsWith('ESTIMATE_') || 
      template.document_type.startsWith('PURCHASE_ORDER_')
    );

    if (isScm) {
      setPrintStep('configure');
      const isPurchaseOrder = template.document_type.startsWith('PURCHASE_ORDER_');
      let defaultType = '자재구매';
      if (template.document_type.includes('PROCESSING')) defaultType = '임가공';
      if (template.document_type.includes('OUTSOURCING')) defaultType = '외주작업';

      setScmData({
        recipient_company: isPurchaseOrder ? '' : '',
        recipient_address: '',
        recipient_contact: '',
        recipient_phone: '',
        supplier_company: isPurchaseOrder ? (currentProfile as any).company_name || '' : '',
        supplier_address: isPurchaseOrder ? (currentProfile as any).address || '' : '',
        supplier_owner: isPurchaseOrder ? (currentProfile as any).representative || '' : '',
        supplier_phone: isPurchaseOrder ? (currentProfile as any).phone || '' : '',
        transaction_type: defaultType,
        document_memo: '',
        items: [
          {
            product_name: '',
            billing_type: 'general',
            billing_type_name: '일반단가',
            unit: 'EA',
            quantity: 1,
            unit_price: 0,
            amount: 0,
            has_cost_breakdown: false,
            cost_breakdown: {
              material_cost: 0,
              processing_cost: 0,
              overhead_cost: 0,
              other_expenses: 0,
              delivery_expense: 0
            }
          }
        ]
      });
    } else {
      setPrintStep('search');
      setSearchKeyword('');
      setAiError(null);
      setGeneratedSql(null);
      setShowSql(false);
    }
  };

  // AI 쿼리 가동 및 데이터 연동 실행
  const handleRunAiQuery = async () => {
    if (!searchKeyword.trim()) {
      alert('조회할 대상의 명칭(예: 사원 성명 "홍길동")을 입력하십시오.');
      return;
    }

    setAiSearching(true);
    setAiError(null);
    setGeneratedSql(null);

    try {
      const res = await apiFetch(`/api/templates-new/ai-query?templateId=${printTemplateId}&keyword=${encodeURIComponent(searchKeyword)}`);
      const data = await res.json();

      const now = new Date();
      const issue_year = String(now.getFullYear());
      const issue_month = String(now.getMonth() + 1);
      const issue_day = String(now.getDate());

      if (data.sql) {
        setGeneratedSql(data.sql);
      } else if (data.success) {
        // 백엔드 Next.js HMR 캐싱 오염 등으로 인해 sql 필드가 누락되었을 때를 대비한 동적 안전 폴백 쿼리
        setGeneratedSql(`-- [참고] AI 쿼리 실행 결과 (백엔드 캐시 지연으로 실행 쿼리 획득 우회)\nSELECT s.staff_role AS position, p.department, o.name, s.joined_date \nFROM rnd_staffs s \nLEFT JOIN crm_operators o ON o.id = s.user_id \nLEFT JOIN crm_operator_profiles p ON CAST(o.id AS TEXT) = p.operator_id \nWHERE o.name = '${searchKeyword}' \nLIMIT 1;`);
      }

      if (data.success && data.data) {
        const row = data.data;
        // AI가 찾아낸 정보로 수기 폼 세팅
        setManualData({
          record_id: String(row.id || row.uuid || 'AI_AUTO'),
          staff_name: row.staff_name || row.name || searchKeyword,
          department: row.department || '',
          position: row.position || row.staff_role || '',
          resident_id: row.resident_id || '',
          address: row.address && row.address !== companyProfile.address ? row.address : '',
          usage: '',
          employment_period: calculateEmploymentPeriod(row.joined_date, row.resigned_date),
          issue_dept: '',
          issue_phone: companyProfile.phone || '',
          issue_email: companyProfile.email || '',
          issue_fax: '',
          issue_year,
          issue_month,
          issue_day
        });
        setPrintStep('configure');
      } else {
        // 매칭 실패 시 오류 기록 후, 수동 강제 진입 제안
        setAiError(data.error || 'AI가 데이터베이스에서 연관된 정보를 찾지 못했습니다.');
      }
    } catch (err: any) {
      console.error(err);
      setAiError('AI 데이터 조회 통신 중 오류가 발생했습니다.');
    } finally {
      setAiSearching(false);
    }
  };

  // 데이터 조회 실패 시 강제 수동 작성 진입 헬퍼
  const handleForceManualConfigure = () => {
    const now = new Date();
    setManualData({
      record_id: 'MANUAL',
      staff_name: searchKeyword || '',
      department: '',
      position: '',
      resident_id: '',
      address: '',
      usage: '',
      employment_period: '',
      issue_dept: '',
      issue_phone: companyProfile.phone || '',
      issue_email: companyProfile.email || '',
      issue_fax: '',
      issue_year: String(now.getFullYear()),
      issue_month: String(now.getMonth() + 1),
      issue_day: String(now.getDate())
    });
    setGeneratedSql(`-- 수기 작성 모드로 진입했습니다. AI가 자동 조립을 제안했던 표준 템플릿 쿼리:\nSELECT o.name, p.department, s.staff_role, s.joined_date \nFROM rnd_staffs s \nLEFT JOIN crm_operators o ON o.id = s.user_id \nLEFT JOIN crm_operator_profiles p ON CAST(o.id AS TEXT) = p.operator_id \nWHERE o.name = '${searchKeyword || '사원명'}';`);
    setPrintStep('configure');
  };

  // 수기 보완이 끝난 데이터셋을 localstorage에 올리고 최종 인쇄 팝업 트리거
  const handleExecutePrint = () => {
    if (!printTemplateId) return;

    const activeTemplate = templates.find(t => t.id === printTemplateId);
    const isScm = activeTemplate?.document_type && (
      activeTemplate.document_type.startsWith('ESTIMATE_') || 
      activeTemplate.document_type.startsWith('PURCHASE_ORDER_')
    );

    if (isScm) {
      // SCM 데이터 검증
      const isPurchaseOrder = activeTemplate.document_type.startsWith('PURCHASE_ORDER_');
      const targetCompany = isPurchaseOrder ? scmData.supplier_company : scmData.recipient_company;
      if (!targetCompany.trim()) {
        alert(isPurchaseOrder ? '공급자(거래처) 상호는 필수 입력 항목입니다.' : '공급받는자(바이어) 상호는 필수 입력 항목입니다.');
        return;
      }
      if (scmData.items.some((it: any) => !it.product_name.trim())) {
        alert('품명은 필수 입력 항목입니다.');
        return;
      }

      // items의 합계 및 5대 비용 명세 가공
      const processedItems = scmData.items.map((it: any) => {
        const qty = Number(it.quantity) || 0;
        const price = Number(it.unit_price) || 0;
        const amt = qty * price;
        return {
          ...it,
          quantity: qty,
          unit_price: price,
          amount: amt,
          cost_breakdown: {
            material_cost: Number(it.cost_breakdown.material_cost) || 0,
            processing_cost: Number(it.cost_breakdown.processing_cost) || 0,
            overhead_cost: Number(it.cost_breakdown.overhead_cost) || 0,
            other_expenses: Number(it.cost_breakdown.other_expenses) || 0,
            delivery_expense: Number(it.cost_breakdown.delivery_expense) || 0
          }
        };
      });

      const totalAmount = processedItems.reduce((sum: number, it: any) => sum + it.amount, 0);

      const printDataPayload = {
        ...companyProfile,
        ...scmData,
        items: processedItems,
        total_amount: totalAmount
      };

      localStorage.setItem('web_form_print_data', JSON.stringify(printDataPayload));

      setIsPrintModalOpen(false);
      const url = `/form-management-new/print?templateId=${printTemplateId}`;
      window.open(url, `WebFormPrint_${Date.now()}`, 'width=1280,height=900,scrollbars=yes,resizable=yes');

    } else {
      // 기존 재직증명서용 로직
      if (!manualData.staff_name.trim()) {
        alert('대상자 성명(명칭)은 필수 입력 항목입니다.');
        return;
      }

      const printDataPayload = {
        ...companyProfile,
        ...manualData
      };
      localStorage.setItem('web_form_print_data', JSON.stringify(printDataPayload));

      setIsPrintModalOpen(false);
      const url = `/form-management-new/print?templateId=${printTemplateId}`;
      window.open(url, `WebFormPrint_${Date.now()}`, 'width=1280,height=900,scrollbars=yes,resizable=yes');
    }

    // 대장 갱신 트리거
    setTimeout(() => {
      if (activeTab === 'logs') loadLogs();
    }, 1500);
  };


  return (
    <div className={`w-full flex flex-col min-w-0 font-sans text-slate-800 animate-fade-in text-left overflow-hidden ${
      viewMode === 'list' 
        ? 'h-[calc(100vh-64px)]' 
        : 'h-[calc(100vh-75px)] pb-2'
    }`}>
      {/* 헤더 타이틀 - 리스트 및 에디터 모드 전체에서 항상 표시 */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 shrink-0 ${
        viewMode === 'list' ? 'pb-4 gap-4' : 'pb-2 gap-2'
      }`}>
        <div className="text-left">
          <div className="flex items-center space-x-2">
            <Sparkles className={`text-violet-600 mr-2 shrink-0 animate-pulse ${
              viewMode === 'list' ? 'w-8 h-8' : 'w-5 h-5'
            }`} />
            <h1 className={`font-black text-slate-900 flex items-center tracking-tight ${
              viewMode === 'list' ? 'text-3xl' : 'text-lg'
            }`}>
              양식 관리 AI
              <span className="text-[10px] bg-violet-50 text-violet-800 border border-violet-200 px-2 py-0.5 rounded-full font-bold ml-2.5 shrink-0">
                HTML 반응형 양식
              </span>
            </h1>
          </div>
          {viewMode === 'list' && (
            <p className="text-xs font-semibold text-slate-500 mt-1">
              최고관리자가 등록한 HTML 기반 반응형 웹 양식을 통해 사내 대장을 출력하고 안전하게 발급/출력 로그를 저장 관리합니다.
            </p>
          )}
        </div>

        {viewMode === 'list' && activeTab === 'templates' && (
          <div className="flex items-center gap-2 shrink-0">
            <input 
              type="file" 
              id="template-import-input" 
              accept=".json" 
              className="hidden" 
              onChange={handleImportFileChange}
            />
            <button
              onClick={() => document.getElementById('template-import-input')?.click()}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-extrabold text-sm transition cursor-pointer shadow-sm"
              title="양식 백업 파일(.json)을 업로드하여 이식합니다."
            >
              <Upload className="w-4 h-4 text-slate-500" />
              양식 가져오기
            </button>
            <button
              onClick={() => {
                setSelectedTemplateId(undefined);
                setViewMode('editor');
              }}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-extrabold text-sm transition shadow-lg shadow-violet-600/10 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3px]" />
              새 양식 빌드하기
            </button>
          </div>
        )}
      </div>

      {viewMode === 'list' ? (
        <div className="flex-1 min-h-0 overflow-y-auto pt-4 pb-10 space-y-6">
          {/* 탭 컨트롤러 (양식 템플릿 목록 vs 발급/출력 이력) */}
          <div className="flex border-b border-slate-200 gap-1.5 p-1 bg-slate-50 rounded-2xl w-fit">
            <button
              onClick={() => setActiveTab('templates')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                activeTab === 'templates' 
                  ? 'bg-white text-slate-950 shadow-sm border border-slate-100' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-4 h-4 text-violet-600" />
              양식 템플릿 목록
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                activeTab === 'logs' 
                  ? 'bg-white text-slate-950 shadow-sm border border-slate-100' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <History className="w-4 h-4 text-indigo-600" />
              발급/출력 이력 조회
            </button>
          </div>

          {/* 탭 내용 1: 양식 템플릿 목록 */}
          {activeTab === 'templates' && (
            <div className="space-y-6">
              {/* 정보 팁 카드 */}
              <div className="p-4 rounded-2xl bg-violet-50/50 border border-violet-100/80 flex items-start gap-3">
                <Info className="w-5 h-5 text-violet-600 shrink-0 mt-0.5" />
                <div className="text-xs text-violet-850 space-y-1 font-bold">
                  <p className="font-extrabold text-violet-900">💡 웹 양식 발급/출력 방법</p>
                  <p className="font-semibold text-violet-850/80">1. 최고관리자가 양식 파일을 업로드하여 AI 분석 후 HTML 디자인 양식으로 등록합니다.</p>
                  <p className="font-semibold text-violet-850/80">2. 사용자는 [양식 출력]을 클릭하여 바인딩에 필요한 사원 정보 또는 고객 데이터를 매핑 선택합니다.</p>
                  <p className="font-semibold text-violet-850/80">3. 독립 브라우저 팝업창에서 Mustache 렌더링된 완벽한 A4 문서를 인쇄 출력할 수 있으며, 이력은 발급/출력 이력에 안전하게 적재됩니다.</p>
                </div>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <RefreshCw className="w-10 h-10 animate-spin text-violet-600 mb-3" />
                  <p className="text-sm font-semibold">양식 목록을 불러오는 중...</p>
                </div>
              ) : templates.length === 0 ? (
                <div className="border border-slate-100 rounded-3xl p-16 text-center bg-white max-w-2xl mx-auto flex flex-col items-center shadow-sm">
                  <div className="p-4 bg-slate-50 rounded-full mb-4">
                    <FileCheck className="w-10 h-10 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-black text-slate-800">등록된 신규 웹 양식이 없습니다</h3>
                  <p className="text-sm text-slate-500 mt-2 font-medium max-w-sm leading-relaxed">
                    최고관리자 권한으로 첫 번째 웹 양식 파일(이미지/PDF)을 업로드하여 Gemini AI가 코딩한 반응형 문서를 획득해 보세요.
                  </p>
                  <button
                    onClick={() => {
                      setSelectedTemplateId(undefined);
                      setViewMode('editor');
                    }}
                    className="mt-6 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white transition rounded-xl text-xs font-black cursor-pointer shadow-md"
                  >
                    양식 생성하기
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {templates.map(tmpl => {
                    const linkedTables = tmpl.document_type ? tmpl.document_type.split(',').filter(Boolean) : [];
                    return (
                      <div 
                        key={tmpl.id}
                        className="flex flex-col bg-white border border-slate-100 rounded-3xl overflow-hidden hover:border-violet-600/30 hover:shadow-lg hover:shadow-violet-600/5 transition duration-300 group shadow-sm"
                      >
                        <div className="p-6 flex-1 flex flex-col justify-between gap-5 text-left">
                          <div>
                            <div className="flex items-center justify-between mb-3.5">
                              <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-600 px-2.5 py-0.5 rounded-lg font-bold">
                                ID: {tmpl.id}
                              </span>
                              {tmpl.is_active === 1 ? (
                                <span className="flex items-center gap-1 text-[10px] font-black bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-lg border border-emerald-100">
                                  사용중
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-[10px] font-black bg-slate-50 text-slate-400 px-2 py-0.5 rounded-lg border border-slate-200">
                                  비활성
                                </span>
                              )}
                            </div>

                            <h3 className="font-black text-slate-800 group-hover:text-violet-700 transition truncate text-base">
                              {tmpl.template_name}
                            </h3>

                            {/* 연동 물리 테이블 표시 */}
                            <div className="mt-3.5 space-y-2">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">연동 테이블 선택 (멀티)</span>
                              <div className="flex flex-wrap gap-1.5">
                                {linkedTables.length === 0 ? (
                                  <span className="text-[10px] text-slate-400 italic font-semibold">(테이블 선택 안함)</span>
                                ) : (
                                  linkedTables.map(tbl => (
                                    <span key={tbl} className="flex items-center gap-1 text-[10px] bg-violet-50 border border-violet-100 text-violet-700 px-2.5 py-0.5 rounded-lg font-bold">
                                      <Database className="w-2.5 h-2.5" />
                                      {tbl}
                                    </span>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between border-t border-slate-50 pt-4 mt-1 shrink-0">
                            <span className="text-[9px] font-bold text-slate-400">수정: {tmpl.updated_at ? tmpl.updated_at.substring(0, 16) : '-'}</span>
                            
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleOpenPrintModal(tmpl)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-extrabold transition cursor-pointer"
                                title="양식 인쇄 출력"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                양식 출력
                              </button>
                              
                              <button
                                onClick={() => handleDownloadTemplate(tmpl)}
                                className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                                title="양식 백업 다운로드"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedTemplateId(tmpl.id);
                                  setViewMode('editor');
                                }}
                                className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                                title="양식 튜닝 설정"
                              >
                                <Settings className="w-3.5 h-3.5" />
                              </button>
                              
                              <button
                                onClick={() => handleDeleteTemplate(tmpl.id, tmpl.template_name)}
                                className="p-2 rounded-xl bg-slate-50 hover:bg-rose-50 hover:text-rose-600 text-slate-400 transition cursor-pointer"
                                title="양식 삭제"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 탭 내용 2: 발급/출력 이력 조회 */}
          {activeTab === 'logs' && (
            <div className="space-y-6">
              {/* 발급/출력 안내 */}
              <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 flex items-start gap-3">
                <History className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="text-xs text-indigo-850 font-bold">
                  <p className="font-extrabold text-indigo-900">발급/출력 이력 감사 데이터 대장</p>
                  <p className="font-semibold text-indigo-850/80 mt-1">임직원 또는 사용자가 새로운 HTML 양식을 출력할 때마다 출력 시점에 바인딩되었던 원본 데이터와 함께 발급/출력 기록이 보관됩니다.</p>
                </div>
              </div>

              {logsLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <RefreshCw className="w-10 h-10 animate-spin text-indigo-600 mb-3" />
                  <p className="text-sm font-semibold">발급/출력 이력을 로드하는 중...</p>
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-20 border border-slate-100 bg-white rounded-3xl text-slate-400">
                  <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-black text-slate-500">조회할 발급/출력 이력이 없습니다</p>
                  <p className="text-xs text-slate-400 mt-1">출력 완료 시 여기에 발급/출력 로그가 기록됩니다.</p>
                </div>
              ) : (
                <>
                  {/* 검색 및 엑셀 다운로드 제어부 */}
                  <div className="flex flex-col md:flex-row gap-3 justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    {/* 검색 필터 */}
                    <div className="relative w-full md:w-80">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                        <Search className="w-4 h-4 text-slate-400" />
                      </span>
                      <input
                        type="text"
                        placeholder="템플릿명, ID, 대상자, 담당자 검색..."
                        value={logSearchQuery}
                        onChange={(e) => {
                          setLogSearchQuery(e.target.value);
                          setLogCurrentPage(1); // 검색 시 1페이지로 리셋
                        }}
                        className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-violet-500 focus:bg-white focus:outline-none text-xs font-semibold text-slate-800 transition"
                      />
                    </div>

                    {/* 페이지당 표시 개수 & 엑셀 다운로드 버튼 */}
                    <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                      <select
                        value={logPerPage}
                        onChange={(e) => {
                          setLogPerPage(Number(e.target.value));
                          setLogCurrentPage(1);
                        }}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-violet-500 cursor-pointer"
                      >
                        <option value={10}>10개씩 보기</option>
                        <option value={30}>30개씩 보기</option>
                        <option value={50}>50개씩 보기</option>
                      </select>
                      <button
                        onClick={handleDownloadExcel}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs transition shadow-sm cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        엑셀 다운로드
                      </button>
                    </div>
                  </div>

                  {filteredLogs.length === 0 ? (
                    <div className="text-center py-20 border border-slate-100 bg-white rounded-3xl text-slate-400 w-full">
                      <Search className="w-10 h-10 text-slate-350 mx-auto mb-2" />
                      <p className="text-sm font-black text-slate-500">검색 조건에 맞는 발급/출력 이력이 없습니다</p>
                      <p className="text-xs text-slate-400 mt-1">검색어를 다른 단어로 변경해 보세요.</p>
                    </div>
                  ) : (
                    <>
                      {/* 테이블 영역 */}
                      <div className="border border-slate-100 rounded-3xl overflow-hidden bg-white shadow-sm">
                        <table className="w-full border-collapse text-left text-xs font-semibold">
                          <thead>
                            <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100">
                              <th className="p-4 text-center">발급/출력번호</th>
                              <th className="p-4">양식 템플릿명</th>
                              <th className="p-4">연동 데이터 소스</th>
                              <th className="p-4">출력 대상 식별(ID)</th>
                              <th className="p-4">대상 명칭</th>
                              <th className="p-4">출력 담당자</th>
                              <th className="p-4 text-center">출력 일자</th>
                              <th className="p-4 text-center">출력 화면</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pagedLogs.map(log => (
                              <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition">
                                <td className="p-4 text-center font-mono text-slate-400">{log.id}</td>
                                <td className="p-4 font-bold text-slate-800">{log.template_name || '(삭제된 양식)'}</td>
                                <td className="p-4 text-slate-500 font-semibold">{log.document_type || 'AI 동적 쿼리'}</td>
                                <td className="p-4 font-mono font-bold text-indigo-600">{log.record_id}</td>
                                <td className="p-4 font-bold text-slate-800">{log.record_name}</td>
                                <td className="p-4 text-slate-600">{log.updated_by}</td>
                                <td className="p-4 text-center text-slate-500">{log.issue_date}</td>
                                <td className="p-4 text-center">
                                  <button
                                    onClick={() => setPreviewLog(log)}
                                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] rounded-lg border-none cursor-pointer transition animate-fade-in"
                                  >
                                    화면 보기
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* 페이지네이션 패널 */}
                      <div className="flex flex-col sm:flex-row items-center justify-between bg-white px-6 py-4 border border-slate-100 rounded-3xl shadow-sm gap-4">
                        <div className="text-xs text-slate-550 font-semibold">
                          전체 <span className="text-indigo-600 font-extrabold">{filteredLogs.length}</span>건 중{' '}
                          <span className="text-slate-850 font-extrabold">
                            {Math.min((logCurrentPage - 1) * logPerPage + 1, filteredLogs.length)}
                          </span>
                          {' '}-{' '}
                          <span className="text-slate-850 font-extrabold">
                            {Math.min(logCurrentPage * logPerPage, filteredLogs.length)}
                          </span>
                          건 표시
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setLogCurrentPage(Math.max(1, logCurrentPage - 1))}
                            disabled={logCurrentPage === 1}
                            className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer text-xs font-extrabold"
                          >
                            이전
                          </button>
                          
                          {Array.from({ length: totalLogPages }).map((_, idx) => {
                            const pageNum = idx + 1;
                            const isVisible = pageNum === 1 || pageNum === totalLogPages || Math.abs(logCurrentPage - pageNum) <= 2;
                            
                            if (!isVisible) {
                              if (pageNum === 2 || pageNum === totalLogPages - 1) {
                                return <span key={`dots-${pageNum}`} className="px-2 text-slate-400 text-xs font-bold">...</span>;
                              }
                              return null;
                            }

                            return (
                              <button
                                key={pageNum}
                                onClick={() => setLogCurrentPage(pageNum)}
                                className={`w-8 h-8 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center border ${
                                  logCurrentPage === pageNum
                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/10'
                                    : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                          
                          <button
                            onClick={() => setLogCurrentPage(Math.min(totalLogPages, logCurrentPage + 1))}
                            disabled={logCurrentPage === totalLogPages}
                            className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer text-xs font-extrabold"
                          >
                            다음
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          <WebTemplateEditor 
            templateId={selectedTemplateId} 
            onBack={() => setViewMode('list')}
            onSaved={() => {
              setViewMode('list');
              loadTemplates();
            }} 
          />
        </div>
      )}

      {/* AI 기반 지능형 인쇄 발급 마법사 모달 */}
      {isPrintModalOpen && printTemplateId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in text-left">
          <div className="w-full max-w-4xl bg-white border border-slate-100 rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh] text-slate-850">
            
            {/* 모달 헤더 */}
            <div className="p-5 border-b border-slate-100 bg-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-lg font-black flex items-center gap-2 text-slate-900">
                  <Printer className="w-5 h-5 text-violet-600 animate-pulse" />
                  스마트 양식 인쇄 발급/출력 마법사
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-semibold">
                  [{printTemplateName}] 양식을 안전하게 출력하기 위해 데이터를 조율하고 이력을 적재합니다.
                </p>
              </div>
              <button 
                onClick={() => setIsPrintModalOpen(false)}
                className="text-slate-400 hover:text-slate-800 px-3 py-2 rounded-xl hover:bg-slate-100 transition text-xs font-black cursor-pointer"
              >
                닫기
              </button>
            </div>

            {/* 1단계: AI 쿼리 검색어 입력 */}
            {printStep === 'search' && (
              <div className="p-8 flex flex-col items-center justify-center space-y-6 flex-1 overflow-y-auto">
                <div className="p-4 bg-violet-50 rounded-full text-violet-600">
                  <Sparkles className="w-10 h-10 animate-pulse" />
                </div>
                
                <div className="text-center max-w-md">
                  <h4 className="text-sm font-black text-slate-800">1단계: 발급/출력 대상자 검색 및 AI 연동</h4>
                  <p className="text-xs text-slate-500 mt-2 font-medium leading-relaxed">
                    발급/출력하고자 하는 임직원의 성명 또는 키워드를 입력하십시오. AI가 실시간으로 MY DB의 테이블 구조를 자동 스캔하여 적절한 조인 쿼리를 동적 생성 및 실행합니다.
                  </p>
                </div>

                <div className="w-full max-w-md space-y-3.5">
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                      <Search className="w-4 h-4 text-slate-400" />
                    </span>
                    <input 
                      type="text" 
                      placeholder="사원명 또는 검색어 입력 (예: 홍길동)..."
                      value={searchKeyword}
                      onChange={e => setSearchKeyword(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleRunAiQuery();
                      }}
                      className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:border-violet-600 focus:bg-white focus:outline-none text-xs font-extrabold text-slate-800 transition"
                      disabled={aiSearching}
                      autoFocus
                    />
                  </div>

                  {aiError && (
                    <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-600 font-bold space-y-2 leading-relaxed">
                      <div className="flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                        <span>데이터 연계 실패</span>
                      </div>
                      <p className="font-semibold text-rose-500/90 text-[11px]">{aiError}</p>
                      <button
                        onClick={handleForceManualConfigure}
                        className="text-[11px] text-violet-600 hover:text-violet-800 font-extrabold underline block transition"
                      >
                        👉 DB 검색 건너뛰고, 정보 수기로 직접 채워 발급/출력하기
                      </button>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={handleRunAiQuery}
                      disabled={aiSearching}
                      className="flex-1 py-3 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-200 text-white font-extrabold text-xs transition rounded-2xl cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-violet-600/10"
                    >
                      {aiSearching ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          AI 쿼리 코딩 및 연동 중...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          AI 데이터 연동 실행
                        </>
                      )}
                    </button>
                    
                    {!aiSearching && (
                      <button
                        onClick={handleForceManualConfigure}
                        className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-650 font-extrabold text-xs transition rounded-2xl cursor-pointer border border-slate-200"
                      >
                        수기 작성 진입
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 2단계: 데이터 검토 및 수기 완결 */}
            {printStep === 'configure' && (
              isScmTemplate ? (
                // SCM 전용 동적 폼 UI 렌더링
                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 bg-slate-50/30 text-left">
                  {/* SCM 상단 가이드 */}
                  <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-start gap-2.5 shrink-0">
                    <Info className="w-4 h-4 text-indigo-650 shrink-0 mt-0.5" />
                    <p className="text-xs text-indigo-900 font-bold leading-normal">
                      양식에 들어갈 SCM 상세 내용을 직접 입력하십시오.<br />
                      5대 원가(자재비, 외주가공/작업비, 일반관리비, 기타경비, 운반비)를 기입하여 원가 상세 내역을 포함할 수 있으며, 정산단위를 다채롭게 제어할 수 있습니다.
                    </p>
                  </div>

                  {/* SCM 상단 기본 정보 입력 (수신자/공급사 및 거래유형) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 공급받는자 (바이어) */}
                    <div className="space-y-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm text-left">
                      <span className="text-[11px] font-black text-slate-400 block border-b border-slate-100 pb-1.5 uppercase tracking-wider">
                        공급받는자 (바이어 정보)
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">상호 (Company)</label>
                          <input
                            type="text"
                            value={scmData.recipient_company}
                            onChange={e => setScmData({ ...scmData, recipient_company: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:outline-none rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800"
                            placeholder="바이어 상호"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">담당자명 (Contact)</label>
                          <input
                            type="text"
                            value={scmData.recipient_contact}
                            onChange={e => setScmData({ ...scmData, recipient_contact: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:outline-none rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800"
                            placeholder="담당자 성명"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">연락처 (Phone)</label>
                          <input
                            type="text"
                            value={scmData.recipient_phone}
                            onChange={e => setScmData({ ...scmData, recipient_phone: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:outline-none rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800"
                            placeholder="연락처 번호"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">사업장 주소 (Address)</label>
                          <input
                            type="text"
                            value={scmData.recipient_address}
                            onChange={e => setScmData({ ...scmData, recipient_address: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:outline-none rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800"
                            placeholder="사업장 소재지 주소"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 공급자 (거래처 또는 우리회사) */}
                    <div className="space-y-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm text-left">
                      <span className="text-[11px] font-black text-slate-400 block border-b border-slate-100 pb-1.5 uppercase tracking-wider">
                        공급자 (제조/납품처 정보)
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">상호 (Company)</label>
                          <input
                            type="text"
                            value={scmData.supplier_company}
                            onChange={e => setScmData({ ...scmData, supplier_company: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:outline-none rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800"
                            placeholder="공급처 상호"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">대표자명 (Owner)</label>
                          <input
                            type="text"
                            value={scmData.supplier_owner}
                            onChange={e => setScmData({ ...scmData, supplier_owner: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:outline-none rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800"
                            placeholder="대표자 성명"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">연락처 (Phone)</label>
                          <input
                            type="text"
                            value={scmData.supplier_phone}
                            onChange={e => setScmData({ ...scmData, supplier_phone: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:outline-none rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800"
                            placeholder="연락처 번호"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">사업장 주소 (Address)</label>
                          <input
                            type="text"
                            value={scmData.supplier_address}
                            onChange={e => setScmData({ ...scmData, supplier_address: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:outline-none rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800"
                            placeholder="사업장 소재지 주소"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 거래 유형 및 메모 */}
                  <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm text-left space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">거래유형 (Transaction Type)</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={scmData.transaction_type}
                            onChange={e => setScmData({ ...scmData, transaction_type: e.target.value })}
                            className="flex-1 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:outline-none rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800"
                            placeholder="예: 자재구매, 임가공, 외주작업 등 자유입력"
                          />
                          <div className="flex gap-1">
                            {['자재구매', '임가공', '외주작업'].map(type => (
                              <button
                                key={type}
                                type="button"
                                onClick={() => setScmData({ ...scmData, transaction_type: type })}
                                className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold border transition cursor-pointer ${
                                  scmData.transaction_type === type
                                    ? 'bg-indigo-600 border-indigo-600 text-white'
                                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                {type}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">특기사항 / 메모 (Document Memo)</label>
                        <input
                          type="text"
                          value={scmData.document_memo}
                          onChange={e => setScmData({ ...scmData, document_memo: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:outline-none rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800"
                          placeholder="특기사항 내용을 입력하십시오."
                        />
                      </div>
                    </div>
                  </div>

                  {/* SCM 품목 동적 테이블 */}
                  <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm text-left space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                        세부 품목 내역 리스트
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const newItems = [...scmData.items, {
                            product_name: '',
                            billing_type: 'general',
                            billing_type_name: '일반단가',
                            unit: 'EA',
                            quantity: 1,
                            unit_price: 0,
                            amount: 0,
                            delivery_date: '',
                            has_cost_breakdown: false,
                            cost_breakdown: {
                              material_cost: 0,
                              processing_cost: 0,
                              overhead_cost: 0,
                              other_expenses: 0,
                              delivery_expense: 0
                            }
                          }];
                          setScmData({ ...scmData, items: newItems });
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-[10px] font-black transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5px]" />
                        품목 추가
                      </button>
                    </div>

                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                      {scmData.items.map((item: any, idx: number) => (
                        <div key={idx} className="p-4 bg-slate-50/50 rounded-2xl border border-slate-150 relative space-y-3">
                          {/* 삭제 버튼 */}
                          {scmData.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newItems = scmData.items.filter((_: any, i: number) => i !== idx);
                                setScmData({ ...scmData, items: newItems });
                              }}
                              className="absolute right-3 top-3 text-slate-400 hover:text-rose-600 transition p-1 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}

                          {/* 기본 품목 정보 */}
                          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pr-6">
                            <div className="md:col-span-2">
                              <label className="block text-[9px] font-bold text-slate-500 mb-1">품명 및 규격 <span className="text-rose-500">*</span></label>
                              <input
                                type="text"
                                value={item.product_name}
                                onChange={e => {
                                  const newItems = [...scmData.items];
                                  newItems[idx].product_name = e.target.value;
                                  setScmData({ ...scmData, items: newItems });
                                }}
                                className="w-full bg-white border border-slate-200 focus:border-indigo-500 focus:outline-none rounded-lg px-2 py-1 text-xs font-bold text-slate-800"
                                placeholder="예: 알루미늄 판넬 10T"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-500 mb-1">정산방식</label>
                              <select
                                value={item.billing_type}
                                onChange={e => {
                                  const type = e.target.value;
                                  const newItems = [...scmData.items];
                                  newItems[idx].billing_type = type;
                                  if (type === 'general') {
                                    newItems[idx].billing_type_name = '일반단가';
                                    newItems[idx].unit = 'EA';
                                  } else if (type === 'lump_sum') {
                                    newItems[idx].billing_type_name = '1식';
                                    newItems[idx].unit = '식';
                                    newItems[idx].quantity = 1;
                                  } else if (type === 'hourly') {
                                    newItems[idx].billing_type_name = '시간당';
                                    newItems[idx].unit = 'Hour';
                                  }
                                  // 재계산
                                  newItems[idx].amount = newItems[idx].quantity * newItems[idx].unit_price;
                                  setScmData({ ...scmData, items: newItems });
                                }}
                                className="w-full bg-white border border-slate-200 focus:border-indigo-500 focus:outline-none rounded-lg px-2 py-1 text-xs font-bold text-slate-700 cursor-pointer"
                              >
                                <option value="general">일반단가 (EA)</option>
                                <option value="lump_sum">1식 정산 (식)</option>
                                <option value="hourly">시간당 정산 (Hour)</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-500 mb-1">수량</label>
                              <input
                                type="number"
                                value={item.quantity}
                                disabled={item.billing_type === 'lump_sum'}
                                onChange={e => {
                                  const qty = Number(e.target.value) || 0;
                                  const newItems = [...scmData.items];
                                  newItems[idx].quantity = qty;
                                  newItems[idx].amount = qty * newItems[idx].unit_price;
                                  setScmData({ ...scmData, items: newItems });
                                }}
                                className="w-full bg-white border border-slate-200 focus:border-indigo-500 focus:outline-none rounded-lg px-2 py-1 text-xs font-bold text-slate-800 disabled:bg-slate-100 disabled:text-slate-400"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-500 mb-1">단가 (원)</label>
                              <input
                                type="number"
                                value={item.unit_price}
                                onChange={e => {
                                  const price = Number(e.target.value) || 0;
                                  const newItems = [...scmData.items];
                                  newItems[idx].unit_price = price;
                                  newItems[idx].amount = newItems[idx].quantity * price;
                                  setScmData({ ...scmData, items: newItems });
                                }}
                                className="w-full bg-white border border-slate-200 focus:border-indigo-500 focus:outline-none rounded-lg px-2 py-1 text-xs font-bold text-slate-800"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pr-6">
                            <div>
                              <label className="block text-[9px] font-bold text-slate-500 mb-1">정산단위</label>
                              <input
                                type="text"
                                value={item.unit}
                                onChange={e => {
                                  const newItems = [...scmData.items];
                                  newItems[idx].unit = e.target.value;
                                  setScmData({ ...scmData, items: newItems });
                                }}
                                className="w-full bg-white border border-slate-200 focus:border-indigo-500 focus:outline-none rounded-lg px-2 py-1 text-xs font-bold text-slate-800"
                                placeholder="단위"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-500 mb-1">개별 납기일</label>
                              <input
                                type="date"
                                value={item.delivery_date || ''}
                                onChange={e => {
                                  const newItems = [...scmData.items];
                                  newItems[idx].delivery_date = e.target.value;
                                  setScmData({ ...scmData, items: newItems });
                                }}
                                className="w-full bg-white border border-slate-200 focus:border-indigo-500 focus:outline-none rounded-lg px-2 py-1 text-xs font-bold text-slate-800 cursor-pointer"
                              />
                            </div>
                            <div className="flex items-center pt-5">
                              <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={item.has_cost_breakdown}
                                  onChange={e => {
                                    const newItems = [...scmData.items];
                                    newItems[idx].has_cost_breakdown = e.target.checked;
                                    setScmData({ ...scmData, items: newItems });
                                  }}
                                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                                />
                                5대 원가 분석 추가
                              </label>
                            </div>
                            <div className="md:col-span-2 flex items-center justify-end pt-5">
                              <span className="text-[10px] font-bold text-slate-400 font-sans">품목 합계:</span>
                              <span className="text-sm font-black text-indigo-600 ml-2 font-mono">
                                {(item.quantity * item.unit_price).toLocaleString()}원
                              </span>
                            </div>
                          </div>

                          {/* 5대 비용 명세 상세 입력 */}
                          {item.has_cost_breakdown && (
                            <div className="p-3 bg-white rounded-xl border border-slate-150 space-y-2.5 text-[9px]">
                              <span className="font-extrabold text-indigo-600 block">↳ 5대 표준 비용 상세 분석 (원가 구성)</span>
                              <div className="grid grid-cols-5 gap-2">
                                <div>
                                  <label className="block font-bold text-slate-500 mb-1">자재비 (원)</label>
                                  <input
                                    type="number"
                                    value={item.cost_breakdown.material_cost}
                                    onChange={e => {
                                      const val = Number(e.target.value) || 0;
                                      const newItems = [...scmData.items];
                                      newItems[idx].cost_breakdown.material_cost = val;
                                      setScmData({ ...scmData, items: newItems });
                                    }}
                                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none rounded px-2 py-1 text-xs font-semibold text-slate-800"
                                  />
                                </div>
                                <div>
                                  <label className="block font-bold text-slate-500 mb-1">외주가공/작업비 (원)</label>
                                  <input
                                    type="number"
                                    value={item.cost_breakdown.processing_cost}
                                    onChange={e => {
                                      const val = Number(e.target.value) || 0;
                                      const newItems = [...scmData.items];
                                      newItems[idx].cost_breakdown.processing_cost = val;
                                      setScmData({ ...scmData, items: newItems });
                                    }}
                                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none rounded px-2 py-1 text-xs font-semibold text-slate-800"
                                  />
                                </div>
                                <div>
                                  <label className="block font-bold text-slate-500 mb-1">일반관리비 (원)</label>
                                  <input
                                    type="number"
                                    value={item.cost_breakdown.overhead_cost}
                                    onChange={e => {
                                      const val = Number(e.target.value) || 0;
                                      const newItems = [...scmData.items];
                                      newItems[idx].cost_breakdown.overhead_cost = val;
                                      setScmData({ ...scmData, items: newItems });
                                    }}
                                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none rounded px-2 py-1 text-xs font-semibold text-slate-800"
                                  />
                                </div>
                                <div>
                                  <label className="block font-bold text-slate-500 mb-1">기타경비 (원)</label>
                                  <input
                                    type="number"
                                    value={item.cost_breakdown.other_expenses}
                                    onChange={e => {
                                      const val = Number(e.target.value) || 0;
                                      const newItems = [...scmData.items];
                                      newItems[idx].cost_breakdown.other_expenses = val;
                                      setScmData({ ...scmData, items: newItems });
                                    }}
                                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none rounded px-2 py-1 text-xs font-semibold text-slate-800"
                                  />
                                </div>
                                <div>
                                  <label className="block font-bold text-slate-500 mb-1">운반비 (원)</label>
                                  <input
                                    type="number"
                                    value={item.cost_breakdown.delivery_expense}
                                    onChange={e => {
                                      const val = Number(e.target.value) || 0;
                                      const newItems = [...scmData.items];
                                      newItems[idx].cost_breakdown.delivery_expense = val;
                                      setScmData({ ...scmData, items: newItems });
                                    }}
                                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none rounded px-2 py-1 text-xs font-semibold text-slate-800"
                                  />
                                </div>
                              </div>
                              {/* 밸리데이션 피드백 */}
                              {(() => {
                                const sum = 
                                  Number(item.cost_breakdown.material_cost) +
                                  Number(item.cost_breakdown.processing_cost) +
                                  Number(item.cost_breakdown.overhead_cost) +
                                  Number(item.cost_breakdown.other_expenses) +
                                  Number(item.cost_breakdown.delivery_expense);
                                const diff = item.amount - sum;
                                return (
                                  <div className="flex justify-between items-center text-[9px] font-bold mt-1.5 border-t border-slate-100 pt-1">
                                    <span className="text-slate-400">비용 구성 총계: {sum.toLocaleString()}원</span>
                                    {diff !== 0 ? (
                                      <span className="text-rose-500 font-extrabold animate-pulse">
                                        ⚠️ 합계 금액과의 차액: {diff > 0 ? `+${diff.toLocaleString()}` : diff.toLocaleString()}원
                                      </span>
                                    ) : (
                                      <span className="text-emerald-600 font-extrabold">✓ 합계 금액과 비용 구성액이 완벽히 일치합니다.</span>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* SCM 하단 총액 요약 패널 */}
                  <div className="p-4 bg-indigo-50/40 rounded-2xl border border-indigo-100 flex items-center justify-between text-left shrink-0">
                    <span className="text-xs font-extrabold text-slate-600">등록 예정 거래 총합계 금액 (총 {scmData.items.length}개 품목)</span>
                    <span className="text-lg font-black text-indigo-700 font-mono">
                      {scmData.items.reduce((sum: number, it: any) => sum + (it.quantity * it.unit_price), 0).toLocaleString()}원
                    </span>
                  </div>

                  {/* 하단 제어 버튼 그룹 */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-150 shrink-0">
                    <button
                      onClick={() => setIsPrintModalOpen(false)}
                      className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition rounded-xl cursor-pointer"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleExecutePrint}
                      className="flex items-center gap-1.5 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-extrabold text-xs transition rounded-xl cursor-pointer shadow-lg shadow-indigo-600/10"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      양식 출력 실행 (Print)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 bg-slate-50/30">
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-100/70 flex items-start gap-2.5 shrink-0">
                    <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-850 font-bold leading-normal">
                      AI 조인 검색에 기반한 연계 데이터가 아래 입력창에 로드되었습니다. <br />
                      실제 인쇄될 내용 중 **비어 있거나 수정이 필요한 항목(주민번호, 용도 등)**을 수기로 마저 입력하여 증명서를 완성해 주십시오.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* 대상자 인적 사항 */}
                    <div className="space-y-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm text-left">
                      <span className="text-[11px] font-black text-slate-400 block border-b border-slate-100 pb-1.5 uppercase tracking-wider">대상자 인적 사항</span>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">성명 (Name) <span className="text-rose-500">*</span></label>
                        <input
                          type="text"
                          value={manualData.staff_name}
                          onChange={e => setManualData({ ...manualData, staff_name: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-violet-500 focus:outline-none rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800"
                          placeholder="사원 성명"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">소속 (Department)</label>
                        <input
                          type="text"
                          value={manualData.department}
                          onChange={e => setManualData({ ...manualData, department: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-violet-500 focus:outline-none rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800"
                          placeholder="예: R&D 개발본부"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">직위 (Position)</label>
                        <input
                          type="text"
                          value={manualData.position}
                          onChange={e => setManualData({ ...manualData, position: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-violet-500 focus:outline-none rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800"
                          placeholder="예: 책임연구원"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 flex items-center gap-1.5">
                          주민등록번호 (Resident ID)
                          <span className="text-amber-600 text-[8px] font-black bg-amber-100 px-1.5 py-0.5 rounded">수기 입력</span>
                        </label>
                        <input
                          type="text"
                          value={manualData.resident_id}
                          onChange={e => setManualData({ ...manualData, resident_id: e.target.value })}
                          className="w-full bg-amber-50/15 border-2 border-dashed border-amber-400 focus:bg-white focus:border-amber-600 focus:outline-none rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 transition-colors"
                          placeholder="예: 900101-1234567"
                        />
                      </div>
                    </div>

                    {/* 거주 주소 및 출력 용도 */}
                    <div className="space-y-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm text-left">
                      <span className="text-[11px] font-black text-slate-400 block border-b border-slate-100 pb-1.5 uppercase tracking-wider">주소 및 발급/출력 정보</span>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">거주 주소 (Address)</label>
                        <textarea
                          rows={3}
                          value={manualData.address}
                          onChange={e => setManualData({ ...manualData, address: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-violet-500 focus:outline-none rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 resize-none"
                          placeholder="주민등록상 거주 주소 입력"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">재직 기간 (Employment Period)</label>
                        <input
                          type="text"
                          value={manualData.employment_period}
                          onChange={e => setManualData({ ...manualData, employment_period: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-violet-500 focus:outline-none rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800"
                          placeholder="예: 2024.03.15 ~ 현재 재직 중"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 flex items-center gap-1.5">
                          제출 용도 (Usage)
                          <span className="text-amber-600 text-[8px] font-black bg-amber-100 px-1.5 py-0.5 rounded">수기 입력</span>
                        </label>
                        <input
                          type="text"
                          value={manualData.usage}
                          onChange={e => setManualData({ ...manualData, usage: e.target.value })}
                          className="w-full bg-amber-50/15 border-2 border-dashed border-amber-400 focus:bg-white focus:border-amber-600 focus:outline-none rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 transition-colors"
                          placeholder="예: 금융기관 제출용, 관공서 제출용"
                        />
                      </div>
                    </div>

                    {/* 발급 회사 부서 정보 */}
                    <div className="space-y-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm text-left">
                      <span className="text-[11px] font-black text-slate-400 block border-b border-slate-100 pb-1.5 uppercase tracking-wider">회사 발급/출력부서 정보</span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1 flex items-center gap-1">
                            발급/출력 부서명
                            <span className="text-amber-600 text-[7px] font-black bg-amber-100 px-1 py-0.5 rounded shrink-0">수기</span>
                          </label>
                          <input
                            type="text"
                            value={manualData.issue_dept}
                            onChange={e => setManualData({ ...manualData, issue_dept: e.target.value })}
                            className="w-full bg-amber-50/15 border-2 border-dashed border-amber-400 focus:bg-white focus:border-amber-600 focus:outline-none rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 transition-colors"
                            placeholder="인사팀 등"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">발급/출력 연락처</label>
                          <input
                            type="text"
                            value={manualData.issue_phone}
                            onChange={e => setManualData({ ...manualData, issue_phone: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-violet-500 focus:outline-none rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">이메일</label>
                          <input
                            type="text"
                            value={manualData.issue_email}
                            onChange={e => setManualData({ ...manualData, issue_email: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-violet-500 focus:outline-none rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1 flex items-center gap-1">
                            FAX 번호
                            <span className="text-amber-600 text-[7px] font-black bg-amber-100 px-1 py-0.5 rounded shrink-0">수기</span>
                          </label>
                          <input
                            type="text"
                            value={manualData.issue_fax}
                            onChange={e => setManualData({ ...manualData, issue_fax: e.target.value })}
                            className="w-full bg-amber-50/15 border-2 border-dashed border-amber-400 focus:bg-white focus:border-amber-600 focus:outline-none rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 transition-colors"
                            placeholder="FAX"
                          />
                        </div>
                      </div>

                      <span className="text-[11px] font-black text-slate-400 block border-b border-slate-100 pb-1.5 pt-2 uppercase tracking-wider">시스템 자동 정보</span>
                      <div className="grid grid-cols-3 gap-1.5 text-center">
                        <div className="bg-slate-50 border border-slate-100 py-1.5 rounded-lg">
                          <span className="block text-[8px] text-slate-400 font-bold">출력 연도</span>
                          <span className="text-[11px] font-extrabold text-slate-700">{manualData.issue_year}년</span>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 py-1.5 rounded-lg">
                          <span className="block text-[8px] text-slate-400 font-bold">출력 월</span>
                          <span className="text-[11px] font-extrabold text-slate-700">{manualData.issue_month}월</span>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 py-1.5 rounded-lg">
                          <span className="block text-[8px] text-slate-400 font-bold">출력 일</span>
                          <span className="text-[11px] font-extrabold text-slate-700">{manualData.issue_day}일</span>
                        </div>
                      </div>
                    </div>

                    {/* AI 실행 SQL 쿼리 조회 아코디언 패널 */}
                    {showSql && generatedSql && (
                      <div className="col-span-1 md:col-span-3 mt-2 p-4 bg-slate-900 rounded-2xl border border-slate-800 text-left font-mono relative group transition-all duration-200">
                        <div className="absolute right-3.5 top-3.5 flex items-center gap-2">
                          <span className="text-[8px] bg-slate-800 text-violet-400 px-2 py-0.5 rounded-full font-bold">
                            SQLite3
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(generatedSql);
                              alert('AI SQL 쿼리문이 클립보드에 성공적으로 복사되었습니다.');
                            }}
                            className="p-1.5 rounded-xl bg-slate-800 text-slate-450 hover:text-white hover:bg-slate-700 transition cursor-pointer"
                            title="쿼리 복사"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <span className="block text-[9px] font-black text-slate-500 mb-2.5 uppercase tracking-wider">
                          🤖 AI가 데이터 조인을 위해 자동 생성한 SQL 실행문
                        </span>
                        <pre className="text-[11px] text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed select-all">
                          {generatedSql}
                        </pre>
                      </div>
                    )}
                  </div>

                  {/* 하단 제어 버튼 그룹 */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-150 shrink-0">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPrintStep('search')}
                        className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition rounded-xl cursor-pointer"
                      >
                        이전 단계로 (검색)
                      </button>
                      
                      {generatedSql && (
                        <button
                          onClick={() => setShowSql(!showSql)}
                          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-extrabold border transition cursor-pointer ${
                            showSql 
                              ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700'
                              : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50'
                          }`}
                        >
                          <Database className="w-3.5 h-3.5 text-violet-500" />
                          {showSql ? 'AI SQL 쿼리 닫기' : 'AI SQL 쿼리 보기'}
                        </button>
                      )}
                    </div>
                    <button
                      onClick={handleExecutePrint}
                      className="flex items-center gap-1.5 px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-extrabold text-xs transition rounded-xl cursor-pointer shadow-lg shadow-violet-600/10"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      양식 출력 실행 (Print)
                    </button>
                  </div>
                </div>
              )
            )}

          </div>
        </div>
      )}

      {/* 발급/출력 화면 미리보기 모달 */}
      {previewLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in text-left">
          <div className="w-full max-w-4xl bg-white border border-slate-100 rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh] text-slate-850">
            
            {/* 모달 헤더 */}
            <div className="p-5 border-b border-slate-100 bg-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-lg font-black flex items-center gap-2 text-slate-900">
                  <Printer className="w-5 h-5 text-indigo-600 animate-pulse" />
                  발급/출력 당시 화면 미리보기
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-semibold">
                  [{previewLog.template_name || '삭제된 양식'}] 당시 인쇄되었던 증명서 화면을 복원하여 보여줍니다.
                </p>
              </div>
              <button 
                onClick={() => setPreviewLog(null)}
                className="text-slate-400 hover:text-slate-800 px-3 py-2 rounded-xl hover:bg-slate-100 transition text-xs font-black cursor-pointer"
              >
                닫기
              </button>
            </div>

            {/* 모달 내용 */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 bg-slate-50/30">
              
              {/* 로그 메타 정보 카드 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm text-xs font-semibold">
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold mb-0.5">발급/출력 대상 (ID)</span>
                  <span className="text-indigo-650 font-bold">{previewLog.record_id}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold mb-0.5">대상자 성명</span>
                  <span className="text-slate-800 font-bold">{previewLog.record_name}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold mb-0.5">출력 담당자</span>
                  <span className="text-slate-800">{previewLog.updated_by}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold mb-0.5">출력 일자</span>
                  <span className="text-slate-500">{previewLog.issue_date}</span>
                </div>
              </div>

              {/* 프리뷰 영역 */}
              <div className="flex-1 min-h-[50vh] flex flex-col bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                {!previewLog.html_content ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 gap-2">
                    <AlertCircle className="w-8 h-8 text-slate-300" />
                    <span className="text-xs font-bold text-slate-650">출력 화면을 복원할 수 없습니다.</span>
                    <span className="text-[11px] text-slate-400">해당 양식의 원본 HTML 템플릿 정보가 존재하지 않거나 삭제되었습니다.</span>
                  </div>
                ) : (() => {
                  try {
                    const parsedData = previewLog.print_data ? JSON.parse(previewLog.print_data) : {};
                    // Mustache 치환 엔진
                    const compileMustache = (html: string, data: Record<string, any>) => {
                      if (!html) return '';
                      return html.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
                        const cleanKey = key.trim();
                        return data[cleanKey] !== undefined ? String(data[cleanKey]) : '';
                      });
                    };
                    const compiledHtml = compileMustache(previewLog.html_content, parsedData);
                    
                    return (
                      <iframe
                        srcDoc={compiledHtml}
                        className="w-full h-full flex-1 border-none bg-white min-h-[50vh]"
                        title="출력화면 복원 미리보기"
                      />
                    );
                  } catch (err) {
                    console.error('Print data parsing error:', err);
                    return (
                      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-rose-500 gap-2">
                        <AlertCircle className="w-8 h-8 text-rose-400" />
                        <span className="text-xs font-bold">인쇄 데이터 해석 실패</span>
                        <span className="text-[11px] text-slate-400">출력 이력 데이터 포맷(JSON)에 분석 오류가 있습니다.</span>
                      </div>
                    );
                  }
                })()}
              </div>

            </div>

            {/* 하단 닫기 */}
            <div className="p-4 border-t border-slate-150 bg-white flex justify-end shrink-0">
              <button
                onClick={() => setPreviewLog(null)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition rounded-xl cursor-pointer"
              >
                미리보기 닫기
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 📥 양식 가져오기 중복 해결 선택 모달 */}
      {isImportConflictModalOpen && importConflictData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-150 shadow-2xl flex flex-col overflow-hidden max-h-[85vh] animate-scale-up">
            
            {/* 헤더 */}
            <div className="p-6 border-b border-slate-150 bg-slate-50 flex items-start gap-3 shrink-0">
              <div className="p-2 rounded-xl bg-violet-100 text-violet-600">
                <FileCheck className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h3 className="text-base font-black text-slate-800">양식 중복 경고</h3>
                <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                  가져오려는 양식과 동일한 명칭의 양식이 이미 존재합니다.
                </p>
              </div>
            </div>

            {/* 본문 */}
            <div className="p-6 flex-1 min-h-0 overflow-y-auto space-y-4 text-left">
              <div className="p-4.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 font-semibold space-y-1">
                  <p className="font-extrabold text-amber-950">중복 대상 양식명</p>
                  <p className="font-mono text-amber-900 break-all">"{importConflictData.template_name}"</p>
                  <p className="text-[10px] text-amber-700/80 mt-1">
                    기존의 양식을 덮어쓸 경우 이전의 HTML 마스터 디자인 코드가 유실됩니다.
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                <button
                  onClick={() => executeImportApi(importConflictData, 'overwrite')}
                  className="w-full p-4 border border-slate-200 hover:border-violet-500 rounded-2xl bg-white hover:bg-violet-50/10 flex flex-col text-left transition duration-200 group cursor-pointer"
                >
                  <span className="text-xs font-black text-slate-800 group-hover:text-violet-700">🔄 기존 양식에 덮어쓰기 (Overwrite)</span>
                  <span className="text-[10px] text-slate-400 font-bold mt-1">
                    기존 양식(ID: {importConflictData.existingId})의 내용을 본 백업 파일 내용으로 덮어씁니다. (복구 불가)
                  </span>
                </button>

                <button
                  onClick={() => executeImportApi(importConflictData, 'duplicate')}
                  className="w-full p-4 border border-slate-200 hover:border-violet-500 rounded-2xl bg-white hover:bg-violet-50/10 flex flex-col text-left transition duration-200 group cursor-pointer"
                >
                  <span className="text-xs font-black text-slate-800 group-hover:text-violet-700">🆕 복사본으로 추가 (Duplicate)</span>
                  <span className="text-[10px] text-slate-400 font-bold mt-1">
                    기존 양식을 보존하고, 이름 뒤에 "_복사본" 접미사를 붙여 새로운 고유 식별자(UUID)로 신규 등록합니다.
                  </span>
                </button>
              </div>
            </div>

            {/* 하단 버튼 */}
            <div className="p-4 border-t border-slate-150 bg-slate-50 flex justify-end gap-2 shrink-0">
              <button
                onClick={() => {
                  setIsImportConflictModalOpen(false);
                  setImportConflictData(null);
                }}
                className="px-4 py-2.5 bg-slate-200 hover:bg-slate-350 text-slate-700 font-extrabold text-xs transition rounded-xl cursor-pointer"
              >
                가져오기 취소
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
