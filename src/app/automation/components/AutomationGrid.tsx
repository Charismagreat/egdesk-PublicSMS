import React from "react";
import { MessageTemplate, AutomationRule } from "../types";
import { EVENTS } from "../hooks/useAutomation";

interface AutomationGridProps {
  rules: Record<string, AutomationRule>;
  templates: MessageTemplate[];
  toggleRule: (eventId: string) => void;
  changeTemplate: (eventId: string, templateId: number | null) => void;
}

export function AutomationGrid({
  rules,
  templates,
  toggleRule,
  changeTemplate
}: AutomationGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {EVENTS.map(ev => {
        const rule = rules[ev.id] || { enabled: false, templateId: null };
        
        return (
          <div 
            key={ev.id} 
            className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
              rule.enabled 
                ? "bg-white border-blue-200 shadow-sm hover:border-blue-400" 
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
                  <div className="w-11 h-6 bg-slate-350 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">{ev.desc}</p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100/80 flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 whitespace-nowrap">연결 템플릿:</span>
              <select 
                value={rule.templateId || ""}
                onChange={e => changeTemplate(ev.id, e.target.value ? parseInt(e.target.value) : null)}
                disabled={!rule.enabled}
                className={`w-full border rounded-lg px-2.5 py-1.5 text-xs outline-none font-bold transition-all ${
                  rule.enabled 
                    ? "border-slate-300 bg-white text-slate-700 focus:border-blue-500 cursor-pointer" 
                    : "border-slate-250 bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200"
                }`}
              >
                <option value="">-- 템플릿을 선택하세요 --</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>
          </div>
        );
      })}
    </div>
  );
}
