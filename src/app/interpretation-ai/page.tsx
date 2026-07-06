"use client";
import { apiFetch } from '@/lib/api';
import { useState, useEffect, useRef } from "react";
import { 
  Mic, MicOff, Languages, Settings, Volume2, Share2, Clipboard, 
  ChevronRight, RefreshCw, X, Play, Square, MessageSquare, History, Sparkles, Check
} from "lucide-react";

interface SpeechLog {
  role: 'host' | 'guest';
  original: string;
  translated: string;
  time: string;
}

interface SavedSession {
  uuid: string;
  source_lang: string;
  target_lang: string;
  tone_manner: string;
  created_at: string;
  file_path: string;
  audio_file_path: string;
}

export default function LiveInterpretationPage() {
  // 상태 변수 정의
  const [sessionUuid, setSessionUuid] = useState<string | null>(null);
  const [sourceLang, setSourceLang] = useState<string>("ko");
  const [targetLang, setTargetLang] = useState<string>("en");
  const [toneManner, setToneManner] = useState<string>("formal"); // formal, casual, tech
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isSplitMode, setIsSplitMode] = useState<boolean>(false); // 마주보기 모드(180도 회전) 여부
  const [activeSpeaker, setActiveSpeaker] = useState<'host' | 'guest' | null>(null);

  // 실시간 음성 인식 상태
  const [speechLogs, setSpeechLogs] = useState<SpeechLog[]>([]);
  const [tempInput, setTempInput] = useState<string>("");
  const [tempTranslation, setTempTranslation] = useState<string>("");

  // 미디어 저장(녹음)을 위한 Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null); // Web Speech API SpeechRecognition
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // UI 상태
  const [isSettingOpen, setIsSettingOpen] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [selectedHistorySession, setSelectedHistorySession] = useState<{ session: SavedSession; logs: any[] } | null>(null);
  const [isAutoPlayTts, setIsAutoPlayTts] = useState<boolean>(true);

  // 톤앤매너 번역용 API Config
  const [apiConfig, setApiConfig] = useState<{ apiKey: string; model: string } | null>(null);

  // 대화 스크롤용 ref
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 1. 컴포넌트 마운트 시 설정 불러오기 및 과거 세션 내역 로드
  useEffect(() => {
    fetchConfig();
    fetchHistory();
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [speechLogs, tempInput, tempTranslation]);

  const fetchConfig = async () => {
    try {
      const res = await apiFetch('/api/interpretation/config');
      const data = await res.json();
      if (data.success) {
        setApiConfig({ apiKey: data.apiKey, model: data.model });
      }
    } catch (err) {
      console.error('설정 로드 오류:', err);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await apiFetch('/api/interpretation/sessions');
      const data = await res.json();
      if (data.success && data.sessions) {
        setSavedSessions(data.sessions);
      }
    } catch (err) {
      console.error('히스토리 로드 오류:', err);
    }
  };

  // 2. 신규 통역 세션 개설
  const startSession = async () => {
    try {
      const res = await apiFetch('/api/interpretation/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_lang: sourceLang,
          target_lang: targetLang,
          tone_manner: toneManner
        })
      });
      const data = await res.json();
      if (data.success && data.session_uuid) {
        setSessionUuid(data.session_uuid);
        setSpeechLogs([]);
        return data.session_uuid;
      }
    } catch (err) {
      console.error('세션 시작 오류:', err);
      alert('통역 세션을 개설하는 도중 오류가 발생했습니다.');
    }
    return null;
  };

  // 3. 브라우저 실시간 음성인식(STT) 및 MediaRecorder(녹음) 시작
  const startListening = async (speaker: 'host' | 'guest') => {
    // 세션이 없으면 먼저 생성
    let currentSession = sessionUuid;
    if (!currentSession) {
      const newUuid = await startSession();
      if (!newUuid) return;
      currentSession = newUuid;
    }

    setActiveSpeaker(speaker);
    setIsRecording(true);
    audioChunksRef.current = [];

    // --- A. MediaRecorder 녹음 연동 (폰 로컬 저장용) ---
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = { mimeType: 'audio/webm' };
      let mediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, options);
      } catch (e) {
        // iOS Safari 등 webm 미지원 시 기본형 선택
        mediaRecorder = new MediaRecorder(stream);
      }
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(200); // 200ms 단위 슬라이스 기록

      // 실시간 마이크 오디오 비주얼라이저 구현
      setupAudioVisualizer(stream);

    } catch (e: any) {
      console.error('마이크 녹음 획득 실패:', e);
      alert('마이크 접근 권한이 필요합니다.');
      setIsRecording(false);
      setActiveSpeaker(null);
      return;
    }

    // --- B. Web Speech API SpeechRecognition 연동 (실시간 연속 STT) ---
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('현재 브라우저가 실시간 음성 인식을 지원하지 않습니다. 크롬 또는 사파리 모바일을 권장합니다.');
      stopListening();
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = speaker === 'host' ? getLangCode(sourceLang) : getLangCode(targetLang);

    recognition.onresult = async (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const activeText = finalTranscript || interimTranscript;
      if (activeText.trim()) {
        setTempInput(activeText);
        // 실시간 연속 텍스트 통역 트리거 (일정 간격 또는 실시간 피드백 비주얼)
        if (finalTranscript) {
          // 한 문장 완료 시 정식 제미나이 번역 호출 및 로그 기록
          await processTranslation(finalTranscript, speaker, currentSession!);
        } else {
          // 중간 가인식 실시간 번역
          setTempTranslation("통역 중...");
        }
      }
    };

    recognition.onerror = (e: any) => {
      console.error('Speech Recognition Error:', e);
    };

    recognition.onend = () => {
      // 캡처 중 상태면 자동으로 재생성하여 무한 연속 STT 환경 구축 (Live Translate 연속 캡처 느낌 제공)
      if (isRecording && activeSpeaker === speaker) {
        try {
          recognition.start();
        } catch (err) {}
      }
    };

    recognition.start();
  };

  // 언어별 정확한 브라우저 코드 매핑
  const getLangCode = (lang: string) => {
    switch (lang) {
      case 'ko': return 'ko-KR';
      case 'en': return 'en-US';
      case 'ja': return 'ja-JP';
      case 'zh': return 'zh-CN';
      case 'vi': return 'vi-VN';
      default: return 'ko-KR';
    }
  };

  // 실시간 마이크 오디오 비주얼 파형 시각화
  const setupAudioVisualizer = (stream: MediaStream) => {
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContextRef.current = audioContext;

    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 64;
    source.connect(analyser);
    analyserRef.current = analyser;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      if (!isRecording) return;
      animationFrameRef.current = requestAnimationFrame(draw);

      analyser.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = 'rgba(0, 0, 0, 0)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 1.5;

        // 아름다운 네온 그라데이션 파형 연출
        const grad = ctx.createLinearGradient(0, canvas.height, 0, 0);
        grad.addColorStop(0, '#6366f1'); // Indigo
        grad.addColorStop(0.5, '#a855f7'); // Purple
        grad.addColorStop(1, '#ec4899'); // Pink
        ctx.fillStyle = grad;

        const y = (canvas.height - barHeight) / 2;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth - 2, barHeight, 4);
        ctx.fill();

        x += barWidth + 1;
      }
    };

    draw();
  };

  // 4. Gemini 번역 호출 및 DB 로그 적재
  const processTranslation = async (text: string, speaker: 'host' | 'guest', currentSessionUuid: string) => {
    const sLang = speaker === 'host' ? sourceLang : targetLang;
    const tLang = speaker === 'host' ? targetLang : sourceLang;
    
    setTempTranslation("AI 실시간 번역 중...");

    try {
      // 제미나이 API 호출
      const systemPrompt = `
      You are an expert bilingual live interpreter. Translate the following text from ${sLang} to ${tLang}.
      Tone and Manner requirement: ${toneManner}.
      - formal: Polite, professional honorific business tone.
      - casual: Natural, friendly spoken colloquial tone.
      - tech: Precise and clear engineering/IT terms translation.
      Output ONLY the translated result without any quotes, introduction, or explanation.
      `;

      let translatedText = "";
      
      if (apiConfig && apiConfig.apiKey) {
        // 클라이언트에서 제미나이 직접 호출 (초저지연)
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiConfig.apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: systemPrompt },
                { text: `Translate this text: "${text}"` }
              ]
            }],
            generationConfig: {
              temperature: 0.3
            }
          })
        });

        const data = await response.json();
        translatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        translatedText = translatedText.replace(/^"|"$/g, '').trim(); // 불필요한 따옴표 청소
      }

      // API Key가 없거나 번역에 실패한 경우 브라우저 번역 가상화 Fallback 작동
      if (!translatedText) {
        translatedText = `[AI 번역] ${text} (Gemini API Key를 시스템 설정에 입력하시면 자동 활성화됩니다)`;
      }

      setTempTranslation(translatedText);

      // 음성 자동 재생 (TTS)
      if (isAutoPlayTts) {
        speakText(translatedText, tLang);
      }

      // DB 이력 적재 API 호출
      const logRes = await apiFetch('/api/interpretation/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_uuid: currentSessionUuid,
          speaker_role: speaker,
          original_text: text,
          translated_text: translatedText
        })
      });

      const logData = await logRes.json();
      if (logData.success) {
        setSpeechLogs(prev => [...prev, {
          role: speaker,
          original: text,
          translated: translatedText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        }]);
        setTempInput("");
        setTempTranslation("");
      }

    } catch (err) {
      console.error('Gemini 번역 또는 로그 적재 실패:', err);
      setTempTranslation("[통역 오류 발생]");
    }
  };

  // TTS(음성 합성) 재생 헬퍼
  const speakText = (text: string, lang: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    // 현재 재생 중인 모든 발화 취소
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = getLangCode(lang);
    
    // 비즈니스 톤에 따른 재생 속도 미세 조절
    utterance.rate = toneManner === 'tech' ? 1.05 : 0.95; 
    
    window.speechSynthesis.speak(utterance);
  };

  // 5. 음성 인식 및 로컬 녹음 중단
  const stopListening = () => {
    setIsRecording(false);
    setActiveSpeaker(null);

    if (recognitionRef.current) {
      recognitionRef.current.onend = null; // 루프 해제
      recognitionRef.current.stop();
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  // 6. 대화 완전히 종료 및 오디오 파일/텍스트 일괄 서버 전송 (PATCH)
  const finishSession = async () => {
    if (!sessionUuid) {
      alert('진행 중인 통역 세션이 없습니다.');
      return;
    }

    stopListening();
    setIsUploading(true);
    setUploadProgress(10);

    try {
      const formData = new FormData();
      formData.append('session_uuid', sessionUuid);

      // 브라우저 폰 로컬 메모리에 누적되어 있던 오디오 청크들을 병합
      if (audioChunksRef.current.length > 0) {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        formData.append('audio', audioBlob, 'recording.wav');
        setUploadProgress(50);
      }

      const res = await apiFetch(`/api/interpretation/sessions`, {
        method: 'PATCH',
        body: formData
      });

      setUploadProgress(80);
      const data = await res.json();
      setUploadProgress(100);

      if (data.success) {
        alert('대면 통역이 무사히 종료되었으며, 오디오 녹음 및 전체 대화 스크립트 파일이 회의기록 AI 연동용 폴더와 데이터베이스에 성공적으로 적재되었습니다!');
        setSessionUuid(null);
        setSpeechLogs([]);
        fetchHistory();
      } else {
        alert(`저장 실패: ${data.error}`);
      }

    } catch (err: any) {
      console.error('세션 저장 통신 에러:', err);
      alert(`세션 저장 중 통신 에러가 발생했습니다: ${err.message}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // 상세 히스토리 내역 조회
  const viewSessionDetail = async (session: SavedSession) => {
    try {
      const res = await apiFetch(`/api/interpretation/sessions?action=detail&uuid=${session.uuid}`);
      const data = await res.json();
      if (data.success) {
        setSelectedHistorySession({
          session,
          logs: data.logs || []
        });
      }
    } catch (err) {
      console.error('세션 상세 로드 실패:', err);
      alert('세션 정보를 불러오는 중 에러가 발생했습니다.');
    }
  };

  const getLanguageLabel = (code: string) => {
    switch (code) {
      case 'ko': return '한국어 🇰🇷';
      case 'en': return '영어 🇺🇸';
      case 'ja': return '일본어 🇯🇵';
      case 'zh': return '중국어 🇨🇳';
      case 'vi': return '베트남어 🇻🇳';
      default: return code;
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-950 text-white flex flex-col font-sans select-none overflow-hidden relative">
      
      {/* 🚀 AI 백그라운드 디자인 그라데이션 광채 */}
      <div className="absolute top-[-10%] left-[-20%] w-[80vw] h-[50vh] bg-indigo-900/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-20%] w-[80vw] h-[50vh] bg-pink-900/10 rounded-full blur-[120px] pointer-events-none" />

      {/* 모바일 화면 헤더 */}
      <header className="px-5 py-4 bg-slate-900/60 backdrop-blur-md border-b border-slate-850 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
            <Languages className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-xs font-black tracking-wider uppercase flex items-center gap-1.5">
              실시간 통역 AI
              <span className="px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[8px] font-extrabold flex items-center gap-0.5 animate-pulse">
                <Sparkles className="w-2 h-2" /> Live
              </span>
            </h1>
            <p className="text-[9px] text-slate-500 font-bold mt-0.5">Gemini 3.5 Live Translate</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button 
            onClick={() => setIsHistoryOpen(true)}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            title="통역 히스토리"
          >
            <History className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setIsSettingOpen(true)}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            title="설정"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 메인 통역 대화 바디 (마주보기 모드 지원) */}
      <main className="flex-1 flex flex-col min-h-0 relative">
        {isSplitMode ? (
          // 2. 50:50 마주보기 분할 스크린 뷰
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* 상단 180도 회전 영역 (상대방 전용 영역) */}
            <div className="flex-1 border-b border-slate-850 bg-slate-950/20 p-5 flex flex-col justify-end rotate-180 text-left overflow-y-auto">
              <div className="space-y-4 max-w-lg mx-auto w-full">
                <div className="px-3 py-1.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-extrabold w-fit">
                  상대방 (Guest) - {getLanguageLabel(targetLang)}
                </div>
                {speechLogs.length === 0 && !tempInput && (
                  <p className="text-xs text-slate-650 font-bold leading-relaxed italic">
                    하단의 마이크 버튼을 활성화하고 말하면 여기에 번역된 텍스트가 상대방 방향으로 180도 뒤집혀 즉시 렌더링됩니다.
                  </p>
                )}
                {speechLogs.map((log, i) => (
                  <div key={i} className={`space-y-1.5 ${log.role === 'guest' ? 'opacity-100' : 'opacity-60'}`}>
                    <p className="text-sm font-semibold text-slate-350">{log.role === 'guest' ? log.original : log.translated}</p>
                    <p className="text-[10px] font-extrabold text-emerald-400">번역: {log.role === 'guest' ? log.translated : log.original}</p>
                  </div>
                ))}
                {activeSpeaker === 'guest' && tempInput && (
                  <div className="space-y-1.5 animate-pulse">
                    <p className="text-sm font-semibold text-indigo-400">{tempInput}</p>
                    <p className="text-[10px] font-extrabold text-amber-500">{tempTranslation}</p>
                  </div>
                )}
              </div>
            </div>

            {/* 하단 정방향 영역 (내 전용 영역) */}
            <div className="flex-1 bg-slate-950/10 p-5 flex flex-col justify-end text-left overflow-y-auto">
              <div className="space-y-4 max-w-lg mx-auto w-full">
                <div className="px-3 py-1.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[9px] font-extrabold w-fit">
                  나 (Host) - {getLanguageLabel(sourceLang)}
                </div>
                {speechLogs.length === 0 && !tempInput && (
                  <p className="text-xs text-slate-650 font-bold leading-relaxed italic">
                    본인의 마이크 버튼을 클릭한 뒤 말씀하시면 실시간으로 통역이 개시됩니다.
                  </p>
                )}
                {speechLogs.map((log, i) => (
                  <div key={i} className={`space-y-1.5 ${log.role === 'host' ? 'opacity-100' : 'opacity-60'}`}>
                    <p className="text-sm font-semibold text-slate-350">{log.role === 'host' ? log.original : log.translated}</p>
                    <p className="text-[10px] font-extrabold text-indigo-400">번역: {log.role === 'host' ? log.translated : log.original}</p>
                  </div>
                ))}
                {activeSpeaker === 'host' && tempInput && (
                  <div className="space-y-1.5 animate-pulse">
                    <p className="text-sm font-semibold text-indigo-400">{tempInput}</p>
                    <p className="text-[10px] font-extrabold text-amber-500">{tempTranslation}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          // 1. 일반 메신저 대화형 모드
          <div className="flex-1 p-5 overflow-y-auto flex flex-col space-y-4">
            {speechLogs.length === 0 && !tempInput && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4 opacity-70">
                <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center shadow-lg text-slate-500 animate-bounce">
                  <Languages className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">대화 내용이 존재하지 않습니다</h3>
                  <p className="text-[10px] text-slate-600 font-bold mt-1 max-w-xs leading-relaxed">
                    하단의 다국어 마이크 버튼을 탭하여 실시간 번역 통역을 개시하세요.
                  </p>
                </div>
              </div>
            )}

            {speechLogs.map((log, idx) => {
              const isHost = log.role === 'host';
              return (
                <div key={idx} className={`flex flex-col space-y-1.5 ${isHost ? 'items-end' : 'items-start'}`}>
                  <span className="text-[9px] text-slate-600 font-extrabold px-1">{isHost ? `임직원 (${log.time})` : `바이어 (${log.time})`}</span>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 border shadow-md relative leading-relaxed text-xs font-bold text-left ${
                    isHost 
                      ? 'bg-indigo-650/10 border-indigo-500/20 text-white rounded-tr-none' 
                      : 'bg-slate-900 border-slate-800 text-slate-200 rounded-tl-none'
                  }`}>
                    <p className="text-[10px] text-slate-500 mb-1 font-mono">Original: {log.original}</p>
                    <p className="text-white text-sm font-semibold">{log.translated}</p>
                    <button 
                      onClick={() => speakText(log.translated, isHost ? targetLang : sourceLang)}
                      className="absolute bottom-2 right-2 p-1 text-slate-500 hover:text-white rounded transition cursor-pointer"
                      title="다시 듣기"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* 실시간 타이핑 중인 임시 번역 데이터 */}
            {tempInput && (
              <div className={`flex flex-col space-y-1.5 ${activeSpeaker === 'host' ? 'items-end' : 'items-start'} animate-pulse`}>
                <span className="text-[9px] text-amber-500 font-extrabold px-1">인식 중...</span>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 border border-dashed text-left ${
                  activeSpeaker === 'host' 
                    ? 'bg-indigo-950/20 border-indigo-500/40 text-slate-300 rounded-tr-none' 
                    : 'bg-slate-900/60 border-slate-800 text-slate-300 rounded-tl-none'
                }`}>
                  <p className="text-[10px] text-slate-500 mb-1">인식중: {tempInput}</p>
                  <p className="text-amber-400 text-sm font-extrabold">{tempTranslation}</p>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        )}

        {/* 6. 파일 업로드 로딩 바 */}
        {isUploading && (
          <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center z-[999] px-6 select-none animate-fade-in">
            <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center shadow-2xl mb-4 relative">
              <RefreshCw className="w-7 h-7 text-indigo-500 animate-spin" />
            </div>
            <h4 className="text-xs font-black text-white uppercase tracking-wider">음성 녹음 및 대화 이력 저장 중</h4>
            <p className="text-[10px] text-slate-500 font-bold mt-1 text-center max-w-xs leading-normal">
              스마트폰 기기 자체 메모리에 기록된 대면 오디오 파일(.wav)과 텍스트를 취합하여 회의기록 AI 서버에 전송 중입니다.
            </p>
            <div className="w-full max-w-xs bg-slate-900 h-1.5 rounded-full overflow-hidden mt-4 border border-slate-800/50">
              <div className="bg-indigo-600 h-full rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
            </div>
            <span className="text-[9px] text-indigo-400 font-black mt-2">{uploadProgress}% 완료</span>
          </div>
        )}
      </main>

      {/* 오디오 비주얼라이저 캔버스 영역 */}
      {isRecording && (
        <div className="w-full h-12 bg-slate-950/40 border-t border-slate-900/60 flex items-center justify-center shrink-0">
          <canvas ref={canvasRef} width={300} height={40} className="w-full max-w-xs h-full" />
        </div>
      )}

      {/* 하단 인터랙션 컨트롤 패널 */}
      <footer className="p-5 bg-slate-900/40 backdrop-blur-md border-t border-slate-850 shrink-0 flex flex-col gap-4 z-10">
        
        {/* 언어 쌍 및 모드 선택 */}
        <div className="flex items-center justify-between gap-3">
          <button 
            onClick={() => setIsSplitMode(!isSplitMode)}
            className={`px-3 py-2 rounded-xl text-[10px] font-black border transition cursor-pointer flex items-center gap-1.5 ${
              isSplitMode 
                ? 'bg-indigo-600/10 border-indigo-500/30 text-indigo-400 shadow-inner' 
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            {isSplitMode ? '대면 마주보기 모드' : '채팅 메신저 모드'}
          </button>

          <div className="flex items-center gap-1.5 bg-slate-950/70 border border-slate-850 px-3 py-1.5 rounded-xl text-xs font-black">
            <span>{getLanguageLabel(sourceLang)}</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            <span>{getLanguageLabel(targetLang)}</span>
          </div>
        </div>

        {/* 대형 음성 제어 및 종료 버튼 영역 */}
        <div className="grid grid-cols-5 gap-3.5 items-center justify-items-center">
          
          {/* 1. Host(나) 마이크 버튼 */}
          <div className="col-span-2 w-full text-center">
            <button
              onClick={() => isRecording && activeSpeaker === 'host' ? stopListening() : startListening('host')}
              className={`w-full py-3.5 rounded-2xl flex flex-col items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                isRecording && activeSpeaker === 'host'
                  ? 'bg-indigo-600 border-indigo-500 text-white animate-pulse shadow-lg shadow-indigo-600/35'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              {isRecording && activeSpeaker === 'host' ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              <span className="text-[9px] font-black uppercase tracking-wider">나의 마이크</span>
            </button>
          </div>

          {/* 2. 대화 완료 / 종료 버튼 (중앙) */}
          <div className="col-span-1">
            <button
              onClick={finishSession}
              disabled={!sessionUuid}
              className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 disabled:bg-slate-900 border border-rose-500 disabled:border-slate-850 text-white disabled:text-slate-600 shadow-lg shadow-rose-600/20 disabled:shadow-none flex items-center justify-center transition-all cursor-pointer"
              title="대화 완료 및 서버 저장"
            >
              <Square className="w-5 h-5 fill-white" />
            </button>
          </div>

          {/* 3. Guest(상대방) 마이크 버튼 */}
          <div className="col-span-2 w-full text-center">
            <button
              onClick={() => isRecording && activeSpeaker === 'guest' ? stopListening() : startListening('guest')}
              className={`w-full py-3.5 rounded-2xl flex flex-col items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                isRecording && activeSpeaker === 'guest'
                  ? 'bg-emerald-600 border-emerald-500 text-white animate-pulse shadow-lg shadow-emerald-600/35'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              {isRecording && activeSpeaker === 'guest' ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              <span className="text-[9px] font-black uppercase tracking-wider">상대방 마이크</span>
            </button>
          </div>

        </div>

      </footer>

      {/* ⚙️ 시스템 설정 모달 모음 */}
      {isSettingOpen && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-2xl relative text-left">
            <button 
              onClick={() => setIsSettingOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-full bg-slate-950 text-slate-500 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-xs font-black text-white tracking-wider uppercase flex items-center gap-1.5">
              <Settings className="w-4 h-4 text-indigo-400" />
              통역 시스템 세팅
            </h3>

            <div className="space-y-3.5 pt-2">
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 font-extrabold">출발어 (내 언어)</label>
                <select 
                  value={sourceLang} 
                  onChange={(e) => setSourceLang(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:outline-none text-xs text-white font-bold"
                >
                  <option value="ko">한국어 🇰🇷</option>
                  <option value="en">영어 🇺🇸</option>
                  <option value="ja">일본어 🇯🇵</option>
                  <option value="zh">중국어 🇨🇳</option>
                  <option value="vi">베트남어 🇻🇳</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 font-extrabold">도착어 (상대방 언어)</label>
                <select 
                  value={targetLang} 
                  onChange={(e) => setTargetLang(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:outline-none text-xs text-white font-bold"
                >
                  <option value="en">영어 🇺🇸</option>
                  <option value="ko">한국어 🇰🇷</option>
                  <option value="ja">일본어 🇯🇵</option>
                  <option value="zh">중국어 🇨🇳</option>
                  <option value="vi">베트남어 🇻🇳</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 font-extrabold">AI 비즈니스 톤앤매너</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'formal', label: '비즈니스 격식' },
                    { id: 'casual', label: '일상 구어체' },
                    { id: 'tech', label: '기술 전문' }
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => setToneManner(t.id)}
                      className={`py-2 rounded-xl text-[10px] font-black border transition cursor-pointer ${
                        toneManner === t.id
                          ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400'
                          : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-white'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-850 pt-4">
                <span className="text-[10px] text-slate-400 font-extrabold">번역된 음성 자동 듣기 (TTS)</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={isAutoPlayTts}
                    onChange={(e) => setIsAutoPlayTts(e.target.checked)}
                    className="sr-only peer" 
                  />
                  <div className="w-9 h-5 bg-slate-850 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-500 peer-checked:after:bg-indigo-500 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600/20 border border-slate-800"></div>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 📜 통역 히스토리 리스트 모달 */}
      {isHistoryOpen && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="w-full max-w-sm h-[70vh] bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col shadow-2xl relative text-left">
            <button 
              onClick={() => setIsHistoryOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-full bg-slate-950 text-slate-500 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-xs font-black text-white tracking-wider uppercase flex items-center gap-1.5 shrink-0">
              <History className="w-4 h-4 text-indigo-400" />
              통역 및 녹음 대장
            </h3>

            <div className="flex-1 overflow-y-auto mt-4 pr-1 space-y-3">
              {savedSessions.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-12 font-bold">기록된 통역 대화가 없습니다.</p>
              ) : (
                savedSessions.map((s) => (
                  <div 
                    key={s.uuid}
                    onClick={() => viewSessionDetail(s)}
                    className="p-3.5 bg-slate-950/50 border border-slate-850 hover:border-indigo-500/30 rounded-2xl transition cursor-pointer space-y-2"
                  >
                    <div className="flex justify-between items-center text-[10px] font-black">
                      <span className="text-indigo-400">{getLanguageLabel(s.source_lang)} ➔ {getLanguageLabel(s.target_lang)}</span>
                      <span className="text-slate-650">{s.created_at}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium truncate">UUID: {s.uuid}</p>
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-900">
                      {s.file_path && (
                        <span className="text-[8px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded-md font-bold flex items-center gap-0.5">
                          📝 스크립트 보관됨
                        </span>
                      )}
                      {s.audio_file_path && (
                        <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-md font-bold flex items-center gap-0.5">
                          🎵 녹음파일 저장됨
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 📝 상세 히스토리 뷰 팝업 */}
      {selectedHistorySession && (
        <div className="absolute inset-0 bg-slate-950/95 flex flex-col z-[60] text-left">
          <header className="px-5 py-4 border-b border-slate-850 bg-slate-900 flex items-center justify-between">
            <div>
              <h4 className="text-xs font-black tracking-wider uppercase text-white flex items-center gap-1.5">
                통역 미팅 상세 상세
              </h4>
              <p className="text-[8px] text-slate-500 font-bold mt-0.5">{selectedHistorySession.session.created_at}</p>
            </div>
            <button 
              onClick={() => setSelectedHistorySession(null)}
              className="p-2 bg-slate-950 text-slate-400 hover:text-white rounded-xl cursor-pointer"
            >
              닫기
            </button>
          </header>

          <main className="flex-1 p-5 overflow-y-auto space-y-4">
            
            {/* 오디오 파일 플레이어 카드 (녹음이 보존되어 있는 경우) */}
            {selectedHistorySession.session.audio_file_path && (
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-extrabold flex items-center gap-1">
                    <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
                    대화 녹음 현장 음성 재생
                  </span>
                  <span className="text-[8px] bg-slate-950 px-2 py-0.5 rounded text-emerald-400 border border-emerald-950 font-bold">WAV Format</span>
                </div>
                <audio 
                  src={selectedHistorySession.session.audio_file_path} 
                  controls 
                  className="w-full h-8 rounded-lg bg-slate-950" 
                />
              </div>
            )}

            {/* 대화 스크립트 타임라인 */}
            <div className="space-y-3">
              <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-wider">대화 스크립트 타임라인</h5>
              {selectedHistorySession.logs.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-6">세부 발화 로그가 없습니다.</p>
              ) : (
                selectedHistorySession.logs.map((log: any, index: number) => {
                  const isHost = log.speaker_role === 'host';
                  return (
                    <div key={log.id || index} className="p-3 bg-slate-900/40 border border-slate-850 rounded-2xl space-y-1.5">
                      <div className="flex justify-between items-center text-[9px] font-bold text-slate-550">
                        <span>{isHost ? '임직원 (Host)' : '상대방 (Guest)'}</span>
                        <span>{log.created_at}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-normal">원문: {log.original_text}</p>
                      <p className="text-xs text-white font-extrabold leading-normal">번역: {log.translated_text}</p>
                    </div>
                  );
                })
              )}
            </div>
          </main>

          <footer className="p-4 bg-slate-900 border-t border-slate-850 flex items-center gap-2">
            {selectedHistorySession.session.file_path && (
              <a 
                href={selectedHistorySession.session.file_path}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3.5 rounded-2xl bg-indigo-650 hover:bg-indigo-750 text-white font-black text-xs text-center transition shadow-md shadow-indigo-600/10 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Share2 className="w-4 h-4" />
                전체 텍스트 스크립트 파일 열기
              </a>
            )}
          </footer>
        </div>
      )}

    </div>
  );
}
