import { apiFetch } from '@/lib/api';
import { useState, useEffect, useCallback } from "react";
import { GrantAnnouncement, CompanyProfile, RndPlan } from "../types";

export function useGrantManagement() {
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "warn" } | null>(null);

  const [announcements, setAnnouncements] = useState<GrantAnnouncement[]>([]);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [selectedAnnId, setSelectedAnnId] = useState<string | null>(null);
  const [rndPlan, setRndPlan] = useState<RndPlan | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  
  // 스케줄 상태값 추가
  const [syncInterval, setSyncInterval] = useState<number>(12);
  const [lastSyncTime, setLastSyncTime] = useState<string>("");

  const showToast = useCallback((message: string, type: "success" | "error" | "warn" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const [isSyncing, setIsSyncing] = useState(false);
  
  // 1. 수동 지원금 매칭 검색 수행 (즉시 동기화 실행 포함)
  const handleSearchGrants = async () => {
    if (announcements.length === 0) {
      setIsLoading(true);
    } else {
      setIsSyncing(true);
    }
    try {
      // 1) 비즈인포 크롤링 실시간 동기화 우선 수행 (건수 제한 없음 대응)
      try {
        await apiFetch("/api/production/grant/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ searchPages: 0 }) // 0을 보내어 제한 없이 가져오도록 트리거
        });
      } catch (syncErr) {
        console.warn("실시간 공고 크롤링 실패:", syncErr);
      }

      // 2) 사내 스펙 매칭 RAG 분석 수행
      const res = await apiFetch("/api/production/grant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "search_grants" })
      });
      const data = await res.json();
      if (data.success) {
        setAnnouncements(data.announcements);
        setCompanyProfile(data.companyProfile);
        setHasSearched(true);
        
        // 마지막 동기화 시간 즉시 갱신
        const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
        setLastSyncTime(nowStr);
        
        showToast(data.message, "success");
      } else {
        throw new Error(data.error);
      }
    } catch (e: any) {
      console.error("지원금 검색 실패:", e);
      showToast(`지원금 매칭 검색에 실패했습니다: ${e.message}`, "error");
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  };

  // 1-1. 기초 데이터 조회 (초기 진입 시 DB에 이미 적재된 기존 목록 자동 로드)
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        const res = await apiFetch("/api/production/grant");
        const data = await res.json();
        if (data.success) {
          setAnnouncements(data.announcements || []);
          setCompanyProfile(data.companyProfile || null);
          setSyncInterval(data.syncInterval || 12);
          setLastSyncTime(data.lastSyncTime || "");
          // DB에 공고가 이미 적재되어 있다면 스캔 대기 화면을 스킵하고 바로 리스트 노출
          if (data.announcements && data.announcements.length > 0) {
            setHasSearched(true);
          }
        }
      } catch (err) {
        console.error("초기 지원금 데이터 로드 실패:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialData();
  }, []);

  // 1-2. 스케줄 동기화 주기 설정 저장 (POST)
  const handleSaveSchedule = async (interval: number) => {
    try {
      const res = await apiFetch("/api/production/grant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_schedule", interval })
      });
      const data = await res.json();
      if (data.success) {
        setSyncInterval(interval);
        showToast(data.message, "success");
      } else {
        throw new Error(data.error);
      }
    } catch (e: any) {
      showToast(`스케줄 설정 저장 실패: ${e.message}`, "error");
    }
  };

  // 2. 관심 공고 즐겨찾기 토글 (POST)
  const handleToggleBookmark = async (id: string) => {
    try {
      const res = await apiFetch("/api/production/grant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_bookmark",
          id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAnnouncements(data.announcements);
        const ann = data.announcements.find((a: any) => a.id === id);
        showToast(
          ann?.isBookmarked
            ? "관심 공고 보관함에 등록되었습니다."
            : "관심 공고 보관함에서 해제되었습니다.",
          "success"
        );
      } else {
        throw new Error(data.error);
      }
    } catch (e: any) {
      showToast(`즐겨찾기 토글 실패: ${e.message}`, "error");
    }
  };

  // 3. AI R&D 사업계획서 자동 빌딩 (POST)
  const handleGenerateRndPlan = async (id: string) => {
    setIsGenerating(true);
    setSelectedAnnId(id);
    try {
      const res = await apiFetch("/api/production/grant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_plan",
          id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRndPlan({
          announcementId: id,
          sections: data.plan,
        });
        showToast(data.message, "success");
      } else {
        throw new Error(data.error);
      }
    } catch (e: any) {
      showToast(`계획서 생성 실패: ${e.message}`, "error");
    } finally {
      setIsGenerating(false);
    }
  };

  // 4. 작성 중인 사업계획서 텍스트 로컬 수정
  const handleUpdateSection = (sectionId: string, content: string) => {
    if (!rndPlan) return;
    setRndPlan({
      ...rndPlan,
      sections: {
        ...rndPlan.sections,
        [sectionId]: content,
      },
    });
  };

  // 5. 사업계획서 엑셀(CSV) 내보내기 다운로드
  const handleExportCsv = () => {
    if (!rndPlan) {
      showToast("내보낼 사업계획서 원고가 존재하지 않습니다.", "warn");
      return;
    }
    const targetAnn = announcements.find((a) => a.id === rndPlan.announcementId);
    if (!targetAnn) return;

    let csvContent = "\ufeff"; // 한글 깨짐 방지 BOM 추가
    csvContent += `과제명,${targetAnn.title}\n`;
    csvContent += `공고번호,${targetAnn.id}\n`;
    csvContent += `지원기관,${targetAnn.agency}\n\n`;
    csvContent += "장표 섹션,작성 내용\n";

    Object.entries(rndPlan.sections).forEach(([key, val]) => {
      const title =
        key === "necessity"
          ? "1. 연구개발의 필요성 및 시급성"
          : key === "differentiation"
          ? "2. 국내외 기술 트렌드 및 차별성"
          : key === "objectives"
          ? "3. 연구개발 최종 목표 및 상세 내용"
          : "4. 사업화 방안 및 향후 시장 진출 계획";
      // 줄바꿈 및 큰따옴표 이스케이프 처리
      const escapedVal = `"${val.replace(/"/g, '""')}"`;
      csvContent += `"${title}",${escapedVal}\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `RND_사업계획서_${targetAnn.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("사업계획서 원고가 CSV 엑셀 파일로 다운로드되었습니다.", "success");
  };

  return {
    isLoading,
    isGenerating,
    toast,
    announcements,
    companyProfile,
    selectedAnnId,
    rndPlan,
    hasSearched,
    syncInterval,
    lastSyncTime,
    handleSearchGrants,
    handleSaveSchedule,
    handleToggleBookmark,
    handleGenerateRndPlan,
    handleUpdateSection,
    handleExportCsv,
    setSelectedAnnId,
    setRndPlan,
    isSyncing,
  };
}
