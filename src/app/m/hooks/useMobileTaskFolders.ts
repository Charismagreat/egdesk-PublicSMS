"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";

export function useMobileTaskFolders() {
  const [taskFolders, setTaskFolders] = useState<any[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  // 📂 신규 폴더 생성 모달 상태
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderDesc, setNewFolderDesc] = useState("");

  // 📂 폴더 수정 모달 상태
  const [isEditFolderModalOpen, setIsEditFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<any | null>(null);
  const [editFolderName, setEditFolderName] = useState("");
  const [editFolderDesc, setEditFolderDesc] = useState("");

  // 📦 아이템 폴더 이동 모달 상태
  const [isMoveItemModalOpen, setIsMoveItemModalOpen] = useState(false);
  const [movingItem, setMovingItem] = useState<any | null>(null);
  const [targetFolderId, setTargetFolderId] = useState<string>("");

  // 폴더 목록 조회
  const reloadTaskFolders = useCallback(async () => {
    try {
      const res = await apiFetch("/api/task-folders?action=list");
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.folders) {
          setTaskFolders(data.folders);
          if (data.folders.length > 0 && !selectedFolderId) {
            setSelectedFolderId(String(data.folders[0].id));
          }
        }
      }
    } catch (e) {
      console.error("Failed to reload task folders:", e);
    }
  }, [selectedFolderId]);

  useEffect(() => {
    reloadTaskFolders();
  }, [reloadTaskFolders]);

  // 신규 폴더 생성 핸들러
  const handleCreateNewFolder = async () => {
    if (!newFolderName.trim()) {
      alert("폴더 이름을 입력해 주세요.");
      return;
    }
    try {
      const res = await apiFetch("/api/task-folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          name: newFolderName.trim(),
          description: newFolderDesc.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("📁 새 업무 폴더가 생성되었습니다!");
        setIsNewFolderModalOpen(false);
        setNewFolderName("");
        setNewFolderDesc("");
        reloadTaskFolders();
      } else {
        alert("폴더 생성 실패: " + (data.error || "오류가 발생했습니다."));
      }
    } catch (e) {
      alert("폴더 생성 중 오류가 발생했습니다.");
    }
  };

  // 폴더 수정 핸들러
  const handleSaveEditFolder = async () => {
    if (!editingFolder || !editFolderName.trim()) {
      alert("폴더 이름을 입력해 주세요.");
      return;
    }
    try {
      const res = await apiFetch("/api/task-folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          id: editingFolder.id,
          name: editFolderName.trim(),
          description: editFolderDesc.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("📁 폴더 정보가 수정되었습니다.");
        setIsEditFolderModalOpen(false);
        setEditingFolder(null);
        reloadTaskFolders();
      } else {
        alert("폴더 수정 실패: " + (data.error || "오류가 발생했습니다."));
      }
    } catch (e) {
      alert("폴더 수정 중 오류가 발생했습니다.");
    }
  };

  // 폴더 삭제 핸들러
  const handleDeleteFolder = async (folderId: string, folderName: string) => {
    if (!confirm(`'${folderName}' 폴더를 정말 삭제하시겠습니까?\n(폴더 안의 자료는 기본 폴더로 유지됩니다)`)) {
      return;
    }
    try {
      const res = await apiFetch("/api/task-folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          id: folderId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("🗑️ 폴더가 삭제되었습니다.");
        if (selectedFolderId === folderId) {
          setSelectedFolderId(null);
        }
        reloadTaskFolders();
      } else {
        alert("폴더 삭제 실패: " + (data.error || "오류가 발생했습니다."));
      }
    } catch (e) {
      alert("폴더 삭제 중 오류가 발생했습니다.");
    }
  };

  // 아이템 폴더 이동 핸들러
  const handleMoveItemToFolder = async () => {
    if (!movingItem || !targetFolderId) {
      alert("이동할 대상 폴더를 선택해 주세요.");
      return;
    }
    try {
      const res = await apiFetch("/api/task-folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "move_item",
          itemId: movingItem.id,
          targetFolderId: targetFolderId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("📦 자료가 지정한 폴더로 이동되었습니다.");
        setIsMoveItemModalOpen(false);
        setMovingItem(null);
        setTargetFolderId("");
        reloadTaskFolders();
      } else {
        alert("이동 실패: " + (data.error || "오류가 발생했습니다."));
      }
    } catch (e) {
      alert("자료 이동 중 오류가 발생했습니다.");
    }
  };

  // 현장 수집 파일 업로드 및 폴더 적재
  const handleUploadCollectedFile = async (folderId: string, file: File, contentText: string = "") => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder_id", folderId);
      formData.append("title", contentText || file.name);

      const res = await apiFetch("/api/task-folders?action=upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        reloadTaskFolders();
        return true;
      }
      return false;
    } catch (e) {
      console.error("Failed to upload collected file:", e);
      return false;
    }
  };

  return {
    taskFolders,
    selectedFolderId,
    setSelectedFolderId,
    reloadTaskFolders,
    // 생성 모달
    isNewFolderModalOpen,
    setIsNewFolderModalOpen,
    newFolderName,
    setNewFolderName,
    newFolderDesc,
    setNewFolderDesc,
    handleCreateNewFolder,
    // 수정 모달
    isEditFolderModalOpen,
    setIsEditFolderModalOpen,
    editingFolder,
    setEditingFolder,
    editFolderName,
    setEditFolderName,
    editFolderDesc,
    setEditFolderDesc,
    handleSaveEditFolder,
    // 삭제
    handleDeleteFolder,
    // 이동 모달
    isMoveItemModalOpen,
    setIsMoveItemModalOpen,
    movingItem,
    setMovingItem,
    targetFolderId,
    setTargetFolderId,
    handleMoveItemToFolder,
    // 업로드
    handleUploadCollectedFile,
  };
}
