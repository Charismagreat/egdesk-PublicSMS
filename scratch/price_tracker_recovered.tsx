'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Settings, Calendar, Heart, MessageCircle, 
  Layers, Image as ImageIcon, Send, Sliders, ToggleLeft, ToggleRight,
  TrendingUp, Users, CheckCircle, RefreshCw, Upload, Eye, FileText,
  AlertTriangle, Check, BookOpen, AlertCircle, ShoppingBag, Search, Plus, Trash2, Globe,
  X, Copy, Terminal, ChevronRight, Info
} from 'lucide-react';

// 而ㅼ뒪? ?ㅼ씠踰??꾩씠肄?SVG 而댄룷?뚰듃
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

interface Product {
  id: string;
  name: string;
  price: string;
  main_image_url: string;
  url: string;
  description?: string;
  brand?: string;
  specs?: string;
}

interface NaverPost {
  id: number;
  product_id: string | null;
  status: 'DRAFT' | 'SCHEDULED' | 'POSTED' | 'FAILED';
  title: string;
  content: string;
  target_keywords: string;
  image_url: string;
  sub_image_url: string;
  scheduled_at: string;
  posted_at: string | null;
  error_message: string | null;
  views_count: number;
  likes_count: number;
  product?: Product | null;
}

interface AutopilotSettings {
  id: number;
  is_autopilot: number;
  autopilot_interval: string;
  autopilot_time: string;
  tone_style: string;
  naver_blog_id: string;
  api_client_id: string;
  api_client_secret: string;
}

// ?섎Ⅴ?뚮굹蹂??ㅼ썙???뺣낫 ?명꽣?섏씠??interface KeywordItem {
  keyword: string;
  competition: 'LOW' | 'MEDIUM' | 'HIGH'; // ?윟, ?윞, ?뵶
  volume: string;
  reason: string;
}

export default function NaverBlogMarketingPortal() {
  // ?곹깭 蹂??  const [settings, setSettings] = useState<AutopilotSettings>({
    id: 1,
    is_autopilot: 0,
    autopilot_interval: 'DAILY',
    autopilot_time: '10:00',
    tone_style: '?뺣낫?쒓났??,
    naver_blog_id: '',
    api_client_id: '',
    api_client_secret: ''
  });

  const [posts, setPosts] = useState<NaverPost[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // AI ?앹꽦 ???곹깭
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [targetKeywords, setTargetKeywords] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiTone, setAiTone] = useState('?뺣낫?쒓났??);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState('');
  const [generatedSubImageUrl, setGeneratedSubImageUrl] = useState('');

  // 2-Way ?대?吏 ??됲꽣 ??(????대?吏 + ?쒕툕 蹂몃Ц ?대?吏)
  const [imageTab, setImageTab] = useState<'product' | 'ai'>('product');

  // ?덉빟 ?ㅼ젙
  const [scheduleDate, setScheduleDate] = useState(
    new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [scheduleTime, setScheduleTime] = useState('10:00');

  // 怨꾩젙 ?곌껐 ?곹깭 諛??섏씠釉뚮━???곕룞 愿???곹깭 蹂??  const [naverBlogIdInput, setNaverBlogIdInput] = useState('');
  const [apiClientIdInput, setApiClientIdInput] = useState('');
  const [apiClientSecretInput, setApiClientSecretInput] = useState('');
  const [isAccountConnected, setIsAccountConnected] = useState(false);
  const [hasSession, setHasSession] = useState(false); // RPA 濡쒓렇???몄뀡 蹂댁쑀 ?щ?
  const [activeModeTab, setActiveModeTab] = useState<'rpa' | 'api'>('rpa'); // RPA vs API ??紐⑤뱶
  const [isRpaLaunching, setIsRpaLaunching] = useState(false); // RPA 濡쒓렇??李?濡쒕뵫 ?곹깭
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false); // RPA ?ㅼ튂 媛?대뱶 紐⑤떖 ?곹깭
  const [isDaemonInfoOpen, setIsDaemonInfoOpen] = useState(false); // ?곕が ?곸꽭 ?뺣낫 紐⑤떖 ?곹깭
  const [copiedText, setCopiedText] = useState<string | null>(null); // 蹂듭궗???띿뒪???곹깭 異붿쟻??
  // ?덉빟/諛쒗뻾 紐⑸줉 以??좏깮??誘몃━蹂닿린 ?ъ뒪???곹깭
  const [selectedPostForPreview, setSelectedPostForPreview] = useState<NaverPost | null>(null);

  // ?곹뭹 寃???꾪꽣留??곹깭
  const [productSearchQuery, setProductSearchQuery] = useState('');

  // ?뚮┝/?쇰뱶諛?硫붿떆吏
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');

  // AI Keyword Lab ?곹깭
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

  // ?좊땲硫붿씠?섏슜 留덇렇?ㅽ떛 ?댄럺???곹깭
  const [flyingKeyword, setFlyingKeyword] = useState<{ text: string; x: number; y: number } | null>(null);
  const keywordInputRef = useRef<HTMLInputElement>(null);

  // ?ㅼ떆媛??쒖뒪???쒓컙 ?곹깭
  const [systemTime, setSystemTime] = useState('');

  // 珥덇린 濡쒕뵫
  useEffect(() => {
    fetchSettings();
    fetchPosts();
    fetchProducts();
    
    // ?ㅼ떆媛??쒖뒪???쒓컙 ?ㅼ젙
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

  // ?좏깮???곹뭹??蹂寃쎈맆 ?뚮쭏???먮룞 ?띿꽦 留ㅽ븨 ?ㅼ썙???쒕??덉씠??媛??  useEffect(() => {
    if (selectedProduct) {
      simulateSpecToKeywords(selectedProduct);
    }
  }, [selectedProduct]);

  // ?좎뒪???앹뾽 ?꾩슦湲?  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // API ?곗씠???섏묶
  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/naver-blog/settings');
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings(data.settings);
        setHasSession(data.has_session === 1);
        
        if (data.settings.naver_blog_id) {
          setNaverBlogIdInput(data.settings.naver_blog_id);
          
          // 湲곗〈??API Key媛 ?대? ?ㅼ젙?섏뼱 ?덈뒗 怨꾩젙??寃쎌슦 ?ㅻ쭏?명븯寃?API 紐⑤뱶 ??쓣 癒쇱? ?꾩썙以띾땲??
          if (data.settings.api_client_id && data.settings.api_client_secret) {
            setActiveModeTab('api');
            setIsAccountConnected(true);
          } else {
            setActiveModeTab('rpa');
            // RPA??寃쎌슦 ?몄뀡 ?뚯씪??媛먯??섏뿀?????곌껐 ?꾨즺 ?곹깭濡?留ㅼ묶?⑸땲??
            setIsAccountConnected(data.has_session === 1);
          }
          
          setApiClientIdInput(data.settings.api_client_id || '');
          setApiClientSecretInput(data.settings.api_client_secret || '');
        } else {
          // ?깅줉??怨꾩젙???녿뒗 寃쎌슦 湲곕낯?곸쑝濡?RPA 紐⑤뱶濡??명똿?⑸땲??
          setActiveModeTab('rpa');
          setIsAccountConnected(false);
        }
      }
    } catch (err) {
      console.error('?ㅼ씠踰?釉붾줈洹??ㅼ젙 濡쒕뵫 ?먮윭:', err);
    }
  };

  const fetchPosts = async () => {
    try {
      const res = await fetch('/api/naver-blog/posts');
      const data = await res.json();
      if (data.success && data.posts) {
        setPosts(data.posts);
      }
    } catch (err) {
      console.error('寃뚯떆臾?紐⑸줉 濡쒕뵫 ?먮윭:', err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (data.success && data.products) {
        // ?꾩떆 ?띿꽦 ?곗씠??蹂닿컯 (釉뚮옖?? ?ㅽ럺 ?ъ뼇)
        const enrichedProducts = data.products.map((prod: any) => {
          let brand = '?먯껜釉뚮옖??;
          let specs = '媛?깅퉬 ?⑦궎吏';
          const name = prod.name.toLowerCase();

          if (name.includes('lg') || name.includes('?섏?')) {
            brand = 'LG ?꾩옄';
            specs = '?ㅻ쭏??????몃쾭??/ 2?깃툒 ?먮꼫吏 ?⑥쑉';
          } else if (name.includes('?쇱꽦') || name.includes('samsung')) {
            brand = '?쇱꽦?꾩옄';
            specs = '臾댄뭾 荑⑤쭅 ?⑤꼸 / 1?깃툒 珥덉젅??;
          } else if (name.includes('?ㅼ씠??)) {
            brand = 'Dyson';
            specs = '?붿???紐⑦꽣 V12 / ?ㅽ뙆 ?꾪꽣?덉씠??;
          } else if (name.includes('而ㅽ뵾') || name.includes('?먮몢')) {
            brand = '?먰떚?ㅽ뵾???덇?泥댄봽';
            specs = '?ㅽ럹?쒗떚 ?꾨씪鍮꾩뭅 / 誘몃뵒??濡쒖뒪??;
          } else if (name.includes('?붿옣??) || name.includes('?쇰?') || name.includes('?몃읆')) {
            brand = '?붾쭏 肄붿뒪硫뷀떛';
            specs = '蹂묓?異붿텧臾?84% ?⑥쑀 / ??먭레 鍮꾧굔 ?몄쬆';
          }

          return {
            ...prod,
            brand,
            specs
          };
        });

        setProducts(enrichedProducts);
        if (enrichedProducts.length > 0) {
          setSelectedProduct(enrichedProducts[0]);
        }
      }
    } catch (err) {
      console.error('?곹뭹 濡쒕뵫 ?먮윭:', err);
    }
  };

  // ?곹뭹 湲곕컲 AI ?ㅼ썙???쒕??덉씠???앹꽦 (4? 湲곕뒫??1, 2, 3踰?援ы쁽)
  const simulateSpecToKeywords = (product: Product) => {
    const brand = product.brand || '?먯껜?쒖옉';
    const name = product.name;
    const cleanName = name.replace(/\[.*?\]/g, '').trim();
    
    // 1. ?곹뭹 ?먮룞 ?띿꽦 留ㅽ븨 異붿쿇 (Spec-to-Keyword)
    const specKeywords: KeywordItem[] = [
      { keyword: `${brand} ${cleanName.split(' ')[0]}`, competition: 'HIGH', volume: '45,200', reason: '釉뚮옖?????硫붿씤 ?ㅼ썙?쒕줈 ?몃옒?쎌? ?щ굹 ?곸쐞沅?寃쎌웳 移섏뿴' },
      { keyword: `${cleanName.split(' ')[0]} 異붿쿇`, competition: 'MEDIUM', volume: '12,800', reason: '?ㅺ뎄留??꾪솚?⑥씠 留ㅼ슦 ?믪? ?듭떖 異붿쿇 ?멸렇癒쇳듃' },
      { keyword: `媛?깅퉬 ${cleanName.split(' ')[0]}`, competition: 'LOW', volume: '4,500', reason: '寃쎌웳瑜좎씠 洹밸룄濡???븘 ?좉퇋 ?ъ뒪???몄텧??留ㅼ슦 ?좊젰' },
      { keyword: `${cleanName.split(' ')[0]} ?깅뒫鍮꾧탳`, competition: 'MEDIUM', volume: '6,100', reason: '?ㅽ럺 鍮꾧탳湲??李얜뒗 ?뺣낫 ?먯깋???몃옒???띾?' },
    ];

    // 3. ?듭떖 援щℓ ?섎Ⅴ?뚮굹蹂?遺꾪븷 ?쒖븞
    // ?ㅁ ?≪븘/媛???섎Ⅴ?뚮굹
    const familyKeywords: KeywordItem[] = [
      { keyword: `?꾧린?덈뒗吏?${cleanName.split(' ')[0]}`, competition: 'LOW', volume: '3,800', reason: '?덉쟾?깃낵 ?꾩깮???곗꽑?쒗븯??遺紐????濡깊뀒???ㅼ썙?? },
      { keyword: `媛?뺤슜 ${cleanName.split(' ')[0]} 異붿쿇`, competition: 'MEDIUM', volume: '8,400', reason: '媛議??⑥쐞 嫄곗떎 ?ъ슜 紐⑹쟻???좎엯???곗닔' },
      { keyword: `?덉떖媛??${brand}`, competition: 'LOW', volume: '1,200', reason: '媛議?嫄닿컯/?곕튃 ?ㅼ썙?쒕줈 ?좊ː媛??덈뒗 由щ럭 理쒖쟻?? },
      { keyword: `?쇱닔媛??由ъ뒪??${cleanName.split(' ')[0]}`, competition: 'HIGH', volume: '19,500', reason: '?좏샎遺遺?????吏異??꾪솚?⑥씠 留ㅼ슦 ?믪? ?듭떖 ?ㅼ썙?? }
    ];

    // ?쭛?랅윊??먯랬/1?멸?援??섎Ⅴ?뚮굹
    const singleKeywords: KeywordItem[] = [
      { keyword: `?먮８ ${cleanName.split(' ')[0]} 異붿쿇`, competition: 'LOW', volume: '5,200', reason: '?먯랬?앸뱾??醫곸? 怨듦컙 ?쒖슜?깃낵 媛?깅퉬 ?덉쫰 怨듬왂 1?쒖쐞' },
      { keyword: `?먯랬諛?轅??${cleanName.split(' ')[0]}`, competition: 'LOW', volume: '2,900', reason: '?좏뻾??誘쇨컧?섍퀬 ?ㅼ슜?깆쓣 李얜뒗 2030 留욎땄 ?ㅼ썙?? },
      { keyword: `1?멸?援?媛?깅퉬 媛??, competition: 'MEDIUM', volume: '7,100', reason: '理쒖?媛 諛??ㅼ냽 ?ㅽ럺??吏묒쨷 ?쒖튂?섎뒗 ?寃잛링' },
      { keyword: `?뚰삎 ${cleanName.split(' ')[0]} ?꾧린`, competition: 'LOW', volume: '1,800', reason: '肄ㅽ뙥?명븳 洹쒓꺽???좏샇?섎뒗 留욎땄???몃? ?ㅼ썙?? }
    ];

    // ?㏏ 諛섎젮?숇Ъ ?섎Ⅴ?뚮굹
    const petKeywords: KeywordItem[] = [
      { keyword: `媛뺤븘吏 ${cleanName.split(' ')[0]} ?덉쟾`, competition: 'LOW', volume: '1,900', reason: '諛섎젮寃ъ쓽 24?쒓컙 ?앺솢 嫄닿컯 諛??뚯쓬 誘쇨컧??耳??怨듬왂' },
      { keyword: `怨좎뼇???リ???異붿쿇`, competition: 'LOW', volume: '2,400', reason: '諛섎젮臾??댁쨷?? ?좊┝ ?덈갑 ???뱁솕 ?좎엯 媛뺣젰' },
      { keyword: `諛섎젮?숇Ъ ?ㅻ쭏?멸???${brand}`, competition: 'LOW', volume: '950', reason: '?뺣깷??吏묒궗???ъ씠???낆냼臾?留덉??낆뿉 留ㅼ슦 ?좊━' },
      { keyword: `媛뺤븘吏 ?붿쐞?덉텧 ??, competition: 'MEDIUM', volume: '4,100', reason: '?щ쫫 ?쒖쫵???レ????몃옒??吏묒쨷' }
    ];

    // ?룫 ?щТ???ㅽ뵾???섎Ⅴ?뚮굹
    const officeKeywords: KeywordItem[] = [
      { keyword: `?щТ?ㅼ슜 ${cleanName.split(' ')[0]}`, competition: 'MEDIUM', volume: '5,800', reason: '?낅Т 吏묒쨷???μ긽 諛???⑸웾/怨좎옣 ?녿뒗 ?닿뎄???좏샇 ?寃? },
      { keyword: `?뚯쓽??${cleanName.split(' ')[0]} 異붿쿇`, competition: 'LOW', volume: '1,500', reason: '怨듭슜 怨듦컙 ?명뀒由ъ뼱? ?뺤닕???뚯쓬 ?ъ뼇 ?쒖튂 ?ㅼ썙?? },
      { keyword: `?뚯궗 ?뺣퉬??轅??, competition: 'LOW', volume: '1,100', reason: '蹂듭? 諛?媛?깅퉬 ?믪? ?몃젴???щТ?섍꼍 ?ㅻ툕???덉쫰' },
      { keyword: `?낅Т?⑥쑉 媛??異붿쿇`, competition: 'MEDIUM', volume: '3,200', reason: '?낅Т ?쇰줈 寃쎄컧 諛?吏곸옣??怨듦컧 留덉????곕룞' }
    ];

    setGeneratedKeywords({
      specKeywords,
      familyKeywords,
      singleKeywords,
      petKeywords,
      officeKeywords
    });
  };

  // 4. 留덇렇?ㅽ떛 ?먰겢由?二쇱엯 ?쒖뒪??(One-Click Injection - 留덉씠?щ줈 紐⑥뀡 ?댄럺??援ы쁽)
  const handleKeywordInject = (keyword: string, event: React.MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    
    // ?좎븘媛???좊땲硫붿씠??醫뚰몴 ?앹꽦
    setFlyingKeyword({
      text: keyword,
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    });

    // ?쇱젙 ?쒓컙 ??醫뚯륫 ?명뭼?쇰줈 ???≪닔 諛??곹깭 ?낅뜲?댄듃
    setTimeout(() => {
      setFlyingKeyword(null);
      
      // 以묐났 泥댄겕 諛??쇳몴 援щ텇 異붽?
      const existing = targetKeywords.split(',').map(k => k.trim()).filter(Boolean);
      if (!existing.includes(keyword)) {
        const updated = [...existing, keyword].join(', ');
        setTargetKeywords(updated);
        showToast(`'${keyword}' ?ㅼ썙?쒓? 醫뚯륫 ?寃??꾨뱶???먯꽍泥섎읆 ??二쇱엯?섏뿀?듬땲?? ?윟`, 'success');
      } else {
        showToast(`'${keyword}'???대? ?寃??ㅼ썙?쒖뿉 二쇱엯?섏뼱 ?덉뒿?덈떎.`, 'info');
      }
    }, 700); // 0.7珥???二쇱엯 (framer motion ?쒓컙 留ㅼ묶)
  };

  // ?ㅼ젙 ???  const saveSettings = async (updatedSettings: Partial<AutopilotSettings>) => {
    try {
      const newSettings = { ...settings, ...updatedSettings };
      const res = await fetch('/api/naver-blog/settings', {
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
        showToast('?ㅼ젙 ????ㅽ뙣: ' + data.error, 'error');
        return null;
      }
    } catch (err: any) {
      showToast('?ㅼ젙 ???以??ㅻ쪟: ' + err.message, 'error');
      return null;
    }
  };

  // RPA 愿???쒖뼱 ?⑥닔 異붽?
  const handleTriggerRpaLogin = async () => {
    setIsRpaLaunching(true);
    showToast('濡쒖뺄 PC???ㅼ씠踰?濡쒓렇???몄쬆 釉뚮씪?곗?瑜?湲곕룞?⑸땲?? 理쒖큹 1??濡쒓렇?몄쓣 留덉퀜二쇱꽭??..', 'info');
    try {
      const res = await fetch('/api/naver-blog/settings?action=trigger_session');
      const data = await res.json();
      if (data.success) {
        showToast(data.message, 'success');
      } else {
        showToast('RPA 釉뚮씪?곗? 湲곕룞 ?ㅽ뙣: ' + data.error, 'error');
      }
    } catch (err: any) {
      showToast('RPA 釉뚮씪?곗? 援щ룞 以??ㅻ쪟: ' + err.message, 'error');
    } finally {
      setIsRpaLaunching(false);
    }
  };

  const handleSyncRpaSession = async () => {
    showToast('RPA ?먮룞??濡쒓렇???몄뀡 ?좏슚?깆쓣 泥댄겕?섎뒗 以묒엯?덈떎...', 'info');
    try {
      const res = await fetch('/api/naver-blog/settings');
      const data = await res.json();
      if (data.success) {
        setHasSession(data.has_session === 1);
        if (data.has_session === 1) {
          setIsAccountConnected(true);
          showToast('RPA ?몄쬆 ?몄뀡(naver_session.json)???깃났?곸쑝濡??숆린?붾릺???곌껐?섏뿀?듬땲?? ?윟', 'success');
        } else {
          showToast('?꾩쭅 ?앹꽦??濡쒓렇???몄뀡(荑좏궎)??媛먯??섏? ?딆븯?듬땲?? 理쒖큹 濡쒓렇?몄쓣 ?꾨즺?????숆린?뷀빐二쇱꽭?? ?뵶', 'error');
        }
      }
    } catch (err: any) {
      showToast('?몄뀡 ?숆린??以??ㅻ쪟: ' + err.message, 'error');
    }
  };

  const handleClearRpaSession = async () => {
    if (!confirm('RPA ?먮룞???몄뀡???뺣쭚濡??뚭린?섏떆寃좎뒿?덇퉴? ?뚭린 ?꾩뿉???ъ뒪???먮룞 諛쒗뻾??遺덇??⑸땲??')) return;
    try {
      const res = await fetch('/api/naver-blog/settings?action=clear_session');
      const data = await res.json();
      if (data.success) {
        setHasSession(false);
        setIsAccountConnected(false);
        showToast('RPA ?몄쬆 ?몄뀡(荑좏궎)???덉쟾?섍쾶 ?먭린?섏뿀?듬땲?? ?뵶', 'info');
      }
    } catch (err: any) {
      showToast('?몄뀡 ?뚭린 以??ㅻ쪟: ' + err.message, 'error');
    }
  };

  // ?대┰蹂대뱶 蹂듭궗 ?ы띁 ?⑥닔
  const handleCopyToClipboard = (text: string, label: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => {
          setCopiedText(text);
          showToast(`'${label}' 紐낅졊?닿? ?대┰蹂대뱶???깃났?곸쑝濡?蹂듭궗?섏뿀?듬땲?? ?뱥`, 'success');
          setTimeout(() => setCopiedText(null), 2000);
        })
        .catch((err) => {
          showToast('蹂듭궗 ?ㅽ뙣: ' + err.message, 'error');
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
        showToast(`'${label}' 紐낅졊?닿? ?대┰蹂대뱶???깃났?곸쑝濡?蹂듭궗?섏뿀?듬땲?? ?뱥`, 'success');
        setTimeout(() => setCopiedText(null), 2000);
      } catch (err: any) {
        showToast('蹂듭궗 ?ㅽ뙣: ' + err.message, 'error');
      }
      document.body.removeChild(textarea);
    }
  };

  // 怨꾩젙 ?곕룞 ?쒖텧 (API ?꾩슜 ?먮뒗 釉붾줈洹?ID ???
  const handleConnectAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!naverBlogIdInput) {
      showToast('?ㅼ씠踰?釉붾줈洹?ID瑜??낅젰?댁＜?몄슂.', 'error');
      return;
    }
    
    if (activeModeTab === 'api') {
      if (!apiClientIdInput || !apiClientSecretInput) {
        showToast('怨듭떇 API ?곕룞???꾪빐 Client ID? Secret??紐⑤몢 ?낅젰??二쇱꽭??', 'error');
        return;
      }
      const data = await saveSettings({
        naver_blog_id: naverBlogIdInput,
        api_client_id: apiClientIdInput,
        api_client_secret: apiClientSecretInput
      });
      if (data && data.success) {
        setIsAccountConnected(true);
        showToast(`N釉붾줈洹?@${naverBlogIdInput} 怨듭떇 API ?곕룞???덉쟾?섍쾶 ?꾨즺?섏뿀?듬땲?? ?윟`, 'success');
      }
    } else {
      // RPA 紐⑤뱶??寃쎌슦 ID ?뺣낫留???ν븯怨??몄뀡 ?좏슚?깆쓣 ?④퍡 寃??      const data = await saveSettings({
        naver_blog_id: naverBlogIdInput,
        api_client_id: '',
        api_client_secret: ''
      });
      if (data && data.success) {
        setIsAccountConnected(data.has_session === 1);
        showToast(`RPA 釉붾줈洹??꾩씠??@${naverBlogIdInput}) ?ㅼ젙????λ릺?덉뒿?덈떎.`, 'success');
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
      showToast('怨듭떇 API ?곕룞 怨꾩젙???뺤긽?곸쑝濡??댁젣?섏뿀?듬땲??', 'info');
    }
  };

  // AI 釉붾줈洹??λЦ ?먭퀬 鍮뚮뜑 API 援щ룞
  const handleGenerateAI = async () => {
    setSelectedPostForPreview(null); // ?좉퇋 ?ъ뒪???묒꽦 紐⑤뱶濡?媛뺤젣 由ъ뀑
    setIsGenerating(true);
    showToast('AI媛 怨좏뭹吏?釉붾줈洹??λЦ ?먭퀬瑜?吏묓븘 以묒엯?덈떎. ?좎떆留?湲곕떎?ㅼ＜?몄슂...', 'info');
    try {
      const res = await fetch('/api/naver-blog/generate', {
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
        showToast('?ㅼ씠踰?釉붾줈洹?留욎땄 SEO ?쒕ぉ怨?800???댁긽 蹂몃Ц ?먭퀬媛 ?꾩꽦?섏뿀?듬땲?? ??, 'success');
        
        // AI ??쑝濡??꾪솚
        setImageTab('ai');
      } else {
        showToast('AI ?앹꽦 ?ㅽ뙣: ' + data.error, 'error');
      }
    } catch (err: any) {
      showToast('AI ?앹꽦 以??ㅻ쪟: ' + err.message, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // ?ㅽ넗?뚯씪???곕が 利됱떆 ?ㅽ뻾 ?몃━嫄?  const handleTriggerAutopilot = async () => {
    showToast('?ㅼ씠踰?釉붾줈洹??ㅽ넗?뚯씪??AI 留덉??곕? 利됱떆 湲곕룞?⑸땲??..', 'info');
    try {
      const res = await fetch('/api/naver-blog/scheduler');
      const data = await res.json();
      if (data.success) {
        if (data.triggered) {
          showToast(data.message, 'success');
          fetchPosts(); // ?덉빟 紐⑸줉 媛깆떊
        } else {
          showToast(data.message, 'info');
        }
      } else {
        showToast('?ㅽ넗?뚯씪??援щ룞 ?ㅽ뙣: ' + data.error, 'error');
      }
    } catch (err: any) {
      showToast('?ㅽ넗?뚯씪??援щ룞 以??ㅻ쪟: ' + err.message, 'error');
    }
  };

  // ?ъ뒪???깅줉 (?덉빟 ?먮뒗 利됱떆 諛쒗뻾)
  const handleSavePost = async (isImmediate = false) => {
    let finalImageUrl = '';
    let finalSubImageUrl = '';

    if (imageTab === 'product') {
      if (!selectedProduct?.main_image_url) {
        showToast('?좏깮???곹뭹??硫붿씤 ?대?吏媛 ?놁뒿?덈떎.', 'error');
        return;
      }
      finalImageUrl = selectedProduct.main_image_url;
      finalSubImageUrl = 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&auto=format&fit=crop&q=80';
    } else {
      if (!generatedImageUrl) {
        showToast('?앹꽦??AI 蹂몃Ц ?대?吏媛 ?놁뒿?덈떎.', 'error');
        return;
      }
      finalImageUrl = generatedImageUrl;
      finalSubImageUrl = generatedSubImageUrl;
    }

    if (!postTitle || !postContent) {
      showToast('釉붾줈洹??쒕ぉ怨?蹂몃Ц ?댁슜??癒쇱? ?꾩꽦?댁＜?몄슂.', 'error');
      return;
    }

    const targetStatus = isImmediate ? 'POSTED' : 'SCHEDULED';
    const targetScheduledAt = isImmediate 
      ? new Date().toISOString() 
      : new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString();

    try {
      const res = await fetch('/api/naver-blog/posts', {
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
            ? '?ъ뒪?낆씠 ?ㅼ씠踰?釉붾줈洹몄뿉 媛??諛쒗뻾?섏뿀?듬땲?? ?럦' 
            : '?ъ뒪?낆씠 ?ㅼ?以???꾨씪?몄뿉 ?덉쟾?섍쾶 ?덉빟 ?깅줉?섏뿀?듬땲??', 
          'success'
        );
        
        // ??由ъ뀑
        setPostTitle('');
        setPostContent('');
        setTargetKeywords('');
        setAiPrompt('');
        
        // ?대젰 ?ㅼ떆 遺덈윭?ㅺ린
        fetchPosts();
      } else {
        showToast('?깅줉 ?ㅽ뙣: ' + data.error, 'error');
      }
    } catch (err: any) {
      showToast('?깅줉 以??ㅻ쪟: ' + err.message, 'error');
    }
  };

  // ?덉빟湲 ?뱀씤(利됱떆 諛쒗뻾)
  const handleApproveImmediate = async (postId: number) => {
    try {
      const res = await fetch('/api/naver-blog/posts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: postId,
          updates: { status: 'POSTED' }
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('釉붾줈洹??덉빟 珥덉븞??利됱떆 諛쒗뻾 ?뱀씤?섏뿀?듬땲?? ?럦', 'success');
        fetchPosts();
      } else {
        showToast('諛쒗뻾 ?뱀씤 ?ㅽ뙣: ' + data.error, 'error');
      }
    } catch (err: any) {
      showToast('?뱀씤 ?ㅻ쪟: ' + err.message, 'error');
    }
  };

  // ?ъ뒪????젣
  const handleDeletePost = async (postId: number) => {
    if (!confirm('?대떦 釉붾줈洹??ъ뒪?몃? ??젣?섏떆寃좎뒿?덇퉴?')) return;
    try {
      const res = await fetch(`/api/naver-blog/posts?id=${postId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        showToast('?ъ뒪?낆씠 ?대젰?먯꽌 ?뺤긽?곸쑝濡???젣?섏뿀?듬땲??', 'info');
        if (selectedPostForPreview?.id === postId) {
          setSelectedPostForPreview(null);
        }
        fetchPosts();
      } else {
        showToast('??젣 ?ㅽ뙣: ' + data.error, 'error');
      }
    } catch (err: any) {
      showToast('??젣 ?ㅻ쪟: ' + err.message, 'error');
    }
  };

  // ?꾪꽣留곷맂 ?곹뭹 由ъ뒪??  const filteredProducts = products.filter(prod => 
    prod.name.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
    (prod.brand && prod.brand.toLowerCase().includes(productSearchQuery.toLowerCase()))
  );

  // 寃쎌웳 媛뺣룄 諛곗? ?쒓컖???꾩슦誘?  const getCompetitionBadge = (comp: 'LOW' | 'MEDIUM' | 'HIGH') => {
    if (comp === 'LOW') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group relative cursor-pointer">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          ?윟 珥덇컯異?(寃쎌웳瑜???쓬)
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 rounded bg-gray-900 border border-gray-800 text-[10px] text-gray-300 leading-relaxed font-normal opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl z-50">
            ???釉붾줈洹?移⑦닾?⑥씠 ??븘 珥덈낫 釉붾줈嫄곕룄 1?섏씠吏 泥??붾㈃ ?몄텧 ?뺣쪧 92% ?댁긽 蹂댁옣?섎뒗 洹밴컯 轅 ?ㅼ썙??
          </span>
        </span>
      );
    } else if (comp === 'MEDIUM') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 group relative cursor-pointer">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
          ?윞 寃쎌웳 蹂댄넻
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 rounded bg-gray-900 border border-gray-800 text-[10px] text-gray-300 leading-relaxed font-normal opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl z-50">
            ?대뒓 ?뺣룄 寃?됰웾???뺣낫?섎㈃??以묒냼???먮뵒?곕뱾??怨좊Ⅴ寃??곸쐞 ?몄텧 寃쎌웳??踰뚯씠??臾대궃??留ㅼ묶
          </span>
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 group relative cursor-pointer">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
          ?뵶 寃쎌웳 移섏뿴
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 rounded bg-gray-900 border border-gray-800 text-[10px] text-gray-300 leading-relaxed font-normal opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl z-50">
            ?쇱씪 諛⑸Ц?????섎쭔 紐낅???硫붾㉧?쒓툒 ?명뵆猷⑥뼵??釉붾줈洹몃뱾???μ븙?섏뿬 珥덇린???곸쐞 ?몄텧???대젮??寃⑹쟾吏
          </span>
        </span>
      );
    }
  };

  // ?ㅼ떆媛?酉곗뼱 紐⑹뾽???쒖떆???뺣낫 ?먮젅?댄똿
  const viewTitle = selectedPostForPreview ? selectedPostForPreview.title : (postTitle || '?ш린???ъ뒪???쒕ぉ???몄텧?⑸땲??');
  const viewContent = selectedPostForPreview ? selectedPostForPreview.content : (postContent || '醫뚯륫 ?곹뭹???대┃?섍퀬 AI ?먭퀬 鍮뚮뜑瑜??ㅽ뻾?섍굅???섎룞?쇰줈 留ㅻ젰?곸씤 SEO ?ъ뒪??蹂몃Ц??吏묓븘??二쇱꽭?? ?ㅼ떆媛??ㅼ씠踰?紐⑤컮??釉붾줈洹?酉곗뼱 ?ㅽ궓??留욎떠 留덊겕?ㅼ슫怨??대え吏媛 ?꾨꼍 ?뚮뜑留곷맗?덈떎.');
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

  // 蹂몃Ц 臾몃떒 遺꾪븷 ?뚮뜑留??ы띁
  const renderFormattedContent = (txt: string) => {
    return txt.split('\n').map((paragraph, index) => {
      const trimmed = paragraph.trim();
      if (!trimmed) return <div key={index} className="h-4" />;
      
      // ?뚯젣紐??ㅽ??쇰쭅 (???대굹 1., 2. ?깆쑝濡??쒖옉????
      if (trimmed.startsWith('??) || trimmed.startsWith('?뱦') || trimmed.startsWith('??)) {
        return (
          <h4 key={index} className="text-base font-bold text-gray-800 dark:text-gray-100 mt-5 mb-2.5 border-l-[3px] border-[#03C75A] pl-2">
            {trimmed}
          </h4>
        );
      }
      
      return (
        <p key={index} className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 mb-3 break-all whitespace-pre-wrap">
          {trimmed}
        </p>
      );
    });
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 pb-12 font-sans relative overflow-x-hidden">
      
      {/* 4. 留덇렇?ㅽ떛 ?먰겢由?二쇱엯??鍮꾪뻾 ?뚮씪???ㅼ썙???몄텧 */}
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
            className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#03C75A] text-white shadow-2xl border border-emerald-400 pointer-events-none flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 animate-spin" />
            {flyingKeyword.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ?ㅻ뜑 諛곕꼫 */}
      <div className="bg-gradient-to-r from-gray-900 via-emerald-950/20 to-gray-900 border-b border-gray-800/80 px-6 py-5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#03C75A]/10 border border-[#03C75A]/30 flex items-center justify-center text-[#03C75A] shadow-lg shadow-emerald-500/5">
              <NaverIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-[#03C75A]/10 border border-[#03C75A]/30 text-[#03C75A] text-[10px] font-bold tracking-wider">
                  N-BLOG AI LAB
                </span>
                <span className="text-xs text-gray-500">v1.2.8 Premium</span>
              </div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-100 to-gray-400 mt-0.5">
                ?ㅼ씠踰?釉붾줈洹?AI ?먮룞 留덉????ㅽ뒠?붿삤
              </h1>
            </div>
          </div>
          
        </div>
      </div>

      {/* 硫붿씤 肄섑뀗痢??곸뿭 */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 mt-8">
        
        {/* 媛??而⑦뀗痢??곕룞 ?뚮┝李?*/}
        {/* 媛??而⑦뀗痢??곕룞 ?뚮┝李?(?섏씠釉뚮━??紐⑤뱶 ?꾨꼍 吏?? */}
        {!(activeModeTab === 'api' ? (isAccountConnected && settings.api_client_id) : (hasSession && settings.naver_blog_id)) && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-amber-300">
                  {activeModeTab === 'api' 
                    ? '?ㅼ씠踰?釉붾줈洹?怨듭떇 API 誘몄꽕?? 
                    : '?ㅼ씠踰?RPA ?먮룞 諛쒗뻾 ?몄뀡(荑좏궎) ?몄쬆 ?꾩슂'}
                </h4>
                <p className="text-xs text-gray-400 mt-0.5">
                  {activeModeTab === 'api' 
                    ? '?꾩옱 ?ㅼ씠踰?怨듭떇 API Client ID? Secret???깅줉?섏? ?딆븘 媛??紐⑤뱶濡??묐룞 以묒엯?덈떎. ?ㅼ젣 諛쒗뻾???먰븯?쒕㈃ ?곗륫 ?섎떒 ?ㅼ젙 移대뱶?먯꽌 API ?ㅻ? ?깅줉?댁＜?몄슂.' 
                    : 'RPA ?먮룞 諛쒗뻾??濡쒓렇??荑좏궎 ?몄뀡??議댁옱?섏? ?딆뒿?덈떎. ?곗륫 ?섎떒??怨꾩젙 愿由ъ옄?먯꽌 [理쒖큹 1??濡쒓렇??釉뚮씪?곗? 湲곕룞]???ㅽ뻾?섏뿬 ?몄쬆???꾨즺?댁＜?몄슂.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {activeModeTab === 'rpa' && (
                <button 
                  onClick={handleTriggerRpaLogin}
                  disabled={isRpaLaunching}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20 text-xs font-bold transition-all"
                >
                  {isRpaLaunching ? '?몄쬆 釉뚮씪?곗? 湲곕룞 以?..' : 'RPA 濡쒓렇??釉뚮씪?곗? 湲곕룞 ??'}
                </button>
              )}
              <button 
                onClick={() => {
                  const el = document.getElementById('account-connection-card');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-3.5 py-1.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/20 text-xs font-bold transition-all"
              >
                怨꾩젙 ?ㅼ젙?쇰줈 媛湲?              </button>
            </div>
          </div>
        )}

        {/* N-BLOG AI Keyword Lab 4? ?낆젏 湲곗닠 ?쇱??댁뒪 諛곕꼫 */}
        <div className="mb-8 p-6 rounded-3xl bg-gradient-to-br from-gray-900 via-gray-900 to-emerald-950/20 border border-gray-800/80 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#03C75A]/5 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-800 pb-4 mb-6 gap-4">
            <div>
              <h2 className="text-base md:text-lg font-bold text-gray-100 flex items-center gap-2">
                N-BLOG AI Keyword Lab 4? ?낆젏 ?뱀옣??              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* 1. ?곹뭹 ?먮룞 ?띿꽦 留ㅽ븨 異붿쿇 */}
            <div 
              onClick={() => {
                const el = document.getElementById('ai-keyword-lab-section');
                el?.scrollIntoView({ behavior: 'smooth' });
                showToast("1. ?곹뭹 ?먮룞 ?띿꽦 留ㅽ븨 異붿쿇 ?곸뿭?쇰줈 ?대룞?덉뒿?덈떎! ?뱤", "info");
              }}
              className="p-5 rounded-2xl bg-gray-950/50 border border-gray-800 hover:border-[#03C75A]/50 transition-all hover:bg-gray-900/60 cursor-pointer group flex flex-col justify-between h-full relative"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#03C75A]/10 text-[#03C75A] flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform">
                  ?뱤
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-gray-200 flex items-center justify-between">
                    <span>1. ?먮룞 ?띿꽦 留ㅽ븨 異붿쿇</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-normal">Spec-to-Keyword</span>
                  </h4>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    ?곹뭹 ?대┃ 利됱떆 釉뚮옖?? ?깅뒫 紐낆꽭, 媛寃⑸? ?띿꽦???ㅼ뒪濡?遺꾩꽍??寃?됰웾怨??꾪솚?⑥씠 ?믪? ????곌? ?ㅼ썙?쒕? ?먮룞 ?꾩텧?⑸땲??
                  </p>
                </div>
              </div>
              <div className="text-[10px] text-gray-500 border-t border-gray-900 pt-3 mt-4 flex items-center justify-between">
                <span>?? LG ?먯뼱而???#?щ쫫媛?꾩텛泥?/span>
                <span className="text-[#03C75A] font-semibold group-hover:translate-x-1 transition-transform">?대룞 ??/span>
              </div>
            </div>

            {/* 2. ?좏샇??寃쎌웳 媛뺣룄 ?쒕??덉씠??*/}
            <div 
              onClick={() => {
                const el = document.getElementById('ai-keyword-lab-section');
                el?.scrollIntoView({ behavior: 'smooth' });
                showToast("2. 寃쎌웳 媛뺣룄 ?쒕??덉씠???곸뿭?쇰줈 ?대룞?덉뒿?덈떎! ?슗", "info");
              }}
              className="p-5 rounded-2xl bg-gray-950/50 border border-gray-800 hover:border-[#03C75A]/50 transition-all hover:bg-gray-900/60 cursor-pointer group flex flex-col justify-between h-full"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform">
                  ?슗
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-gray-200 flex items-center justify-between">
                    <span>2. 寃쎌웳 媛뺣룄 ?쒕??덉씠??/span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-normal">Traffic Lights</span>
                  </h4>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    異붿쿇 ?ㅼ썙?쒕쭏???뵶移섏뿴, ?윞蹂댄넻, ?윟珥덇컯異??좏샇??諛곗?瑜?遺?ы븯???곸쐞 ?몄텧 ?좊젰 ?ㅼ썙?쒕? 吏곴??곸쑝濡??좊퀎?⑸땲??
                  </p>
                </div>
              </div>
              <div className="text-[10px] text-gray-500 border-t border-gray-900 pt-3 mt-4 flex items-center justify-between">
                <span>珥덈줉??諛곗?(?윟) ?곗꽑 怨듬왂!</span>
                <span className="text-amber-400 font-semibold group-hover:translate-x-1 transition-transform">?대룞 ??/span>
              </div>
            </div>

            {/* 3. ?듭떖 援щℓ ?섎Ⅴ?뚮굹蹂?遺꾪븷 ?쒖븞 */}
            <div 
              onClick={() => {
                const el = document.getElementById('ai-keyword-lab-section');
                el?.scrollIntoView({ behavior: 'smooth' });
                showToast("3. ?듭떖 援щℓ ?섎Ⅴ?뚮굹蹂??ㅼ썙??遺꾪븷 ?쒖븞 ?곸뿭?쇰줈 ?대룞?덉뒿?덈떎! ?뫁", "info");
              }}
              className="p-5 rounded-2xl bg-gray-950/50 border border-gray-800 hover:border-[#03C75A]/50 transition-all hover:bg-gray-900/60 cursor-pointer group flex flex-col justify-between h-full"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform">
                  ?뫁
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-gray-200 flex items-center justify-between">
                    <span>3. ?섎Ⅴ?뚮굹蹂?遺꾪븷 ?쒖븞</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 font-normal">Persona-Splitting</span>
                  </h4>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    ?낆옄痢듭쓣 ?ㅁ媛???≪븘, ?쭛?랅윊살옄痍?1?? ?㏏諛섎젮?숇Ъ ???쇱씠?꾩뒪??쇰퀎濡??몃텇?뷀븯??留욎땄???몃? 怨듦컧 ?ㅼ썙?쒕? ?쒓났?⑸땲??
                  </p>
                </div>
              </div>
              <div className="text-[10px] text-gray-500 border-t border-gray-900 pt-3 mt-4 flex items-center justify-between">
                <span>?寃?怨듦컧 ?ㅼ썙??移대뱶 ?쒓났</span>
                <span className="text-purple-400 font-semibold group-hover:translate-x-1 transition-transform">?대룞 ??/span>
              </div>
            </div>

            {/* 4. 留덇렇?ㅽ떛 ?먰겢由?二쇱엯 ?쒖뒪??*/}
            <div 
              onClick={() => {
                const el = document.getElementById('ai-keyword-lab-section');
                el?.scrollIntoView({ behavior: 'smooth' });
                showToast("4. 留덇렇?ㅽ떛 ?먰겢由?二쇱엯 ?쒖뒪???곸뿭?쇰줈 ?대룞?덉뒿?덈떎! ??, "info");
              }}
              className="p-5 rounded-2xl bg-gray-950/50 border border-gray-800 hover:border-[#03C75A]/50 transition-all hover:bg-gray-900/60 cursor-pointer group flex flex-col justify-between h-full"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform">
                  ??                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-gray-200 flex items-center justify-between">
                    <span>4. 留덇렇?ㅽ떛 ?먰겢由?二쇱엯</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 font-normal">One-Click Inject</span>
                  </h4>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    AI 異붿쿇 ?ㅼ썙??移대뱶瑜??대┃留??섎㈃ 醫뚯륫 ?寃??ㅼ썙???명뭼?쇰줈 ?먯꽍泥섎읆 ???좎븘媛??二쇱엯?섎뒗 ?몃젋?뷀븳 留덉씠?щ줈 紐⑥뀡 ?댄럺?몃? ?쒓났?⑸땲??
                  </p>
                </div>
              </div>
              <div className="text-[10px] text-gray-500 border-t border-gray-900 pt-3 mt-4 flex items-center justify-between">
                <span>?먯꽍泥섎읆 ?좎븘媛 ?먮룞 肄ㅻ쭏 二쇱엯</span>
                <span className="text-sky-400 font-semibold group-hover:translate-x-1 transition-transform">?대룞 ??/span>
              </div>
            </div>

          </div>
        </div>

        {/* 怨꾩젙 ?곕룞 ?명똿 愿由?移대뱶 (RPA & API ?섏씠釉뚮━?쒗삎) */}
        <div id="account-connection-card" className="mb-8 p-6 rounded-3xl bg-gray-900 border border-gray-800/80 shadow-2xl space-y-5">
          <div className="flex items-center justify-between border-b border-gray-800 pb-3">
            <div className="flex items-center gap-2">
              <Settings className="w-4.5 h-4.5 text-[#03C75A]" />
              <h4 className="text-sm font-bold text-gray-200">?ㅼ씠踰?釉붾줈洹?怨꾩젙 愿由ъ옄</h4>
            </div>
            {/* ?꾩옱 媛??紐⑤뱶 ?쒖떆 諛곗? */}
            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold tracking-wider ${
              activeModeTab === 'api' 
                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' 
                : 'bg-[#03C75A]/10 text-[#03C75A] border border-[#03C75A]/20'
            }`}>
              {activeModeTab === 'api' ? '怨듭떇 API 紐⑤뱶' : 'RPA 媛꾪렪 紐⑤뱶'}
            </span>
          </div>

          {/* ?섏씠釉뚮━???곕룞 諛⑹떇 ?좏깮 ??*/}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-gray-950 border border-gray-850">
            <button
              type="button"
              onClick={() => {
                setActiveModeTab('rpa');
                setIsAccountConnected(hasSession && !!settings.naver_blog_id);
              }}
              className={`py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeModeTab === 'rpa'
                  ? 'bg-[#03C75A]/10 text-[#03C75A] border border-[#03C75A]/20 shadow-md'
                  : 'text-gray-400 hover:text-gray-200 border border-transparent'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              RPA 媛꾪렪 濡쒓렇??            </button>
            <button
              type="button"
              onClick={() => {
                setActiveModeTab('api');
                setIsAccountConnected(!!settings.api_client_id && !!settings.naver_blog_id);
              }}
              className={`py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeModeTab === 'api'
                  ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20 shadow-md'
                  : 'text-gray-400 hover:text-gray-200 border border-transparent'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              怨듭떇 API ?곕룞
            </button>
          </div>

          {/* [1] RPA 媛꾪렪 濡쒓렇??紐⑤뱶 ?꾩슜 酉?*/}
          {activeModeTab === 'rpa' && (
            <div className="space-y-4">
              {/* RPA ?몄뀡 ?곹깭 ?쒖떆 ?⑤꼸 */}
              <div className={`p-4 rounded-2xl border transition-all ${
                hasSession && settings.naver_blog_id
                  ? 'bg-emerald-500/5 border-emerald-500/20'
                  : 'bg-rose-500/5 border-rose-500/20'
              }`}>
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-md ${
                    hasSession && settings.naver_blog_id ? 'bg-[#03C75A] text-white' : 'bg-rose-500 text-white'
                  }`}>
                    N
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="text-xs font-bold text-gray-200 flex items-center justify-between">
                      <span>
                        {hasSession && settings.naver_blog_id 
                          ? `RPA ?곕룞 ?꾨즺: @${settings.naver_blog_id}` 
                          : 'RPA ?곕룞???꾩슂?⑸땲??}
                      </span>
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        hasSession && settings.naver_blog_id ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                      }`}></span>
                    </div>
                    <p className="text-[10px] text-gray-400 leading-normal">
                      {hasSession && settings.naver_blog_id
                        ? '?윟 臾댁씤 ?먮룞??荑좏궎 ?몄쬆???뺣낫?섏뼱 ?뺤긽 ?숈옉 以묒엯?덈떎.'
                        : '?뵶 濡쒖뺄 濡쒓렇???몄뀡(naver_session.json)??議댁옱?섏? ?딆뒿?덈떎. 理쒖큹 1??濡쒓렇?몄씠 吏꾪뻾?섏뼱???⑸땲??'}
                    </p>
                  </div>
                </div>

                {/* RPA ?몄뀡??議댁옱?????댁젣(?뚭린) 踰꾪듉 */}
                {hasSession && settings.naver_blog_id && (
                  <div className="flex justify-end gap-2 border-t border-gray-800/80 pt-3 mt-3">
                    <button
                      type="button"
                      onClick={handleDisconnectAccount}
                      className="px-2.5 py-1 rounded-lg bg-gray-800 border border-gray-700 text-[10px] text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30 transition-all font-semibold"
                    >
                      RPA ?몄쬆 ?몄뀡 ?뚭린 ?좑툘
                    </button>
                  </div>
                )}
              </div>

              {/* RPA 濡쒓렇???몃━嫄?諛??숆린??踰꾪듉 釉붾줉 */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleTriggerRpaLogin}
                  disabled={isRpaLaunching}
                  className="w-full py-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-[#03C75A] hover:text-white border border-[#03C75A]/20 transition-all text-xs font-bold active:scale-95 flex items-center justify-center gap-2"
                >
                  <Globe className="w-4 h-4" />
                  {isRpaLaunching ? 'RPA 釉뚮씪?곗? ?앹뾽 湲곕룞 以?..' : 'RPA 理쒖큹 濡쒓렇??釉뚮씪?곗? 湲곕룞 ??'}
                </button>
                
                <button
                  type="button"
                  onClick={handleSyncRpaSession}
                  className="w-full py-2 rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700 transition-all text-xs font-semibold active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  ?몄뀡 ?숆린???ㅼ떆媛?媛깆떊 ?봽
                </button>
              </div>

              {/* 釉붾줈洹??꾩씠???ㅼ젙 ??*/}
              <form onSubmit={handleConnectAccount} className="space-y-2.5 border-t border-gray-800/60 pt-3 mt-2">
                <div>
                  <label className="text-[9px] text-gray-400 font-semibold block">?곕룞???ㅼ씠踰?釉붾줈洹?ID</label>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="text"
                      placeholder="?? naver_username"
                      value={naverBlogIdInput}
                      onChange={(e) => setNaverBlogIdInput(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-gray-950 border border-gray-850 rounded-xl text-xs text-gray-300 focus:outline-none focus:border-[#03C75A]/50 font-medium"
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 rounded-xl bg-gray-800 text-gray-200 hover:bg-gray-700 hover:text-white border border-gray-700 transition-all text-xs font-bold shrink-0"
                    >
                      ????뮶
                    </button>
                  </div>
                </div>
              </form>

              {/* RPA 理쒖큹 ?ㅼ튂 諛?臾몄젣?닿껐 媛?대뱶 紐⑤떖 ?몃━嫄?*/}
              <div className="border-t border-gray-800/60 pt-3.5 mt-3 text-center">
                <button
                  type="button"
                  onClick={() => setIsGuideModalOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-semibold transition-all group focus:outline-none"
                >
                  <span>RPA 理쒖큹 ?ㅼ튂/湲곕룞?????섏떆?섏슂? ?뮕</span>
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          )}

          {/* [2] 怨듭떇 API ?곕룞 紐⑤뱶 ?꾩슜 酉?*/}
          {activeModeTab === 'api' && (
            <div className="space-y-4">
              {/* API ?곕룞 ?곹깭 ?쒖떆 ?⑤꼸 */}
              <div className={`p-4 rounded-2xl border transition-all ${
                isAccountConnected && settings.api_client_id
                  ? 'bg-sky-500/5 border-sky-500/20'
                  : 'bg-rose-500/5 border-rose-500/20'
              }`}>
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-md ${
                    isAccountConnected && settings.api_client_id ? 'bg-sky-500 text-white' : 'bg-rose-500 text-white'
                  }`}>
                    API
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="text-xs font-bold text-gray-200 flex items-center justify-between">
                      <span>
                        {isAccountConnected && settings.api_client_id 
                          ? `API ?곕룞 ?꾨즺: @${settings.naver_blog_id}` 
                          : 'API ?몄쬆 ?뺣낫 ?꾩슂'}
                      </span>
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        isAccountConnected && settings.api_client_id ? 'bg-sky-400 animate-pulse' : 'bg-rose-500'
                      }`}></span>
                    </div>
                    <p className="text-[10px] text-gray-400 leading-normal">
                      {isAccountConnected && settings.api_client_id
                        ? '?윟 怨듭떇 API ???몄쬆???쒖꽦?붾릺???덉쟾?섍쾶 ?곌껐?섏뿀?듬땲??'
                        : '?뵶 ?ㅼ씠踰?媛쒕컻???쇳꽣?먯꽌 諛쒓툒??API ???뺣낫瑜??꾨옒 ?낅젰????낅젰??二쇱꽭??'}
                    </p>
                  </div>
                </div>

                {/* API ?곕룞 ?댁젣 踰꾪듉 */}
                {isAccountConnected && settings.api_client_id && (
                  <div className="flex justify-end gap-2 border-t border-gray-800/80 pt-3 mt-3">
                    <button
                      type="button"
                      onClick={handleDisconnectAccount}
                      className="px-2.5 py-1 rounded-lg bg-gray-800 border border-gray-700 text-[10px] text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30 transition-all font-semibold"
                    >
                      API ?곕룞 ?댁젣
                    </button>
                  </div>
                )}
              </div>

              {/* API ?곕룞 ??*/}
              <form onSubmit={handleConnectAccount} className="space-y-3">
                <div>
                  <label className="text-[9px] text-gray-400 font-semibold block">?ㅼ씠踰?釉붾줈洹?ID</label>
                  <input
                    type="text"
                    placeholder="?? naver_username"
                    value={naverBlogIdInput}
                    onChange={(e) => setNaverBlogIdInput(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2 bg-gray-950 border border-gray-850 rounded-xl text-xs text-gray-300 focus:outline-none focus:border-sky-500/50 font-medium"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-gray-400 font-semibold block">Client ID</label>
                  <input
                    type="password"
                    placeholder="?ㅼ씠踰?媛쒕컻???쇳꽣 Client ID"
                    value={apiClientIdInput}
                    onChange={(e) => setApiClientIdInput(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2 bg-gray-950 border border-gray-850 rounded-xl text-xs text-gray-300 focus:outline-none focus:border-sky-500/50 font-medium"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-gray-400 font-semibold block">Client Secret</label>
                  <input
                    type="password"
                    placeholder="?ㅼ씠踰?媛쒕컻???쇳꽣 Client Secret"
                    value={apiClientSecretInput}
                    onChange={(e) => setApiClientSecretInput(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2 bg-gray-950 border border-gray-850 rounded-xl text-xs text-gray-300 focus:outline-none focus:border-sky-500/50 font-medium"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 rounded-xl bg-gray-800 text-gray-200 hover:bg-sky-500 hover:text-white border border-gray-700 transition-all text-xs font-bold active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  API ?덉쟾 ?뺣낫 ???諛??곕룞 ?뮶
                </button>
              </form>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* L. 醫뚯륫 ?쒖뼱 ?곸뿭 (8而щ읆) */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* [1] 100% 臾댁씤 ?ㅽ넗?뚯씪???ㅼ쐞移?移대뱶 */}
            <div className="p-6 rounded-3xl bg-gray-900 border border-gray-800/80 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#03C75A]/5 rounded-full blur-3xl pointer-events-none"></div>
              <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-lg bg-[#03C75A]/10 text-[#03C75A]">
                      <Globe className="w-4 h-4" />
                    </span>
                    <h3 className="text-base font-bold text-gray-100">
                      100% 臾댁씤 AI ?ㅽ넗?뚯씪??留덉???                    </h3>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    ?쒖꽦????留ㅼ씪 ?덉빟???쒓컙??AI媛 ?깅줉???곹뭹??遺꾩꽍???먮룞?쇰줈 釉붾줈洹??ъ뒪?몃? ?앹꽦 諛?諛쒗뻾 ?湲고빀?덈떎.
                  </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button 
                    onClick={handleTriggerAutopilot}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all active:scale-95 shadow-md cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    ?ㅽ넗?뚯씪??AI 利됱떆 援щ룞
                  </button>
                  <div className="px-3 py-1.5 rounded-xl bg-gray-950 border border-gray-850 text-xs text-gray-400 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#03C75A] animate-pulse"></span>
                    <span>臾댁씤 ?ㅽ넗?뚯씪???곕が ?湲?以?/span>
                    <button 
                      onClick={() => setIsDaemonInfoOpen(true)}
                      className="p-0.5 rounded-md hover:bg-gray-800 text-gray-500 hover:text-gray-300 transition-colors ml-0.5 cursor-pointer"
                      title="濡쒖뺄 PC ?곕が ?뺤씤 諛⑸쾿 媛?대뱶"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button
                    onClick={() => saveSettings({ is_autopilot: settings.is_autopilot === 1 ? 0 : 1 })}
                    className="transition-transform active:scale-95 shrink-0"
                  >
                    {settings.is_autopilot === 1 ? (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#03C75A]/10 border border-[#03C75A]/30 text-[#03C75A] font-bold text-xs cursor-pointer">
                        <ToggleRight className="w-5 h-5" /> ON (?먮룞??援щ룞 以?
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-800 border border-gray-700 text-gray-400 font-semibold text-xs cursor-pointer">
                        <ToggleLeft className="w-5 h-5" /> OFF (?섎룞 寃??紐⑤뱶)
                      </div>
                    )}
                  </button>
                </div>
              </div>

              {settings.is_autopilot === 1 && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-6 pt-5 border-t border-gray-800/80 grid grid-cols-1 sm:grid-cols-3 gap-4"
                >
                  <div>
                    <label className="text-[10px] text-gray-400 font-medium uppercase tracking-wider block">諛쒗뻾 二쇨린</label>
                    <select
                      value={settings.autopilot_interval}
                      onChange={(e) => saveSettings({ autopilot_interval: e.target.value })}
                      className="w-full mt-1.5 px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-gray-300 focus:outline-none focus:border-[#03C75A]/50 font-semibold"
                    >
                      <option value="DAILY">留ㅼ씪 (Daily)</option>
                      <option value="WEEKLY">留ㅼ＜ (Weekly)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 font-medium uppercase tracking-wider block">諛쒗뻾 ?쒓컖</label>
                    <input 
                      type="time" 
                      value={settings.autopilot_time}
                      onChange={(e) => saveSettings({ autopilot_time: e.target.value })}
                      className="w-full mt-1.5 px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-gray-300 focus:outline-none focus:border-[#03C75A]/50 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 font-medium uppercase tracking-wider block">?먭퀬 吏묓븘 ?ㅼ븻留ㅻ꼫</label>
                    <select
                      value={settings.tone_style}
                      onChange={(e) => saveSettings({ tone_style: e.target.value })}
                      className="w-full mt-1.5 px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-gray-300 focus:outline-none focus:border-[#03C75A]/50 font-semibold"
                    >
                      <option value="?뺣낫?쒓났??>?럳 ?뺣낫?쒓났???ㅽ럺由щ럭</option>
                      <option value="?붿쭅由щ럭??>?뮠 由ъ뼹 ?붿쭅由щ럭??/option>
                      <option value="?꾨Ц移쇰읆??>?뱤 ?꾨Ц移쇰읆 遺꾩꽍??/option>
                      <option value="移쒓렐?쒖씪?곹삎">?룧 移쒓렐???쇱긽怨듭쑀??/option>
                    </select>
                  </div>
                </motion.div>
              )}
            </div>

            {/* [2] ?곹뭹 ?먯깋 諛??좏깮 ?곸뿭 */}
            <div className="p-6 rounded-3xl bg-gray-900 border border-gray-800/80 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <ShoppingBag className="w-4 h-4" />
                  </span>
                  <h3 className="text-base font-bold text-gray-100">
                    1?④퀎: 留덉???????곹뭹 ?좏깮
                  </h3>
                </div>
                <div className="text-xs text-gray-400 font-semibold">
                  ?좏깮 ??AI ?먮룞 留ㅽ븨 ?ㅼ썙?쒓? 利됱떆 媛깆떊?⑸땲??                </div>
              </div>

              {/* 寃?됱뼱 ?낅젰李?*/}
              <div className="relative">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-500" />
                <input 
                  type="text"
                  placeholder="?깅줉 ?곹뭹紐? 釉뚮옖?? 媛寃⑸? 寃??.."
                  value={productSearchQuery}
                  onChange={(e) => setProductSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-xs text-gray-300 focus:outline-none focus:border-[#03C75A]/50 font-medium"
                />
              </div>

              {/* ?곹뭹 肄ㅽ뙥??媛濡??몃줈 由ъ뒪??*/}
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {filteredProducts.map((prod) => {
                  const isSelected = selectedProduct?.id === prod.id;
                  return (
                    <div
                      key={prod.id}
                      onClick={() => {
                        setSelectedProduct(prod);
                        setSelectedPostForPreview(null);
                      }}
                      className={`p-3 rounded-2xl flex items-center justify-between border cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-[#03C75A]/10 border-[#03C75A]/50 shadow-md shadow-[#03C75A]/5' 
                          : 'bg-gray-950/80 border-gray-800/80 hover:bg-gray-800/40 hover:border-gray-700/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <img 
                          src={prod.main_image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100&auto=format&fit=crop&q=80'} 
                          alt={prod.name}
                          className="w-12 h-12 rounded-xl object-cover border border-gray-800 bg-gray-900 shrink-0"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-gray-800 border border-gray-700 text-gray-400">
                              {prod.brand || '釉뚮옖??遺꾩꽍 以?}
                            </span>
                            <span className="text-xs font-bold text-gray-200 line-clamp-1">{prod.name}</span>
                          </div>
                          <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-2">
                            <span className="font-semibold text-emerald-400">
                              {Number(prod.price).toLocaleString()}??                            </span>
                            <span className="text-gray-600">|</span>
                            <span className="line-clamp-1 max-w-[200px]">{prod.specs || '?ㅽ럺 ?뺣낫媛 遺꾩꽍 以묒엯?덈떎'}</span>
                          </div>
                        </div>
                      </div>
                      
                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-[#03C75A] flex items-center justify-center text-white shadow-md">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-gray-800"></div>
                      )}
                    </div>
                  );
                })}

                {filteredProducts.length === 0 && (
                  <div className="py-8 text-center text-xs text-gray-500">
                    寃??議곌굔??留욌뒗 ?곹뭹??議댁옱?섏? ?딆뒿?덈떎.
                  </div>
                )}
              </div>
            </div>

            {/* [3] AI KEYWORD LAB: 4? 湲곕뒫 ?쒓컖??留ㅽ븨 蹂대뱶 */}
            <div id="ai-keyword-lab-section" className="p-6 rounded-3xl bg-gray-900 border border-gray-800/80 shadow-2xl space-y-6">
              
              {/* ??댄? 諛?湲고쉷 ?뚭컻 */}
              <div className="border-b border-gray-800 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <div className="absolute inset-0 rounded-lg bg-emerald-500 blur-sm opacity-55 animate-pulse"></div>
                      <span className="relative p-1.5 rounded-lg bg-emerald-500 text-white flex items-center justify-center">
                        <Sparkles className="w-4 h-4" />
                      </span>
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-100">
                        AI Keyword Lab (?ㅼ썙???곌뎄??
                      </h3>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        ?곹뭹 ?먮룞 ?띿꽦 遺꾩꽍 ??媛??寃쎌웳瑜?吏꾨떒 ???섎Ⅴ?뚮굹蹂?遺꾪븷 ?쒖븞 ??留덇렇?ㅽ떛 ?먰겢由?二쇱엯 ?쒖뒪??                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ?뱤 1. ?곹뭹 ?먮룞 ?띿꽦 留ㅽ븨 異붿쿇 寃곌낵 */}
              {selectedProduct ? (
                <div className="p-4 rounded-2xl bg-gray-950 border border-gray-800/80 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-md bg-[#03C75A]/10 text-[#03C75A] border border-[#03C75A]/20 font-bold">
                      ?띿꽦 ?먮룞 留ㅽ븨 遺꾩꽍
                    </span>
                    <span className="text-[10px] text-gray-400">AI媛 ?곹뭹???ъ뼇怨?釉뚮옖?쒕? 遺꾩꽍??????ㅼ썙?쒕? 異붿텧?덉뒿?덈떎.</span>
                  </div>

                  <div className="flex flex-wrap gap-2.5">
                    {generatedKeywords.specKeywords.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={(e) => handleKeywordInject(item.keyword, e)}
                        className="group flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-900 border border-gray-800 hover:border-[#03C75A]/40 transition-all hover:bg-gray-900 text-left active:scale-95"
                      >
                        <div>
                          <div className="text-[11px] font-bold text-gray-200">#{item.keyword}</div>
                          <div className="text-[8px] text-gray-500 mt-0.5">議고쉶?? {item.volume}</div>
                        </div>
                        {getCompetitionBadge(item.competition)}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-gray-500">
                  ?곹뭹???좏깮?섎㈃ ?ㅼ떆媛??띿꽦 留ㅽ븨 ?ㅼ썙?쒓? 媛?숇맗?덈떎.
                </div>
              )}

              {/* ?뫁 3. ?듭떖 援щℓ ?섎Ⅴ?뚮굹蹂?遺꾪븷 ?쒖븞 & ??4. 留덇렇?ㅽ떛 ?먰겢由?二쇱엯 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-300">
                    ?寃?援щℓ ?섎Ⅴ?뚮굹蹂?怨듦컧 ?ㅼ썙??移대뱶 ?명듃
                  </label>
                  <span className="text-[10px] text-[#03C75A] font-medium">?뮕 ?ㅼ썙??移대뱶瑜??대┃ ??醫뚯륫 ?寃??낅젰 ?꾨뱶???먯꽍泥섎읆 ??二쇱엯?⑸땲??</span>
                </div>

                {/* ?섎Ⅴ?뚮굹 ??硫붾돱 */}
                <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl !bg-slate-100 !border !border-slate-200 shadow-inner">
                  <button
                    onClick={() => setActivePersona('family')}
                    className={`py-2 rounded-lg text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${
                      activePersona === 'family' 
                        ? '!bg-[#03C75A] !text-white shadow-md' 
                        : '!text-slate-600 hover:!text-slate-900 hover:!bg-slate-200/60'
                    }`}
                  >
                    <span>?ㅁ</span>
                    <span className="text-[10px] sm:text-xs">?≪븘/媛??/span>
                  </button>
                  <button
                    onClick={() => setActivePersona('single')}
                    className={`py-2 rounded-lg text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${
                      activePersona === 'single' 
                        ? '!bg-[#03C75A] !text-white shadow-md' 
                        : '!text-slate-600 hover:!text-slate-900 hover:!bg-slate-200/60'
                    }`}
                  >
                    <span>?쭛?랅윊?/span>
                    <span className="text-[10px] sm:text-xs">?먯랬/1??/span>
                  </button>
                  <button
                    onClick={() => setActivePersona('pet')}
                    className={`py-2 rounded-lg text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${
                      activePersona === 'pet' 
                        ? '!bg-[#03C75A] !text-white shadow-md' 
                        : '!text-slate-600 hover:!text-slate-900 hover:!bg-slate-200/60'
                    }`}
                  >
                    <span>?㏏</span>
                    <span className="text-[10px] sm:text-xs">諛섎젮?숇Ъ</span>
                  </button>
                  <button
                    onClick={() => setActivePersona('office')}
                    className={`py-2 rounded-lg text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${
                      activePersona === 'office' 
                        ? '!bg-[#03C75A] !text-white shadow-md' 
                        : '!text-slate-600 hover:!text-slate-900 hover:!bg-slate-200/60'
                    }`}
                  >
                    <span>?룫</span>
                    <span className="text-[10px] sm:text-xs">?ㅽ뵾???щТ</span>
                  </button>
                </div>

                {/* ?섎Ⅴ?뚮굹 ?ㅼ썙??移대뱶 紐⑸줉 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  {(() => {
                    let items: KeywordItem[] = [];
                    if (activePersona === 'family') items = generatedKeywords.familyKeywords;
                    else if (activePersona === 'single') items = generatedKeywords.singleKeywords;
                    else if (activePersona === 'pet') items = generatedKeywords.petKeywords;
                    else if (activePersona === 'office') items = generatedKeywords.officeKeywords;

                    return items.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={(e) => handleKeywordInject(item.keyword, e)}
                        className="p-3.5 rounded-2xl bg-gray-950 border border-gray-800/80 hover:border-[#03C75A]/40 transition-all text-left flex flex-col justify-between gap-3 group/card relative hover:shadow-xl hover:shadow-[#03C75A]/2 active:scale-95"
                      >
                        <div className="flex items-start justify-between w-full">
                          <span className="text-xs font-bold text-gray-200 select-none">
                            #{item.keyword}
                          </span>
                          {getCompetitionBadge(item.competition)}
                        </div>
                        <div className="text-[10px] text-gray-400 leading-relaxed font-normal bg-gray-900/50 p-2 rounded-lg border border-gray-800/50 w-full">
                          {item.reason}
                        </div>
                        <div className="flex items-center justify-between w-full text-[9px] text-gray-500 border-t border-gray-900 pt-2">
                          <span>??寃?됰웾: <strong className="text-gray-300 font-semibold">{item.volume}</strong>嫄?/span>
                          <span className="text-[#03C75A] font-semibold group-hover/card:translate-x-1 transition-transform flex items-center gap-0.5">
                            ??二쇱엯?섍린 +
                          </span>
                        </div>
                      </button>
                    ));
                  })()}
                </div>
              </div>
            </div>

            {/* [4] 釉붾줈洹?吏묓븘 ?먮뵒??(?섎룞 諛?AI 鍮뚮뜑 ?쒖뼱) */}
            <div className="p-6 rounded-3xl bg-gray-900 border border-gray-800/80 shadow-2xl space-y-6">
              
              <div className="flex items-center gap-2 border-b border-gray-800 pb-4">
                <span className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <FileText className="w-4 h-4" />
                </span>
                <h3 className="text-base font-bold text-gray-100">
                  2?④퀎: ?ㅼ씠踰?釉붾줈洹??ъ뒪???먭퀬 鍮뚮뜑
                </h3>
              </div>

              {/* AI ?λЦ ?앹꽦湲??명똿李?*/}
              <div className="p-4 rounded-2xl bg-gray-950 border border-gray-800/80 space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#03C75A] animate-pulse" />
                  <span className="text-xs font-bold text-gray-200">AI ?λЦ SEO ?먭퀬 ?먮룞 吏묓븘 ?붿쭊</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">吏묓븘 ?ㅼ븻留ㅻ꼫</label>
                    <select
                      value={aiTone}
                      onChange={(e) => setAiTone(e.target.value)}
                      className="w-full mt-1.5 px-3 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-xs text-gray-300 focus:outline-none focus:border-[#03C75A]/50 font-semibold"
                    >
                      <option value="?뺣낫?쒓났??>?럳 ?뺣낫?쒓났???ㅽ럺由щ럭</option>
                      <option value="?붿쭅由щ럭??>?뮠 由ъ뼹 ?붿쭅由щ럭??/option>
                      <option value="?꾨Ц移쇰읆??>?뱤 ?꾨Ц移쇰읆 遺꾩꽍??/option>
                      <option value="移쒓렐?쒖씪?곹삎">?룧 移쒓렐???쇱긽怨듭쑀??/option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">?대?吏 紐⑤뱶</label>
                    <div className="grid grid-cols-2 gap-2 mt-1.5">
                      <button
                        type="button"
                        disabled={!selectedProduct}
                        onClick={() => setImageTab('product')}
                        className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                          !selectedProduct
                            ? 'bg-gray-955/50 border-gray-900 text-gray-600 cursor-not-allowed opacity-40'
                            : imageTab === 'product'
                            ? 'bg-[#03C75A]/10 border-[#03C75A]/50 text-[#03C75A]'
                            : 'bg-gray-900 border-gray-855 text-gray-400 hover:text-gray-200'
                        }`}
                      >
                        ?곹뭹 ??쒖씠誘몄?
                      </button>
                      <button
                        type="button"
                        disabled={!selectedProduct}
                        onClick={() => setImageTab('ai')}
                        className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                          !selectedProduct
                            ? 'bg-gray-955/50 border-gray-900 text-gray-600 cursor-not-allowed opacity-40'
                            : imageTab === 'ai'
                            ? 'bg-[#03C75A]/10 border-[#03C75A]/50 text-[#03C75A]'
                            : 'bg-gray-900 border-gray-855 text-gray-400 hover:text-gray-200'
                        }`}
                      >
                        AI ?ㅼ쨷 媛먯꽦??                      </button>
                    </div>
                    {!selectedProduct && (
                      <span className="text-[10px] text-amber-500/80 font-medium flex items-center gap-1 mt-1.5 animate-pulse">
                        ?좑툘 ?곹뭹??癒쇱? ?좏깮?섏떆硫??대?吏 紐⑤뱶媛 ?쒖꽦?붾맗?덈떎.
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">AI 異붽? ?붽뎄 ?꾨＼?꾪듃 (?좏깮)</label>
                  <textarea
                    placeholder="?? '?⑥젏???꾩＜ ?댁쭩 ?붿쭅?섍쾶 ?뱀뿬以?, '?대떦 ?쒗뭹 ?ъ슜 ???띠쓽 吏덉씠 ?대뼸寃?蹂?덈뒗吏瑜?以묒젏?곸쑝濡?媛뺤“?댁쨾'"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    rows={2}
                    className="w-full mt-1.5 px-3 py-2 bg-gray-900 border border-gray-800 rounded-xl text-xs text-gray-300 focus:outline-none focus:border-[#03C75A]/50 font-medium resize-none"
                  />
                </div>

                <button
                  onClick={handleGenerateAI}
                  disabled={isGenerating || !selectedProduct}
                  className="w-full py-2.5 rounded-xl text-xs font-bold bg-[#03C75A] text-white hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-500/10 active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      AI媛 ?ㅼ씠踰?SEO??留욌뒗 800???댁긽 ?먭퀬 吏묓븘 以?..
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      ?ㅼ씠踰?釉붾줈洹?留욎땄??AI ?먭퀬 利됱떆 鍮뚮뱶
                    </>
                  )}
                </button>
              </div>

              {/* ?먮뵒???꾨뱶 */}
              <div className="space-y-4">
                
                {/* ??留덇렇?ㅽ떛 ?먰겢由?二쇱엯 ?섏쭛 ?꾨뱶 */}
                <div>
                  <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">
                    ?寃??ㅼ썙??(?쇳몴 援щ텇)
                  </label>
                  <input
                    ref={keywordInputRef}
                    type="text"
                    placeholder="?곗륫 AI Keyword Lab??諭껋?瑜??대┃?섎㈃ ?닿납?쇰줈 ?먮룞 留덇렇?ㅽ떛 二쇱엯?⑸땲??"
                    value={targetKeywords}
                    onChange={(e) => setTargetKeywords(e.target.value)}
                    className="w-full mt-1.5 px-3.5 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-xs text-emerald-400 placeholder:text-gray-600 focus:outline-none focus:border-[#03C75A]/50 font-semibold transition-all"
                  />
                  {targetKeywords && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {targetKeywords.split(',').map((k) => k.trim()).filter(Boolean).map((k, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[#03C75A] text-[10px] font-bold">
                          #{k}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">?ъ뒪???쒕ぉ (Title)</label>
                  <input
                    type="text"
                    placeholder="釉붾줈洹??ъ뒪???쒕ぉ???낅젰?섍굅??AI ?앹꽦???ㅽ뻾?섏꽭??"
                    value={postTitle}
                    onChange={(e) => setPostTitle(e.target.value)}
                    className="w-full mt-1.5 px-3.5 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-xs text-gray-200 focus:outline-none focus:border-[#03C75A]/50 font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">?ъ뒪??蹂몃Ц ?먭퀬 (Content)</label>
                  <textarea
                    placeholder="?ㅼ씠踰?釉붾줈洹몄뿉 理쒖쟻?붾맂 怨좏뭹吏??λЦ 蹂몃Ц ?먭퀬瑜??묒꽦?섏꽭?? ?쒕ぉ怨?蹂몃Ц???寃??ㅼ썙?쒕뱾???먯뿰?ㅻ읇寃??뱀븘?ㅼ뼱???곸쐞 ?몄텧???좊━?⑸땲??"
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    rows={12}
                    className="w-full mt-1.5 p-4 bg-gray-950 border border-gray-800 rounded-2xl text-xs text-gray-300 focus:outline-none focus:border-[#03C75A]/50 font-medium leading-relaxed resize-y"
                  />
                  <div className="flex justify-between items-center text-[10px] text-gray-500 mt-1">
                    <span>怨듬갚 ?ы븿 珥? <strong className="text-gray-300 font-bold">{postContent.length}</strong>??/span>
                    <span className={postContent.length >= 800 ? "text-[#03C75A] font-bold" : "text-amber-500"}>
                      {postContent.length >= 800 ? "?윟 沅뚯옣 SEO 遺꾨웾 ?ъ꽦 (800???댁긽)" : "?좑툘 ?λЦ 蹂닿컯 沅뚯옣 (800???댄븯)"}
                    </span>
                  </div>
                </div>

              </div>

              {/* ?덉빟 ?쒓컙 ?ㅼ젙 諛??깅줉 ?≪뀡 */}
              <div className="pt-4 border-t border-gray-800">
                <div className="flex flex-row items-end gap-3 w-full pb-1">
                  
                  {/* 1. ?덉빟 諛쒗뻾 ?쇱떆 ?ㅼ젙 (?곸젅??怨좎젙???뺣낫濡?李뚭렇?ъ쭚 諛⑹? 諛?媛濡쒗룺 理쒖쟻?? */}
                  <div className="flex flex-col gap-1.5 w-[280px] sm:w-[320px] shrink-0">
                    <label className="text-[10px] text-gray-400 font-semibold block">?덉빟 諛쒗뻾 ?쇱떆</label>
                    <div className="flex items-center gap-2.5 w-full">
                      <input 
                        type="date" 
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        className="flex-1 min-w-0 px-3.5 py-2.5 bg-white dark:bg-gray-955 border border-gray-300 dark:border-gray-800 rounded-xl text-xs text-gray-800 dark:text-gray-300 focus:outline-none focus:border-[#03C75A]/50 font-semibold h-[42px]"
                      />
                      <input 
                        type="time" 
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className="w-[110px] shrink-0 px-3.5 py-2.5 bg-white dark:bg-gray-955 border border-gray-300 dark:border-gray-800 rounded-xl text-xs text-gray-800 dark:text-gray-300 focus:outline-none focus:border-[#03C75A]/50 font-semibold h-[42px]"
                      />
                    </div>
                  </div>

                  {/* 2. 吏???쒓컙 ?덉빟 ?깅줉 踰꾪듉 (?⑥? 媛濡쒗룺???쒖썝?섍쾶 梨꾩슦???좎뿰???뺣낫) */}
                  <div className="flex-1 min-w-[130px]">
                    <button
                      type="button"
                      onClick={() => handleSavePost(false)}
                      disabled={!postTitle || !postContent}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold active:scale-95 transition-all border flex items-center justify-center gap-1.5 h-[42px] cursor-pointer ${
                        (!postTitle || !postContent)
                          ? 'bg-gray-100 dark:bg-gray-800/40 border-gray-200 dark:border-gray-850 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                          : 'bg-white hover:bg-gray-50 dark:bg-gray-850 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-800'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">吏???쒓컙 ?덉빟 ?깅줉</span>
                    </button>
                  </div>

                  {/* 3. ?ㅼ씠踰?釉붾줈洹?利됱떆 諛쒗뻾 踰꾪듉 (?⑥? 媛濡쒗룺???쒖썝?섍쾶 梨꾩슦???좎뿰???뺣낫) */}
                  <div className="flex-1 min-w-[150px]">
                    <button
                      type="button"
                      onClick={() => handleSavePost(true)}
                      disabled={!postTitle || !postContent}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold active:scale-95 transition-all flex items-center justify-center gap-1.5 h-[42px] cursor-pointer shadow-md ${
                        (!postTitle || !postContent)
                          ? 'bg-gray-100 dark:bg-gray-800/40 border-gray-200 dark:border-gray-850 text-gray-400 dark:text-gray-500 cursor-not-allowed border'
                          : 'bg-[#03C75A] hover:bg-emerald-600 text-white shadow-emerald-500/5'
                      }`}
                    >
                      <Send className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">?ㅼ씠踰?釉붾줈洹?利됱떆 諛쒗뻾</span>
                    </button>
                  </div>

                </div>
              </div>

            </div>

          </div>

          {/* R. ?곗륫 ?ㅼ씠踰?紐⑤컮??釉붾줈洹?酉곗뼱 紐⑹뾽 ?곸뿭 (5而щ읆) */}
          <div className="lg:col-span-5 sticky top-8 space-y-6 pb-16">
            
            {/* ?ㅼ씠踰?釉붾줈洹??꾩슜 珥덈줉 ?뚮쭏 ?ㅻ쭏?명룿 ?꾨젅??*/}
            <div className="relative mx-auto w-full max-w-[370px] aspect-[9/19] rounded-[48px] border-[10px] border-gray-800 bg-gray-950 shadow-2xl overflow-hidden ring-4 ring-gray-900 mb-12">
              
              {/* ?ㅽ뵾而?& 移대찓???몄튂 ?곗퐫 */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-full z-50 flex items-center justify-center">
                <div className="w-16 h-1.5 bg-gray-800 rounded-full"></div>
              </div>

              {/* 紐⑤컮???붾㈃ ?대? ?ㅼ쭏 而⑦뀗痢?*/}
              <div className="w-full h-full bg-[#F4F4F4] text-gray-900 flex flex-col overflow-y-auto select-none pt-7 relative custom-scrollbar">
                
                {/* ?곷떒 ?ㅼ씠踰?釉붾줈洹?濡쒓퀬 & 湲濡쒕쾶 ?ㅻ뜑 ?ㅽ궓 */}
                <div className="bg-[#03C75A] text-white px-4 py-3 shrink-0 flex items-center justify-between sticky top-0 z-40 shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <NaverIcon className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-bold tracking-tight">釉붾줈洹?/span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Search className="w-4 h-4 text-white/90" />
                    <Sliders className="w-4 h-4 text-white/90" />
                  </div>
                </div>

                {/* ?ъ뒪??而ㅻ쾭 ?대?吏 / 釉붾줈洹??ㅽ궓 ?ㅻ뜑 */}
                <div className="bg-white px-4 py-4 border-b border-gray-200 shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#03C75A]/10 border border-[#03C75A]/20 flex items-center justify-center text-[#03C75A] text-[10px] font-bold">
                      {naverBlogIdInput ? naverBlogIdInput.substring(0,2).toUpperCase() : 'N'}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-800 flex items-center gap-1">
                        {naverBlogIdInput ? `@${naverBlogIdInput}` : '@naver_official'}
                        <span className="px-1 py-0.5 rounded-[4px] bg-[#03C75A]/10 text-[#03C75A] text-[7px] font-bold">?댁썐異붽?</span>
                      </div>
                      <div className="text-[8px] text-gray-400 flex items-center gap-1.5 mt-0.5">
                        <span>?꾩껜 諛⑸Ц?? 42,910紐?/span>
                        <span>??/span>
                        <span>?ㅻ뒛 諛⑸Ц?? 215紐?/span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ?ъ뒪??蹂몃Ц 而⑦뀗痢??뷀뀒??*/}
                <div className="bg-white px-4 py-5 flex-1 space-y-4">
                  
                  {/* ?ъ뒪??移댄뀒怨좊━ ?뺣낫 */}
                  <div className="text-[10px] text-[#03C75A] font-bold tracking-wider uppercase">
                    ?썱截?IT 쨌 媛??쨌 ?쇱긽 ?붿쭅由щ럭
                  </div>

                  {/* ?ъ뒪???쒕ぉ */}
                  <h2 className="text-lg font-bold text-gray-900 leading-snug tracking-tight">
                    {viewTitle}
                  </h2>

                  {/* ?ъ뒪???묒꽦 ?뺣낫 */}
                  <div className="flex items-center justify-between text-[9px] text-gray-400 border-b border-gray-100 pb-2.5">
                    <span>?묒꽦?쇱옄: {systemTime}</span>
                    <span>二쇱냼蹂듭궗 ???듦퀎</span>
                  </div>

                  {/* 1. ????대?吏 ?뚮뜑留?*/}
                  {viewMainImage && (
                    <div className="relative rounded-2xl overflow-hidden border border-gray-100 bg-gray-50 aspect-video">
                      <img 
                        src={viewMainImage} 
                        alt="????대?吏"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/60 text-white text-[8px] font-bold tracking-wider uppercase">
                        ????대?吏
                      </div>
                    </div>
                  )}

                  {/* 蹂몃Ц ?띿뒪???뚮뜑??*/}
                  <div className="py-2">
                    {renderFormattedContent(viewContent)}
                  </div>

                  {/* 2. ?쒕툕 ?쒕툕?대?吏 蹂몃Ц 以묎컙 ?쎌엯 ?뚮뜑留?*/}
                  {viewSubImage && (
                    <div className="relative rounded-2xl overflow-hidden border border-gray-100 bg-gray-50 aspect-video my-4">
                      <img 
                        src={viewSubImage} 
                        alt="蹂몃Ц 以묎컙 ?쎌엯 ?대?吏"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/60 text-white text-[8px] font-bold tracking-wider">
                        蹂몃Ц ?쎌엯 ?대?吏
                      </div>
                    </div>
                  )}

                  {/* ?섎떒 ?쒓렇 ?뺣낫 */}
                  {viewKeywords && (
                    <div className="flex flex-wrap gap-1.5 pt-4 border-t border-gray-100">
                      {viewKeywords.split(',').map((k, i) => (
                        <span key={i} className="text-[10px] text-sky-600 hover:underline">
                          #{k.trim()}
                        </span>
                      ))}
                    </div>
                  )}

                </div>

                {/* ?ㅼ씠踰?釉붾줈洹??섎떒 由ъ븸??諛?*/}
                <div className="bg-white px-4 py-3.5 border-t border-gray-150 sticky bottom-0 z-30 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-4">
                    <button className="flex items-center gap-1 text-gray-500 text-[10px] font-bold hover:text-red-500 transition-colors">
                      <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                      <span>怨듦컧 {selectedPostForPreview?.likes_count || 12}</span>
                    </button>
                    <button className="flex items-center gap-1 text-gray-500 text-[10px] font-bold">
                      <MessageCircle className="w-4 h-4 text-gray-400" />
                      <span>?볤? {Math.floor((selectedPostForPreview?.likes_count || 12) / 3)}</span>
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-gray-400">?ㅼ씠踰?釉붾줈洹?紐⑤컮???ㅽ궓 誘몃━蹂닿린</span>
                  </div>
                </div>

              </div>

            </div>

          </div>

        </div>

        {/* [5] ?섎떒: ?덉빟 諛??덉빟 諛쒗뻾 ?꾨즺????꾨씪???대젰 愿由?由ъ뒪??*/}
        <div className="mt-24 p-6 rounded-3xl bg-gray-900 border border-gray-800/80 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-gray-800 pb-4">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#03C75A]/10 text-[#03C75A] flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-gray-100">
                  3?④퀎: ?ㅼ씠踰?釉붾줈洹??덉빟 諛?諛쒗뻾 ??꾨씪???대젰 愿由?                </h3>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  AI ?ㅽ넗?뚯씪???곕が ?먮뒗 愿由ъ옄媛 ?깅줉??釉붾줈洹?肄섑뀗痢??쇱껜 議고쉶 諛??묐갑???ㅼ떆媛??쇱씠釉??꾨━酉?諛붿씤??                </p>
              </div>
            </div>
            <button 
              onClick={fetchPosts}
              className="p-2 rounded-xl bg-gray-950 border border-gray-850 hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition-all active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 font-semibold">
                  <th className="py-3 px-4">????곹뭹</th>
                  <th className="py-3 px-4">釉붾줈洹??ъ뒪???쒕ぉ</th>
                  <th className="py-3 px-4">?寃??ㅼ썙??/th>
                  <th className="py-3 px-4">?덉빟 ?덉젙 ?쇱떆</th>
                  <th className="py-3 px-4">諛쒗뻾 ?곹깭</th>
                  <th className="py-3 px-4">諛⑸Ц??怨듦컧</th>
                  <th className="py-3 px-4 text-center">?≪뀡 諛??쒖뼱</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {posts.map((post) => (
                  <tr 
                    key={post.id}
                    onClick={() => setSelectedPostForPreview(post)}
                    className={`hover:bg-gray-800/20 transition-all cursor-pointer ${
                      selectedPostForPreview?.id === post.id ? 'bg-[#03C75A]/5' : ''
                    }`}
                  >
                    <td className="py-4 px-4">
                      {post.product ? (
                        <div className="flex items-center gap-2">
                          <img 
                            src={post.product.main_image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=50&auto=format&fit=crop&q=80'} 
                            alt={post.product.name}
                            className="w-8 h-8 rounded-lg object-cover border border-gray-800"
                          />
                          <span className="font-semibold text-gray-300 max-w-[100px] line-clamp-1">
                            {post.product.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-600">怨듯넻 ?꾨줈紐⑥뀡</span>
                      )}
                    </td>
                    <td className="py-4 px-4 font-bold text-gray-200 max-w-[200px] line-clamp-1 mt-2.5">
                      {post.title}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-1 max-w-[180px]">
                        {post.target_keywords ? (
                          post.target_keywords.split(',').map((k, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded bg-gray-950 border border-gray-800 text-sky-400 text-[9px] font-semibold">
                              #{k.trim()}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-600">吏???놁쓬</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 font-semibold text-gray-300">
                      {new Date(post.scheduled_at).toLocaleString('ko-KR', { hour12: false })}
                    </td>
                    <td className="py-4 px-4">
                      {post.status === 'POSTED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#03C75A]/10 text-[#03C75A] border border-[#03C75A]/20">
                          <CheckCircle className="w-3 h-3" /> 利됱떆 諛쒗뻾 ?꾨즺
                        </span>
                      )}
                      {post.status === 'SCHEDULED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <Calendar className="w-3 h-3" /> ?덉빟 ?먮룞 ?湲?                        </span>
                      )}
                      {post.status === 'DRAFT' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-800 text-gray-400 border border-gray-700">
                          ?꾩떆 蹂닿? 珥덉븞
                        </span>
                      )}
                      {post.status === 'FAILED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          諛쒗뻾 ?ㅽ뙣
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      {post.status === 'POSTED' ? (
                        <div className="flex items-center gap-3 text-[10px] text-gray-400 font-semibold">
                          <span className="flex items-center gap-0.5">
                            <Eye className="w-3.5 h-3.5" />
                            {post.views_count}
                          </span>
                          <span className="flex items-center gap-0.5 text-red-400">
                            <Heart className="w-3 h-3 fill-red-500/20 text-red-500" />
                            {post.likes_count}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-600 font-medium">?湲?以?/span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-2">
                        {post.status === 'SCHEDULED' && (
                          <button
                            onClick={() => handleApproveImmediate(post.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/20 hover:border-emerald-500 text-[10px] font-bold transition-all active:scale-95 flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            諛쒗뻾 ?뱀씤
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedPostForPreview(post)}
                          className="px-2.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700 text-[10px] font-semibold transition-all active:scale-95 flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          誘몃━蹂닿린
                        </button>
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="p-1.5 rounded-lg bg-gray-800/50 hover:bg-rose-500/10 text-gray-500 hover:text-rose-400 border border-gray-800 hover:border-rose-500/20 transition-all active:scale-95"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {posts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-gray-500 font-medium">
                      ??꾨씪???대젰??鍮꾩뼱 ?덉뒿?덈떎. AI ?먭퀬 ?앹꽦湲곕? ?ㅽ뻾?섍굅???ㅽ넗?뚯씪???곕が??湲곕룞?섏뿬 泥??덉빟??鍮뚮뱶??蹂댁꽭??
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ?ㅼ떆媛??뚮줈???좎뒪??*/}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, top: -80 }}
            animate={{ opacity: 1, top: 24 }}
            exit={{ opacity: 0, top: -80 }}
            className={`fixed left-1/2 -translate-x-1/2 px-4.5 py-3 rounded-2xl shadow-2xl border text-xs font-bold flex items-center gap-2 z-[99999] min-w-[320px] justify-between ${
              toastType === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-emerald-500/5'
                : toastType === 'error'
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-rose-500/5'
                : 'bg-blue-500/10 border-blue-500/30 text-blue-400 shadow-blue-500/5'
            }`}
          >
            <div className="flex items-center gap-2">
              {toastType === 'success' && <CheckCircle className="w-4.5 h-4.5 shrink-0" />}
              {toastType === 'error' && <AlertCircle className="w-4.5 h-4.5 shrink-0" />}
              {toastType === 'info' && <AlertCircle className="w-4.5 h-4.5 shrink-0" />}
              <span className="leading-snug">{toastMessage}</span>
            </div>
            
            <button 
              onClick={() => setToastMessage(null)}
              className="text-[9px] hover:underline uppercase shrink-0 tracking-wider text-gray-400 hover:text-white"
            >
              ?リ린
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RPA 理쒖큹 湲곕룞 臾몄젣?닿껐 媛?대뱶 紐⑤떖 */}
      <AnimatePresence>
        {isGuideModalOpen && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            {/* 諛곌꼍 ?ㅻ쾭?덉씠 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsGuideModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            {/* 紐⑤떖 諛뺤뒪 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="relative w-full max-w-2xl bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden shadow-2xl z-10 flex flex-col"
              style={{ maxHeight: '85vh' }}
            >
              {/* ?곷떒 ?ㅻ뜑 */}
              <div className="px-6 py-5 border-b border-gray-800 flex items-center justify-between bg-gradient-to-r from-gray-900 via-[#03C75A]/5 to-gray-900">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#03C75A]/10 border border-[#03C75A]/30 flex items-center justify-center text-[#03C75A]">
                    <NaverIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-100 flex items-center gap-2">
                      RPA 理쒖큹 湲곕룞 ?ъ쟾 以鍮?媛?대뱶
                    </h3>
                    <p className="text-[11px] text-gray-400">
                      RPA 理쒖큹 ?먮룞??湲곕룞 諛?濡쒓렇???ㅽ뙣 ???꾨옒 4?④퀎瑜??꾨즺??二쇱꽭??
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsGuideModalOpen(false)}
                  className="p-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-all focus:outline-none"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* ?ㅽ겕濡?媛?ν븳 蹂몃Ц */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-left min-h-0" style={{ overflowY: 'auto' }}>
                
                {/* ?명듃濡??뚮┝ */}
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex items-start gap-3">
                  <Info className="w-5 h-5 text-[#03C75A] shrink-0 mt-0.5 animate-pulse" />
                  <p className="text-xs text-gray-300 leading-relaxed font-medium">
                    ?ㅼ씠踰?釉붾줈洹?臾댁씤 ?먮룞??RPA) 湲곕룞? ?쇰컲 ?щ＼ 釉뚮씪?곗?媛 ?꾨땶, Playwright ?꾩슜 蹂댁븞 釉뚮씪?곗? ?섍꼍??濡쒖뺄 PC???꾩닔濡??붽뎄?⑸땲?? ?꾨옒 ?덈궡???곕씪 ?곕???紐낅졊?대? ?ㅽ뻾?섏떆硫?100% ?닿껐?⑸땲??
                  </p>
                </div>

                {/* 4?④퀎 媛?대뱶 由ъ뒪??*/}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">?썱截?RPA 理쒖큹 濡쒓렇??以鍮?4?④퀎</h4>
                  
                  {/* 1?④퀎 */}
                  <div className="p-4 bg-gray-950/60 border border-gray-850 rounded-2xl space-y-3 relative group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-[#03C75A]/20 text-[#03C75A] text-xs font-extrabold flex items-center justify-center">1</span>
                        <h5 className="text-xs font-bold text-gray-200">Playwright ?꾩슜 Chromium 釉뚮씪?곗? ?ㅼ튂 (媛??以묒슂 ?뙚)</h5>
                      </div>
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">?꾩닔 ?섑뻾</span>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      ?꾨줈?앺듃 猷⑦듃 ?붾젆?좊━(<code className="px-1 py-0.5 bg-gray-900 border border-gray-800 rounded font-mono text-gray-300">c:\dev\egdesk-FreeSMS</code>)?먯꽌 ?곕???CMD ?먮뒗 PowerShell)???닿퀬 ?꾨옒 ?ㅼ튂 紐낅졊?대? ?낅젰??二쇱꽭?? (?ㅼ튂 ?뚯슂 ?쒓컙 ??1~2遺?
                    </p>
                    <div className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-xl p-2.5 font-mono text-xs text-emerald-400">
                      <span>npx playwright install chromium</span>
                      <button
                        onClick={() => handleCopyToClipboard('npx playwright install chromium', 'Playwright ?щ줈誘몄? ?ㅼ튂')}
                        className="p-1 rounded-lg bg-gray-850 hover:!bg-[#03C75A] hover:!text-white transition-all flex items-center gap-1 text-[10px] font-semibold border border-gray-800"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        {copiedText === 'npx playwright install chromium' ? '蹂듭궗??' : '蹂듭궗'}
                      </button>
                    </div>
                  </div>

                  {/* 2?④퀎 */}
                  <div className="p-4 bg-gray-950/60 border border-gray-850 rounded-2xl space-y-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-[#03C75A]/20 text-[#03C75A] text-xs font-extrabold flex items-center justify-center">2</span>
                      <h5 className="text-xs font-bold text-gray-200">GUI 吏??濡쒖뺄 ?곕????섍꼍 ?뺤씤 (?ㅻЪ ?붾㈃ ?꾩닔)</h5>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      ?ㅼ씠踰??먮룞 濡쒓렇??李쎌쓣 ?붾㈃?곸뿉 ?꾩슦湲??꾪빐?쒕뒗 諛깃렇?쇱슫?쒓? ?꾨땶 ?ㅼ젣 ?곗뒪?ы넲 ?붾㈃???곌껐???곕??먯뿉??Next.js ?쒕쾭(<code className="px-1 py-0.5 bg-gray-900 border border-gray-800 rounded font-mono text-gray-300">npm run dev</code>)媛 援щ룞 以묒씠?댁빞 ?⑸땲??
                    </p>
                    <div className="p-3 bg-gray-900/50 border border-gray-850 rounded-xl space-y-1.5">
                      <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        ?뺤긽 ?ㅽ뻾: 濡쒖뺄 Windows CMD/PowerShell, VSCode 湲곕낯 ?곕???                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-rose-400 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                        ?ㅻ쪟 媛?? GUI ?붿뒪?뚮젅???ㅼ젙???녿뒗 WSL2 ?먮뒗 Docker 而⑦뀒?대꼫
                      </div>
                    </div>
                  </div>

                  {/* 3?④퀎 */}
                  <div className="p-4 bg-gray-950/60 border border-gray-850 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-[#03C75A]/20 text-[#03C75A] text-xs font-extrabold flex items-center justify-center">3</span>
                      <h5 className="text-xs font-bold text-gray-200">?섏〈??NPM ?⑦궎吏 ?꾩갑 ?곹깭 ?ы솗??/h5>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      node_modules??罹먯떆 ?좎떎?대굹 playwright ?⑦궎吏媛 ?꾨씫??寃쎌슦瑜?諛⑹??섍린 ?꾪빐 濡쒖뺄 ?⑦궎吏 ?ㅼ튂 ?곹깭瑜?媛뺤젣 媛깆떊??二쇱떆硫?醫뗭뒿?덈떎.
                    </p>
                    <div className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-xl p-2.5 font-mono text-xs text-emerald-400">
                      <span>npm install</span>
                      <button
                        onClick={() => handleCopyToClipboard('npm install', 'NPM ?⑦궎吏 ?ㅼ튂')}
                        className="p-1 rounded-lg bg-gray-850 hover:!bg-[#03C75A] hover:!text-white transition-all flex items-center gap-1 text-[10px] font-semibold border border-gray-800"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        {copiedText === 'npm install' ? '蹂듭궗??' : '蹂듭궗'}
                      </button>
                    </div>
                  </div>

                  {/* 4?④퀎 */}
                  <div className="p-4 bg-gray-950/60 border border-gray-850 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-[#03C75A]/20 text-[#03C75A] text-xs font-extrabold flex items-center justify-center">4</span>
                      <h5 className="text-xs font-bold text-gray-200">?ㅼ씠踰?濡쒓렇??諛??몄뀡 ?숆린??/h5>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      紐⑤뱺 以鍮꾧? ?앸궗?ㅻ㈃ 怨꾩젙 移대뱶 ?섎떒??<strong>[RPA 理쒖큹 濡쒓렇??釉뚮씪?곗? 湲곕룞 ??]</strong>???대┃?섏뿬 ?щ줈誘몄? 釉뚮씪?곗? ?앹뾽???꾩슦怨? ?ㅼ씠踰?濡쒓렇?몄쓣 ?먯닔 ?꾨즺??二쇱꽭?? 濡쒓렇???깃났 ?뺤씤 ??諛붾줈 ?꾨옒??<strong>[?몄뀡 ?숆린???ㅼ떆媛?媛깆떊 ?봽]</strong>???대┃?섎㈃ ?곌껐 ?쒖떆?깆씠 ?윟 珥덈줉鍮쏆쑝濡??먮벑?⑸땲??
                    </p>
                  </div>
                </div>

                {/* 1珥??먯씤 遺꾩꽍 ???吏꾨떒 */}
                <div className="p-5 bg-gradient-to-br from-gray-950 to-gray-900 border border-gray-800 rounded-3xl space-y-3">
                  <div className="flex items-center gap-2 text-amber-400">
                    <Terminal className="w-4 h-4" />
                    <h5 className="text-xs font-bold uppercase tracking-wider">?뵇 1珥?留뚯뿉 ?먯씤 ?뚯븙?섎뒗 ???吏꾨떒 紐낅졊??/h5>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    ???붾㈃ ?곸쓽 鍮꾨룞湲??먮쫫 ??? ?곕??먯뿉??RPA ?곕が??吏곸젒 ?ㅽ뻾??蹂대㈃ 援ъ껜?곸쑝濡??대뼡 ?먮윭 肄붾뱶(?? 釉뚮씪?곗? ?꾨씫 ??濡??명빐 湲곕룞???ㅽ뙣?덈뒗吏 ???덉뿉 ?뚯븙?????덉뼱 媛뺣젰 異붿쿇?⑸땲??
                  </p>
                  <div className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-xl p-2.5 font-mono text-xs text-emerald-400">
                    <span>npm run naver:daemon</span>
                    <button
                      onClick={() => handleCopyToClipboard('npm run naver:daemon', 'RPA ?곕が 媛뺤젣 ?ㅽ뻾')}
                      className="p-1 rounded-lg bg-gray-850 hover:!bg-[#03C75A] hover:!text-white transition-all flex items-center gap-1 text-[10px] font-semibold border border-gray-800"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copiedText === 'npm run naver:daemon' ? '蹂듭궗??' : '蹂듭궗'}
                    </button>
                  </div>
                  
                  {/* ?먭? 議곗튂 ??*/}
                  <div className="border-t border-gray-800/80 pt-3 mt-2.5 space-y-1.5">
                    <div className="flex items-start gap-2 text-[10.5px] text-gray-400">
                      <span className="text-amber-500 font-bold shrink-0">1.</span>
                      <span>
                        <code className="text-rose-400 font-bold">Executable doesn't exist...</code> ?먮윭 寃異???<strong>1?④퀎 釉뚮씪?곗? ?ㅼ튂</strong> 紐낅졊?대? ?ㅽ뻾?섏떆硫?100% ?닿껐?⑸땲??
                      </span>
                    </div>
                    <div className="flex items-start gap-2 text-[10.5px] text-gray-400">
                      <span className="text-amber-500 font-bold shrink-0">2.</span>
                      <span>
                        <code className="text-rose-400 font-bold">Cannot find module...</code> ?먮윭 寃異???<strong>3?④퀎 ?⑦궎吏 ?ъ꽕移?/strong> 紐낅졊?대? ?섑뻾?섏떆硫??닿껐?⑸땲??
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* ?섎떒 ?명꽣 */}
              <div className="px-6 py-4 border-t border-gray-800 bg-gray-950/60 flex justify-end">
                <button
                  onClick={() => setIsGuideModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-gray-800 hover:!bg-emerald-500 hover:!text-white transition-all text-xs font-bold active:scale-95 shadow-md border border-gray-700"
                >
                  ?뺤씤 ?꾨즺 諛??リ린
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RPA ?곕が ?곸꽭 ?뺣낫 諛?濡쒖뺄 PC ?ㅽ뻾 媛?대뱶 紐⑤떖 */}
      <AnimatePresence>
        {isDaemonInfoOpen && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            {/* 諛곌꼍 ?ㅻ쾭?덉씠 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDaemonInfoOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            {/* 紐⑤떖 諛뺤뒪 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="relative w-full max-w-2xl bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden shadow-2xl z-10 flex flex-col"
              style={{ maxHeight: '85vh' }}
            >
              {/* ?곷떒 ?ㅻ뜑 */}
              <div className="px-6 py-5 border-b border-gray-800 flex items-center justify-between bg-gradient-to-r from-gray-900 via-[#03C75A]/5 to-gray-900">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#03C75A]/10 border border-[#03C75A]/30 flex items-center justify-center text-[#03C75A]">
                    <Terminal className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-100 flex items-center gap-2">
                      濡쒖뺄 PC ?곕が(RPA) ?곹깭 ?뺤씤 媛?대뱶
                    </h3>
                    <p className="text-[11px] text-gray-400">
                      濡쒖뺄 PC?먯꽌 諛깃렇?쇱슫??RPA ?먮룞???곕が??援щ룞 ?곹깭瑜?吏꾨떒?섍퀬 ?뚯뒪?명븯??踰뺤쓣 ?뺤씤?섏꽭??
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsDaemonInfoOpen(false)}
                  className="p-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-all focus:outline-none"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* ?ㅽ겕濡?媛?ν븳 蹂몃Ц */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-left min-h-0" style={{ overflowY: 'auto' }}>
                
                {/* ?꾩옱 濡쒖뺄 ?몄뀡 ?곹깭 泥댄겕 */}
                <div className={`p-4 rounded-2xl flex items-start gap-3 border ${hasSession ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-amber-500/5 border-amber-500/10'}`}>
                  <Info className={`w-5 h-5 shrink-0 mt-0.5 ${hasSession ? 'text-[#03C75A]' : 'text-amber-400'}`} />
                  <div>
                    <h4 className={`text-xs font-bold ${hasSession ? 'text-emerald-300' : 'text-amber-300'}`}>
                      ?꾩옱 濡쒖뺄 ?몄쬆 ?곹깭: {hasSession ? '?몄쬆 ?꾨즺 (利됱떆 援щ룞 媛??' : '理쒖큹 1??濡쒓렇???湲?以?}
                    </h4>
                    <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                      {hasSession 
                        ? '?ㅼ씠踰?濡쒓렇???몄뀡 荑좏궎媛 ?대? 援ъ썙???덉뒿?덈떎. ?덉빟 湲 諛쒗뻾 ???щ＼ 釉뚮씪?곗? 濡쒓렇??李??놁씠 諛깃렇?쇱슫?쒖뿉??諛붾줈 ?먮룞 ?ъ뒪?낆씠 ?묐룞?⑸땲??' 
                        : '?꾩쭅 濡쒓렇???몄뀡(naver_session.json)????λ릺吏 ?딆븯?듬땲?? ?덉빟 諛쒗뻾???쒖옉?섍린 ?꾩뿉 理쒖큹 1??濡쒓렇??李쎌쓣 ?댁뼱 ?몄쬆??吏꾪뻾??二쇱뀛???ㅽ넗?뚯씪?우씠 ?쒖꽦?붾맗?덈떎.'}
                    </p>
                  </div>
                </div>

                {/* 1. ?곕??먯뿉??吏곸젒 ?ㅽ뻾 諛?吏꾨떒?섍린 */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#03C75A]"></span>
                    諛⑸쾿 1. ?곕??먯뿉??吏곸젒 ?ㅽ뻾?섏뿬 ?ㅼ떆媛?濡쒓렇 寃利?                  </h4>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    濡쒖뺄 PC?먯꽌 <strong>PowerShell</strong> ?먮뒗 <strong>紐낅졊 ?꾨＼?꾪듃(CMD)</strong>瑜??닿퀬 ?꾨옒 紐낅졊?대? ?쒖꽌?濡??ㅽ뻾??蹂댁꽭??
                  </p>
                  
                  <div className="space-y-3">
                    {/* 1?④퀎 紐낅졊??*/}
                    <div className="bg-gray-950/80 rounded-2xl p-4 border border-gray-850 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-gray-400 font-medium">
                        <span>???꾨줈?앺듃 猷⑦듃 寃쎈줈濡??대룞</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText("cd c:\\dev\\egdesk-FreeSMS");
                            showToast("?대룞 紐낅졊?닿? ?대┰蹂대뱶??蹂듭궗?섏뿀?듬땲??", "success");
                          }}
                          className="px-2 py-0.5 rounded bg-gray-850 hover:bg-gray-800 text-gray-300 active:scale-95 transition-all flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" />
                          <span>蹂듭궗</span>
                        </button>
                      </div>
                      <code className="block text-xs font-mono text-emerald-400 bg-black/40 p-2.5 rounded-xl border border-gray-900/50">
                        cd c:\dev\egdesk-FreeSMS
                      </code>
                    </div>

                    {/* 2?④퀎 紐낅졊??*/}
                    <div className="bg-gray-950/80 rounded-2xl p-4 border border-gray-850 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-gray-400 font-medium">
                        <span>???먮룞???곕が ?섎룞 援щ룞</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText("npm run naver:daemon");
                            showToast("?곕が ?ㅽ뻾 紐낅졊?닿? ?대┰蹂대뱶??蹂듭궗?섏뿀?듬땲??", "success");
                          }}
                          className="px-2 py-0.5 rounded bg-gray-850 hover:bg-gray-800 text-gray-300 active:scale-95 transition-all flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" />
                          <span>蹂듭궗</span>
                        </button>
                      </div>
                      <code className="block text-xs font-mono text-emerald-400 bg-black/40 p-2.5 rounded-xl border border-gray-900/50">
                        npm run naver:daemon
                      </code>
                    </div>
                  </div>

                  {/* ?ㅽ뻾 濡쒓렇 媛?대뱶 */}
                  <div className="p-4 bg-gray-950/40 rounded-2xl border border-gray-850 space-y-3">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">?뱥 ?뺤긽 ?숈옉 ???곕???濡쒓렇 寃곌낵</span>
                    <div className="space-y-2.5 text-xs">
                      <div className="flex items-start gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 font-mono text-[10px] shrink-0 mt-0.5">?湲?紐⑤뱶</span>
                        <span className="text-gray-400">
                          ?덉빟湲???놁쑝硫?<code className="text-gray-300 font-mono font-semibold">"?뮘 ?꾩옱 湲곗? ?ㅽ뻾?댁빞 ??諛쒗뻾 ?덉젙 ?덉빟湲???놁뒿?덈떎..."</code> 濡쒓렇? ?④퍡 ?덉쟾 醫낅즺?섎ŉ ?湲?紐⑤뱶濡??ㅼ뼱媛묐땲?? (吏洹뱁엳 ?뺤긽?곸씤 ?곹깭?낅땲??)
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 font-mono text-[10px] shrink-0 mt-0.5">理쒖큹 援щ룞</span>
                        <span className="text-gray-400">
                          濡쒓렇??荑좏궎 ?몄뀡???놁쓣 寃쎌슦 ?щ＼ 釉뚮씪?곗?媛 ?먮룞?쇰줈 ?붾㈃???앹뾽?⑸땲?? <strong>3遺??대궡</strong>??濡쒓렇??諛??ㅻ쭏?명룿 2?④퀎 ?몄쬆??留덉튂硫??몄쬆???꾩갑 ?깅줉?⑸땲??
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. ??UI?먯꽌 ?먭꺽?쇰줈 濡쒓렇??釉뚮씪?곗? ?앹뾽?쒗궎湲?*/}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#03C75A]"></span>
                    諛⑸쾿 2. ??釉뚮씪?곗??먯꽌 ?먭꺽?쇰줈 濡쒓렇??李??ㅽ뻾
                  </h4>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    ?곕????ㅽ뻾???대젮?곗떆?ㅻ㈃, ?명꽣??釉뚮씪?곗? 二쇱냼李쎌뿉 ?꾨옒 二쇱냼瑜??낅젰?섍퀬 ?뷀꽣瑜??뚮윭??濡쒖뺄 PC ?붾㈃??利됱떆 濡쒓렇??李쎌씠 ?ㅽ뻾?⑸땲??
                  </p>
                  
                  <div className="bg-gray-950/80 rounded-2xl p-4 border border-gray-850 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-gray-400 font-medium">
                      <span>?몄쬆 釉뚮씪?곗? 湲곕룞 API</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText("http://localhost:3000/api/naver-blog/settings?action=trigger_session");
                          showToast("API 二쇱냼媛 蹂듭궗?섏뿀?듬땲??", "success");
                        }}
                        className="px-2 py-0.5 rounded bg-gray-850 hover:bg-gray-800 text-gray-300 active:scale-95 transition-all flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        <span>蹂듭궗</span>
                      </button>
                    </div>
                    <code className="block text-xs font-mono text-emerald-400 bg-black/40 p-2.5 rounded-xl border border-gray-900/50 break-all">
                      http://localhost:3000/api/naver-blog/settings?action=trigger_session
                    </code>
                  </div>
                </div>

                {/* 3. 濡쒓렇???꾨즺 ??寃利??뚯씪 泥댄겕 */}
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#03C75A]"></span>
                    諛⑸쾿 3. ?뚯씪 議댁옱 ?щ?瑜??듯븳 ?꾨꼍 寃利?                  </h4>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    濡쒓렇???몄뀡???덉쟾?섍쾶 ??λ릺硫? ?꾨줈?앺듃 猷⑦듃??<code className="text-gray-300 font-mono font-semibold">scripts/</code> ?대뜑 ?댁뿉 <strong>`naver_session.json`</strong> ?뚯씪???앹꽦?섏뼱 ?덈뒗 寃껋쓣 蹂????덉뒿?덈떎. ???뚯씪??議댁옱?쒕떎硫??뺤긽?곸쑝濡??湲?諛??묐룞??以鍮꾨맂 ?곹깭?낅땲??
                  </p>
                </div>

              </div>

              {/* ?섎떒 ?명꽣 */}
              <div className="px-6 py-4 border-t border-gray-800 bg-gray-950/60 flex justify-end">
                <button
                  onClick={() => setIsDaemonInfoOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-[#03C75A] text-white hover:bg-emerald-600 transition-all text-xs font-bold active:scale-95 shadow-md shadow-emerald-500/10"
                >
                  ?뺤씤 ?꾨즺 諛??リ린
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
