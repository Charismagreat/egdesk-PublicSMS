"use client";
import { apiFetch } from '@/lib/api';
import { useState, useEffect } from "react";
import { Cpu, Activity, BarChart3, Clock, AlertTriangle, Layers, CalendarRange, ChevronUp, ChevronDown } from "lucide-react";

interface UsageSummary {
  api_calls: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_tokens: number;
}

interface PurposeStat {
  purpose: string;
  calls: number;
  tokens: number;
}

interface ModelStat {
  model: string;
  calls: number;
  tokens: number;
}

interface TokenLog {
  id: string;
  model: string;
  purpose: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  user_name: string;
  menu_path: string;
  created_at: string;
}

export default function AiUsageMonitor() {
  const [range, setRange] = useState<'today' | 'week' | 'month' | 'all'>('today');
  const [summary, setSummary] = useState<UsageSummary>({ api_calls: 0, total_prompt_tokens: 0, total_completion_tokens: 0, total_tokens: 0 });
  const [purposes, setPurposes] = useState<PurposeStat[]>([]);
  const [models, setModels] = useState<ModelStat[]>([]);
  const [recentLogs, setRecentLogs] = useState<TokenLog[]>([]);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(15); // 한 페이지당 15건 기본 노출
  const [pagination, setPagination] = useState<{ total: number; page: number; limit: number; totalPages: number }>({
    total: 0,
    page: 1,
    limit: 15,
    totalPages: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 실시간 AI 감사 테이블 접기/펼치기 상태 (로컬 저장소 영구 기억 연동) 💾
  const [isTableCollapsed, setIsTableCollapsed] = useState<boolean>(false);

  useEffect(() => {
    const saved = localStorage.getItem("egdesk_ai_usage_table_collapsed");
    if (saved !== null) {
      setIsTableCollapsed(saved === "true");
    }
  }, []);

  const handleToggleTableCollapse = () => {
    setIsTableCollapsed(prev => {
      const next = !prev;
      localStorage.setItem("egdesk_ai_usage_table_collapsed", String(next));
      return next;
    });
  };

  useEffect(() => {
    fetchStats();
  }, [range, page, limit]);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/settings/ai-usage?range=${range}&page=${page}&limit=${limit}`);
      const json = await res.json();
      if (json.success) {
        setSummary(json.summary);
        setPurposes(json.purposes);
        setModels(json.models);
        setRecentLogs(json.recentLogs);
        if (json.pagination) {
          setPagination(json.pagination);
        }
      } else {
        setError(json.error || '데이터 조회 실패');
      }
    } catch (err: any) {
      setError('서버에 연결할 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getPurposeLabel = (p: string) => {
    if (!p) return '기타 용도';
    if (p.startsWith('help-')) {
      return `AI 글로벌 도움말 (${p.substring(5)})`;
    }
    switch (p) {
      case 'easybot-sql-generation': return '이지봇 SQL 자동 변환';
      case 'easybot-response': return '이지봇 지능형 응답 답변';
      case 'marketing-content-pack': return '옴니채널 광고 원고 패키지 생성';
      case 'EASYBOT_OCR_SCAN': return '이지봇 B2B 사업자등록증 스캔';
      case 'meeting-summary': return '회의록 AI 요약 생성';
      case 'meeting-tasks': return '회의록 AI 할 일/일정 추출';
      case 'meeting-recommend': return '회의록 AI 과거 관련 회의 추천';
      case 'meeting-interim': return '회의록 AI 실시간 중간 요약/제언';
      default: return p;
    }
  };

  // 💰 Gemini API 공식 가격 정책 기반 실시간 예상 한화(KRW) 비용 연산 헬퍼 (산출된 비용의 20배 표시)
  const calculateCost = (prompt: number, completion: number, modelName: string = "") => {
    const model = (modelName || "").toLowerCase();
    const isPro = model.includes("pro");
    // 1달러 = 1,400원 환율 기준 (1M 토큰당 가격 기준)
    // Flash: Prompt $0.075/1M, Completion $0.30/1M -> Prompt 0.000105원, Completion 0.00042원
    // Pro: Prompt $1.25/1M, Completion $5.00/1M -> Prompt 0.00175원, Completion 0.007원
    const promptRate = isPro ? 0.00175 : 0.000105;
    const completionRate = isPro ? 0.00700 : 0.000420;
    
    // 원래 산출된 비용의 20배 금액을 반환
    return ((prompt * promptRate) + (completion * completionRate)) * 20;
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100 mt-6 relative overflow-hidden">
      <div className="relative z-10 flex flex-col gap-6">
        
        {/* 1. 헤더 & 필터바 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5 gap-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
              <Cpu className="w-5.5 h-5.5 text-indigo-500" />
              AI API 토큰 실시간 모니터링 대시보드
            </h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              구글 Gemini API를 통해 시스템에서 소모되는 인공지능 토큰 소모량을 실시간 정밀 감사 분석합니다.
            </p>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
            {[
              { id: 'today', label: '오늘' },
              { id: 'week', label: '최근 7일' },
              { id: 'month', label: '최근 30일' },
              { id: 'all', label: '누적 합계' }
            ].map(r => (
              <button
                key={r.id}
                onClick={() => {
                  setRange(r.id as any);
                  setPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${range === r.id ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-850'}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-2 text-xs font-semibold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center animate-pulse flex flex-col items-center justify-center gap-3">
            <Activity className="w-8 h-8 text-indigo-400 animate-spin" />
            <span className="text-xs text-slate-400 font-bold">AI 토큰 소모량 실시간 감사 데이터 로딩 중...</span>
          </div>
        ) : (
          <>
            {/* 2. 핵심 계기판 스코어카드 그리드 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              
              {/* 총 토큰 소모량 */}
              <div className="bg-gradient-to-br from-indigo-50/50 to-blue-50/20 border border-indigo-100 rounded-xl p-4 flex items-center justify-between shadow-2xs">
                <div>
                  <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">총 소모 토큰량</p>
                  <h4 className="text-xl font-black text-slate-800 mt-1">{summary.total_tokens.toLocaleString()} <span className="text-xs font-medium text-slate-400">t</span></h4>
                </div>
                <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
                  <Activity className="w-4.5 h-4.5" />
                </div>
              </div>

              {/* 예상 비용 */}
              <div className="bg-gradient-to-br from-amber-50/50 to-yellow-50/20 border border-amber-100 rounded-xl p-4 flex items-center justify-between shadow-2xs col-span-2 sm:col-span-1">
                <div>
                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">예상 API 사용 비용</p>
                  <h4 className="text-xl font-black text-slate-800 mt-1">
                    {calculateCost(summary.total_prompt_tokens, summary.total_completion_tokens, models[0]?.model).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-medium text-slate-400">원</span>
                  </h4>
                </div>
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                  <span className="text-xs font-extrabold">₩</span>
                </div>
              </div>

              {/* API 호출 횟수 */}
              <div className="bg-gradient-to-br from-emerald-50/50 to-teal-50/20 border border-emerald-100 rounded-xl p-4 flex items-center justify-between shadow-2xs">
                <div>
                  <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">AI API 호출 횟수</p>
                  <h4 className="text-xl font-black text-slate-800 mt-1">{summary.api_calls.toLocaleString()} <span className="text-xs font-medium text-slate-400">회</span></h4>
                </div>
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                  <Clock className="w-4.5 h-4.5" />
                </div>
              </div>

              {/* 입력 토큰량 */}
              <div className="bg-gradient-to-br from-blue-50/50 to-sky-50/20 border border-blue-100 rounded-xl p-4 flex items-center justify-between shadow-2xs">
                <div>
                  <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">입력(질문) 토큰량</p>
                  <h4 className="text-xl font-black text-slate-800 mt-1">{summary.total_prompt_tokens.toLocaleString()} <span className="text-xs font-medium text-slate-400">t</span></h4>
                </div>
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                  <Layers className="w-4.5 h-4.5" />
                </div>
              </div>

              {/* 출력 토큰량 */}
              <div className="bg-gradient-to-br from-rose-50/50 to-pink-50/20 border border-rose-100 rounded-xl p-4 flex items-center justify-between shadow-2xs">
                <div>
                  <p className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">출력(답변) 토큰량</p>
                  <h4 className="text-xl font-black text-slate-800 mt-1">{summary.total_completion_tokens.toLocaleString()} <span className="text-xs font-medium text-slate-400">t</span></h4>
                </div>
                <div className="w-9 h-9 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
                  <BarChart3 className="w-4.5 h-4.5" />
                </div>
              </div>

            </div>

            {/* 3. 소모 점유율 분석 차트 영역 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
              
              {/* 사용 목적별 점유 차트 */}
              <div className="border border-slate-100 rounded-xl p-5 bg-slate-50/40">
                <h3 className="text-xs font-extrabold text-slate-700 mb-4 flex items-center gap-1.5">
                  <span className="w-1.5 h-3.5 bg-indigo-500 rounded-full"></span>
                  AI 사용 목적별 소모량 통계
                </h3>
                {purposes.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center font-medium">소모 이력이 존재하지 않습니다.</p>
                ) : (
                  <div className="space-y-3.5">
                    {purposes.map(p => {
                      const pct = summary.total_tokens > 0 ? (p.tokens / summary.total_tokens) * 100 : 0;
                      return (
                        <div key={p.purpose} className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold text-slate-700">
                            <span className="truncate max-w-[180px]">{getPurposeLabel(p.purpose)}</span>
                            <span className="shrink-0 flex items-center gap-1.5">
                              <span>{p.tokens.toLocaleString()} t ({pct.toFixed(1)}%)</span>
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                            <div className="bg-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }}></div>
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium">{p.calls}회 호출됨</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 활성 인공지능 모델별 통계 */}
              <div className="border border-slate-100 rounded-xl p-5 bg-slate-50/40">
                <h3 className="text-xs font-extrabold text-slate-700 mb-4 flex items-center gap-1.5">
                  <span className="w-1.5 h-3.5 bg-emerald-500 rounded-full"></span>
                  활성 Gemini AI 모델별 점유율
                </h3>
                {models.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center font-medium">소모 이력이 존재하지 않습니다.</p>
                ) : (
                  <div className="space-y-3.5">
                    {models.map(m => {
                      const pct = summary.total_tokens > 0 ? (m.tokens / summary.total_tokens) * 100 : 0;
                      return (
                        <div key={m.model} className="space-y-1">
                          <div className="flex justify-between text-xs font-bold text-slate-700">
                            <span className="font-mono text-indigo-650 truncate max-w-[180px]">{m.model}</span>
                            <span className="shrink-0 flex items-center gap-1.5">
                              <span>{m.tokens.toLocaleString()} t ({pct.toFixed(1)}%)</span>
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }}></div>
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium">{m.calls}회 호출됨</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

            {/* 4. 실시간 AI 감사 내역 테이블 (최근 30건) (접기/펼치기 및 상태 기억 보존 연동) 🎯 */}
            <div className="border border-slate-100 rounded-xl overflow-hidden mt-2 transition-all duration-300">
              <div 
                onClick={handleToggleTableCollapse}
                className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
                title={isTableCollapsed ? "클릭하여 감사록 테이블 펼치기" : "클릭하여 감사록 테이블 접기"}
              >
                <h3 className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                  <CalendarRange className="w-4 h-4 text-slate-500" />
                  실시간 AI 호출 토큰 감사록 (최대 1,000건 실시간 보존)
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400">Real-time AI Auditor</span>
                  {isTableCollapsed ? (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>
              
              {!isTableCollapsed && (
                <div className="overflow-x-auto animate-fade-in">
                  <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-500 font-bold">
                        <th className="p-3">호출일시</th>
                        <th className="p-3">호출 사용자</th>
                        <th className="p-3">사용 메뉴</th>
                        <th className="p-3 font-mono">사용 모델</th>
                        <th className="p-3">수행 목적</th>
                        <th className="p-3 text-right">질문 토큰</th>
                        <th className="p-3 text-right">답변 토큰</th>
                        <th className="p-3 text-right bg-slate-50/10">총 소모량</th>
                        <th className="p-3 text-right bg-amber-50/30 text-amber-700">예상 비용 (KRW)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recentLogs.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-slate-400 font-semibold bg-white">
                            기록된 실시간 AI 호출 이력이 없습니다. 이지봇 대화나 자동 마케팅을 가동해 보세요!
                          </td>
                        </tr>
                      ) : (
                        recentLogs.map(log => (
                          <tr key={log.id} className="hover:bg-slate-50/50 bg-white transition-colors">
                            <td className="p-3 text-slate-400 font-medium">{log.created_at}</td>
                            <td className="p-3 font-semibold text-slate-700">
                              <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md text-[10px] font-bold">
                                {log.user_name}
                              </span>
                            </td>
                            <td className="p-3 font-mono text-[11px] text-slate-500">
                              {log.menu_path === 'background-task' || log.menu_path === '백그라운드' ? (
                                <span className="text-slate-400 italic font-sans text-[10px]">백그라운드 태스크</span>
                              ) : (
                                <span className="bg-slate-100 text-slate-650 px-2 py-0.5 rounded-md font-sans font-bold text-[10px]">
                                  {log.menu_path}
                                </span>
                              )}
                            </td>
                            <td className="p-3 font-mono font-bold text-slate-600">{log.model}</td>
                            <td className="p-3 text-slate-650 font-semibold">{getPurposeLabel(log.purpose)}</td>
                            <td className="p-3 text-right text-slate-500 font-semibold">{log.prompt_tokens.toLocaleString()}</td>
                            <td className="p-3 text-right text-slate-500 font-semibold">{log.completion_tokens.toLocaleString()}</td>
                            <td className="p-3 text-right font-bold text-slate-600 bg-slate-50/20 font-mono">{log.total_tokens.toLocaleString()} t</td>
                            <td className="p-3 text-right font-extrabold text-amber-600 bg-amber-50/10 font-mono">
                              {calculateCost(log.prompt_tokens, log.completion_tokens, log.model).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}원
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>

                  {/* 5. 페이지네이션 바 🎯 */}
                  {recentLogs.length > 0 && (
                    <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 select-none">
                      <div className="text-[11px] text-slate-500 font-semibold order-2 sm:order-1">
                        총 <span className="text-indigo-600 font-extrabold">{pagination.total.toLocaleString()}</span>건 중{" "}
                        <span className="font-bold text-slate-700">
                          {((page - 1) * limit + 1).toLocaleString()} - {Math.min(page * limit, pagination.total).toLocaleString()}
                        </span>번째 표시
                      </div>
                      
                      {pagination.totalPages > 1 && (
                        <div className="flex items-center gap-1 order-1 sm:order-2">
                          <button
                            onClick={() => setPage(1)}
                            disabled={page === 1}
                            className="px-2 py-1 text-slate-500 bg-white border border-slate-200 rounded-lg text-[10px] font-bold hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            title="처음 페이지"
                          >
                            &lt;&lt;
                          </button>
                          <button
                            onClick={() => setPage(prev => Math.max(1, prev - 1))}
                            disabled={page === 1}
                            className="px-2.5 py-1 text-slate-500 bg-white border border-slate-200 rounded-lg text-[11px] font-bold hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          >
                            이전
                          </button>
                          
                          {(() => {
                            const buttons = [];
                            const maxVisible = 5;
                            let start = Math.max(1, page - Math.floor(maxVisible / 2));
                            let end = start + maxVisible - 1;
                            
                            if (end > pagination.totalPages) {
                              end = pagination.totalPages;
                              start = Math.max(1, end - maxVisible + 1);
                            }
                            
                            for (let i = start; i <= end; i++) {
                              buttons.push(
                                <button
                                  key={i}
                                  onClick={() => setPage(i)}
                                  className={`px-3 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                                    page === i
                                      ? "bg-indigo-600 text-white shadow-xs"
                                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                                  }`}
                                >
                                  {i}
                                </button>
                              );
                            }
                            return buttons;
                          })()}
                          
                          <button
                            onClick={() => setPage(prev => Math.min(pagination.totalPages, prev + 1))}
                            disabled={page === pagination.totalPages}
                            className="px-2.5 py-1 text-slate-500 bg-white border border-slate-200 rounded-lg text-[11px] font-bold hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          >
                            다음
                          </button>
                          <button
                            onClick={() => setPage(pagination.totalPages)}
                            disabled={page === pagination.totalPages}
                            className="px-2 py-1 text-slate-500 bg-white border border-slate-200 rounded-lg text-[10px] font-bold hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            title="마지막 페이지"
                          >
                            &gt;&gt;
                          </button>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-1.5 order-3">
                        <span className="text-[10px] text-slate-400 font-bold">페이지당</span>
                        <select
                          value={limit}
                          onChange={(e) => {
                            setLimit(Number(e.target.value));
                            setPage(1);
                          }}
                          className="text-[10px] font-bold text-slate-700 bg-white border border-slate-200 rounded-lg p-1 outline-hidden cursor-pointer"
                        >
                          {[10, 15, 20, 30, 50, 100].map(size => (
                            <option key={size} value={size}>{size}개씩</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
