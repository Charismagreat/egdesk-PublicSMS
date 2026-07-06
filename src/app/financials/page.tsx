'use client';

import { apiFetch } from '@/lib/api';
import React, { useState, useEffect, useRef } from 'react';
import { 
  TrendingUp, 
  AlertTriangle, 
  ShieldCheck, 
  UploadCloud, 
  Trash2, 
  FileText, 
  LayoutDashboard, 
  Activity, 
  Brain, 
  Share2, 
  ChevronDown, 
  ChevronUp, 
  HelpCircle,
  BarChart3,
  Percent,
  CheckCircle2,
  DollarSign,
  Landmark
} from 'lucide-react';

interface DetailedItem {
  id?: string;
  category: string;
  account_name: string;
  amount: number;
}

interface AnalysisLog {
  id?: string;
  z_score: number;
  risk_grade: string;
  forecast_text: string;
  consulting_text: string;
}

interface FinancialStatement {
  id: string;
  company_id: string;
  company_type: string;
  fiscal_year: number;
  fiscal_quarter: string;
  total_assets: number;
  total_liabilities: number;
  total_equity: number;
  revenue: number;
  operating_income: number;
  net_income: number;
  pdf_file_path: string | null;
  parsed_raw_json?: string;
  created_at: string;
  detailedItems?: DetailedItem[];
  analysisLog?: AnalysisLog | null;
}

export default function FinancialsPage() {
  const [activeTab, setActiveTab] = useState<'ledger' | 'charts' | 'advisor'>('ledger');
  const [statements, setStatements] = useState<FinancialStatement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const [ocrResult, setOcrResult] = useState<any | null>(null);
  const [expandedStatementId, setExpandedStatementId] = useState<string | null>(null);
  
  // OCR 파싱 후 수정 폼 상태
  const [companyName, setCompanyName] = useState<string>('본사');
  const [fiscalYear, setFiscalYear] = useState<number>(new Date().getFullYear() - 1);
  const [fiscalQuarter, setFiscalQuarter] = useState<string>('YR');
  const [totalAssets, setTotalAssets] = useState<number>(0);
  const [totalLiabilities, setTotalLiabilities] = useState<number>(0);
  const [totalEquity, setTotalEquity] = useState<number>(0);
  const [revenue, setRevenue] = useState<number>(0);
  const [operatingIncome, setOperatingIncome] = useState<number>(0);
  const [netIncome, setNetIncome] = useState<number>(0);
  const [detailedItemsInput, setDetailedItemsInput] = useState<DetailedItem[]>([]);
  
  // 알림 메시지 상태
  const [notification, setNotification] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // 파일 업로드 Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 데이터 로드
  const fetchStatements = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/financials');
      const data = await res.json();
      if (data.success) {
        setStatements(data.data || []);
      } else {
        showNotification('error', data.error || '재무제표 목록을 가져오지 못했습니다.');
      }
    } catch (err) {
      showNotification('error', '서버와 통신하는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatements();
  }, []);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setNotification({ type, text });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // PDF 업로드 & OCR 처리
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      showNotification('error', '재무제표는 PDF 형식만 업로드 가능합니다.');
      return;
    }

    try {
      setUploading(true);
      setOcrResult(null);
      const formData = new FormData();
      formData.append('file', file);

      const res = await apiFetch('/api/financials/upload', {
        method: 'POST',
        body: formData
      });

      const result = await res.json();
      if (result.success) {
        const ocrData = result.data;
        setOcrResult(result);
        
        // 폼 필드 상태에 채워넣기
        setCompanyName(ocrData.companyName || '본사');
        setFiscalYear(ocrData.fiscalYear || new Date().getFullYear() - 1);
        setFiscalQuarter(ocrData.fiscalQuarter || 'YR');
        setTotalAssets(ocrData.totalAssets || 0);
        setTotalLiabilities(ocrData.totalLiabilities || 0);
        setTotalEquity(ocrData.totalEquity || 0);
        setRevenue(ocrData.revenue || 0);
        setOperatingIncome(ocrData.operatingIncome || 0);
        setNetIncome(ocrData.netIncome || 0);
        setDetailedItemsInput(ocrData.detailedItems || []);
        
        showNotification('success', 'PDF OCR 분석이 완료되었습니다. 아래 폼에서 검토 후 최종 저장해주세요.');
      } else {
        showNotification('error', result.error || 'PDF 파일 분석에 실패했습니다.');
      }
    } catch (err) {
      showNotification('error', 'PDF 분석 업로드 중 네트워크 오류가 발생했습니다.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 재무제표 최종 DB 적재
  const handleSaveStatement = async () => {
    try {
      const companyId = companyName === '본사' || companyName.toLowerCase().includes('이지') ? 'MY-COMPANY' : `PT-${Date.now().toString().slice(-4)}`;
      const companyType = companyId === 'MY-COMPANY' ? 'MY_COMPANY' : 'PARTNER';

      const payload = {
        companyId,
        companyType,
        fiscalYear,
        fiscalQuarter,
        totalAssets,
        totalLiabilities,
        totalEquity,
        revenue,
        operatingIncome,
        netIncome,
        pdfFilePath: ocrResult?.filePath || null,
        detailedItems: detailedItemsInput
      };

      const res = await apiFetch('/api/financials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (result.success) {
        showNotification('success', '재무제표 및 AI 컨설팅 리포트 적재가 완료되었습니다.');
        setOcrResult(null);
        fetchStatements();
      } else {
        showNotification('error', result.error || '재무제표 저장에 실패했습니다.');
      }
    } catch (err) {
      showNotification('error', '저장 요청 중 네트워크 오류가 발생했습니다.');
    }
  };

  // 재무제표 소프트 삭제
  const handleDeleteStatement = async (id: string) => {
    if (!confirm('해당 재무제표 정보와 연계된 AI 보고서를 정말 삭제하시겠습니까? (소프트 삭제 처리)')) return;

    try {
      const res = await apiFetch(`/api/financials?id=${id}`, {
        method: 'DELETE'
      });

      const result = await res.json();
      if (result.success) {
        showNotification('success', '재무제표가 성공적으로 소프트 삭제되었습니다.');
        fetchStatements();
      } else {
        showNotification('error', result.error || '삭제 처리에 실패했습니다.');
      }
    } catch (err) {
      showNotification('error', '삭제 처리 중 네트워크 오류가 발생했습니다.');
    }
  };

  // 스냅태스크(SnapTask) 공유 연동
  const handleShareToSnapTask = async (stmt: FinancialStatement) => {
    if (!stmt.analysisLog) {
      showNotification('error', '공유할 AI 분석 리포트가 존재하지 않습니다.');
      return;
    }

    try {
      const res = await apiFetch('/api/easybot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `${stmt.fiscal_year}년도 AI 재무 제언 리포트를 스냅태스크에 공유해줘. 리스크 등급: ${stmt.analysisLog.risk_grade}, Z-Score: ${stmt.analysisLog.z_score}`,
          chatHistory: [],
          localStorageContext: {},
          currentUrl: '/financials'
        })
      });

      const result = await res.json();
      if (result.success) {
        showNotification('success', '재무 컨설팅 리포트가 스냅태스크로 성공적으로 공유 및 등록되었습니다.');
      } else {
        showNotification('error', '스냅태스크 공유에 실패했습니다.');
      }
    } catch (err) {
      showNotification('error', '스냅태스크 연동 중 오류가 발생했습니다.');
    }
  };

  // 상세 계정과목 추가/삭제 헬퍼
  const handleAddDetailedItem = () => {
    setDetailedItemsInput([
      ...detailedItemsInput,
      { category: 'EXPENSES', account_name: '', amount: 0 }
    ]);
  };

  const handleRemoveDetailedItem = (index: number) => {
    const updated = [...detailedItemsInput];
    updated.splice(index, 1);
    setDetailedItemsInput(updated);
  };

  const handleDetailedItemChange = (index: number, field: keyof DetailedItem, value: any) => {
    const updated = [...detailedItemsInput];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setDetailedItemsInput(updated);
  };

  const latestStmt = statements[0] || null;
  
  return (
    <div className="space-y-6 w-full min-w-0 font-sans text-slate-800 animate-fade-in pb-16" data-easybot-hint="재무 정보 AI: 국세청 재무제표 PDF를 업로드하여 회사 재무 상태와 손익을 정밀 분석하고 리스크 보고서를 제공합니다.">
      {/* 알림 토스트 */}
      {notification && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 py-3.5 px-6 rounded-2xl border shadow-xl transition-all duration-300 animate-slide-in ${
          notification.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 shadow-emerald-100/50' 
            : 'bg-rose-50 border-rose-200 text-rose-800 shadow-rose-100/50'
        }`}>
          {notification.type === 'success' ? <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />}
          <span className="text-sm font-bold">{notification.text}</span>
        </div>
      )}

      {/* 헤더 영역 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center">
            <Landmark className="w-8 h-8 text-teal-500 mr-3" />
            재무 정보 AI
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1.5 ml-11">
            Gemini Multimodal OCR을 통한 국세청 재무제표 정밀 분석 및 AI 재무 위험성(Altman Z-Score) 진단 모듈
          </p>
        </div>

        {/* 탭 컨트롤러 */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-100 shadow-inner">
          <button 
            onClick={() => setActiveTab('ledger')}
            className={`flex items-center gap-1.5 py-1.5 px-4 rounded-lg text-xs font-bold transition-all border-none cursor-pointer ${
              activeTab === 'ledger' 
                ? 'bg-white text-slate-800 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800 bg-transparent'
            }`}
          >
            <FileText className="w-4 h-4" />
            재무제표 대장
          </button>
          <button 
            onClick={() => setActiveTab('charts')}
            className={`flex items-center gap-1.5 py-1.5 px-4 rounded-lg text-xs font-bold transition-all border-none cursor-pointer ${
              activeTab === 'charts' 
                ? 'bg-white text-slate-800 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800 bg-transparent'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            재무 지표 & 차트
          </button>
          <button 
            onClick={() => setActiveTab('advisor')}
            className={`flex items-center gap-1.5 py-1.5 px-4 rounded-lg text-xs font-bold transition-all border-none cursor-pointer ${
              activeTab === 'advisor' 
                ? 'bg-white text-slate-800 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800 bg-transparent'
            }`}
          >
            <Brain className="w-4 h-4" />
            AI 리스크 진단실
          </button>
        </div>
      </div>

      {/* 탭 1: 재무제표 대장 */}
      {activeTab === 'ledger' && (
        <div className="space-y-6">
          {/* PDF 업로드 및 OCR 접수처 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-white border border-slate-100 rounded-2xl p-6 flex flex-col justify-between items-center text-center shadow-sm relative overflow-hidden group">
              <div className="absolute inset-0 bg-teal-500/3 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <div className="space-y-4 py-8">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-200 group-hover:scale-110 transition-transform duration-300">
                  <UploadCloud className="w-8 h-8 text-teal-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">재무제표 PDF 업로드</h3>
                  <p className="text-xs text-slate-500 max-w-xs mt-1 mx-auto leading-relaxed">
                    국세청 표준재무제표 PDF 파일을 업로드하면 AI가 수치 정보와 상세 계정과목을 자동 해독하여 데이터베이스에 정밀 적재합니다.
                  </p>
                </div>
              </div>

              <div className="w-full">
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handlePdfUpload}
                  accept="application/pdf"
                  className="hidden" 
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className={`w-full py-3 px-6 rounded-xl text-xs font-bold bg-slate-950 hover:bg-slate-900 text-white shadow-md transition-all border-none cursor-pointer ${
                    uploading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {uploading ? 'AI PDF 해독 중...' : 'PDF 파일 선택'}
                </button>
              </div>
            </div>

            {/* OCR 결과 임시 확인 및 적재 폼 */}
            <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                📂 OCR 검토 및 임시 입력 장부
              </h3>

              {ocrResult ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">대상 기업명</label>
                      <input 
                        type="text" 
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-500" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">회계연도</label>
                      <input 
                        type="number" 
                        value={fiscalYear}
                        onChange={(e) => setFiscalYear(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-500" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">회계 구분</label>
                      <select 
                        value={fiscalQuarter}
                        onChange={(e) => setFiscalQuarter(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-500"
                      >
                        <option value="YR">연도결산 (YR)</option>
                        <option value="Q1">1분기 (Q1)</option>
                        <option value="Q2">2분기 (Q2)</option>
                        <option value="Q3">3분기 (Q3)</option>
                        <option value="Q4">4분기 (Q4)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">업로드된 파일</label>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-500 truncate">
                        {ocrResult.filePath ? '저장 완료 (PDF 링크 연동)' : '없음'}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-4">
                    <h4 className="text-xs font-bold text-teal-600 mb-3">6대 핵심 재무 항목 (원 단위)</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {[
                        { label: '자산총계', value: totalAssets, setter: setTotalAssets },
                        { label: '부채총계', value: totalLiabilities, setter: setTotalLiabilities },
                        { label: '자본총계', value: totalEquity, setter: setTotalEquity },
                        { label: '매출액', value: revenue, setter: setRevenue },
                        { label: '영업이익', value: operatingIncome, setter: setOperatingIncome },
                        { label: '당기순이익', value: netIncome, setter: setNetIncome }
                      ].map((item, idx) => (
                        <div key={idx} className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-500">{item.label}</label>
                          <input 
                            type="number" 
                            value={item.value}
                            onChange={(e) => item.setter(Number(e.target.value))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-800 text-right focus:outline-none focus:border-teal-500" 
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-xs font-bold text-teal-600">상세 계정과목 정보</h4>
                      <button 
                        onClick={handleAddDetailedItem}
                        className="py-1 px-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-250 text-[10px] font-bold rounded-lg text-slate-700 cursor-pointer"
                      >
                        + 항목 추가
                      </button>
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                      {detailedItemsInput.map((item, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <select 
                            value={item.category}
                            onChange={(e) => handleDetailedItemChange(idx, 'category', e.target.value)}
                            className="bg-slate-50 border border-slate-100 rounded-lg py-1.5 px-2.5 text-xs text-slate-800 w-28 focus:outline-none"
                          >
                            <option value="ASSETS">자산 (ASSETS)</option>
                            <option value="LIABILITIES">부채 (LIAB)</option>
                            <option value="EQUITY">자본 (EQTY)</option>
                            <option value="REVENUE">매출 (REV)</option>
                            <option value="EXPENSES">비용 (EXP)</option>
                          </select>
                          <input 
                            type="text" 
                            placeholder="계정과목명"
                            value={item.account_name}
                            onChange={(e) => handleDetailedItemChange(idx, 'account_name', e.target.value)}
                            className="bg-slate-50 border border-slate-100 rounded-lg py-1.5 px-3 text-xs text-slate-800 flex-1 focus:outline-none" 
                          />
                          <input 
                            type="number" 
                            placeholder="금액 (원)"
                            value={item.amount}
                            onChange={(e) => handleDetailedItemChange(idx, 'amount', Number(e.target.value))}
                            className="bg-slate-50 border border-slate-100 rounded-lg py-1.5 px-3 text-xs text-slate-800 text-right w-32 focus:outline-none" 
                          />
                          <button 
                            onClick={() => handleRemoveDetailedItem(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 border-none bg-transparent cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                    <button 
                      onClick={() => setOcrResult(null)}
                      className="py-2.5 px-5 bg-slate-200 hover:bg-slate-300 rounded-xl text-xs font-bold text-slate-700 border-none cursor-pointer"
                    >
                      취소
                    </button>
                    <button 
                      onClick={handleSaveStatement}
                      className="py-2.5 px-6 bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 rounded-xl text-xs font-black text-white shadow-md border-none cursor-pointer"
                    >
                      최종 데이터 적재 & AI 분석 실행
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col justify-center items-center h-64 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-center">
                  <FileText className="w-12 h-12 mb-3 text-slate-300" />
                  <p className="text-sm font-bold text-slate-600">대기 중인 OCR 데이터가 없습니다.</p>
                  <p className="text-xs text-slate-500 max-w-xs mt-1 leading-normal">
                    왼쪽의 업로드 박스를 통해 PDF 파일을 드래그앤드롭하거나 업로드하여 기획안 해독을 실행해 주세요.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 재무제표 이력 테이블 */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-4">📜 회사별 연간 재무제표 대장</h3>
            {loading ? (
              <div className="flex flex-col justify-center items-center h-48 text-slate-400">
                <span className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mb-2" />
                <span className="text-xs font-bold">재무 목록을 로드하는 중...</span>
              </div>
            ) : statements.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <HelpCircle className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-bold text-slate-600">등록된 재무제표가 존재하지 않습니다.</p>
                <p className="text-xs text-slate-500 mt-1">상단의 파일 업로더를 통해 첫 문서를 등록해 보세요.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-4 text-center">연도</th>
                      <th className="py-3 px-4">회사명 (구분)</th>
                      <th className="py-3 px-4 text-right">자산총계</th>
                      <th className="py-3 px-4 text-right">부채총계</th>
                      <th className="py-3 px-4 text-right">자본총계</th>
                      <th className="py-3 px-4 text-right">매출액</th>
                      <th className="py-3 px-4 text-right">영업이익</th>
                      <th className="py-3 px-4 text-right">당기순이익</th>
                      <th className="py-3 px-4 text-center">AI 리스크</th>
                      <th className="py-3 px-4 text-center">조작</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {statements.map((stmt) => {
                      const isExpanded = expandedStatementId === stmt.id;
                      const hasItems = stmt.detailedItems && stmt.detailedItems.length > 0;
                      return (
                        <React.Fragment key={stmt.id}>
                          <tr className={`hover:bg-slate-50/50 transition-colors ${isExpanded ? 'bg-slate-50/30' : ''}`}>
                            <td className="py-3 px-4 text-center font-bold text-slate-900">{stmt.fiscal_year}년</td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5">
                                <button 
                                  onClick={() => setExpandedStatementId(isExpanded ? null : stmt.id)}
                                  className="p-1 hover:bg-slate-200 rounded text-slate-500 border-none bg-transparent cursor-pointer"
                                >
                                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                </button>
                                <div>
                                  <span className="font-bold text-slate-800">{stmt.company_id === 'MY-COMPANY' ? '본사 (이지데스크)' : stmt.company_id}</span>
                                  <span className="text-[10px] text-slate-400 block font-medium">
                                    {stmt.company_type === 'MY_COMPANY' ? '본사' : '거래처/관계사'} / {stmt.fiscal_quarter === 'YR' ? '결산' : stmt.fiscal_quarter}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right font-semibold text-slate-800">{stmt.total_assets.toLocaleString()}원</td>
                            <td className="py-3 px-4 text-right font-semibold text-slate-500">{stmt.total_liabilities.toLocaleString()}원</td>
                            <td className="py-3 px-4 text-right font-semibold text-teal-600">{stmt.total_equity.toLocaleString()}원</td>
                            <td className="py-3 px-4 text-right font-semibold text-indigo-600">{stmt.revenue.toLocaleString()}원</td>
                            <td className="py-3 px-4 text-right font-semibold text-emerald-600">{stmt.operating_income.toLocaleString()}원</td>
                            <td className="py-3 px-4 text-right font-semibold text-slate-800">{stmt.net_income.toLocaleString()}원</td>
                            <td className="py-3 px-4 text-center">
                              {stmt.analysisLog ? (
                                <span className={`py-1 px-2.5 rounded-full text-[10px] font-bold ${
                                  stmt.analysisLog.risk_grade === 'SAFE' 
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                    : stmt.analysisLog.risk_grade === 'WARNING' 
                                    ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                                    : 'bg-rose-50 text-rose-700 border border-rose-100'
                                }`}>
                                  {stmt.analysisLog.risk_grade === 'SAFE' ? '안전' : stmt.analysisLog.risk_grade === 'WARNING' ? '보통/주의' : '위험군'}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[10px]">미분석</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex justify-center gap-1.5">
                                {stmt.analysisLog && (
                                  <button 
                                    onClick={() => handleShareToSnapTask(stmt)}
                                    title="스냅태스크 공유"
                                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-indigo-600 rounded-lg border-none cursor-pointer"
                                  >
                                    <Share2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button 
                                  onClick={() => handleDeleteStatement(stmt.id)}
                                  title="재무 데이터 삭제"
                                  className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg border-none cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* 상세 아코디언 (계정과목 리스트) */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={10} className="bg-slate-50 p-4 border-l border-r border-slate-100">
                                <div className="space-y-4">
                                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                    <span className="font-bold text-xs text-slate-800">📋 계정과목별 상세 명세표 ({stmt.fiscal_year}년도)</span>
                                    <span className="text-[10px] text-slate-400 font-bold">소수점 제외 원화(KRW) 정수 기준</span>
                                  </div>

                                  {hasItems ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                      {/* 자산/부채/자본 */}
                                      <div className="space-y-2">
                                        <h5 className="text-[11px] font-bold text-teal-600 flex items-center gap-1">🏦 재무 상태 항목 (자산/부채/자본)</h5>
                                        <div className="bg-white rounded-2xl p-3 border border-slate-100 space-y-1.5 shadow-sm">
                                          {stmt.detailedItems
                                            ?.filter(i => ['ASSETS', 'LIABILITIES', 'EQUITY'].includes(i.category))
                                            .map((item, idx) => (
                                              <div key={idx} className="flex justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                                                <span className="text-slate-500">{item.account_name} <span className="text-[9px] text-slate-400 font-bold">({item.category})</span></span>
                                                <span className="font-bold text-slate-800">{item.amount.toLocaleString()}원</span>
                                              </div>
                                            ))}
                                        </div>
                                      </div>

                                      {/* 매출 및 지출 */}
                                      <div className="space-y-2 md:col-span-1 lg:col-span-2">
                                        <h5 className="text-[11px] font-bold text-indigo-600 flex items-center gap-1">💵 손익 계산 항목 (매출 및 주요 비용)</h5>
                                        <div className="bg-white rounded-2xl p-3 border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 shadow-sm">
                                          {stmt.detailedItems
                                            ?.filter(i => ['REVENUE', 'EXPENSES'].includes(i.category))
                                            .map((item, idx) => (
                                              <div key={idx} className="flex justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                                                <span className="text-slate-500">{item.account_name} <span className="text-[9px] text-slate-400 font-bold">({item.category === 'REVENUE' ? '매출' : '비용'})</span></span>
                                                <span className={`font-bold ${item.category === 'REVENUE' ? 'text-indigo-600' : 'text-slate-800'}`}>{item.amount.toLocaleString()}원</span>
                                              </div>
                                            ))}
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-center py-4 text-slate-400 text-xs font-semibold">
                                      적재된 상세 계정과목이 없습니다.
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 탭 2: 재무 지표 & 차트 */}
      {activeTab === 'charts' && (
        <div className="space-y-6">
          {latestStmt ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 주요 비율 카드 카드 */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                    <Activity className="w-4 h-4 text-teal-650" />
                    주요 재무 건전성 비율 ({latestStmt.fiscal_year}년 기준)
                  </h3>

                  {[
                    { 
                      name: '부채비율', 
                      desc: '자기자본 대비 타인자본(부채)의 의존도', 
                      val: latestStmt.total_equity > 0 ? (latestStmt.total_liabilities / latestStmt.total_equity) * 100 : 0,
                      guide: '200% 이하 권장 (낮을수록 안전)',
                      status: (latestStmt.total_liabilities / latestStmt.total_equity) * 100 <= 200 ? 'safe' : 'danger'
                    },
                    { 
                      name: '자기자본비율', 
                      desc: '총자산 중 내 자본(자기자본)이 차지하는 비중', 
                      val: latestStmt.total_assets > 0 ? (latestStmt.total_equity / latestStmt.total_assets) * 100 : 0,
                      guide: '30% 이상 권장 (높을수록 안전)',
                      status: (latestStmt.total_equity / latestStmt.total_assets) * 100 >= 30 ? 'safe' : 'danger'
                    },
                    { 
                      name: '영업이익률', 
                      desc: '매출액 대비 영업이익의 성과율', 
                      val: latestStmt.revenue > 0 ? (latestStmt.operating_income / latestStmt.revenue) * 100 : 0,
                      guide: '업종 평균 5% 내외 (높을수록 우수)',
                      status: (latestStmt.operating_income / latestStmt.revenue) * 100 >= 5 ? 'safe' : 'normal'
                    },
                    { 
                      name: '당기순이익률', 
                      desc: '매출 대비 최종 손익 마진율', 
                      val: latestStmt.revenue > 0 ? (latestStmt.net_income / latestStmt.revenue) * 100 : 0,
                      guide: '최종 이익 마진율 (높을수록 우수)',
                      status: (latestStmt.net_income / latestStmt.revenue) * 100 >= 3 ? 'safe' : 'normal'
                    }
                  ].map((ratio, idx) => (
                    <div key={idx} className="bg-slate-50 p-4 border border-slate-100 rounded-2xl space-y-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-xs font-bold text-slate-800">{ratio.name}</span>
                          <span className="text-[9px] text-slate-500 block font-medium">{ratio.desc}</span>
                        </div>
                        <div className="text-right">
                          <span className={`text-sm font-bold ${
                            ratio.status === 'safe' 
                              ? 'text-emerald-600' 
                              : ratio.status === 'danger' 
                              ? 'text-rose-600' 
                              : 'text-slate-600'
                          }`}>
                            {ratio.val.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      
                      {/* 프로그레스바 백그라운드 */}
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            ratio.status === 'safe' 
                              ? 'bg-gradient-to-r from-teal-500 to-emerald-400' 
                              : ratio.status === 'danger' 
                              ? 'bg-rose-500' 
                              : 'bg-indigo-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, ratio.val))}%` }}
                        />
                      </div>
                      
                      <div className="flex justify-between items-center text-[8.5px] font-bold text-slate-400">
                        <span>{ratio.guide}</span>
                        <span>{ratio.status === 'safe' ? '🟢 양호' : ratio.status === 'danger' ? '🔴 경계' : '⚪ 보통'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 자산/부채/자본 흐름 시각화 */}
              <div className="lg:col-span-2 space-y-6">
                {/* 1. 시각화 SVG 차트 */}
                <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4 shadow-sm">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-800">
                      📊 연도별 재무 상태 추이 (자산 vs 부채 vs 자본)
                    </h3>
                    <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500">
                      <div className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 bg-indigo-500 rounded-xs inline-block" />
                        <span>자산</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 bg-rose-500 rounded-xs inline-block" />
                        <span>부채</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 bg-teal-500 rounded-xs inline-block" />
                        <span>자본</span>
                      </div>
                    </div>
                  </div>

                  {/* SVG 막대 그래프 렌더링 */}
                  <div className="relative pt-2">
                    <svg viewBox="0 0 600 220" className="w-full h-auto">
                      {/* 가로축 격자선 */}
                      {[0, 0.25, 0.5, 0.75, 1].map((r, idx) => {
                        const y = 20 + (1 - r) * 160;
                        const maxAssets = Math.max(...statements.map(s => s.total_assets)) * 1.15 || 100000000;
                        const val = maxAssets * r;
                        return (
                          <g key={idx}>
                            <line x1="50" y1={y} x2="570" y2={y} stroke="#e2e8f0" strokeWidth="0.8" strokeDasharray="3,3" />
                            <text x="42" y={y + 3} textAnchor="end" fontSize="8" fill="#94a3b8" fontWeight="bold">
                              {val >= 100000000 ? `${(val / 100000000).toFixed(1)}억` : `${(val / 10000).toLocaleString()}만`}
                            </text>
                          </g>
                        );
                      })}

                      {/* 연도별 컬럼 그리기 */}
                      {statements.slice(0, 5).reverse().map((stmt, idx, arr) => {
                        const count = arr.length;
                        const blockWidth = 520 / count;
                        const xCenter = 50 + idx * blockWidth + blockWidth / 2;
                        
                        const maxAssets = Math.max(...statements.map(s => s.total_assets)) * 1.15 || 100000000;
                        const getBarHeight = (val: number) => (val / maxAssets) * 160;
                        const yBase = 180;

                        const hAssets = getBarHeight(stmt.total_assets);
                        const hLiab = getBarHeight(stmt.total_liabilities);
                        const hEq = getBarHeight(stmt.total_equity);

                        return (
                          <g key={stmt.id} className="group cursor-pointer">
                            {/* 자산 바 */}
                            <rect 
                              x={xCenter - 22} 
                              y={yBase - hAssets} 
                              width="12" 
                              height={hAssets} 
                              fill="url(#indigoGrad)" 
                              rx="3" 
                            />
                            
                            {/* 부채 바 */}
                            <rect 
                              x={xCenter - 6} 
                              y={yBase - hLiab} 
                              width="12" 
                              height={hLiab} 
                              fill="url(#roseGrad)" 
                              rx="3" 
                            />

                            {/* 자본 바 */}
                            <rect 
                              x={xCenter + 10} 
                              y={yBase - hEq} 
                              width="12" 
                              height={hEq} 
                              fill="url(#tealGrad)" 
                              rx="3" 
                            />

                            {/* 연도 표시 라벨 */}
                            <text x={xCenter} y="200" textAnchor="middle" fontSize="9" fill="#64748b" fontWeight="bold">
                              {stmt.fiscal_year}년
                            </text>

                            {/* 수치 데이터 라벨 */}
                            <text x={xCenter - 22 + 6} y={yBase - hAssets - 4} textAnchor="middle" fontSize="7" fill="#4f46e5" fontWeight="bold">
                              {stmt.total_assets >= 100000000 ? `${(stmt.total_assets / 100000000).toFixed(1)}억` : `${Math.round(stmt.total_assets / 10000)}만`}
                            </text>
                            <text x={xCenter + 10 + 6} y={yBase - hEq - 4} textAnchor="middle" fontSize="7" fill="#0d9488" fontWeight="bold">
                              {stmt.total_equity >= 100000000 ? `${(stmt.total_equity / 100000000).toFixed(1)}억` : `${Math.round(stmt.total_equity / 10000)}만`}
                            </text>
                          </g>
                        );
                      })}

                      {/* 그라디언트 정의 */}
                      <defs>
                        <linearGradient id="indigoGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#818cf8" />
                          <stop offset="100%" stopColor="#4f46e5" />
                        </linearGradient>
                        <linearGradient id="roseGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#fb7185" />
                          <stop offset="100%" stopColor="#e11d48" />
                        </linearGradient>
                        <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2dd4bf" />
                          <stop offset="100%" stopColor="#0d9488" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                </div>

                {/* 지출 상세 비용 비율 */}
                <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Percent className="w-4 h-4 text-teal-650" />
                    영업비용 상세 계정과목 점유율 분석
                  </h3>

                  {latestStmt.detailedItems && latestStmt.detailedItems.filter(i => i.category === 'EXPENSES').length > 0 ? (
                    <div className="space-y-3">
                      {latestStmt.detailedItems
                        .filter(i => i.category === 'EXPENSES')
                        .sort((a, b) => b.amount - a.amount)
                        .slice(0, 6)
                        .map((exp, idx, arr) => {
                          const totalExpenses = arr.reduce((acc, curr) => acc + curr.amount, 0);
                          const percent = totalExpenses > 0 ? (exp.amount / totalExpenses) * 100 : 0;
                          
                          const colors = [
                            'from-teal-400 to-emerald-500',
                            'from-indigo-400 to-indigo-500',
                            'from-purple-400 to-purple-500',
                            'from-cyan-400 to-cyan-500',
                            'from-amber-400 to-amber-500',
                            'from-slate-400 to-slate-500'
                          ];

                          return (
                            <div key={idx} className="space-y-1">
                              <div className="flex justify-between text-xs font-semibold">
                                <span className="text-slate-700">{exp.account_name}</span>
                                <span className="text-slate-500 font-bold">
                                  {exp.amount.toLocaleString()}원 <span className="text-[10px] text-teal-600 font-black ml-1.5">{percent.toFixed(1)}%</span>
                                </span>
                              </div>
                              <div className="w-full h-2 bg-slate-100 border border-slate-200 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full bg-gradient-to-r ${colors[idx % colors.length]}`}
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-slate-400 text-xs font-semibold">
                      분석 가능한 비용 계정과목 명세가 존재하지 않습니다.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-slate-400">
              <HelpCircle className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-bold">시각화할 재무 데이터가 부족합니다.</p>
              <p className="text-xs text-slate-500 mt-1">재무제표를 먼저 1개 이상 데이터베이스에 적재해 주세요.</p>
            </div>
          )}
        </div>
      )}

      {/* 탭 3: AI 리스크 진단실 */}
      {activeTab === 'advisor' && (
        <div className="space-y-6">
          {latestStmt && latestStmt.analysisLog ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Z-Score 게이지 보드 */}
              <div className="lg:col-span-1 bg-white border border-slate-100 rounded-2xl p-6 flex flex-col justify-between shadow-sm">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                    <Activity className="w-4 h-4 text-teal-600" />
                    Altman Z-Score 부도 예측 게이지
                  </h3>

                  {/* Z-Score 핀 포인터 가로 바 게이지 */}
                  <div className="space-y-6 py-6">
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-bold text-slate-400">경고 영역 (Z &lt; 1.8)</span>
                      <div className="text-center">
                        <span className="text-4xl font-black text-slate-900 block tracking-tight">
                          {latestStmt.analysisLog.z_score}
                        </span>
                        <span className={`text-[10px] font-bold py-0.5 px-2 rounded-full inline-block mt-1 ${
                          latestStmt.analysisLog.risk_grade === 'SAFE' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                            : latestStmt.analysisLog.risk_grade === 'WARNING' 
                            ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                            : 'bg-rose-50 text-rose-700 border border-rose-100'
                        }`}>
                          {latestStmt.analysisLog.risk_grade === 'SAFE' ? '안전 지대 (SAFE)' : latestStmt.analysisLog.risk_grade === 'WARNING' ? '회색 지대 (WARNING)' : '위험 지대 (CRITICAL)'}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">안전 영역 (Z &gt; 3.0)</span>
                    </div>

                    {/* 가로형 그라디언트 게이지 바 */}
                    <div className="relative">
                      {/* 포인터 핀 */}
                      <div 
                        className="absolute -top-3.5 transform -translate-x-1/2 flex flex-col items-center z-10 transition-all duration-700"
                        style={{ left: `${Math.min(100, Math.max(0, (latestStmt.analysisLog.z_score / 4.5) * 100))}%` }}
                      >
                        <span className="w-2.5 h-2.5 bg-white border-2 border-slate-300 rounded-full shadow-md" />
                        <span className="w-0.5 h-2.5 bg-slate-300" />
                      </div>
                      
                      {/* 삼색 영역 그라디언트 바 */}
                      <div className="w-full h-3.5 bg-gradient-to-r from-rose-500 via-amber-400 to-teal-500 rounded-full" />

                      {/* 하단 임계치 선 텍스트 */}
                      <div className="flex justify-between text-[8px] font-bold text-slate-400 mt-2 px-1">
                        <span>0.0 (부도 임계)</span>
                        <span style={{ marginLeft: '25%' }}>1.8 (회색지대 경계)</span>
                        <span style={{ marginRight: '15%' }}>3.0 (안전선)</span>
                        <span>4.5 (우량)</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 border border-slate-100 rounded-xl space-y-2 mt-4">
                  <h4 className="text-xs font-bold text-slate-800">📌 Altman Z-Score 분석법이란?</h4>
                  <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                    1968년 뉴욕대 알트만 교수가 개발한 기업 신용 위험도 측정 지표입니다. 순운전자본, 이익잉여금, 영업이익률, 재무구조 및 자산회전율의 5대 핵심 지표에 적정 가중치를 곱해 산출하며, 1.8 미만일 경우 2년 내 부도 가능성이 있는 고위험군으로 판정합니다.
                  </p>
                </div>
              </div>

              {/* AI 리스크 분석 보고서 */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-6 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <Brain className="w-32 h-32 text-indigo-500" />
                  </div>
                  
                  {/* 예측 보고서 */}
                  <div className="space-y-2.5">
                    <h3 className="text-xs font-bold text-teal-600 flex items-center gap-1.5 uppercase tracking-wide">
                      🔮 차기 회계연도 실적 및 경영 성과 예측 시나리오
                    </h3>
                    <div className="bg-slate-50 p-5 border border-slate-100 rounded-xl">
                      <p className="text-xs text-slate-700 leading-relaxed font-bold">
                        {latestStmt.analysisLog.forecast_text}
                      </p>
                    </div>
                  </div>

                  {/* 재무제안 리포트 */}
                  <div className="space-y-2.5">
                    <h3 className="text-xs font-bold text-indigo-600 flex items-center gap-1.5 uppercase tracking-wide">
                      💼 전문 재무 컨설턴트 핵심 제언 서한
                    </h3>
                    <div className="bg-slate-50 p-5 border border-slate-100 rounded-xl">
                      <p className="text-xs text-slate-700 leading-relaxed font-bold">
                        {latestStmt.analysisLog.consulting_text}
                      </p>
                    </div>
                  </div>

                  {/* 협업 도구 공유 단추 */}
                  <div className="flex justify-end pt-2">
                    <button 
                      onClick={() => handleShareToSnapTask(latestStmt)}
                      className="flex items-center gap-2 py-2.5 px-5 bg-slate-900 hover:bg-slate-800 rounded-xl text-xs font-bold text-white shadow-md transition-all border-none cursor-pointer"
                    >
                      <Share2 className="w-4 h-4" />
                      스냅태스크(SnapTask)로 재무 컨설팅 리포트 공유 🪐
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-slate-400">
              <Brain className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-bold">진단 가능한 리스크 리포트가 없습니다.</p>
              <p className="text-xs text-slate-500 mt-1">상단의 재무제표 대장에서 PDF 파일 업로드 및 AI 분석을 가동해 주세요.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
