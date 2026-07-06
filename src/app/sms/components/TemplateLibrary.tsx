import { apiFetch } from '@/lib/api';
import React from "react";
import { FileText, X } from "lucide-react";
import { MessageTemplate } from "../types";

interface TemplateLibraryProps {
  messageTemplates: MessageTemplate[];
  setMessageTemplates: React.Dispatch<React.SetStateAction<MessageTemplate[]>>;
  setEditingTemplate: React.Dispatch<React.SetStateAction<MessageTemplate | null>>;
  setMessage: React.Dispatch<React.SetStateAction<string>>;
}

export function TemplateLibrary({
  messageTemplates,
  setMessageTemplates,
  setEditingTemplate,
  setMessage
}: TemplateLibraryProps) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 max-h-[500px] flex flex-col">
      <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center justify-between border-b border-slate-50 pb-3">
        내 템플릿 모음
        <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
          {messageTemplates.length}개
        </span>
      </h2>
      <div className="space-y-3 overflow-y-auto flex-1 pr-2">
        {messageTemplates.length === 0 ? (
          <div className="text-xs text-slate-500 text-center py-8 font-semibold">
            저장된 템플릿이 없습니다.<br/>문자 작성 창에서 저장해보세요.
          </div>
        ) : (
          messageTemplates.map(t => (
            <div 
              key={t.id} 
              className="group border border-slate-200 rounded-lg hover:border-blue-500 transition-colors bg-white overflow-hidden flex flex-col shadow-2xs"
            >
              <div className="flex justify-between items-center p-3 pb-2 border-b border-slate-50 bg-slate-50/50">
                <p className="font-extrabold text-slate-800 text-sm truncate pr-2">{t.title}</p>
                <div className="flex space-x-1 shrink-0">
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingTemplate(t);
                    }}
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-100 rounded transition-colors cursor-pointer border-none bg-transparent"
                    title="수정"
                  >
                    <FileText className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    type="button"
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!confirm("이 템플릿을 삭제하시겠습니까?")) return;
                      try {
                        const res = await apiFetch(`/api/message-templates?id=${t.id}`, { method: 'DELETE' });
                        const json = await res.json();
                        if (json.success) {
                          setMessageTemplates(prev => prev.filter(x => x.id !== t.id));
                        } else {
                          alert("삭제 실패: " + json.error);
                        }
                      } catch (err) {
                        alert("삭제 중 오류가 발생했습니다.");
                      }
                    }}
                    className="p-1.5 text-slate-500 hover:text-red-650 hover:bg-red-100 rounded transition-colors cursor-pointer border-none bg-transparent"
                    title="삭제"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setMessage(t.content)} 
                className="w-full text-left p-3 pt-2 hover:bg-blue-50 transition-colors cursor-pointer border-none bg-transparent"
              >
                <p className="text-xs text-slate-655 line-clamp-2 leading-relaxed font-semibold">{t.content}</p>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
