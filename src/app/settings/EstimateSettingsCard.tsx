'use client';

import { apiFetch } from '@/lib/api';
import React, { useState, useEffect } from 'react';
import { Percent, Save, CheckCircle2, AlertCircle, RefreshCw, Sparkles, Plus, Trash2, HelpCircle } from 'lucide-react';

interface DiscountRule {
  minQty: number;
  discountRate: number;
}

interface DiscountRulesData {
  rules: DiscountRule[];
  vipRate: number;
}

export default function EstimateSettingsCard() {
  const [rulesData, setRulesData] = useState<DiscountRulesData>({
    rules: [
      { minQty: 10, discountRate: 0.05 },
      { minQty: 50, discountRate: 0.10 },
      { minQty: 100, discountRate: 0.15 }
    ],
    vipRate: 0.05
  });
  const [letterTemplate, setLetterTemplate] = useState<string>('');
  const [bypassOcrReceiverCheck, setBypassOcrReceiverCheck] = useState<boolean>(false);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // AI 추천 모드 상태
  const [aiRulesLoading, setAiRulesLoading] = useState<boolean>(false);
  const [aiTemplateLoading, setAiTemplateLoading] = useState<boolean>(false);
  const [aiRulesReason, setAiRulesReason] = useState<string>('');
  const [aiTemplateReason, setAiTemplateReason] = useState<string>('');

  // AI 추천 요청 입력값
  const [businessType, setBusinessType] = useState<string>('원두 커피 제조 및 도소매');
  const [strategy, setStrategy] = useState<string>('volume');
  const [tone, setTone] = useState<string>('formal');

  // 데이터 로드
  useEffect(() => {
    async function loadSettings() {
      try {
        // 1. 할인 정책 조회
        const rulesRes = await apiFetch('/api/settings?key=estimate_discount_rules');
        const rulesDataJson = await rulesRes.json();
        if (rulesDataJson.success && rulesDataJson.value) {
          try {
            setRulesData(JSON.parse(rulesDataJson.value));
          } catch (e) {
            console.error('할인 규칙 JSON 파싱 에러:', e);
          }
        }

        // 2. 편지 템플릿 조회
        const templateRes = await apiFetch('/api/settings?key=estimate_letter_template');
        const templateDataJson = await templateRes.json();
        if (templateDataJson.success && templateDataJson.value) {
          setLetterTemplate(templateDataJson.value);
        } else {
          // 기본값 세팅
          setLetterTemplate(
            `안녕하십니까, {{recipient_company}} 귀하.\n당사 {{supplier_company}}의 제품에 대해 요청하신 소중한 견적 세부 내역을 제안해 드립니다.\n\n이번 특별 견적은 고객님의 주문 수량과 파트너십을 고려하여 특별 맞춤 할인 혜택이 적용되었습니다. 총 금액은 {{total_amount}}입니다.\n\n세부 항목에 대해 문의 사항이 있으시거나 상세 일정 조율이 필요하신 경우 언제든 편하게 아래 연락처로 문의해 주시기 바랍니다.\n\n감사합니다.\n\n- {{supplier_company}} 대표 {{supplier_owner}} 올림 (대표전화: {{supplier_phone}}) -`
          );
        }

        // 3. 수신인 불일치 거절 우회 여부 조회
        const bypassRes = await apiFetch('/api/settings?key=bypass_ocr_receiver_check');
        const bypassDataJson = await bypassRes.json();
        if (bypassDataJson.success && bypassDataJson.value) {
          setBypassOcrReceiverCheck(bypassDataJson.value === '1');
        }
      } catch (err) {
        console.error('설정 로드 중 에러 발생:', err);
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, []);

  // 설정 저장
  const handleSaveSettings = async () => {
    setSaving(true);
    setMessage(null);
    try {
      // 1. 할인 정책 저장
      const rulesSave = await apiFetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'estimate_discount_rules',
          value: JSON.stringify(rulesData)
        })
      });
      const rulesSaveJson = await rulesSave.json();

      // 2. 편지 템플릿 저장
      const templateSave = await apiFetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'estimate_letter_template',
          value: letterTemplate
        })
      });
      const templateSaveJson = await templateSave.json();

      // 3. 수신인 불일치 거절 우회 여부 저장
      const bypassSave = await apiFetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'bypass_ocr_receiver_check',
          value: bypassOcrReceiverCheck ? '1' : '0'
        })
      });
      const bypassSaveJson = await bypassSave.json();

      if (rulesSaveJson.success && templateSaveJson.success && bypassSaveJson.success) {
        setMessage({ type: 'success', text: '견적/발주 AI 할인 규칙, 편지 템플릿 및 수신인 검증 설정이 성공적으로 저장되었습니다!' });
      } else {
        setMessage({ type: 'error', text: '일부 설정을 저장하지 못했습니다.' });
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: `저장 중 오류가 발생했습니다: ${e.message}` });
    } finally {
      setSaving(false);
    }
  };

  // 할인 규칙 추가
  const handleAddRule = () => {
    setRulesData(prev => ({
      ...prev,
      rules: [...prev.rules, { minQty: 10, discountRate: 0.05 }].sort((a, b) => a.minQty - b.minQty)
    }));
  };

  // 할인 규칙 제거
  const handleRemoveRule = (index: number) => {
    setRulesData(prev => ({
      ...prev,
      rules: prev.rules.filter((_, i) => i !== index)
    }));
  };

  // 할인 규칙 변경
  const handleRuleChange = (index: number, field: keyof DiscountRule, value: number) => {
    setRulesData(prev => {
      const nextRules = [...prev.rules];
      nextRules[index] = { ...nextRules[index], [field]: value };
      return {
        ...prev,
        rules: nextRules
      };
    });
  };

  // AI 할인 규칙 추천받기
  const handleRecommendRules = async () => {
    setAiRulesLoading(true);
    setAiRulesReason('');
    try {
      const res = await apiFetch('/api/settings/estimate-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'recommend_rules',
          business_type: businessType,
          strategy: strategy
        })
      });
      const data = await res.json();
      if (data.success && data.rules) {
        setRulesData({
          rules: data.rules.sort((a: any, b: any) => a.minQty - b.minQty),
          vipRate: data.vipRate || 0.05
        });
        setAiRulesReason(data.reason || 'AI가 적절한 할인율을 분석 및 제안했습니다.');
      } else {
        alert(data.error || 'AI 추천 규칙을 생성하지 못했습니다.');
      }
    } catch (err: any) {
      alert(`AI 연동 오류: ${err.message}`);
    } finally {
      setAiRulesLoading(false);
    }
  };

  // AI 편지 템플릿 추천받기
  const handleRecommendTemplate = async () => {
    setAiTemplateLoading(true);
    setAiTemplateReason('');
    try {
      const res = await apiFetch('/api/settings/estimate-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'recommend_template',
          business_type: businessType,
          tone: tone
        })
      });
      const data = await res.json();
      if (data.success && data.template) {
        setLetterTemplate(data.template);
        setAiTemplateReason(data.reason || 'AI가 영업과 타겟 어조에 적합한 템플릿을 생성했습니다.');
      } else {
        alert(data.error || 'AI 템플릿을 생성하지 못했습니다.');
      }
    } catch (err: any) {
      alert(`AI 연동 오류: ${err.message}`);
    } finally {
      setAiTemplateLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-[32px] p-6 md:p-8 border border-slate-100 shadow-sm flex items-center justify-center py-20 gap-3">
        <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
        <span className="text-xs text-slate-500 font-bold">견적/발주 규칙 및 템플릿 설정을 불러오는 중...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[32px] p-6 md:p-8 border border-slate-100 shadow-sm space-y-6 relative overflow-hidden text-left">
      {/* 장식용 그래디언트 백그라운드 */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-50/30 rounded-full blur-3xl -z-10"></div>

      {/* 헤더 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
            <Percent className="w-5 h-5 text-indigo-600" />
            <span>견적 및 발주 AI 할인/템플릿 커스텀 설정</span>
          </h3>
          <p className="text-xs text-slate-400 font-bold mt-1.5">
            B2B 바이어에게 제시할 수량별 할인율과 AI 비즈니스 서한 편지의 기본 틀을 자유롭게 설정하고, AI에게 영업 특성별 추천을 받습니다.
          </p>
        </div>
        
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/10 flex items-center gap-1.5 self-start md:self-auto cursor-pointer transition-all duration-200"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? '설정 저장 중...' : '설정 저장하기'}
        </button>
      </div>

      {/* 알림 메시지 */}
      {message && (
        <div className={`p-4 rounded-2xl flex items-start gap-3 border text-xs font-bold ${
          message.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'
        } animate-scale-up`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* 메인 설정 구역 (2컬럼 배치) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* 좌측: 수량 구간별 할인 규칙 관리 */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-extrabold text-slate-700 block">📉 수량별 볼륨 할인율 설정</span>
            <button
              onClick={handleAddRule}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-100 text-[10px] font-black rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> 구간 추가
            </button>
          </div>

          <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/50 p-4 space-y-3.5">
            <div className="grid grid-cols-12 gap-2 text-[10px] font-black text-slate-400 px-2 uppercase tracking-wider">
              <span className="col-span-5">최소 주문 수량 (이상)</span>
              <span className="col-span-5">적용 할인율 (%)</span>
              <span className="col-span-2 text-center">작업</span>
            </div>

            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
              {rulesData.rules.length === 0 ? (
                <div className="text-center py-8 text-xs font-bold text-slate-400">
                  등록된 할인율 구간이 없습니다. 상단 추가 버튼을 눌러주세요.
                </div>
              ) : (
                rulesData.rules.map((rule, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-xl border border-slate-200/60 shadow-sm animate-fade-in">
                    <div className="col-span-5 flex items-center gap-1.5">
                      <input
                        type="number"
                        min="1"
                        value={rule.minQty}
                        onChange={e => handleRuleChange(idx, 'minQty', parseInt(e.target.value) || 1)}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-center"
                      />
                      <span className="text-xs text-slate-400 font-bold shrink-0">개</span>
                    </div>
                    <div className="col-span-5 flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        max="90"
                        value={Math.round(rule.discountRate * 100)}
                        onChange={e => handleRuleChange(idx, 'discountRate', (parseInt(e.target.value) || 0) / 100)}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-right font-mono"
                      />
                      <span className="text-xs text-slate-400 font-bold shrink-0">%</span>
                    </div>
                    <div className="col-span-2 text-center">
                      <button
                        onClick={() => handleRemoveRule(idx)}
                        className="p-2 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded-lg cursor-pointer transition-colors"
                        title="구간 제거"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-xs font-bold text-slate-600 bg-white -mx-4 -mb-4 p-4 rounded-b-2xl">
              <span className="flex items-center gap-1">🌟 VIP 등급 우대 할인율 (추가 합산)</span>
              <div className="flex items-center gap-1.5 w-24">
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={Math.round(rulesData.vipRate * 100)}
                  onChange={e => setRulesData(prev => ({ ...prev, vipRate: (parseInt(e.target.value) || 0) / 100 }))}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-right font-mono"
                />
                <span className="text-xs text-slate-400 font-bold">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* 우측: 기본 편지 템플릿 편집 */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-extrabold text-slate-700 block">✉️ AI 비즈니스 서한 기본 템플릿</span>
            <div className="group relative">
              <span className="text-[10px] text-indigo-600 font-black cursor-help flex items-center gap-0.5">
                <HelpCircle className="w-3.5 h-3.5" /> 치환어 가이드
              </span>
              <div className="absolute right-0 top-6 hidden group-hover:block w-72 bg-slate-900 text-white text-[10px] p-3.5 rounded-xl shadow-2xl z-20 space-y-1.5 leading-relaxed font-semibold">
                <p className="font-black text-indigo-300 border-b border-slate-800 pb-1 mb-1">사용 가능한 Mustache 변수 가이드</p>
                <p><code className="text-amber-300 font-mono font-black">{`{{recipient_company}}`}</code>: 바이어/거래처 회사명</p>
                <p><code className="text-amber-300 font-mono font-black">{`{{supplier_company}}`}</code>: 공급사(우리) 상호명</p>
                <p><code className="text-amber-300 font-mono font-black">{`{{supplier_owner}}`}</code>: 공급사(우리) 대표자</p>
                <p><code className="text-amber-300 font-mono font-black">{`{{supplier_phone}}`}</code>: 공급사(우리) 연락처</p>
                <p><code className="text-amber-300 font-mono font-black">{`{{total_amount}}`}</code>: 최종 산출 제안 총액</p>
                <p><code className="text-amber-300 font-mono font-black">{`{{document_memo}}`}</code>: 특기사항/전달 사항</p>
              </div>
            </div>
          </div>

          <textarea
            value={letterTemplate}
            onChange={e => setLetterTemplate(e.target.value)}
            className="w-full h-56 p-4 bg-slate-50/50 border border-slate-200 rounded-2xl text-xs text-slate-700 leading-relaxed outline-none focus:border-indigo-500 font-medium resize-none shadow-inner"
            placeholder="Mustache 태그를 활용해 정중한 기본 편지 양식을 입력하세요."
          />
        </div>
      </div>

      {/* 바이어 발주서 수신처 검증 비활성화 설정 (신규 섹션) */}
      <div className="border border-slate-200/80 rounded-[24px] p-5 md:p-6 bg-slate-50/50 space-y-3.5 mt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-extrabold text-slate-700 block flex items-center gap-1.5">
              ⚠️ 바이어 발주서 수신인 검증 설정 (OCR 예외)
            </span>
            <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
              바이어 발주서(수주서) 스캔 등록 시, 파싱된 수신처가 본사 상호명과 일치하지 않을 때 발생하는 거절 경고를 비활성화하고 강제 우회 접수를 기본 허용합니다. (최고관리자 권한으로 제어됩니다)
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0 select-none">
            <span className={`text-xs font-black transition-colors ${bypassOcrReceiverCheck ? 'text-indigo-650' : 'text-slate-400'}`}>
              {bypassOcrReceiverCheck ? '검증 비활성화 (우회 허용)' : '검증 활성화 (기본 검증)'}
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={bypassOcrReceiverCheck}
                onChange={e => setBypassOcrReceiverCheck(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* AI 설정 추천 어시스턴트 영역 (아름다운 블록 레이아웃) */}
      <div className="bg-gradient-to-r from-indigo-50 to-indigo-100/50 p-6 rounded-[24px] border border-indigo-100/60 mt-4 space-y-4">
        <div className="flex items-center gap-2 border-b border-indigo-100/80 pb-3">
          <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
          <span className="text-xs font-black text-indigo-950">AI 기반 할인 규칙 & 편지 템플릿 즉석 추천 도우미</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="text-[10px] text-slate-400 font-bold block mb-1">우리회사 업종 / 취급 품목</label>
            <input
              type="text"
              placeholder="예: 원두 커피 도소매, 기계 정밀 부품"
              value={businessType}
              onChange={e => setBusinessType(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-250 rounded-xl text-xs font-bold"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 font-bold block mb-1">할인율 권장 전략</label>
            <select
              value={strategy}
              onChange={e => setStrategy(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-250 rounded-xl text-xs font-bold"
            >
              <option value="volume">📈 박리다매 (마진 축소, 대량 수주 전략)</option>
              <option value="margin">🔒 마진 보전 (소량 다품종, 고부가가치 전략)</option>
              <option value="normal">⚖️ 표준형 (평균적인 볼륨 디스카운트)</option>
            </select>
          </div>
          <div>
            <button
              onClick={handleRecommendRules}
              disabled={aiRulesLoading}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all duration-200 disabled:opacity-50"
            >
              {aiRulesLoading ? <RefreshCw className="w-4 h-4 animate-spin text-amber-400" /> : <Sparkles className="w-4 h-4 text-amber-400" />}
              {aiRulesLoading ? 'AI 분석 중...' : 'AI 할인율 추천받기'}
            </button>
          </div>
        </div>

        {/* AI 할인 추천 설명 */}
        {aiRulesReason && (
          <div className="p-3 bg-white border border-indigo-100 rounded-xl text-[11px] font-bold text-indigo-705 leading-relaxed animate-scale-up">
            💡 <b>AI 할인 분석 코멘트</b>: {aiRulesReason}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end border-t border-indigo-100/50 pt-4">
          <div className="md:col-span-2">
            <label className="text-[10px] text-slate-400 font-bold block mb-1">서한 추천 톤앤매너 어조</label>
            <select
              value={tone}
              onChange={e => setTone(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-250 rounded-xl text-xs font-bold"
            >
              <option value="formal">👔 격식 있고 진중한 B2B 전문 비즈니스 어조</option>
              <option value="friendly">🌸 친근하고 세심하며 감성적인 어조</option>
              <option value="discount">🔥 파격적인 할인 특가와 볼륨 혜택 어필 어조</option>
            </select>
          </div>
          <div>
            <button
              onClick={handleRecommendTemplate}
              disabled={aiTemplateLoading}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all duration-200 disabled:opacity-50"
            >
              {aiTemplateLoading ? <RefreshCw className="w-4 h-4 animate-spin text-amber-400" /> : <Sparkles className="w-4 h-4 text-amber-400" />}
              {aiTemplateLoading ? 'AI 서한 설계 중...' : 'AI 편지 템플릿 생성'}
            </button>
          </div>
        </div>

        {/* AI 편지 추천 설명 */}
        {aiTemplateReason && (
          <div className="p-3 bg-white border border-indigo-100 rounded-xl text-[11px] font-bold text-indigo-705 leading-relaxed animate-scale-up">
            💡 <b>AI 작문 분석 코멘트</b>: {aiTemplateReason}
          </div>
        )}
      </div>
    </div>
  );
}
