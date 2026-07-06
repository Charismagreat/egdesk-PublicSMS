"use client";

import { apiFetch } from '@/lib/api';
import { useState, useEffect } from "react";
import { Bot } from "lucide-react";

import { JobPosting, Applicant, ChatMessage } from "./types";
import RecruitmentHeader from "./components/RecruitmentHeader";
import JobPostingBanner from "./components/JobPostingBanner";
import ApplicantStorySlider from "./components/ApplicantStorySlider";
import AiManagerChat from "./components/AiManagerChat";
import ApplicantActionPanel from "./components/ApplicantActionPanel";
import MobileSimulator from "./components/MobileSimulator";

export default function RecruitmentDashboardPage() {
  const [jobPosting, setJobPosting] = useState<JobPosting | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      sender: "ai",
      text: "안녕하세요! EGDESK AI 인텔리전트 채용 매니저 '이지봇'입니다. 💖✨\n\n인스타그램 스폰서드 마케팅처럼 힙하고 트렌디하게 인재를 끌어들이는 AI 채용 솔루션입니다. 구인공고 작성부터 DM 스타일 AI 면접, 그리고 모바일 모던 근로계약까지 단숨에 완성해 드릴게요!\n\n어떤 매장의 어떤 힙한 직원을 채용하시려나요? 원하시는 직종, 급여, 매장 위치를 편하게 던져주세요!\n\n예: \"성수동 힙한 브런치 카페 주말 바리스타 구함. 시급 12,000원!\"",
      timestamp: new Date(),
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [activeMobileView, setActiveMobileView] = useState<"posting" | "interview" | "contract">("posting");

  // 실시간 동기화 상태 및 링크 복사 상태
  const [liveSyncLog, setLiveSyncLog] = useState<string>("🔄 실시간 구직자 연동 채널 대기 중...");
  const [copiedLink, setCopiedLink] = useState(false);

  // 로컬스토리지 복원 및 실시간 동기화 이벤트 리스너 탑재
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedJob = localStorage.getItem("egdesk_recruitment_job");
      if (savedJob) setJobPosting(JSON.parse(savedJob));

      // SQLite DB로부터 지원자 데이터 실시간 로드 및 LocalStorage 백필
      apiFetch('/api/recruitment/applicants')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.applicants) {
            setApplicants(data.applicants);
            localStorage.setItem("egdesk_recruitment_applicants", JSON.stringify(data.applicants));
          }
        })
        .catch(err => console.error("지원자 데이터베이스 로드 실패:", err));

      // 실시간 양방향 LocalStorage Sync 리스너
      const handleStorageSync = (e: StorageEvent) => {
        if (e.key === "egdesk_recruitment_sync" && e.newValue) {
          try {
            const data = JSON.parse(e.newValue);

            // 1. 지원자 신규 지원 등록 이벤트
            if (data.action === "applied" && data.applicant) {
              const newApplicant: Applicant = data.applicant;
              setApplicants((prev) => {
                const filtered = prev.filter((a) => a.id !== newApplicant.id);
                const updated = [newApplicant, ...filtered];
                localStorage.setItem("egdesk_recruitment_applicants", JSON.stringify(updated));
                return updated;
              });
              setLiveSyncLog(`💖 [New Apply] 방금 힙한 구직자 '${newApplicant.name}' 님이 간편 지원서를 던졌습니다!`);

              setChatMessages((prev) => [
                ...prev,
                {
                  sender: "ai",
                  text: `🔔 **알림: 새로운 인재 지원 완료!**\n\n방금 모바일 채용 링크를 타고 **'${newApplicant.name}(${newApplicant.age}세)'** 님이 매력적인 프로필을 제출했습니다.\n\n• **경력**: ${newApplicant.experience}\n• **지원 동기**: "${newApplicant.motivation}"\n• **AI 매칭도 분석**: 직무 핏 **${newApplicant.matchingScore}%**\n\n구직자 목록에서 프로필을 탭하신 후 **[실시간 AI 면접 개시]**를 눌러 다이렉트 메시지(DM) 스타일의 비대면 실시간 면접을 시작해 보세요!`,
                  timestamp: new Date(),
                },
              ]);
            }

            // 2. 실시간 AI 면접 대화 업데이트 중계
            if (data.action === "interview_msg" && data.applicantId) {
              const nextStatus = data.isDone ? ("interview_done" as const) : ("interviewing" as const);
              
              // SQLite DB에 실시간 면접 로그 및 평가 적재
              apiFetch('/api/recruitment/applicants', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  id: data.applicantId,
                  status: nextStatus,
                  interviewLogs: data.logs,
                  aiEvaluation: data.isDone ? data.evaluation : undefined
                })
              }).catch(err => console.error("면접 진행 DB 업데이트 실패:", err));

              setApplicants((prev) => {
                const updated = prev.map((a) => {
                  if (a.id === data.applicantId) {
                    const updatedApp = {
                      ...a,
                      interviewLogs: data.logs,
                      status: nextStatus,
                      aiEvaluation: data.isDone ? data.evaluation : a.aiEvaluation,
                    };

                    if (selectedApplicant?.id === data.applicantId) {
                      setSelectedApplicant(updatedApp);
                    }
                    return updatedApp;
                  }
                  return a;
                });
                localStorage.setItem("egdesk_recruitment_applicants", JSON.stringify(updated));
                return updated;
              });

              const lastMsg = data.logs[data.logs.length - 1];
              const senderLabel = lastMsg.sender === "ai" ? "🤖 AI면접관" : "👤 지원자";
              setLiveSyncLog(`💬 [Live DM] ${senderLabel}: "${lastMsg.text.substring(0, 18)}..."`);

              // 만약 면접이 최종 완료된 경우 AI 비서가 보고서를 브리핑
              if (data.isDone && data.evaluation) {
                const candidateName = data.candidateName || "구직자";
                setChatMessages((prev) => [
                  ...prev,
                  {
                    sender: "ai",
                    text: `📝 **인스타그램 AI 마케터 분석 리포트 도착**\n\n지원자 **'${candidateName}'** 님의 비대면 AI DM 면접이 종료되었습니다.\n\n• **최종 매칭 코멘트**: ${data.evaluation.finalVerdict}\n• **핵심 시너지 요소**:\n${data.evaluation.strengths.map((s: string) => `  - ${s}`).join("\n")}\n• **주의할 스타일**:\n${data.evaluation.weaknesses.map((w: string) => `  - ${w}`).join("\n")}\n\n분석 리포트 피드를 확인하시고, **[최종 합격 & 모바일 근로계약 요청]** 버튼을 탭해 주세요!`,
                    timestamp: new Date(),
                  },
                ]);
                setActiveMobileView("contract");
              }
            }

            // 3. 근로계약서 모바일 서명 완료 동기화
            if (data.action === "contract_signed" && data.applicantId) {
              const signatureDate = new Date().toLocaleDateString("ko-KR");
              
              // SQLite DB에 모바일 계약 서명 정보 적재
              apiFetch('/api/recruitment/applicants', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  id: data.applicantId,
                  status: "approved",
                  signatureUrl: data.signatureUrl,
                  signedAt: signatureDate
                })
              }).catch(err => console.error("근로계약 완료 DB 업데이트 실패:", err));

              setApplicants((prev) => {
                const updated = prev.map((a) => {
                  if (a.id === data.applicantId) {
                    const updatedApp = {
                      ...a,
                      status: "approved" as const,
                      signatureUrl: data.signatureUrl,
                      signedAt: signatureDate,
                    };
                    if (selectedApplicant?.id === data.applicantId) {
                      setSelectedApplicant(updatedApp);
                    }
                    return updatedApp;
                  }
                  return a;
                });
                localStorage.setItem("egdesk_recruitment_applicants", JSON.stringify(updated));
                return updated;
              });

              setLiveSyncLog(`✍️ [계약 성립] 구직자가 폰으로 모바일 근로계약서에 디지털 사인을 완료했습니다!`);
              setChatMessages((prev) => [
                ...prev,
                {
                  sender: "ai",
                  text: `🎉 **근로계약 매치 완료! 대성공!**\n\n지원자께서 모바일 스마트폰 화면을 통해 친필 전자서명을 무사히 마쳤습니다!\n\n인스타그램 스토리에 자랑하고 싶은 힙한 채용 성사가 이루어졌습니다. 근로계약서가 매장 DB에 안전하게 영구 저장되었습니다.`,
                  timestamp: new Date(),
                },
              ]);
            }
          } catch (err) {
            console.error("실시간 동기화 파싱 에러", err);
          }
        }
      };

      window.addEventListener("storage", handleStorageSync);
      return () => window.removeEventListener("storage", handleStorageSync);
    }
  }, [selectedApplicant]);

  // 사장님의 AI 메시지 전송 및 NLP 처리 시뮬레이션
  const handleSendMessage = (userText: string) => {
    const newUserMsg = { sender: "user" as const, text: userText, timestamp: new Date() };
    setChatMessages((prev) => [...prev, newUserMsg]);
    setIsTyping(true);

    setTimeout(() => {
      let responseText = "";
      const lowerText = userText.toLowerCase();

      // 채용 직군 파싱 분석 엔진
      if (
        lowerText.includes("서빙") ||
        lowerText.includes("알바") ||
        lowerText.includes("카페") ||
        lowerText.includes("바리스타") ||
        lowerText.includes("영업") ||
        lowerText.includes("주방") ||
        lowerText.includes("구함") ||
        lowerText.includes("모집")
      ) {
        let category = "서빙 / 아르바이트";
        let defaultTitle = "매장 홀 서비스 및 고객 소통 파트타임 파트너 구인";
        let salary = "시급 12,000원 (주휴수당 별도)";
        let timeRange = "주말 (토, 일) 11:30 ~ 20:30 (휴게시간 포함)";
        let location = "매장 핫플레이스 내";
        let requirements = [
          "인스타그램 피드처럼 밝고 생기발랄한 에너지를 가지신 분",
          "고객과의 소통 및 피드백을 즐기시는 분 우대",
          "약속과 성실을 1순위로 여기는 프로페셔널",
        ];

        if (lowerText.includes("카페") || lowerText.includes("바리스타")) {
          category = "스페셜티 바리스타";
          defaultTitle = "감성 카페 스페셜티 음료 브루잉 및 고객 응대 크루 채용";
          salary = "시급 11,500원";
        } else if (lowerText.includes("영업") || lowerText.includes("판매") || lowerText.includes("마케팅")) {
          category = "브랜드 영업/홍보 크루";
          defaultTitle = "트렌디 매장 라이프스타일 큐레이팅 및 매장 홍보 정규 직원 채용";
          salary = "월급 2,700,000원 (성과 인센티브 뿜뿜)";
          timeRange = "주 5일 (화~토) 10:00 ~ 19:00";
        } else if (lowerText.includes("주방") || lowerText.includes("조리") || lowerText.includes("쉐프")) {
          category = "키친 조리/플레이팅 크루";
          defaultTitle = "매장 푸드 키친 조리 및 감성 플레이팅 주방 크루 채용";
          salary = "시급 12,500원";
        }

        const newJob: JobPosting = {
          id: `JOB_${Date.now()}`,
          title: defaultTitle,
          category,
          salary,
          timeRange,
          location,
          description: `저희 힙한 매장 브랜드와 함께 즐거운 에너지를 공유하며 일할 멋진 인재를 기다립니다. 긍정적인 애티튜드를 지니신 분이라면 누구나 환영합니다.`,
          requirements,
          createdAt: new Date().toLocaleDateString("ko-KR"),
        };

        setJobPosting(newJob);
        localStorage.setItem("egdesk_recruitment_job", JSON.stringify(newJob));

        // 동적 연동용 동기화 객체 갱신
        localStorage.setItem(
          "egdesk_recruitment_sync",
          JSON.stringify({
            action: "job_posted",
            job: newJob,
            timestamp: Date.now(),
          })
        );

        responseText = `✨ **사장님, 채용 정보를 트렌디하게 분석해 초특급 인스타 감성 구인공고를 피딩했습니다!**\n\n• **공고 제목**: ${newJob.title}\n• **채용 분야**: ${newJob.category}\n• **보상 급여**: ${newJob.salary}\n• **스케줄**: ${newJob.timeRange}\n\n우측 모바일 섀시 시뮬레이터에 **인스타그램 광고 스타일의 구인 피드**가 활성화되었습니다! 하단의 **[구인 링크 복사]** 또는 **[지원자 탭 오픈]**으로 실시간 유입을 유도하세요!`;
        setActiveMobileView("posting");
      } else if (lowerText.includes("삭제") || lowerText.includes("초기화")) {
        setJobPosting(null);
        setApplicants([]);
        setSelectedApplicant(null);
        localStorage.removeItem("egdesk_recruitment_job");
        localStorage.removeItem("egdesk_recruitment_applicants");
        localStorage.removeItem("egdesk_recruitment_sync");
        responseText =
          "🧹 모든 채용 데이터베이스 피드가 깔끔하게 초기화되었습니다. 새로운 채용 직종 키워드를 알려주시면 다시 근사하게 피딩해 드릴게요!";
      } else {
        responseText = `🧐 "${userText}" 라고 메세지를 주셨네요!\n\n현재 이지봇 AI 솔루션은 감성 카페 바리스타, 주방 알바, 힙한 레스토랑 서빙, 매장 브랜드 홍보사원 구인공고 작성 및 DM 스타일 실시간 AI 면접실 구축을 정밀 지원합니다.\n\n구인하시고자 하는 브랜드 성격이나 급여를 가볍게 던져주시면 0.1초 만에 셋업해 드립니다!\n\n*(예: "성수동 카페 주말 야간 알바 구함 시급 1.1만")*`;
      }

      setChatMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: responseText,
          timestamp: new Date(),
        },
      ]);
      setIsTyping(false);
    }, 1200);
  };

  // 채용 공고 링크 복사
  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      const link = `${window.location.origin}/m/recruitment?jobId=${jobPosting?.id || "DEMO"}`;
      navigator.clipboard.writeText(link).then(() => {
        setCopiedLink(true);
        setLiveSyncLog("🔗 인스타 스타일 모바일 지원 링크가 클립보드에 카피되었습니다!");
        setTimeout(() => setCopiedLink(false), 2500);
      });
    }
  };

  // 채용 공고 링크 즉시 열기
  const handleOpenLink = () => {
    if (typeof window !== "undefined") {
      const link = `${window.location.origin}/m/recruitment?jobId=${jobPosting?.id || "DEMO"}`;
      window.open(link, "_blank");
    }
  };

  // 사장님이 지원자 면접 개시 승인
  const handleApproveInterview = (app: Applicant) => {
    // SQLite DB 상태 업데이트
    apiFetch('/api/recruitment/applicants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: app.id, status: 'interviewing' })
    }).catch(err => console.error("면접 승인 DB 업데이트 실패:", err));

    const updatedApplicants = applicants.map((a) => {
      if (a.id === app.id) {
        return { ...a, status: "interviewing" as const };
      }
      return a;
    });
    setApplicants(updatedApplicants);
    localStorage.setItem("egdesk_recruitment_applicants", JSON.stringify(updatedApplicants));

    const target = updatedApplicants.find((a) => a.id === app.id);
    if (target) setSelectedApplicant(target);

    // 구직자 모바일 화면을 AI 면접실로 전환시키는 이벤트 브로드캐스트
    localStorage.setItem(
      "egdesk_recruitment_sync",
      JSON.stringify({
        action: "interview_start",
        applicantId: app.id,
        timestamp: Date.now(),
      })
    );

    setLiveSyncLog(`🚀 '${app.name}' 지원자와의 실시간 AI 1:1 DM 면접방이 개방되었습니다!`);
    setActiveMobileView("interview");
  };

  // 최종 합격 처리 승인 (전자 근로계약서 개방)
  const handleApproveHiring = (app: Applicant) => {
    // SQLite DB 상태 업데이트
    apiFetch('/api/recruitment/applicants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: app.id, status: 'approved' })
    }).catch(err => console.error("채용 승인 DB 업데이트 실패:", err));

    const updatedApplicants = applicants.map((a) => {
      if (a.id === app.id) {
        return { ...a, status: "approved" as const };
      }
      return a;
    });
    setApplicants(updatedApplicants);
    localStorage.setItem("egdesk_recruitment_applicants", JSON.stringify(updatedApplicants));

    const target = updatedApplicants.find((a) => a.id === app.id);
    if (target) setSelectedApplicant(target);

    // 구직자 화면을 근로계약서 서명창으로 전환시키는 이벤트 브로드캐스트
    localStorage.setItem(
      "egdesk_recruitment_sync",
      JSON.stringify({
        action: "contract_open",
        applicantId: app.id,
        timestamp: Date.now(),
      })
    );

    setLiveSyncLog(`📜 '${app.name}' 님 최종 합격 확정! 폰으로 디지털 계약서 서명을 요청했습니다.`);
    setActiveMobileView("contract");
  };

  return (
    <div className="space-y-6 pb-20 w-full min-w-0 text-slate-800" data-easybot-hint="채용 매니저 AI: 채용 공고 작성 및 지원자 이력서(PDF) 자동 분석 판독(OCR) 평가를 수행합니다.">
      {/* 상단 헤더 영역 */}
      <RecruitmentHeader liveSyncLog={liveSyncLog} />

      {/* 메인 콘텐츠 그리드 (2분할) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10 flex-1 overflow-hidden min-h-0">
        {/* ==================== 좌측: 사장님 AI 비서 대화 및 지원자 관리 ==================== */}
        <div
          className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl overflow-hidden flex flex-col shadow-lg"
          style={{ height: "840px" }}
        >
          {/* 채용 관리 대시보드 인스타 감성 탭 헤더 */}
          <div className="flex border-b border-slate-300 bg-slate-100 px-6 py-4 items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-sm font-black text-slate-950">
              <Bot className="w-5 h-5 text-[#f91f7f]" />
              <span>이지봇 AI 채용 매니저 피드</span>
            </div>
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden relative">
            {/* 1. 채용 공고 링크 배포 배너 */}
            {jobPosting && (
              <JobPostingBanner
                jobPosting={jobPosting}
                copiedLink={copiedLink}
                onCopyLink={handleCopyLink}
                onOpenLink={handleOpenLink}
              />
            )}

            {/* 2. 지원자 실시간 접수 현황 리스트 (스토리 서클) */}
            <ApplicantStorySlider
              applicants={applicants}
              selectedApplicant={selectedApplicant}
              onSelectApplicant={(app) => {
                setSelectedApplicant(app);
                if (app.status === "applied") {
                  setActiveMobileView("posting");
                } else if (app.status === "interviewing" || app.status === "interview_done") {
                  setActiveMobileView("interview");
                } else {
                  setActiveMobileView("contract");
                }
              }}
            />

            {/* 3. AI 비서 대화 및 사장님 입력창 */}
            <AiManagerChat chatMessages={chatMessages} isTyping={isTyping} onSendMessage={handleSendMessage} />

            {/* 4. 선택된 지원자 실시간 액션 패널 */}
            {selectedApplicant && (
              <ApplicantActionPanel
                selectedApplicant={selectedApplicant}
                onApproveInterview={handleApproveInterview}
                onApproveHiring={handleApproveHiring}
              />
            )}
          </div>
        </div>

        {/* ==================== 우측: 3D 모바일 섀시 시뮬레이터 ==================== */}
        <MobileSimulator
          jobPosting={jobPosting}
          selectedApplicant={selectedApplicant}
          activeMobileView={activeMobileView}
          onActiveMobileViewChange={setActiveMobileView}
        />
      </div>
    </div>
  );
}