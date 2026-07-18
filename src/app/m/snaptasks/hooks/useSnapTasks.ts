"use client";

import { useState, useEffect, useRef } from "react";
import { SnapTask, TimelineItem, ActionLog } from "../types";

export function useSnapTasks() {
  const [tasks, setTasks] = useState<SnapTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<SnapTask | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [actions, setActions] = useState<ActionLog[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [snapping, setSnapping] = useState(false);

  // 실시간 검색어 상태
  const [searchTerm, setSearchTerm] = useState("");

  // 신규 태스크 개설 상태
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  // 스냅 입력 폼 상태
  const [contentText, setContentText] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachedFileType, setAttachedFileType] = useState<'IMAGE' | 'PDF' | 'AUDIO' | 'LINK' | 'TEXT'>('TEXT');
  const [attachedFileBase64, setAttachedFileBase64] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const timelineEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    if (selectedTask) {
      fetchTimeline(selectedTask.id);
    }
  }, [selectedTask]);

  // 스냅 등록 후 스크롤 하단 동기화
  useEffect(() => {
    timelineEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [timeline]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/snaptasks");
      const data = await res.json();
      if (data.success) {
        setTasks(data.tasks || []);
        if (data.tasks.length > 0 && !selectedTask) {
          setSelectedTask(data.tasks[0]);
        }
      }
    } catch (e) {
      console.error("태스크 로드 에러:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeline = async (taskId: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/snaptasks?action=timeline&task_id=${taskId}`);
      const data = await res.json();
      if (data.success) {
        setTimeline(data.timeline || []);
        setActions(data.actions || []);
      }
    } catch (e) {
      console.error("타임라인 로드 에러:", e);
    } finally {
      setDetailLoading(false);
    }
  };

  // 신규 스냅 태스크 생성
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      const res = await fetch("/api/snaptasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTaskTitle })
      });
      const data = await res.json();
      if (data.success) {
        setNewTaskTitle("");
        setIsNewTaskOpen(false);
        alert("자율주행 스냅태스크가 생성되었습니다!");
        fetchTasks();
      }
    } catch (err) {
      alert("태스크 생성 오류가 발생했습니다.");
    }
  };

  // 모바일 파일 첨부 핸들러
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'IMAGE' | 'PDF' | 'AUDIO') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      alert("최대 20MB 이하의 미디어 파일만 수령 가능합니다.");
      return;
    }

    setAttachedFile(file);
    setAttachedFileType(type);

    const reader = new FileReader();
    reader.onload = () => {
      setAttachedFileBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // 현장 데이터 융합 자율주행 스냅 전송 기동!
  const handleSnapSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    if (!contentText.trim() && !attachedFile) {
      alert("전송할 상담 메모 텍스트나 사진/파일을 첨부해 주세요.");
      return;
    }

    setSnapping(true);

    try {
      const body = {
        taskId: selectedTask.id,
        content_text: contentText,
        fileBase64: attachedFileBase64,
        filename: attachedFile ? attachedFile.name : "",
        fileType: attachedFile ? attachedFileType : "TEXT",
        mimeType: attachedFile ? attachedFile.type : "text/plain"
      };

      const res = await fetch("/api/snaptasks/snap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (data.success) {
        // 성공 시 폼 초기화 및 타임라인 재정비
        setContentText("");
        setAttachedFile(null);
        setAttachedFileBase64("");
        if (fileInputRef.current) fileInputRef.current.value = "";
        
        fetchTimeline(selectedTask.id);
        if (data.action_logged) {
          alert(`스냅 완료!\n[AI 자율 조치]: ${data.action_logged}`);
        }
      } else {
        alert("AI 스냅 실패: " + data.error);
      }
    } catch (err) {
      alert("네트워크 스냅 통신 중 에러가 발생했습니다.");
    } finally {
      setSnapping(false);
    }
  };

  const filteredTasks = tasks.filter(t => 
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.partner_company_name && t.partner_company_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return {
    tasks,
    selectedTask, setSelectedTask,
    timeline,
    actions,
    loading,
    detailLoading,
    snapping,
    searchTerm, setSearchTerm,
    isNewTaskOpen, setIsNewTaskOpen,
    newTaskTitle, setNewTaskTitle,
    contentText, setContentText,
    attachedFile, setAttachedFile,
    attachedFileType, setAttachedFileType,
    attachedFileBase64, setAttachedFileBase64,
    fileInputRef,
    timelineEndRef,
    handleCreateTask,
    handleFileChange,
    handleSnapSubmit,
    filteredTasks
  };
}
