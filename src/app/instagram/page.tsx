"use client";

import { apiFetch } from '@/lib/api';
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, AlertCircle, AlertTriangle } from "lucide-react";

import { Product, InstagramPost, AutopilotSettings } from "./types";
import InstagramHeader from "./components/InstagramHeader";
import InstagramStats from "./components/InstagramStats";
import AutopilotManager from "./components/AutopilotManager";
import AiCreatorStudio from "./components/AiCreatorStudio";
import MobileFeedPreview from "./components/MobileFeedPreview";
import TimelineCalendar from "./components/TimelineCalendar";

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

  // AI 생성 폼 상태
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiTone, setAiTone] = useState("인플루언서형");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState("");
  const [generatedImageUrl, setGeneratedImageUrl] = useState("");

  // 3-Way 이미지 셀렉터 탭
  const [imageTab, setImageTab] = useState<"product" | "ai" | "canvas">("product");
  const [customImageFile, setCustomImageFile] = useState<string | null>(null);

  // 카드뉴스 캔버스 옵션
  const [canvasTitle, setCanvasTitle] = useState("SPECIAL SALE");
  const [canvasSubtitle, setCanvasSubtitle] = useState("오늘 단 하루, 특별한 혜택");
  const [canvasDiscount, setCanvasDiscount] = useState("30% OFF");
  const [canvasOverlayColor, setCanvasOverlayColor] = useState("rgba(0, 0, 0, 0.4)");
  const [canvasTheme, setCanvasTheme] = useState("gradient-gold"); // gradient-gold, neon-pink, modern-dark

  // 예약 설정
  const [scheduleDate, setScheduleDate] = useState(
    new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [scheduleTime, setScheduleTime] = useState("10:00");

  // 계정 연결 상태
  const [isSessionConnected, setIsSessionConnected] = useState(false);

  // 예약/발행 목록 중 선택된 미리보기 포스트 상태
  const [selectedPostForPreview, setSelectedPostForPreview] = useState<InstagramPost | null>(null);

  // 알림/피드백 메시지
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error" | "info">("success");

  // 캔버스 Ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 초기 로딩
  useEffect(() => {
    fetchSettings();
    fetchPosts();
    fetchProducts();
  }, []);

  // 토스트 팝업 띄우기
  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // API 데이터 페칭
  const fetchSettings = async () => {
    try {
      const res = await apiFetch("/api/instagram/settings");
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings(data.settings);
        if (data.settings.instagram_username) {
          setIsSessionConnected(true);
        }
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
        showToast("인스타그램 마케팅 설정이 안전하게 업데이트되었습니다.", "success");
      } else {
        showToast("설정 저장 실패: " + data.error, "error");
      }
    } catch (err: any) {
      showToast("설정 저장 중 오류: " + err.message, "error");
    }
  };

  // 세션 바인딩 연결 시뮬레이터
  const handleConnectSession = async (loginName: string, pass: string) => {
    // 계정 연결 상태 저장
    await saveSettings({
      instagram_username: loginName,
      access_token: "session_bound_" + Math.random().toString(36).substring(7),
    });
    setIsSessionConnected(true);
    showToast(`@${loginName} 계정 세션이 안전하게 바인딩 연동되었습니다!`, "success");
  };

  const handleDisconnectSession = async () => {
    await saveSettings({
      instagram_username: "",
      access_token: "",
    });
    setIsSessionConnected(false);
    showToast("연동된 인스타그램 계정이 해제되었습니다.", "info");
  };

  // AI 문구 및 이미지 동시 생성기 구동
  const handleGenerateAI = async () => {
    setSelectedPostForPreview(null); // 신규 피드 빌드 모드로 전환
    setIsGenerating(true);
    try {
      const res = await apiFetch("/api/instagram/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: selectedProduct?.id || null,
          prompt: aiPrompt,
          tone_style: aiTone,
          generate_image: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedText(data.text);
        setGeneratedImageUrl(data.image_url);
        showToast("AI가 매력적인 문구와 감성 이미지를 완성했습니다!", "success");
        setImageTab("ai");
      } else {
        showToast("AI 생성 실패: " + data.error, "error");
      }
    } catch (err: any) {
      showToast("AI 생성 중 오류: " + err.message, "error");
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

    try {
      const res = await apiFetch("/api/instagram/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: selectedProduct?.id || null,
          status: targetStatus,
          content: postContent,
          image_url: finalImageUrl,
          scheduled_at: targetScheduledAt,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(
          isImmediate
            ? "피드가 인스타그램에 즉시 업로드 완료되었습니다!"
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

  const handleDeletePost = async (postId: number) => {
    if (!confirm("정말 이 예약을 취소하고 삭제하시겠습니까?")) return;
    try {
      const res = await apiFetch(`/api/instagram/posts?id=${postId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        showToast("예약이 정상적으로 취소 및 삭제되었습니다.", "info");
        fetchPosts();
      } else {
        showToast("예약 취소 실패: " + data.error, "error");
      }
    } catch (err: any) {
      showToast("삭제 오류: " + err.message, "error");
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

      {/* 1. 상단 통계 영역 (실데이터 동적 연동 카드) */}
      <InstagramStats
        posts={posts}
        isSessionConnected={isSessionConnected}
        instagramUsername={settings.instagram_username}
      />

      {/* 메인 레이아웃: 대시보드 콘텐츠 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10 items-start">
        {/* 왼쪽 & 중간 영역: 연동 설정 & AI 크리에이터 스튜디오 */}
        <div className="lg:col-span-2 space-y-8">
          {/* 2. 오토파일럿 설정 및 하이브리드 인스타그램 연동 */}
          <AutopilotManager
            settings={settings}
            isSessionConnected={isSessionConnected}
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
