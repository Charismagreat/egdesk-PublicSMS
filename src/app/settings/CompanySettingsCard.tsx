'use client';

import { apiFetch } from '@/lib/api';
import React, { useState, useEffect } from 'react';
import { Building2, Save, CheckCircle2, AlertCircle, RefreshCw, Sparkles, Plus } from 'lucide-react';

interface CompanyProfile {
  companyName: string;
  representative: string;
  businessNumber: string;
  address: string;
  phone: string;
  email: string;
  homepage?: string;
  sidebarMainTitle: string;
  sidebarSubTitle: string;
  sealImages?: string[];
}

export default function CompanySettingsCard() {
  const [profile, setProfile] = useState<CompanyProfile>({
    companyName: '(주)쿠스',
    representative: '차민수',
    businessNumber: '731-81-02023',
    address: '경기도 시흥시 서울대학로 59-69',
    phone: '010-7216-5884',
    email: 'chachogreat@gmail.com',
    homepage: 'https://egdesk.cloud',
    sidebarMainTitle: 'EGDESK SMS',
    sidebarSubTitle: '우리 회사 스마트 AI 시스템',
    sealImages: [],
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // AI OCR 및 드래그 앤 드롭 업로드 상태
  const [isOcrAnalyzing, setIsOcrAnalyzing] = useState<boolean>(false);
  const [fileDragOver, setFileDragOver] = useState<boolean>(false);

  // 1. 회사 정보 및 재무제표 이력 로드
  const [financials, setFinancials] = useState<any[]>([]);
  const [loadingFinancials, setLoadingFinancials] = useState<boolean>(true);
  const [isFinParsing, setIsFinParsing] = useState<boolean>(false);
  const [finDragOver, setFinDragOver] = useState<boolean>(false);
  const [tempFinData, setTempFinData] = useState<any | null>(null);

  const fetchFinancials = async () => {
    try {
      const res = await apiFetch('/api/financials?company_id=MY-COMPANY');
      const data = await res.json();
      if (data.success) {
        setFinancials(data.data || []);
      }
    } catch (err) {
      console.error('재무제표 로드 실패:', err);
    } finally {
      setLoadingFinancials(false);
    }
  };

  useEffect(() => {
    async function fetchCompanyProfile() {
      try {
        console.log('CompanySettingsCard: Fetching company profile...');
        const res = await apiFetch('/api/settings?key=my_company_profile');
        const data = await res.json();
        console.log('CompanySettingsCard: API response:', data);
        if (data.success && data.value) {
          try {
            const parsed = JSON.parse(data.value);
            console.log('CompanySettingsCard: Parsed profile:', parsed);
            setProfile({
              companyName: parsed.companyName || '(주)쿠스',
              representative: parsed.representative || '차민수',
              businessNumber: parsed.businessNumber || '731-81-02023',
              address: parsed.address || '경기도 시흥시 서울대학로 59-69',
              phone: parsed.phone || '010-7216-5884',
              email: parsed.email || 'chachogreat@gmail.com',
              homepage: (parsed.homepage !== undefined && parsed.homepage !== null) ? parsed.homepage : 'https://egdesk.cloud',
              sidebarMainTitle: parsed.sidebarMainTitle || 'EGDESK SMS',
              sidebarSubTitle: parsed.sidebarSubTitle || '우리 회사 스마트 AI 시스템',
              sealImages: parsed.sealImages || [],
            });
          } catch (e) {
            console.error('회사 프로필 JSON 파싱 에러:', e);
          }
        } else if (data.success && !data.value) {
          // DB가 비어있는 경우 디폴트 본사 정보를 자동으로 DB 세팅 연동 적재
          const defaultVal = {
            companyName: '(주)쿠스',
            representative: '차민수',
            businessNumber: '731-81-02023',
            address: '경기도 시흥시 서울대학로 59-69',
            phone: '010-7216-5884',
            email: 'chachogreat@gmail.com',
            homepage: 'https://egdesk.cloud',
            sidebarMainTitle: 'EGDESK SMS',
            sidebarSubTitle: '우리 회사 스마트 AI 시스템',
            sealImages: [],
          };
          setProfile(defaultVal);
          
          // 백그라운드 백엔드 캐시/DB 동기화
          apiFetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: 'my_company_profile', value: JSON.stringify(defaultVal) })
          }).catch(err => console.error('디폴트 회사 프로필 자동 적재 실패:', err));
        }
      } catch (err) {
        console.error('회사 정보 로드 실패:', err);
        setMessage({ type: 'error', text: '우리 회사 설정을 로드하지 못했습니다.' });
      } finally {
        setLoading(false);
      }
    }
    fetchCompanyProfile();
    fetchFinancials();
  }, []);

  // 2. 사업자등록증 파일 업로드 및 AI 스캔 연동
  const handleFileUpload = async (fileObj: File) => {
    if (!fileObj) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(fileObj.type)) {
      alert('⚠️ 지원되지 않는 파일 포맷입니다. 사업자등록증 사진(JPG, PNG) 또는 PDF 문서만 업로드해 주세요.');
      return;
    }

    setIsOcrAnalyzing(true);
    setMessage(null);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64Data = e.target?.result as string;
          
          // 백엔드 AI OCR API 호출 (crm_partners OCR과 동일 엔드포인트 공용 활용)
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

          // 폼 필드 자동 입력 (기존 입력 유지하며 덮어쓰기 보완)
          setProfile(prev => ({
            ...prev,
            companyName: ocrData.companyName || prev.companyName,
            representative: ocrData.representative || prev.representative,
            businessNumber: (ocrData.businessNumber || '').replace(/\D/g, '') || prev.businessNumber,
            address: ocrData.address || prev.address,
            phone: ocrData.phone || prev.phone,
            email: ocrData.email || prev.email,
          }));

          setMessage({ type: 'success', text: 'AI가 사업자등록증을 분석하여 본사 정보를 양식에 자동 입력했습니다! ⚡' });
          setTimeout(() => setMessage(null), 5000);
        } catch (innerErr: any) {
          console.error('본사 OCR 분석 콜백 에러:', innerErr);
          setMessage({ type: 'error', text: innerErr.message || '사업자등록증 분석에 실패했습니다.' });
        } finally {
          setIsOcrAnalyzing(false);
        }
      };

      reader.readAsDataURL(fileObj);

    } catch (err: any) {
      console.error('본사 OCR 파일 읽기 에러:', err);
      setMessage({ type: 'error', text: err.message || '파일 처리 중 오류가 발생했습니다.' });
      setIsOcrAnalyzing(false);
    }
  };

  // 3. 회사 정보 저장
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    // 사업자등록번호 형식 유효성 체크
    const bizNoClean = profile.businessNumber.replace(/[^0-9]/g, '');
    if (profile.businessNumber && bizNoClean.length !== 10) {
      setMessage({ type: 'error', text: '사업자등록번호는 하이픈 제외 10자리 숫자여야 합니다.' });
      setSaving(false);
      return;
    }

    try {
      const res = await apiFetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'my_company_profile',
          value: JSON.stringify(profile),
        }),
      });

      const data = await res.json();
      if (data.success) {
        // AI RAG 검색 시 활용되도록 개별 Key로도 보관 (하위 호환 및 RAG 쿼리 정교화 목적)
        await apiFetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'company_name', value: profile.companyName }),
        });
        await apiFetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'company_business_number', value: profile.businessNumber }),
        });

        setMessage({ type: 'success', text: '우리 회사(본사) 정보가 안전하게 영속 저장되었습니다. 🟢' });
        setTimeout(() => {
          setMessage(null);
          window.location.reload(); // 사이드바 실시간 동기화를 위해 화면 강제 새로고침
        }, 1500);
      } else {
        setMessage({ type: 'error', text: data.error || '저장에 실패했습니다.' });
      }
    } catch (err: any) {
      console.error('회사 정보 저장 에러:', err);
      setMessage({ type: 'error', text: '서버 연동 중 네트워크 오류가 발생했습니다.' });
    } finally {
      setSaving(false);
    }
  };

  // 재무제표 PDF 자율 업로드 및 AI 판독 실행
  const handleFinPdfUpload = async (fileObj: File) => {
    if (!fileObj) return;
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
        company_id: 'MY-COMPANY',
        company_type: 'MY_COMPANY',
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
      
      setMessage({ type: 'success', text: 'AI가 재무제표 분석을 성공적으로 마쳤습니다! 하단 검토 양식을 확인 후 저장해 주세요.' });
    } catch (err: any) {
      console.error('재무 PDF 파싱 에러:', err);
      setMessage({ type: 'error', text: err.message || '재무제표 판독 중 오류가 발생했습니다.' });
    } finally {
      setIsFinParsing(false);
    }
  };

  // 파싱된 임시 재무 데이터 수정 핸들러
  const handleTempFinDataChange = (field: string, value: number) => {
    if (!tempFinData) return;
    setTempFinData((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  // 재무 데이터 DB 최종 승인 및 적재
  const handleSaveFinancials = async () => {
    if (!tempFinData) return;
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
        fetchFinancials();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      alert(err.message || '저장 중 오류가 발생했습니다.');
    }
  };

  // 재무제표 레코드 삭제
  const handleDeleteFinancials = async (id: string) => {
    if (!confirm('정말로 해당 재무제표를 영구 삭제하시겠습니까? 첨부된 PDF 문서 파일도 디스크에서 함께 소멸됩니다.')) return;
    try {
      const res = await apiFetch(`/api/financials?id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: '재무제표 데이터가 성공적으로 파괴되었습니다.' });
        fetchFinancials();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      alert(err.message || '삭제 중 오류가 발생했습니다.');
    }
  };

  const handleInputChange = (field: keyof CompanyProfile, value: string) => {
    setProfile((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // 사업자번호 하이픈 자동 포맷팅 헬퍼
  const formatBusinessNumber = (value: string) => {
    const clean = value.replace(/[^0-9]/g, '');
    if (clean.length <= 3) return clean;
    if (clean.length <= 5) return `${clean.slice(0, 3)}-${clean.slice(3)}`;
    return `${clean.slice(0, 3)}-${clean.slice(3, 5)}-${clean.slice(5, 10)}`;
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin mr-2" />
        <span className="text-slate-500 font-semibold text-sm">우리 회사(본사) 설정 정보를 동기화하는 중...</span>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
      
      {/* 카드 헤더 */}
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-indigo-50/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100 shadow-sm shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-[16px] font-bold text-slate-800 flex items-center gap-2">
              우리 회사 (본사) 정보 설정
              <span className="text-[10px] font-extrabold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-100">
                보안 식별 가드
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">시스템을 사용하는 관리자님의 본사 정보를 등록하여 외부 바이어/고객 식별 및 AI 분석 시 활용합니다.</p>
          </div>
        </div>
        <span className="text-xs bg-slate-100 text-slate-600 font-bold px-2.5 py-1 rounded-full border border-slate-250/30">
          시스템 연동
        </span>
      </div>

      {/* 설정 폼 */}
      <form onSubmit={handleSave} className="p-6 space-y-6">

        {/* 🛠️ AI 본사 사업자등록증 자동 완성 업로더 드롭존 */}
        <div className="bg-slate-50/50 border border-slate-100 p-4.5 rounded-2xl space-y-3 shrink-0">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
            우리 회사 사업자등록증 자동 스냅 채우기 (AI OCR)
          </span>

          {isOcrAnalyzing ? (
            <div className="border border-indigo-200 bg-indigo-50/20 rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-3 animate-pulse relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-indigo-500 to-cyan-400 animate-shimmer"></div>
              <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
              <div>
                <span className="text-xs font-black text-slate-700 block">AI 엔진이 본사 사업자등록증 문서를 스캔 중입니다...</span>
                <span className="text-[10px] text-slate-400 font-bold block mt-1">상호, 대표자명, 주소, 번호를 고해상도로 판독하여 폼에 자동 입력합니다.</span>
              </div>
            </div>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setFileDragOver(true); }}
              onDragLeave={() => setFileDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setFileDragOver(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileUpload(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => document.getElementById('company-license-uploader')?.click()}
              className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                fileDragOver
                  ? 'border-indigo-500 bg-indigo-50/30'
                  : 'border-slate-200 hover:border-indigo-350 hover:bg-slate-50/50'
              }`}
            >
              <Building2 className="w-6 h-6 text-slate-400 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-black text-slate-700 block">이곳에 본사 사업자등록증 파일(이미지/PDF) 드롭 또는 클릭 업로드</span>
              <span className="text-[9px] text-slate-400 font-semibold block mt-1.5">
                지원 포맷: JPG, PNG, PDF (Gemini AI 자동 필드 주입)
              </span>
              <input
                type="file"
                id="company-license-uploader"
                accept="image/*,application/pdf"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
                className="hidden"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
          
          {/* 1. 회사명 */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-extrabold text-slate-700">우리 회사명 (상호)</label>
            <input
              type="text"
              placeholder="예: (주)이지데스크"
              value={profile.companyName}
              onChange={(e) => handleInputChange('companyName', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white text-slate-800 placeholder-slate-400 transition-all font-semibold"
              required
            />
          </div>

          {/* 2. 대표자명 */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-extrabold text-slate-700">대표자 성함</label>
            <input
              type="text"
              placeholder="예: 홍길동"
              value={profile.representative}
              onChange={(e) => handleInputChange('representative', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white text-slate-800 placeholder-slate-400 transition-all font-semibold"
            />
          </div>

          {/* 3. 사업자등록번호 */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-extrabold text-slate-700">사업자등록번호</label>
            <input
              type="text"
              placeholder="000-00-00000"
              value={profile.businessNumber}
              onChange={(e) => handleInputChange('businessNumber', formatBusinessNumber(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white text-slate-800 placeholder-slate-400 transition-all font-mono font-bold"
            />
          </div>

          {/* 4. 대표 전화번호 */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-extrabold text-slate-700">대표 전화번호</label>
            <input
              type="text"
              placeholder="예: 02-1234-5678"
              value={profile.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white text-slate-800 placeholder-slate-400 transition-all font-semibold"
            />
          </div>

          {/* 5. 대표 이메일 */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-extrabold text-slate-700">대표 이메일 주소</label>
            <input
              type="email"
              placeholder="예: contact@egdesk.cloud"
              value={profile.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white text-slate-800 placeholder-slate-400 transition-all font-semibold"
            />
          </div>

          {/* 5-0. 회사 홈페이지 주소 */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-extrabold text-slate-700">회사 홈페이지 주소</label>
            <input
              type="text"
              placeholder="예: https://www.egdesk.cloud"
              value={profile.homepage || ''}
              onChange={(e) => handleInputChange('homepage', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white text-slate-800 placeholder-slate-400 transition-all font-semibold"
            />
          </div>

          {/* 5-1. 사이드바 메인 타이틀 설정 */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-extrabold text-slate-700">사이드바 메인 타이틀 (줄바꿈 방지 12자 제한)</label>
            <input
              type="text"
              placeholder="예: EGDESK SMS"
              value={profile.sidebarMainTitle}
              onChange={(e) => handleInputChange('sidebarMainTitle', e.target.value)}
              maxLength={12}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white text-slate-800 placeholder-slate-400 transition-all font-semibold"
            />
          </div>

          {/* 5-2. 사이드바 서브 타이틀 설정 */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-extrabold text-slate-700">사이드바 서브 타이틀 (줄바꿈 방지 24자 제한)</label>
            <input
              type="text"
              placeholder="예: 평생 무료 문자 발송 시스템"
              value={profile.sidebarSubTitle}
              onChange={(e) => handleInputChange('sidebarSubTitle', e.target.value)}
              maxLength={24}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white text-slate-800 placeholder-slate-400 transition-all font-semibold"
            />
          </div>

          {/* 6. 본점 소재지 주소 */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="block text-[11px] font-extrabold text-slate-700">본점 소재지 주소</label>
            <input
              type="text"
              placeholder="예: 서울특별시 마포구 백범로 31"
              value={profile.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white text-slate-800 placeholder-slate-400 transition-all font-semibold"
            />
          </div>

        </div>

        {/* 🏢 회사 도장 이미지 관리 (최대 3개) */}
        <div className="bg-slate-50/50 border border-slate-100 p-4.5 rounded-2xl space-y-3 shrink-0">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
            회사 도장 이미지 관리 (배경이 투명한 PNG만 가능, 최대 3개)
          </span>
          
          <div className="flex flex-wrap gap-4 items-center">
            {/* 업로드된 도장 썸네일 표시 */}
            {(profile.sealImages || []).map((seal, idx) => (
              <div key={idx} className="relative w-20 h-20 border border-slate-200 bg-slate-100/50 rounded-xl flex items-center justify-center group overflow-hidden shadow-sm">
                <img src={seal} alt={`회사 도장 ${idx + 1}`} className="max-w-[85%] max-h-[85%] object-contain" />
                <button
                  type="button"
                  onClick={() => {
                    const newSeals = [...(profile.sealImages || [])];
                    newSeals.splice(idx, 1);
                    setProfile({ ...profile, sealImages: newSeals });
                  }}
                  className="absolute inset-0 bg-slate-900/60 text-white font-extrabold text-[10px] items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity flex cursor-pointer"
                >
                  삭제
                </button>
              </div>
            ))}

            {/* 업로드 버튼 */}
            {(!profile.sealImages || profile.sealImages.length < 3) && (
              <div
                onClick={() => document.getElementById('company-seal-uploader')?.click()}
                className="w-20 h-20 border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-white rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-colors group"
                title="도장 업로드"
              >
                <Plus className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                <span className="text-[8px] text-slate-400 font-bold mt-1.5">PNG 업로드</span>
                <input
                  type="file"
                  id="company-seal-uploader"
                  accept="image/png"
                  onChange={async (e) => {
                    if (e.target.files && e.target.files[0]) {
                      const file = e.target.files[0];
                      if (file.type !== 'image/png') {
                        alert('⚠️ 배경이 투명한 PNG 형식의 도장 파일만 등록할 수 있습니다.');
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        const base64 = ev.target?.result as string;
                        const currentSeals = profile.sealImages || [];
                        setProfile({
                          ...profile,
                          sealImages: [...currentSeals, base64]
                        });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="hidden"
                />
              </div>
            )}
          </div>
          <span className="text-[9px] text-slate-400 font-semibold block leading-relaxed">
            ※ 배경 투명화 처리가 완료된 PNG 형태의 도장(직인) 이미지를 업로드해 주세요. 뉴 양식관리 AI 에디터에서 선택하여 양식에 바로 삽입할 수 있습니다.
          </span>
        </div>

        {/* 저장 알림 메시지 */}
        {message && (
          <div
            className={`flex items-center gap-2 p-3.5 rounded-xl border text-xs font-semibold ${
              message.type === 'success'
                ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                : 'bg-rose-50 border-rose-100 text-rose-700'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* 저장 버튼 */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-bold transition-all border-0 shadow-md ${
              saving
                ? 'bg-slate-350 text-slate-500 cursor-not-allowed'
                : 'bg-slate-900 text-white hover:bg-slate-800 active:scale-95 cursor-pointer shadow-slate-900/10'
            }`}
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>본사 정보 변경</span>
          </button>
        </div>

      </form>

      {/* 📊 본사 재무제표 AI 관리 패널 */}
      <div className="border-t border-slate-100 bg-slate-50/20 p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 border border-purple-100 shadow-sm shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
          </div>
          <div>
            <h3 className="text-[16px] font-bold text-slate-800 flex items-center gap-2">
              본사 국세청 재무제표 AI 관리
              <span className="text-[10px] font-extrabold bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full border border-purple-100">
                정책자금 & 이지봇 분석
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">국세청 재무제표 PDF를 업로드하면 AI가 수치를 자동 해독하여 DB에 적재하며, 이지봇(EasyBot)을 통해 실시간 자금 비율 분석이 가능해집니다.</p>
          </div>
        </div>

        {/* 재무제표 PDF 드롭존 */}
        {isFinParsing ? (
          <div className="border border-purple-200 bg-purple-50/20 rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-3 animate-pulse relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple-400 via-pink-500 to-indigo-400 animate-shimmer"></div>
            <RefreshCw className="w-8 h-8 text-purple-500 animate-spin" />
            <div>
              <span className="text-xs font-black text-slate-700 block">AI 엔진이 국세청 결산 보고서 PDF를 정밀 분석하는 중입니다...</span>
              <span className="text-[10px] text-slate-400 font-bold block mt-1">6대 주요 지표(자산, 부채, 자본, 매출, 영업이익, 순이익)를 원 단위로 자동 환산하여 추출합니다.</span>
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
            onClick={() => document.getElementById('company-fin-uploader')?.click()}
            className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
              finDragOver
                ? 'border-purple-500 bg-purple-50/30'
                : 'border-slate-200 hover:border-purple-350 hover:bg-slate-50/50'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-slate-400 mb-2"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M9 15h6"/><path d="M9 18h6"/><path d="M9 12h3"/></svg>
            <span className="text-xs font-black text-slate-700 block">이곳에 본사 국세청 재무제표 PDF 파일 드롭 또는 클릭 업로드</span>
            <span className="text-[9px] text-slate-400 font-semibold block mt-1.5">
              지원 포맷: PDF 형식 (Gemini AI 자동 재무 분석 적재)
            </span>
            <input
              type="file"
              id="company-fin-uploader"
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

        {/* 파싱 결과 검토 및 수정 폼 */}
        {tempFinData && (
          <div className="bg-purple-50/10 border border-purple-100/70 p-5 rounded-2xl space-y-4 animate-fade-in text-xs font-semibold">
            <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest block flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-500 animate-pulse" />
              AI 재무 분석 검토 양식 (최종 확인 후 저장해주세요)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500">회계 연도 (Year)</label>
                <input
                  type="number"
                  value={tempFinData.fiscal_year}
                  onChange={(e) => handleTempFinDataChange('fiscal_year', Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-800 font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500">자산 총계 (원)</label>
                <input
                  type="number"
                  value={tempFinData.total_assets}
                  onChange={(e) => handleTempFinDataChange('total_assets', Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-800 font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500">부채 총계 (원)</label>
                <input
                  type="number"
                  value={tempFinData.total_liabilities}
                  onChange={(e) => handleTempFinDataChange('total_liabilities', Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-800 font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500">자본 총계 (원)</label>
                <input
                  type="number"
                  value={tempFinData.total_equity}
                  onChange={(e) => handleTempFinDataChange('total_equity', Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-800 font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500">매출액 (원)</label>
                <input
                  type="number"
                  value={tempFinData.revenue}
                  onChange={(e) => handleTempFinDataChange('revenue', Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-800 font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500">영업이익 (원)</label>
                <input
                  type="number"
                  value={tempFinData.operating_income}
                  onChange={(e) => handleTempFinDataChange('operating_income', Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-800 font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500">당기순이익 (원)</label>
                <input
                  type="number"
                  value={tempFinData.net_income}
                  onChange={(e) => handleTempFinDataChange('net_income', Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-800 font-bold"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTempFinData(null)}
                className="px-3.5 py-2 rounded-lg border border-slate-200 text-slate-650 hover:bg-slate-100 font-bold transition-all cursor-pointer"
              >
                파싱 취소
              </button>
              <button
                type="button"
                onClick={handleSaveFinancials}
                className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 shadow-md shadow-purple-500/10 font-bold transition-all cursor-pointer"
              >
                검토 완료 및 저장
              </button>
            </div>
          </div>
        )}

        {/* 등록된 재무제표 대장 테이블 */}
        <div className="space-y-3">
          <span className="text-[10px] font-bold text-slate-400 tracking-wider block">등록된 본사 연도별 재무제표 내역</span>
          {loadingFinancials ? (
            <div className="text-center py-6 text-slate-400 font-semibold text-xs animate-pulse">
              재무 제표 이력을 동기화하는 중...
            </div>
          ) : (!Array.isArray(financials) || financials.length === 0) ? (
            <div className="border border-slate-150 border-dashed rounded-xl p-8 text-center text-slate-400 font-semibold text-xs bg-slate-50/30">
              등록된 본사 재무제표가 없습니다. 위 PDF 업로더를 통해 국세청 문서를 업로드해 주세요.
            </div>
          ) : (
            <div className="border border-slate-150 rounded-xl overflow-hidden bg-white shadow-sm shrink-0">
              <table className="w-full text-[11px] font-semibold text-slate-700 text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="p-3">연도</th>
                    <th className="p-3">매출액</th>
                    <th className="p-3">영업이익</th>
                    <th className="p-3">자산총계</th>
                    <th className="p-3">부채 / 자본 비율</th>
                    <th className="p-3">원본</th>
                    <th className="p-3 text-center">작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {financials.map((fin) => {
                    const revStr = (fin.revenue || 0).toLocaleString();
                    const opStr = (fin.operating_income || 0).toLocaleString();
                    const assetStr = (fin.total_assets || 0).toLocaleString();
                    const liabStr = (fin.total_liabilities || 0).toLocaleString();
                    const eqStr = (fin.total_equity || 0).toLocaleString();
                    
                    // 재무 비율 계산
                    const opMargin = fin.revenue ? ((fin.operating_income / fin.revenue) * 100).toFixed(1) : '0.0';
                    const debtRatio = fin.total_equity ? ((fin.total_liabilities / fin.total_equity) * 100).toFixed(1) : '0.0';

                    return (
                      <tr key={fin.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3 font-bold text-slate-900">{fin.fiscal_year}년</td>
                        <td className="p-3">
                          <div>{revStr}원</div>
                          <span className="text-[9px] font-extrabold bg-emerald-50 text-emerald-600 px-1 py-0.5 rounded border border-emerald-100 mt-0.5 inline-block">
                            이익률 {opMargin}%
                          </span>
                        </td>
                        <td className="p-3">
                          <div className={fin.operating_income < 0 ? 'text-rose-600' : 'text-slate-700'}>{opStr}원</div>
                        </td>
                        <td className="p-3">{assetStr}원</td>
                        <td className="p-3">
                          <div className="text-slate-400 text-[10px]">부채 {liabStr}원 / 자본 {eqStr}원</div>
                          <span className={`text-[9px] font-extrabold px-1 py-0.5 rounded border mt-0.5 inline-block ${
                            Number(debtRatio) > 200 
                              ? 'bg-rose-50 border-rose-100 text-rose-600'
                              : 'bg-indigo-50 border-indigo-100 text-indigo-600'
                          }`}>
                            부채비율 {debtRatio}%
                          </span>
                        </td>
                        <td className="p-3">
                          {fin.pdf_file_path ? (
                            <a
                              href={fin.pdf_file_path}
                              target="_blank"
                              rel="noreferrer"
                              className="text-purple-600 hover:text-purple-700 hover:underline flex items-center gap-1 font-bold"
                            >
                              PDF 📄
                            </a>
                          ) : '-'}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteFinancials(fin.id)}
                            className="text-rose-500 hover:text-rose-700 font-bold transition-all p-1 hover:bg-rose-50 rounded"
                          >
                            삭제
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
    </div>
  );
}
