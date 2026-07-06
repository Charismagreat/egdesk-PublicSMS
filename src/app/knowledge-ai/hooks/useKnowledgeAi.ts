import { apiFetch } from '@/lib/api';
import React, { useState, useEffect, useRef } from "react";
import { KnowledgeDocument, AssetType, ChatMessage } from "../types";

export function useKnowledgeAi() {
  // 상태 변수
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<KnowledgeDocument | null>(null);
  
  // 동적 자산 종류 목록 상태
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [isAssetTypesLoading, setIsAssetTypesLoading] = useState(true);
  const [isTypeVaultOpen, setIsTypeVaultOpen] = useState(false);
  const [newAssetTypeName, setNewAssetTypeName] = useState("");
  const [vaultError, setVaultError] = useState<string | null>(null);

  // 모의 세션 권한 (Zero-Trust 데모용 토글 지원)
  const [currentUser, setCurrentUser] = useState("ceo_park");
  const [currentRole, setCurrentRole] = useState<"SUPER_ADMIN" | "PRESIDENT" | "SUB_OPERATOR">("SUPER_ADMIN");
  const [currentDept, setCurrentDept] = useState("STRATEGY");
  
  // 업로드 관련 상태
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadType, setUploadType] = useState(""); // 동적 바인딩을 위해 공백으로 초기화
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [autopilotAnimScore, setAutopilotAnimScore] = useState(0);
  const [showAutopilotModal, setShowAutopilotModal] = useState(false);
  const [autopilotResult, setAutopilotResult] = useState<any>(null);

  // 직접 입력 모드 및 내용 상태
  const [uploadMode, setUploadMode] = useState<"file" | "direct">("file");
  const [directContent, setDirectContent] = useState("");

  // 실시간 편집 상태
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editMetadata, setEditMetadata] = useState<Record<string, any>>({});
  const [editSecurityLevel, setEditSecurityLevel] = useState<"A" | "B" | "C">("A");

  // RAG 챗봇 관련 상태
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { 
      sender: "bot", 
      text: "안녕하세요! EGDESK 전사 지식 RAG 비서 이지봇입니다. 제로 트러스트 규정에 따라 승인 및 보안 심사가 완료된 사내 문서 기반의 안전한 의사결정을 실시간 지원합니다. 무엇이든 물어보세요!🎙️"
    }
  ]);
  const [isRecording, setIsRecording] = useState(false);

  // CAD 줌 상태
  const [cadZoom, setCadZoom] = useState(1);
  const [cadPan, setCadPan] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // 오디오 플레이어 시뮬레이션
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);

  // 1. 자산 종류(Category) 리스트 가져오기
  const fetchAssetTypes = async () => {
    setIsAssetTypesLoading(true);
    try {
      const res = await apiFetch("/api/knowledge-ai/types");
      const data = await res.json();
      if (data.success && data.assetTypes) {
        setAssetTypes(data.assetTypes);
        // 기본 기안 상신용 자산 종류 디폴트값 설정
        if (data.assetTypes.length > 0 && !uploadType) {
          setUploadType(data.assetTypes[0].type_name);
        }
      }
    } catch (err) {
      console.error("Failed to load asset types:", err);
    } finally {
      setIsAssetTypesLoading(false);
    }
  };

  // 2. 신규 자산 종류 등록 (최고관리자 권한 필요)
  const handleCreateAssetType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssetTypeName.trim()) return;
    setVaultError(null);

    try {
      const res = await apiFetch("/api/knowledge-ai/types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE",
          type_name: newAssetTypeName,
          user_role: currentRole,
          user_id: currentUser
        })
      });
      const data = await res.json();
      if (data.success) {
        setAssetTypes(data.assetTypes);
        setNewAssetTypeName("");
      } else {
        setVaultError(data.error);
      }
    } catch (err) {
      console.error(err);
      setVaultError("네트워크 오류가 발생했습니다.");
    }
  };

  // 3. 자산 종류 삭제 (최고관리자 권한 & 사용량 무결성 락 작동)
  const handleDeleteAssetType = async (id: string) => {
    setVaultError(null);
    try {
      const res = await apiFetch("/api/knowledge-ai/types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DELETE",
          id,
          user_role: currentRole,
          user_id: currentUser
        })
      });
      const data = await res.json();
      if (data.success) {
        setAssetTypes(data.assetTypes);
        // 혹시 업로드 선택된 상태였으면 첫번째로 재조정
        if (data.assetTypes.length > 0) {
          setUploadType(data.assetTypes[0].type_name);
        }
      } else {
        setVaultError(data.error);
      }
    } catch (err) {
      console.error(err);
      setVaultError("네트워크 오류가 발생했습니다.");
    }
  };

  // 지식 문서 데이터 로드
  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch(`/api/knowledge-ai?userId=${currentUser}&role=${currentRole}&dept=${currentDept}`);
      const data = await res.json();
      if (data.success) {
        setDocuments(data.documents);
        // 기본 첫 번째 문서를 디테일로 선택
        if (data.documents.length > 0 && !selectedDoc) {
          setSelectedDoc(data.documents[0]);
        } else if (selectedDoc) {
          const updated = data.documents.find((d: any) => d.document_id === selectedDoc.document_id);
          if (updated) {
            setSelectedDoc(updated);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load documents", err);
    } finally {
      setIsLoading(false);
    }
  };

  // 권한 등급 하향 조정 (Zero-Trust A -> B/C)
  const handleDowngradeSecurity = async (docId: string, newLevel: "B" | "C") => {
    try {
      const res = await apiFetch("/api/knowledge-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DOWNGRADE",
          document_id: docId,
          new_level: newLevel,
          user_role: currentRole
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        await fetchDocuments();
      } else {
        alert(`보안 에러: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 수동 결재 승인 / 반려
  const handleApproveDocument = async (docId: string, status: "APPROVED" | "REJECTED", comments: string) => {
    try {
      const res = await apiFetch("/api/knowledge-ai/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_id: docId,
          approver_id: currentUser,
          status,
          comments
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        await fetchDocuments();
      } else {
        alert(`결재 처리 에러: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 비정형 파일 시뮬레이션 업로드 또는 마크다운 직접 등록
  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim()) return alert("기안 문서 제목을 입력하십시오.");
    if (!uploadType) return alert("자산 종류를 지정하십시오.");
    if (uploadMode === "direct" && !directContent.trim()) {
      return alert("마크다운 입력 내용을 작성해 주세요.");
    }
    if (uploadMode === "file" && !uploadFile) {
      // 파일 등록 모드이지만 파일 누락 시 경고 (시뮬레이션이므로 임시 허용하지만 원칙적 락)
    }

    setIsUploading(true);
    setUploadProgress(10);

    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 20;
      });
    }, 150);

    setTimeout(async () => {
      try {
        const dummyFileName = 
          uploadMode === "direct" ? "direct_entry.md" :
          uploadType.includes("도면") ? "engine_casing_v4.dwg" :
          uploadType.includes("녹음") || uploadType.includes("영상") ? "board_meeting_0601.mp3" :
          uploadType.includes("명함") ? "partner_ceo_card.jpg" :
          "office_supplies_request.xlsx";

        const res = await apiFetch("/api/knowledge-ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "UPLOAD",
            title: uploadTitle,
            doc_type: uploadType,
            creator_id: currentUser,
            dept_code: currentDept,
            file_name: dummyFileName,
            file_size: uploadMode === "direct" 
              ? `${new Blob([directContent]).size} bytes` 
              : "4.2 MB",
            ...(uploadMode === "direct" ? { direct_content: directContent } : {})
          })
        });

        const data = await res.json();
        if (data.success) {
          setUploadProgress(100);
          setAutopilotResult(data.document);
          setShowAutopilotModal(true);
          
          let currentScore = 0;
          const target = data.document.autopilot_score;
          const scoreInterval = setInterval(() => {
            currentScore += 3;
            if (currentScore >= target) {
              setAutopilotAnimScore(target);
              clearInterval(scoreInterval);
            } else {
              setAutopilotAnimScore(currentScore);
            }
          }, 30);

          setUploadTitle("");
          setUploadFile(null);
          setDirectContent(""); // 성공 시 초기화
          await fetchDocuments();
        } else {
          alert(`기안 상신 실패: ${data.error}`);
        }
      } catch (err: any) {
        console.error(err);
        alert(`네트워크 오류가 발생했습니다: ${err.message}`);
      } finally {
        setIsUploading(false);
      }
    }, 1000);
  };

  // 등록된 지식 문서 수정(업데이트) API 호출
  const handleUpdateDocument = async (docId: string, content: string, metadata?: Record<string, any>, securityLevel?: "A" | "B" | "C") => {
    try {
      const res = await apiFetch("/api/knowledge-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE",
          document_id: docId,
          content,
          ...(metadata ? { metadata } : {}),
          ...(securityLevel ? { security_level: securityLevel } : {})
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsEditing(false);
        alert(data.message);
        await fetchDocuments();
      } else {
        alert(`수정 실패: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert("지식 수정 중 오류가 발생했습니다.");
    }
  };

  // 등록된 지식 문서 삭제 API 호출
  const handleDeleteDocument = async (docId: string) => {
    if (!confirm("정말로 이 지식 자산을 삭제하시겠습니까?\n삭제된 지식은 RAG 검색 대상에서 제외됩니다.")) return;
    try {
      const res = await apiFetch("/api/knowledge-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DELETE",
          document_id: docId
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        // 만약 선택된 지식이 삭제 대상이면 선택을 초기화하거나 해제
        if (selectedDoc?.document_id === docId) {
          setSelectedDoc(null);
        }
        await fetchDocuments();
      } else {
        alert(`삭제 실패: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert("지식 삭제 중 오류가 발생했습니다.");
    }
  };

  // RAG 질문 발송
  const handleSendChat = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput;
    setChatMessages(prev => [...prev, { sender: "user", text: userText }]);
    setChatInput("");

    setTimeout(() => {
      let responseText = "";
      let responseTable: Array<Record<string, string>> | undefined = undefined;
      let docLink: string | undefined = undefined;

      const lower = userText.toLowerCase();

      if (lower.includes("배터리") || lower.includes("cad") || lower.includes("도면")) {
        if (currentRole === "SUPER_ADMIN" || currentRole === "PRESIDENT") {
          responseText = "차세대 초경량 배터리팩 3D 설계도(doc-cad-001)에 따르면, 에너지 밀도 개선을 위해 핵심 다이캐스팅 압착 프레임 설계와 냉각 통로가 탑재되어 있습니다. 분석된 핵심 자재 BOM 리스트는 다음과 같습니다.";
          responseTable = [
            { "품목명": "알루미늄 프레임 AL-6061", "수량": "4개", "공정": "CNC가공" },
            { "품목명": "전력 동박 버스바 (Copper)", "수량": "2개", "공정": "특수압착" },
            { "품목명": "수랭식 냉각 플레이트 V2", "수량": "1개", "공정": "레이저밀봉" }
          ];
          docLink = "doc-cad-001";
        } else {
          responseText = "⚠️ 접근이 거부되었습니다. [차세대 초경량 배터리팩 3D 설계도]는 최고 기밀(A 등급) 자산으로 규정되어 있어 현재 질문자님의 보안 등급 세션에서는 내용 열람 및 RAG 컨텍스트 접근이 원천 봉쇄됩니다.";
        }
      } 
      else if (lower.includes("회의록") || lower.includes("녹취") || lower.includes("m&a")) {
        if (currentRole === "SUPER_ADMIN" || currentRole === "PRESIDENT") {
          responseText = "글로벌 M&A 전략 회의록(doc-audio-001) 분석 결과, 북미 현지 벤처 인수를 위한 제안 예산 한도는 45억 원으로 의결되었으며 핵심 액션 아이템은 다음과 같습니다.";
          responseTable = [
            { "담당자": "최윤석 부사장", "업무": "투자사 LOI(의향서) 법률 자문", "기한": "2026-07-15" },
            { "담당자": "강수진 전략본부장", "업무": "베타 서비스 인프라 RAG 관제 및 PV 테스트", "기한": "2026-08-01" }
          ];
          docLink = "doc-audio-001";
        } else {
          responseText = "⚠️ 접근이 거부되었습니다. 해당 회의 녹취 정보는 A등급 최고 기밀 자산입니다. 최고관리자의 공식 심사 하향 처리가 완료되기 전까지는 검색 및 요약이 차단됩니다.";
        }
      } 
      else if (lower.includes("실적") || lower.includes("영업") || lower.includes("마진")) {
        if (currentRole === "SUPER_ADMIN" || currentRole === "PRESIDENT" || currentDept === "SALES") {
          responseText = "2026년 2분기 영업본부 실적 보고서(doc-report-001)에 따르면, 핵심 B2B 파트너사의 오더량이 15% 가량 증가하여 총 영업 이익이 전분기 대비 8.5% 가량 큰 폭으로 개선되었습니다. 요약 지표는 다음과 같습니다.";
          responseTable = [
            { "구분": "총 영업 매출액", "지표": "4억 8천만원", "성장률": "+12.4%" },
            { "구분": "최종 영업 이익", "지표": "5,200만원", "성장률": "+8.5%" },
            { "구분": "공헌 마진율", "지표": "10.8%", "성장률": "+1.1%p" }
          ];
          docLink = "doc-report-001";
        } else {
          responseText = "⚠️ 접근이 거부되었습니다. [영업본부 실적 및 마진 보고서]는 B등급 부서 대외비 자산입니다. 질문자님의 소속 부서(STRATEGY)가 기안 부서(SALES)와 다르며 부서 권한이 부여되지 않았습니다.";
        }
      } 
      else if (lower.includes("주유비") || lower.includes("청구") || lower.includes("유류")) {
        responseText = "영업본부 외근용 차량 주유비 지급 청구서(doc-draft-001) 분석 결과, 김도현 주임이 상신한 6월분 주유비(78,000원)는 10만 원 이하의 소액 정형 지출 건에 해당하여 AI 파일럿(Autopilot)에 의해 전결 자동 승인 완료된 지식 문서입니다.";
        docLink = "doc-draft-001";
      } 
      else if (lower.includes("명함") || lower.includes("한울테크") || lower.includes("김진수")) {
        responseText = "한울테크 바이어 명함 연동 데이터(doc-card-001)에 근거한 김진수 상무님의 인적 명세 정보입니다.";
        responseTable = [
          { "항목": "소속 및 회사", "값": "한울테크 (Hanul Tech)" },
          { "항목": "이름 및 직급", "값": "김진수 상무" },
          { "항목": "휴대폰 연락처", "값": "010-3456-7890" },
          { "항목": "이메일 주소", "값": "jskim@hanultech.com" }
        ];
        docLink = "doc-card-001";
      } 
      else {
        responseText = "질문하신 내용과 연관된 사내 지식 문서를 RAG 검색망에서 탐색하지 못했거나, 보안 필터링 규정에 따라 격리되었습니다. 질문 키워드를 구체적으로 입력하시거나 (예: '배터리 도면', '영업 실적', '회의록'), 최고관리자 계정을 통해 보안 등급 심사를 진행해 주십시오.";
      }

      setChatMessages(prev => [...prev, { 
        sender: "bot", 
        text: responseText,
        tableData: responseTable,
        docLink
      }]);
    }, 800);
  };

  // 음성 질문 시뮬레이션
  const handleMicClick = () => {
    if (isRecording) {
      setIsRecording(false);
      setChatInput("2분기 영업본부 마진 및 실적 요약해줘");
    } else {
      setIsRecording(true);
      setChatInput("🎙️ 목소리 녹취 분석 중...");
      setTimeout(() => {
        setIsRecording(false);
        setChatInput("차세대 초경량 배터리팩 도면의 BOM 리스트 알려줘");
      }, 2000);
    }
  };

  // CAD 드래그 및 팬 시뮬레이션
  const handleCadMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    dragStart.current = { x: e.clientX - cadPan.x, y: e.clientY - cadPan.y };
  };

  const handleCadMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    setCadPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handleCadMouseUp = () => {
    isDragging.current = false;
  };

  // 실제 세션 사용자 정보 로드
  useEffect(() => {
    const fetchSessionUser = async () => {
      try {
        const res = await apiFetch("/api/auth/me");
        const data = await res.json();
        if (data.success) {
          setCurrentUser(data.username || "guest");
          
          if (data.role === "SUPER_ADMIN") {
            setCurrentRole("SUPER_ADMIN");
            setCurrentDept("STRATEGY");
          } else if (data.role === "EMPLOYEE") {
            setCurrentRole("SUB_OPERATOR");
            setCurrentDept("RND");
          } else {
            setCurrentRole("SUB_OPERATOR");
            setCurrentDept("SALES");
          }
        }
      } catch (err) {
        console.error("실제 세션 조회 실패:", err);
      }
    };
    fetchSessionUser();
  }, []);

  // 훅 이펙트 바인딩
  useEffect(() => {
    // 세션 로드가 완료되어 currentUser가 guest가 아니거나 guest라도 첫 로드 수행
    fetchAssetTypes();
    fetchDocuments();
  }, [currentUser, currentRole, currentDept]);

  useEffect(() => {
    let timer: any;
    if (isPlayingAudio) {
      timer = setInterval(() => {
        setAudioProgress(prev => {
          if (prev >= 100) {
            setIsPlayingAudio(false);
            return 0;
          }
          return prev + 2.5;
        });
      }, 200);
    }
    return () => clearInterval(timer);
  }, [isPlayingAudio]);

  return {
    documents,
    isLoading,
    selectedDoc,
    setSelectedDoc,
    assetTypes,
    isAssetTypesLoading,
    isTypeVaultOpen,
    setIsTypeVaultOpen,
    newAssetTypeName,
    setNewAssetTypeName,
    vaultError,
    setVaultError,
    currentUser,
    setCurrentUser,
    currentRole,
    setCurrentRole,
    currentDept,
    setCurrentDept,
    uploadTitle,
    setUploadTitle,
    uploadType,
    setUploadType,
    uploadFile,
    setUploadFile,
    isUploading,
    uploadProgress,
    autopilotAnimScore,
    setAutopilotAnimScore,
    showAutopilotModal,
    setShowAutopilotModal,
    autopilotResult,
    chatInput,
    setChatInput,
    chatMessages,
    isRecording,
    cadZoom,
    setCadZoom,
    cadPan,
    setCadPan,
    isPlayingAudio,
    setIsPlayingAudio,
    audioProgress,
    uploadMode,
    setUploadMode,
    directContent,
    setDirectContent,
    isEditing,
    setIsEditing,
    editContent,
    setEditContent,
    editMetadata,
    setEditMetadata,
    editSecurityLevel,
    setEditSecurityLevel,
    handleCreateAssetType,
    handleDeleteAssetType,
    handleDowngradeSecurity,
    handleApproveDocument,
    handleFileUpload,
    handleUpdateDocument,
    handleDeleteDocument,
    handleSendChat,
    handleMicClick,
    handleCadMouseDown,
    handleCadMouseMove,
    handleCadMouseUp
  };
}
