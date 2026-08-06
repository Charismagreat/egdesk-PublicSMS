'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, Plus, Trash2, Clock, Calendar, MessageSquare, 
  ToggleRight, ToggleLeft, Play, X, Sparkles, Check 
} from 'lucide-react';
import { AutopilotSettings } from '../types';

export interface AutopilotRule {
  id: number;
  name: string;
  interval_type: string; // DAILY | WEEKEND | WEEKLY | MONTHLY
  scheduled_time: string;
  tone_style: string;
  is_active: number;
  created_at?: string;
}

interface AutopilotRulesManagerProps {
  settings: AutopilotSettings;
  saveSettings: (updates: Partial<AutopilotSettings>) => Promise<any>;
  handleTriggerAutopilot: () => Promise<void>;
  setIsDaemonInfoOpen: (v: boolean) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  selectedProducts?: any[];
  selectedProduct?: any | null;
  fetchPosts?: () => void;
}

export default function AutopilotRulesManager({
  settings,
  saveSettings,
  handleTriggerAutopilot,
  setIsDaemonInfoOpen,
  showToast,
  selectedProducts,
  selectedProduct,
  fetchPosts
}: AutopilotRulesManagerProps) {
  const [rules, setRules] = useState<AutopilotRule[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 폼 입력 state
  const [newRuleName, setNewRuleName] = useState('');
  const [newInterval, setNewInterval] = useState('DAILY');
  const [newTime, setNewTime] = useState('10:00');
  const [newTone, setNewTone] = useState('정보제공형');

  // 규칙 목록 페칭
  const fetchRules = async () => {
    try {
      const res = await fetch('/api/naver-blog/autopilot-rules');
      const data = await res.json();
      if (data.success && data.rules) {
        setRules(data.rules);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchRules();
  }, []);

  // 규칙 추가
  const handleAddRule = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    if (!newRuleName.trim()) {
      showToast('규칙 이름을 입력해 주세요.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/naver-blog/autopilot-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          rule: {
            name: newRuleName.trim(),
            interval_type: newInterval,
            scheduled_time: newTime,
            tone_style: newTone,
            is_active: 1
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        setRules(data.rules || []);
        setIsAddModalOpen(false);
        const addedName = newRuleName;
        setNewRuleName('');
        showToast(`🎉 새로운 오토파일럿 규칙 '${addedName}'이 등록되었습니다!`, 'success');
      } else {
        showToast('규칙 등록 에러: ' + (data.error || '알 수 없는 오류'), 'error');
      }
    } catch (err: any) {
      showToast('규칙 추가 실패: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 규칙 토글
  const handleToggleRule = async (ruleId: number) => {
    try {
      const res = await fetch('/api/naver-blog/autopilot-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', ruleId })
      });
      const data = await res.json();
      if (data.success) {
        setRules(data.rules);
        showToast('오토파일럿 규칙 활성화 상태가 토글되었습니다.', 'info');
      }
    } catch (err: any) {
      showToast('토글 오류: ' + err.message, 'error');
    }
  };

  // 규칙 삭제
  const handleDeleteRule = async (ruleId: number, ruleName: string) => {
    if (!confirm(`'${ruleName}' 오토파일럿 규칙을 삭제하시겠습니까?`)) return;
    try {
      const res = await fetch('/api/naver-blog/autopilot-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', ruleId })
      });
      const data = await res.json();
      if (data.success) {
        setRules(data.rules);
        showToast('오토파일럿 규칙이 정상적으로 삭제되었습니다.', 'info');
      }
    } catch (err: any) {
      showToast('삭제 오류: ' + err.message, 'error');
    }
  };

  // 맞춤 규칙 즉시 실행 테스트
  const handleRunRuleNow = async (rule: AutopilotRule) => {
    showToast(`🚀 [${rule.name}] 맞춤 규칙으로 오토파일럿 AI 포스팅을 즉시 집필합니다...`, 'info');
    try {
      const selectedIds = selectedProducts && selectedProducts.length > 0 ? selectedProducts.map(p => p.id).join(',') : '';
      const prodQuery = selectedIds ? `&productIds=${encodeURIComponent(selectedIds)}` : (selectedProduct ? `&productId=${selectedProduct.id}` : '');
      const res = await fetch(`/api/naver-blog/scheduler?toneStyle=${encodeURIComponent(rule.tone_style)}&scheduledTime=${encodeURIComponent(rule.scheduled_time)}${prodQuery}`);
      const data = await res.json();
      if (data.success) {
        showToast(`✨ [${rule.name}] (${rule.scheduled_time} 예약) 포스팅 생성 성공! 목록을 확인해 주세요.`, 'success');
        if (typeof fetchPosts === 'function') {
          fetchPosts();
        }
      } else {
        showToast('구동 실패: ' + data.error, 'error');
      }
    } catch (e: any) {
      showToast('오류: ' + e.message, 'error');
    }
  };

  const getIntervalText = (type: string) => {
    switch (type) {
      case 'DAILY': return '매일 (Daily)';
      case 'WEEKEND': return '주말 전용 (Weekend)';
      case 'WEEKLY': return '주간 (Weekly)';
      case 'MONTHLY': return '월간 (Monthly)';
      default: return type;
    }
  };

  return (
    <>
      <div className="p-6 lg:p-8 rounded-3xl bg-white/70 backdrop-blur-xl border border-slate-200/60 shadow-sm relative overflow-hidden space-y-6">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50/20 rounded-full blur-3xl pointer-events-none"></div>

        {/* 오토파일럿 전체 헤더 및 컨트롤 */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <Zap className="w-5 h-5" />
              </span>
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                100% 무인 AI 오토파일럿 다중 마케팅 엔진
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-100 text-purple-700 border border-purple-200">
                  {rules.filter(r => Number(r.is_active) === 1).length}개 활성화 중
                </span>
              </h3>
            </div>
            <p className="text-xs text-slate-500 font-medium pl-9">
              서로 다른 발행 주기, 시간대, 원고 톤앤매너를 다채롭게 조합하여 입체적인 블로그 마케팅을 자동 수행합니다.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-xs hover:from-emerald-600 hover:to-teal-700 transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>새 오토파일럿 규칙 추가 ➕</span>
            </button>

            {/* 전체 마스터 ON/OFF 스위치 */}
            <button
              onClick={() => {
                const nextState = Number(settings.is_autopilot) === 1 ? 0 : 1;
                saveSettings({ is_autopilot: nextState });
              }}
              className={`px-4 py-2.5 rounded-2xl border transition-all text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer ${
                Number(settings.is_autopilot) === 1
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}
            >
              {Number(settings.is_autopilot) === 1 ? (
                <>
                  <ToggleRight className="w-5 h-5 text-emerald-600" />
                  <span>마스터 자동화 ON</span>
                </>
              ) : (
                <>
                  <ToggleLeft className="w-5 h-5 text-slate-400" />
                  <span>마스터 자동화 OFF</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 등록된 다중 오토파일럿 규칙 리스트 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rules.map((rule) => {
            const isActive = Number(rule.is_active) === 1;

            return (
              <div
                key={rule.id}
                className={`p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between space-y-4 relative ${
                  isActive
                    ? 'bg-white/90 border-emerald-200 shadow-sm hover:border-emerald-400'
                    : 'bg-slate-50/70 border-slate-200/70 opacity-60'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <Sparkles className={`w-4 h-4 ${isActive ? 'text-emerald-500' : 'text-slate-400'}`} />
                      <span>{rule.name}</span>
                    </h4>
                    <button
                      onClick={() => handleToggleRule(rule.id)}
                      className="cursor-pointer"
                      title={isActive ? '규칙 비활성화' : '규칙 활성화'}
                    >
                      {isActive ? (
                        <ToggleRight className="w-6 h-6 text-emerald-600" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-slate-400" />
                      )}
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 font-extrabold flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      {getIntervalText(rule.interval_type)}
                    </span>
                    <span className="px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 font-extrabold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      {rule.scheduled_time}
                    </span>
                    <span className="px-2.5 py-1 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 font-extrabold flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5 text-purple-600" />
                      {rule.tone_style}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                  <button
                    onClick={() => handleRunRuleNow(rule)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold border border-emerald-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-3xs active:scale-95"
                  >
                    <Play className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                    <span>맞춤 톤 즉시 집필 🚀</span>
                  </button>

                  <button
                    onClick={() => handleDeleteRule(rule.id, rule.name)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                    title="규칙 삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 새 오토파일럿 규칙 추가 모달 */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-emerald-500" />
                  새 오토파일럿 마케팅 규칙 추가
                </h3>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddRule} className="space-y-4 text-xs font-bold">
                <div>
                  <label className="text-slate-600 block mb-1">규칙 이름</label>
                  <input
                    type="text"
                    placeholder="예: 주말 오후 친근한일상형 마케팅"
                    value={newRuleName}
                    onChange={(e) => setNewRuleName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-2xl bg-slate-50 focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-600 block mb-1">발행 주기</label>
                    <select
                      value={newInterval}
                      onChange={(e) => setNewInterval(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-2xl bg-slate-50 focus:outline-none focus:border-emerald-500 cursor-pointer font-bold"
                    >
                      <option value="DAILY">매일 (Daily)</option>
                      <option value="WEEKEND">주말 전용 (Weekend)</option>
                      <option value="WEEKLY">주간 (Weekly)</option>
                      <option value="MONTHLY">월간 (Monthly)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-600 block mb-1">발행 시각</label>
                    <input
                      type="time"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-2xl bg-slate-50 focus:outline-none focus:border-emerald-500 cursor-pointer font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-600 block mb-1">원고 집필 톤앤매너</label>
                  <select
                    value={newTone}
                    onChange={(e) => setNewTone(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl bg-slate-50 focus:outline-none focus:border-emerald-500 cursor-pointer font-bold"
                  >
                    <option value="정보제공형">정보제공형 스펙리뷰 (아침 출근길 추천)</option>
                    <option value="친근한일상형">친근한일상형 내돈내산 (주말/저녁 일상 추천)</option>
                    <option value="전문가형">전문가형 심층칼럼 (고관여 제품 분석 추천)</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2.5 rounded-2xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all font-bold cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleAddRule}
                    disabled={isLoading}
                    className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold hover:from-emerald-600 hover:to-teal-700 transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
                  >
                    <span>규칙 추가 등록 ✨</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
