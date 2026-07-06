"use client";

import { apiFetch } from '@/lib/api';
import React from "react";

interface SmsTemplateEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingTemplate: { id: number; title: string; content: string } | null;
  setEditingTemplate: React.Dispatch<React.SetStateAction<any | null>>;
  messageTemplates: any[];
  setMessageTemplates: React.Dispatch<React.SetStateAction<any[]>>;
}

export default function SmsTemplateEditModal({
  isOpen,
  onClose,
  editingTemplate,
  setEditingTemplate,
  messageTemplates,
  setMessageTemplates
}: SmsTemplateEditModalProps) {
  if (!isOpen || !editingTemplate) return null;

  const handleSave = async () => {
    try {
      const res = await apiFetch('/api/message-templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingTemplate)
      });
      const json = await res.json();
      if (json.success) {
        setMessageTemplates(messageTemplates.map(t => t.id === editingTemplate.id ? editingTemplate : t));
        onClose();
        alert("수정되었습니다.");
      } else {
        alert("수정 실패: " + json.error);
      }
    } catch (e) {
      alert("수정 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/55 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-6 w-[500px] shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        <h3 className="text-lg font-bold text-slate-800 mb-4">템플릿 수정</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">제목</label>
            <input 
              type="text" 
              value={editingTemplate.title}
              onChange={e => setEditingTemplate({...editingTemplate, title: e.target.value})}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-xs font-semibold text-slate-800"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">내용</label>
            <textarea 
              value={editingTemplate.content}
              onChange={e => setEditingTemplate({...editingTemplate, content: e.target.value})}
              className="w-full h-32 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-xs font-semibold resize-none text-slate-800 leading-relaxed"
            />
          </div>
        </div>
        <div className="flex justify-end space-x-2 mt-6">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-slate-500 hover:bg-slate-100 text-xs font-extrabold cursor-pointer transition-all">취소</button>
          <button 
            onClick={handleSave} 
            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-xs font-extrabold shadow-md cursor-pointer transition-all"
          >
            저장하기
          </button>
        </div>
      </div>
    </div>
  );
}
