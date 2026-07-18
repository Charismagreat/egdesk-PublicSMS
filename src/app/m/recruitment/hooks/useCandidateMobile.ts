"use client";

import { useState, useEffect, useRef } from "react";
import { JobPosting, ChatLog } from "../types";

export function useCandidateMobile() {
  const [jobPosting, setJobPosting] = useState<JobPosting | null>(null);
  
  // 구직자 정보 상태
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");
  const [experience, setExperience] = useState("");
  const [motivation, setMotivation] = useState("");
  
  // 지원 단계 상태: 'posting' -> 'waiting_interview' -> 'interviewing' -> 'waiting_approve' -> 'contracting' -> 'done'
  const [step, setStep] = useState<"posting" | "waiting_interview" | "interviewing" | "waiting_approve" | "contracting" | "done">("posting");
  
  // AI 면접 상태
  const [chatInput, setChatInput] = useState("");
  const [chatLogs, setChatLogs] = useState<ChatLog[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [candidateId, setCandidateId] = useState("");
  
  // Canvas 근로계약서 서명 관련 상태
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // 1. 공고 로드 및 실시간 동기화 리스너
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedJob = localStorage.getItem("egdesk_recruitment_job");
      if (savedJob) {
        setJobPosting(JSON.parse(savedJob));
      } else {
        // 프리셋 더미 공고 주입
        const defaultJob: JobPosting = {
          id: "JOB_DEMO",
          title: "강남역 핫플레이스 베이커리 카페 크루 및 바리스타 파트타임 채용",
          category: "스페셜티 바리스타",
          salary: "시급 12,000원",
          timeRange: "토, 일요일 09:30 ~ 17:30 (조율 가능)",
          location: "서울시 강남구 신분당선 강남역 부근",
          description: "달콤한 빵 향기와 스페셜티 커피의 깊은 조화를 전하며, 인스타그래머블한 감성 매장에서 함께 호흡을 맞출 긍정적이고 힙한 바리스타 크루를 환영합니다.",
          requirements: [
            "미소가 밝고 고객과의 따뜻한 커뮤니케이션을 소중히 여기시는 분",
            "바리스타 또는 관련 요식업 F&B 서비스 경력자 우대",
            "주말 근무 시간 엄수 및 약속이 신뢰할 수 있는 분"
          ],
          createdAt: new Date().toLocaleDateString()
        };
        setJobPosting(defaultJob);
      }

      // 사장님 탭의 이벤트 수신용 리스너
      const handleEmployerSync = (e: StorageEvent) => {
        if (e.key === "egdesk_recruitment_sync" && e.newValue) {
          try {
            const data = JSON.parse(e.newValue);
            
            // 공고 새로고침 수신
            if (data.action === "job_posted" && data.job) {
              setJobPosting(data.job);
            }
            
            // 사장님이 AI 면접을 승인한 경우
            if (data.action === "interview_start" && data.applicantId) {
              const currentId = localStorage.getItem("egdesk_recruitment_candidate_id") || "";
              if (data.applicantId === currentId || currentId === "") {
                setCandidateId(data.applicantId || currentId);
                setStep("interviewing");
                
                // 첫 면접 질문 로드
                const savedJobData = localStorage.getItem("egdesk_recruitment_job");
                const currentCategory = savedJobData ? JSON.parse(savedJobData).category : "스페셜티 바리스타";
                const firstQuestion = getFirstQuestion(currentCategory);
                const initialLogs = [
                  { sender: "ai" as const, text: firstQuestion, timestamp: new Date().toLocaleTimeString() }
                ];
                setChatLogs(initialLogs);
                
                // 사장님 화면에 초기 상태 중계
                localStorage.setItem("egdesk_recruitment_sync", JSON.stringify({
                  action: "interview_msg",
                  applicantId: data.applicantId || currentId,
                  logs: initialLogs,
                  isDone: false,
                  timestamp: Date.now()
                }));
              }
            }

            // 사장님이 합격을 최종 승인하여 근로계약서 개방
            if (data.action === "contract_open" && data.applicantId) {
              const currentId = localStorage.getItem("egdesk_recruitment_candidate_id") || "";
              if (data.applicantId === currentId || currentId === "") {
                setStep("contracting");
              }
            }
          } catch (err) {
            console.error("구직자 동기화 처리 실패", err);
          }
        }
      };

      window.addEventListener("storage", handleEmployerSync);
      return () => window.removeEventListener("storage", handleEmployerSync);
    }
  }, []);

  // 대화록 스크롤 하단 고정
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatLogs]);

  // 직종별 첫 면접 질문 매핑
  const getFirstQuestion = (cat: string) => {
    if (cat.includes("바리스타") || cat.includes("카페")) {
      return "반갑습니다! 비대면 AI 면접관입니다. ☕️✨ 저희 브랜드 스페셜티 바리스타 직무에 매력적인 프로필로 지원해주셔서 기뻐요. 과거 카페나 식음료 매장, 혹은 유사한 소통 중심 서비스직에서 일해 본 경험이나 당시 느낀 소중한 원칙이 있다면 편하게 말씀해 주세요!";
    } else if (cat.includes("서빙") || cat.includes("알바")) {
      return "안녕하세요! 비대면 AI 면접관입니다. 🍽️ 매장 홀 서비스 파트타임 직무에 지원해주셨네요. 피크 시간이나 매장이 매우 혼잡할 때 여러 고객의 각기 다른 요구를 유연하면서도 침착하게 조율하는 본인만의 따뜻한 비결이나 마인드가 있을까요?";
    } else if (cat.includes("영업") || cat.includes("판매") || cat.includes("마케팅")) {
      return "반갑습니다! AI 면접관입니다. 📈 매장 라이프스타일 큐레이팅 및 홍보 크루 직무에 지원해 주셔서 감사해요. 처음 오시는 낯선 고객께도 저희 브랜드 스토리를 자연스럽게 설득력 있게 풀어내기 위해 중요시하는 대화 철학이 있다면 듣고 싶습니다.";
    } else {
      return "안녕하세요! AI 면접관입니다. 🙌 저희 팀 브랜드 구인 피드에 유입 지원해 주셔서 환영해요. 과거 다양한 사회 활동 또는 프로젝트 과정에서 본인의 성실함이나 긍정적 끈기를 멋지게 발휘해 냈던 경험을 편하게 던져주세요!";
    }
  };

  // 구직자 간편 지원 신청 제출
  const handleApplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !experience || !motivation) {
      alert("모든 필수 항목을 입력해주세요!");
      return;
    }

    const uniqueId = `APP_${Date.now()}`;
    setCandidateId(uniqueId);
    if (typeof window !== "undefined") {
      localStorage.setItem("egdesk_recruitment_candidate_id", uniqueId);
    }

    // AI 직무 매칭 점수 계산 (75~98% 사이)
    const matchingScore = Math.floor(Math.random() * 24) + 75;

    const applicantData = {
      id: uniqueId,
      name,
      age: age || "24",
      phone,
      experience,
      motivation,
      matchingScore,
      status: "applied" as const,
      interviewLogs: []
    };

    // 사장님 탭으로 실시간 지원서 제출 알림 브로드캐스트
    if (typeof window !== "undefined") {
      localStorage.setItem("egdesk_recruitment_sync", JSON.stringify({
        action: "applied",
        applicant: applicantData,
        timestamp: Date.now()
      }));
    }

    setStep("waiting_interview");
  };

  // AI 면접 답변 전송 및 동적 NLP 다음 질문 처리
  const handleSendInterviewMessage = () => {
    if (!chatInput.trim()) return;

    const userText = chatInput.trim();
    const nextLogs = [
      ...chatLogs,
      { sender: "candidate" as const, text: userText, timestamp: new Date().toLocaleTimeString() }
    ];
    setChatLogs(nextLogs);
    setChatInput("");

    // 사장님 화면에 구직자의 실시간 대화 전송 중계
    if (typeof window !== "undefined") {
      localStorage.setItem("egdesk_recruitment_sync", JSON.stringify({
        action: "interview_msg",
        applicantId: candidateId,
        logs: nextLogs,
        isDone: false,
        timestamp: Date.now()
      }));
    }

    // AI 면접관의 동적 피드백 및 다음 질문 (총 3단계 질답 진행)
    setTimeout(() => {
      let aiResponseText = "";
      const lowerUserText = userText.toLowerCase();
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);

      if (nextIndex === 1) {
        let trait = "소통 에너지가 풍부하고 따뜻한";
        if (lowerUserText.includes("경력") || lowerUserText.includes("일해") || lowerUserText.includes("년") || lowerUserText.includes("개월")) {
          trait = "든든한 현장 실전 핏을 지니신";
        } else if (lowerUserText.includes("성실") || lowerUserText.includes("책임") || lowerUserText.includes("꾸준")) {
          trait = "책임감이 두터워 깊은 신뢰가 가는";
        }
        
        aiResponseText = `답변을 정독해보니 정말 ${trait} 분이라는 확신이 듭니다! 👍✨\n\n두 번째 질문을 드릴게요. 저희 매장은 서로 도우며 활기차게 시너지를 내는 '팀 크루 간의 유기적 시너지'를 매우 아낍니다. 과거에 동료나 친구와 긍정적으로 융화되어 무언가를 성취해 보셨던 따스한 추억이나 요령이 있다면 알려주시겠어요?`;
      } else if (nextIndex === 2) {
        aiResponseText = `팀워크를 다루는 따뜻한 배려심이 돋보입니다. 😊\n\n마지막 세 번째 질문입니다! 혹시 뜻하지 않은 트러블이나, 혹은 본인의 실수로 현장 업무에 예기치 못한 이슈가 생겼을 때, 가장 먼저 취하실 신속하고 책임감 있는 보고 및 대처 태도에 대해 최종 의견을 들려주세요.`;
      } else {
        const strengths = [
          "친근하고 설득력 있는 어조로 크루 및 고객과의 높은 소통 지능 보임",
          "예기치 못한 문제 상황에서 책임감 있는 즉각 보고와 대처 자세가 돋보임"
        ];
        if (motivation.includes("열심히") || userText.includes("열심")) {
          strengths.push("매우 풍부하고 적극적인 실천 에너지를 표명함");
        } else {
          strengths.push("매너 있고 품격 있는 서비스 애티튜드를 갖춤");
        }

        const evaluation = {
          strengths,
          weaknesses: ["피크 시간대 초반 동선 적응을 위한 짧은 코칭 요망"],
          finalVerdict: `${name} 지원자는 저희 매장의 인스타그래머블한 매력을 직접 현장에서 꽃피워 낼 특급 케미 크루입니다. 사장님께 적극적인 합격 패스를 추천해 드립니다.`
        };

        aiResponseText = `🎉 정말 수고하셨습니다! 이로써 1:1 비대면 AI 챗 면접이 조화롭게 완료되었습니다.\n\n지원자님의 멋진 면접 요약본이 실시간 추천 리포트가 되어 사장님 피드 결재함에 즉각 도달하였습니다.\n\n사장님께서 최종 채용 결재를 조율하고 계시니, 이 창을 열어둔 채 잠시만 설레는 마음으로 대기해 주세요!`;
        
        const finalLogs = [
          ...nextLogs,
          { sender: "ai" as const, text: aiResponseText, timestamp: new Date().toLocaleTimeString() }
        ];
        setChatLogs(finalLogs);

        // 사장님 탭으로 최종 면접 완료 신호 및 AI 보고서 전송
        if (typeof window !== "undefined") {
          localStorage.setItem("egdesk_recruitment_sync", JSON.stringify({
            action: "interview_msg",
            applicantId: candidateId,
            candidateName: name,
            logs: finalLogs,
            isDone: true,
            evaluation,
            timestamp: Date.now()
          }));
        }

        setStep("waiting_approve");
        return;
      }

      const updatedLogs = [
        ...nextLogs,
        { sender: "ai" as const, text: aiResponseText, timestamp: new Date().toLocaleTimeString() }
      ];
      setChatLogs(updatedLogs);

      // 사장님 탭 동기화 전송
      if (typeof window !== "undefined") {
        localStorage.setItem("egdesk_recruitment_sync", JSON.stringify({
          action: "interview_msg",
          applicantId: candidateId,
          logs: updatedLogs,
          isDone: false,
          timestamp: Date.now()
        }));
      }
    }, 1800);
  };

  // PC/모바일 서명 그리기 캔버스 헬퍼
  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    if ("touches" in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const coords = getCanvasCoords(e);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000000";
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const coords = getCanvasCoords(e);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    setHasSigned(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
  };

  // 친필 서명 제출 및 계약 체결 최종 등록
  const handleSubmitContract = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSigned) {
      alert("스케치 서명 패드에 친필 사인을 작성해 주세요!");
      return;
    }

    const signatureUrl = canvas.toDataURL("image/png");

    // 사장님 탭으로 서명 완료 데이터 브로드캐스트
    if (typeof window !== "undefined") {
      localStorage.setItem("egdesk_recruitment_sync", JSON.stringify({
        action: "contract_signed",
        applicantId: candidateId,
        signatureUrl,
        timestamp: Date.now()
      }));
    }

    setStep("done");
  };

  return {
    jobPosting,
    name, setName,
    age, setAge,
    phone, setPhone,
    experience, setExperience,
    motivation, setMotivation,
    step, setStep,
    chatInput, setChatInput,
    chatLogs, setChatLogs,
    currentQuestionIndex,
    candidateId,
    canvasRef,
    isDrawing,
    hasSigned,
    chatScrollRef,
    handleApplySubmit,
    handleSendInterviewMessage,
    startDrawing,
    draw,
    stopDrawing,
    clearCanvas,
    handleSubmitContract
  };
}
