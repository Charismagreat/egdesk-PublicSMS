import React from "react";
import { X, Sparkles, Calendar, Check, Copy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BriefingHistory } from "../types";

// AI 권고안 줌인 돋보기 모달 Props 정의
interface BriefingZoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  aiBriefing: any;
  briefingHistories: BriefingHistory[];
  isHighPrivilege: boolean;
  currentUser: any;
  handleCopyBriefing: () => void;
  copied: boolean;
}

export const BriefingZoomModal: React.FC<BriefingZoomModalProps> = ({
  isOpen,
  onClose,
  aiBriefing,
  briefingHistories,
  isHighPrivilege,
  currentUser,
  handleCopyBriefing,
  copied,
}) => {
  const hasPrivilege =
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.role === 'PRESIDENT' ||
    isHighPrivilege;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.95, y: 15, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 15, opacity: 0 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="bg-white border border-slate-100 w-full max-w-2xl rounded-3xl shadow-2xl p-7 space-y-6 relative overflow-hidden max-h-[85vh] overflow-y-auto block text-slate-800 custom-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 오로라 광채 장식 */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -z-10 animate-pulse"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-rose-500/5 rounded-full blur-3xl -z-10"></div>

            {/* 모달 헤더 */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/10 text-indigo-650 rounded-xl">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                    실시간 AI 전사 업무 분석 예보
                    <span className="text-[9px] font-bold text-indigo-650 bg-indigo-50 px-2 py-0.5 rounded-md font-sans">
                      SCM RAG 분석 대장
                    </span>
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">전체 부서 일정 교차 검증 및 지능형 가동율 분석</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-rose-650 hover:bg-rose-50 rounded-xl transition-all cursor-pointer flex items-center justify-center border border-slate-100 bg-transparent"
                title="닫기"
              >
                <X size={15} />
              </button>
            </div>

            {/* 모달 콘텐츠 */}
            <div className="space-y-6">
              {/* 리스크 스코어 게이지 & 알림 요약 */}
              <div className="flex items-center gap-6 p-4 rounded-2xl bg-slate-50/50 border border-slate-100">
                <div className="relative w-20 h-20 shrink-0 flex items-center justify-center rounded-full border bg-white shadow-xs border-slate-100">
                  <span
                    className={`text-2xl font-black font-mono ${
                      aiBriefing.riskScore > 60
                        ? 'text-rose-600'
                        : aiBriefing.riskScore > 30
                        ? 'text-amber-600'
                        : 'text-emerald-650'
                    }`}
                  >
                    {aiBriefing.riskScore}%
                  </span>
                  <span className="absolute bottom-2.5 text-[7px] font-black text-slate-400 uppercase tracking-widest">
                    Risk
                  </span>
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <h4 className="text-sm font-black text-slate-800 leading-tight">{aiBriefing.alertTitle}</h4>
                  <p className="text-xs text-slate-500 font-semibold leading-normal">{aiBriefing.alertMessage}</p>
                </div>
              </div>

              {/* RAG 종합 분석 보고서 텍스트 */}
              <div className="p-4 rounded-2xl border border-indigo-100 bg-indigo-50/15 text-xs font-semibold leading-relaxed text-slate-700 relative">
                <div className="flex items-center justify-between mb-2.5 border-b border-indigo-100/50 pb-1.5">
                  <span className="font-extrabold text-indigo-850 text-sm">💡 AI 마스터 종합 분석 보고서</span>
                  <button
                    type="button"
                    onClick={handleCopyBriefing}
                    className="text-slate-400 hover:text-indigo-650 transition-colors cursor-pointer flex items-center justify-center p-1 bg-transparent border-0"
                    title="클립보드로 복사"
                  >
                    {copied ? (
                      <Check size={13} className="text-emerald-500 animate-pulse" />
                    ) : (
                      <Copy size={13} />
                    )}
                  </button>
                </div>
                <div className="whitespace-pre-wrap leading-loose text-slate-650 pr-2">{aiBriefing.briefingText}</div>
              </div>

              {/* 리스크 시계열 트렌드 Vanilla SVG 차트 */}
              {hasPrivilege && briefingHistories.length >= 2 && (
                <div className="bg-slate-50/60 border border-slate-100 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-black text-slate-700 flex items-center gap-1.5">
                      <Calendar size={12} className="text-indigo-600" />
                      📈 전사 인사-법무 리스크 시계열 트렌드 (최근 {Math.min(6, briefingHistories.length)}회 분석 흐름)
                    </span>
                    <span className="text-[9px] font-bold text-slate-400">최대 위험도: 100%</span>
                  </div>

                  <div className="w-full overflow-x-auto custom-scrollbar">
                    {(() => {
                      const chartData = [...briefingHistories]
                        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                        .slice(-6);

                      const width = 560;
                      const height = 120;
                      const paddingX = 40;
                      const paddingY = 20;

                      const chartWidth = width - paddingX * 2;
                      const chartHeight = height - paddingY * 2;

                      // 좌표 연산
                      const points = chartData.map((d, i) => {
                        const x = paddingX + (i * chartWidth) / (chartData.length - 1);
                        const y = height - paddingY - (d.risk_score / 100) * chartHeight;
                        return { x, y, score: d.risk_score, date: d.target_year_month || d.created_at.slice(5, 10) };
                      });

                      // 선 경로
                      const pathD = points.reduce((acc, p, i) => {
                        return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
                      }, "");

                      // 영역 경로
                      const areaD = chartData.length > 0
                        ? `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`
                        : "";

                      return (
                        <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[500px] h-auto overflow-visible">
                          <defs>
                            <linearGradient id="chartAreaGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2" />
                              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.00" />
                            </linearGradient>
                            <linearGradient id="chartLineGrad" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="#818cf8" />
                              <stop offset="50%" stopColor="#6366f1" />
                              <stop offset="100%" stopColor="#4f46e5" />
                            </linearGradient>
                          </defs>

                          {/* 가로 보조선 */}
                          {[0, 50, 100].map((val) => {
                            const y = height - paddingY - (val / 100) * chartHeight;
                            return (
                              <g key={val} className="opacity-40">
                                <line
                                  x1={paddingX}
                                  y1={y}
                                  x2={width - paddingX}
                                  y2={y}
                                  stroke="#e2e8f0"
                                  strokeWidth="1"
                                  strokeDasharray="4 4"
                                />
                                <text
                                  x={paddingX - 8}
                                  y={y + 3}
                                  textAnchor="end"
                                  className="fill-slate-400 font-mono text-[8px] font-extrabold"
                                >
                                  {val}%
                                </text>
                              </g>
                            );
                          })}

                          {/* 그라데이션 채우기 */}
                          {areaD && <path d={areaD} fill="url(#chartAreaGrad)" />}

                          {/* 선 그리기 */}
                          {pathD && (
                            <path
                              d={pathD}
                              fill="none"
                              stroke="url(#chartLineGrad)"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          )}

                          {/* 데이터 마커 및 텍스트 뱃지 */}
                          {points.map((p, idx) => (
                            <g key={idx}>
                              {/* 작은 원 */}
                              <circle
                                cx={p.x}
                                cy={p.y}
                                r="4"
                                className="fill-indigo-600 stroke-white"
                                strokeWidth="1.5"
                              />
                              {/* 정량적 점수 텍스트 */}
                              <text
                                x={p.x}
                                y={p.y - 8}
                                textAnchor="middle"
                                className="fill-indigo-700 font-mono text-[8px] font-extrabold"
                              >
                                {p.score}%
                              </text>
                              {/* 가로 날짜 축 */}
                              <text
                                x={p.x}
                                y={height - 4}
                                textAnchor="middle"
                                className="fill-slate-450 font-mono text-[7.5px] font-bold"
                              >
                                {p.date}
                              </text>
                            </g>
                          ))}
                        </svg>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
