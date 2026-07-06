import { apiFetch } from '@/lib/api';
import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, Mail, Users, CheckCircle, Clock, Send, ArrowLeft, 
  Loader2, Sparkles, MessageSquare, ExternalLink, ShieldAlert, FileText, Check
} from 'lucide-react';
import { InventoryItem } from '../types';

interface DeadstockControlProps {
  items: InventoryItem[];
  activeTab: 'material' | 'product' | 'deadstock';
  setActiveTab: (tab: 'material' | 'product' | 'deadstock') => void;
}

export const DeadstockControl: React.FC<DeadstockControlProps> = ({
  items,
  activeTab,
  setActiveTab
}) => {
  // 상태 관리
  const [deadstockItems, setDeadstockItems] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [diagnosing, setDiagnosing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);
  const [simulating, setSimulating] = useState(false);

  // 제안서 기안 및 발송 모달용 상태
  const [selectedItemForProposal, setSelectedItemForProposal] = useState<any | null>(null);
  const [proposalCompanies, setProposalCompanies] = useState<any[]>([]);
  const [selectedCompanyIdx, setSelectedCompanyIdx] = useState<number>(0);
  const [editedEmail, setEditedEmail] = useState('');
  const [editedSubject, setEditedSubject] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [editorTab, setEditorTab] = useState<'edit' | 'preview'>('edit');

  // 회신 내용 확인용 상태
  const [selectedProposalForView, setSelectedProposalForView] = useState<any | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // 시뮬레이션 모달용 상태
  const [isSimulationModalOpen, setIsSimulationModalOpen] = useState(false);
  const [simulationProposalId, setSimulationProposalId] = useState<number | null>(null);
  const [simulationContent, setSimulationContent] = useState('');

  // 1. 실시간 진단 및 제안 이력 조회 (GET API 연동)
  const runDiagnosis = async (isManual = false) => {
    if (isManual) setDiagnosing(true);
    else setLoading(true);

    try {
      const res = await apiFetch('/api/inventory/deadstock');
      const data = await res.json();
      if (data.success) {
        setDeadstockItems(data.items || []);
        setProposals(data.proposals || []);
      } else {
        alert(data.error || '진단에 실패했습니다.');
      }
    } catch (err) {
      console.error('진단 요청 오류:', err);
      alert('서버와 통신하는 도중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
      setDiagnosing(false);
    }
  };

  // 마운트 시 최초 1회 실시간 진단 자동 가동
  useEffect(() => {
    runDiagnosis();
  }, []);

  // 2. B2B 제안서 기안 (POST API 연동 - search)
  const handleDraftProposal = async (item: any) => {
    setSelectedItemForProposal(item);
    setSearching(true);
    try {
      const res = await apiFetch('/api/inventory/deadstock/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: item.id,
          itemName: item.name,
          category: item.category,
          spec: item.spec
        })
      });
      const data = await res.json();
      if (data.success && data.companies && data.companies.length > 0) {
        setProposalCompanies(data.companies);
        setSelectedCompanyIdx(0);
        
        // 첫 번째 추천 회사 기준으로 폼 설정
        const firstCompany = data.companies[0];
        setEditedEmail(firstCompany.email);
        setEditedSubject(firstCompany.subject);
        setEditedContent(firstCompany.content);
        
        setEditorTab('edit');
        setIsProposalModalOpen(true);
      } else {
        alert(data.error || '추천 업체 및 제안서 기안 생성에 실패했습니다.');
      }
    } catch (err) {
      console.error('제안서 기안 오류:', err);
      alert('서버 기안 요청 중 에러가 발생했습니다.');
    } finally {
      setSearching(false);
    }
  };

  // 추천 업체 탭 전환 시 에디터 필드 동기화
  const handleSelectCompany = (idx: number) => {
    setSelectedCompanyIdx(idx);
    const company = proposalCompanies[idx];
    setEditedEmail(company.email);
    setEditedSubject(company.subject);
    setEditedContent(company.content);
  };

  // 3. 제안 메일 실제 발송 승인 (POST API 연동)
  const handleSendProposal = async () => {
    if (!editedEmail.trim() || !editedSubject.trim() || !editedContent.trim()) {
      alert('메일 정보를 모두 입력해 주세요.');
      return;
    }

    setSending(true);
    try {
      const res = await apiFetch('/api/inventory/deadstock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: selectedItemForProposal.id,
          targetCompany: proposalCompanies[selectedCompanyIdx].companyName,
          targetEmail: editedEmail,
          subject: editedSubject,
          content: editedContent
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('🎉 B2B 제안 메일이 바이어에게 정상 발송되었습니다!\n동시에 발송 내역이 감사 로그 DB에 기록되었습니다.');
        setIsProposalModalOpen(false);
        runDiagnosis(); // 새로고침
      } else {
        alert('이메일 발송 실패: ' + (data.error || '알 수 없는 오류'));
      }
    } catch (err) {
      console.error('발송 처리 에러:', err);
      alert('메일 발송 처리 중 오류가 발생했습니다. 시스템 SMTP 연동 정보를 확인해 주세요.');
    } finally {
      setSending(false);
    }
  };

  // 4. 가상 문의 회신 시뮬레이션 모달 오픈
  const openSimulationModal = (proposalId: number) => {
    setSimulationProposalId(proposalId);
    setSimulationContent('안녕하세요, 이지데스크에서 제안해주신 불용 자재의 인수 조건을 전달받았습니다. 현재 생산 공정에 호환성을 검토 중이며, 일괄 매수할 경우 파격 단가 혜택 및 상세 납기 일정을 조율하고자 합니다. 빠른 유선 연락 또는 회신 바랍니다.');
    setIsSimulationModalOpen(true);
  };

  // 시뮬레이터 가상 회신 퀵 템플릿 주입
  const applySimTemplate = (type: 'positive' | 'negotiate' | 'cancel') => {
    if (type === 'positive') {
      setSimulationContent('제안해주신 자재에 관해 긍정적으로 검토 중입니다. 규격서 및 자재 입고 성적서가 있다면 먼저 메일로 회신바라며, 샘플 5개 정도를 선발송해주실 수 있는지 확인 부탁드립니다. 수량이 맞는다면 전량 인수의향이 있습니다.');
    } else if (type === 'negotiate') {
      setSimulationContent('귀사의 매각 제안서를 접수하였습니다. 저희 생산 기계 규격과 맞아 인수를 검토하고자 하나, 제안하신 가격에서 추가로 15% 정도 네고(단가 인하)가 가능한지 조율을 희망합니다. 가능여부 회신 바랍니다.');
    } else {
      setSimulationContent('귀사의 제안서는 확인하였으나, 현재 자사 공장 라인 사정상 해당 규격 자재의 매입 계획이 당분간 불필요하여 금번 제안은 보류해야 할 것 같습니다. 추후 다른 규격 제품이 나오면 재차 제안 부탁드립니다.');
    }
  };

  // 5. 시뮬레이션 POST 전송 실행
  const handleExecuteSimulation = async () => {
    if (!simulationProposalId || !simulationContent.trim()) {
      alert('회신 내용을 기재해 주세요.');
      return;
    }

    setSimulating(true);
    try {
      const res = await apiFetch('/api/inventory/deadstock/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalId: simulationProposalId,
          replyContent: simulationContent
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('🎯 가상 바이어 회신 수신 시뮬레이션 완료!\n대표자/관리자 수신 이메일로 즉각적인 인수 제안 회신 알림 메일이 Nodemailer로 동시 격발 발송되었습니다.');
        setIsSimulationModalOpen(false);
        runDiagnosis();
      } else {
        alert('시뮬레이션 실패: ' + (data.error || '알 수 없는 오류'));
      }
    } catch (err) {
      console.error('시뮬레이션 통신 에러:', err);
      alert('시뮬레이션 서버 처리 중 오류가 발생했습니다.');
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. 상단 컨트롤 패널 */}
      <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shadow-inner">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
              🪐 불용 및 장기 적재 자재 AI 실시간 관제 센터
            </h3>
            <p className="text-xs text-slate-400">안전재고 200% 초과 또는 90일 이상 출고 실적이 전무한 체화 재고를 추출하여 B2B 세일즈 파이프라인과 직결시킵니다.</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('material')}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-5 py-3 rounded-2xl border border-slate-200 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>재고 대장으로 이동</span>
          </button>

          <button
            onClick={() => runDiagnosis(true)}
            disabled={diagnosing || loading}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs px-5 py-3 rounded-2xl border-none shadow-md shadow-indigo-200 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            {diagnosing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            <span>AI 실시간 진단 실행</span>
          </button>
        </div>
      </div>

      {/* 2. 불용/장기 체화 재고 진단 현황 */}
      <div className="space-y-4">
        <h4 className="text-sm font-black text-slate-700 flex items-center gap-2 pl-1">
          📊 AI 진단 결과 목록
          <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-100">
            {deadstockItems.length}개 발견
          </span>
        </h4>

        {loading ? (
          <div className="bg-white rounded-3xl border border-slate-100 py-16 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            <span className="text-xs text-slate-500 font-bold">창고 적재 및 출고 Batch 분석 엔진 가동 중...</span>
          </div>
        ) : deadstockItems.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-100 py-16 text-center text-slate-400 space-y-2">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
            <p className="text-sm font-bold text-slate-800">현재 불용 및 장기 체화로 정체된 자재가 감지되지 않았습니다.</p>
            <p className="text-xs text-slate-400">정상적인 재고 회전 및 적정 안전 재고량이 철저히 보존되고 있는 깨끗한 물류 상태입니다.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {deadstockItems.map((item) => (
              <div 
                key={item.id}
                className="bg-white rounded-2xl p-5 border border-slate-100 hover:border-indigo-150 shadow-3xs hover:shadow-sm transition-all duration-200 flex flex-col justify-between hover:scale-[1.01]"
              >
                <div>
                  {/* 카드 헤더 */}
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <div>
                      <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100/50">
                        {item.category}
                      </span>
                      <h5 className="text-sm font-black text-slate-850 mt-2">{item.name}</h5>
                      {item.spec && (
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">규격: {item.spec}</p>
                      )}
                    </div>

                    <div className="flex flex-col items-end shrink-0">
                      <span className="text-[11px] font-bold text-slate-700 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                        재고: <b className="text-slate-900">{item.stock}</b> / 안전: {item.safeStock}
                      </span>
                      <div className="flex gap-1 mt-1.5">
                        {item.isOverStock && (
                          <span className="text-[9px] font-extrabold text-rose-600 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded-md animate-pulse">
                            과잉적재
                          </span>
                        )}
                        {item.isLongTermStock && (
                          <span className="text-[9px] font-extrabold text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-md">
                            장기미출고
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* AI 소견 요약 */}
                  <div className="bg-slate-50/50 rounded-xl p-3.5 border border-slate-100 text-xs text-slate-600 leading-relaxed mb-4 flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                    <p>
                      <b>AI 진단: </b>
                      {item.aiInsight}
                    </p>
                  </div>
                </div>

                {/* 카드 푸터 액션 */}
                <div className="flex justify-between items-center border-t border-slate-50 pt-3 mt-1">
                  <span className="text-[10px] text-slate-400 font-semibold">
                    보관: {item.location || '위치 미지정'} | 거래처: {item.partner || '-'}
                  </span>
                  
                  <button
                    onClick={() => handleDraftProposal(item)}
                    disabled={searching}
                    className="bg-indigo-50 hover:bg-indigo-600 text-indigo-650 hover:text-white font-bold text-[11px] px-3.5 py-2 rounded-xl transition-all border border-indigo-100 active:scale-95 cursor-pointer flex items-center gap-1 shadow-3xs"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>B2B 제안서 기안</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. 제안서 메일 발송 히스토리 및 회신 현황 */}
      <div className="space-y-4">
        <h4 className="text-sm font-black text-slate-700 flex items-center gap-2 pl-1">
          📬 B2B 제안 발송 히스토리 및 문의 현황
        </h4>

        <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-3xs">
          {proposals.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <Mail className="w-12 h-12 text-slate-350 mx-auto" />
              <p className="text-sm font-bold">발송된 B2B 인수 제안 메일 이력이 존재하지 않습니다.</p>
              <p className="text-xs">장기 적재 제품에 대해 타 업체 제안을 진행하여 유통망을 개척해 보세요.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                    <th className="py-4 px-5">발송 일시</th>
                    <th className="py-4 px-5">제안 대상 업체 (이메일)</th>
                    <th className="py-4 px-5">제안 메일 제목</th>
                    <th className="py-4 px-5 text-center">진행 상태</th>
                    <th className="py-4 px-5 text-center">액션 및 테스트</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {proposals.map((prop) => (
                    <tr key={prop.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="py-4 px-5 text-slate-500 font-semibold">{prop.created_at}</td>
                      <td className="py-4 px-5">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800">{prop.target_company}</span>
                          <span className="text-[10px] text-slate-400 mt-0.5">{prop.target_email}</span>
                        </div>
                      </td>
                      <td className="py-4 px-5 truncate max-w-[200px]" title={prop.subject}>
                        {prop.subject}
                      </td>
                      <td className="py-4 px-5 text-center">
                        {prop.status === 'SENT' && (
                          <span className="bg-blue-50 text-blue-650 text-[10px] font-bold px-2.5 py-1 rounded-full border border-blue-100">
                            제안 발송됨
                          </span>
                        )}
                        {prop.status === 'REPLIED' && (
                          <span className="bg-amber-50 text-amber-600 text-[10px] font-bold px-2.5 py-1 rounded-full border border-amber-100 animate-pulse">
                            바이어 회신
                          </span>
                        )}
                        {prop.status === 'FORWARDED' && (
                          <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-100">
                            대표 전달완료
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {prop.status === 'SENT' ? (
                            <button
                              onClick={() => openSimulationModal(prop.id)}
                              className="px-3 py-1.5 bg-slate-850 hover:bg-slate-700 text-white font-bold rounded-xl transition cursor-pointer text-[10px] border-none shadow-3xs"
                            >
                              🧪 회신 시뮬레이션
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedProposalForView(prop);
                                setIsViewModalOpen(true);
                              }}
                              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-650 font-bold rounded-xl transition cursor-pointer text-[10px] border border-indigo-100"
                            >
                              💬 회신 내용 확인
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 4. [모달 1] B2B 제안서 기안 및 발송 팝업 모달 */}
      {isProposalModalOpen && selectedItemForProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl border border-slate-100 flex flex-col text-slate-850 animate-in zoom-in-95 duration-200">
            
            {/* 모달 헤더 */}
            <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-md shadow-indigo-200">
                  <Sparkles className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-800">
                    B2B 매입 매칭 및 제안서 자동 기안
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    대상 품목: {selectedItemForProposal.name} (현재고 {selectedItemForProposal.stock}개)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsProposalModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all font-bold text-xs"
              >
                닫기
              </button>
            </div>

            {/* 모달 본문 - 그리드 레이아웃 */}
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
              
              {/* 좌측: 추천 업체 목록 선택 */}
              <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-slate-100 bg-slate-50/50 p-5 overflow-y-auto flex flex-col gap-3">
                <span className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider pl-1">
                  🔍 AI 실시간 발굴 후보군
                </span>
                {proposalCompanies.map((comp, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectCompany(idx)}
                    className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                      selectedCompanyIdx === idx
                        ? 'bg-white border-indigo-500 shadow-md shadow-indigo-50/30'
                        : 'bg-white/60 hover:bg-white border-slate-100 hover:border-slate-200 shadow-3xs'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-black text-slate-800">{comp.companyName}</span>
                      {selectedCompanyIdx === idx && (
                        <Check className="w-3.5 h-3.5 text-indigo-600" />
                      )}
                    </div>
                    <p className="text-[10px] text-indigo-500 font-bold mb-1">{comp.industry}</p>
                    <span className="text-[10px] text-slate-400 block font-mono">{comp.email}</span>
                  </button>
                ))}

                <div className="mt-4 bg-indigo-50/30 border border-indigo-50/50 rounded-2xl p-4 text-[10px] text-slate-500 leading-relaxed">
                  <ShieldAlert className="w-4 h-4 text-indigo-500 mb-1.5" />
                  이지데스크 SCM 크롤링/Gemini 분석을 거쳐 해당 제품 카테고리의 유효 수요 가능성이 가장 두드러지는 특수 업종 기업들을 엄선 매칭한 결과입니다.
                </div>
              </div>

              {/* 우측: 기안 메일 에디터 */}
              <div className="flex-1 p-6 flex flex-col overflow-hidden bg-white">
                
                {/* 탭 전환 (편집 vs 미리보기) */}
                <div className="flex border-b border-slate-100 mb-4 pb-2">
                  <button
                    onClick={() => setEditorTab('edit')}
                    className={`px-4 py-2 text-xs font-bold transition-all relative cursor-pointer border-none bg-transparent ${
                      editorTab === 'edit'
                        ? 'text-indigo-600 font-black'
                        : 'text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    <span>HTML 본문 편집</span>
                    {editorTab === 'edit' && (
                      <div className="absolute bottom-[-9px] left-0 right-0 h-0.5 bg-indigo-500" />
                    )}
                  </button>
                  <button
                    onClick={() => setEditorTab('preview')}
                    className={`px-4 py-2 text-xs font-bold transition-all relative cursor-pointer border-none bg-transparent ${
                      editorTab === 'preview'
                        ? 'text-indigo-600 font-black'
                        : 'text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    <span>미리보기</span>
                    {editorTab === 'preview' && (
                      <div className="absolute bottom-[-9px] left-0 right-0 h-0.5 bg-indigo-500" />
                    )}
                  </button>
                </div>

                {/* 에디터 필드 */}
                <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">수신 이메일</label>
                    <input 
                      type="text" 
                      value={editedEmail}
                      onChange={(e) => setEditedEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 transition-all font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">메일 제목</label>
                    <input 
                      type="text" 
                      value={editedSubject}
                      onChange={(e) => setEditedSubject(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 transition-all font-semibold text-slate-800"
                    />
                  </div>

                  {editorTab === 'edit' ? (
                    <div className="flex-1 flex flex-col min-h-[200px]">
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">메일 본문 (HTML)</label>
                      <textarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        className="w-full flex-1 p-3 bg-slate-900 text-slate-100 rounded-xl text-xs outline-none font-mono leading-normal resize-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 min-h-[250px] overflow-x-auto">
                      <div dangerouslySetInnerHTML={{ __html: editedContent }} />
                    </div>
                  )}
                </div>

              </div>

            </div>

            {/* 모달 푸터 */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-between items-center">
              <span className="text-[10px] text-rose-500 font-semibold">
                ※ 전송 승인 시 시스템 SMTP 모듈을 통해 실제 메일이 격발 발송됩니다.
              </span>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setIsProposalModalOpen(false)}
                  className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-2xl text-xs transition cursor-pointer"
                >
                  취소
                </button>
                <button
                  onClick={handleSendProposal}
                  disabled={sending}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs transition cursor-pointer border-none shadow-md shadow-indigo-200 flex items-center gap-1.5"
                >
                  {sending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>B2B 제안 메일 즉시 발송</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 5. [모달 2] 바이어 회신 내용 확인 팝업 모달 */}
      {isViewModalOpen && selectedProposalForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-100 flex flex-col text-slate-800 animate-in zoom-in-95 duration-200">
            
            <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 px-6 py-4 border-b border-amber-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2.5 bg-amber-500 text-white rounded-2xl shadow-md shadow-amber-100">
                  <MessageSquare className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-800">바이어 문의 회신 뷰어</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">발송처: {selectedProposalForView.target_company}</p>
                </div>
              </div>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all font-bold text-xs"
              >
                닫기
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs text-slate-500">
                <p className="mb-1"><b>회신 일시:</b> {selectedProposalForView.replied_at || '-'}</p>
                <p><b>바이어 메일:</b> {selectedProposalForView.target_email}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 block mb-1">문의 및 제안 회신 본문</span>
                <div className="bg-amber-50/20 border border-amber-100 rounded-2xl p-4 text-xs text-slate-700 leading-relaxed white-space-pre-wrap whitespace-pre-line min-h-[120px]">
                  {selectedProposalForView.replied_content || '회신 내용이 비어 있습니다.'}
                </div>
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl text-xs transition cursor-pointer border-none"
              >
                확인 완료
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 6. [모달 3] 가상 문의 수신 시뮬레이션 설정 모달 */}
      {isSimulationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col text-slate-800 animate-in zoom-in-95 duration-200">
            
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-4 border-b border-slate-800 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <span className="p-2.5 bg-indigo-600 rounded-2xl shadow-inner text-white">
                  <Sparkles className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-black">바이어 회신 시뮬레이션 설정 🧪</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">외부 이메일 수신 콜백 시스템 가상 테스트</p>
                </div>
              </div>
              <button
                onClick={() => setIsSimulationModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all font-bold text-xs"
              >
                닫기
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 block mb-1.5">가상 바이어 회신 템플릿 선택</span>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => applySimTemplate('positive')}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 rounded-xl text-[10px] font-bold cursor-pointer transition-all"
                  >
                    👍 긍정적 인수 의사 (샘플 요청)
                  </button>
                  <button
                    onClick={() => applySimTemplate('negotiate')}
                    className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-100 rounded-xl text-[10px] font-bold cursor-pointer transition-all"
                  >
                    💰 가격 조율 희망 (단가 인하)
                  </button>
                  <button
                    onClick={() => applySimTemplate('cancel')}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 rounded-xl text-[10px] font-bold cursor-pointer transition-all"
                  >
                    👎 인수 계획 없음 (제안 보류)
                  </button>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 block mb-1">회신 본문 편집</span>
                <textarea
                  value={simulationContent}
                  onChange={(e) => setSimulationContent(e.target.value)}
                  className="w-full h-32 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 font-sans leading-relaxed resize-none"
                />
              </div>

              <div className="bg-indigo-50/30 border border-indigo-50/50 rounded-2xl p-4 text-[10px] text-slate-500 leading-relaxed">
                <b>💡 동작 원리:</b> [시뮬레이션 전송 실행] 버튼 클릭 시 외부 메일 서버로부터 회신 메일이 접수된 콜백을 가상 모사합니다. 제안 로그 상태가 <b>'바이어 회신(REPLIED)'</b>으로 업데이트됨과 동시에, 회사 대표자 이메일로 <b>"B2B 인수 제안 회신 접수 안내"</b> 알림 메일이 Nodemailer를 거쳐 즉시 발송됩니다.
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setIsSimulationModalOpen(false)}
                className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-2xl text-xs transition cursor-pointer"
              >
                취소
              </button>
              <button
                onClick={handleExecuteSimulation}
                disabled={simulating}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs transition cursor-pointer border-none shadow-md shadow-indigo-200 flex items-center gap-1"
              >
                {simulating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>시뮬레이션 전송 실행</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
