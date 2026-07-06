import { apiFetch } from '@/lib/api';
import { useState, useEffect } from "react";
import { Partner, PartnerForm, OcrResult, DetailHistory } from "../types";
import { usePersistedState } from "@/hooks/usePersistedState";

export function usePartners() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab, isActiveTabRestored] = usePersistedState<'VENDOR' | 'BUYER' | 'AFFILIATE'>('egdesk_partners_activeTab', 'VENDOR');
  const [searchQuery, setSearchQuery, isSearchQueryRestored] = usePersistedState("egdesk_partners_searchQuery", "");

  // 등록/수정 모달 상태
  const [isModalOpen, setIsModalOpen, isModalOpenRestored] = usePersistedState("egdesk_partners_isModalOpen", false);
  const [modalMode, setModalMode, isModalModeRestored] = usePersistedState<'create' | 'edit'>('egdesk_partners_modalMode', 'create');
  const [editingId, setEditingId, isEditingIdRestored] = usePersistedState<string | null>('egdesk_partners_editingId', null);
  
  // 입력 폼 바인딩
  const [form, setForm, isFormRestored] = usePersistedState<PartnerForm>('egdesk_partners_form', {
    type: 'VENDOR',
    company_name: "",
    business_number: "",
    representative: "",
    phone: "",
    fax: "",
    manager_name: "",
    manager_phone: "",
    manager_position: "",
    manager_email: "",
    email: "",
    address: "",
    vip_level: 'NORMAL',
    credit_limit: 0,
    memo: ""
  });

  // 🤖 AI OCR 및 스마트 매칭 상태 변수
  const [isOcrAnalyzing, setIsOcrAnalyzing] = useState(false);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [fileDragOver, setFileDragOver] = useState(false);

  // 📇 명함 관리 AI 및 자동 추천 상태 변수
  const [contacts, setContacts] = useState<any[]>([]);
  const [isCardAnalyzing, setIsCardAnalyzing] = useState(false);

  // 🔍 AI 거래처 위해 모니터링 상태 변수
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [analysisPartner, setAnalysisPartner] = useState<Partner | null>(null);
  const [partnerReports, setPartnerReports] = useState<any[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // 상세 거래 타임라인 팝업 상태
  const [isDetailOpen, setIsDetailOpen, isDetailOpenRestored] = usePersistedState("egdesk_partners_isDetailOpen", false);
  const [selectedPartner, setSelectedPartner, isSelectedPartnerRestored] = usePersistedState<Partner | null>("egdesk_partners_selectedPartner", null);
  const [detailHistory, setDetailHistory] = useState<DetailHistory>({ 
    purchaseOrders: [], 
    salesOrders: [],
    contacts: []
  });
  const [detailLoading, setDetailLoading] = useState(false);

  // 모든 세션 상태 복원이 완료되었는지 감시하는 플래그
  const isRestored = isActiveTabRestored && isSearchQueryRestored && isModalOpenRestored && isModalModeRestored && isEditingIdRestored && isFormRestored && isDetailOpenRestored && isSelectedPartnerRestored;

  // 📂 B2B 사업자등록증 이미지/PDF 파일 업로드 및 AI 스캔 연동
  const handleFileUpload = async (fileObj: File) => {
    if (!fileObj) return;

    // 이미지 및 PDF 제한 가드
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(fileObj.type)) {
      alert('⚠️ 지원되지 않는 파일 포맷입니다. 사업자등록증 사진(JPG, PNG) 또는 PDF 문서만 업로드해 주세요.');
      return;
    }

    setIsOcrAnalyzing(true);
    setOcrResult(null);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target?.result as string;
        
        // 백엔드 AI OCR API 호출
        const res = await apiFetch('/api/partners/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file: base64Data, mimeType: fileObj.type })
        });

        const resData = await res.json();
        
        if (!resData.success) {
          throw new Error(resData.error || '사업자등록증 분석에 실패했습니다.');
        }

        const ocrData = resData.data;
        setOcrResult(resData);

        // 폼 필드 Prefill 자동 입력 조율
        setForm(prev => {
          let updatedMemo = prev.memo;
          const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);

          if (resData.status === 'UPDATE_PARTNER') {
            // 대표자/본점주소 등 변동사항이 감지된 경우 ➡️ 기존 정보는 유지하며 감사 이력(memo)에 보존 적재
            const diff = resData.diff;
            const changes: string[] = [];
            if (diff.companyName.changed) changes.push(`상호: ${diff.companyName.old} ➡️ ${diff.companyName.new}`);
            if (diff.representative.changed) changes.push(`대표자: ${diff.representative.old} ➡️ ${diff.representative.new}`);
            if (diff.address.changed) changes.push(`주소: ${diff.address.old} ➡️ ${diff.address.new}`);

            const auditHeader = `[AI 이력 보존: ${nowStr.substring(0, 10)} 변동 갱신 - ${changes.join(' / ')}]`;
            updatedMemo = prev.memo ? `${auditHeader}\n${prev.memo}` : auditHeader;
            
            // 기존 거래처 수정을 타도록 모달 모드를 동적으로 수정
            setModalMode('edit');
            setEditingId(resData.existingId);
          } else if (resData.status === 'NEW_PARTNER') {
            const auditHeader = `[AI 사업자등록증 자동 작성 - 스캔일시: ${nowStr}]`;
            updatedMemo = prev.memo ? `${auditHeader}\n${prev.memo}` : auditHeader;
          }

          // 사업자번호 필드 포맷 대응용 헬퍼 ("-" 기호 제거하여 프론트 양식 준수)
          const cleanBusinessNo = (ocrData.businessNumber || "").replace(/\D/g, "");

          return {
            ...prev,
            company_name: ocrData.companyName || prev.company_name,
            business_number: cleanBusinessNo || prev.business_number,
            representative: ocrData.representative || prev.representative,
            address: ocrData.address || prev.address,
            phone: ocrData.phone || prev.phone,
            manager_name: ocrData.managerName || prev.manager_name,
            memo: updatedMemo
          };
        });

        setIsOcrAnalyzing(false);
      };

      reader.readAsDataURL(fileObj);

    } catch (err: any) {
      alert(err.message || '파일 처리 중 오류가 발생했습니다.');
      setIsOcrAnalyzing(false);
    }
  };

  // 📇 명함 파일 업로드 및 AI 스캔 연동
  const handleCardUpload = async (fileObj: File) => {
    if (!fileObj) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(fileObj.type)) {
      alert('⚠️ 지원되지 않는 파일 포맷입니다. 명함 사진(JPG, PNG) 또는 PDF 문서만 업로드해 주세요.');
      return;
    }

    setIsCardAnalyzing(true);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target?.result as string;

        // 백엔드 AI OCR API 호출 (명함 분석용)
        const res = await apiFetch('/api/partners/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file: base64Data, mimeType: fileObj.type, action: 'card' })
        });

        const resData = await res.json();

        if (!resData.success) {
          throw new Error(resData.error || '명함 분석에 실패했습니다.');
        }

        const cardData = resData.data;

        // 담당자 폼 자동 입력
        setForm(prev => ({
          ...prev,
          manager_name: cardData.name || prev.manager_name,
          manager_phone: cardData.phone || prev.manager_phone,
          manager_position: cardData.position || prev.manager_position,
          manager_email: cardData.email || prev.manager_email,
          email: cardData.email || prev.email
        }));

        alert(`✨ 명함 인식 성공! 담당자 [${cardData.name || '미상'}] 정보를 폼에 자동 입력했습니다.`);
        setIsCardAnalyzing(false);
      };

      reader.readAsDataURL(fileObj);

    } catch (err: any) {
      alert(err.message || '명함 처리 중 오류가 발생했습니다.');
      setIsCardAnalyzing(false);
    }
  };

  // 🔍 AI 거래처 조사 팝업 구동 및 과거 이력 조회
  const openAnalysisPopup = async (pt: Partner, e: React.MouseEvent) => {
    e.stopPropagation();
    setAnalysisPartner(pt);
    setIsAnalysisOpen(true);
    await fetchPartnerReports(pt.id);
  };

  const fetchPartnerReports = async (partnerId: string) => {
    try {
      const res = await apiFetch(`/api/partners/analyze?partner_id=${partnerId}`);
      const data = await res.json();
      if (data.success) {
        setPartnerReports(data.reports || []);
      }
    } catch (err) {
      console.error("AI 리포트 이력 조회 실패:", err);
    }
  };

  // 🔍 AI 리스크 조사 실행 API 호출
  const handleRunAiAnalysis = async (type: 'NEWS' | 'REPUTATION' | 'FINANCIAL', payload: any) => {
    if (!analysisPartner) return;
    setIsAnalyzing(true);
    try {
      const res = await apiFetch('/api/partners/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partner_id: analysisPartner.id,
          company_name: analysisPartner.company_name,
          analysis_type: type,
          payload
        })
      });
      
      const data = await res.json();
      if (data.success) {
        await fetchPartnerReports(analysisPartner.id);
      } else {
        alert(`⚠️ AI 분석 오류: ${data.error}`);
      }
    } catch (err) {
      alert("서버 연결에 실패하여 분석을 실행하지 못했습니다.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (isRestored) {
      fetchPartners();
      fetchContacts();
    }
  }, [isRestored]);

  // 상세 팝업이 열려 있는 채로 세션 복원 시 상세 이력을 재로드하기 위한 이펙트
  useEffect(() => {
    if (isRestored && isDetailOpen && selectedPartner) {
      const fetchDetailHistory = async () => {
        setDetailLoading(true);
        try {
          const res = await apiFetch(`/api/partners?action=detail&id=${selectedPartner.id}`);
          const data = await res.json();
          if (data.success) {
            setDetailHistory({
              purchaseOrders: data.purchaseOrders || [],
              salesOrders: data.salesOrders || [],
              contacts: data.contacts || []
            });
          }
        } catch (e) {
          console.error("이력 마이닝 에러:", e);
        } finally {
          setDetailLoading(false);
        }
      };
      fetchDetailHistory();
    }
  }, [isRestored, isDetailOpen, selectedPartner]);

  const fetchPartners = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/partners");
      const data = await res.json();
      if (data.success) {
        setPartners(data.partners || []);
      }
    } catch (e) {
      console.error("거래처 로드 실패:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = async () => {
    try {
      const res = await apiFetch("/api/partners?action=contacts");
      const data = await res.json();
      if (data.success) {
        setContacts(data.contacts || []);
      }
    } catch (e) {
      console.error("명함첩 로드 실패:", e);
    }
  };

  // 상세 정보 및 과거 거래 이력 마이닝 팝업 열기
  const openDetailPopup = async (pt: Partner) => {
    setSelectedPartner(pt);
    setIsDetailOpen(true);
    setDetailLoading(true);
    try {
      const res = await apiFetch(`/api/partners?action=detail&id=${pt.id}`);
      const data = await res.json();
      if (data.success) {
        if (data.partner) {
          setSelectedPartner(data.partner);
        }
        setDetailHistory({
          purchaseOrders: data.purchaseOrders || [],
          salesOrders: data.salesOrders || [],
          contacts: data.contacts || []
        });
      }
    } catch (e) {
      console.error("이력 마이닝 에러:", e);
    } finally {
      setDetailLoading(false);
    }
  };

  // 상세 데이터 강제 갱신 헬퍼
  const refetchDetail = async (partnerId: string) => {
    try {
      const res = await apiFetch(`/api/partners?action=detail&id=${partnerId}`);
      const data = await res.json();
      if (data.success) {
        if (data.partner) {
          setSelectedPartner(data.partner);
        }
        setDetailHistory({
          purchaseOrders: data.purchaseOrders || [],
          salesOrders: data.salesOrders || [],
          contacts: data.contacts || []
        });
      }
    } catch (e) {
      console.error("이력 재로드 에러:", e);
    }
  };

  // 등록/수정 저장
  const handleSavePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.company_name.trim()) {
      alert("상호명을 입력해 주세요.");
      return;
    }

    try {
      let res;
      if (modalMode === 'create') {
        res = await apiFetch("/api/partners", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form)
        });
      } else {
        res = await apiFetch("/api/partners", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, id: editingId })
        });
      }

      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        fetchPartners();
        alert(data.message || "정상적으로 보존되었습니다.");
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("오류가 발생했습니다.");
    }
  };

  // 수정 모드 세팅
  const handleEditClick = (pt: Partner, e: React.MouseEvent) => {
    e.stopPropagation(); // 클릭 전파 차단
    setModalMode('edit');
    setEditingId(pt.id);
    setOcrResult(null); // AI 스캔 결과 초기화
    setForm({
      type: pt.type,
      company_name: pt.company_name,
      business_number: pt.business_number || "",
      representative: pt.representative || "",
      phone: pt.phone || "",
      fax: pt.fax || "",
      manager_name: pt.manager_name || "",
      manager_phone: pt.manager_phone || "",
      manager_position: pt.manager_position || "",
      manager_email: pt.manager_email || "",
      email: pt.email || "",
      address: pt.address || "",
      vip_level: pt.vip_level || 'NORMAL',
      credit_limit: pt.credit_limit || 0,
      memo: pt.memo || ""
    });
    setIsModalOpen(true);
  };

  // 신규 등록용 세팅
  const handleCreateClick = () => {
    setModalMode('create');
    setEditingId(null);
    setOcrResult(null); // AI 스캔 결과 캐시 초기화
    setForm({
      type: activeTab,
      company_name: "",
      business_number: "",
      representative: "",
      phone: "",
      fax: "",
      manager_name: "",
      manager_phone: "",
      manager_position: "",
      manager_email: "",
      email: "",
      address: "",
      vip_level: 'NORMAL',
      credit_limit: 0,
      memo: ""
    });
    setIsModalOpen(true);
  };

  // 삭제
  const handleDeletePartner = async (pt: Partner, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`[경고] 거래처 '${pt.company_name}' 정보를 영구히 데이터베이스에서 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;

    try {
      const res = await apiFetch(`/api/partners?id=${pt.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchPartners();
        alert("거래처 정보가 안전하게 영구 삭제되었습니다.");
      }
    } catch (err) {
      alert("삭제 중 에러가 발생했습니다.");
    }
  };

  // 검색 필터링
  const filteredPartners = partners.filter(pt => {
    if (!pt.type || !pt.type.split(',').includes(activeTab)) return false;
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase().trim();
    return (
      pt.company_name.toLowerCase().includes(query) ||
      (pt.representative && pt.representative.toLowerCase().includes(query)) ||
      (pt.manager_name && pt.manager_name.toLowerCase().includes(query)) ||
      (pt.phone && pt.phone.includes(query)) ||
      (pt.manager_phone && pt.manager_phone.includes(query))
    );
  });

  // 집계 수치 산출
  const totalVendors = partners.filter(p => p.type && p.type.split(',').includes('VENDOR')).length;
  const totalBuyers = partners.filter(p => p.type && p.type.split(',').includes('BUYER')).length;
  const totalAffiliates = partners.filter(p => p.type && p.type.split(',').includes('AFFILIATE')).length;
  const totalPurchases = partners.filter(p => p.type && p.type.split(',').includes('VENDOR')).reduce((sum, p) => sum + (p.total_performance || 0), 0);
  const totalSales = partners.filter(p => p.type && p.type.split(',').includes('BUYER')).reduce((sum, p) => sum + (p.total_performance || 0), 0);

  return {
    partners,
    loading,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    isModalOpen,
    setIsModalOpen,
    modalMode,
    setModalMode,
    editingId,
    setEditingId,
    form,
    setForm,
    isOcrAnalyzing,
    ocrResult,
    setOcrResult,
    fileDragOver,
    setFileDragOver,
    isDetailOpen,
    setIsDetailOpen,
    selectedPartner,
    setSelectedPartner,
    detailHistory,
    setDetailHistory,
    detailLoading,
    handleFileUpload,
    openDetailPopup,
    refetchDetail,
    handleSavePartner,
    handleEditClick,
    handleCreateClick,
    handleDeletePartner,
    filteredPartners,
    totalVendors,
    totalBuyers,
    totalAffiliates,
    totalPurchases,
    totalSales,
    contacts,
    isCardAnalyzing,
    handleCardUpload,
    // 🔍 AI 위해 모니터링 추가
    isAnalysisOpen,
    setIsAnalysisOpen,
    analysisPartner,
    setAnalysisPartner,
    partnerReports,
    isAnalyzing,
    openAnalysisPopup,
    handleRunAiAnalysis
  };
}
