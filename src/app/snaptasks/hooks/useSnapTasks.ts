import { apiFetch } from '@/lib/api';
import React, { useState, useEffect, useRef } from "react";
import { SnapTask, TimelineItem, ActionLog, Partner, PartnerContact } from "../types";

export function useSnapTasks() {
  const [tasks, setTasks] = useState<SnapTask[]>([]);
  const [loading, setLoading] = useState(true);

  // 상세 팝업 상태
  const [selectedTask, setSelectedTask] = useState<SnapTask | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [actions, setActions] = useState<ActionLog[]>([]);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [partnerContacts, setPartnerContacts] = useState<PartnerContact[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // PC 즉석 스냅 전송용 상태
  const [contentText, setContentText] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachedFileType, setAttachedFileType] = useState<'IMAGE' | 'PDF' | 'AUDIO' | 'LINK' | 'TEXT'>('TEXT');
  const [attachedFileBase64, setAttachedFileBase64] = useState("");
  const [snapping, setSnapping] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 스냅 폼 리셋
  const resetSnapForm = () => {
    setContentText("");
    setAttachedFile(null);
    setAttachedFileType('TEXT');
    setAttachedFileBase64("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // 파일 선택 핸들러
  const handleFileChange = (file: File, type: 'IMAGE' | 'PDF' | 'AUDIO') => {
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

  // PC 대시보드 즉석 AI 자율주행 스냅 전송 기동!
  const handleSnapSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    if (!contentText.trim() && !attachedFile) {
      alert("전송할 업무 메모 텍스트나 사진/파일을 첨부해 주세요.");
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

      const res = await apiFetch("/api/snaptasks/snap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (data.success) {
        resetSnapForm();
        
        // 상세 정보 실시간 리로드
        const timelineRes = await apiFetch(`/api/snaptasks?action=timeline&task_id=${selectedTask.id}`);
        const timelineData = await timelineRes.json();
        if (timelineData.success) {
          setTimeline(timelineData.timeline || []);
          setActions(timelineData.actions || []);
          setPartner(timelineData.partner || null);
          setPartnerContacts(timelineData.partnerContacts || []);
        }

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

  // 태스크 목록 불러오기
  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/snaptasks");
      const data = await res.json();
      if (data.success) {
        setTasks(data.tasks || []);
      }
    } catch (e) {
      console.error("스냅태스크 로드 실패:", e);
    } finally {
      setLoading(false);
    }
  };

  // 상세 팝업 열기
  const openDetailPopup = async (task: SnapTask) => {
    setSelectedTask(task);
    setIsDetailOpen(true);
    setDetailLoading(true);
    setPartner(null);
    setPartnerContacts([]);
    resetSnapForm();
    try {
      const res = await apiFetch(`/api/snaptasks?action=timeline&task_id=${task.id}`);
      const data = await res.json();
      if (data.success) {
        setTimeline(data.timeline || []);
        setActions(data.actions || []);
        setPartner(data.partner || null);
        setPartnerContacts(data.partnerContacts || []);
      }
    } catch (e) {
      console.error("상세 타임라인 로드 실패:", e);
    } finally {
      setDetailLoading(false);
    }
  };

  // 태스크 상태 전이
  const handleUpdateStatus = async (task: SnapTask, nextStatus: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED') => {
    try {
      const res = await apiFetch("/api/snaptasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, status: nextStatus })
      });
      const data = await res.json();
      if (data.success) {
        await fetchTasks();
        if (isDetailOpen && selectedTask?.id === task.id) {
          setSelectedTask(prev => prev ? { ...prev, status: nextStatus } : null);
        }
        alert(`태스크가 정상적으로 '${nextStatus}' 상태로 전이되었습니다.`);
      }
    } catch (err) {
      alert("상태 수정 중 오류가 발생했습니다.");
    }
  };

  // 태스크 삭제
  const handleDeleteTask = async (task: SnapTask, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`[경고] 스냅태스크 '${task.title}'과 관련된 모든 파일 스냅, 오디오, AI 자율 감사로그를 영구히 파괴 삭제하시겠습니까?\n이 작업은 물리 DB에서 복구 불가능합니다.`)) return;

    try {
      const res = await apiFetch(`/api/snaptasks?id=${task.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        await fetchTasks();
        setIsDetailOpen(false);
        alert("태스크 및 연동 이력이 안전하게 영구 소멸되었습니다.");
      }
    } catch (err) {
      alert("삭제 중 에러가 발생했습니다.");
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  return {
    tasks,
    loading,
    selectedTask,
    timeline,
    actions,
    partner,
    partnerContacts,
    detailLoading,
    isDetailOpen,
    setIsDetailOpen,
    contentText,
    setContentText,
    attachedFile,
    setAttachedFile,
    attachedFileType,
    setAttachedFileType,
    attachedFileBase64,
    setAttachedFileBase64,
    snapping,
    fileInputRef,
    resetSnapForm,
    handleFileChange,
    handleSnapSubmit,
    fetchTasks,
    openDetailPopup,
    handleUpdateStatus,
    handleDeleteTask
  };
}
