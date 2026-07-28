"use client";

import React, { useState, useRef } from "react";
import { Plus, Camera, Mic, Folder, Link, X, Square } from "lucide-react";

interface MobileSpeedDialFabProps {
  onPhotoCapture: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAddVoiceTask: (audioBlob: Blob, textNote: string) => void;
  onAddLinkTask: (title: string, url: string) => void;
}

export const MobileSpeedDialFab: React.FC<MobileSpeedDialFabProps> = ({
  onPhotoCapture,
  onFileUpload,
  onAddVoiceTask,
  onAddLinkTask,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  // 링크 모달 상태
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  // 음성 모달 상태
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [voiceNote, setVoiceNote] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // 숨김 파일 input 레퍼런스
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 음성 녹음 시작/중지
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setRecordedAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      alert("마이크 접근 권한이 없거나 지원하지 않는 브라우저입니다.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleVoiceSubmit = () => {
    if (recordedAudio) {
      onAddVoiceTask(recordedAudio, voiceNote);
      setIsVoiceModalOpen(false);
      setRecordedAudio(null);
      setVoiceNote("");
      setIsOpen(false);
    }
  };

  const handleLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (linkUrl) {
      onAddLinkTask(linkTitle || linkUrl, linkUrl);
      setIsLinkModalOpen(false);
      setLinkTitle("");
      setLinkUrl("");
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* 🔮 모바일 퀵 액션 하단 중앙 고정 스피드 다이얼 (FAB) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-3">
        {/* 서브 액션 순수 아이콘 단추 리스트 (열렸을 때 수직 배치) */}
        {isOpen && (
          <div className="flex flex-col items-center gap-3 animate-scale-in mb-1">
            {/* 📷 1. 카메라 아이콘 (현장 사진 촬영) */}
            <button
              onClick={() => {
                cameraInputRef.current?.click();
                setIsOpen(false);
              }}
              title="현장 사진 촬영"
              className="w-12 h-12 rounded-full bg-purple-600 hover:bg-purple-700 text-white shadow-xl flex items-center justify-center border-none cursor-pointer transition-all active:scale-90"
            >
              <Camera className="w-5 h-5 text-white" />
            </button>

            {/* 🎤 2. 스피커 / 음성 아이콘 */}
            <button
              onClick={() => {
                setIsVoiceModalOpen(true);
                setIsOpen(false);
              }}
              title="음성 메모 등록"
              className="w-12 h-12 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl flex items-center justify-center border-none cursor-pointer transition-all active:scale-90"
            >
              <Mic className="w-5 h-5 text-white" />
            </button>

            {/* 📁 3. 폴더 / 파일 아이콘 */}
            <button
              onClick={() => {
                fileInputRef.current?.click();
                setIsOpen(false);
              }}
              title="파일/문서 첨부"
              className="w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl flex items-center justify-center border-none cursor-pointer transition-all active:scale-90"
            >
              <Folder className="w-5 h-5 text-white" />
            </button>

            {/* 🔗 4. 웹 링크 아이콘 */}
            <button
              onClick={() => {
                setIsLinkModalOpen(true);
                setIsOpen(false);
              }}
              title="웹 링크 추가"
              className="w-12 h-12 rounded-full bg-amber-500 hover:bg-amber-600 text-slate-900 shadow-xl flex items-center justify-center border-none cursor-pointer transition-all active:scale-90"
            >
              <Link className="w-5 h-5 text-slate-900" />
            </button>
          </div>
        )}

        {/* ➕ 메인 하단 중앙 + FAB 플로팅 버튼 */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-14 h-14 rounded-full text-white shadow-2xl flex items-center justify-center transition-all duration-300 border-none cursor-pointer active:scale-90 ${
            isOpen
              ? "bg-slate-800 rotate-45 ring-4 ring-slate-300"
              : "bg-gradient-to-tr from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 ring-4 ring-indigo-100 shadow-indigo-300/50"
          }`}
          title="빠른 태스크 등록 메뉴"
        >
          <Plus className="w-7 h-7" />
        </button>
      </div>

      {/* 숨김 File Inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onPhotoCapture}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="*/*"
        className="hidden"
        onChange={onFileUpload}
      />

      {/* 🔗 웹 링크 추가 모달 */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-4 text-left animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <Link className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-base text-slate-800">웹 링크 태스크 추가</h3>
              </div>
              <button
                onClick={() => setIsLinkModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 border-none bg-transparent cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLinkSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">링크 제목</label>
                <input
                  type="text"
                  placeholder="예: 시흥 현장도면 링크"
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-amber-500 focus:bg-white font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">URL 주소</label>
                <input
                  type="url"
                  required
                  placeholder="https://..."
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-amber-500 focus:bg-white font-medium"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLinkModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl border-none cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-black text-xs rounded-xl shadow-xs border-none cursor-pointer"
                >
                  링크 등록
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🎤 음성 메모 등록 모달 */}
      {isVoiceModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-4 text-left animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Mic className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-base text-slate-800">현장 음성 녹음 등록</h3>
              </div>
              <button
                onClick={() => setIsVoiceModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 border-none bg-transparent cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center py-4 space-y-3">
              {!isRecording && !recordedAudio && (
                <button
                  type="button"
                  onClick={startRecording}
                  className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center mx-auto shadow-lg border-none cursor-pointer animate-pulse"
                >
                  <Mic className="w-8 h-8" />
                </button>
              )}

              {isRecording && (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center mx-auto shadow-lg border-none cursor-pointer animate-ping"
                >
                  <Square className="w-7 h-7" />
                </button>
              )}

              {recordedAudio && (
                <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-200 text-xs font-bold text-emerald-900">
                  ✓ 음성 녹음 완료! 아래 텍스트 메모를 함께 첨부해 주세요.
                </div>
              )}

              <p className="text-xs font-bold text-slate-500">
                {isRecording ? "🔴 실시간 녹음 진행 중... (터치 시 정지)" : recordedAudio ? "녹음이 완료되었습니다." : "버튼을 눌러 음성 녹음을 시작하세요."}
              </p>
            </div>

            {recordedAudio && (
              <textarea
                rows={2}
                placeholder="음성과 함께 남길 메모 작성 (선택)"
                value={voiceNote}
                onChange={(e) => setVoiceNote(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500 focus:bg-white resize-none"
              />
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsVoiceModalOpen(false);
                  setRecordedAudio(null);
                }}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl border-none cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                disabled={!recordedAudio}
                onClick={handleVoiceSubmit}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-extrabold text-xs rounded-xl shadow-xs border-none cursor-pointer"
              >
                녹음 저장
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
