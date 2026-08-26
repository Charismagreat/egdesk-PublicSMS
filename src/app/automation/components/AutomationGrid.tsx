import React from "react";
import { MessageTemplate, AutomationRule, OperatorItem } from "../types";
import { EVENTS } from "../hooks/useAutomation";
import { UserCheck, Phone, Building, Users, X, Plus } from "lucide-react";

interface AutomationGridProps {
  rules: Record<string, AutomationRule>;
  templates: MessageTemplate[];
  operators?: OperatorItem[];
  toggleRule: (eventId: string) => void;
  changeTemplate: (eventId: string, templateId: number | null) => void;
  changeTargetType?: (eventId: string, targetType: any) => void;
  changeTargetPhone?: (eventId: string, targetPhone: string) => void;
  changeTargetOperator?: (eventId: string, targetOperatorId: string) => void;
  toggleTargetOperator?: (eventId: string, operatorId: string) => void;
}

export function AutomationGrid({
  rules,
  templates,
  operators = [],
  toggleRule,
  changeTemplate,
  changeTargetType,
  changeTargetPhone,
  changeTargetOperator,
  toggleTargetOperator
}: AutomationGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {EVENTS.map(ev => {
        const rule = rules[ev.id] || { 
          enabled: false, 
          templateId: null, 
          targetType: 'ADMIN', 
          targetPhone: '', 
          targetOperatorId: '',
          targetOperatorIds: [] 
        };
        let targetType = rule.targetType || 'ADMIN';
        if (targetType === 'OPERATOR') targetType = 'OPERATORS';

        // 현재 선택된 직원 ID 배열
        const selectedOpIds = rule.targetOperatorIds && rule.targetOperatorIds.length > 0
          ? rule.targetOperatorIds
          : (rule.targetOperatorId ? [String(rule.targetOperatorId)] : []);
        
        const selectedOperators = operators.filter(op => selectedOpIds.includes(String(op.id)));
        
        return (
          <div 
            key={ev.id} 
            className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
              rule.enabled 
                ? "bg-white border-blue-200 shadow-sm hover:border-blue-400 ring-1 ring-blue-100" 
                : "bg-slate-50/80 border-slate-200 hover:border-slate-300"
            } duration-200`}
          >
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className={`text-base font-black tracking-tight ${rule.enabled ? "text-slate-800" : "text-slate-500"}`}>
                  {ev.label}
                </h3>
                {/* Toggle Switch */}
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={rule.enabled}
                    onChange={() => toggleRule(ev.id)}
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">{ev.desc}</p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100/80 space-y-2.5">
              {/* 1. 연결 템플릿 */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 whitespace-nowrap min-w-[70px]">연결 템플릿:</span>
                <select 
                  value={rule.templateId || ""}
                  onChange={e => changeTemplate(ev.id, e.target.value ? parseInt(e.target.value) : null)}
                  disabled={!rule.enabled}
                  className={`w-full border rounded-lg px-2.5 py-1.5 text-xs outline-none font-bold transition-all ${
                    rule.enabled 
                      ? "border-slate-300 bg-white text-slate-700 focus:border-blue-500 cursor-pointer" 
                      : "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  <option value="">-- 템플릿을 선택하세요 --</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              </div>

              {/* 2. 수신 대상 지정 (대표자 / 전사직원 / 특정직원복수 / 직접입력 / 거래처) */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 whitespace-nowrap min-w-[70px]">수신 대상:</span>
                <select
                  value={targetType}
                  onChange={e => changeTargetType && changeTargetType(ev.id, e.target.value as any)}
                  disabled={!rule.enabled}
                  className={`w-full border rounded-lg px-2.5 py-1.5 text-xs outline-none font-bold transition-all ${
                    rule.enabled 
                      ? "border-slate-300 bg-white text-slate-700 focus:border-blue-500 cursor-pointer" 
                      : "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  <option value="ADMIN">🏢 회사 대표자 / 관리자 (기본)</option>
                  <option value="ALL_OPERATORS">👥 소속 임직원 전체 동시 발송</option>
                  <option value="OPERATORS">👤 특정 임직원 복수 선택 (여러 명 지정)</option>
                  <option value="CUSTOM">📱 수신 전화번호 직접 입력 (복수 가능)</option>
                  <option value="PARTNER">🤝 거래처 / 고객 담당자</option>
                </select>
              </div>

              {/* 2-1. 특정 직원 복수 선택 UI */}
              {rule.enabled && (targetType === 'OPERATORS' || targetType === 'OPERATOR') && (
                <div className="space-y-2 pl-[78px]">
                  <select
                    value=""
                    onChange={e => {
                      if (e.target.value && toggleTargetOperator) {
                        toggleTargetOperator(ev.id, e.target.value);
                      }
                    }}
                    className="w-full border border-indigo-200 bg-indigo-50/50 rounded-lg px-2.5 py-1.5 text-xs outline-none font-bold text-indigo-900 focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="">+ 추가할 직원을 선택하세요 (클릭 시 추가/삭제)</option>
                    {operators.map(op => {
                      const isSelected = selectedOpIds.includes(String(op.id));
                      return (
                        <option key={op.id} value={String(op.id)}>
                          {isSelected ? "✓ " : ""}{op.name} ({op.department || op.role || "직원"}) {op.phone ? `- ${op.phone}` : ""}
                        </option>
                      );
                    })}
                  </select>

                  {/* 선택된 직원 태그 뱃지 목록 */}
                  {selectedOperators.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {selectedOperators.map(op => (
                        <span 
                          key={op.id} 
                          className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200/80 px-2.5 py-1 rounded-full text-[11px] font-bold shadow-2xs animate-fade-in"
                        >
                          <span>{op.name} {op.phone ? `(${op.phone})` : ""}</span>
                          <button
                            type="button"
                            onClick={() => toggleTargetOperator && toggleTargetOperator(ev.id, String(op.id))}
                            className="hover:bg-indigo-200/80 rounded-full p-0.5 transition-colors cursor-pointer text-indigo-500 hover:text-indigo-800"
                            title="수신자 제거"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                      <span className="text-[10px] text-slate-400 font-extrabold self-center ml-1">
                        총 {selectedOperators.length}명 수신
                      </span>
                    </div>
                  ) : (
                    <p className="text-[11px] text-amber-600 font-medium bg-amber-50/60 px-2 py-1 rounded-md border border-amber-100">
                      ⚠️ 위 드롭다운에서 알림을 수신할 직원을 1명 이상 선택해 주세요.
                    </p>
                  )}
                </div>
              )}

              {/* 2-2. 수신 번호 직접 입력 (단일 및 콤마 구분 복수 번호) */}
              {rule.enabled && targetType === 'CUSTOM' && (
                <div className="space-y-1 pl-[78px]">
                  <input
                    type="text"
                    placeholder="수신 번호 (쉼표로 여러 번호 입력 가능: 010-1234-5678, 010-9876-5432)"
                    value={rule.targetPhone || ""}
                    onChange={e => changeTargetPhone && changeTargetPhone(ev.id, e.target.value)}
                    className="w-full border border-blue-200 bg-blue-50/50 rounded-lg px-2.5 py-1.5 text-xs outline-none font-bold text-blue-900 focus:border-blue-500 placeholder:text-blue-300"
                  />
                  <p className="text-[10px] text-slate-400 font-medium">
                    💡 여러 명에게 전송하려면 번호를 쉼표(,)로 구분해 입력하세요.
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

