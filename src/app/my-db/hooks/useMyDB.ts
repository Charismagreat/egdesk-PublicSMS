"use client";

import React from "react";
import { ColumnSchema, ConsoleResult, TuneMessage, FriendlyMapping } from "../types";
import { getTableDisplayName, getColumnFriendlyName, isSensitiveColumn } from "../utils";

export function useMyDB() {
  // 🖥️ 새 탭 독립 작업 모드(Standalone) 감지 상태 변수
  const [isStandalone, setIsStandalone] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setIsStandalone(params.get("standalone") === "true");
    }
  }, []);

  // DB 관련 핵심 상태 변수
  const [tables, setTables] = React.useState<any[]>([]);
  const [selectedTable, setSelectedTable] = React.useState<string>("");
  const [tableSchema, setTableSchema] = React.useState<ColumnSchema[]>([]);
  const [tableDDL, setTableDDL] = React.useState<string>("");
  const [tableRows, setTableRows] = React.useState<any[]>([]);
  const [totalRows, setTotalRows] = React.useState<number>(0);
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const itemsPerPage = 50;

  // 탭 제어 ('data' | 'schema' | 'console' | 'chart' | 'shared')
  const [activeTab, setActiveTab] = React.useState<'data' | 'schema' | 'console' | 'chart' | 'shared'>('data');

  // 검색/필터 필드
  const [searchKey, setSearchKey] = React.useState<string>("");
  const [searchValue, setSearchValue] = React.useState<string>("");
  const [debouncedSearchValue, setDebouncedSearchValue] = React.useState<string>("");

  // 테이블명 검색 필터 상태
  const [tableSearchQuery, setTableSearchQuery] = React.useState<string>("");

  // SQL 콘솔 상태
  const [sqlQuery, setSqlQuery] = React.useState<string>("SELECT * FROM crm_expenses LIMIT 10;");
  const [consoleResult, setConsoleResult] = React.useState<ConsoleResult | null>(null);
  const [safetyUnlocked, setSafetyUnlocked] = React.useState<boolean>(false);

  // 💡 AI 자연어 SQL 번역기 콘솔 관련 추가 상태 변수
  const [consoleTab, setConsoleTab] = React.useState<'direct' | 'ai'>('ai');
  const [aiPrompt, setAiPrompt] = React.useState<string>("");
  const [isAiLoading, setIsAiLoading] = React.useState<boolean>(false);
  const [aiGeneratedSql, setAiGeneratedSql] = React.useState<string>("");

  // 🗑️ 소프트 삭제 데이터 보기 토글 상태 변수
  const [showDeleted, setShowDeleted] = React.useState<boolean>(false);

  // 💡 AI 지능형 시각화 및 데이터 브리핑 요약 융합 트리거
  const [aiChartSpec, setAiChartSpec] = React.useState<any | null>(null);
  const [aiBriefing, setAiBriefing] = React.useState<string | null>(null);
  const [isVisualizing, setIsVisualizing] = React.useState<boolean>(false);

  // 🌐 퍼블릭 공유 및 자동 갱신 상태
  const [isShareModalOpen, setIsShareModalOpen] = React.useState<boolean>(false);
  const [shareTitle, setShareTitle] = React.useState<string>("");
  const [shareInterval, setShareInterval] = React.useState<'NONE' | 'HOURLY' | 'DAILY' | 'WEEKLY'>('NONE');
  const [generatedShareUrl, setGeneratedShareUrl] = React.useState<string>("");
  const [sharedDashboards, setSharedDashboards] = React.useState<any[]>([]);
  const [isSharing, setIsSharing] = React.useState<boolean>(false);
  const [isRestored, setIsRestored] = React.useState<boolean>(false);
  const [tunePrompt, setTunePrompt] = React.useState<string>("");

  // 💬 AI 챗봇 튜닝 대화 이력 및 부가 제어 상태 추가
  const [tuneHistory, setTuneHistory] = React.useState<TuneMessage[]>([]);
  const [selectedChartPart, setSelectedChartPart] = React.useState<string>("");
  const [attachedImage, setAttachedImage] = React.useState<string>(""); // Base64 이미지 데이터

  // ↩️ 이전 상태로 되돌리기(Undo) 스냅샷 상태 변수
  const [previousSnapshot, setPreviousSnapshot] = React.useState<{
    chartSpec: any;
    briefing: string | null;
    tuneHistory: any[];
  } | null>(null);

  // 🏁 최초 차트 생성 시의 오리지널 스냅샷 상태 변수 (처음으로 돌아가기용)
  const [initialSnapshot, setInitialSnapshot] = React.useState<{
    chartSpec: any;
    briefing: string | null;
  } | null>(null);

  // 👥 데이터 공유 테이블 뷰 관련 상태 변수
  const [isFriendlyShareModalOpen, setIsFriendlyShareModalOpen] = React.useState<boolean>(false);
  const [friendlyShareTableName, setFriendlyShareTableName] = React.useState<string>("");
  const [friendlyColumnMappings, setFriendlyColumnMappings] = React.useState<FriendlyMapping[]>([]);
  const [friendlySortColumn, setFriendlySortColumn] = React.useState<string>("");
  const [friendlySortDirection, setFriendlySortDirection] = React.useState<string>("DESC");
  const [friendlyAllowCsv, setFriendlyAllowCsv] = React.useState<boolean>(true);
  const [generatedFriendlyShareUrl, setGeneratedFriendlyShareUrl] = React.useState<string>("");
  const [isFriendlySharing, setIsFriendlySharing] = React.useState<boolean>(false);
  const [isFriendlyRecommendLoading, setIsFriendlyRecommendLoading] = React.useState<boolean>(false);

  // 🌐 데이터 공유 뷰 목록 관리 상태
  const [sharedViewsList, setSharedViewsList] = React.useState<any[]>([]);
  const [isSharedViewsLoading, setIsSharedViewsLoading] = React.useState<boolean>(false);

  // 로딩 및 알림
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [toast, setToast] = React.useState<{ message: string; type: 'success' | 'error' | 'warn' } | null>(null);

  // 모달 제어 (추가/수정 모달)
  const [isRowModalOpen, setIsRowModalOpen] = React.useState<boolean>(false);
  const [editingRow, setEditingRow] = React.useState<any | null>(null); // null이면 추가, 객체면 수정

  // 알림 토스트 유틸
  const showToast = (message: string, type: 'success' | 'error' | 'warn' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // 💾 챗봇 상태 실시간 localStorage 보존 (복원이 완전히 마친 시점 이후부터 안전 작동)
  React.useEffect(() => {
    if (!isRestored) return;
    if (typeof window !== "undefined") {
      localStorage.setItem("egdesk_mydb_tuneHistory", JSON.stringify(tuneHistory));
    }
  }, [tuneHistory, isRestored]);

  React.useEffect(() => {
    if (!isRestored) return;
    if (typeof window !== "undefined") {
      localStorage.setItem("egdesk_mydb_selectedChartPart", selectedChartPart);
    }
  }, [selectedChartPart, isRestored]);

  React.useEffect(() => {
    if (!isRestored) return;
    if (typeof window !== "undefined") {
      if (previousSnapshot) {
        localStorage.setItem("egdesk_mydb_previousSnapshot", JSON.stringify(previousSnapshot));
      } else {
        localStorage.removeItem("egdesk_mydb_previousSnapshot");
      }
    }
  }, [previousSnapshot, isRestored]);

  React.useEffect(() => {
    if (!isRestored) return;
    if (typeof window !== "undefined") {
      if (initialSnapshot) {
        localStorage.setItem("egdesk_mydb_initialSnapshot", JSON.stringify(initialSnapshot));
      } else {
        localStorage.removeItem("egdesk_mydb_initialSnapshot");
      }
    }
  }, [initialSnapshot, isRestored]);

  const fetchSharedDashboards = async () => {
    try {
      const res = await fetch("/api/db/ai-visualize/share");
      const data = await res.json();
      if (data.success) {
        setSharedDashboards(data.list || []);
      }
    } catch (e) {
      console.error("공유 대시보드 리스트 조회 실패:", e);
    }
  };

  const handleCreateShare = async () => {
    if (!shareTitle.trim()) {
      showToast("공유 대시보드의 공개 제목을 입력해 주세요.", "warn");
      return;
    }

    setIsSharing(true);
    try {
      const fromMatch = sqlQuery.match(/FROM\s+["']?([a-zA-Z0-9_-]+)["']?/i);
      const tableName = fromMatch ? fromMatch[1] : (selectedTable || 'raw_query');

      const res = await fetch("/api/db/ai-visualize/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: shareTitle,
          sqlQuery: sqlQuery,
          tableName,
          displayName: tables.find(t => t.name === tableName)?.displayName || tableName,
          chartSpecJson: aiChartSpec,
          briefingMarkdown: aiBriefing,
          refreshInterval: shareInterval
        })
      });

      const data = await res.json();
      if (data.success && data.shareId) {
        const url = `${window.location.origin}/public/share/${data.shareId}`;
        setGeneratedShareUrl(url);
        showToast("공유 대시보드가 성공적으로 웹에 게시되었습니다!", "success");
        fetchSharedDashboards();
      } else {
        showToast(data.error || "웹 게시 등록에 실패했습니다.", "error");
      }
    } catch (e) {
      showToast("서버와 통신할 수 없습니다.", "error");
    } finally {
      setIsSharing(false);
    }
  };

  const triggerAIVisualization = async (rows: any[], queryStr: string) => {
    if (!rows || rows.length === 0) return;

    setIsVisualizing(true);
    setAiChartSpec(null);
    setAiBriefing(null);
    setInitialSnapshot(null); // 최초 스냅샷 초기화

    try {
      const fromMatch = queryStr.match(/FROM\s+["']?([a-zA-Z0-9_-]+)["']?/i);
      const tableName = fromMatch ? fromMatch[1] : (selectedTable || 'raw_query');
      
      const tempSchema = Object.keys(rows[0]).map(key => {
        const val = rows[0][key];
        const isNum = typeof val === 'number' || (typeof val === 'string' && !isNaN(Number(val)) && val.trim() !== '');
        return {
          name: key,
          type: isNum ? 'INTEGER' : 'TEXT'
        };
      });

      const res = await fetch("/api/db/ai-visualize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows,
          schema: tempSchema,
          tableName,
          displayName: tables.find(t => t.name === tableName)?.displayName || tableName
        })
      });

      const data = await res.json();
      if (data.recommendedChart) {
        setAiChartSpec(data.recommendedChart);
        setAiBriefing(data.briefing);
        
        setInitialSnapshot({
          chartSpec: data.recommendedChart,
          briefing: data.briefing || null
        });
      } else {
        console.error("AI 시각화 분석 실패:", data.error);
        showToast(`AI 시각화 분석 실패: ${data.error || '알 수 없는 오류'}`, "error");
      }
    } catch (err: any) {
      console.error("AI 시각화 API 연동 실패:", err.message);
      showToast(`AI 시각화 연동 실패: ${err.message}`, "error");
    } finally {
      setIsVisualizing(false);
    }
  };

  const handleTuneChart = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const currentPrompt = tunePrompt.trim();
    if (!currentPrompt && !attachedImage) return;

    const rows = consoleResult?.rows || tableRows;
    if (!rows || rows.length === 0) {
      showToast("튜닝을 수행할 차트 데이터가 존재하지 않습니다.", "warn");
      return;
    }

    const attachedImgStr = attachedImage;
    const targetPart = selectedChartPart;

    setPreviousSnapshot({
      chartSpec: aiChartSpec,
      briefing: aiBriefing,
      tuneHistory: [...tuneHistory]
    });

    setTunePrompt("");
    setAttachedImage("");
    setSelectedChartPart("");

    const userMsg: TuneMessage = {
      role: 'user' as const,
      text: targetPart ? `[집중 수정 지표: ${targetPart}] ${currentPrompt}` : currentPrompt,
      image: attachedImgStr || undefined,
      timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    };
    setTuneHistory(prev => [...prev, userMsg]);

    setIsVisualizing(true);
    showToast("⚡ 최고관리자님의 피드백을 반영하여 차트 및 비즈니스 브리핑을 정밀 재조정 중...", "success");

    try {
      const fromMatch = sqlQuery.match(/FROM\s+["']?([a-zA-Z0-9_-]+)["']?/i);
      const tableName = fromMatch ? fromMatch[1] : (selectedTable || 'raw_query');
      
      const tempSchema = Object.keys(rows[0]).map(key => {
        const val = rows[0][key];
        const isNum = typeof val === 'number' || (typeof val === 'string' && !isNaN(Number(val)) && val.trim() !== '');
        return { name: key, type: isNum ? 'INTEGER' : 'TEXT' };
      });

      const fullFeedback = targetPart
        ? `[집중 수정 지표: ${targetPart}] ${currentPrompt}`
        : currentPrompt;

      const res = await fetch("/api/db/ai-visualize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows,
          schema: tempSchema,
          tableName,
          displayName: tables.find(t => t.name === tableName)?.displayName || tableName,
          userFeedback: fullFeedback,
          currentSpec: aiChartSpec,
          attachedImage: attachedImgStr || undefined
        })
      });

      const data = await res.json();
      if (data.recommendedChart) {
        setAiChartSpec(data.recommendedChart);
        setAiBriefing(data.briefing);

        const aiMsg: TuneMessage = {
          role: 'ai' as const,
          text: data.briefing || "최고관리자님의 튜닝 요구사항을 차트에 정밀 반영했습니다.",
          timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
        };

        if (data.newSkillLearned) {
          const skillMsg: TuneMessage = {
            role: 'system' as const,
            text: `💡 [자가 진화 스킬 획득] 최고관리자의 분석 취향을 습득하여 AI 핵심 가이드라인에 영구 등록했습니다:\n"${data.newSkillLearned}"`,
            isNewSkill: true,
            timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
          };
          setTuneHistory(prev => [...prev, aiMsg, skillMsg]);
        } else {
          setTuneHistory(prev => [...prev, aiMsg]);
        }

        showToast("✓ 최고관리자님의 피드백이 차트와 브리핑에 칼반영되었습니다!", "success");
      } else {
        const errMsg: TuneMessage = {
          role: 'system' as const,
          text: `❌ 튜닝 반영 실패: ${data.error || '알 수 없는 오류'}`,
          timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
        };
        setTuneHistory(prev => [...prev, errMsg]);
        showToast(data.error || "피드백 조정에 실패했습니다.", "error");
      }
    } catch (err: any) {
      const errMsg: TuneMessage = {
        role: 'system' as const,
        text: `❌ 통신 장애: ${err.message}`,
        timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
      };
      setTuneHistory(prev => [...prev, errMsg]);
      showToast(`통신 장애: ${err.message}`, "error");
    } finally {
      setIsVisualizing(false);
    }
  };

  const handleResetChat = () => {
    if (confirm("최고관리자님, AI 챗봇과의 대화 내용을 모두 초기화하고\n차트와 브리핑도 AI가 최초 추천했던 원본 상태로 완전히 되돌리시겠습니까?")) {
      setTuneHistory([]);
      setSelectedChartPart("");
      setAttachedImage("");
      setPreviousSnapshot(null);
      
      if (initialSnapshot) {
        setAiChartSpec(initialSnapshot.chartSpec);
        setAiBriefing(initialSnapshot.briefing);
      }

      if (typeof window !== "undefined") {
        localStorage.removeItem("egdesk_mydb_tuneHistory");
        localStorage.removeItem("egdesk_mydb_selectedChartPart");
        localStorage.removeItem("egdesk_mydb_previousSnapshot");
        
        if (initialSnapshot) {
          localStorage.setItem("egdesk_mydb_aiChartSpec", JSON.stringify(initialSnapshot.chartSpec));
          if (initialSnapshot.briefing) {
            localStorage.setItem("egdesk_mydb_aiBriefing", initialSnapshot.briefing);
          } else {
            localStorage.removeItem("egdesk_mydb_aiBriefing");
          }
        }
      }
      showToast("✓ 대화 내용 및 차트 상태가 최초 추천 원본 상태로 조화롭게 리셋되었습니다.", "success");
    }
  };

  const handleResetAllPlayground = () => {
    if (confirm("최고관리자님, 대화형 SQL 플레이그라운드 입력값, SQL 실행 결과, AI 지능형 시각화 차트 및 챗봇 대화 등 모든 작업을 최초 대기 상태로 초기화하시겠습니까?")) {
      setSqlQuery("SELECT * FROM crm_expenses LIMIT 10;");
      setConsoleResult(null);
      setSafetyUnlocked(false);
      setConsoleTab('ai');
      setAiPrompt("");
      setAiGeneratedSql("");
      
      setAiChartSpec(null);
      setAiBriefing(null);
      setIsVisualizing(false);
      setTunePrompt("");
      setTuneHistory([]);
      setSelectedChartPart("");
      setAttachedImage("");
      setPreviousSnapshot(null);
      setInitialSnapshot(null);
      
      setSearchKey("");
      setSearchValue("");
      setActiveTab('data');

      if (typeof window !== "undefined") {
        localStorage.removeItem("egdesk_mydb_sqlQuery");
        localStorage.removeItem("egdesk_mydb_consoleResult");
        localStorage.removeItem("egdesk_mydb_safetyUnlocked");
        localStorage.removeItem("egdesk_mydb_consoleTab");
        localStorage.removeItem("egdesk_mydb_aiPrompt");
        localStorage.removeItem("egdesk_mydb_aiGeneratedSql");
        localStorage.removeItem("egdesk_mydb_aiChartSpec");
        localStorage.removeItem("egdesk_mydb_aiBriefing");
        localStorage.removeItem("egdesk_mydb_tuneHistory");
        localStorage.removeItem("egdesk_mydb_selectedChartPart");
        localStorage.removeItem("egdesk_mydb_previousSnapshot");
        localStorage.removeItem("egdesk_mydb_initialSnapshot");
        localStorage.removeItem("egdesk_mydb_activeTab");
        localStorage.removeItem("egdesk_mydb_searchKey");
        localStorage.removeItem("egdesk_mydb_searchValue");
      }

      showToast("✓ 대화형 SQL 플레이그라운드, 실행 결과, AI 시각화 등 모든 데이터가 완벽히 초기화되었습니다.", "success");
    }
  };

  const handleUndoTuning = () => {
    if (!previousSnapshot) return;

    if (confirm("최고관리자님, 직전 피드백 전송 전의 차트 상태와 대화 이력으로 되돌리시겠습니까?")) {
      setAiChartSpec(previousSnapshot.chartSpec);
      setAiBriefing(previousSnapshot.briefing);
      setTuneHistory(previousSnapshot.tuneHistory);

      if (typeof window !== "undefined") {
        localStorage.setItem("egdesk_mydb_tuneHistory", JSON.stringify(previousSnapshot.tuneHistory));
        if (previousSnapshot.chartSpec) {
          localStorage.setItem("egdesk_mydb_aiChartSpec", JSON.stringify(previousSnapshot.chartSpec));
        } else {
          localStorage.removeItem("egdesk_mydb_aiChartSpec");
        }
        if (previousSnapshot.briefing) {
          localStorage.setItem("egdesk_mydb_aiBriefing", previousSnapshot.briefing);
        } else {
          localStorage.removeItem("egdesk_mydb_aiBriefing");
        }
      }

      setPreviousSnapshot(null);
      showToast("✓ 성공적으로 직전 튜닝 이전의 상태로 되돌렸습니다!", "success");
    }
  };

  const handleResetToOriginal = () => {
    if (!initialSnapshot) {
      showToast("되돌아갈 최초 차트 정보가 존재하지 않습니다.", "warn");
      return;
    }
    
    if (confirm("최고관리자님, AI가 최초로 추천해 드렸던 최초 원본 차트 및 브리핑 상태로 완전히 복원하시겠습니까?\n(이전 챗 대화 내용과 튜닝 히스토리는 모두 깨끗이 초기화됩니다.)")) {
      setAiChartSpec(initialSnapshot.chartSpec);
      setAiBriefing(initialSnapshot.briefing);
      setTuneHistory([]);
      setSelectedChartPart("");
      setAttachedImage("");
      setPreviousSnapshot(null);
      
      if (typeof window !== "undefined") {
        localStorage.removeItem("egdesk_mydb_tuneHistory");
        localStorage.removeItem("egdesk_mydb_selectedChartPart");
        localStorage.removeItem("egdesk_mydb_previousSnapshot");
        
        localStorage.setItem("egdesk_mydb_aiChartSpec", JSON.stringify(initialSnapshot.chartSpec));
        if (initialSnapshot.briefing) {
          localStorage.setItem("egdesk_mydb_aiBriefing", initialSnapshot.briefing);
        } else {
          localStorage.removeItem("egdesk_mydb_aiBriefing");
        }
      }
      
      showToast("✓ 최초 생성되었던 오리지널 시각화 차트 상태로 완벽히 되돌아갔습니다!", "success");
    }
  };

  // 👥 임직원 친화형 공유 테이블 뷰 모달 오픈 핸들러
  const handleOpenFriendlyShareModal = () => {
    if (!selectedTable) return;
    
    // 테이블의 기본 표시 한글명 힌트 결정 (유틸 사용)
    const displayName = getTableDisplayName(selectedTable);

    setFriendlyShareTableName(displayName);
    
    // 테이블 스키마로부터 컬럼 맵핑 초기화
    const initialMappings: FriendlyMapping[] = tableSchema.map(col => {
      // 유틸 함수를 통해 기본 한글명 가져오기
      const friendly = getColumnFriendlyName(col.name);
      // 보안 컬럼 판정 유틸 적용
      const isSensitive = isSensitiveColumn(col.name);

      return {
        physical: col.name,
        friendly,
        visible: !isSensitive,
        sortOrder: 0,
        sortDirection: 'NONE' as const
      };
    });

    setFriendlyColumnMappings(initialMappings);
    
    if (tableSchema.length > 0) {
      setFriendlySortColumn(tableSchema[0].name);
    } else {
      setFriendlySortColumn("");
    }
    setFriendlySortDirection("DESC");
    setFriendlyAllowCsv(true);
    setGeneratedFriendlyShareUrl("");
    setFriendlyShareTableName(displayName);
    setIsFriendlyShareModalOpen(true);
    fetchAIRecommendations(selectedTable, tableSchema);
  };

  // 👥 AI 기반 데이터 공유 뷰 설정 자동 추천 및 동기화 기동
  const fetchAIRecommendations = async (tableName: string, schema: ColumnSchema[]) => {
    if (!tableName || !schema || schema.length === 0) return;
    setIsFriendlyRecommendLoading(true);
    try {
      const res = await fetch('/api/shared-views/recommend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tableName, tableSchema: schema })
      });
      const data = await res.json();
      if (data.success) {
        if (data.friendlyTableName) {
          setFriendlyShareTableName(data.friendlyTableName);
        }
        if (data.columnMappings && Array.isArray(data.columnMappings)) {
          setFriendlyColumnMappings(data.columnMappings);
        }
        showToast("🤖 AI 지능형 엔진이 최적의 공유 뷰 명세와 보안 마스킹 가이드를 자동 완성해 드렸습니다!", "success");
      } else {
        showToast(data.error || "AI 자동 추천 도중 에러가 발생하여 기본 설정으로 대체합니다.", "warn");
      }
    } catch (e) {
      console.error(e);
      showToast("네트워크 장애로 AI 자동 완성을 완료하지 못했습니다.", "warn");
    } finally {
      setIsFriendlyRecommendLoading(false);
    }
  };

  // 👥 데이터 공유 뷰 등록 API 호출 핸들러
  const handleCreateFriendlyShare = async () => {
    if (!selectedTable || !friendlyShareTableName) {
      showToast("테이블 명칭이 올바르지 않습니다.", "error");
      return;
    }

    setIsFriendlySharing(true);
    try {
      const response = await fetch('/api/shared-views', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sourceTable: selectedTable,
          friendlyTableName: friendlyShareTableName,
          columnMappings: friendlyColumnMappings,
          defaultSortColumn: friendlySortColumn,
          defaultSortDirection: friendlySortDirection,
          allowCsvDownload: friendlyAllowCsv
        })
      });

      const data = await response.json();
      if (data.success) {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const shareUrl = `${origin}/shared/view/${data.shareHash}`;
        setGeneratedFriendlyShareUrl(shareUrl);
        showToast("공유 뷰가 성공적으로 발행되었습니다!", "success");
        fetchSharedViews(); // 🌐 공유 뷰 목록 새로고침
      } else {
        showToast(data.error || "공유 뷰 생성에 실패했습니다.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("네트워크 오류가 발생했습니다.", "error");
    } finally {
      setIsFriendlySharing(false);
    }
  };

  // 🌐 데이터 공유 뷰 목록 로드
  const fetchSharedViews = async () => {
    setIsSharedViewsLoading(true);
    try {
      const res = await fetch('/api/shared-views');
      const data = await res.json();
      if (data.success) {
        setSharedViewsList(data.sharedViews || []);
      } else {
        showToast(data.error || "공유 뷰 목록 조회에 실패했습니다.", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("네트워크 장애로 공유 뷰 목록을 가져오지 못했습니다.", "warn");
    } finally {
      setIsSharedViewsLoading(false);
    }
  };

  // 🌐 특정 데이터 공유 뷰 폐쇄(삭제)
  const handleDeleteSharedView = async (viewId: string, friendlyName: string) => {
    if (!confirm(`정말로 데이터 공유 뷰 '${friendlyName}' (ID: ${viewId})를 폐쇄하시겠습니까?\n폐쇄 시 기존 공유 링크를 통한 데이터 접근이 즉시 차단됩니다.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/shared-views?viewId=${viewId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || "공유 뷰가 폐쇄되었습니다.", "success");
        fetchSharedViews(); // 목록 새로고침
      } else {
        showToast(data.error || "공유 뷰 폐쇄에 실패했습니다.", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("네트워크 장애로 공유 뷰를 폐쇄하지 못했습니다.", "error");
    }
  };

  // 1. 서버 내 전체 테이블 목록 스캔
  const fetchTables = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/db?action=list");
      const data = await res.json();
      if (data.success) {
        setTables(data.tables || []);
        const savedTable = typeof window !== "undefined" ? localStorage.getItem("egdesk_mydb_selectedTable") : null;
        if (data.tables && data.tables.length > 0 && !selectedTable && !savedTable) {
          setSelectedTable(data.tables[0].name);
        }
      } else {
        showToast(data.error || "테이블 목록 스캔에 실패했습니다.", "error");
      }
    } catch (e) {
      showToast("서버와 통신할 수 없습니다.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // 2. 선택 테이블 스키마 DDL 구조 로드
  const fetchTableSchema = async (tableName: string) => {
    if (!tableName) return;
    try {
      const res = await fetch(`/api/db?action=schema&tableName=${tableName}`);
      const data = await res.json();
      if (data.success) {
        setTableSchema(data.schema || []);
        setTableDDL(data.ddl || "");
      }
    } catch (e) {
      console.error("스키마 로드 실패", e);
    }
  };

  // 3. 선택 테이블의 실제 데이터 그리드 레코드 로드 (검색/페이지네이션 연동)
  const fetchTableRows = async (tableName: string, page: number, key = "", val = "", includeDeleted = showDeleted) => {
    if (!tableName) return;
    setIsLoading(true);
    try {
      const offset = (page - 1) * itemsPerPage;
      let url = `/api/db?action=query&tableName=${tableName}&limit=${itemsPerPage}&offset=${offset}&showDeleted=${includeDeleted}`;
      if (val) {
        url += `&searchValue=${encodeURIComponent(val)}`;
        if (key) {
          url += `&searchKey=${encodeURIComponent(key)}`;
        }
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setTableRows(data.rows || []);
        setTotalRows(data.total || 0);
      } else {
        showToast(data.error || "레코드 조회에 실패했습니다.", "error");
      }
    } catch (e) {
      showToast("데이터 로딩 중 서버 통신 에러가 발생했습니다.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // 4. 최초 렌더링 및 테이블 전환 시 연동
  React.useEffect(() => {
    fetchTables();
    fetchSharedDashboards();
  }, []);

  // 🔄 로컬스토리지로부터 이전 작업중이던 내용 상태 복원
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTable = localStorage.getItem("egdesk_mydb_selectedTable");
      const savedTab = localStorage.getItem("egdesk_mydb_activeTab");
      const savedSqlQuery = localStorage.getItem("egdesk_mydb_sqlQuery");
      const savedConsoleTab = localStorage.getItem("egdesk_mydb_consoleTab");
      const savedAiPrompt = localStorage.getItem("egdesk_mydb_aiPrompt");
      const savedSafety = localStorage.getItem("egdesk_mydb_safetyUnlocked");
      const savedSearchKey = localStorage.getItem("egdesk_mydb_searchKey");
      const savedSearchVal = localStorage.getItem("egdesk_mydb_searchValue");

      const savedConsoleResult = localStorage.getItem("egdesk_mydb_consoleResult");
      const savedAiChartSpec = localStorage.getItem("egdesk_mydb_aiChartSpec");
      const savedAiBriefing = localStorage.getItem("egdesk_mydb_aiBriefing");
      const savedAiGeneratedSql = localStorage.getItem("egdesk_mydb_aiGeneratedSql");

      if (savedTable) setSelectedTable(savedTable);
      if (savedTab) setActiveTab(savedTab as any);
      if (savedSqlQuery) setSqlQuery(savedSqlQuery);
      if (savedConsoleTab) setConsoleTab(savedConsoleTab as any);
      if (savedAiPrompt) setAiPrompt(savedAiPrompt);
      if (savedSafety) setSafetyUnlocked(savedSafety === "true");
      if (savedSearchKey) setSearchKey(savedSearchKey);
      if (savedSearchVal) setSearchValue(savedSearchVal);

      if (savedConsoleResult) {
        try {
          setConsoleResult(JSON.parse(savedConsoleResult));
        } catch (e) {
          console.error("consoleResult 복원 실패:", e);
        }
      }
      if (savedAiChartSpec) {
        try {
          setAiChartSpec(JSON.parse(savedAiChartSpec));
        } catch (e) {
          console.error("aiChartSpec 복원 실패:", e);
        }
      }
      if (savedAiBriefing) setAiBriefing(savedAiBriefing);
      if (savedAiGeneratedSql) setAiGeneratedSql(savedAiGeneratedSql);

      const savedHistory = localStorage.getItem("egdesk_mydb_tuneHistory");
      const savedPart = localStorage.getItem("egdesk_mydb_selectedChartPart");
      const savedSnapshot = localStorage.getItem("egdesk_mydb_previousSnapshot");
      
      if (savedHistory) {
        try {
          setTuneHistory(JSON.parse(savedHistory));
        } catch (e) {
          console.error("⚠️ 챗 로그 복원 실패", e);
        }
      }
      if (savedPart) {
        setSelectedChartPart(savedPart);
      }
      if (savedSnapshot) {
        try {
          setPreviousSnapshot(JSON.parse(savedSnapshot));
        } catch (e) {
          console.error("⚠️ 스냅샷 복원 실패", e);
        }
      }
      
      setIsRestored(true);
    }
  }, []);

  // 💾 상태 실시간 로컬스토리지 보존
  React.useEffect(() => {
    if (!isRestored) return;
    if (typeof window !== "undefined") {
      localStorage.setItem("egdesk_mydb_selectedTable", selectedTable);
    }
  }, [selectedTable, isRestored]);

  React.useEffect(() => {
    if (!isRestored) return;
    if (typeof window !== "undefined") {
      localStorage.setItem("egdesk_mydb_activeTab", activeTab);
    }
  }, [activeTab, isRestored]);

  React.useEffect(() => {
    if (!isRestored) return;
    if (typeof window !== "undefined") {
      localStorage.setItem("egdesk_mydb_sqlQuery", sqlQuery);
    }
  }, [sqlQuery, isRestored]);

  React.useEffect(() => {
    if (!isRestored) return;
    if (typeof window !== "undefined") {
      localStorage.setItem("egdesk_mydb_consoleTab", consoleTab);
    }
  }, [consoleTab, isRestored]);

  React.useEffect(() => {
    if (!isRestored) return;
    if (typeof window !== "undefined") {
      localStorage.setItem("egdesk_mydb_aiPrompt", aiPrompt);
    }
  }, [aiPrompt, isRestored]);

  React.useEffect(() => {
    if (!isRestored) return;
    if (typeof window !== "undefined") {
      localStorage.setItem("egdesk_mydb_safetyUnlocked", String(safetyUnlocked));
    }
  }, [safetyUnlocked, isRestored]);

  React.useEffect(() => {
    if (!isRestored) return;
    if (typeof window !== "undefined") {
      localStorage.setItem("egdesk_mydb_searchKey", searchKey);
      localStorage.setItem("egdesk_mydb_searchValue", searchValue);
    }
  }, [searchKey, searchValue, isRestored]);

  React.useEffect(() => {
    if (!isRestored) return;
    if (typeof window !== "undefined") {
      if (consoleResult) {
        localStorage.setItem("egdesk_mydb_consoleResult", JSON.stringify(consoleResult));
      } else {
        localStorage.removeItem("egdesk_mydb_consoleResult");
      }
    }
  }, [consoleResult, isRestored]);

  React.useEffect(() => {
    if (!isRestored) return;
    if (typeof window !== "undefined") {
      if (aiChartSpec) {
        localStorage.setItem("egdesk_mydb_aiChartSpec", JSON.stringify(aiChartSpec));
      } else {
        localStorage.removeItem("egdesk_mydb_aiChartSpec");
      }
    }
  }, [aiChartSpec, isRestored]);

  React.useEffect(() => {
    if (!isRestored) return;
    if (typeof window !== "undefined") {
      if (aiBriefing) {
        localStorage.setItem("egdesk_mydb_aiBriefing", aiBriefing);
      } else {
        localStorage.removeItem("egdesk_mydb_aiBriefing");
      }
    }
  }, [aiBriefing, isRestored]);

  React.useEffect(() => {
    if (!isRestored) return;
    if (typeof window !== "undefined") {
      if (aiGeneratedSql) {
        localStorage.setItem("egdesk_mydb_aiGeneratedSql", aiGeneratedSql);
      } else {
        localStorage.removeItem("egdesk_mydb_aiGeneratedSql");
      }
    }
  }, [aiGeneratedSql, isRestored]);

  React.useEffect(() => {
    if (selectedTable) {
      setCurrentPage(1);
      if (isRestored) {
        setSearchKey("");
        setSearchValue("");
      }
      setShowDeleted(false);
      
      const savedSearchKey = isRestored ? "" : (localStorage.getItem("egdesk_mydb_searchKey") || "");
      const savedSearchVal = isRestored ? "" : (localStorage.getItem("egdesk_mydb_searchValue") || "");
      
      fetchTableSchema(selectedTable);
      fetchTableRows(selectedTable, 1, savedSearchKey, savedSearchVal, false);
    }
  }, [selectedTable, isRestored]);

  // 🔍 실시간 검색 디바운스 제어 (300ms)
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchValue(searchValue);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchValue]);

  // 🗑️ 소프트 삭제 토글, 검색 컬럼, 디바운스된 검색어 변경 시 자동 조회
  React.useEffect(() => {
    if (selectedTable) {
      setCurrentPage(1);
      fetchTableRows(selectedTable, 1, searchKey, debouncedSearchValue, showDeleted);
    }
  }, [showDeleted, searchKey, debouncedSearchValue]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchTableRows(selectedTable, page, searchKey, debouncedSearchValue, showDeleted);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    setDebouncedSearchValue(searchValue);
  };

  // 💡 AI 자연어 SQL 번역기 기동
  const handleTranslateSQL = async () => {
    if (!aiPrompt.trim()) {
      showToast("AI에게 요청할 자연어 요구사항을 입력해 주세요.", "warn");
      return;
    }

    setIsAiLoading(true);
    setAiGeneratedSql("");
    try {
      const res = await fetch("/api/db/ai-translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: aiPrompt,
          tablesSchema: tables
        })
      });

      const data = await res.json();
      if (data.success && data.sql) {
        setAiGeneratedSql(data.sql);
        showToast("AI가 성공적으로 자연어를 SQL로 번역해 드렸습니다!", "success");
      } else {
        showToast(data.error || "자연어 번역 중 오류가 발생했습니다.", "error");
      }
    } catch (e) {
      showToast("AI 번역기 호출 중 서버 통신 에러가 발생했습니다.", "error");
    } finally {
      setIsAiLoading(false);
    }
  };

  // 5. 커스텀 SQL 직접 실행 (플레이그라운드 샌드박스)
  const handleExecuteSQL = async () => {
    if (!sqlQuery.trim()) {
      showToast("쿼리를 입력해 주세요.", "warn");
      return;
    }

    const upperQuery = sqlQuery.toUpperCase();
    const isDestructive = upperQuery.includes("DROP") || upperQuery.includes("DELETE FROM") || upperQuery.includes("ALTER TABLE") || upperQuery.includes("UPDATE");
    
    if (isDestructive && !safetyUnlocked) {
      showToast("이중 보호장치: 데이터 파괴나 구조 변경 쿼리 실행 전 하단 '안전장치 잠금 해제'를 체크해 주세요.", "warn");
      return;
    }

    setIsLoading(true);
    setConsoleResult(null);
    try {
      const res = await fetch("/api/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "execute", query: sqlQuery })
      });
      const data = await res.json();
      if (data.success) {
        setConsoleResult({
          success: true,
          rows: data.rows,
          affectedRows: data.affectedRows,
          lastInsertRowid: data.lastInsertRowid
        });
        showToast("SQL 쿼리가 성공적으로 완수되었습니다.", "success");
        
        if (data.rows && data.rows.length > 0) {
          triggerAIVisualization(data.rows, sqlQuery);
        }

        fetchTables();
        if (selectedTable) {
          fetchTableSchema(selectedTable);
          fetchTableRows(selectedTable, currentPage, searchKey, debouncedSearchValue);
        }
        setActiveTab('console');
      } else {
        setConsoleResult({
          success: false,
          error: data.error
        });
        showToast(data.error || "쿼리 컴파일 중 문법 오류가 감지되었습니다.", "error");
        setActiveTab('console');
      }
    } catch (e) {
      showToast("SQL 콘솔 실행 실패 (네트워크 장애)", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // 6. 데이터 개별 행 물리 삭제
  const handleDeleteRow = async (row: any) => {
    if (!selectedTable) return;
    
    const pkColumn = tableSchema.find(col => col.pk === 1)?.name || 'id';
    const rowId = row[pkColumn];

    if (rowId === undefined) {
      showToast("고유 식별 기본키(PK) 값을 식별할 수 없는 데이터 행입니다.", "warn");
      return;
    }

    if (!confirm(`정말로 해당 레코드(PK ${pkColumn} = ${rowId})를 물리 데이터베이스에서 즉시 소멸시키겠습니까?`)) {
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/db?action=deleteRows&tableName=${selectedTable}&ids=${rowId}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || "레코드가 삭제되었습니다.", "success");
        fetchTables();
        fetchTableRows(selectedTable, currentPage, searchKey, debouncedSearchValue, showDeleted);
      } else {
        showToast(data.error || "레코드 삭제 실패", "error");
      }
    } catch (e) {
      showToast("삭제 프로세스 통신 실패", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // 6-2. 소프트 삭제된 레코드 안전 복구
  const handleRestoreRow = async (row: any) => {
    if (!selectedTable) return;
    
    const pkColumn = tableSchema.find(col => col.pk === 1)?.name || 'id';
    const rowId = row[pkColumn];

    if (rowId === undefined) {
      showToast("고유 식별 기본키(PK) 값을 식별할 수 없는 데이터 행입니다.", "warn");
      return;
    }

    if (!confirm(`정말로 해당 레코드(PK ${pkColumn} = ${rowId})를 복구하시겠습니까?\n복구 시 감사추적에 복구자와 일시가 자동 등재됩니다.`)) {
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/db", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore", tableName: selectedTable, id: rowId })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || "레코드가 성공적으로 복원되었습니다.", "success");
        fetchTables();
        fetchTableRows(selectedTable, currentPage, searchKey, debouncedSearchValue, showDeleted);
      } else {
        showToast(data.error || "레코드 복원 실패", "error");
      }
    } catch (e) {
      showToast("복구 프로세스 통신 실패", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // 7. 행 추가/수정 저장 액션
  const handleSaveRow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTable) return;

    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const rowPayload: Record<string, any> = {};

    tableSchema.forEach(col => {
      const val = formData.get(col.name);
      if (val === "" || val === null) {
        rowPayload[col.name] = null;
      } else {
        const type = String(col.type).toUpperCase();
        if (type.includes("INT") || type.includes("NUM") || type.includes("REAL")) {
          rowPayload[col.name] = Number(val);
        } else {
          rowPayload[col.name] = val;
        }
      }
    });

    setIsLoading(true);
    try {
      let res;
      if (editingRow) {
        res = await fetch("/api/db", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tableName: selectedTable, rows: [rowPayload] })
        });
      } else {
        res = await fetch("/api/db", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "insert", tableName: selectedTable, rows: [rowPayload] })
        });
      }

      const data = await res.json();
      if (data.success) {
        showToast(data.message || "레코드 처리가 완료되었습니다.", "success");
        setIsRowModalOpen(false);
        setEditingRow(null);
        fetchTables();
        fetchTableRows(selectedTable, currentPage, searchKey, debouncedSearchValue, showDeleted);
      } else {
        showToast(data.error || "레코드 적재 실패", "error");
      }
    } catch (e) {
      showToast("데이터베이스 적재 통신 실패", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // 8. 엑셀 원클릭 로컬 백업 내보내기 (Excel Export)
  const handleExportExcel = async () => {
    if (tableRows.length === 0) {
      showToast("내보낼 데이터가 존재하지 않습니다.", "warn");
      return;
    }

    try {
      const XLSX = await import('xlsx');
      const headers = Object.keys(tableRows[0]);
      const aoaData = [headers];

      tableRows.forEach(row => {
        const rowData = headers.map(key => {
          const val = row[key];
          if (val === null || val === undefined) return "";
          
          const valStr = String(val);
          const keyLower = key.toLowerCase();
          
          const isIdentifierKey = keyLower.includes("number") || 
                                  keyLower.includes("card") || 
                                  keyLower.includes("account") || 
                                  keyLower.includes("phone") || 
                                  keyLower.includes("tel") || 
                                  keyLower.includes("appr") || 
                                  keyLower.includes("serial") ||
                                  keyLower.includes("id");

          if ((isIdentifierKey && /^\d+$/.test(valStr) && valStr.length > 5) || (/^\d+$/.test(valStr) && valStr.length >= 9)) {
            return `'${valStr}`;
          }
          return val;
        });
        aoaData.push(rowData);
      });

      const worksheet = XLSX.utils.aoa_to_sheet(aoaData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, selectedTable ? selectedTable.substring(0, 31) : 'DB_Export');
      XLSX.writeFile(workbook, `EGDESK_EXPORT_${selectedTable || 'data'}_${new Date().toISOString().slice(0,10)}.xlsx`);
      
      showToast("엑셀 파일이 로컬로 안전하게 다운로드되었습니다.", "success");
    } catch (e: any) {
      showToast("내보내기 연산 중 오류가 생겼습니다: " + e.message, "error");
    }
  };

  // 9. 전체 데이터 동기화 액션
  const handleSyncAll = async () => {
    setIsLoading(true);
    showToast("물리 데이터베이스 실시간 전체 동기화 중...", "success");
    try {
      await fetchTables();
      if (selectedTable) {
        await fetchTableSchema(selectedTable);
        await fetchTableRows(selectedTable, currentPage, searchKey, debouncedSearchValue, showDeleted);
      }
      showToast("전체 데이터 동기화가 성공적으로 완료되었습니다.", "success");
    } catch (e) {
      showToast("데이터 동기화 중 오류가 발생했습니다.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const totalPages = Math.ceil(totalRows / itemsPerPage) || 1;

  return {
    isStandalone,
    tables,
    selectedTable,
    setSelectedTable,
    tableSchema,
    tableDDL,
    tableRows,
    totalRows,
    currentPage,
    totalPages,
    itemsPerPage,
    activeTab,
    setActiveTab,
    searchKey,
    setSearchKey,
    searchValue,
    setSearchValue,
    debouncedSearchValue,
    tableSearchQuery,
    setTableSearchQuery,
    sqlQuery,
    setSqlQuery,
    consoleResult,
    setConsoleResult,
    safetyUnlocked,
    setSafetyUnlocked,
    consoleTab,
    setConsoleTab,
    aiPrompt,
    setAiPrompt,
    isAiLoading,
    setIsAiLoading,
    aiGeneratedSql,
    setAiGeneratedSql,
    showDeleted,
    setShowDeleted,
    aiChartSpec,
    setAiChartSpec,
    aiBriefing,
    setAiBriefing,
    isVisualizing,
    setIsVisualizing,
    isShareModalOpen,
    setIsShareModalOpen,
    shareTitle,
    setShareTitle,
    shareInterval,
    setShareInterval,
    generatedShareUrl,
    setGeneratedShareUrl,
    sharedDashboards,
    isSharing,
    isRestored,
    tunePrompt,
    setTunePrompt,
    tuneHistory,
    setTuneHistory,
    selectedChartPart,
    setSelectedChartPart,
    attachedImage,
    setAttachedImage,
    previousSnapshot,
    initialSnapshot,
    isFriendlyShareModalOpen,
    setIsFriendlyShareModalOpen,
    friendlyShareTableName,
    setFriendlyShareTableName,
    friendlyColumnMappings,
    setFriendlyColumnMappings,
    friendlySortColumn,
    setFriendlySortColumn,
    friendlySortDirection,
    setFriendlySortDirection,
    friendlyAllowCsv,
    setFriendlyAllowCsv,
    generatedFriendlyShareUrl,
    setGeneratedFriendlyShareUrl,
    isFriendlySharing,
    isFriendlyRecommendLoading,
    sharedViewsList,
    isSharedViewsLoading,
    isLoading,
    setIsLoading,
    toast,
    showToast,
    isRowModalOpen,
    setIsRowModalOpen,
    editingRow,
    setEditingRow,
    handleCreateShare,
    triggerAIVisualization,
    handleTuneChart,
    handleResetChat,
    handleResetAllPlayground,
    handleUndoTuning,
    handleResetToOriginal,
    handleOpenFriendlyShareModal,
    fetchAIRecommendations,
    handleCreateFriendlyShare,
    fetchSharedViews,
    handleDeleteSharedView,
    handleDeleteRow,
    handleRestoreRow,
    handleSaveRow,
    handleExportExcel,
    handleSyncAll,
    handlePageChange,
    handleSearch,
    handleExecuteSQL,
    handleTranslateSQL
  };
}
