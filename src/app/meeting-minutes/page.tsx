"use client";

import { apiFetch } from '@/lib/api';
import { useState, useEffect, useRef } from "react";
import { 
  Mic, MicOff, StopCircle, Mail, Play, CheckCircle2, Clock, 
  ArrowLeft, Calendar, Users, Lightbulb, Sparkles, Plus, X, 
  ChevronRight, RefreshCw, FileText, CheckSquare, Square, Trash2, ArrowUpRight, Upload, Pencil, Image, Eye, Download
} from "lucide-react";



const getFileType = (url: string): "audio" | "image" | "text" | "other" => {
  if (!url) return "other";
  const ext = url.split("?")[0].split("#")[0].split(".").pop()?.toLowerCase();
  if (!ext) return "other";
  if (["mp3", "wav", "m4a", "webm", "ogg"].includes(ext)) return "audio";
  if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) return "image";
  if (["txt", "eml", "html", "md"].includes(ext)) return "text";
  return "other";
};

export default function MeetingMinutesPage() {
  // 상태 관리
  const [meetings, setMeetings] = useState<any[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<any | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<"list" | "active" | "detail">("list");

  // 회의명 직접 수정 관련 상태
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitleVal, setEditingTitleVal] = useState("");

  // 실시간/업로드 회의 오디오 원본 재생 URL
  const [tempAudioUrl, setTempAudioUrl] = useState<string>("");

  // 회의명 수정 저장 핸들러
  const handleSaveTitle = async (meetingId: number, newTitleVal: string) => {
    const trimmed = newTitleVal.trim();
    if (!trimmed) {
      alert("회의명을 입력해주세요.");
      return;
    }
    try {
      const res = await apiFetch("/api/meeting-minutes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sync",
          meetingId,
          title: trimmed
        })
      });
      const data = await res.json();
      if (data.success) {
        if (selectedMeeting && selectedMeeting.id === meetingId) {
          setSelectedMeeting((prev: any) => ({ ...prev, title: trimmed }));
        }
        setIsEditingTitle(false);
        fetchMeetings(); // 목록 갱신
      } else {
        alert(data.error || "회의명 변경에 실패했습니다.");
      }
    } catch (err) {
      console.error("회의명 변경 실패:", err);
      alert("회의명 변경 중 오류가 발생했습니다.");
    }
  };

  // 마이크 오디오/업로드 파일 오디오 URL 추출 헬퍼 함수 (디바이스 스키마 캐시 유실 우회)
  const getMeetingAudioUrl = (meet: any) => {
    if (!meet) return "";
    if (meet.audio_url) return meet.audio_url;
    if (meet.summary) {
      const match = meet.summary.match(/\[audio_url\]:\s*(.+)/);
      if (match) return match[1].trim();
    }
    return "";
  };

  // 회의 타입(실시간/오디오업로드/텍스트) 반환 함수
  const getMeetingType = (meet: any): "audio" | "text" => {
    if (!meet) return "audio";
    if (meet.meeting_type) return meet.meeting_type;
    if (meet.summary) {
      const match = meet.summary.match(/\[meeting_type\]:\s*(.+)/);
      if (match) return match[1].trim() as any;
    }
    // 오디오 URL이 있으면 audio, 없으면 text
    if (getMeetingAudioUrl(meet)) return "audio";
    return "text";
  };

  // 마크다운 요약에서 1줄 요약 추출하는 헬퍼 함수
  const getOneLineSummary = (summaryText: string) => {
    if (!summaryText) return "요약 정보가 아직 작성되지 않았습니다.";
    
    // [audio_url] 및 [meeting_type] 메타데이터 링크 본문에서 도려내기
    const cleanSummaryText = summaryText
      .replace(/\[audio_url\]:\s*.*/g, "")
      .replace(/\[meeting_type\]:\s*.*/g, "")
      .trim();
    if (!cleanSummaryText) return "요약 정보가 아직 작성되지 않았습니다.";

    // 마크다운 문법 제거 (#, *, ` 등)
    const cleanText = cleanSummaryText
      .replace(/[#*`_\-]/g, "") // 마크다운 기호 제거
      .replace(/\[.*?\]/g, "")  // 대괄호와 링크 제거
      .replace(/\s+/g, " ")     // 다중 공백 단일 공백으로 치환
      .trim();

    // 0. 한줄 요약 부분을 명시적으로 찾기
    const oneLineMatch = cleanText.match(/한줄\s*요약\s*:\s*(.*?)(?=\s*[0-9]\.|\s*회의\s*개요|$)/i);
    if (oneLineMatch && oneLineMatch[1]) {
      const matchedText = oneLineMatch[1].trim();
      return matchedText.length > 200 ? matchedText.slice(0, 200) + "..." : matchedText;
    }

    // [한줄 요약] 패턴 매칭
    const bracketMatch = cleanText.match(/\[한줄\s*요약\]\s*(.*?)(?=\s*[0-9]\.|\s*회의\s*개요|$)/i);
    if (bracketMatch && bracketMatch[1]) {
      const matchedText = bracketMatch[1].trim();
      return matchedText.length > 200 ? matchedText.slice(0, 200) + "..." : matchedText;
    }

    // 만약 요약서 맨 앞부분에 "회의 개요" 혹은 "일시" 메타데이터가 나온다면, 이를 건너뛰고
    // "주요 의제 및 결정 사항"이나 그 이후의 실질적인 요약 텍스트를 추출
    const agendaIndex = cleanText.indexOf("주요 의제 및 결정 사항");
    if (agendaIndex !== -1) {
      const remainingText = cleanText.slice(agendaIndex + "주요 의제 및 결정 사항".length).trim();
      // 혹시 뒤에 숫자가 오거나 콜론이 오면 제거
      const cleanedRemaining = remainingText.replace(/^[:\s\d.]+/g, "").trim();
      if (cleanedRemaining.length > 10) {
        return cleanedRemaining.length > 200 ? cleanedRemaining.slice(0, 200) + "..." : cleanedRemaining;
      }
    }

    const discussionIndex = cleanText.indexOf("주요 논의 내용");
    if (discussionIndex !== -1) {
      const remainingText = cleanText.slice(discussionIndex + "주요 논의 내용".length).trim();
      const cleanedRemaining = remainingText.replace(/^[:\s\d.]+/g, "").trim();
      if (cleanedRemaining.length > 10) {
        return cleanedRemaining.length > 200 ? cleanedRemaining.slice(0, 200) + "..." : cleanedRemaining;
      }
    }

    // 폴백: "회의 개요" 텍스트 부분을 삭제하여 첫 실질적 내용 추출 시도
    let fallbackText = cleanText;
    if (fallbackText.includes("회의 개요")) {
      fallbackText = fallbackText.split("회의 개요")[1] || fallbackText;
      // 일시, 참석자 데이터가 이어서 나오면 이것도 슬라이싱
      const attendeeIndex = fallbackText.indexOf("참석자");
      if (attendeeIndex !== -1) {
        // 참석자 명단 이후의 텍스트
        const temp = fallbackText.slice(attendeeIndex).trim();
        const nextDotIndex = temp.indexOf(".");
        if (nextDotIndex !== -1 && temp.slice(nextDotIndex + 1).trim().length > 10) {
          fallbackText = temp.slice(nextDotIndex + 1).trim();
        }
      }
    }

    fallbackText = fallbackText.replace(/^[:\s\d.]+/g, "").trim();
    return fallbackText.length > 200 ? fallbackText.slice(0, 200) + "..." : fallbackText;
  };
  
  // 새 회의 작성 폼
  const [newTitle, setNewTitle] = useState("");
  const [attendeeName, setAttendeeName] = useState("");
  const [attendeeEmail, setAttendeeEmail] = useState("");
  const [tempAttendees, setTempAttendees] = useState<{ name: string; email: string }[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // 실시간 회의 중 상태
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState<{ id: string; speaker: string; text: string; time: string; isDiarizing?: boolean }[]>([]);
  const [currentSpeech, setCurrentSpeech] = useState("");
  const [speechSpeaker, setSpeechSpeaker] = useState("화자 1");
  const speechSpeakerRef = useRef("화자 1");

  useEffect(() => {
    speechSpeakerRef.current = speechSpeaker;
  }, [speechSpeaker]);

  // 동적 가칭 화자 리스트 상태
  const [activeSpeakers, setActiveSpeakers] = useState<string[]>(["화자 1", "화자 2", "화자 3", "화자 4"]);
  
  // 화자 매핑 및 모달 상태
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [speakerMapping, setSpeakerMapping] = useState<Record<string, string>>({});

  // 상세 보기 화면 탭 상태
  const [detailTab, setDetailTab] = useState<"summary" | "transcript">("summary");

  // 대화록(transcript)에 기재된 임시 화자가 생겨나면 activeSpeakers에 자동 누적 동기화
  useEffect(() => {
    if (transcript && transcript.length > 0) {
      const uniqueSpeakers = Array.from(new Set(transcript.map(t => t.speaker)));
      setActiveSpeakers(prev => {
        const next = [...prev];
        let changed = false;
        uniqueSpeakers.forEach(sp => {
          if (sp && sp.startsWith("화자 ") && !next.includes(sp)) {
            next.push(sp);
            changed = true;
          }
        });
        if (changed) {
          return next.sort((a, b) => {
            const numA = parseInt(a.replace("화자 ", "")) || 0;
            const numB = parseInt(b.replace("화자 ", "")) || 0;
            return numA - numB;
          });
        }
        return prev;
      });
    }
  }, [transcript]);

  // selectedMeeting 변경 시 화자를 기본 "화자 1"로 세팅
  useEffect(() => {
    setSpeechSpeaker("화자 1");
  }, [selectedMeeting]);

  // 진행 중인 회의 복원 시 전역에 보존된 오디오 청크 복구
  useEffect(() => {
    if (selectedMeeting && typeof window !== "undefined") {
      const meetId = selectedMeeting.id;
      const backup = (window as any).__ongoing_meeting_audio_chunks?.[meetId];
      if (backup && backup.length > 0) {
        audioChunksRef.current = [...backup];
        console.log(`🎙️ Backup audio chunks restored for meeting ${meetId}. Size:`, backup.length);
      }
    }
  }, [selectedMeeting]);

  const getActiveAttendees = () => {
    if (!selectedMeeting) return ["나 (회의 참여자)", "홍길동 대표", "김철수 과장", "이영희 대리"];
    try {
      const parsed = JSON.parse(selectedMeeting.attendees || "[]");
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((a: any) => a.name);
      }
    } catch (e) {
      console.error("참석자 목록 조회 오류:", e);
    }
    return ["나 (회의 참여자)", "홍길동 대표", "김철수 과장", "이영희 대리"];
  };
  const [recommendedMeetings, setRecommendedMeetings] = useState<any[]>([]);
  const [interimAdvice, setInterimAdvice] = useState<string>("");
  const [showInterimModal, setShowInterimModal] = useState(false);
  const [isAnalyzingInterim, setIsAnalyzingInterim] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  // 오디오 파일 업로드 및 분석 상태
  const [isAudioAnalyzing, setIsAudioAnalyzing] = useState(false);
  const [audioAnalysisStep, setAudioAnalysisStep] = useState("");

  // 과거 회의 요약 뷰어 모달
  const [viewPastSummary, setViewPastSummary] = useState<any | null>(null);

  // 이메일 발송 관련
  const [sendRecipients, setSendRecipients] = useState<{ name: string; email: string }[]>([]);
  const [isSendingMail, setIsSendingMail] = useState(false);
  const [mailResult, setMailResult] = useState<string | null>(null);

  // Refs
  const shouldSTTActiveRef = useRef(false);
  const recognitionRef = useRef<any>(null);

  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const lastRecommendLengthRef = useRef<number>(0);

  // 🎙️ MediaRecorder 상태 및 Refs 추가
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);

  // 1. 초기 로딩: 회의록 목록 획득 및 진행 중인 회의 복구
  useEffect(() => {
    const initFetch = async () => {
      try {
        const res = await apiFetch("/api/meeting-minutes");
        const data = await res.json();
        if (data.success) {
          setMeetings(data.meetings);
          
          // 진행 중인 회의(ONGOING)가 존재하면 즉시 복구 및 회의 화면 진입
          const ongoingMeeting = data.meetings.find((m: any) => m.status === "ONGOING");
          if (ongoingMeeting) {
            setSelectedMeeting(ongoingMeeting);
            try {
              const parsedTrans = JSON.parse(ongoingMeeting.transcript || "[]");
              setTranscript(parsedTrans);
            } catch (e) {
              console.error("진행 중인 회의 대화록 복구 실패:", e);
              setTranscript([]);
            }
            setViewMode("active");
          }
        }
      } catch (e) {
        console.error("초기 목록 조회 실패:", e);
      }
    };

    initFetch();
  }, []);

  // 1-1. 대화록 실시간 백그라운드 동기화 (다른 페이지 이동 시 유실 방지)
  useEffect(() => {
    if (viewMode !== "active" || !selectedMeeting) return;

    const syncTranscript = async () => {
      try {
        await apiFetch("/api/meeting-minutes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "sync",
            meetingId: selectedMeeting.id,
            transcript: transcript
          })
        });
      } catch (e) {
        console.error("회의록 실시간 동기화 에러:", e);
      }
    };

    const timer = setTimeout(syncTranscript, 1000);
    return () => clearTimeout(timer);
  }, [transcript, viewMode, selectedMeeting]);

  // 대화록 추가 시 하단 스크롤 자동 이동
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
    
    // 회의 진행 중, 대화량이 3문장 추가될 때마다 과거 회의 시맨틱 추천 트리거
    if (viewMode === "active" && transcript.length > 0 && transcript.length % 3 === 0 && transcript.length !== lastRecommendLengthRef.current) {
      lastRecommendLengthRef.current = transcript.length;
      triggerSemanticRecommendation();
    }
  }, [transcript, viewMode]);

  const fetchMeetings = async () => {
    try {
      const res = await apiFetch("/api/meeting-minutes");
      const data = await res.json();
      if (data.success) {
        setMeetings(data.meetings);
      }
    } catch (e) {
      console.error("회의 목록 조회 실패:", e);
    }
  };

  const handleDeleteMeeting = async (e: React.MouseEvent, meetingId: number) => {
    e.stopPropagation(); // 카드 상세보기 클릭 이벤트 차단

    if (!confirm("정말로 이 회의록을 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.")) {
      return;
    }

    try {
      const res = await apiFetch(`/api/meeting-minutes?meetingId=${meetingId}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        alert("회의록이 성공적으로 삭제되었습니다.");
        fetchMeetings(); // 목록 갱신
      } else {
        alert(data.error || "회의록 삭제에 실패했습니다.");
      }
    } catch (err) {
      console.error("회의록 삭제 오류:", err);
      alert("서버 통신 중 오류가 발생했습니다.");
    }
  };

  const fetchTasks = async (meetingId: number) => {
    try {
      const res = await apiFetch(`/api/meeting-minutes/tasks?meetingId=${meetingId}`);
      const data = await res.json();
      if (data.success) {
        setTasks(data.tasks);
      }
    } catch (e) {
      console.error("할 일 조회 실패:", e);
    }
  };

  // 날짜/시간 기반 자동 회의명 생성
  const getAutoMeetingTitle = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes} 회의`;
  };

  // 2. 새 회의 만들기
  const handleStartMeeting = async () => {
    const finalTitle = newTitle.trim() || getAutoMeetingTitle();

    try {
      const res = await apiFetch("/api/meeting-minutes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          title: finalTitle,
          attendees: tempAttendees
        })
      });
      const data = await res.json();
      if (data.success) {
        setSelectedMeeting(data.meeting);
        setTranscript([]);
        setTempAudioUrl("");
        setActiveSpeakers(["화자 1", "화자 2", "화자 3", "화자 4"]);
        setSpeechSpeaker("화자 1");
        setRecommendedMeetings([]);
        setInterimAdvice("");
        setViewMode("active");
        setShowCreateModal(false);
        setNewTitle("");
        setTempAttendees([]);
        lastRecommendLengthRef.current = 0;
      } else {
        alert(data.error || "회의 개시에 실패했습니다.");
      }
    } catch (e) {
      console.error("회의 개시 오류:", e);
    }
  };

  const addAttendee = () => {
    if (!attendeeName.trim() || !attendeeEmail.trim()) {
      alert("참석자 이름과 이메일을 모두 기입해 주세요.");
      return;
    }
    if (!attendeeEmail.includes("@")) {
      alert("올바른 이메일 주소를 입력해 주세요.");
      return;
    }
    setTempAttendees([...tempAttendees, { name: attendeeName.trim(), email: attendeeEmail.trim() }]);
    setAttendeeName("");
    setAttendeeEmail("");
  };

  const removeAttendee = (idx: number) => {
    setTempAttendees(tempAttendees.filter((_, i) => i !== idx));
  };

  // 3. 실시간 음성인식 (STT) 제어
  const startSTT = async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("현재 브라우저는 음성 인식을 지원하지 않습니다. 크롬이나 에지 브라우저를 사용하시거나 [녹음 파일 업로드] 기능을 이용해 주세요.");
      return;
    }

    // 명시적으로 STT 가동 상태로 기록
    shouldSTTActiveRef.current = true;

    // 🎙️ 마이크 스트림 획득 및 MediaRecorder 백그라운드 녹음 시작
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);
      
      // 기존에 누적된 오디오 청크 백업이 있다면 복원하여 이어받고, 없으면 초기화
      const meetId = selectedMeeting?.id;
      if (meetId && typeof window !== "undefined" && (window as any).__ongoing_meeting_audio_chunks?.[meetId]) {
        audioChunksRef.current = [...(window as any).__ongoing_meeting_audio_chunks[meetId]];
      } else {
        audioChunksRef.current = [];
      }

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
          
          // 전역 백업에도 실시간 동시 누적
          if (meetId && typeof window !== "undefined") {
            (window as any).__ongoing_meeting_audio_chunks = (window as any).__ongoing_meeting_audio_chunks || {};
            (window as any).__ongoing_meeting_audio_chunks[meetId] = (window as any).__ongoing_meeting_audio_chunks[meetId] || [];
            (window as any).__ongoing_meeting_audio_chunks[meetId].push(e.data);
          }
        }
      };
      mediaRecorder.onstop = () => {
        console.log("🎙️ MediaRecorder stopped. Chunks length:", audioChunksRef.current.length);
        if (audioChunksRef.current && audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          const blobUrl = URL.createObjectURL(audioBlob);
          setTempAudioUrl(blobUrl);
        }
      };
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // 1초 단위 데이터 수집
    } catch (micErr) {
      console.warn("🎙️ 마이크 음성 녹음 시작 실패 (STT만 가동):", micErr);
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "ko-KR";

    rec.onstart = () => {
      setIsRecording(true);
    };

    rec.onresult = (event: any) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      if (interim) {
        setCurrentSpeech(interim);
      }

      if (final) {
        const timeStr = new Date().toLocaleTimeString("ko-KR", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
        const newId = `stt-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        setTranscript(prev => [...prev, {
          id: newId,
          speaker: speechSpeakerRef.current,
          text: final.trim(),
          time: timeStr,
          isDiarizing: true
        }]);
        setCurrentSpeech("");
        
        // 백그라운드 자동 화자 판별 트리거
        triggerAutoDiarization(newId, final.trim());
      }
    };

    rec.onerror = (e: any) => {
      // no-speech의 경우 단순 대기 연장이므로 불필요한 console.error 뻘건 로그를 방지하기 위해 console.log로 기록
      if (e.error === "no-speech") {
        console.log("🎤 일정 시간 동안 발화가 감지되지 않아 마이크 대기 모드로 전환합니다. (no-speech)");
        return;
      }

      console.error("음성인식 에러:", e.error || e);
      
      // 사용자 친화적 에러 메시지 알림 및 예외 처리
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        alert("🎤 마이크 사용 권한이 거부되었습니다.\n브라우저 주소창 왼쪽 자물쇠/설정 아이콘을 눌러 마이크 접근을 허용해 주십시오.");
        shouldSTTActiveRef.current = false;
        setIsRecording(false);
      } else if (e.error === "audio-capture") {
        alert("🎤 기기에 마이크가 연결되어 있지 않거나 감지되지 않습니다.\n마이크 연결 상태를 다시 한 번 확인해 주십시오.");
        shouldSTTActiveRef.current = false;
        setIsRecording(false);
      } else if (e.error === "network") {
        alert("🌐 구글 음성인식 서버와의 네트워크 연결이 원활하지 않습니다.\n잠시 후 다시 시도해 주십시오.");
        shouldSTTActiveRef.current = false;
        setIsRecording(false);
      }
    };

    rec.onend = () => {
      // 사용자가 명시적으로 끄지 않았는데 끊긴 경우(예: no-speech나 일정 타임아웃), 자동 재연결 시도
      if (shouldSTTActiveRef.current && recognitionRef.current) {
        console.log("🎤 음성인식 세션 만료 감지 -> 백그라운드 자동 재연결 개시...");
        // 이전 세션이 브라우저에서 완전히 정리된 후 신규 세션을 열 수 있게 100ms 지연 기동 적용 (타이밍 교착 예방)
        setTimeout(() => {
          if (shouldSTTActiveRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (startErr) {
              console.warn("🎤 음성인식 재가동 시도 실패 (재시도 예정):", startErr);
              setTimeout(() => {
                if (shouldSTTActiveRef.current && recognitionRef.current) {
                  try { recognitionRef.current.start(); } catch (err) {}
                }
              }, 1000);
            }
          }
        }, 100);
      } else {
        setIsRecording(false);
      }
    };

    recognitionRef.current = rec;
    rec.start();
  };

  const stopSTT = () => {
    // 사용자가 명시적으로 STT를 비활성화함
    shouldSTTActiveRef.current = false;

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    // 🎙️ MediaRecorder 및 마이크 스트림 정지
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop());
      setAudioStream(null);
    }

    setIsRecording(false);
    setCurrentSpeech("");
  };

  // 회의 중 동적으로 임시 화자 추가
  const handleAddSpeaker = () => {
    setActiveSpeakers(prev => {
      const numbers = prev.map(s => parseInt(s.replace("화자 ", "")) || 0);
      const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0;
      const nextSpeaker = `화자 ${maxNum + 1}`;
      setSpeechSpeaker(nextSpeaker);
      return [...prev, nextSpeaker];
    });
  };

  // 3-1. 백그라운드 AI 자동 화자 분리 (Diarization)
  const triggerAutoDiarization = async (transcriptId: string, text: string) => {
    // 직전 5개의 대화 문맥 정보 수집
    const context = transcript.slice(-5).map(t => ({ speaker: t.speaker, text: t.text }));

    try {
      const res = await apiFetch("/api/meeting-minutes/diarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          attendees: activeSpeakers, // 동적 가칭 화자 리스트 전송
          context
        })
      });
      const data = await res.json();
      if (data.success && data.speaker) {
        setTranscript(prev => prev.map(item => 
          item.id === transcriptId 
            ? { ...item, speaker: data.speaker, isDiarizing: false }
            : item
        ));
      } else {
        setTranscript(prev => prev.map(item => 
          item.id === transcriptId 
            ? { ...item, isDiarizing: false }
            : item
        ));
      }
    } catch (err) {
      console.error("자동 화자 분리 처리 실패:", err);
      setTranscript(prev => prev.map(item => 
        item.id === transcriptId 
          ? { ...item, isDiarizing: false }
          : item
      ));
    }
  };

  // 4. 회의 녹음/텍스트 파일 업로드 및 분석
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!selectedMeeting) {
      alert("진행 중인 회의가 없습니다. 먼저 회의를 개설해 주세요.");
      return;
    }

    // 파일명(확장자 제거)으로 회의명 설정
    const rawFileName = file.name;
    const cleanTitle = rawFileName.substring(0, rawFileName.lastIndexOf('.')) || rawFileName;
    const isTextFile = file.type === "text/plain" || rawFileName.endsWith(".txt") || rawFileName.endsWith(".eml");
    const isImageFile = file.type.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(rawFileName);

    setIsAudioAnalyzing(true);
    setAudioAnalysisStep("1단계: 파일 서버 업로드 및 회의명 동기화 중...");

    try {
      // 회의명 먼저 동기화
      await apiFetch("/api/meeting-minutes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sync",
          meetingId: selectedMeeting.id,
          title: cleanTitle
        })
      });

      setSelectedMeeting((prev: any) => ({
        ...prev,
        title: cleanTitle
      }));

      // 1. 파일 업로드 API 호출
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await apiFetch("/api/meeting-minutes/upload", {
        method: "POST",
        body: formData
      });
      const uploadData = await uploadRes.json();

      if (!uploadData.success) {
        throw new Error(uploadData.error || "파일 업로드에 실패했습니다.");
      }

      let formattedTranscript = [];

      if (isTextFile) {
        setAudioAnalysisStep("2단계: Gemini AI 대화 내용 및 화자 분석 중...");

        // 텍스트 대화록 분석 API 호출
        const analyzeRes = await apiFetch("/api/meeting-minutes/analyze-text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ textUrl: uploadData.audioUrl })
        });
        const analyzeData = await analyzeRes.json();

        if (!analyzeData.success) {
          throw new Error(analyzeData.error || "텍스트 대화록 분석에 실패했습니다.");
        }

        formattedTranscript = (analyzeData.transcript || []).map((item: any, idx: number) => ({
          id: `upload-${Date.now()}-${idx}`,
          speaker: item.speaker || "미상",
          time: item.time || "00:00",
          text: item.text || ""
        }));

        setTranscript(formattedTranscript);

        setSelectedMeeting((prev: any) => ({
          ...prev,
          meeting_type: 'text',
          audio_url: uploadData.audioUrl
        }));
        setTempAudioUrl(uploadData.audioUrl);

        // 진행 중인 상태 대화록 동기화 (회의 타입도 함께 동기화)
        await apiFetch("/api/meeting-minutes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "sync",
            meetingId: selectedMeeting.id,
            transcript: formattedTranscript,
            audioUrl: uploadData.audioUrl,
            meetingType: 'text'
          })
        });

        alert("🎉 텍스트 대화록 분석 및 파싱이 성공적으로 완료되었습니다!");

      } else if (isImageFile) {
        setAudioAnalysisStep("2단계: Gemini AI 대화 이미지 OCR 및 분석 중...");

        // 이미지 대화록 분석 API 호출
        const analyzeRes = await apiFetch("/api/meeting-minutes/analyze-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: uploadData.audioUrl })
        });
        const analyzeData = await analyzeRes.json();

        if (!analyzeData.success) {
          throw new Error(analyzeData.error || "이미지 대화록 분석에 실패했습니다.");
        }

        formattedTranscript = (analyzeData.transcript || []).map((item: any, idx: number) => ({
          id: `upload-${Date.now()}-${idx}`,
          speaker: item.speaker || "미상",
          time: item.time || "00:00",
          text: item.text || ""
        }));

        setTranscript(formattedTranscript);

        setSelectedMeeting((prev: any) => ({
          ...prev,
          meeting_type: 'text',
          audio_url: uploadData.audioUrl
        }));
        setTempAudioUrl(uploadData.audioUrl);

        // 진행 중인 상태 대화록 동기화 (회의 타입도 함께 동기화)
        await apiFetch("/api/meeting-minutes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "sync",
            meetingId: selectedMeeting.id,
            transcript: formattedTranscript,
            audioUrl: uploadData.audioUrl,
            meetingType: 'text'
          })
        });

        alert("🎉 대화 이미지 분석 및 동기화가 성공적으로 완료되었습니다!");

      } else {
        setAudioAnalysisStep("2단계: Gemini AI 오디오 분석 및 화자 분류 중...");

        // 오디오 분석 API 호출
        const analyzeRes = await apiFetch("/api/meeting-minutes/analyze-audio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audioUrl: uploadData.audioUrl })
        });
        const analyzeData = await analyzeRes.json();

        if (!analyzeData.success) {
          throw new Error(analyzeData.error || "오디오 분석에 실패했습니다.");
        }

        // 3. 추출된 대화록 적용
        formattedTranscript = (analyzeData.transcript || []).map((item: any, idx: number) => ({
          id: `upload-${Date.now()}-${idx}`,
          speaker: item.speaker || "미상",
          time: item.time || "00:00",
          text: item.text || ""
        }));

        setTranscript(formattedTranscript);
        
        setSelectedMeeting((prev: any) => ({
          ...prev,
          audio_url: uploadData.audioUrl,
          meeting_type: 'audio'
        }));
        setTempAudioUrl(uploadData.audioUrl);

        // 진행 중인 상태 대화록 동기화 (오디오 url도 함께 동기화)
        await apiFetch("/api/meeting-minutes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "sync",
            meetingId: selectedMeeting.id,
            transcript: formattedTranscript,
            audioUrl: uploadData.audioUrl,
            meetingType: 'audio'
          })
        });

        alert("🎉 회의 오디오 파일 분석 및 대화록 추출이 성공적으로 완료되었습니다!");
      }
    } catch (err: any) {
      console.error("오디오 업로드 분석 실패:", err);
      alert(err.message || "오디오 분석 중 오류가 발생했습니다.");
    } finally {
      setIsAudioAnalyzing(false);
      setAudioAnalysisStep("");
    }
  };

  // 5. 과거 회의 실시간 시맨틱 추천 연계
  const triggerSemanticRecommendation = async () => {
    if (transcript.length === 0) return;
    
    const lastThree = transcript.slice(-3).map(t => `${t.speaker}: ${t.text}`).join("\n");

    try {
      const res = await apiFetch("/api/meeting-minutes/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentText: lastThree })
      });
      const data = await res.json();
      if (data.success && data.recommendations) {
        setRecommendedMeetings(data.recommendations);
      }
    } catch (e) {
      console.error("시맨틱 추천 연동 실패:", e);
    }
  };

  // 6. 회의 중 AI 실시간 중간 요약/제언
  const handleGetInterimAdvice = async () => {
    if (transcript.length === 0) {
      alert("회의록에 기록된 대화 내용이 없습니다. 먼저 음성 입력이나 녹음 파일 업로드를 해 주세요.");
      return;
    }

    setIsAnalyzingInterim(true);
    setShowInterimModal(true);

    try {
      const res = await apiFetch("/api/meeting-minutes/interim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript })
      });
      const data = await res.json();
      if (data.success) {
        setInterimAdvice(data.analysis);
      } else {
        setInterimAdvice("AI의 피드백 분석을 가져오는 도중 오류가 발생했습니다.");
      }
    } catch (e) {
      console.error("중간 제언 요청 실패:", e);
      setInterimAdvice("네트워크 연결 실패로 인해 중간 요약을 제공할 수 없습니다.");
    } finally {
      setIsAnalyzingInterim(false);
    }
  };

  // 7. 회의 종료 전 매핑 팝업 오픈
  const handleCompleteMeeting = async () => {
    if (transcript.length === 0) {
      alert("대화록이 비어있어 회의를 완료할 수 없습니다.");
      return;
    }

    // 녹음 자동 중단
    stopSTT();

    // 실제로 대화록에 사용된 고유 화자들 목록 수집
    const uniqueSpeakers = Array.from(new Set(transcript.map(item => item.speaker)));
    
    // 초기 매핑값 설정 (기본적으로 화자명과 매칭될 실제 이름을 빈 값 또는 유사 인물로 사전 바인딩)
    let attendeesList: string[] = [];
    if (selectedMeeting) {
      try {
        const parsed = JSON.parse(selectedMeeting.attendees || "[]");
        attendeesList = parsed.map((a: any) => a.name);
      } catch (e) {
        console.error(e);
      }
    }

    const initialMapping: Record<string, string> = {};
    uniqueSpeakers.forEach((sp) => {
      if (sp.startsWith("화자 ")) {
        const num = parseInt(sp.replace("화자 ", "")) || 0;
        if (num > 0 && attendeesList[num - 1]) {
          initialMapping[sp] = attendeesList[num - 1];
        } else {
          initialMapping[sp] = "";
        }
      } else {
        initialMapping[sp] = sp;
      }
    });

    setSpeakerMapping(initialMapping);
    setShowMappingModal(true);
  };

  // 7-1. 화자 매핑 및 최종 AI 요약 완료 처리
  const handleSaveWithSpeakerMapping = async () => {
    const unmapped = Object.entries(speakerMapping).filter(([k, v]) => k.startsWith("화자 ") && !v.trim());
    if (unmapped.length > 0) {
      const confirmSave = confirm(`아직 매핑되지 않은 임시 화자가 존재합니다. (${unmapped.map(([k]) => k).join(", ")})\n매핑되지 않은 화자는 원래의 임시 이름 그대로 회의록에 기록됩니다. 그대로 진행하시겠습니까?`);
      if (!confirmSave) return;
    }

    setShowMappingModal(false);
    setIsCompleting(true);

    // 🎙️ MediaRecorder 데이터 플러시를 위한 미세 딜레이 보장
    await new Promise(resolve => setTimeout(resolve, 300));

    // 🎙️ 녹음 오디오 파일 서버 업로드 처리
    let audioUrl = selectedMeeting.audio_url || "";
    if (audioChunksRef.current && audioChunksRef.current.length > 0) {
      try {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const formData = new FormData();
        formData.append("file", audioBlob, `meeting-${selectedMeeting.id}.webm`);

        console.log("🎙️ Uploading recorded audio blob to server...");
        const uploadRes = await apiFetch("/api/meeting-minutes/upload", {
          method: "POST",
          body: formData
        });
        const uploadData = await uploadRes.json();
        if (uploadData.success) {
          audioUrl = uploadData.audioUrl;
          console.log("🎙️ Audio upload success:", audioUrl);
        } else {
          console.warn("🎙️ Audio upload failed:", uploadData.error);
        }
      } catch (uploadErr) {
        console.error("🎙️ Audio upload exception:", uploadErr);
      }
    }

    // 대화록 일괄 치환 처리 (임시 화자명 -> 실제 매핑 이름)
    const mappedTranscript = transcript.map(item => {
      const mappedName = speakerMapping[item.speaker] || item.speaker;
      return {
        ...item,
        speaker: mappedName.trim() ? mappedName.trim() : item.speaker
      };
    });

    // 매핑된 실제 화자명 명단 추출 (유니크 처리)
    const uniqueMappedNames = Array.from(new Set(Object.values(speakerMapping)))
      .map(name => name.trim())
      .filter(name => name && !name.startsWith("화자 "));
    
    const finalAttendees = uniqueMappedNames.map(name => ({
      name,
      email: `${name}@company.com`
    }));

    try {
      const res = await apiFetch("/api/meeting-minutes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete",
          meetingId: selectedMeeting.id,
          transcript: mappedTranscript,
          attendees: finalAttendees.length > 0 ? finalAttendees : undefined, // 참석자 정보 동시 업데이트
          audioUrl: audioUrl,
          meetingType: getMeetingType(selectedMeeting)
        })
      });
      const data = await res.json();
      if (data.success) {
        setSelectedMeeting(data.meeting);
        setTasks(data.tasks || []);

        if (selectedMeeting && typeof window !== "undefined" && (window as any).__ongoing_meeting_audio_chunks) {
          delete (window as any).__ongoing_meeting_audio_chunks[selectedMeeting.id];
        }
        
        let attendeesArr = [];
        try {
          attendeesArr = JSON.parse(data.meeting.attendees || "[]");
        } catch (e) {
          attendeesArr = [];
        }
        setSendRecipients(attendeesArr);
        setMailResult(null);

        setDetailTab("summary");
        setViewMode("detail");
        fetchMeetings();
      } else {
        alert(data.error || "회의 분석 처리에 실패했습니다.");
      }
    } catch (e) {
      console.error("회의 종료 오류:", e);
    } finally {
      setIsCompleting(false);
    }
  };


  // 8. 할 일 체크 상태 변경
  const handleToggleTask = async (taskId: number, currentStatus: string) => {
    const nextStatus = currentStatus === "PENDING" ? "COMPLETED" : "PENDING";
    try {
      const res = await apiFetch("/api/meeting-minutes/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, status: nextStatus })
      });
      const data = await res.json();
      if (data.success) {
        // 할 일 상태 로컬 업데이트
        setTasks(tasks.map(t => t.id === taskId ? { ...t, status: nextStatus } : t));
      }
    } catch (e) {
      console.error("할 일 상태 토글 실패:", e);
    }
  };

  // 9. 회의록 및 할 일 메일 발송
  const handleSendEmails = async () => {
    if (sendRecipients.length === 0) {
      alert("메일을 전송할 수신인이 지정되지 않았습니다.");
      return;
    }

    setIsSendingMail(true);
    setMailResult("이메일 발송 서버(SMTP)를 가동하여 배포 중입니다...");

    try {
      const res = await apiFetch("/api/meeting-minutes/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meetingId: selectedMeeting.id,
          recipients: sendRecipients
        })
      });
      const data = await res.json();
      if (data.success) {
        setMailResult(`🎉 이메일 배포 완료! ${data.message}`);
      } else {
        setMailResult(`⚠️ 일부 발송 에러: ${data.error}`);
      }
    } catch (e: any) {
      console.error("메일 발송 에러:", e);
      setMailResult("❌ SMTP 발송 서버 연결 중 타임아웃 오류가 발생했습니다. 시스템 설정의 SMTP 계정을 확인해 주세요.");
    } finally {
      setIsSendingMail(false);
    }
  };

  // 과거 회의록 보기 클릭 시
  const handleViewPastMeeting = async (pastId: number) => {
    try {
      const res = await apiFetch("/api/meeting-minutes");
      const data = await res.json();
      if (data.success) {
        const past = data.meetings.find((m: any) => m.id === pastId);
        if (past) {
          setViewPastSummary(past);
        }
      }
    } catch (e) {
      console.error("과거 회의 조회 에러:", e);
    }
  };

  // 리스트 모드에서 완료된 회의 카드 클릭 시 상세로 이동
  const handleSelectMeetingCard = (meeting: any) => {
    setSelectedMeeting(meeting);
    setTempAudioUrl(meeting.audio_url || "");
    fetchTasks(meeting.id);
    
    let attendeesArr = [];
    try {
      attendeesArr = JSON.parse(meeting.attendees || "[]");
    } catch (e) {
      attendeesArr = [];
    }
    setSendRecipients(attendeesArr);
    setMailResult(null);

    // 대화록 복구
    try {
      const parsedTrans = JSON.parse(meeting.transcript || "[]");
      setTranscript(parsedTrans);
    } catch (e) {
      setTranscript([]);
    }

    if (meeting.status === "ONGOING") {
      setViewMode("active");
    } else {
      setViewMode("detail");
    }
  };

  return (
    <div className="space-y-6 pb-20 w-full min-w-0 text-slate-800 animate-fade-in"
      data-easybot-hint="회의 기록 AI: 마이크 STT 및 가상 시뮬레이션을 통해 실시간 대화록을 작성하고, 과거 회의 시맨틱 추천, 종료 후 AI 자동 회의록 기안 및 할일 이메일 발송 기능을 통합 제공합니다.">
      
      {/* 상단 타이틀 헤더 */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 pb-6 border-b border-slate-200 relative z-10 shrink-0">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center">
            <Mic className="w-8 h-8 text-indigo-600 mr-3" />
            회의 기록 AI
          </h1>
        </div>
        
        {viewMode !== "list" && (
          <button 
            onClick={() => {
              stopSTT();
              setViewMode("list");
              fetchMeetings();
            }}
            className="flex items-center space-x-2 px-5 py-3 bg-white hover:bg-slate-50 text-slate-700 rounded-xl font-semibold border border-slate-200 shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4.5 h-4.5" />
            <span>회의 목록으로</span>
          </button>
        )}
      </div>

      {/* 1. 회의록 목록 뷰 (List Mode) */}
      {viewMode === "list" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-800 flex items-center space-x-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              <span>진행된 회의 대장 ({meetings.length}건)</span>
            </h2>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 px-5 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-950/10 active:scale-95 transition-all border border-indigo-400/20"
            >
              <Plus className="w-4 h-4" />
              <span>신규 회의 개시</span>
            </button>
          </div>

          {meetings.length === 0 ? (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-16 text-center">
              <Mic className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600 font-semibold">아직 기록된 회의록이 없습니다.</p>
              <p className="text-slate-500 text-xs mt-1">우측 상단의 [신규 회의 개시] 버튼을 눌러 첫 번째 회의를 실시간 기록해 보세요.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {meetings.map((meeting) => {
                let attCount = 0;
                try {
                  const arr = JSON.parse(meeting.attendees || "[]");
                  attCount = arr.length;
                } catch(e) {}

                return (
                  <div 
                    key={meeting.id}
                    onClick={() => handleSelectMeetingCard(meeting)}
                    className="group bg-white hover:bg-slate-50/50 border border-slate-200 hover:border-indigo-200 rounded-2xl p-5 cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-indigo-500 to-purple-500"></div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center space-x-1.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${meeting.status === 'ONGOING' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-600 border border-green-200'}`}>
                          {meeting.status === 'ONGOING' ? '🔴 진행 중' : '✅ 완료됨'}
                        </span>
                        {getMeetingType(meeting) === "text" ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-50 text-purple-650 border border-purple-200">
                            💬 텍스트 업로드
                          </span>
                        ) : getMeetingAudioUrl(meeting) ? (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${getMeetingAudioUrl(meeting).includes("meeting-") ? "bg-blue-50 text-blue-600 border border-blue-200" : "bg-teal-50 text-teal-650 border border-teal-200"}`}>
                            {getMeetingAudioUrl(meeting).includes("meeting-") ? "🎙️ 실시간 녹음" : "📁 파일 업로드"}
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[11px] text-slate-400 flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{meeting.date.slice(0, 10)}</span>
                        </span>
                        <button
                          onClick={(e) => handleDeleteMeeting(e, meeting.id)}
                          className="p-1 text-slate-400 hover:text-red-500 rounded-md hover:bg-slate-100 transition-all duration-200"
                          title="회의록 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-slate-800 group-hover:text-indigo-600 transition mb-2 truncate">
                      {meeting.title}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-3 mb-3 bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-100/50 min-h-[72px] leading-relaxed">
                      {meeting.summary ? getOneLineSummary(meeting.summary) : "회의가 진행 중이거나 아직 요약되지 않았습니다."}
                    </p>
                    
                    <div className="flex items-center space-x-4 text-xs text-slate-500 mt-4 border-t border-slate-100 pt-3">
                      <span className="flex items-center space-x-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>참석자 {attCount}명</span>
                      </span>
                      {meeting.summary && (
                        <span className="text-emerald-600 flex items-center space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span>AI 요약 완료</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. 회의 진행 중 모드 (Active Recording Mode) */}
      {viewMode === "active" && selectedMeeting && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 왼쪽: 대화록 및 관제실 (2단 그리드) */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 flex flex-col h-[650px] relative overflow-hidden shadow-sm">
            {/* 회의 상태 바 */}
            <div className="flex items-center justify-between border-b border-slate-150 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping"></span>
                {isEditingTitle ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={editingTitleVal}
                      onChange={(e) => setEditingTitleVal(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveTitle(selectedMeeting.id, editingTitleVal);
                        if (e.key === 'Escape') setIsEditingTitle(false);
                      }}
                      className="px-2 py-1 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-indigo-500 font-semibold"
                      autoFocus
                    />
                    <button 
                      onClick={() => handleSaveTitle(selectedMeeting.id, editingTitleVal)}
                      className="text-xs bg-indigo-600 text-white px-2 py-1.5 rounded-lg hover:bg-indigo-700 active:scale-95 transition"
                    >
                      저장
                    </button>
                    <button 
                      onClick={() => setIsEditingTitle(false)}
                      className="text-xs bg-slate-100 text-slate-600 px-2 py-1.5 rounded-lg hover:bg-slate-200 active:scale-95 transition"
                    >
                      취소
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 group">
                    <h2 className="text-base font-bold text-slate-800">{selectedMeeting.title}</h2>
                    {getMeetingType(selectedMeeting) === "text" ? (
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-purple-50 text-purple-600 border border-purple-150">
                        💬 텍스트 대화록
                      </span>
                    ) : getMeetingAudioUrl(selectedMeeting) ? (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                        getMeetingAudioUrl(selectedMeeting).includes("meeting-") 
                          ? "bg-blue-50 text-blue-600 border border-blue-150" 
                          : "bg-teal-50 text-teal-650 border border-teal-150"
                      }`}>
                        {getMeetingAudioUrl(selectedMeeting).includes("meeting-") ? "🎙️ 실시간" : "📁 오디오"}
                      </span>
                    ) : null}
                    <button
                      onClick={() => {
                        setEditingTitleVal(selectedMeeting.title);
                        setIsEditingTitle(true);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition p-1 hover:bg-slate-100 rounded-md text-slate-450 hover:text-slate-800"
                      title="회의명 수정"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={handleGetInterimAdvice}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded-xl text-xs font-bold border border-purple-200 transition active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>🤖 AI 실시간 제언</span>
                </button>
                <button 
                  onClick={handleCompleteMeeting}
                  disabled={isCompleting}
                  className="flex items-center space-x-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-950/10 transition disabled:opacity-50 active:scale-95"
                >
                  {isCompleting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <StopCircle className="w-3.5 h-3.5" />
                  )}
                  <span>회의 종료 및 AI 요약</span>
                </button>
              </div>
            </div>

            {/* 대화 피드 */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-slate-200">
              {transcript.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-8">
                  <Mic className="w-10 h-10 mb-3 animate-bounce text-slate-300" />
                  <p className="text-sm">마이크를 활성화하거나 회의 녹음 파일을 업로드하여 회의록 기록을 개시하십시오.</p>
                </div>
              ) : (
                transcript.map((item, idx) => (
                  <div 
                    key={idx} 
                    className={`flex flex-col ${item.speaker.includes("대표") || item.speaker.includes("나") ? "items-end" : "items-start"}`}
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-[11px] font-bold text-slate-500">{item.speaker}</span>
                      {item.isDiarizing && (
                        <span className="inline-flex items-center text-[9px] bg-indigo-50 text-indigo-600 px-1 py-0.5 rounded font-bold animate-pulse">
                          🤖 AI 화자 판별 중...
                        </span>
                      )}
                      <span className="text-[9px] text-slate-400">{item.time}</span>
                    </div>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${item.speaker.includes("대표") || item.speaker.includes("나") ? "bg-indigo-600 text-white rounded-tr-none shadow-sm" : "bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200/60"} ${item.isDiarizing ? "opacity-75" : ""}`}>
                      {item.text}
                    </div>
                  </div>
                ))
              )}
              {currentSpeech && (
                <div className="flex flex-col items-start">
                  <div className="flex items-center space-x-1 mb-1 text-slate-500">
                    <span className="text-[11px] font-bold">{speechSpeaker} (말하는 중)</span>
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping"></span>
                  </div>
                  <div className="bg-indigo-50 text-indigo-600 italic rounded-2xl rounded-tl-none px-4 py-2.5 text-sm border border-indigo-200/60 max-w-[80%] animate-pulse">
                    {currentSpeech}...
                  </div>
                </div>
              )}
              <div ref={transcriptEndRef} />
            </div>
 
            {/* 🎙️ 회의 원본 파일 위젯 (오디오 플레이어 / 이미지 텍스트 뷰어 및 다운로더) */}
            {tempAudioUrl && (
              <div className="bg-indigo-50/50 border border-indigo-150 rounded-xl p-3.5 mt-3 flex flex-col md:flex-row md:items-center justify-between shadow-2xs gap-3">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
                    {getFileType(tempAudioUrl) === "audio" ? (
                      <Mic className="w-4.5 h-4.5" />
                    ) : getFileType(tempAudioUrl) === "image" ? (
                      <Image className="w-4.5 h-4.5" />
                    ) : (
                      <FileText className="w-4.5 h-4.5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-0.5">
                      {tempAudioUrl.startsWith("blob:") 
                        ? "실시간 녹음 임시 원본 (미저장)" 
                        : getFileType(tempAudioUrl) === "audio" 
                          ? "업로드된 회의 오디오" 
                          : getFileType(tempAudioUrl) === "image" 
                            ? "업로드된 대화 이미지" 
                            : "업로드된 대화 텍스트/이메일"}
                    </p>
                    <p className="text-xs font-bold text-slate-750 truncate">
                      {tempAudioUrl.startsWith("blob:") ? "실시간 녹음 원본" : tempAudioUrl.substring(tempAudioUrl.lastIndexOf('/') + 1)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center justify-end shrink-0">
                  {getFileType(tempAudioUrl) === "audio" ? (
                    <audio 
                      src={tempAudioUrl} 
                      controls 
                      className="h-8 max-w-full focus:outline-none"
                    />
                  ) : (
                    <div className="flex items-center space-x-2">
                      <a 
                        href={tempAudioUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-indigo-600 rounded-lg text-[11px] font-bold border border-slate-200 transition active:scale-95 flex items-center gap-1 shadow-3xs cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>원본 보기</span>
                      </a>
                      <a 
                        href={tempAudioUrl} 
                        download={tempAudioUrl.substring(tempAudioUrl.lastIndexOf('/') + 1)}
                        className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold transition active:scale-95 flex items-center gap-1 shadow-2xs cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>다운로드</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STT/오디오 업로드 하단 컨트롤러 */}
            <div className="border-t border-slate-250 pt-4 mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-3 rounded-xl">
              {/* 마이크 STT 제어 */}
              <div className="flex flex-col justify-center space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                  <span>실시간 마이크 음성 인식 (STT)</span>
                  <div className="flex items-center space-x-1.5">
                    <select 
                      value={speechSpeaker}
                      onChange={(e) => setSpeechSpeaker(e.target.value)}
                      className="bg-white border border-slate-200 text-slate-700 text-[11px] rounded px-1.5 py-0.5 focus:outline-none shadow-sm cursor-pointer"
                    >
                      {activeSpeakers.map((attendee, idx) => (
                        <option key={idx} value={attendee}>{attendee}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAddSpeaker}
                      className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] font-bold border border-slate-300/50 transition active:scale-95 cursor-pointer shadow-3xs flex items-center gap-0.5"
                      title="가칭 화자 동적 추가"
                    >
                      <span>+ 화자 추가</span>
                    </button>
                  </div>
                </div>
                {isRecording ? (
                  <button 
                    onClick={stopSTT}
                    className="flex items-center justify-center space-x-2 w-full py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl border border-red-200 text-xs font-bold transition active:scale-95"
                  >
                    <MicOff className="w-4 h-4 animate-pulse" />
                    <span>음성 인식 중지</span>
                  </button>
                ) : (
                  <button 
                    onClick={startSTT}
                    className="flex items-center justify-center space-x-2 w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-950/10 transition active:scale-95"
                  >
                    <Mic className="w-4 h-4" />
                    <span>음성 인식 시작</span>
                  </button>
                )}
              </div>

              {/* 녹음/텍스트 파일 업로드 제어 */}
              <div className="flex flex-col justify-center space-y-2 border-t md:border-t-0 md:border-l border-slate-200 md:pl-4">
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                  <span>💬 대화 파일 업로드 및 분석</span>
                  <span className="text-[10px] text-slate-400">오디오(MP3, M4A) / 대화록(TXT, EML, 이미지)</span>
                </div>
                {isAudioAnalyzing ? (
                  <div className="flex flex-col items-center justify-center space-y-1 py-1.5 bg-indigo-50 border border-indigo-150 rounded-xl">
                    <div className="flex items-center space-x-2 text-indigo-600 font-bold text-xs">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{audioAnalysisStep || "분석 진행 중..."}</span>
                    </div>
                    <div className="w-[90%] bg-slate-200 h-1 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-full animate-pulse" style={{ width: '75%' }}></div>
                    </div>
                  </div>
                ) : (
                  <label className="flex items-center justify-center space-x-2 w-full py-2 bg-white hover:bg-indigo-50/40 text-indigo-600 rounded-xl text-xs font-bold border border-indigo-200/85 transition active:scale-95 shadow-sm cursor-pointer select-none">
                    <Upload className="w-4 h-4" />
                    <span>대화 파일 업로드 및 분석</span>
                    <input 
                      type="file" 
                      accept="audio/*,text/plain,.txt,.eml,image/*" 
                      onChange={handleAudioUpload} 
                      className="hidden" 
                    />
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* 오른쪽: 실시간 과거 회의 시맨틱 매칭 추천 사이드바 */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col h-[650px] shadow-sm">
            <h3 className="text-base font-bold text-slate-800 flex items-center space-x-2 border-b border-slate-150 pb-3 mb-4">
              <Lightbulb className="w-5 h-5 text-amber-500 animate-bounce" />
              <span>실시간 과거 회의 매칭 ({recommendedMeetings.length}건)</span>
            </h3>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin scrollbar-thumb-slate-200">
              {recommendedMeetings.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-6">
                  <Sparkles className="w-8 h-8 mb-2 text-indigo-400" />
                  <p className="text-xs">대화 내용이 누적되면 AI가 자동으로 과거 관련 회의록을 실시간 매칭 추천합니다.</p>
                </div>
              ) : (
                recommendedMeetings.map((rec, idx) => (
                  <div 
                    key={idx}
                    onClick={() => handleViewPastMeeting(rec.id)}
                    className="group bg-slate-50 hover:bg-slate-100/50 border border-slate-200/80 rounded-xl p-4 cursor-pointer transition-all duration-300 shadow-sm relative overflow-hidden"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full border border-amber-200">
                        유사도 {rec.matchRate}%
                      </span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-650 transition" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-800 truncate group-hover:text-indigo-600 transition mb-1">
                      {rec.title}
                    </h4>
                    <p className="text-[11px] text-slate-655 line-clamp-2 leading-relaxed">
                      {rec.reason}
                    </p>
                  </div>
                ))
              )}
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 mt-3">
              <p className="text-[10px] text-slate-500 leading-normal">
                💡 **시맨틱 추천 시스템**: Gemini AI가 현재 대화의 맥락(Context)을 백그라운드로 분석하여 기존 완료된 회의록의 DB 요약을 스캔해 매칭합니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. 회의 종료 후 상세/리포트 모드 (Detail View Mode) */}
      {viewMode === "detail" && selectedMeeting && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 왼쪽: AI 종합 회의록 뷰어 & 할일 보드 (2단 그리드) */}
          <div className="lg:col-span-2 space-y-6">
            {/* 회의록 메인 카드 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center space-x-2 text-indigo-600 font-semibold mb-2 text-xs">
                <Clock className="w-4 h-4" />
                <span>{selectedMeeting.date}</span>
              </div>
              {isEditingTitle ? (
                <div className="flex items-center space-x-2 mb-4">
                  <input
                    type="text"
                    value={editingTitleVal}
                    onChange={(e) => setEditingTitleVal(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveTitle(selectedMeeting.id, editingTitleVal);
                      if (e.key === 'Escape') setIsEditingTitle(false);
                    }}
                    className="px-3 py-1.5 border border-slate-300 rounded-xl text-xl font-bold focus:outline-none focus:border-indigo-500 w-full max-w-md"
                    autoFocus
                  />
                  <button 
                    onClick={() => handleSaveTitle(selectedMeeting.id, editingTitleVal)}
                    className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-xl font-semibold transition active:scale-95 shrink-0"
                  >
                    저장
                  </button>
                  <button 
                    onClick={() => setIsEditingTitle(false)}
                    className="text-sm bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-2 rounded-xl font-semibold transition active:scale-95 shrink-0"
                  >
                    취소
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-3 mb-4 group">
                  <h2 className="text-2xl font-bold text-slate-800">{selectedMeeting.title}</h2>
                  {getMeetingType(selectedMeeting) === "text" ? (
                    <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-purple-50 text-purple-650 border border-purple-250">
                      💬 텍스트 대화록 업로드
                    </span>
                  ) : getMeetingAudioUrl(selectedMeeting) ? (
                    <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                      getMeetingAudioUrl(selectedMeeting).includes("meeting-") 
                        ? "bg-blue-50 text-blue-600 border border-blue-200" 
                        : "bg-teal-50 text-teal-650 border border-teal-200"
                    }`}>
                      {getMeetingAudioUrl(selectedMeeting).includes("meeting-") ? "🎙️ 실시간 녹음 회의" : "📁 업로드 파일 분석"}
                    </span>
                  ) : null}
                  <button
                    onClick={() => {
                      setEditingTitleVal(selectedMeeting.title);
                      setIsEditingTitle(true);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700"
                    title="회의명 수정"
                  >
                    <Pencil className="w-4.5 h-4.5" />
                  </button>
                </div>
              )}
              
              {/* 🎙️ 원본 파일 위젯 (오디오 플레이어 / 이미지 텍스트 뷰어 및 다운로더) */}
              {getMeetingAudioUrl(selectedMeeting) && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 flex flex-col sm:flex-row sm:items-center justify-between shadow-2xs gap-3">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
                      {getFileType(getMeetingAudioUrl(selectedMeeting)) === "audio" ? (
                        <Mic className="w-4.5 h-4.5" />
                      ) : getFileType(getMeetingAudioUrl(selectedMeeting)) === "image" ? (
                        <Image className="w-4.5 h-4.5" />
                      ) : (
                        <FileText className="w-4.5 h-4.5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                        {getFileType(getMeetingAudioUrl(selectedMeeting)) === "audio" 
                          ? "회의 녹음 원본" 
                          : getFileType(getMeetingAudioUrl(selectedMeeting)) === "image" 
                            ? "회의 대화 이미지 원본" 
                            : "회의 대화 텍스트/이메일 원본"}
                      </p>
                      <p className="text-xs font-bold text-slate-750 truncate">
                        {getMeetingAudioUrl(selectedMeeting).substring(getMeetingAudioUrl(selectedMeeting).lastIndexOf('/') + 1)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end shrink-0">
                    {getFileType(getMeetingAudioUrl(selectedMeeting)) === "audio" ? (
                      <audio 
                        src={getMeetingAudioUrl(selectedMeeting)} 
                        controls 
                        className="w-full h-8 bg-transparent focus:outline-none"
                      />
                    ) : (
                      <div className="flex items-center space-x-2">
                        <a 
                          href={getMeetingAudioUrl(selectedMeeting)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold border border-slate-250 transition active:scale-95 flex items-center gap-1 shadow-3xs cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                          <span>원본 보기</span>
                        </a>
                        <a 
                          href={getMeetingAudioUrl(selectedMeeting)} 
                          download={getMeetingAudioUrl(selectedMeeting).substring(getMeetingAudioUrl(selectedMeeting).lastIndexOf('/') + 1)}
                          className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition active:scale-95 flex items-center gap-1 shadow-2xs cursor-pointer"
                        >
                          <Download className="w-4 h-4" />
                          <span>다운로드</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="border-t border-slate-150 pt-4">
                {/* 탭 헤더 */}
                <div className="flex border-b border-slate-200 mb-4 select-none">
                  <button
                    onClick={() => setDetailTab("summary")}
                    className={`pb-2.5 px-4 font-bold text-xs border-b-2 transition-all duration-200 cursor-pointer ${
                      detailTab === "summary"
                        ? "border-indigo-600 text-indigo-600"
                        : "border-transparent text-slate-400 hover:text-slate-650"
                    }`}
                  >
                    📝 AI 요약 보고서
                  </button>
                  <button
                    onClick={() => setDetailTab("transcript")}
                    className={`pb-2.5 px-4 font-bold text-xs border-b-2 transition-all duration-200 cursor-pointer ${
                      detailTab === "transcript"
                        ? "border-indigo-600 text-indigo-600"
                        : "border-transparent text-slate-400 hover:text-slate-650"
                    }`}
                  >
                    📋 회의 원문 녹취본
                  </button>
                </div>

                {/* 탭 내용 */}
                {detailTab === "summary" ? (
                  <div>
                    <h3 className="text-base font-bold text-slate-800 flex items-center space-x-2 mb-3">
                      <FileText className="w-4.5 h-4.5 text-purple-600" />
                      <span>AI 자동 기안 회의 요약 리포트</span>
                    </h3>
                    <div className="prose prose-slate max-w-none text-slate-700 text-sm leading-relaxed whitespace-pre-line bg-slate-50 border border-slate-200 p-4 rounded-xl">
                      {(selectedMeeting.summary || '').replace(/\[audio_url\]:\s*.*/g, '').replace(/\[meeting_type\]:\s*.*/g, '').trim() || '회의록 요약이 작성되지 않았습니다.'}
                    </div>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-base font-bold text-slate-800 flex items-center space-x-2 mb-3">
                      <Mic className="w-4.5 h-4.5 text-indigo-600" />
                      <span>요약 전 전체 대화 기록 (원문 녹취본)</span>
                    </h3>
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-4 max-h-[450px] overflow-y-auto pr-2">
                      {(() => {
                        let parsedTranscript: any[] = [];
                        try {
                          parsedTranscript = typeof selectedMeeting.transcript === 'string'
                            ? JSON.parse(selectedMeeting.transcript || "[]")
                            : selectedMeeting.transcript || [];
                        } catch (e) {
                          console.error("대화록 복구 실패:", e);
                        }

                        if (!Array.isArray(parsedTranscript) || parsedTranscript.length === 0) {
                          return <p className="text-xs text-slate-400 text-center py-6">기록된 원본 대화 내용이 없습니다.</p>;
                        }

                        return parsedTranscript.map((item, idx) => (
                          <div 
                            key={idx} 
                            className={`flex flex-col ${item.speaker.includes("대표") || item.speaker.includes("나") ? "items-end" : "items-start"}`}
                          >
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="text-[11px] font-bold text-slate-500">{item.speaker}</span>
                              <span className="text-[9px] text-slate-400">{item.time}</span>
                            </div>
                            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${item.speaker.includes("대표") || item.speaker.includes("나") ? "bg-indigo-600 text-white rounded-tr-none shadow-sm" : "bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200/60"}`}>
                              {item.text}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 참석자별 할일(Action Items) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-800 flex items-center space-x-2 border-b border-slate-150 pb-3 mb-4">
                <CheckSquare className="w-4.5 h-4.5 text-emerald-600" />
                <span>추출된 담당자별 할 일 및 일정 ({tasks.length}건)</span>
              </h3>

              {tasks.length === 0 ? (
                <p className="text-xs text-slate-555 text-center py-6">회의 대화록에서 추출된 할 일 항목이 없습니다.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tasks.map((task, idx) => (
                    <div 
                      key={task.id || idx}
                      onClick={() => handleToggleTask(task.id, task.status)}
                      className={`border p-4 rounded-xl cursor-pointer transition-all flex items-start space-x-3 ${task.status === 'COMPLETED' ? 'bg-slate-50 border-slate-200 text-slate-400 opacity-70' : 'bg-slate-50/50 border-slate-200 text-slate-700 hover:border-indigo-200'}`}
                    >
                      <div className="mt-1">
                        {task.status === 'COMPLETED' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-slate-400 hover:border-indigo-400 bg-white"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1 gap-2">
                          <span className={`text-xs font-bold truncate ${task.status === 'COMPLETED' ? 'text-slate-400' : 'text-indigo-600'}`}>
                            {task.assignee_name}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 bg-white border border-slate-200 text-slate-500 rounded-full font-semibold flex items-center space-x-1 shrink-0">
                            <Calendar className="w-2.5 h-2.5 text-slate-400" />
                            <span>{task.due_date}까지</span>
                          </span>
                        </div>
                        <p className={`text-xs leading-normal ${task.status === 'COMPLETED' ? 'line-through text-slate-400' : 'text-slate-600'}`}>
                          {task.task_desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 오른쪽: 회의록 배포 및 참석자 메일 전송 패널 */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col h-fit space-y-5 shadow-sm">
            <h3 className="text-base font-bold text-slate-800 flex items-center space-x-2 border-b border-slate-150 pb-3 mb-1">
              <Mail className="w-5 h-5 text-indigo-650" />
              <span>회의록 메일 배포 관제</span>
            </h3>

            {/* 참석자 이메일 목록 */}
            <div className="space-y-3">
              <label className="text-xs text-slate-500 font-bold block">이메일 발송 대상 임직원</label>
              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                {sendRecipients.length === 0 ? (
                  <p className="text-[11px] text-slate-400 text-center py-4">등록된 이메일 대상이 없습니다.</p>
                ) : (
                  sendRecipients.map((rec, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200 gap-2">
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-slate-800 truncate">{rec.name}</span>
                        <span className="text-[10px] text-slate-500 truncate">{rec.email}</span>
                      </div>
                      <button 
                        onClick={() => setSendRecipients(sendRecipients.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-red-500 p-1 transition"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* 추가 입력 폼 */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                <input 
                  type="text" 
                  placeholder="이름"
                  value={attendeeName}
                  onChange={(e) => setAttendeeName(e.target.value)}
                  className="bg-white border border-slate-200 text-slate-800 text-xs rounded-xl px-2.5 py-2 focus:outline-none focus:border-indigo-500 w-full shadow-sm"
                />
                <input 
                  type="text" 
                  placeholder="이메일"
                  value={attendeeEmail}
                  onChange={(e) => setAttendeeEmail(e.target.value)}
                  className="bg-white border border-slate-200 text-slate-800 text-xs rounded-xl px-2.5 py-2 focus:outline-none focus:border-indigo-500 w-full shadow-sm"
                />
              </div>
              <button 
                onClick={addAttendee}
                className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold border border-slate-200 transition shadow-sm active:scale-95"
              >
                + 참석 대상 수동 추가
              </button>
            </div>

            {/* 발송 실행 */}
            <div className="pt-2 border-t border-slate-150">
              <button 
                onClick={handleSendEmails}
                disabled={isSendingMail}
                className="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-650 hover:to-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-950/10 transition active:scale-95 flex items-center justify-center space-x-2 border border-indigo-400/20"
              >
                {isSendingMail ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4 text-indigo-100" />
                )}
                <span>회의록 및 할일 메일 발송 ✉️</span>
              </button>

              {mailResult && (
                <div className={`mt-3 p-3 rounded-lg text-xs font-semibold leading-normal ${mailResult.startsWith("❌") || mailResult.startsWith("⚠️") ? "bg-red-50 border border-red-200 text-red-600" : "bg-green-50 border border-green-200 text-green-600"}`}>
                  {mailResult}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. 모달: 새 회의 만들기 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
            
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-150 pb-3">
                <h3 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
                  <Mic className="w-5 h-5 text-indigo-650" />
                  <span>신규 회의 개시 설정</span>
                </h3>
                <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 transition">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 회의 제목 */}
              <div className="space-y-1">
                <label className="text-xs text-slate-500 font-bold block">회의 제목</label>
                <input 
                  type="text" 
                  placeholder={`예: ${getAutoMeetingTitle()} (미입력 시 자동 지정)`}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="bg-slate-50 focus:bg-white border border-slate-200 text-slate-800 text-sm rounded-xl px-4 py-3.5 focus:outline-none focus:border-indigo-500 w-full shadow-sm transition-all"
                />
              </div>

              {/* 참석자 정보 */}
              <div className="space-y-2">
                <label className="text-xs text-slate-500 font-bold block">참석자 등록 (메일 발송용)</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="이름"
                    value={attendeeName}
                    onChange={(e) => setAttendeeName(e.target.value)}
                    className="bg-slate-50 focus:bg-white border border-slate-200 text-slate-850 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 w-1/3 shadow-sm transition-all"
                  />
                  <input 
                    type="text" 
                    placeholder="이메일"
                    value={attendeeEmail}
                    onChange={(e) => setAttendeeEmail(e.target.value)}
                    className="bg-slate-50 focus:bg-white border border-slate-200 text-slate-850 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 flex-1 shadow-sm transition-all"
                  />
                  <button 
                    onClick={addAttendee}
                    className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition active:scale-95"
                  >
                    추가
                  </button>
                </div>

                {/* 등록된 가참석자 리스트 */}
                {tempAttendees.length > 0 && (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 max-h-[120px] overflow-y-auto space-y-2">
                    {tempAttendees.map((att, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs">
                        <span className="text-slate-700 font-semibold">{att.name} <span className="text-slate-400 font-normal">({att.email})</span></span>
                        <button onClick={() => removeAttendee(idx)} className="text-red-500 hover:text-red-655 font-semibold">삭제</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 실행 버튼 */}
              <div className="pt-3 border-t border-slate-150 flex justify-end space-x-2">
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold border border-slate-200 transition"
                >
                  취소
                </button>
                <button 
                  onClick={handleStartMeeting}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-950/10 transition active:scale-95"
                >
                  회의 시작 🎙️
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. 모달: 과거 회의 요약 뷰어 모달 */}
      {viewPastSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-amber-500"></div>
            
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-150 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full border border-amber-200 font-bold">참조 과거 회의</span>
                  <h3 className="text-base font-extrabold text-slate-800">{viewPastSummary.title}</h3>
                </div>
                <button onClick={() => setViewPastSummary(null)} className="text-slate-400 hover:text-slate-600 transition">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="max-h-[350px] overflow-y-auto space-y-3 prose prose-slate max-w-none text-slate-700 text-xs leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-xl border border-slate-200">
                {viewPastSummary.summary || "과거 회의 요약 내용이 존재하지 않습니다."}
              </div>

              <div className="pt-3 border-t border-slate-150 flex justify-end">
                <button 
                  onClick={() => setViewPastSummary(null)}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold border border-slate-200 transition"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. 모달: AI 실시간 중간 요약/제언 모달 */}
      {showInterimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-purple-500"></div>
            
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-150 pb-3">
                <h3 className="text-base font-extrabold text-slate-800 flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-purple-600 animate-spin" />
                  <span>🤖 AI 실시간 회의 제언 및 흐름 요약</span>
                </h3>
                <button onClick={() => setShowInterimModal(false)} className="text-slate-400 hover:text-slate-600 transition">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {isAnalyzingInterim ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-purple-500 animate-spin" />
                  <p className="text-xs text-slate-400">현재까지의 대화록을 바탕으로 AI가 실시간 분석 중입니다...</p>
                </div>
              ) : (
                <div className="max-h-[350px] overflow-y-auto space-y-3 prose prose-slate max-w-none text-slate-700 text-xs leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-xl border border-slate-200">
                  {interimAdvice}
                </div>
              )}

              <div className="pt-3 border-t border-slate-150 flex justify-end">
                <button 
                  onClick={() => setShowInterimModal(false)}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-950/10 transition active:scale-95"
                >
                  이해했습니다
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. 모달: 실제 화자 매핑 및 저장 설정 모달 */}
      {showMappingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
            
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-150 pb-3">
                <h3 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
                  <Users className="w-5 h-5 text-emerald-600" />
                  <span>실제 화자 매핑 설정</span>
                </h3>
                <button onClick={() => setShowMappingModal(false)} className="text-slate-400 hover:text-slate-600 transition">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                회의 중 기록된 임시 가칭 화자들을 실제 이름으로 매치해 주세요.<br />
                최종 저장 시 일괄 매핑된 실제 이름으로 치환되어 보고서가 완성됩니다.
              </p>

              <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                {Object.keys(speakerMapping).map((speaker) => {
                  let attendeesArr: string[] = [];
                  if (selectedMeeting) {
                    try {
                      attendeesArr = JSON.parse(selectedMeeting.attendees || "[]").map((a: any) => a.name);
                    } catch(e) {}
                  }

                  return (
                    <div key={speaker} className="bg-slate-50 border border-slate-150 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center space-x-2 shrink-0">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                        <span className="text-xs font-bold text-slate-700">{speaker}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-1 max-w-xs justify-end">
                        {attendeesArr.length > 0 && (
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                setSpeakerMapping(prev => ({ ...prev, [speaker]: e.target.value }));
                              }
                            }}
                            value={attendeesArr.includes(speakerMapping[speaker]) ? speakerMapping[speaker] : ""}
                            className="bg-white border border-slate-200 text-slate-700 text-[11px] rounded-lg px-2 py-1 focus:outline-none shadow-3xs cursor-pointer max-w-[110px]"
                          >
                            <option value="">참석자 선택</option>
                            {attendeesArr.map((name, idx) => (
                              <option key={idx} value={name}>{name}</option>
                            ))}
                          </select>
                        )}
                        <input
                          type="text"
                          placeholder="실제 이름 직접 입력"
                          value={speakerMapping[speaker] || ""}
                          onChange={(e) => setSpeakerMapping(prev => ({ ...prev, [speaker]: e.target.value }))}
                          className="bg-white border border-slate-200 text-slate-800 text-[11px] rounded-lg px-2.5 py-1 focus:outline-none focus:border-emerald-500 w-[140px] shadow-3xs"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-slate-150 flex justify-end space-x-2">
                <button 
                  onClick={() => setShowMappingModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold border border-slate-200 transition"
                >
                  취소
                </button>
                <button 
                  onClick={handleSaveWithSpeakerMapping}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-950/10 transition active:scale-95 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>일괄 치환 및 최종 저장</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
