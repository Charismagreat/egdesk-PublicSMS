"use client";

import { apiFetch } from '@/lib/api';
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, AlertCircle, AlertTriangle } from "lucide-react";
import { usePersistedState } from '@/hooks/usePersistedState';

import { Product, InstagramPost, AutopilotSettings, McpInstagramConnection, McpInstagramHistoryEntry } from "./types";
import InstagramHeader from "./components/InstagramHeader";
import InstagramStats from "./components/InstagramStats";
import AutopilotManager from "./components/AutopilotManager";
import AiCreatorStudio from "./components/AiCreatorStudio";
import HashtagLab from "./components/HashtagLab";
import MobileFeedPreview from "./components/MobileFeedPreview";
import TimelineCalendar from "./components/TimelineCalendar";
import { HashtagResponse } from "@/app/api/instagram/generate-hashtags/route";

export default function InstagramMarketingPortal() {
  // 상태 변수
  const [settings, setSettings] = useState<AutopilotSettings>({
    id: 1,
    is_autopilot: 0,
    autopilot_interval: "DAILY",
    autopilot_time: "10:00",
    tone_style: "인플루언서형",
    instagram_username: "",
    access_token: "",
  });

  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // AI 생성 폼 상태 (이탈 방지 보존)
  const [aiPrompt, setAiPrompt] = usePersistedState<string>("ig_ai_prompt", "");
  const [aiTone, setAiTone] = useState("인플루언서형");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedText, setGeneratedText] = usePersistedState<string>("ig_generated_text", "");
  const [generatedImageUrl, setGeneratedImageUrl] = useState("");

  // 3-Way 이미지 셀렉터 탭
  const [imageTab, setImageTab] = useState<"product" | "ai" | "canvas">("product");
  const [customImageFile, setCustomImageFile] = useState<string | null>(null);

  // 카드뉴스 캔버스 옵션 (이탈 방지 보존)
  const [canvasTitle, setCanvasTitle] = usePersistedState<string>("ig_canvas_title", "SPECIAL SALE");
  const [canvasSubtitle, setCanvasSubtitle] = usePersistedState<string>("ig_canvas_subtitle", "오늘 단 하루, 특별한 혜택");
  const [canvasDiscount, setCanvasDiscount] = usePersistedState<string>("ig_canvas_discount", "30% OFF");
  const [canvasOverlayColor, setCanvasOverlayColor] = useState("rgba(0, 0, 0, 0.4)");
  const [canvasTheme, setCanvasTheme] = useState("gradient-gold"); // gradient-gold, neon-pink, modern-dark

  // 예약 설정 (이탈 방지 보존)
  const [scheduleDate, setScheduleDate] = usePersistedState<string>(
    "ig_schedule_date",
    new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [scheduleTime, setScheduleTime] = usePersistedState<string>("ig_schedule_time", "10:00");

  // MCP 연결 및 이력 상태
  const [mcpConnections, setMcpConnections] = useState<McpInstagramConnection[]>([]);
  const [mcpHistory, setMcpHistory] = useState<McpInstagramHistoryEntry[]>([]);
  const [isSyncingStats, setIsSyncingStats] = useState(false);

  // 계정 연결 상태
  const [isSessionConnected, setIsSessionConnected] = useState(false);

  // 예약/발행 목록 중 선택된 미리보기 포스트 상태
  const [selectedPostForPreview, setSelectedPostForPreview] = useState<InstagramPost | null>(null);

  // 알림/피드백 메시지
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error" | "info">("success");

  // 캔버스 Ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // AI Keyword/Hashtag Lab 상태
  const [isGeneratingHashtags, setIsGeneratingHashtags] = useState(false);
  const [hashtagData, setHashtagData] = useState<HashtagResponse>({
    specKeywords: [],
    familyKeywords: [],
    singleKeywords: [],
    petKeywords: [],
    officeKeywords: [],
  });

  const handleGenerateHashtags = async () => {
    setIsGeneratingHashtags(true);
    try {
      const res = await apiFetch("/api/instagram/generate-hashtags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selectedProduct?.name || "추천 상품",
          brand: selectedProduct?.brand || "자체 제작",
          description: selectedProduct?.description || aiPrompt,
        }),
      });
      const data = await res.json();
      if (data.success && data.keywords) {
        setHashtagData(data.keywords);
        showToast("AI 해시태그 연구소가 최적의 인기 해시태그를 도출했습니다!", "success");
      } else {
        showToast("해시태그 생성 실패: " + data.error, "error");
      }
    } catch (err: any) {
      showToast("해시태그 생성 중 오류: " + err.message, "error");
    } finally {
      setIsGeneratingHashtags(false);
    }
  };

  const handleAddHashtagToText = (hashtag: string) => {
    setGeneratedText((prev) => {
      if (prev.includes(hashtag)) return prev;
      return prev ? `${prev} ${hashtag}` : hashtag;
    });
    showToast(`해시태그 [${hashtag}] 피드 에디터에 추가되었습니다!`, "info");
  };

  // 1. 이지데스크 MCP 계정 목록 페칭
  const fetchMcpConnections = async () => {
    try {
      const res = await apiFetch("/api/instagram/connections");
      const data = await res.json();
      if (data.success && Array.isArray(data.connections)) {
        setMcpConnections(data.connections);
        if (data.connections.length > 0 && !settings.instagram_username) {
          saveSettings({ instagram_username: data.connections[0].username });
        }
        setIsSessionConnected(data.connections.length > 0 || Boolean(settings.instagram_username));
      }
    } catch (err) {
      console.error("EGDesk MCP 계정 페칭 에러:", err);
    }
  };

  // 초기 로딩
  useEffect(() => {
    fetchSettings();
    fetchMcpConnections();
    fetchPosts();
    fetchProducts();
    handleSyncStats();
  }, []);

  // 토스트 팝업 띄우기
  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // EGDesk MCP 실시간 지표 동기화
  const handleSyncStats = async () => {
    setIsSyncingStats(true);
    try {
      const res = await apiFetch("/api/instagram/sync-stats", {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        if (Array.isArray(data.history)) {
          setMcpHistory(data.history);
        }
        fetchPosts();
      }
    } catch (err: any) {
      console.warn("지표 동기화 경고:", err.message);
    } finally {
      setIsSyncingStats(false);
    }
  };

  // API 데이터 페칭
  const fetchSettings = async () => {
    try {
      const res = await apiFetch("/api/instagram/settings");
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings(data.settings);
        if (Array.isArray(data.mcpConnections)) {
          setMcpConnections(data.mcpConnections);
        }
        const hasConnection = Boolean(
          data.settings.instagram_username || (data.mcpConnections && data.mcpConnections.length > 0)
        );
        setIsSessionConnected(hasConnection);
      }
    } catch (err) {
      console.error("설정 로딩 에러:", err);
    }
  };

  const fetchPosts = async () => {
    try {
      const res = await apiFetch("/api/instagram/posts");
      const data = await res.json();
      if (data.success && data.posts) {
        setPosts(data.posts);
      }
    } catch (err) {
      console.error("게시물 목록 로딩 에러:", err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await apiFetch("/api/products");
      const data = await res.json();
      if (data.success && data.products) {
        setProducts(data.products);
        if (data.products.length > 0) {
          setSelectedProduct(data.products[0]);
          setCanvasTitle(data.products[0].name.substring(0, 15));
        }
      }
    } catch (err) {
      console.error("상품 로딩 에러:", err);
    }
  };

  // 설정 저장
  const saveSettings = async (updatedSettings: Partial<AutopilotSettings>) => {
    try {
      const newSettings = { ...settings, ...updatedSettings };
      const res = await apiFetch("/api/instagram/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSettings),
      });
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
      }
    } catch (err: any) {
      console.error("설정 저장 중 오류:", err.message);
    }
  };

  // 이지데스크 순정 MCP 계정 신규 추가 등록
  const handleConnectSession = async (loginName: string, pass: string, handle?: string) => {
    try {
      const res = await apiFetch("/api/instagram/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: loginName,
          username: loginName,
          password: pass,
          handle,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`@${loginName} 계정이 이지데스크 MCP 보안 공간에 신규 저장되었습니다!`, "success");
        await saveSettings({ instagram_username: loginName });
        fetchMcpConnections();
      } else {
        showToast("계정 등록 실패: " + data.error, "error");
      }
    } catch (err: any) {
      showToast("계정 등록 중 오류: " + err.message, "error");
    }
  };

  // 이지데스크 MCP 계정 선택
  const handleSelectConnection = (conn: McpInstagramConnection) => {
    saveSettings({ instagram_username: conn.username });
    showToast(`포스팅 수행 계정으로 [@${conn.username}]이(가) 선택되었습니다.`, "info");
  };

  // 이지데스크 MCP 계정 삭제
  const handleDeleteConnection = async (connId: string) => {
    try {
      const res = await apiFetch(`/api/instagram/connections?id=${connId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        showToast("계정이 이지데스크 MCP에서 삭제되었습니다.", "info");
        fetchMcpConnections();
      } else {
        showToast("계정 삭제 실패: " + data.error, "error");
      }
    } catch (err: any) {
      showToast("계정 삭제 중 오류: " + err.message, "error");
    }
  };

  const handleDisconnectSession = async () => {
    await saveSettings({
      instagram_username: "",
      access_token: "",
    });
    setIsSessionConnected(false);
    showToast("연동된 인스타그램 계정이 해제되었습니다.", "info");
  };

  // 커스텀 이미지 프롬프트 상태
  const [customImagePrompt, setCustomImagePrompt] = useState<string>("");

  // AI 문구 및 이미지 동시 생성기 구동
  const handleGenerateAI = async () => {
    setSelectedPostForPreview(null); // 신규 피드 빌드 모드로 전환
    setIsGenerating(true);
    
    // 75초 클라이언트 타임아웃 방어막 (백엔드 60초 감시)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 75000);

    try {
      const res = await apiFetch("/api/instagram/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          product_id: selectedProduct?.id || null,
          prompt: aiPrompt,
          tone_style: aiTone,
          custom_image_prompt: customImagePrompt,
          generate_image: true,
        }),
      });
      clearTimeout(timeoutId);

      const rawText = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(rawText);
      } catch (jsonErr) {
        showToast(`서버 응답 형식 오류 (HTTP ${res.status}): ${rawText.slice(0, 80)}`, "error");
        return;
      }

      if (data.success) {
        setGeneratedText(data.text);
        setGeneratedImageUrl(data.image_url);
        if (data.isFallback) {
          showToast(`⚡ ${data.message}`, "info");
        } else if (data.imagen_error) {
          showToast(`⚠️ [Google Imagen 3 생성 실패] ${data.imagen_error}`, "error");
        } else {
          showToast("AI가 지정하신 프롬프트를 바탕으로 문구와 감성 이미지를 완성했습니다!", "success");
        }
        setImageTab("ai");
      } else {
        showToast("AI 생성 실패: " + data.error, "error");
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        showToast("생성 시간이 초과되어 안전하게 중단되었습니다. 다시 시도해 주세요.", "error");
      } else {
        showToast("AI 생성 중 오류: " + err.message, "error");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // 오토파일럿 데몬 강제 즉시 실행 트리거
  const handleTriggerAutopilot = async () => {
    showToast("오토파일럿 AI 마케터를 즉시 구동합니다...", "info");
    try {
      const res = await apiFetch("/api/instagram/scheduler");
      const data = await res.json();
      if (data.success) {
        if (data.triggered) {
          showToast(data.message, "success");
          fetchPosts(); // 리스트 새로고침
        } else {
          showToast(data.message, "info");
        }
      } else {
        showToast("오토파일럿 구동 실패: " + data.error, "error");
      }
    } catch (err: any) {
      showToast("오토파일럿 구동 중 오류: " + err.message, "error");
    }
  };

  // 예약/발행 승인 포스팅 등록
  const handleSchedulePost = async (isImmediate = false) => {
    if (!isSessionConnected) {
      showToast("먼저 인스타그램 계정을 연동해 주세요.", "error");
      return;
    }

    let finalImageUrl = "";

    // 탭별 이미지 소스 획득
    if (imageTab === "product") {
      if (!selectedProduct?.main_image_url) {
        showToast("선택된 상품에 메인 이미지가 없습니다.", "error");
        return;
      }
      finalImageUrl = selectedProduct.main_image_url;
    } else if (imageTab === "ai") {
      if (!generatedImageUrl) {
        showToast("생성된 AI 감성 이미지가 없습니다.", "error");
        return;
      }
      finalImageUrl = generatedImageUrl;
    } else if (imageTab === "canvas") {
      if (!canvasRef.current) {
        showToast("카드뉴스 로딩에 실패했습니다.", "error");
        return;
      }
      finalImageUrl = canvasRef.current.toDataURL("image/png");
    }

    const postContent =
      generatedText ||
      (selectedProduct ? `✨ 신상품 출시! [${selectedProduct.name}] ✨\n\n지금 바로 프로필 링크에서 만나보세요! 🛍️` : "");

    const targetStatus = isImmediate ? "POSTED" : "SCHEDULED";
    const targetScheduledAt = isImmediate
      ? new Date().toISOString()
      : new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString();

    showToast("이지데스크 MCP Playwright 브라우저 매크로가 포스팅을 시작합니다...", "info");

    try {
      const selectedConn = mcpConnections.find((c) => c.username === settings.instagram_username) || mcpConnections[0];

      const res = await apiFetch("/api/instagram/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectionId: selectedConn?.id || null,
          product_id: selectedProduct?.id || null,
          status: targetStatus,
          caption: postContent,
          content: postContent,
          image_url: finalImageUrl,
          scheduled_at: targetScheduledAt,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(
          isImmediate
            ? "이지데스크 Playwright 브라우저 매크로가 피드 작성을 완료했습니다!"
            : "포스팅이 지정한 시간대에 성공적으로 예약되었습니다.",
          "success"
        );

        // 폼 리셋
        setGeneratedText("");
        setAiPrompt("");

        // 이력 다시 불러오기
        fetchPosts();
      } else {
        showToast("예약 등록 실패: " + data.error, "error");
      }
    } catch (err: any) {
      showToast("예약 등록 중 오류: " + err.message, "error");
    }
  };

  // 예약글 즉시 발행(승인) 또는 취소(삭제)
  const handleApproveImmediate = async (postId: number) => {
    try {
      const res = await apiFetch("/api/instagram/posts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: postId,
          updates: { status: "POSTED" },
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("예약 초안이 즉시 발행 승인되었습니다!", "success");
        fetchPosts();
      } else {
        showToast("승인 실패: " + data.error, "error");
      }
    } catch (err: any) {
      showToast("승인 오류: " + err.message, "error");
    }
  };

  const handleDeletePost = async (postId: number | string) => {
    const targetPost = posts.find((p) => String(p.id) === String(postId));
    const isAlreadyPosted = targetPost && (targetPost.status === "POSTED" || targetPost.status === "PUBLISHED");

    const confirmMsg = isAlreadyPosted
      ? "이 항목은 이미 인스타그램에 발행 완료된 피드입니다.\n관제 타임라인 시스템 이력에서 제거하시겠습니까?\n\n(참고: 실제 인스타그램에 올라간 게시물은 인스타그램 앱에서 직접 삭제하셔야 합니다.)"
      : "정말 이 포스팅 예약/초안 항목을 취소하고 삭제하시겠습니까?";

    if (!confirm(confirmMsg)) return;

    try {
      const res = await apiFetch(`/api/instagram/posts?postId=${postId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        // 화면에서 즉시 0.001초 만에 항목 지움
        setPosts((prev) => prev.filter((p) => String(p.id) !== String(postId)));
        if (selectedPostForPreview?.id === postId) {
          setSelectedPostForPreview(null);
        }
        if (isAlreadyPosted) {
          showToast("포스팅 시스템 이력이 삭제되었습니다. (실제 인스타 게시물은 앱에서 삭제 필요)", "info");
        } else {
          showToast("포스팅 예약 항목이 정상적으로 취소 및 삭제되었습니다.", "success");
        }
        fetchPosts();
      } else {
        showToast("삭제 실패: " + data.error, "error");
      }
    } catch (err: any) {
      showToast("삭제 중 오류: " + err.message, "error");
    }
  };

  // 직접 이미지 업로드 (카드뉴스 배경 등 활용)
  const handleLocalImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCustomImageFile(event.target.result as string);
          showToast("커스텀 이미지가 업로드되어 캔버스 스튜디오에 적용되었습니다.", "success");
          setImageTab("canvas");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6 pb-20 w-full min-w-0 text-slate-800" data-easybot-hint="인스타그램 마케팅 AI: 지정한 비즈니스 키워드에 최적화된 마케팅용 인스타그램 피드 본문을 자동 생성합니다.">
      {/* 헤더 영역 */}
      <InstagramHeader />

      {/* 1. 실시간 데이터 스코어보드 */}
      <InstagramStats
        posts={posts}
        isSessionConnected={isSessionConnected}
        instagramUsername={settings.instagram_username}
        mcpHistory={mcpHistory}
        onSyncStats={handleSyncStats}
        isSyncingStats={isSyncingStats}
      />

      {/* 메인 레이아웃: 대시보드 콘텐츠 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10 items-start">
        {/* 왼쪽 & 중간 영역: 연동 설정 & AI 크리에이터 스튜디오 */}
        <div className="lg:col-span-2 space-y-8">
          {/* 2. 오토파일럿 설정 및 하이브리드 인스타그램 연동 */}
          <AutopilotManager
            settings={settings}
            isSessionConnected={isSessionConnected}
            mcpConnections={mcpConnections}
            onSelectConnection={handleSelectConnection}
            onDeleteConnection={handleDeleteConnection}
            onSaveSettings={saveSettings}
            onTriggerAutopilot={handleTriggerAutopilot}
            onConnectSession={handleConnectSession}
            onDisconnectSession={handleDisconnectSession}
          />

          {/* 3. AI 크리에이터 스튜디오 & 3-Way 이미지 셀렉터 */}
          <AiCreatorStudio
            products={products}
            selectedProduct={selectedProduct}
            onSelectProduct={(prod) => {
              setSelectedProduct(prod);
              setSelectedPostForPreview(null);
              setCanvasTitle(prod.name.substring(0, 15));
            }}
            aiPrompt={aiPrompt}
            onAiPromptChange={setAiPrompt}
            customImagePrompt={customImagePrompt}
            onCustomImagePromptChange={setCustomImagePrompt}
            aiTone={aiTone}
            onAiToneChange={setAiTone}
            isGenerating={isGenerating}
            onGenerateAI={handleGenerateAI}
            generatedText={generatedText}
            onGeneratedTextChange={setGeneratedText}
            generatedImageUrl={generatedImageUrl}
            imageTab={imageTab}
            onImageTabChange={setImageTab}
            customImageFile={customImageFile}
            onLocalImageUpload={handleLocalImageUpload}
            canvasRef={canvasRef}
            canvasTitle={canvasTitle}
            onCanvasTitleChange={setCanvasTitle}
            canvasSubtitle={canvasSubtitle}
            onCanvasSubtitleChange={setCanvasSubtitle}
            canvasDiscount={canvasDiscount}
            onCanvasDiscountChange={setCanvasDiscount}
            canvasTheme={canvasTheme}
            onCanvasThemeChange={setCanvasTheme}
            canvasOverlayColor={canvasOverlayColor}
            onCanvasOverlayColorChange={setCanvasOverlayColor}
            instagramUsername={settings.instagram_username}
            scheduleDate={scheduleDate}
            onScheduleDateChange={setScheduleDate}
            scheduleTime={scheduleTime}
            onScheduleTimeChange={setScheduleTime}
            onSchedulePost={handleSchedulePost}
          />

          {/* 4. AI 해시태그 & 페르소나 연구소 */}
          <HashtagLab
            selectedProduct={selectedProduct}
            isGeneratingHashtags={isGeneratingHashtags}
            onGenerateHashtags={handleGenerateHashtags}
            hashtagData={hashtagData}
            onAddHashtagToText={handleAddHashtagToText}
          />
        </div>

        {/* 우측 영역: 모바일 폰 렌더링 라이브 프리뷰 및 예약 캘린더 */}
        <div className="space-y-8">
          {/* 모바일 폰 라이브 미리보기 */}
          <MobileFeedPreview
            selectedPostForPreview={selectedPostForPreview}
            imageTab={imageTab}
            selectedProduct={selectedProduct}
            generatedImageUrl={generatedImageUrl}
            generatedText={generatedText}
            instagramUsername={settings.instagram_username}
          />

          {/* 5. 예약/발행 이력 캘린더 타임라인 */}
          <TimelineCalendar
            posts={posts}
            selectedPostForPreview={selectedPostForPreview}
            onSelectPostForPreview={setSelectedPostForPreview}
            isSessionConnected={isSessionConnected}
            onApproveImmediate={handleApproveImmediate}
            onDeletePost={handleDeletePost}
          />
        </div>
      </div>

      {/* 실시간 알림 토스트 */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, top: -80 }}
            animate={{ opacity: 1, top: 32 }}
            exit={{ opacity: 0, top: -80 }}
            className={`fixed right-8 z-50 px-5 py-3.5 rounded-2xl border shadow-lg flex items-center gap-3 backdrop-blur-xl ${
              toastType === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800 shadow-emerald-100/50"
                : toastType === "error"
                ? "bg-rose-50 border-rose-200 text-rose-800 shadow-rose-100/50"
                : "bg-slate-50 border-slate-200 text-slate-800 shadow-slate-100/50"
            }`}
          >
            {toastType === "success" ? (
              <Check className="w-5 h-5 text-emerald-600 bg-emerald-100 p-0.5 rounded-full" />
            ) : toastType === "error" ? (
              <AlertCircle className="w-5 h-5 text-rose-600 bg-rose-100 p-0.5 rounded-full" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-slate-600 bg-slate-100 p-0.5 rounded-full" />
            )}
            <span className="text-xs font-semibold">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
