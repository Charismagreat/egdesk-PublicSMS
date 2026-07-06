'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';

// 공통 타입 및 샘플 데이터 임포트
import { ScriptLine, ShortsHistory, SAMPLE_BLOG_POSTS, VideoTone, TargetAge } from './types';

// 분리된 서브 컴포넌트 임포트
import ShortsHeader from './components/ShortsHeader';
import ShortsInputPanel from './components/ShortsInputPanel';
import ShortsBuildSettings from './components/ShortsBuildSettings';
import ShortsSimulator from './components/ShortsSimulator';
import ShortsHistoryTimeline from './components/ShortsHistoryTimeline';
import YoutubeConnectModal from './components/YoutubeConnectModal';

export default function YoutubeShortsAiLab() {
  // --- 상태 관리 ---
  const [activeInputTab, setActiveInputTab] = useState<'text' | 'blog'>('text');
  const [activeOutputTab, setActiveOutputTab] = useState<'A' | 'B'>('A');
  
  // 입력 폼 상태
  const [productName, setProductName] = useState('');
  const [productDetails, setProductDetails] = useState('');
  const [blogUrl, setBlogUrl] = useState('');
  const [selectedBlogSample, setSelectedBlogSample] = useState<number | null>(null);
  
  // 생성 옵션 설정
  const [videoTone, setVideoTone] = useState<VideoTone>('review');
  const [targetAge, setTargetAge] = useState<TargetAge>('2030');
  
  // AI 생성 결과 상태
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [shortsTitle, setShortsTitle] = useState('');
  const [generatedScript, setGeneratedScript] = useState<ScriptLine[]>([]);
  const [bgMusic, setBgMusic] = useState('신나는 비트 테크노 Hiphop');
  const [bgVisualTheme, setBgVisualTheme] = useState('미니멀리즘 테크 디자인');

  // 유튜브 API 연동 설정 상태
  const [isYoutubeConnected, setIsYoutubeConnected] = useState(false);
  const [youtubeChannelName, setYoutubeChannelName] = useState('EGDESK AI LAB 공식 채널');
  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(false);
  const [apiClientId, setApiClientId] = useState('');
  const [apiClientSecret, setApiClientSecret] = useState('');

  // 시뮬레이터 실시간 재생 관련 상태
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [playbackTime, setPlaybackTime] = useState(0);
  const playTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 예약 날짜/시간
  const [scheduleDate, setScheduleDate] = useState(
    new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [scheduleTime, setScheduleTime] = useState('18:00');

  // 토스트 메시지
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // 쇼츠 예약 발행 히스토리 검색 및 페이지네이션 상태
  const [shortsSearchQuery, setShortsSearchQuery] = useState('');
  const [shortsCurrentPage, setShortsCurrentPage] = useState(1);
  const [shortsItemsPerPage, setShortsItemsPerPage] = useState(10);

  // 검색어 변경 시 페이지 번호 초기화
  useEffect(() => {
    setShortsCurrentPage(1);
  }, [shortsSearchQuery]);

  // 쇼츠 생성 이력 샘플 데이터
  const [shortsHistoryList, setShortsHistoryList] = useState<ShortsHistory[]>([
    {
      id: "SH-001",
      title: "에어제트 X10: 손가락으로 드는 청소기가 있다?! 😲",
      sourceType: "blog",
      outputType: "B",
      status: "COMPLETED",
      views: 12450,
      likes: 852,
      comments: 48,
      scheduledAt: "2026-05-20 18:30 (완료)",
      thumbnail: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=200&auto=format&fit=crop&q=60"
    },
    {
      id: "SH-002",
      title: "사무실 인싸 등극하는 스마트 텀블러 실물 영접 ☕",
      sourceType: "text",
      outputType: "A",
      status: "SCHEDULED",
      views: 0,
      likes: 0,
      comments: 0,
      scheduledAt: "2026-05-22 14:00 (예약)",
      thumbnail: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=200&auto=format&fit=crop&q=60"
    },
    {
      id: "SH-003",
      title: "10초만에 끝내는 여름 휴가철 초경량 텐트 고르기 🏕️",
      sourceType: "text",
      outputType: "B",
      status: "COMPLETED",
      views: 8960,
      likes: 423,
      comments: 29,
      scheduledAt: "2026-05-19 12:00 (완료)",
      thumbnail: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=200&auto=format&fit=crop&q=60"
    }
  ]);

  // 쇼츠 히스토리 실시간 필터링
  const filteredShorts = shortsHistoryList.filter(item => {
    const query = shortsSearchQuery.toLowerCase().trim();
    if (!query) return true;
    
    const titleMatch = item.title?.toLowerCase().includes(query) || false;
    const idMatch = item.id?.toLowerCase().includes(query) || false;
    const sourceTypeMatch = item.sourceType?.toLowerCase().includes(query) || false;
    
    return titleMatch || idMatch || sourceTypeMatch;
  });

  // 쇼츠 히스토리 페이지네이션 슬라이싱
  const totalPages = Math.ceil(filteredShorts.length / shortsItemsPerPage);
  const startIndex = (shortsCurrentPage - 1) * shortsItemsPerPage;
  const endIndex = startIndex + shortsItemsPerPage;
  const paginatedShorts = filteredShorts.slice(startIndex, endIndex);

  // --- 토스트 노출 유틸 ---
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // --- 샘플 블로그 포스트 로드 ---
  const handleSelectBlogSample = (index: number) => {
    setSelectedBlogSample(index);
    setBlogUrl(SAMPLE_BLOG_POSTS[index].url);
    showToast(`샘플 블로그 포스트가 연동되었습니다: "${SAMPLE_BLOG_POSTS[index].title.substring(0, 15)}..."`, "info");
  };

  // --- 블로그 주소 임의 변경 시 샘플 해제 ---
  useEffect(() => {
    if (selectedBlogSample !== null && blogUrl !== SAMPLE_BLOG_POSTS[selectedBlogSample].url) {
      setSelectedBlogSample(null);
    }
  }, [blogUrl]);

  // --- AI 쇼츠 자동 생성 ---
  const handleGenerateShorts = () => {
    if (activeInputTab === 'text' && (!productName || !productDetails)) {
      showToast("상품명과 상품 상세 정보를 입력해 주세요.", "error");
      return;
    }
    if (activeInputTab === 'blog' && !blogUrl) {
      showToast("연동할 네이버 블로그 URL을 입력하거나 샘플을 선택해 주세요.", "error");
      return;
    }

    setIsGenerating(true);
    setIsGenerated(false);
    setIsPlaying(false);
    setCurrentLineIndex(0);
    setPlaybackTime(0);

    // AI 생성 중 시뮬레이션 지연 (1.8초)
    setTimeout(() => {
      setIsGenerating(false);
      setIsGenerated(true);
      
      let baseTitle = "";
      let scriptLines: ScriptLine[] = [];

      if (activeInputTab === 'text') {
        baseTitle = productName ? `[단독공개] 대박예감 ${productName} 솔직 리뷰 😱` : "[화제] SNS 대란템 직접 써보고 기절초풍한 후기!";
        scriptLines = [
          { time: "00:00", seconds: 0, text: "요즘 SNS에서 난리 난 이 아이템, 알고 계셨나요? 🔥", audioStatus: "[신나고 명쾌한 목소리]" },
          { time: "00:03", seconds: 3, text: `바로 혁신적인 성능을 자랑하는 '${productName}' 입니다! ✨`, audioStatus: "[임팩트 있는 보이스]" },
          { time: "00:06", seconds: 6, text: `직접 사용해 보니 ${productDetails.substring(0, 30)}... 라는 점이 정말 놀라웠어요! 👍`, audioStatus: "[진솔하고 감탄하는 톤]" },
          { time: "00:10", seconds: 10, text: "특히 이 가격에 이런 고급스러운 퀄리티라니 믿기지 않습니다. 💸", audioStatus: "[강조하는 리드미컬 톤]" },
          { time: "00:13", seconds: 13, text: "지금 구매하면 평생 무료 혜택까지 진행 중이라고 하네요! 🚀", audioStatus: "[소개팅처럼 속삭이듯]" },
          { time: "00:16", seconds: 16, text: "더 자세한 정보와 특별 구매 혜택은 프로필 링크를 확인하세요! ❤️", audioStatus: "[친절하고 경쾌하게 마무리]" },
        ];
      } else {
        // 블로그 연동 모드
        const post = selectedBlogSample !== null ? SAMPLE_BLOG_POSTS[selectedBlogSample] : { title: "네이버 블로그 화제글", content: "최고의 성능을 자랑하는 추천 솔루션 후기입니다." };
        baseTitle = `[1분요약] 블로그 대란 글! "${post.title.replace(/\[.*\]\s*/g, '')}" 요점만 콕 짚어줌!`;
        scriptLines = [
          { time: "00:00", seconds: 0, text: "네이버 블로그 실시간 1위 화제의 글, 핵심만 30초 요약! 📢", audioStatus: "[아나운서 톤으로 시선집중]" },
          { time: "00:03", seconds: 3, text: `주제는 바로: ${post.title.substring(0, 30)}... 🌟`, audioStatus: "[기대에 찬 밝은 톤]" },
          { time: "00:06", seconds: 6, text: `이 글의 본문 핵심은 "${post.content.substring(0, 45)}..." 입니다! 💡`, audioStatus: "[중요 포인트 설명 톤]" },
          { time: "00:10", seconds: 10, text: "수많은 리얼 후기가 증명하는 바로 이 역대급 솔루션, 팩트 체크 완료! ✔️", audioStatus: "[신뢰감이 차오르는 목소리]" },
          { time: "00:13", seconds: 13, text: "블로그 이웃 한정으로 극비 프로모션까지 공유 중이랍니다. 🤫", audioStatus: "[속닥거리는 서스펜스 효과음]" },
          { time: "00:16", seconds: 16, text: "지금 바로 아래 하단 관련 링크를 통해 전체 본문을 확인해 보세요! 🔗", audioStatus: "[부드러운 미소 톤]" }
        ];
      }

      setShortsTitle(baseTitle);
      setGeneratedScript(scriptLines);
      showToast("AI가 기가 막힌 1분 숏폼 최적화 스크립트 및 큐시트를 자동 생성 완료했습니다!", "success");
    }, 1800);
  };

  // --- 시뮬레이터 재생/일시정지 기능 ---
  const handlePlayToggle = () => {
    if (!isGenerated) {
      showToast("먼저 AI 스크립트를 생성해 주세요.", "info");
      return;
    }
    
    if (isPlaying) {
      // 일시정지
      setIsPlaying(false);
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    } else {
      // 재생 시작
      setIsPlaying(true);
      
      // 타이머 시작 (1초 단위로 재생 시간 흘러감)
      playTimerRef.current = setInterval(() => {
        setPlaybackTime((prev) => {
          const nextTime = prev >= 18 ? 0 : prev + 1; // 18초 루프
          
          // 현재 재생 시간(초)에 부합하는 자막 인덱스 찾기
          const matchedIndex = generatedScript.findIndex((line, idx) => {
            const currentSec = line.seconds;
            const nextSec = generatedScript[idx + 1] ? generatedScript[idx + 1].seconds : 999;
            return nextTime >= currentSec && nextTime < nextSec;
          });
          
          if (matchedIndex !== -1) {
            setCurrentLineIndex(matchedIndex);
          }
          
          return nextTime;
        });
      }, 1000);
    }
  };

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, []);

  // --- 유튜브 채널 공식 API 세팅 토글 ---
  const handleConnectYoutube = () => {
    if (!apiClientId || !apiClientSecret) {
      showToast("OAuth 2.0 Client ID와 Client Secret을 모두 입력해 주세요.", "error");
      return;
    }
    setIsYoutubeConnected(true);
    setIsConnectionModalOpen(false);
    showToast(`유튜브 계정이 성공적으로 연동되었습니다! 채널: ${youtubeChannelName}`, "success");
  };

  const handleDisconnectYoutube = () => {
    setIsYoutubeConnected(false);
    setApiClientId('');
    setApiClientSecret('');
    showToast("유튜브 채널 연동이 해제되었습니다.", "info");
  };

  // --- 발행 및 예약 저장 (A안 / B안 통합 처리) ---
  const handlePublishShorts = () => {
    if (!isGenerated) {
      showToast("먼저 AI 쇼츠를 생성해야 발행이 가능합니다.", "error");
      return;
    }

    if (activeOutputTab === 'B' && !isYoutubeConnected) {
      showToast("유튜브 채널 공식 API가 연동되어 있지 않습니다. 가상 샌드박스 연동 또는 계정 연동 후 이용해 주세요.", "error");
      return;
    }

    // 새로운 히스토리 아이템 추가
    const newShorts: ShortsHistory = {
      id: `SH-${Math.floor(100 + Math.random() * 900)}`,
      title: shortsTitle,
      sourceType: activeInputTab,
      outputType: activeOutputTab,
      status: activeOutputTab === 'A' ? 'COMPLETED' : 'SCHEDULED',
      views: 0,
      likes: 0,
      comments: 0,
      scheduledAt: `${scheduleDate} ${scheduleTime} (${activeOutputTab === 'A' ? '즉시 다운로드 완료' : '자동 업로드 예정'})`,
      thumbnail: activeInputTab === 'text' 
        ? "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=200&auto=format&fit=crop&q=60"
        : "https://images.unsplash.com/photo-1542435503-956c469947f6?w=200&auto=format&fit=crop&q=60"
    };

    setShortsHistoryList([newShorts, ...shortsHistoryList]);

    if (activeOutputTab === 'A') {
      showToast("🎉 대본 + 자막 싱크(SRT) + 고품질 AI 오디오(MP3) 압축 패키지가 브라우저 다운로드 큐에 추가되었습니다!", "success");
    } else {
      showToast(`🚀 [B안 오토파일럿] 지정된 예약 시간(${scheduleDate} ${scheduleTime})에 맞춰 렌더링 후 자동 업로드가 등록되었습니다!`, "success");
    }
  };

  // --- 히스토리 개별 항목 삭제 ---
  const handleDeleteHistory = (id: string) => {
    setShortsHistoryList(shortsHistoryList.filter(item => item.id !== id));
    showToast("해당 예약/발행 히스토리 항목을 삭제하였습니다.", "info");
  };

  return (
    <div className="space-y-6 pb-20 w-full min-w-0 text-slate-800 font-sans text-left" data-easybot-hint="YOUTUBE 쇼츠 AI: 숏폼 영상 제작용 트렌디한 유튜브 쇼츠 비디오 스크립트 대본 작성을 수행합니다.">

      {/* 알림 토스트 (framer-motion 애니메이션) */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-xl text-white font-medium ${
              toast.type === 'success' ? 'bg-gradient-to-r from-emerald-500 to-teal-600' :
              toast.type === 'error' ? 'bg-gradient-to-r from-rose-500 to-red-600' :
              'bg-gradient-to-r from-blue-500 to-indigo-600'
            }`}
          >
            {toast.type === 'success' && <CheckCircle className="w-5 h-5" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5" />}
            {toast.type === 'info' && <Info className="w-5 h-5" />}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. 대헤더 배너 영역 */}
      <ShortsHeader
        isYoutubeConnected={isYoutubeConnected}
        youtubeChannelName={youtubeChannelName}
        setIsConnectionModalOpen={setIsConnectionModalOpen}
        handleDisconnectYoutube={handleDisconnectYoutube}
      />

      {/* 2. 메인 하이브리드 대시보드 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT: 제어판 및 폼 (7컬럼) */}
        <div className="lg:col-span-7 space-y-6">
          <ShortsInputPanel
            activeInputTab={activeInputTab}
            setActiveInputTab={setActiveInputTab}
            productName={productName}
            setProductName={setProductName}
            productDetails={productDetails}
            setProductDetails={setProductDetails}
            blogUrl={blogUrl}
            setBlogUrl={setBlogUrl}
            selectedBlogSample={selectedBlogSample}
            handleSelectBlogSample={handleSelectBlogSample}
            videoTone={videoTone}
            setVideoTone={setVideoTone}
            targetAge={targetAge}
            setTargetAge={setTargetAge}
            isGenerating={isGenerating}
            handleGenerateShorts={handleGenerateShorts}
          />

          <ShortsBuildSettings
            isGenerated={isGenerated}
            activeOutputTab={activeOutputTab}
            setActiveOutputTab={setActiveOutputTab}
            isYoutubeConnected={isYoutubeConnected}
            scheduleDate={scheduleDate}
            setScheduleDate={setScheduleDate}
            scheduleTime={scheduleTime}
            setScheduleTime={setScheduleTime}
            handlePublishShorts={handlePublishShorts}
          />
        </div>

        {/* RIGHT: 9:16 모바일 쇼츠 플레이어 프레임 (5컬럼) */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <ShortsSimulator
            isGenerated={isGenerated}
            isPlaying={isPlaying}
            handlePlayToggle={handlePlayToggle}
            generatedScript={generatedScript}
            currentLineIndex={currentLineIndex}
            playbackTime={playbackTime}
            shortsTitle={shortsTitle}
            bgMusic={bgMusic}
            bgVisualTheme={bgVisualTheme}
          />
        </div>
      </div>

      {/* 3. 하단: 예약 및 발행 완료 쇼츠 타임라인 히스토리 리스트 */}
      <ShortsHistoryTimeline
        filteredShorts={filteredShorts}
        shortsSearchQuery={shortsSearchQuery}
        setShortsSearchQuery={setShortsSearchQuery}
        shortsItemsPerPage={shortsItemsPerPage}
        setShortsItemsPerPage={setShortsItemsPerPage}
        shortsCurrentPage={shortsCurrentPage}
        setShortsCurrentPage={setShortsCurrentPage}
        paginatedShorts={paginatedShorts}
        totalPages={totalPages}
        startIndex={startIndex}
        endIndex={endIndex}
        handleDeleteHistory={handleDeleteHistory}
      />

      {/* 4. MODAL: 유튜브 채널 공식 API 세팅창 */}
      <YoutubeConnectModal
        isOpen={isConnectionModalOpen}
        onClose={() => setIsConnectionModalOpen(false)}
        youtubeChannelName={youtubeChannelName}
        setYoutubeChannelName={setYoutubeChannelName}
        apiClientId={apiClientId}
        setApiClientId={setApiClientId}
        apiClientSecret={apiClientSecret}
        setApiClientSecret={setApiClientSecret}
        handleConnectYoutube={handleConnectYoutube}
      />

    </div>
  );
}
