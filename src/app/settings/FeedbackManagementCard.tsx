'use client';

export const dynamic = 'force-dynamic';

import { apiFetch } from '@/lib/api';
import React, { useState, useEffect } from 'react';
import { MessageSquare, AlertCircle, Sparkles, CheckCircle2, Eye, EyeOff, Search, RefreshCw, ChevronRight, ShieldAlert, Send, X, AlertTriangle, Mail, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface FeedbackItem {
  id: string;
  user_prompt: string;
  detected_type: 'bug' | 'feature_request' | 'complaint' | 'other';
  current_url: string;
  resolved_status: 'pending' | 'in_progress' | 'resolved' | 'ignored';
  created_at: string;
}

export default function FeedbackManagementCard() {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // 필터 상태
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // 페이지네이션 상태 추가
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 10;

  // 다중 선택 상태
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // 1. 외부 메신저 채널 전송 모달 상태
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['egdesk_cloud', 'kakaotalk']); // 기본값은 개발사 웹사이트 및 카카오톡
  const [exportComment, setExportComment] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportResults, setExportResults] = useState<any[] | null>(null);

  // 2. AI 이메일 사전 문의 모달 상태 추가
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [generatingEmail, setGeneratingEmail] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSendResult, setEmailSendResult] = useState<string | null>(null);

  const fetchFeedbacks = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch(`/api/settings/feedback?page=${currentPage}&limit=${limit}&type=${typeFilter}&status=${statusFilter}&search=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      if (data.success) {
        setFeedbacks(data.feedbacks || []);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.totalCount || 0);
      } else {
        setError(data.error || '피드백 목록을 가져오지 못했습니다.');
      }
    } catch (err: any) {
      setError(err.message || '네트워크 통신 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
      setSelectedIds([]); // 목록 갱신 시 다중 선택 초기화
    }
  };

  // 🗑️ 선택된 다중 피드백 일괄 삭제
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`선택한 ${selectedIds.length}개의 피드백을 영구 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    try {
      const response = await apiFetch('/api/settings/feedback', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds })
      });
      const data = await response.json();
      if (data.success) {
        alert(data.message || '성공적으로 삭제되었습니다. 🟢');
        setSelectedIds([]);
        fetchFeedbacks();
      } else {
        alert(data.error || '삭제 처리에 실패했습니다.');
      }
    } catch (err: any) {
      alert('삭제 중 통신 오류: ' + err.message);
    }
  };

  // 🗑️ 단일 피드백 삭제
  const handleSingleDelete = async (id: string) => {
    if (!confirm('본 피드백을 영구 삭제하시겠습니까?')) return;

    try {
      const response = await apiFetch('/api/settings/feedback', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] })
      });
      const data = await response.json();
      if (data.success) {
        fetchFeedbacks();
      } else {
        alert(data.error || '삭제 실패');
      }
    } catch (err: any) {
      alert('통신 오류: ' + err.message);
    }
  };

  // 필터 및 검색어 변경 시 페이지를 1페이지로 리셋하고 즉시 fetch 실행
  useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter, statusFilter, searchQuery]);

  // 페이지 또는 검색/필터 조건 바인딩 후 최종 fetch 호출
  useEffect(() => {
    fetchFeedbacks();
  }, [currentPage, typeFilter, statusFilter, searchQuery]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const response = await apiFetch('/api/settings/feedback', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, resolved_status: newStatus }),
      });
      const data = await response.json();
      if (data.success) {
        // 상태값 로컬 즉시 갱신 (Optimistic Update)
        setFeedbacks(prev =>
          prev.map(item => (item.id === id ? { ...item, resolved_status: newStatus as any } : item))
        );
      } else {
        alert(data.error || '피드백 상태 수정 실패');
      }
    } catch (err: any) {
      alert('상태 갱신 실패: ' + err.message);
    }
  };

  // URL별 친근한 메뉴 한글명 매핑 헬퍼
  const getPageName = (url: string) => {
    const pageNames: Record<string, string> = {
      "/": "대시보드",
      "/sms": "무료 문자 발송 AI",
      "/message-logs": "발송 내역 조회",
      "/automation": "자동 발송 설정",
      "/customers": "고객 관리 AI",
      "/partners": "거래처 관리 AI",
      "/transactions": "거래 관리 AI",
      "/orders": "주문 관리 AI",
      "/payments": "결제 관리 AI",
      "/finance": "금융 정보 AI",
      "/coupons": "쿠폰 관리 AI",
      "/reservations": "예약 관리 AI",
      "/deliveries": "배송 관리 AI",
      "/products": "상품 관리 AI",
      "/estimates": "견적/발주/수주 AI",
      "/snaptasks": "AI 스냅태스크",
      "/inventory": "재고 관리 AI",
      "/expenses": "지출 관리 AI",
      "/price-tracker": "가격 추적 AI",
      "/website": "홈페이지 빌더 AI",
      "/recruitment": "채용 매니저 AI",
      "/instagram": "인스타그램 마케팅 AI",
      "/naver-blog": "N-BLOG 포스팅 AI",
      "/youtube-shorts": "YOUTUBE 쇼츠 AI",
      "/ai-briefing": "AI 브리핑",
      "/operators": "직원 관리",
      "/my-db": "MY DB",
      "/help": "Q&A 헬프센터",
      "/settings": "시스템 설정"
    };
    return pageNames[url] || url;
  };

  // 개별 체크박스 토글
  const handleSelectToggle = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // 전체 선택/해제 토글
  const handleSelectAllToggle = () => {
    if (selectedIds.length === feedbacks.length) {
      setSelectedIds([]); // 전체 선택된 상태라면 모두 해제
    } else {
      setSelectedIds(feedbacks.map(item => item.id)); // 필터링된 모든 항목 선택
    }
  };

  // 채널 체크박스 토글
  const handleChannelToggle = (channel: string) => {
    setSelectedChannels(prev =>
      prev.includes(channel) ? prev.filter(c => c !== channel) : [...prev, channel]
    );
  };

  // 다중 채널 전송 실행
  const handleExportSubmit = async () => {
    if (selectedChannels.length === 0) {
      alert('전송할 채널을 1개 이상 선택해 주세요.');
      return;
    }
    
    setExporting(true);
    setExportResults(null);
    
    try {
      const response = await apiFetch('/api/settings/feedback/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedbackIds: selectedIds,
          channels: selectedChannels,
          comment: exportComment
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setExportResults(data.results);
        // 성공 시 2초 후 닫기
        setTimeout(() => {
          setIsExportModalOpen(false);
          setExportComment('');
          setSelectedIds([]);
          setExportResults(null);
          fetchFeedbacks(); // 상태 갱신
        }, 2000);
      } else {
        alert(data.error || '피드백 전송 과정 중 오류가 발생했습니다.');
      }
    } catch (err: any) {
      alert('네트워크 전송 오류: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  // 1. AI 이메일 초안 생성 기능 호출
  const handleEmailDraftGenerate = async (ids: string[]) => {
    setGeneratingEmail(true);
    setEmailSendResult(null);
    setEmailSubject('');
    setEmailBody('');
    
    try {
      const response = await apiFetch('/api/settings/feedback/email/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedbackIds: ids })
      });
      
      const data = await response.json();
      if (data.success) {
        setEmailSubject(data.subject);
        setEmailBody(data.body);
      } else {
        alert(data.error || 'AI 이메일 초안을 생성하지 못했습니다.');
        setIsEmailModalOpen(false);
      }
    } catch (err: any) {
      alert('이메일 초안 생성 통신 오류: ' + err.message);
      setIsEmailModalOpen(false);
    } finally {
      setGeneratingEmail(false);
    }
  };

  // 2. 이메일 실제 발송 / 시뮬레이션 전송 실행
  const handleEmailSendSubmit = async () => {
    if (!emailSubject.trim() || !emailBody.trim()) {
      alert('이메일 제목과 본문 내용을 모두 채워 주세요.');
      return;
    }

    setSendingEmail(true);
    setEmailSendResult(null);

    try {
      const response = await apiFetch('/api/settings/feedback/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: emailSubject,
          body: emailBody,
          feedbackIds: selectedIds
        })
      });

      const data = await response.json();
      if (data.success) {
        setEmailSendResult(data.message);
        // 성공 시 2초 지연 후 모달 닫기 및 갱신
        setTimeout(() => {
          setIsEmailModalOpen(false);
          setSelectedIds([]);
          setEmailSubject('');
          setEmailBody('');
          setEmailSendResult(null);
          fetchFeedbacks();
        }, 2200);
      } else {
        alert(data.error || '이메일 발송 실행 오류');
      }
    } catch (err: any) {
      alert('이메일 발송 통신 오류: ' + err.message);
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="relative bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden transition-all duration-300">
      
      {/* 카드 헤더 (Harmonic Indigo 그라데이션) */}
      <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-slate-50 to-indigo-50/20">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500 text-white shadow-sm shrink-0">
            <MessageSquare size={20} />
          </div>
          <div>
            <h3 className="text-[16px] font-bold text-slate-800 flex items-center gap-2">
              이지봇 실시간 피드백 보드
              <span className="text-[10px] font-extrabold bg-indigo-550/10 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-100">
                수집 자동화
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">사용자들이 이지봇을 통해 제보한 실시간 버그 및 기능 건의 사항을 파악하고 처리 상태를 관리합니다.</p>
          </div>
        </div>

        {/* 새로고침 버튼 */}
        <button
          onClick={fetchFeedbacks}
          disabled={loading}
          className="self-start md:self-auto flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          새로고침
        </button>
      </div>

      {/* 내부 컨트롤 필터바 */}
      <div className="p-6 border-b border-slate-100 bg-slate-50/40 flex flex-col gap-4">
        {/* 검색창 */}
        <div className="relative w-full md:max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-450" />
          <input
            type="text"
            placeholder="제보 내용 또는 접수 메뉴 검색..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white placeholder-slate-400 text-slate-700 transition-all"
          />
        </div>

        {/* 유형 및 상태 필터 칩 */}
        <div className="flex flex-wrap items-center gap-6 text-xs">
          {/* 유형 필터 */}
          <div className="flex items-center gap-2">
            <span className="text-slate-450 font-bold shrink-0">제보 유형</span>
            <div className="flex gap-1.5 overflow-x-auto pb-1 md:pb-0">
              {[
                { key: 'all', label: '전체' },
                { key: 'bug', label: '🐛 버그 제보' },
                { key: 'feature_request', label: '💡 기능 건의' },
                { key: 'complaint', label: '🔥 불만 사항' },
                { key: 'other', label: '기타' }
              ].map(chip => (
                <button
                  key={chip.key}
                  onClick={() => setTypeFilter(chip.key)}
                  className={`px-2.5 py-1.5 rounded-lg border font-semibold transition-all text-[11px] shrink-0 ${
                    typeFilter === chip.key
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* 상태 필터 */}
          <div className="flex items-center gap-2">
            <span className="text-slate-450 font-bold shrink-0">처리 상태</span>
            <div className="flex gap-1.5 overflow-x-auto pb-1 md:pb-0">
              {[
                { key: 'all', label: '전체' },
                { key: 'pending', label: '대기 중' },
                { key: 'in_progress', label: '처리 중' },
                { key: 'resolved', label: '해결 완료' },
                { key: 'ignored', label: '보류/기타' }
              ].map(chip => (
                <button
                  key={chip.key}
                  onClick={() => setStatusFilter(chip.key)}
                  className={`px-2.5 py-1.5 rounded-lg border font-semibold transition-all text-[11px] shrink-0 ${
                    statusFilter === chip.key
                      ? 'bg-slate-700 border-slate-700 text-white shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 피드백 본문 리스트 영역 */}
      <div className="p-6">
        {loading ? (
          <div className="py-16 text-center text-slate-450 flex flex-col items-center gap-3">
            <RefreshCw size={24} className="animate-spin text-indigo-500" />
            <span className="text-xs font-semibold">피드백 데이터를 동기화하는 중...</span>
          </div>
        ) : error ? (
          <div className="py-12 border border-rose-100 rounded-2xl bg-rose-50/20 text-center flex flex-col items-center justify-center gap-2">
            <ShieldAlert className="text-rose-500 w-8 h-8" />
            <p className="text-xs font-bold text-rose-600">피드백 데이터를 로드하지 못했습니다.</p>
            <p className="text-[11px] text-rose-450">{error}</p>
          </div>
        ) : feedbacks.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/30">
            <AlertCircle size={28} className="text-slate-350 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">접수된 피드백이 존재하지 않습니다.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">필터 또는 검색어를 변경해 보세요.</p>
          </div>
        ) : (
          <div className="overflow-hidden border border-slate-150 rounded-xl bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-55 border-b border-slate-150 text-slate-700 font-bold text-[11px]">
                    <th className="p-4 w-12 text-center">
                      <input 
                        type="checkbox"
                        checked={selectedIds.length === feedbacks.length && feedbacks.length > 0}
                        onChange={handleSelectAllToggle}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                      />
                    </th>
                    <th className="p-4 w-28">제보 유형</th>
                    <th className="p-4">제보 요약 및 내용</th>
                    <th className="p-4 w-36">접수 메뉴</th>
                    <th className="p-4 w-32">접수 일시</th>
                    <th className="p-4 w-44 text-center">처리 상태 & 관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/80">
                  {feedbacks.map((item) => {
                    const isResolved = item.resolved_status === 'resolved';
                    const isChecked = selectedIds.includes(item.id);
                    
                    // 유형 뱃지 스타일 정의
                    const badgeStyles = {
                      bug: 'bg-rose-50 text-rose-600 border border-rose-100',
                      feature_request: 'bg-indigo-50 text-indigo-600 border border-indigo-100',
                      complaint: 'bg-amber-50 text-amber-600 border border-amber-100',
                      other: 'bg-slate-50 text-slate-600 border border-slate-100'
                    };

                    const typeLabels = {
                      bug: '🐛 버그 제보',
                      feature_request: '💡 기능 건의',
                      complaint: '🔥 불만 사항',
                      other: '기타'
                    };

                    return (
                      <tr 
                        key={item.id} 
                        className={`hover:bg-slate-50/50 transition-colors ${
                          isChecked ? 'bg-indigo-50/20' : ''
                        } ${
                          isResolved ? 'bg-slate-50/30 text-slate-400' : 'text-slate-700'
                        }`}
                      >
                        <td className="p-4 text-center">
                          <input 
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleSelectToggle(item.id)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                          />
                        </td>

                        {/* 1. 제보 유형 */}
                        <td className="p-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${badgeStyles[item.detected_type] || badgeStyles.other}`}>
                            {typeLabels[item.detected_type] || item.detected_type}
                          </span>
                        </td>

                        {/* 2. 제보 요약 및 내용 */}
                        <td className="p-4 font-normal max-w-md">
                          <p className={`font-semibold leading-relaxed ${isResolved ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                            {item.user_prompt}
                          </p>
                        </td>

                        {/* 3. 접수 메뉴 바로가기 */}
                        <td className="p-4 whitespace-nowrap font-semibold">
                          <Link 
                            href={item.current_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-indigo-600 hover:underline hover:text-indigo-700"
                          >
                            {getPageName(item.current_url)}
                            <ChevronRight size={11} />
                          </Link>
                        </td>

                        {/* 4. 접수 일시 */}
                        <td className="p-4 whitespace-nowrap text-slate-450 text-[11px] font-medium">
                          {item.created_at}
                        </td>

                        {/* 5. 처리 상태 변경 및 삭제 액션 셀 */}
                        <td className="p-4 whitespace-nowrap text-center flex items-center justify-center gap-2">
                          <select
                            value={item.resolved_status}
                            onChange={(e) => handleStatusChange(item.id, e.target.value)}
                            className={`px-2 py-1 text-[11px] font-bold rounded-lg border focus:outline-none transition-all ${
                              item.resolved_status === 'resolved'
                                ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                                : item.resolved_status === 'in_progress'
                                ? 'bg-blue-50 border-blue-100 text-blue-600'
                                : item.resolved_status === 'ignored'
                                ? 'bg-slate-100 border-slate-200 text-slate-500'
                                : 'bg-rose-50 border-rose-100 text-rose-500 animate-pulse'
                            }`}
                          >
                            <option value="pending">⏳ 대기 중</option>
                            <option value="in_progress">⚙️ 처리 중</option>
                            <option value="resolved">✅ 해결 완료</option>
                            <option value="ignored">⏸️ 보류/기타</option>
                          </select>

                          {/* 단일 행 삭제 휴지통 아이콘 */}
                          <button
                            onClick={() => handleSingleDelete(item.id)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors shadow-2xs border border-transparent hover:border-rose-100 cursor-pointer"
                            title="이 피드백 항목 영구 삭제"
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 📄 페이지네이션 컨트롤 위젯 (HSL Indigo Harmonic) */}
            <div className="px-6 py-4 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between gap-4">
              <span className="text-xs text-slate-500 font-medium">
                총 <span className="text-indigo-600 font-bold">{totalCount}</span>건 중 {(currentPage - 1) * limit + 1}~{Math.min(currentPage * limit, totalCount)}건 표시
              </span>
              
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors text-[11px] font-bold cursor-pointer"
                  >
                    이전
                  </button>
                  
                  {Array.from({ length: totalPages }).map((_, idx) => {
                    const pageNum = idx + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 rounded-lg border text-[11px] font-extrabold transition-all cursor-pointer ${
                          currentPage === pageNum
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors text-[11px] font-bold cursor-pointer"
                  >
                    다음
                  </button>
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* 동적 플로팅 액션 툴바 */}
      {selectedIds.length > 0 && (
        <div className="absolute bottom-4 left-4 right-4 z-20 bg-white/95 backdrop-blur-md text-slate-800 py-3.5 px-6 rounded-2xl shadow-xl border border-indigo-100 shadow-indigo-100/40 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 border border-indigo-200">
              <Sparkles size={14} className="animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                선택된 항목 <span className="text-indigo-600 font-extrabold text-[13px]">{selectedIds.length}</span>개
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">선택한 피드백으로 사전 이메일 문의 또는 슬랙/디스코드 발송이 가능합니다.</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-2 text-[11px] font-semibold text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            >
              선택 해제
            </button>

            {/* 선택 삭제 버튼 */}
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 px-4.5 py-2 text-xs font-bold rounded-xl text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm cursor-pointer"
            >
              <Trash2 size={12} />
              선택 삭제
            </button>
            
            {/* 이메일 사전 문의 버튼 */}
            <button
              onClick={() => {
                setIsEmailModalOpen(true);
                handleEmailDraftGenerate(selectedIds);
              }}
              className="flex items-center gap-1.5 px-4.5 py-2 text-xs font-bold rounded-xl text-indigo-600 hover:text-indigo-700 bg-white hover:bg-slate-50 border border-slate-200 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm cursor-pointer"
            >
              <Mail size={12} className="text-indigo-600" />
              이메일 사전 문의 (AI 초안)
            </button>

            <button
              onClick={() => setIsExportModalOpen(true)}
              className="flex items-center gap-1.5 px-4.5 py-2 text-xs font-bold rounded-xl text-white shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              style={{ backgroundColor: '#4f46e5' }}
            >
              <Send size={12} />
              개발사 채널 전송
            </button>
          </div>
        </div>
      )}

      {/* 1. 다중 채널 발송 설정 모달 */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
            
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-indigo-50/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Send size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">개발사 피드백 다중 전송 설정</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">선택한 {selectedIds.length}개의 건의사항을 지정 채널로 발송합니다.</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  if (!exporting) {
                    setIsExportModalOpen(false);
                    setExportResults(null);
                  }
                }}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-5 text-xs">
              
              <div className="space-y-2">
                <label className="block text-[11px] font-extrabold text-slate-700">1. 발송 대상 채널 지정 (다중 선택 가능)</label>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  
                  <div 
                    onClick={() => !exporting && handleChannelToggle('slack')}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between h-20 ${
                      selectedChannels.includes('slack')
                        ? 'border-indigo-500 bg-indigo-50/20 text-indigo-900 shadow-sm'
                        : 'border-slate-100 hover:border-slate-300 bg-white text-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-[11px]">💬 Slack</span>
                      <input 
                        type="checkbox" 
                        checked={selectedChannels.includes('slack')}
                        onChange={() => {}} 
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                      />
                    </div>
                    <span className="text-[9px] text-slate-400">슬랙 Webhook 연동</span>
                  </div>

                  <div 
                    onClick={() => !exporting && handleChannelToggle('discord')}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between h-20 ${
                      selectedChannels.includes('discord')
                        ? 'border-indigo-500 bg-indigo-50/20 text-indigo-900 shadow-sm'
                        : 'border-slate-100 hover:border-slate-300 bg-white text-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-[11px]">🎮 Discord</span>
                      <input 
                        type="checkbox" 
                        checked={selectedChannels.includes('discord')}
                        onChange={() => {}} 
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                      />
                    </div>
                    <span className="text-[9px] text-slate-400">디스코드 Webhook 연동</span>
                  </div>

                  <div 
                    onClick={() => !exporting && handleChannelToggle('kakaotalk')}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between h-20 ${
                      selectedChannels.includes('kakaotalk')
                        ? 'border-indigo-500 bg-indigo-50/20 text-indigo-900 shadow-sm'
                        : 'border-slate-100 hover:border-slate-300 bg-white text-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-[11px]">💛 개발사 카카오톡</span>
                      <input 
                        type="checkbox" 
                        checked={selectedChannels.includes('kakaotalk')}
                        onChange={() => {}} 
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                      />
                    </div>
                    <span className="text-[9px] text-slate-450">카카오톡 채널 연동</span>
                  </div>

                  <div 
                    onClick={() => !exporting && handleChannelToggle('egdesk_cloud')}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between h-20 ${
                      selectedChannels.includes('egdesk_cloud')
                        ? 'border-indigo-500 bg-indigo-50/20 text-indigo-900 shadow-sm'
                        : 'border-slate-100 hover:border-slate-300 bg-white text-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-[11px]">🌐 egdesk.cloud 사이트</span>
                      <input 
                        type="checkbox" 
                        checked={selectedChannels.includes('egdesk_cloud')}
                        onChange={() => {}} 
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                      />
                    </div>
                    <span className="text-[9px] text-slate-450">Supabase 원격 동기화</span>
                  </div>

                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="export-comment" className="block text-[11px] font-extrabold text-slate-700">2. 최고관리자 추가 메모/코멘트</label>
                <textarea
                  id="export-comment"
                  placeholder="개발팀에 추가로 요청하거나 전달하고 싶은 상세 지시사항을 남겨주세요..."
                  value={exportComment}
                  onChange={e => setExportComment(e.target.value)}
                  disabled={exporting}
                  rows={3}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/40 text-slate-700 leading-relaxed placeholder-slate-400 transition-all text-xs"
                />
              </div>

              <div className="p-3 border border-indigo-100 rounded-xl bg-indigo-50/30 text-indigo-600 flex items-start gap-2.5 leading-relaxed text-[11px]">
                <AlertCircle size={14} className="shrink-0 mt-0.5 text-indigo-500" />
                <p>전송이 1개 채널이라도 최종 성공하면, 해당 피드백 항목들의 처리 상태가 자동으로 **'⚙️ 처리 중'**으로 토글 업데이트됩니다.</p>
              </div>

              {exportResults && (
                <div className="p-3 border border-emerald-100 rounded-xl bg-emerald-50/30 text-emerald-700 space-y-1.5">
                  <p className="font-bold flex items-center gap-1.5 text-[11px]">
                    <CheckCircle2 size={13} className="text-emerald-600" />
                    전송 완료! 잠시 후 화면이 새로고침됩니다.
                  </p>
                  <div className="space-y-1 text-[10px] text-emerald-600/90 pl-4.5 font-medium">
                    {exportResults.map((r, i) => (
                      <p key={i}>• {r.channel === 'slack' ? '슬랙' : r.channel === 'discord' ? '디스코드' : r.channel === 'kakaotalk' ? '개발사 카카오톡' : 'egdesk.cloud 사이트'}: {r.success ? '✅ 전송 성공' : `❌ 전송 실패 (${r.error})`}</p>
                    ))}
                  </div>
                </div>
              )}

            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setIsExportModalOpen(false)}
                disabled={exporting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleExportSubmit}
                disabled={exporting || selectedChannels.length === 0}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl text-white shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
                style={{ backgroundColor: '#4f46e5' }}
              >
                {exporting ? (
                  <>
                    <RefreshCw size={12} className="animate-spin" />
                    내보내는 중...
                  </>
                ) : (
                  <>
                    <Send size={12} />
                    전송 실행
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 2. AI 이메일 사전 문의 작성 및 편집 모달창 (Modal) */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            
            {/* 이메일 모달 헤더 */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-indigo-50/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Mail size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">이메일 사전 문의 및 요청 (AI 자동 생성)</h4>
                  <p className="text-[10px] text-slate-450 mt-0.5">선택한 {selectedIds.length}개의 건의사항을 토대로 AI가 세련된 메일 초안을 작성했습니다.</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  if (!sendingEmail && !generatingEmail) {
                    setIsEmailModalOpen(false);
                    setEmailSendResult(null);
                  }
                }}
                className="p-1 rounded-lg text-slate-450 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* 이메일 모달 본문 */}
            <div className="p-6 flex-1 overflow-y-auto space-y-4 text-xs">
              
              {/* 로딩 화면 (AI 초안 구성 시) */}
              {generatingEmail ? (
                <div className="py-20 text-center flex flex-col items-center justify-center gap-3.5">
                  <RefreshCw size={28} className="animate-spin text-indigo-600" />
                  <div className="space-y-1">
                    <p className="font-bold text-slate-700 text-xs">AI 이메일 비서가 초안을 조립하고 있습니다...</p>
                    <p className="text-[10px] text-slate-400">선택된 피드백 목록을 취합하여 완벽한 비즈니스 톤앤매너로 작성 중입니다. ⚡</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* 수신인 표시 */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-indigo-50/20 border border-indigo-100/60 rounded-xl gap-2.5">
                    <div>
                      <p className="text-[10px] text-slate-450 font-bold">RECIPIENT (수신처 고정)</p>
                      <p className="text-xs font-black text-slate-800 tracking-wider">CHACHOGREAT@GMAIL.COM</p>
                    </div>
                    <span className="self-start sm:self-auto text-[9.5px] font-extrabold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full">
                      개발진 수신 이메일
                    </span>
                  </div>

                  {/* 제목 입력창 */}
                  <div className="space-y-1.5">
                    <label htmlFor="email-subject" className="block text-[11px] font-extrabold text-slate-700">이메일 제목</label>
                    <input 
                      id="email-subject"
                      type="text" 
                      placeholder="이메일 제목이 이곳에 생성됩니다..."
                      value={emailSubject}
                      onChange={e => setEmailSubject(e.target.value)}
                      disabled={sendingEmail}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/20 text-slate-850 font-bold text-xs"
                    />
                  </div>

                  {/* 본문 입력창 */}
                  <div className="space-y-1.5">
                    <label htmlFor="email-body" className="block text-[11px] font-extrabold text-slate-700">이메일 내용 (편집 가능)</label>
                    <textarea 
                      id="email-body"
                      placeholder="이메일 상세 본문이 이곳에 생성됩니다..."
                      value={emailBody}
                      onChange={e => setEmailBody(e.target.value)}
                      disabled={sendingEmail}
                      rows={10}
                      className="w-full p-3.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/20 text-slate-700 leading-relaxed font-medium transition-all text-xs"
                    />
                  </div>

                  {/* 발송 결과 표시 */}
                  {emailSendResult && (
                    <div className="p-3.5 border border-emerald-100 rounded-xl bg-emerald-50/30 text-emerald-700 flex flex-col gap-1">
                      <p className="font-extrabold flex items-center gap-1.5 text-[11.5px]">
                        <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                        문의 이메일 전송 처리 성공!
                      </p>
                      <p className="text-[10px] text-emerald-600/90 pl-5.5 font-medium leading-relaxed">{emailSendResult}</p>
                    </div>
                  )}
                </>
              )}

            </div>

            {/* 이메일 모달 푸터 */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              
              {/* AI 재생성 버튼 */}
              {!generatingEmail && (
                <button
                  onClick={() => handleEmailDraftGenerate(selectedIds)}
                  disabled={sendingEmail}
                  className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:underline disabled:opacity-50 disabled:pointer-events-none"
                >
                  <Sparkles size={11} className="animate-pulse" />
                  AI에게 다시 쓰기 요청
                </button>
              )}
              <div className="flex items-center gap-2.5 ml-auto">
                <button
                  onClick={() => setIsEmailModalOpen(false)}
                  disabled={sendingEmail || generatingEmail}
                  className="px-4 py-2 text-xs font-semibold text-slate-650 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
                >
                  닫기
                </button>
                <button
                  onClick={handleEmailSendSubmit}
                  disabled={sendingEmail || generatingEmail || !emailSubject || !emailBody}
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl text-white shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
                  style={{ backgroundColor: '#4f46e5' }}
                >
                  {sendingEmail ? (
                    <>
                      <RefreshCw size={12} className="animate-spin" />
                      이메일 전송 중...
                    </>
                  ) : (
                    <>
                      <Send size={12} />
                      이메일 발송 실행
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
