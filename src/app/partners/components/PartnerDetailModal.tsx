import { apiFetch } from '@/lib/api';
import React, { useState, useEffect } from "react";
import { X, Sparkles, RefreshCw, Trash2, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Partner, DetailHistory } from "../types";

interface PartnerDetailModalProps {
  isDetailOpen: boolean;
  setIsDetailOpen: (open: boolean) => void;
  selectedPartner: Partner | null;
  detailHistory: DetailHistory;
  detailLoading: boolean;
  refetchDetail: (partnerId: string) => Promise<void>;
}

export function PartnerDetailModal({
  isDetailOpen,
  setIsDetailOpen,
  selectedPartner,
  detailHistory,
  detailLoading,
  refetchDetail
}: PartnerDetailModalProps) {
  // 📇 대표 담당자(is_primary === 1) 찾기 및 기본 정보 탭 폴백 매핑
  const primaryContact = (detailHistory.contacts || []).find((c: any) => Number(c.is_primary) === 1);
  const hasContactList = (detailHistory.contacts || []).length > 0;

  const dispManagerName = primaryContact 
    ? primaryContact.name 
    : (hasContactList ? '미지정' : (selectedPartner?.manager_name || '미지정'));

  const dispManagerPhone = primaryContact 
    ? (primaryContact.phone || '연락처 없음') 
    : (hasContactList ? '연락처 없음' : (selectedPartner?.manager_phone || '연락처 없음'));

  const dispManagerEmail = primaryContact 
    ? (primaryContact.email || '미기입') 
    : (hasContactList ? '미기입' : (selectedPartner?.manager_email || '미기입'));

  const dispManagerPosition = primaryContact 
    ? (primaryContact.position || '미기입') 
    : (hasContactList ? '미기입' : (selectedPartner?.manager_position || '미기입'));

  // 재무 분석 관리를 위한 탭 및 데이터 상태 선언
  const [activeSubTab, setActiveSubTab] = useState<"info" | "financial" | "contacts">("info");
  const [financials, setFinancials] = useState<any[]>([]);
  const [loadingFin, setLoadingFin] = useState<boolean>(false);
  const [isFinParsing, setIsFinParsing] = useState<boolean>(false);
  const [finDragOver, setFinDragOver] = useState<boolean>(false);
  const [tempFinData, setTempFinData] = useState<any | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 📇 담당자 개별 추가/수정용 팝업 폼 상태
  const [isContactFormOpen, setIsContactFormOpen] = useState(false);
  const [contactEditId, setContactEditId] = useState<number | null>(null);
  const [contactForm, setContactForm] = useState({
    name: '',
    position: '',
    phone: '',
    email: '',
    is_primary: 0,
    card_image_url: ''
  });
  const [isContactScanning, setIsContactScanning] = useState(false);

  // 📇 대표 담당자 변경 핸들러
  const handleSetPrimaryContact = async (contactId: number) => {
    if (!selectedPartner) return;
    try {
      const res = await apiFetch('/api/partners/contacts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: contactId,
          partner_id: selectedPartner.id,
          is_primary: 1
        })
      });
      const data = await res.json();
      if (data.success) {
        await refetchDetail(selectedPartner.id);
      } else {
        alert(data.error || '대표 지정에 실패했습니다.');
      }
    } catch (err) {
      console.error('대표 지정 에러:', err);
    }
  };

  // 📇 담당자 삭제 핸들러
  const handleDeleteContact = async (contactId: number) => {
    if (!selectedPartner) return;
    if (!window.confirm('이 담당자를 명단에서 삭제하시겠습니까?')) return;

    try {
      const res = await apiFetch(`/api/partners/contacts?id=${contactId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        await refetchDetail(selectedPartner.id);
      } else {
        alert(data.error || '담당자 삭제에 실패했습니다.');
      }
    } catch (err) {
      console.error('담당자 삭제 에러:', err);
    }
  };

  // 📇 담당자 수정 모드 진입 핸들러
  const openEditContact = (c: any) => {
    setContactEditId(c.id);
    setContactForm({
      name: c.name || '',
      position: c.position || '',
      phone: c.phone || '',
      email: c.email || '',
      is_primary: c.is_primary || 0,
      card_image_url: c.card_image_url || ''
    });
    setIsContactFormOpen(true);
  };

  // 📇 담당자 추가 모드 진입 핸들러
  const openCreateContact = () => {
    setContactEditId(null);
    setContactForm({
      name: '',
      position: '',
      phone: '',
      email: '',
      is_primary: 0,
      card_image_url: ''
    });
    setIsContactFormOpen(true);
  };

  // 📇 담당자 저장 (추가/수정) 핸들러
  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartner) return;
    if (!contactForm.name.trim()) {
      alert('담당자 성함은 필수 항목입니다.');
      return;
    }

    const method = contactEditId ? 'PUT' : 'POST';
    const payload = contactEditId
      ? { id: contactEditId, partner_id: selectedPartner.id, ...contactForm }
      : { partner_id: selectedPartner.id, ...contactForm };

    try {
      const res = await apiFetch('/api/partners/contacts', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setIsContactFormOpen(false);
        await refetchDetail(selectedPartner.id);
      } else {
        alert(data.error || '담당자 저장에 실패했습니다.');
      }
    } catch (err) {
      console.error('담당자 저장 에러:', err);
    }
  };

  // 📇 명함 업로드 OCR 핸들러
  const handleContactCardScan = async (fileObj: File) => {
    if (!fileObj) return;
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(fileObj.type)) {
      alert('⚠️ 명함 이미지(JPG, PNG) 또는 PDF만 지원됩니다.');
      return;
    }

    setIsContactScanning(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target?.result as string;
        const res = await apiFetch('/api/partners/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file: base64Data, mimeType: fileObj.type, action: 'card' })
        });
        const resData = await res.json();
        if (resData.success && resData.parsedCard) {
          const card = resData.parsedCard;
          setContactForm(prev => ({
            ...prev,
            name: card.name || prev.name,
            position: card.position || prev.position,
            phone: card.phone || prev.phone,
            email: card.email || prev.email
          }));
          alert('🔮 AI가 명함 정보를 스캔하여 양식에 자동으로 입력했습니다!');
        } else {
          alert('명함 정보 추출에 실패했습니다. 수동으로 입력해 주세요.');
        }
      };
      reader.readAsDataURL(fileObj);
    } catch (err) {
      console.error('명함 스캔 에러:', err);
    } finally {
      setIsContactScanning(false);
    }
  };

  const fetchFinancials = async (partnerId: string) => {
    setLoadingFin(true);
    try {
      const res = await apiFetch(`/api/financials?company_id=${partnerId}`);
      const data = await res.json();
      if (data.success) {
        setFinancials(data.list || []);
      }
    } catch (err) {
      console.error('거래처 재무정보 로드 실패:', err);
    } finally {
      setLoadingFin(false);
    }
  };

  useEffect(() => {
    if (selectedPartner && activeSubTab === "financial") {
      fetchFinancials(selectedPartner.id);
    } else {
      setTempFinData(null);
      setMessage(null);
    }
  }, [selectedPartner, activeSubTab]);

  // 거래처 재무제표 PDF 업로드 및 OCR 파싱
  const handleFinPdfUpload = async (fileObj: File) => {
    if (!fileObj || !selectedPartner) return;
    if (fileObj.type !== 'application/pdf') {
      alert('⚠️ 재무제표는 국세청 PDF 파일만 지원됩니다.');
      return;
    }
    
    setIsFinParsing(true);
    setMessage(null);
    
    try {
      const formData = new FormData();
      formData.append('file', fileObj);

      const res = await apiFetch('/api/financials/upload', {
        method: 'POST',
        body: formData
      });

      const resData = await res.json();
      if (!resData.success) {
        throw new Error(resData.error || '재무제표 파싱에 실패했습니다.');
      }

      setTempFinData({
        company_id: selectedPartner.id,
        company_type: 'PARTNER',
        fiscal_year: resData.data.fiscalYear || new Date().getFullYear() - 1,
        fiscal_quarter: resData.data.fiscalQuarter || 'YR',
        total_assets: resData.data.totalAssets || 0,
        total_liabilities: resData.data.totalLiabilities || 0,
        total_equity: resData.data.totalEquity || 0,
        revenue: resData.data.revenue || 0,
        operating_income: resData.data.operatingIncome || 0,
        net_income: resData.data.netIncome || 0,
        pdf_file_path: resData.filePath,
        parsed_raw_json: resData.data
      });
      
      setMessage({ type: 'success', text: 'AI가 재무제표 분석을 성공적으로 마쳤습니다! 하단 수치 검증 후 저장해 주세요.' });
    } catch (err: any) {
      console.error('거래처 재무 PDF 파싱 에러:', err);
      setMessage({ type: 'error', text: err.message || '재무제표 판독 중 오류가 발생했습니다.' });
    } finally {
      setIsFinParsing(false);
    }
  };

  const handleTempFinDataChange = (field: string, value: number) => {
    if (!tempFinData) return;
    setTempFinData((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  // 재무정보 최종 승인 저장
  const handleSaveFinancials = async () => {
    if (!tempFinData || !selectedPartner) return;
    try {
      const res = await apiFetch('/api/financials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tempFinData)
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        setTempFinData(null);
        fetchFinancials(selectedPartner.id);
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      alert(err.message || '저장 중 오류가 발생했습니다.');
    }
  };

  // 재무제표 삭제
  const handleDeleteFinancials = async (id: string) => {
    if (!confirm('정말로 해당 연도 재무제표를 삭제하시겠습니까? 관련 첨부 파일도 함께 삭제됩니다.')) return;
    try {
      const res = await apiFetch(`/api/financials?id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: '재무제표 정보가 정상 파괴되었습니다.' });
        if (selectedPartner) fetchFinancials(selectedPartner.id);
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      alert(err.message || '삭제 중 오류가 발생했습니다.');
    }
  };

  // 팝업 닫힐 때 탭 인덱스도 함께 초기화되도록 감싸기
  const handleClose = () => {
    setActiveSubTab("info");
    setIsDetailOpen(false);
  };

  if (!isDetailOpen || !selectedPartner) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] max-w-2xl w-full p-6 md:p-8 shadow-2xl relative z-10 flex flex-col max-h-[85vh] animate-scale-up border border-slate-100/50">
        <button 
          onClick={handleClose} 
          className="absolute top-5 right-5 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors border-none bg-transparent cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="space-y-1 mb-4">
          <div className="flex gap-1 items-center flex-wrap">
            <span className="text-[9px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-black tracking-wider uppercase inline-block">
              Partner Profile
            </span>
            {selectedPartner.type && selectedPartner.type.split(',').map((t: string) => {
              const label = t === 'VENDOR' ? '공급처' : t === 'BUYER' ? '바이어' : '관계사';
              const color = t === 'VENDOR' ? 'bg-indigo-55 text-indigo-600' : t === 'BUYER' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600';
              return (
                <span key={t} className={`text-[8px] ${color} px-1.5 py-0.5 rounded font-black tracking-wide inline-block`}>
                  {label}
                </span>
              );
            })}
          </div>
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-1.5">
            <span>{selectedPartner.company_name}</span>
            <span className="text-xs font-bold text-slate-400">({selectedPartner.representative || '대표자 미기입'} 대표)</span>
          </h3>
        </div>

        {/* 📊 서브 탭 스위처 */}
        <div className="flex border-b border-slate-100 mb-5 text-xs font-bold shrink-0">
          <button
            type="button"
            onClick={() => setActiveSubTab("info")}
            className={`pb-2.5 px-4 border-b-2 transition-all cursor-pointer ${
              activeSubTab === "info"
                ? "border-indigo-600 text-indigo-650"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            기본 거래 정보
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("financial")}
            className={`pb-2.5 px-4 border-b-2 transition-all cursor-pointer ${
              activeSubTab === "financial"
                ? "border-indigo-600 text-indigo-650"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            재무 / 신용 분석 AI 📊
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("contacts")}
            className={`pb-2.5 px-4 border-b-2 transition-all cursor-pointer ${
              activeSubTab === "contacts"
                ? "border-indigo-600 text-indigo-650"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            담당자 명단 📇
          </button>
        </div>

        <div className="space-y-6 flex-1 overflow-y-auto pr-1">
          
          {activeSubTab === "info" && (
            <>
              {/* 상세 스펙 명세 */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-slate-50 p-4.5 rounded-2xl border border-slate-100 text-xs font-semibold">
            <div>
              <span className="text-[10px] text-slate-400 block mb-0.5">사업자 번호</span>
              <span className="text-slate-700 font-bold block">{selectedPartner.business_number || '미기입'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block mb-0.5">회사 번호</span>
              <span className="text-slate-700 font-bold block">{selectedPartner.phone || '미기입'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block mb-0.5">우대 등급</span>
              <span className="text-indigo-600 font-black block">{selectedPartner.vip_level} Grade</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block mb-0.5">팩스 번호</span>
              <span className="text-slate-700 font-bold block">{selectedPartner.fax || '미기입'}</span>
            </div>
            <div className="col-span-2">
              <span className="text-[10px] text-slate-400 block mb-0.5">계산서 이메일</span>
              <span className="text-slate-700 block truncate">{selectedPartner.email || '미기입'}</span>
            </div>
            <div className="border-t border-slate-200/50 pt-2 mt-1">
              <span className="text-[10px] text-slate-400 block mb-0.5">대표 담당자</span>
              <span className="text-slate-700 font-bold block">
                {dispManagerName} {dispManagerPosition && dispManagerPosition !== '미기입' ? `[${dispManagerPosition}]` : ''} ({dispManagerPhone})
              </span>
            </div>
            <div className="col-span-2 border-t border-slate-200/50 pt-2 mt-1">
              <span className="text-[10px] text-slate-400 block mb-0.5">담당자 이메일</span>
              <span className="text-slate-700 block truncate">{dispManagerEmail}</span>
            </div>
            <div className="col-span-3 border-t border-slate-200/50 pt-2 mt-1">
              <span className="text-[10px] text-slate-400 block mb-0.5">사업장 주소</span>
              <span className="text-slate-700 block">{selectedPartner.address || '소재지 미등록'}</span>
            </div>
          </div>

          {/* 과거 수/발주 실시간 타임라인 */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-500 animate-pulse" />
              <span>실시간 B2B 거래 히스토리 타임라인</span>
            </h4>

            {detailLoading ? (
              <p className="text-center py-8 text-xs text-slate-400">거래 이력 마이닝 중...</p>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {(() => {
                  const hasVendor = selectedPartner.type?.split(',').includes('VENDOR');
                  const hasBuyer = selectedPartner.type?.split(',').includes('BUYER');
                  
                  const pos = hasVendor ? (detailHistory.purchaseOrders || []).map((po: any) => ({ ...po, _historyType: 'PO' })) : [];
                  const sos = hasBuyer ? (detailHistory.salesOrders || []).map((so: any) => ({ ...so, _historyType: 'SO' })) : [];
                  
                  const combined = [...pos, ...sos].sort((a, b) => {
                    const dateA = a.created_at || '';
                    const dateB = b.created_at || '';
                    return dateB.localeCompare(dateA);
                  });
                  
                  if (combined.length === 0) {
                    return <p className="text-center py-6 text-slate-400 text-xs font-semibold">거래 이력이 존재하지 않습니다.</p>;
                  }
                  
                  return combined.map((item: any) => (
                    <div key={item.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-xs font-semibold">
                      <div>
                        <span className="font-mono text-slate-400 text-[10px] block">{item.id}</span>
                        <span className="text-slate-800 mt-0.5 block">
                          {item._historyType === 'PO' ? '발주일' : '수주일'}: {(item.created_at || '').substring(0, 10)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className={item._historyType === 'PO' ? 'text-indigo-600 block' : 'text-emerald-600 block'}>
                          {item._historyType === 'PO' ? '발주: ' : '수주: '}{parseInt(item.total_amount || '0').toLocaleString()}원
                        </span>
                        <span className={`inline-block px-1.5 py-0.2 rounded text-[8px] font-black uppercase mt-1 ${
                          item._historyType === 'PO' 
                            ? (item.status === 'PENDING_INBOUND' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600')
                            : (item.status === 'REGISTERED' ? 'bg-amber-150 text-amber-655' : 'bg-emerald-600 text-white')
                        }`}>
                          {item._historyType === 'PO'
                            ? (item.status === 'PENDING_INBOUND' ? '발주완료' : '입고완료')
                            : (item.status === 'REGISTERED' ? '수주대기' : '확정완료')}
                        </span>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
            </>
          )}

          {activeSubTab === "financial" && (
            // 📊 재무 / 신용 분석 AI 탭
            <div className="space-y-5">
              
              {/* 메시지 피드백 */}
              {message && (
                <div
                  className={`flex items-center gap-2 p-3 rounded-xl border text-[11px] font-semibold ${
                    message.type === 'success'
                      ? 'bg-purple-50 border-purple-100 text-purple-700'
                      : 'bg-rose-50 border-rose-100 text-rose-700'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>{message.text}</span>
                </div>
              )}

              {/* PDF 드롭존 */}
              {isFinParsing ? (
                <div className="border border-purple-200 bg-purple-50/20 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-3 animate-pulse">
                  <RefreshCw className="w-6 h-6 text-purple-500 animate-spin" />
                  <div>
                    <span className="text-xs font-black text-slate-700 block">AI가 국세청 결산 보고서 PDF를 정밀 분석 중입니다...</span>
                    <span className="text-[10px] text-slate-400 font-bold block mt-1">이 작업은 약 2~4초 소요됩니다.</span>
                  </div>
                </div>
              ) : (
                <div
                  onDragOver={(e) => { e.preventDefault(); setFinDragOver(true); }}
                  onDragLeave={() => setFinDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setFinDragOver(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleFinPdfUpload(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => document.getElementById('partner-fin-uploader')?.click()}
                  className={`border-2 border-dashed rounded-xl p-4.5 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                    finDragOver
                      ? 'border-purple-500 bg-purple-50/30'
                      : 'border-slate-200 hover:border-purple-300 hover:bg-slate-50/30'
                  }`}
                >
                  <span className="text-[11px] font-black text-slate-700 block">이 거래처의 국세청 재무제표 PDF 파일 업로드</span>
                  <span className="text-[9px] text-slate-400 font-semibold block mt-1">
                    드래그 앤 드롭 또는 클릭하여 업로드 (AI 자동 수치 기입)
                  </span>
                  <input
                    type="file"
                    id="partner-fin-uploader"
                    accept="application/pdf"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFinPdfUpload(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                </div>
              )}

              {/* 파싱 결과 검증 폼 */}
              {tempFinData && (
                <div className="bg-purple-50/10 border border-purple-100 p-4 rounded-xl space-y-3 animate-fade-in text-[10px] font-bold">
                  <span className="text-purple-600 block flex items-center gap-1 font-black">
                    <Sparkles className="w-3.5 h-3.5 text-purple-500 animate-pulse" />
                    AI 판독 결과 검토 (필요 시 수정 가능)
                  </span>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                    <div className="space-y-1">
                      <label className="block text-[9px] text-slate-400">회계 연도</label>
                      <input
                        type="number"
                        value={tempFinData.fiscal_year}
                        onChange={(e) => handleTempFinDataChange('fiscal_year', Number(e.target.value))}
                        className="w-full px-2 py-1 border border-slate-200 rounded font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[9px] text-slate-400">매출액 (원)</label>
                      <input
                        type="number"
                        value={tempFinData.revenue}
                        onChange={(e) => handleTempFinDataChange('revenue', Number(e.target.value))}
                        className="w-full px-2 py-1 border border-slate-200 rounded font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[9px] text-slate-400">영업이익 (원)</label>
                      <input
                        type="number"
                        value={tempFinData.operating_income}
                        onChange={(e) => handleTempFinDataChange('operating_income', Number(e.target.value))}
                        className="w-full px-2 py-1 border border-slate-200 rounded font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[9px] text-slate-400">당기순이익 (원)</label>
                      <input
                        type="number"
                        value={tempFinData.net_income}
                        onChange={(e) => handleTempFinDataChange('net_income', Number(e.target.value))}
                        className="w-full px-2 py-1 border border-slate-200 rounded font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[9px] text-slate-400">자산 총계 (원)</label>
                      <input
                        type="number"
                        value={tempFinData.total_assets}
                        onChange={(e) => handleTempFinDataChange('total_assets', Number(e.target.value))}
                        className="w-full px-2 py-1 border border-slate-200 rounded font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[9px] text-slate-400">부채 총계 (원)</label>
                      <input
                        type="number"
                        value={tempFinData.total_liabilities}
                        onChange={(e) => handleTempFinDataChange('total_liabilities', Number(e.target.value))}
                        className="w-full px-2 py-1 border border-slate-200 rounded font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[9px] text-slate-400">자본 총계 (원)</label>
                      <input
                        type="number"
                        value={tempFinData.total_equity}
                        onChange={(e) => handleTempFinDataChange('total_equity', Number(e.target.value))}
                        className="w-full px-2 py-1 border border-slate-200 rounded font-bold"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-1.5 pt-1.5 border-t border-purple-100/50">
                    <button
                      type="button"
                      onClick={() => setTempFinData(null)}
                      className="px-2.5 py-1.5 border border-slate-200 rounded text-slate-500 hover:bg-slate-100 cursor-pointer font-bold"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveFinancials}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded cursor-pointer font-bold"
                    >
                      최종 저장
                    </button>
                  </div>
                </div>
              )}

              {/* 📊 미니 실적 트렌드 차트 */}
              {Array.isArray(financials) && financials.length > 0 && (
                <div className="bg-purple-50/10 border border-purple-100/30 p-4 rounded-2xl space-y-3 shrink-0">
                  <span className="text-[10px] font-black text-slate-450 tracking-wider block">📊 AI 재무 실적 트렌드 (최근 3개년 매출 및 영업이익)</span>
                  <div className="h-28 w-full flex items-end justify-around pt-4 pb-2 border-b border-slate-100 bg-white/50 rounded-xl px-2">
                    {financials.slice(0, 3).reverse().map((fin, idx) => {
                      const maxVal = Math.max(...financials.map(f => Math.max(f.revenue, Math.abs(f.operating_income))));
                      const revHeight = maxVal > 0 ? (fin.revenue / maxVal) * 70 : 0;
                      const opHeight = maxVal > 0 ? (Math.abs(fin.operating_income) / maxVal) * 70 : 0;
                      const isOpNegative = fin.operating_income < 0;

                      return (
                        <div key={idx} className="flex flex-col items-center space-y-1.5 w-1/4">
                          <div className="flex items-end justify-center gap-1 w-full h-16 relative">
                            {/* 매출액 막대 */}
                            <div 
                              style={{ height: `${Math.max(4, revHeight)}px` }} 
                              className="w-2.5 bg-purple-400 rounded-t-sm hover:bg-purple-500 transition-all cursor-help"
                              title={`매출액: ${(fin.revenue).toLocaleString()}원`}
                            ></div>
                            {/* 영업이익 막대 */}
                            <div 
                              style={{ height: `${Math.max(4, opHeight)}px` }} 
                              className={`w-2.5 rounded-t-sm hover:opacity-85 transition-all cursor-help ${
                                isOpNegative ? 'bg-rose-400' : 'bg-indigo-400'
                              }`}
                              title={`영업이익: ${(fin.operating_income).toLocaleString()}원`}
                            ></div>
                          </div>
                          <span className="text-[9px] font-extrabold text-slate-500">{fin.fiscal_year}년</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-center gap-4 text-[9px] text-slate-400 font-extrabold">
                    <div className="flex items-center gap-1"><div className="w-2 h-2 bg-purple-400 rounded-full"></div>매출액</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 bg-indigo-400 rounded-full"></div>영업이익</div>
                  </div>
                </div>
              )}

              {/* 재무제표 이력 리스트 테이블 */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-extrabold text-slate-400 tracking-wider block">연도별 재무 내역 리스트</span>
                {loadingFin ? (
                  <p className="text-center py-6 text-xs text-slate-400">데이터 로드 중...</p>
                ) : (!Array.isArray(financials) || financials.length === 0) ? (
                  <p className="text-center py-8 text-xs text-slate-400 border border-slate-100 border-dashed rounded-xl bg-slate-50/30">
                    등록된 재무제표 정보가 없습니다. 국세청 결산 보고서를 업로드해 주세요.
                  </p>
                ) : (
                  <div className="border border-slate-100 rounded-xl overflow-hidden bg-white shadow-sm shrink-0 max-h-[200px] overflow-y-auto pr-0.5">
                    <table className="w-full text-[10px] font-semibold text-slate-700 text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="p-2.5">연도</th>
                          <th className="p-2.5">매출 / 이익률</th>
                          <th className="p-2.5">영업이익</th>
                          <th className="p-2.5">부채비율</th>
                          <th className="p-2.5">원본</th>
                          <th className="p-2.5 text-center">삭제</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {financials.map((fin) => {
                          const opMargin = fin.revenue ? ((fin.operating_income / fin.revenue) * 100).toFixed(1) : '0.0';
                          const debtRatio = fin.total_equity ? ((fin.total_liabilities / fin.total_equity) * 100).toFixed(1) : '0.0';
                          return (
                            <tr key={fin.id} className="hover:bg-slate-50/30 transition-colors">
                              <td className="p-2.5 font-bold text-slate-900">{fin.fiscal_year}년</td>
                              <td className="p-2.5">
                                <div>{(fin.revenue).toLocaleString()}원</div>
                                <span className="text-[8px] font-black bg-emerald-50 text-emerald-600 px-1 py-0.2 rounded border border-emerald-100 mt-0.5 inline-block">
                                  이익률 {opMargin}%
                                </span>
                              </td>
                              <td className="p-2.5">
                                <span className={fin.operating_income < 0 ? 'text-rose-500 font-bold' : 'text-slate-700'}>
                                  {(fin.operating_income).toLocaleString()}원
                                </span>
                              </td>
                              <td className="p-2.5">
                                <span className={`text-[8px] font-black px-1 py-0.2 rounded border inline-block ${
                                  Number(debtRatio) > 200 
                                    ? 'bg-rose-50 border-rose-100 text-rose-500'
                                    : 'bg-indigo-50 border-indigo-100 text-indigo-500'
                                }`}>
                                  {debtRatio}%
                                </span>
                              </td>
                              <td className="p-2.5">
                                {fin.pdf_file_path ? (
                                  <a href={fin.pdf_file_path} target="_blank" rel="noreferrer" className="text-purple-600 font-bold hover:underline">
                                    PDF 📄
                                  </a>
                                ) : '-'}
                              </td>
                              <td className="p-2.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteFinancials(fin.id)}
                                  className="text-rose-500 hover:text-rose-700 p-0.5"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

          {activeSubTab === "contacts" && selectedPartner && (
            <div className="space-y-4 flex-1 flex flex-col min-h-0">
              {/* 담당자 목록 헤더 및 추가 버튼 */}
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100 shrink-0">
                <div>
                  <span className="text-[10px] font-black text-slate-450 tracking-wider block">B2B 거래처 담당자 명맥</span>
                  <span className="text-[9px] text-slate-400 mt-0.5 block">총 {detailHistory.contacts?.length || 0}명의 담당자가 등록되어 있습니다.</span>
                </div>
                <button
                  type="button"
                  onClick={openCreateContact}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors shadow-sm"
                >
                  + 담당자 추가
                </button>
              </div>

              {/* 담당자 리스트 그리드 */}
              {(!detailHistory.contacts || detailHistory.contacts.length === 0) ? (
                <div className="border border-slate-150 border-dashed rounded-2xl p-12 text-center text-slate-400 font-semibold text-xs bg-slate-50/10 flex-1 flex flex-col justify-center items-center gap-2">
                  <span>📇 등록된 담당자가 없습니다.</span>
                  <span className="text-[10px] text-slate-400 font-normal">우측 상단 버튼을 클릭해 담당자를 새로 등록해 주세요.</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto max-h-[360px] pr-0.5 pb-2 min-h-0 flex-1">
                  {detailHistory.contacts.map((c: any) => (
                    <div 
                      key={c.id} 
                      className={`p-4 rounded-2xl border transition-all relative flex flex-col justify-between gap-3 shadow-sm hover:shadow-md ${
                        c.is_primary === 1 
                          ? 'bg-indigo-50/10 border-indigo-200/60 shadow-indigo-100/10' 
                          : 'bg-white border-slate-150'
                      }`}
                    >
                      {/* 대표 담당자 뱃지 */}
                      {c.is_primary === 1 && (
                        <span className="absolute top-3.5 right-3.5 bg-indigo-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                          대표 담당자 👑
                        </span>
                      )}

                      <div className="space-y-2">
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-extrabold text-slate-800 text-sm">{c.name}</span>
                          {c.position && <span className="text-[10px] text-slate-400 font-bold">{c.position}</span>}
                        </div>

                        <div className="space-y-1 text-slate-650 text-[11px] font-semibold">
                          <div className="flex items-center gap-1.5">
                             <span className="text-[10px] text-slate-400 w-11">연락처</span>
                             <span>{c.phone || '연락처 미등록'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                             <span className="text-[10px] text-slate-400 w-11">이메일</span>
                             <span className="truncate max-w-[180px]" title={c.email}>{c.email || '이메일 미등록'}</span>
                          </div>
                        </div>
                      </div>

                      {/* 액션 버튼 그룹 */}
                      <div className="flex items-center justify-end gap-1.5 pt-2.5 border-t border-slate-100 mt-1">
                        {c.is_primary !== 1 && (
                          <button
                            type="button"
                            onClick={() => handleSetPrimaryContact(c.id)}
                            className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-md text-[9px] font-extrabold text-slate-650 cursor-pointer transition-all"
                          >
                            대표 지정
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openEditContact(c)}
                          className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-md text-[9px] font-extrabold text-slate-650 cursor-pointer transition-all"
                        >
                          수정
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteContact(c.id)}
                          className="px-2 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-md text-[9px] font-extrabold text-rose-600 cursor-pointer transition-all"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* 📇 담당자 개별 추가/수정용 미니 모달 */}
        {isContactFormOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-slate-200 rounded-3xl shadow-xl max-w-sm w-full p-6 space-y-4 animate-in fade-in zoom-in duration-150 text-slate-800">
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                <h4 className="font-extrabold text-slate-800 text-sm">
                  {contactEditId ? '📇 담당자 정보 수정' : '📇 신규 담당자 등록'}
                </h4>
                <button
                  type="button"
                  onClick={() => setIsContactFormOpen(false)}
                  className="text-slate-400 hover:text-slate-650 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveContact} className="space-y-3.5 text-xs">
                {/* 명함 자동 스캔 버튼 (추가 시에만 지원) */}
                {!contactEditId && (
                  <div className="relative">
                    <button
                      type="button"
                      disabled={isContactScanning}
                      onClick={() => document.getElementById('contact-card-uploader')?.click()}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-[10px] font-black border border-emerald-200 cursor-pointer transition-colors disabled:opacity-50"
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${isContactScanning ? 'animate-spin' : ''}`} />
                      <span>{isContactScanning ? '명함 스캔 중...' : '📷 명함 사진 업로드 (자동 스캔 입력)'}</span>
                    </button>
                    <input
                      type="file"
                      id="contact-card-uploader"
                      accept="image/*,application/pdf"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleContactCardScan(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold block">담당자 성함 *</label>
                  <input
                    type="text"
                    required
                    value={contactForm.name}
                    onChange={e => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="홍길동"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold block">직급 / 부서</label>
                  <input
                    type="text"
                    value={contactForm.position}
                    onChange={e => setContactForm(prev => ({ ...prev, position: e.target.value }))}
                    placeholder="대리 / 영업부"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold block">연락처 (휴대폰)</label>
                  <input
                    type="text"
                    value={contactForm.phone}
                    onChange={e => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="010-1234-5678"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold block">담당자 이메일</label>
                  <input
                    type="email"
                    value={contactForm.email}
                    onChange={e => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="manager@partner.com"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="contact-is-primary"
                    checked={contactForm.is_primary === 1}
                    onChange={e => setContactForm(prev => ({ ...prev, is_primary: e.target.checked ? 1 : 0 }))}
                    className="w-4 h-4 text-indigo-600 border-slate-200 rounded focus:ring-indigo-500"
                  />
                  <label htmlFor="contact-is-primary" className="text-[10px] text-slate-500 font-bold cursor-pointer">
                    이 담당자를 거래처의 대표 담당자로 지정합니다.
                  </label>
                </div>

                <div className="flex justify-end gap-1.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsContactFormOpen(false)}
                    className="px-4 py-2 border border-slate-200 rounded-lg text-slate-550 hover:bg-slate-100 cursor-pointer font-bold"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg cursor-pointer font-bold"
                  >
                    저장
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="mt-6 border-t border-slate-100 pt-4 flex">
          <button 
            onClick={handleClose} 
            className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-md border-none cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
