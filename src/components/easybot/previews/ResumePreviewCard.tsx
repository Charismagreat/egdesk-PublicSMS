'use client';

import { apiFetch } from '@/lib/api';
import React, { useState, useEffect } from 'react';
import { Sparkles, User, Phone, Layers, Briefcase, CheckCircle2, RefreshCw, Send } from 'lucide-react';

export default function ResumePreviewCard({
  tagContent,
  onConfirmSuccess
}: {
  tagContent: string;
  onConfirmSuccess: (msg: string) => void;
}) {
  const [resume, setResume] = useState<any>(null);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('');
  const [experience, setExperience] = useState('');
  const [motivation, setMotivation] = useState('');
  const [techStacks, setTechStacks] = useState('');
  const [matchingScore, setMatchingScore] = useState(0);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const parsed = JSON.parse(tagContent);
      setResume(parsed);
      setName(parsed.name || '');
      setAge(parsed.age || '');
      setPhone(parsed.phone || '');
      setExperience(parsed.experience || '');
      setMotivation(parsed.motivation || '');
      setTechStacks(parsed.tech_stacks || '');
      setMatchingScore(Number(parsed.matching_score) || 0);
    } catch (err) {
      console.error('이력서 태그 파싱 실패:', err);
    }
  }, [tagContent]);

  if (!resume) return <div className="text-rose-500 font-bold p-2 text-xs">이력서 데이터를 파싱하지 못했습니다.</div>;

  const handleConfirmSubmit = async () => {
    if (!name) {
      alert('성명은 필수 입력 항목입니다.');
      return;
    }
    setSaving(true);
    try {
      const response = await apiFetch('/api/easybot/ocr/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileType: 'RESUME',
          data: {
            name,
            age,
            phone,
            experience,
            motivation,
            tech_stacks: techStacks,
            matching_score: matchingScore,
            resume_file_path: resume.resume_file_path || ''
          }
        })
      });

      const data = await response.json();
      if (data.success) {
        setSaved(true);
        onConfirmSuccess(data.message);

        // 채용 관리 대시보드 동기화 브로드캐스트 이벤트 발생
        if (typeof window !== 'undefined' && data.applicant) {
          localStorage.setItem(
            'egdesk_recruitment_sync',
            JSON.stringify({
              action: 'applied',
              applicant: data.applicant,
              timestamp: Date.now()
            })
          );
        }
      } else {
        alert(data.error || '이력서 인재 DB 등록 처리에 실패했습니다.');
      }
    } catch (err: any) {
      alert('서버 등록 통신 오류: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="my-3 border border-pink-100 rounded-2xl bg-white shadow-md overflow-hidden text-slate-800 max-w-sm animate-in zoom-in-95 duration-200">
      <div className="bg-gradient-to-r from-pink-50/50 to-rose-50/30 px-4 py-3 border-b border-pink-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-[#f91f7f] animate-pulse" />
          <span className="text-xs font-black text-slate-800">이지봇 AI 이력서 분석 리포트</span>
        </div>
        {matchingScore > 0 && (
          <div className="bg-pink-50 border border-pink-100 text-[#f91f7f] px-2 py-0.5 rounded-full text-[9px] font-black">
            AI 적합도 {matchingScore}%
          </div>
        )}
      </div>

      <div className="p-4 space-y-3 text-[11px]">
        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <label className="text-[10px] text-slate-450 font-extrabold flex items-center gap-1"><User size={10} />성명</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)}
              disabled={saving || saved}
              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-pink-500 bg-slate-50/20 font-bold"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-slate-450 font-extrabold flex items-center gap-1">🎂 나이/출생</label>
            <input 
              type="text" 
              value={age} 
              onChange={e => setAge(e.target.value)}
              disabled={saving || saved}
              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-pink-500 bg-slate-50/20 font-bold"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] text-slate-450 font-extrabold flex items-center gap-1"><Phone size={10} />연락처</label>
          <input 
            type="text" 
            value={phone} 
            onChange={e => setPhone(e.target.value)}
            disabled={saving || saved}
            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-pink-500 bg-slate-50/20 font-bold font-mono text-xs"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] text-slate-450 font-extrabold flex items-center gap-1"><Layers size={10} />기술 스택</label>
          <input 
            type="text" 
            value={techStacks} 
            onChange={e => setTechStacks(e.target.value)}
            disabled={saving || saved}
            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-pink-500 bg-slate-50/20 font-bold text-xs"
            placeholder="React, TypeScript, Node.js 등"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] text-slate-450 font-extrabold flex items-center gap-1"><Briefcase size={10} />주요 경력 요약</label>
          <textarea 
            rows={2}
            value={experience} 
            onChange={e => setExperience(e.target.value)}
            disabled={saving || saved}
            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-pink-500 bg-slate-50/20 font-bold text-xs resize-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] text-slate-450 font-extrabold flex items-center gap-1">📝 지원 동기 요약</label>
          <textarea 
            rows={2}
            value={motivation} 
            onChange={e => setMotivation(e.target.value)}
            disabled={saving || saved}
            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-pink-500 bg-slate-50/20 font-bold text-xs resize-none"
          />
        </div>

        {resume.resume_file_path && (
          <div className="mt-2 text-[9px] text-slate-400 flex items-center gap-1">
            <span>📄 첨부 이력서 파일:</span>
            <a href={resume.resume_file_path} target="_blank" rel="noreferrer" className="text-pink-600 underline font-bold hover:text-pink-850">
              [실물 파일 열기]
            </a>
          </div>
        )}
      </div>

      <div className="px-4 py-3 bg-slate-50 border-t border-pink-50 flex items-center justify-end">
        {saved ? (
          <div className="text-emerald-600 font-extrabold text-xs flex items-center gap-1.5 py-1.5 w-full justify-center">
            <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
            인재풀 DB 적재 완료!
          </div>
        ) : (
          <button
            onClick={handleConfirmSubmit}
            disabled={saving || !name}
            className="w-full py-2.5 text-xs font-bold text-white rounded-xl shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer border-none"
            style={{ backgroundColor: '#f91f7f' }}
          >
            {saving ? (
              <>
                <RefreshCw size={12} className="animate-spin" />
                DB에 반영하는 중...
              </>
            ) : (
              <>
                <Send size={12} />
                채용 인재 DB(인재풀)에 등록 확정 🎯
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
