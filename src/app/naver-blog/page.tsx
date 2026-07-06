'use client';

import { apiFetch } from '@/lib/api';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

// 공통 타입 임포트
import { Product, NaverPost, AutopilotSettings, KeywordItem } from './types';

// 하위 서브 컴포넌트 임포트
import StatsGrid from './components/StatsGrid';
import AccountManager from './components/AccountManager';
import ProductSelector from './components/ProductSelector';
import KeywordLab from './components/KeywordLab';
import PostBuilder from './components/PostBuilder';
import MobilePreview from './components/MobilePreview';
import TimelineTimeline from './components/TimelineTimeline';
import GuideModals from './components/GuideModals';

// 커스텀 네이버 아이콘 SVG 컴포넌트
function NaverIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="currentColor"
      className={className}
    >
      <path d="M16.273 2.25h5.477V21.75h-5.477l-8.545-12.3v12.3H2.25V2.25h5.477l8.546 12.3V2.25z"/>
    </svg>
  );
}

export default function NaverBlogMarketingPortal() {
  // 상태 변수 정의
  const [settings, setSettings] = useState<AutopilotSettings>({
    id: 1,
    is_autopilot: 0,
    autopilot_interval: 'DAILY',
    autopilot_time: '10:00',
    tone_style: '정보제공형',
    naver_blog_id: '',
    api_client_id: '',
    api_client_secret: ''
  });

  const [posts, setPosts] = useState<NaverPost[]>([]);
  const [blogSearchQuery, setBlogSearchQuery] = useState('');
  const [blogCurrentPage, setBlogCurrentPage] = useState(1);
  const [blogItemsPerPage, setBlogItemsPerPage] = useState(10);

  // 검색어 입력 시 페이지 번호 초기화
  useEffect(() => {
    setBlogCurrentPage(1);
  }, [blogSearchQuery]);

  // 네이버 블로그 포스팅 실시간 필터링
  const filteredPosts = posts.filter(post => {
    const query = blogSearchQuery.toLowerCase().trim();
    if (!query) return true;
    
    const titleMatch = post.title?.toLowerCase().includes(query) || false;
    const keywordMatch = post.target_keywords?.toLowerCase().includes(query) || false;
    const productNameMatch = post.product?.name?.toLowerCase().includes(query) || false;
    
    return titleMatch || keywordMatch || productNameMatch;
  });

  // 네이버 블로그 포스팅 페이지네이션 슬라이싱
  const totalBlogPages = Math.ceil(filteredPosts.length / blogItemsPerPage);
  const paginatedPosts = filteredPosts.slice(
    (blogCurrentPage - 1) * blogItemsPerPage,
    blogCurrentPage * blogItemsPerPage
  );

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // AI 생성 폼 상태
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [targetKeywords, setTargetKeywords] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiTone, setAiTone] = useState('정보제공형');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState('');
  const [generatedSubImageUrl, setGeneratedSubImageUrl] = useState('');

  // 2-Way 이미지 셀렉터 탭 (대표 이미지 + 서브 본문 이미지)
  const [imageTab, setImageTab] = useState<'product' | 'ai'>('product');

  // 예약 설정
  const [scheduleDate, setScheduleDate] = useState(
    new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [scheduleTime, setScheduleTime] = useState('10:00');

  // 계정 연결 상태 및 하이브리드 연동 관련 상태 변수
  const [naverBlogIdInput, setNaverBlogIdInput] = useState('');
  const [apiClientIdInput, setApiClientIdInput] = useState('');
  const [apiClientSecretInput, setApiClientSecretInput] = useState('');
  const [isAccountConnected, setIsAccountConnected] = useState(false);
  const [hasSession, setHasSession] = useState(false); // RPA 로그인 세션 보유 여부
  const [activeModeTab, setActiveModeTab] = useState<'rpa' | 'api'>('rpa'); // RPA vs API 탭 모드
  const [isRpaLaunching, setIsRpaLaunching] = useState(false); // RPA 로그인 창 로딩 상태
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false); // RPA 설치 가이드 모달 상태
  const [isDaemonInfoOpen, setIsDaemonInfoOpen] = useState(false); // 데몬 상세 정보 모달 상태
  const [copiedText, setCopiedText] = useState<string | null>(null); // 복사된 텍스트 상태 추적용

  // 예약/발행 목록 중 선택된 미리보기 포스트 상태
  const [selectedPostForPreview, setSelectedPostForPreview] = useState<NaverPost | null>(null);

  // 상품 검색 필터링 상태
  const [productSearchQuery, setProductSearchQuery] = useState('');

  // 알림/피드백 메시지
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');

  // AI Keyword Lab 상태
  const [activePersona, setActivePersona] = useState<'family' | 'single' | 'pet' | 'office'>('family');
  const [generatedKeywords, setGeneratedKeywords] = useState<{
    specKeywords: KeywordItem[];
    familyKeywords: KeywordItem[];
    singleKeywords: KeywordItem[];
    petKeywords: KeywordItem[];
    officeKeywords: KeywordItem[];
  }>({
    specKeywords: [],
    familyKeywords: [],
    singleKeywords: [],
    petKeywords: [],
    officeKeywords: []
  });

  // 애니메이션용 마그네틱 이펙트 상태
  const [flyingKeyword, setFlyingKeyword] = useState<{ text: string; x: number; y: number } | null>(null);
  const [isGeneratingKeywords, setIsGeneratingKeywords] = useState(false);
  const keywordInputRef = useRef<HTMLInputElement>(null);

  // 실시간 시스템 시간 상태
  const [systemTime, setSystemTime] = useState('');

  // 초기 로딩
  useEffect(() => {
    fetchSettings();
    fetchPosts();
    fetchProducts();
    
    // 실시간 시스템 시간 설정
    const updateTime = () => {
      const now = new Date();
      const timeStr = now.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }) + ' ' + 
                     now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
      setSystemTime(timeStr);
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // 선택된 상품이 변경될 때마다 자동 속성 매핑 키워드 AI 가동
  useEffect(() => {
    if (selectedProduct) {
      generateKeywordsWithAI(selectedProduct);
    }
  }, [selectedProduct]);

  // 토스트 팝업 띄우기
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // 통계 연동 변수 계산
  const isConnected = isAccountConnected;
  const displayAccountStatus = isConnected ? '연동 완료 🟢' : '미연동 🔴';
  const accountSubtext = isConnected 
    ? `${activeModeTab === 'api' ? '공식 API' : 'RPA 자동화'}로 안전하게 연동 중`
    : '네이버 계정을 연결하고 오토파일럿을 활성화하세요';

  const totalCount = posts.length;
  const uploadedCount = posts.filter(p => p.status === 'POSTED').length;
  const uploadSubtext = totalCount > 0
    ? `전체 예약 및 발행 목록 ${totalCount}개 중 ${uploadedCount}개 발행 완료`
    : '예약된 포스팅이 없습니다';

  const postedPosts = posts.filter(p => p.status === 'POSTED');
  const avgViews = postedPosts.length > 0
    ? Math.round(postedPosts.reduce((acc, p) => acc + (p.views_count || 0), 0) / postedPosts.length)
    : 0;
  const viewsSubtext = postedPosts.length > 0
    ? `최근 발행된 포스팅 ${postedPosts.length}개 기준 실시간 조회 분석`
    : '발행된 글이 없어 조회수 집계 전입니다';

  const failedCount = posts.filter(p => p.status === 'FAILED').length;
  const totalProcessed = uploadedCount + failedCount;
  const successRate = totalProcessed > 0
    ? Math.round((uploadedCount / totalProcessed) * 100)
    : 100;
  const successSubtext = failedCount > 0
    ? `발행 실패 ${failedCount}건 감지 - RPA 세션 동기화 상태를 점검해주세요`
    : '시스템 무결성 100% 정상 작동 중';

  // 실시간 뷰어 목업에 표시할 정보 큐레이팅
  const viewTitle = selectedPostForPreview ? selectedPostForPreview.title : (postTitle || '여기에 포스트 제목이 노출됩니다.');
  const viewContent = selectedPostForPreview ? selectedPostForPreview.content : (postContent || '좌측 상품을 클릭하고 AI 원고 빌더를 실행하거나 수동으로 매력적인 SEO 포스팅 본문을 집필해 주세요. 실시간 네이버 모바일 블로그 뷰어 스킨에 맞춰 마크다운과 이모지가 완벽 렌더링됩니다.');
  const viewKeywords = selectedPostForPreview ? selectedPostForPreview.target_keywords : targetKeywords;
  
  let viewMainImage = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80';
  let viewSubImage = 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&auto=format&fit=crop&q=80';

  if (selectedPostForPreview) {
    viewMainImage = selectedPostForPreview.image_url;
    viewSubImage = selectedPostForPreview.sub_image_url || viewSubImage;
  } else {
    if (imageTab === 'product' && selectedProduct?.main_image_url) {
      viewMainImage = selectedProduct.main_image_url;
    } else if (imageTab === 'ai' && generatedImageUrl) {
      viewMainImage = generatedImageUrl;
      viewSubImage = generatedSubImageUrl || viewSubImage;
    }
  }

  // API 데이터 페칭
  const fetchSettings = async () => {
    try {
      const res = await apiFetch('/api/naver-blog/settings');
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings(data.settings);
        setHasSession(data.has_session === 1);
        
        if (data.settings.naver_blog_id) {
          setNaverBlogIdInput(data.settings.naver_blog_id);
          
          if (data.settings.api_client_id && data.settings.api_client_secret) {
            setActiveModeTab('api');
            setIsAccountConnected(true);
          } else {
            setActiveModeTab('rpa');
            setIsAccountConnected(data.has_session === 1);
          }
          
          setApiClientIdInput(data.settings.api_client_id || '');
          setApiClientSecretInput(data.settings.api_client_secret || '');
        } else {
          setActiveModeTab('rpa');
          setIsAccountConnected(false);
        }
      }
    } catch (err) {
      console.error('네이버 블로그 설정 로딩 에러:', err);
    }
  };

  const fetchPosts = async () => {
    try {
      const res = await apiFetch('/api/naver-blog/posts');
      const data = await res.json();
      if (data.success && data.posts) {
        setPosts(data.posts);
      }
    } catch (err) {
      console.error('게시물 목록 로딩 에러:', err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await apiFetch('/api/products');
      const data = await res.json();
      if (data.success && data.products) {
        setProducts(data.products);
        if (data.products.length > 0) {
          setSelectedProduct(data.products[0]);
        }
      }
    } catch (err) {
      console.error('상품 로딩 에러:', err);
    }
  };

  // 상품 기반 AI 키워드 실시간 자동 생성
  const generateKeywordsWithAI = async (product: Product) => {
    setIsGeneratingKeywords(true);
    try {
      const res = await apiFetch('/api/naver-blog/generate-keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: product.name,
          brand: product.brand,
          description: product.description
        })
      });
      const data = await res.json();
      if (data.success && data.keywords) {
        setGeneratedKeywords(data.keywords);
      } else {
        throw new Error(data.error || '키워드 생성에 실패했습니다.');
      }
    } catch (err: any) {
      console.error('AI 키워드 추출 에러:', err);
      showToast(`AI 키워드 추출 실패: ${err.message || '서버 오류'}`, 'error');
    } finally {
      setIsGeneratingKeywords(false);
    }
  };

  // 마그네틱 원클릭 주입 시스템 구현
  const handleKeywordInject = (keyword: string, event: React.MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    
    setFlyingKeyword({
      text: keyword,
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    });

    setTimeout(() => {
      setFlyingKeyword(null);
      
      const existing = targetKeywords.split(',').map(k => k.trim()).filter(Boolean);
      if (!existing.includes(keyword)) {
        const updated = [...existing, keyword].join(', ');
        setTargetKeywords(updated);
        showToast(`'${keyword}' 키워드가 타겟 필드에 자석처럼 쏙 주입되었습니다! 🟢`, 'success');
      } else {
        showToast(`'${keyword}'는 이미 타겟 키워드에 주입되어 있습니다.`, 'info');
      }
    }, 700);
  };

  // 설정 저장
  const saveSettings = async (updatedSettings: Partial<AutopilotSettings>) => {
    try {
      const newSettings = { ...settings, ...updatedSettings };
      const res = await apiFetch('/api/naver-blog/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
        setHasSession(data.has_session === 1);
        return data;
      } else {
        showToast('설정 저장 실패: ' + data.error, 'error');
        return null;
      }
    } catch (err: any) {
      showToast('설정 저장 중 오류: ' + err.message, 'error');
      return null;
    }
  };

  // RPA 관련 제어 함수
  const handleTriggerRpaLogin = async () => {
    setIsRpaLaunching(true);
    showToast('로컬 PC에 네이버 로그인 인증 브라우저를 기동합니다. 최초 1회 로그인을 마쳐주세요...', 'info');
    try {
      const res = await apiFetch('/api/naver-blog/settings?action=trigger_session');
      const data = await res.json();
      if (data.success) {
        showToast(data.message, 'success');
      } else {
        showToast('RPA 브라우저 기동 실패: ' + data.error, 'error');
      }
    } catch (err: any) {
      showToast('RPA 브라우저 구동 중 오류: ' + err.message, 'error');
    } finally {
      setIsRpaLaunching(false);
    }
  };

  const handleSyncRpaSession = async () => {
    showToast('RPA 자동화 로그인 세션 유효성을 체크하는 중입니다...', 'info');
    try {
      const res = await apiFetch('/api/naver-blog/settings');
      const data = await res.json();
      if (data.success) {
        setHasSession(data.has_session === 1);
        if (data.has_session === 1) {
          setIsAccountConnected(true);
          showToast('RPA 인증 세션(naver_session.json)이 성공적으로 동기화되어 연결되었습니다! 🟢', 'success');
        } else {
          showToast('아직 생성된 로그인 세션(쿠키)이 감지되지 않았습니다. 최초 로그인을 완료한 후 동기화해주세요. 🔴', 'error');
        }
      }
    } catch (err: any) {
      showToast('세션 동기화 중 오류: ' + err.message, 'error');
    }
  };

  const handleClearRpaSession = async () => {
    if (!confirm('RPA 자동화 세션을 정말로 파기하시겠습니까? 파기 후에는 포스팅 자동 발행이 불가합니다.')) return;
    try {
      const res = await apiFetch('/api/naver-blog/settings?action=clear_session');
      const data = await res.json();
      if (data.success) {
        setHasSession(false);
        setIsAccountConnected(false);
        showToast('RPA 인증 세션(쿠키)이 안전하게 폐기되었습니다. 🔴', 'info');
      }
    } catch (err: any) {
      showToast('세션 파기 중 오류: ' + err.message, 'error');
    }
  };

  // 클립보드 복사 헬퍼 함수
  const handleCopyToClipboard = (text: string, label: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => {
          setCopiedText(text);
          showToast(`'${label}' 명령어가 클립보드에 성공적으로 복사되었습니다! 📋`, 'success');
          setTimeout(() => setCopiedText(null), 2000);
        })
        .catch((err) => {
          showToast('복사 실패: ' + err.message, 'error');
        });
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        setCopiedText(text);
        showToast(`'${label}' 명령어가 클립보드에 성공적으로 복사되었습니다! 📋`, 'success');
        setTimeout(() => setCopiedText(null), 2000);
      } catch (err: any) {
        showToast('복사 실패: ' + err.message, 'error');
      }
      document.body.removeChild(textarea);
    }
  };

  // 계정 연동 제출 (API 전용 또는 블로그 ID 저장)
  const handleConnectAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!naverBlogIdInput) {
      showToast('네이버 블로그 ID를 입력해주세요.', 'error');
      return;
    }
    
    if (activeModeTab === 'api') {
      if (!apiClientIdInput || !apiClientSecretInput) {
        showToast('공식 API 연동을 위해 Client ID와 Secret을 모두 입력해 주세요.', 'error');
        return;
      }
      const data = await saveSettings({
        naver_blog_id: naverBlogIdInput,
        api_client_id: apiClientIdInput,
        api_client_secret: apiClientSecretInput
      });
      if (data && data.success) {
        setIsAccountConnected(true);
        showToast(`N블로그 @${naverBlogIdInput} 공식 API 연동이 안전하게 완료되었습니다! 🟢`, 'success');
      }
    } else {
      const data = await saveSettings({
        naver_blog_id: naverBlogIdInput,
        api_client_id: '',
        api_client_secret: ''
      });
      if (data && data.success) {
        setIsAccountConnected(data.has_session === 1);
        showToast(`RPA 블로그 아이디(@${naverBlogIdInput}) 설정이 저장되었습니다.`, 'success');
      }
    }
  };

  const handleDisconnectAccount = async () => {
    if (activeModeTab === 'rpa') {
      await handleClearRpaSession();
      await saveSettings({
        naver_blog_id: '',
        api_client_id: '',
        api_client_secret: ''
      });
      setNaverBlogIdInput('');
    } else {
      await saveSettings({
        naver_blog_id: '',
        api_client_id: '',
        api_client_secret: ''
      });
      setIsAccountConnected(false);
      setNaverBlogIdInput('');
      setApiClientIdInput('');
      setApiClientSecretInput('');
      showToast('공식 API 연동 계정이 정상적으로 해제되었습니다.', 'info');
    }
  };

  // AI 블로그 장문 원고 빌더 API 구동
  const handleGenerateAI = async () => {
    setSelectedPostForPreview(null); // 신규 포스팅 작성 모드로 강제 리셋
    setIsGenerating(true);
    showToast('AI가 고품질 블로그 장문 원고를 집필 중입니다. 잠시만 기다려주세요...', 'info');
    try {
      const res = await apiFetch('/api/naver-blog/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: selectedProduct?.id || null,
          prompt: aiPrompt,
          tone_style: aiTone,
          target_keywords: targetKeywords,
          generate_image: true
        })
      });
      const data = await res.json();
      if (data.success) {
        setPostTitle(data.title);
        setPostContent(data.content);
        setGeneratedImageUrl(data.image_url);
        setGeneratedSubImageUrl(data.sub_image_url);
        showToast('네이버 블로그 맞춤 SEO 제목과 800자 이상 본문 원고가 완성되었습니다! ✨', 'success');
        setImageTab('ai');
      } else {
        showToast('AI 생성 실패: ' + data.error, 'error');
      }
    } catch (err: any) {
      showToast('AI 생성 중 오류: ' + err.message, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // 오토파일럿 데몬 즉시 실행 트리거
  const handleTriggerAutopilot = async () => {
    showToast('네이버 블로그 오토파일럿 AI 마케터를 즉시 기동합니다...', 'info');
    try {
      const res = await apiFetch('/api/naver-blog/scheduler');
      const data = await res.json();
      if (data.success) {
        if (data.triggered) {
          showToast(data.message, 'success');
          fetchPosts(); // 예약 목록 갱신
        } else {
          showToast(data.message, 'info');
        }
      } else {
        showToast('오토파일럿 구동 실패: ' + data.error, 'error');
      }
    } catch (err: any) {
      showToast('오토파일럿 구동 중 오류: ' + err.message, 'error');
    }
  };

  // 포스팅 등록 (예약 또는 즉시 발행)
  const handleSavePost = async (isImmediate = false) => {
    let finalImageUrl = '';
    let finalSubImageUrl = '';

    if (imageTab === 'product') {
      if (!selectedProduct?.main_image_url) {
        showToast('선택된 상품에 메인 이미지가 없습니다.', 'error');
        return;
      }
      finalImageUrl = selectedProduct.main_image_url;
      finalSubImageUrl = 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&auto=format&fit=crop&q=80';
    } else {
      if (!generatedImageUrl) {
        showToast('생성된 AI 본문 이미지가 없습니다.', 'error');
        return;
      }
      finalImageUrl = generatedImageUrl;
      finalSubImageUrl = generatedSubImageUrl;
    }

    if (!postTitle || !postContent) {
      showToast('블로그 제목과 본문 내용을 먼저 완성해주세요.', 'error');
      return;
    }

    const targetStatus = isImmediate ? 'POSTED' : 'SCHEDULED';
    const targetScheduledAt = isImmediate 
      ? new Date().toISOString() 
      : new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString();

    try {
      const res = await apiFetch('/api/naver-blog/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: selectedProduct?.id || null,
          status: targetStatus,
          title: postTitle,
          content: postContent,
          target_keywords: targetKeywords,
          image_url: finalImageUrl,
          sub_image_url: finalSubImageUrl,
          scheduled_at: targetScheduledAt
        })
      });

      const data = await res.json();
      if (data.success) {
        showToast(
          isImmediate 
            ? '포스팅이 네이버 블로그에 가상 발행되었습니다! 🎉' 
            : '포스팅이 스케줄 타임라인에 안전하게 예약 등록되었습니다.', 
          'success'
        );
        
        // 폼 리셋
        setPostTitle('');
        setPostContent('');
        setTargetKeywords('');
        setAiPrompt('');
        
        // 이력 다시 불러오기
        fetchPosts();
      } else {
        showToast('등록 실패: ' + data.error, 'error');
      }
    } catch (err: any) {
      showToast('등록 중 오류: ' + err.message, 'error');
    }
  };

  // 예약글 승인(즉시 발행)
  const handleApproveImmediate = async (postId: number) => {
    try {
      const res = await apiFetch('/api/naver-blog/posts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: postId,
          updates: { status: 'POSTED' }
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('블로그 예약 초안이 즉시 발행 승인되었습니다! 🎉', 'success');
        fetchPosts();
      } else {
        showToast('발행 승인 실패: ' + data.error, 'error');
      }
    } catch (err: any) {
      showToast('승인 오류: ' + err.message, 'error');
    }
  };

  // 포스트 삭제
  const handleDeletePost = async (postId: number) => {
    if (!confirm('해당 블로그 포스트를 삭제하시겠습니까?')) return;
    try {
      const res = await apiFetch(`/api/naver-blog/posts?id=${postId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        showToast('포스팅이 이력에서 정상적으로 삭제되었습니다.', 'info');
        if (selectedPostForPreview?.id === postId) {
          setSelectedPostForPreview(null);
        }
        fetchPosts();
      } else {
        showToast('삭제 실패: ' + data.error, 'error');
      }
    } catch (err: any) {
      showToast('삭제 오류: ' + err.message, 'error');
    }
  };

  return (
    <div className="space-y-6 pb-20 w-full min-w-0 text-slate-800" data-easybot-hint="N-BLOG 포스팅 AI: 네이버 블로그 포스팅에 적합한 인기 키워드 도출 및 포스팅 초안 작성을 수행합니다.">

      {/* 4. 마그네틱 원클릭 주입용 비행 플라잉 키워드 노출 */}
      <AnimatePresence>
        {flyingKeyword && (
          <motion.div
            initial={{ 
              position: 'fixed', 
              left: flyingKeyword.x, 
              top: flyingKeyword.y, 
              scale: 1, 
              opacity: 0.95,
              zIndex: 9999
            }}
            animate={{ 
              left: keywordInputRef.current ? keywordInputRef.current.getBoundingClientRect().left + 15 : 100, 
              top: keywordInputRef.current ? keywordInputRef.current.getBoundingClientRect().top + 15 : 200, 
              scale: 0.6, 
              opacity: 0.1,
              rotate: 360
             }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
            className="px-3.5 py-2 rounded-full text-xs font-bold bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white shadow-[0_10px_25px_rgba(16,185,129,0.3)] border border-emerald-300 pointer-events-none flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 animate-spin" />
            {flyingKeyword.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 헤더 영역 */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-200/80 pb-6 mb-8 relative z-10">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center">
            <NaverIcon className="w-8 h-8 text-emerald-600 mr-3" />
            N-BLOG 포스팅 AI
          </h1>
        </div>

        {/* 시스템 시간 표시 */}
        <div className="mt-4 md:mt-0 flex items-center gap-3">
          <span className="text-xs text-slate-600 font-semibold bg-white/80 backdrop-blur-xl border border-slate-200/50 px-3 py-2 rounded-xl shadow-xs">
            현재 시스템 시간: {systemTime || '12:00 PM'}
          </span>
        </div>
      </div>

      {/* 1. 상단 통계 영역 (StatsGrid 서브 컴포넌트) */}
      <StatsGrid
        isConnected={isConnected}
        displayAccountStatus={displayAccountStatus}
        accountSubtext={accountSubtext}
        avgViews={avgViews}
        viewsSubtext={viewsSubtext}
        uploadedCount={uploadedCount}
        totalCount={totalCount}
        uploadSubtext={uploadSubtext}
        successRate={successRate}
        successSubtext={successSubtext}
      />

      {/* 메인 레이아웃: 대시보드 콘텐츠 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10 items-start">
        
        {/* 왼쪽 & 중간 영역 */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* 가상 컨텐츠 연동 알림창 */}
          {!isConnected && (
            <div className="p-5 rounded-2xl bg-amber-50/80 backdrop-blur-md border border-amber-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xs">
              <div className="flex items-start gap-3">
                <span className="text-amber-500 shrink-0 mt-0.5 text-lg">⚠️</span>
                <div>
                  <h4 className="text-sm font-bold text-amber-800">
                    {activeModeTab === 'api' 
                      ? '네이버 공식 API 미설정' 
                      : '네이버 RPA 자동 발행 세션(쿠키) 인증 필요'}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {activeModeTab === 'api' 
                      ? '현재 공식 API 키가 등록되지 않아 가상 모드로 작동 중입니다. 실제 발행을 위해 아래 설정 카드에서 API 키를 등록해주세요.' 
                      : 'RPA 자동 발행용 로그인 쿠키 세션이 존재하지 않습니다. 아래 계정 관리자에서 [최초 1회 로그인 브라우저 기동]을 실행하여 인증을 완료해주세요.'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {activeModeTab === 'rpa' && (
                  <button 
                    onClick={handleTriggerRpaLogin}
                    disabled={isRpaLaunching}
                    className="px-4 py-2 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    {isRpaLaunching ? '인증 브라우저 기동 중...' : 'RPA 로그인 기동 🚀'}
                  </button>
                )}
                <button 
                  onClick={() => {
                    const el = document.getElementById('account-connection-card');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
                >
                  계정 설정으로 이동
                </button>
              </div>
            </div>
          )}

          {/* 4대 독점 기술 쇼케이스 배너 */}
          <div className="p-6 lg:p-8 rounded-3xl bg-white/70 backdrop-blur-xl border border-slate-200/50 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50/20 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 mb-6 gap-4">
              <div>
                <h2 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-500" />
                  N-BLOG AI Keyword Lab 4대 독점 특장점
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. 상품 자동 속성 매핑 추천 */}
              <div 
                onClick={() => {
                  const el = document.getElementById('ai-keyword-lab-section');
                  el?.scrollIntoView({ behavior: 'smooth' });
                  showToast("1. 상품 자동 속성 매핑 추천 영역으로 이동했습니다! 📊", "info");
                }}
                className="p-5 rounded-2xl bg-white/95 border border-slate-200/60 hover:border-emerald-500/50 transition-all hover:bg-emerald-50/10 cursor-pointer group flex flex-col justify-between h-full relative hover:shadow-md hover:-translate-y-0.5 duration-300"
              >
                <div className="space-y-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform">
                    📊
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-800 flex flex-col gap-0.5">
                      <span>1. 자동 속성 매핑</span>
                      <span className="text-[9px] w-fit px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 font-semibold">Spec-to-Keyword</span>
                    </h4>
                    <p className="text-[11px] text-slate-550 leading-relaxed font-medium">
                      상품 클릭 즉시 브랜드, 스펙 명세, 가격대 속성을 스스로 분석해 대표 연관 키워드를 자동 도출합니다.
                    </p>
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-3 mt-4 flex items-center justify-between font-semibold">
                  <span>LG 에어컨 ➔ #여름가전</span>
                  <span className="text-emerald-600 group-hover:translate-x-1 transition-transform">이동 ➔</span>
                </div>
              </div>

              {/* 2. 신호등 경쟁 강도 시뮬레이션 */}
              <div 
                onClick={() => {
                  const el = document.getElementById('ai-keyword-lab-section');
                  el?.scrollIntoView({ behavior: 'smooth' });
                  showToast("2. 경쟁 강도 시뮬레이션 영역으로 이동했습니다! 🚦", "info");
                }}
                className="p-5 rounded-2xl bg-white/95 border border-slate-200/60 hover:border-emerald-500/50 transition-all hover:bg-emerald-50/10 cursor-pointer group flex flex-col justify-between h-full hover:shadow-md hover:-translate-y-0.5 duration-300"
              >
                <div className="space-y-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform">
                    🚦
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-800 flex flex-col gap-0.5">
                      <span>2. 경쟁 강도 매칭</span>
                      <span className="text-[9px] w-fit px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 font-semibold">Traffic Lights</span>
                    </h4>
                    <p className="text-[11px] text-slate-550 leading-relaxed font-medium">
                      추천 키워드마다 🔴치열, 🟡보통, 🟢초강추 신호등 배지를 부여하여 노출 유력 키워드를 직관적으로 선별합니다.
                    </p>
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-3 mt-4 flex items-center justify-between font-semibold">
                  <span>초록색 배지(🟢) 공략!</span>
                  <span className="text-amber-600 group-hover:translate-x-1 transition-transform">이동 ➔</span>
                </div>
              </div>

              {/* 3. 핵심 구매 페르소나별 분할 제안 */}
              <div 
                onClick={() => {
                  const el = document.getElementById('ai-keyword-lab-section');
                  el?.scrollIntoView({ behavior: 'smooth' });
                  showToast("3. 핵심 구매 페르소나별 키워드 분할 제안 영역으로 이동했습니다! 👥", "info");
                }}
                className="p-5 rounded-2xl bg-white/95 border border-slate-200/60 hover:border-emerald-500/50 transition-all hover:bg-emerald-50/10 cursor-pointer group flex flex-col justify-between h-full hover:shadow-md hover:-translate-y-0.5 duration-300"
              >
                <div className="space-y-3.5">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform">
                    👥
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-800 flex flex-col gap-0.5">
                      <span>3. 페르소나 분할 제안</span>
                      <span className="text-[9px] w-fit px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 font-semibold">Persona-Splitting</span>
                    </h4>
                    <p className="text-[11px] text-slate-550 leading-relaxed font-medium">
                      독자층을 🤱가정, 🧑‍💻1인, 🧹반려동물 등 라이프스타일별로 세분화하여 맞춤형 세부 공감 키워드를 제공합니다.
                    </p>
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-3 mt-4 flex items-center justify-between font-semibold">
                  <span>맞춤형 세부 필터링 제공</span>
                  <span className="text-purple-600 group-hover:translate-x-1 transition-transform">이동 ➔</span>
                </div>
              </div>

              {/* 4. 마그네틱 원클릭 주입 시스템 */}
              <div 
                onClick={() => {
                  const el = document.getElementById('ai-keyword-lab-section');
                  el?.scrollIntoView({ behavior: 'smooth' });
                  showToast("4. 마그네틱 원클릭 주입 시스템 영역으로 이동했습니다! ⚡", "info");
                }}
                className="p-5 rounded-2xl bg-white/95 border border-slate-200/60 hover:border-emerald-500/50 transition-all hover:bg-emerald-50/10 cursor-pointer group flex flex-col justify-between h-full hover:shadow-md hover:-translate-y-0.5 duration-300"
              >
                <div className="space-y-3.5">
                  <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform">
                    ⚡
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-800 flex flex-col gap-0.5">
                      <span>4. 마그네틱 원클릭 주입</span>
                      <span className="text-[9px] w-fit px-1.5 py-0.5 rounded bg-sky-50 text-sky-600 font-semibold">One-Click Inject</span>
                    </h4>
                    <p className="text-[11px] text-slate-550 leading-relaxed font-medium">
                      AI 키워드 카드를 클릭만 하면 좌측 타겟 키워드 인풋으로 자석처럼 쏙 날아가는 마이크로 모션을 제공합니다.
                    </p>
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-3 mt-4 flex items-center justify-between font-semibold">
                  <span>원클릭 콤마 자동 구분</span>
                  <span className="text-sky-600 group-hover:translate-x-1 transition-transform">이동 ➔</span>
                </div>
              </div>
            </div>
          </div>

          {/* 계정 관리 카드 (AccountManager 서브 컴포넌트) */}
          <AccountManager
            settings={settings}
            hasSession={hasSession}
            activeModeTab={activeModeTab}
            setActiveModeTab={setActiveModeTab}
            isRpaLaunching={isRpaLaunching}
            naverBlogIdInput={naverBlogIdInput}
            setNaverBlogIdInput={setNaverBlogIdInput}
            apiClientIdInput={apiClientIdInput}
            setApiClientIdInput={setApiClientIdInput}
            apiClientSecretInput={apiClientSecretInput}
            setApiClientSecretInput={setApiClientSecretInput}
            handleTriggerRpaLogin={handleTriggerRpaLogin}
            handleSyncRpaSession={handleSyncRpaSession}
            handleConnectAccount={handleConnectAccount}
            handleDisconnectAccount={handleDisconnectAccount}
            handleTriggerAutopilot={handleTriggerAutopilot}
            saveSettings={saveSettings}
            setIsGuideModalOpen={setIsGuideModalOpen}
            setIsDaemonInfoOpen={setIsDaemonInfoOpen}
          />

          {/* 1단계: 상품선택 카드 (ProductSelector 서브 컴포넌트) */}
          <ProductSelector
            products={products}
            selectedProduct={selectedProduct}
            setSelectedProduct={setSelectedProduct}
            productSearchQuery={productSearchQuery}
            setProductSearchQuery={setProductSearchQuery}
            setSelectedPostForPreview={setSelectedPostForPreview}
          />

          {/* 2단계: AI Keyword Lab (KeywordLab 서브 컴포넌트) */}
          <KeywordLab
            selectedProduct={selectedProduct}
            activePersona={activePersona}
            setActivePersona={setActivePersona}
            generatedKeywords={generatedKeywords}
            isGeneratingKeywords={isGeneratingKeywords}
            handleKeywordInject={handleKeywordInject}
          />

          {/* 2단계: 네이버 블로그 포스팅 원고 빌더 (PostBuilder 서브 컴포넌트) */}
          <PostBuilder
            selectedProduct={selectedProduct}
            aiTone={aiTone}
            setAiTone={setAiTone}
            imageTab={imageTab}
            setImageTab={setImageTab}
            aiPrompt={aiPrompt}
            setAiPrompt={setAiPrompt}
            isGenerating={isGenerating}
            handleGenerateAI={handleGenerateAI}
            targetKeywords={targetKeywords}
            setTargetKeywords={setTargetKeywords}
            postTitle={postTitle}
            setPostTitle={setPostTitle}
            postContent={postContent}
            setPostContent={setPostContent}
            scheduleDate={scheduleDate}
            setScheduleDate={setScheduleDate}
            scheduleTime={scheduleTime}
            setScheduleTime={setScheduleTime}
            handleSavePost={handleSavePost}
            keywordInputRef={keywordInputRef}
          />

        </div>

        {/* 우측 네이버 모바일 블로그 뷰어 목업 영역 (MobilePreview 서브 컴포넌트) */}
        <MobilePreview
          naverBlogIdInput={naverBlogIdInput}
          viewTitle={viewTitle}
          viewContent={viewContent}
          viewKeywords={viewKeywords}
          viewMainImage={viewMainImage}
          viewSubImage={viewSubImage}
          systemTime={systemTime}
          selectedPostForPreview={selectedPostForPreview}
        />

      </div>

      {/* 3단계: 예약 및 발행 타임라인 이력 관리 (TimelineTimeline 서브 컴포넌트) */}
      <TimelineTimeline
        posts={posts}
        paginatedPosts={paginatedPosts}
        selectedPostForPreview={selectedPostForPreview}
        setSelectedPostForPreview={setSelectedPostForPreview}
        blogSearchQuery={blogSearchQuery}
        setBlogSearchQuery={setBlogSearchQuery}
        blogItemsPerPage={blogItemsPerPage}
        setBlogItemsPerPage={setBlogItemsPerPage}
        blogCurrentPage={blogCurrentPage}
        setBlogCurrentPage={setBlogCurrentPage}
        totalBlogPages={totalBlogPages}
        filteredPosts={filteredPosts}
        fetchPosts={fetchPosts}
        handleApproveImmediate={handleApproveImmediate}
        handleDeletePost={handleDeletePost}
      />

      {/* RPA 최초 준비 및 오토파일럿 데몬 정보 모달들 (GuideModals 서브 컴포넌트) */}
      <GuideModals
        isGuideModalOpen={isGuideModalOpen}
        setIsGuideModalOpen={setIsGuideModalOpen}
        isDaemonInfoOpen={isDaemonInfoOpen}
        setIsDaemonInfoOpen={setIsDaemonInfoOpen}
        hasSession={hasSession}
        copiedText={copiedText}
        handleCopyToClipboard={handleCopyToClipboard}
      />

      {/* 토스트 메세지 공용 알림 바 */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed bottom-8 left-8 z-[999999] px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 border text-xs font-black ${
              toastType === 'success'
                ? 'bg-emerald-500 border-emerald-400 text-white shadow-emerald-500/20'
                : toastType === 'error'
                ? 'bg-rose-500 border-rose-400 text-white shadow-rose-500/20'
                : 'bg-slate-900 border-slate-800 text-white shadow-slate-900/20'
            }`}
          >
            <span>
              {toastType === 'success' ? '✨' : toastType === 'error' ? '⚠️' : '💡'}
            </span>
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
