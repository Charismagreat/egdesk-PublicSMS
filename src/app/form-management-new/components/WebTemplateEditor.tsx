'use client';

import { apiFetch } from '@/lib/api';
import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Upload, 
  Sparkles, 
  Save, 
  Copy, 
  Check, 
  RefreshCw, 
  FileCode,
  Laptop,
  Globe,
  X
} from 'lucide-react';
import html2canvas from 'html2canvas';

interface WebTemplateEditorProps {
  templateId?: number;
  onBack: () => void;
  onSaved: () => void;
}

// 회사 도장 마우스 드래그앤드롭 및 크기 조절 이벤트 할당 헬퍼
const setupSealInteractions = (doc: Document, type: 'print' | 'web') => {
  doc.body.classList.add('editing-mode');
  
  const wrapper = doc.querySelector('.company-seal-wrapper') as HTMLElement;
  if (!wrapper) return;

  const card = doc.querySelector('.card, .web-card, .page, [class*="page"], .A4, .a4') as HTMLElement;
  if (card) {
    card.style.position = 'relative';
    if (wrapper.parentElement !== card) {
      // body 기준의 절대 좌표를 card 기준의 상대 좌표로 보정
      const wrapperRect = wrapper.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      
      let relativeLeft = wrapperRect.left - cardRect.left;
      let relativeTop = wrapperRect.top - cardRect.top;
      
      const cardHeight = card.offsetHeight || card.clientHeight || 1000;
      
      // 구버전 절대좌표 오염 검출: top이 너무 크거나 카드를 벗어날 때 강제 리셋
      if (relativeTop > cardHeight - 120 || relativeTop > 800) {
        relativeTop = cardHeight - 100;
        relativeLeft = type === 'print' ? 520 : 320;
        console.log(`⚠️ [Seal Reset] 비정상적인 구버전 절대좌표가 검출되어 대표이사 이름 옆으로 초기화했습니다: left=${relativeLeft}px, top=${relativeTop}px`);
      }
      
      card.appendChild(wrapper);
      
      wrapper.style.left = `${relativeLeft}px`;
      wrapper.style.top = `${relativeTop}px`;
    }
  }

  const resizer = wrapper.querySelector('.seal-resizer') as HTMLElement;
  let isDragging = false;
  let isResizing = false;
  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let startTop = 0;
  let startWidth = 0;
  let startHeight = 0;

  wrapper.addEventListener('mousedown', (e: MouseEvent) => {
    if (e.target === resizer) return;
    e.preventDefault();
    e.stopPropagation();
    isDragging = true;
    wrapper.classList.add('active');
    startX = e.clientX;
    startY = e.clientY;
    startLeft = parseInt(wrapper.style.left) || 0;
    startTop = parseInt(wrapper.style.top) || 0;
  });

  if (resizer) {
    resizer.addEventListener('mousedown', (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      isResizing = true;
      wrapper.classList.add('active');
      startX = e.clientX;
      startY = e.clientY;
      startWidth = parseInt(wrapper.style.width) || 60;
      startHeight = parseInt(wrapper.style.height) || 60;
    });
  }

  doc.addEventListener('mousemove', (e: MouseEvent) => {
    if (isDragging) {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      wrapper.style.left = `${startLeft + dx}px`;
      wrapper.style.top = `${startTop + dy}px`;
    } else if (isResizing) {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const newSize = Math.max(30, Math.min(250, startWidth + dx));
      wrapper.style.width = `${newSize}px`;
      wrapper.style.height = `${newSize}px`;
    }
  });

  const handleMouseUp = () => {
    if (isDragging || isResizing) {
      isDragging = false;
      isResizing = false;
      wrapper.classList.remove('active');
      if ((window as any).onSealLayoutChanged) {
        (window as any).onSealLayoutChanged(
          type,
          wrapper.style.left,
          wrapper.style.top,
          wrapper.style.width
        );
      }
    }
  };

  // 도장 영역 외부 클릭 시 활성화 테두리 제거
  doc.addEventListener('mousedown', (e: MouseEvent) => {
    if (!wrapper.contains(e.target as Node)) {
      wrapper.classList.remove('active');
    }
  });

  doc.addEventListener('mouseup', handleMouseUp);
};

export default function WebTemplateEditor({ templateId, onBack, onSaved }: WebTemplateEditorProps) {
  const [templateName, setTemplateName] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [webHtmlContent, setWebHtmlContent] = useState(''); // 웹 전용 HTML 소스 코드
  const [isActive, setIsActive] = useState(true);
  
  // 파일 업로드 및 변환 상태
  const [isUploading, setIsUploading] = useState(false);
  const [detectedFields, setDetectedFields] = useState<string[]>([]);
  
  // AI 피드백 튜닝 상태
  const [feedback, setFeedback] = useState('');
  const [companyProfile, setCompanyProfile] = useState<any>({});

  // 영역 지정 가이드라인 캡처 상태 변수
  const [isCaptureMode, setIsCaptureMode] = useState(false);
  const [captureImage, setCaptureImage] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragBox, setDragBox] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [captureTarget, setCaptureTarget] = useState<'print' | 'web' | null>(null);

  useEffect(() => {
    const fetchCompanyProfile = async () => {
      try {
        const res = await apiFetch('/api/settings?key=my_company_profile');
        const data = await res.json();
        if (data.success && data.value) {
          const parsed = JSON.parse(data.value);
          setCompanyProfile(parsed);
        }
      } catch (err) {
        console.error('에디터에서 회사 프로필 로드 실패:', err);
      }
    };
    fetchCompanyProfile();
  }, []);

  // iframe 내부에서 드래그/리사이즈 완료 시 호출되는 글로벌 콜백
  useEffect(() => {
    (window as any).onSealLayoutChanged = (type: 'print' | 'web', left: string, top: string, size: string) => {
      const updateHtmlStyle = (html: string) => {
        const regex = /(<div[^>]*class="company-seal-wrapper"[^>]*style=")([^"]*)("[^>]*>)/i;
        if (regex.test(html)) {
          return html.replace(regex, (match, p1, p2, p3) => {
            let style = p2;
            style = style.replace(/left:\s*[^;]+;?/i, '');
            style = style.replace(/top:\s*[^;]+;?/i, '');
            style = style.replace(/width:\s*[^;]+;?/i, '');
            style = style.replace(/height:\s*[^;]+;?/i, '');
            const newStyle = `left: ${left}; top: ${top}; width: ${size}; height: ${size}; ${style}`;
            return `${p1}${newStyle}${p3}`;
          });
        }
        return html;
      };

      if (type === 'print') {
        setHtmlContent(prev => updateHtmlStyle(prev));
      } else {
        setWebHtmlContent(prev => updateHtmlStyle(prev));
      }
    };

    return () => {
      delete (window as any).onSealLayoutChanged;
    };
  }, []);

  const [targetPrint, setTargetPrint] = useState(true); // 인쇄용 양식 수정 활성화 여부
  const [targetWeb, setTargetWeb] = useState(true);   // 웹용 양식 수정 활성화 여부
  const [isPrintActive, setIsPrintActive] = useState(true); // 인쇄용 양식 사용 여부
  const [isWebActive, setIsWebActive] = useState(true);     // 웹용 양식 사용 여부
  const [isTuning, setIsTuning] = useState(false);
  
  // 최신 상태 실시간 동기화용 refs (iframe 내부 stale closure 버그 방지)
  const targetPrintRef = useRef(targetPrint);
  const targetWebRef = useRef(targetWeb);

  useEffect(() => {
    targetPrintRef.current = targetPrint;
  }, [targetPrint]);

  useEffect(() => {
    targetWebRef.current = targetWeb;
  }, [targetWeb]);
  
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // 모바일/소형 화면 탭 전환 상태
  const [activeTab, setActiveTab] = useState<'print' | 'web'>('print');

  // iframe 참조
  const printIframeRef = useRef<HTMLIFrameElement>(null);
  const webIframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(1);

  // 컨테이너 크기에 비례한 scale 계산 헬퍼 (A4 종이 축소 비율용)
  useEffect(() => {
    if (!htmlContent) return;

    const handleResize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight;
        
        // 안전 마진
        const padding = 24;
        const targetWidth = Math.max(containerWidth - padding, 200);
        const targetHeight = Math.max(containerHeight - padding, 200);
        
        // A4 표준 해상도 794 x 1123 기준
        const scaleX = targetWidth / 794;
        const scaleY = targetHeight / 1123;
        
        const scaleVal = Math.min(scaleX, scaleY);
        setPreviewScale(Math.min(scaleVal, 1.0));
      }
    };

    handleResize();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof window !== 'undefined' && containerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        handleResize();
      });
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [htmlContent]);

  // 1. htmlContent 변경 시 {{ Mustaches }} 필드 수집 및 detectedFields 상태 동기화
  useEffect(() => {
    if (!htmlContent) {
      setDetectedFields([]);
      return;
    }

    const regex = /\{\{([^}]+)\}\}/g;
    const fieldsSet = new Set<string>();
    let match;

    while ((match = regex.exec(htmlContent)) !== null) {
      const fieldName = match[1].trim();
      if (fieldName && !fieldName.startsWith('#') && !fieldName.startsWith('/') && !fieldName.startsWith('^') && !fieldName.startsWith('>') && !fieldName.startsWith('!')) {
        fieldsSet.add(fieldName);
      }
    }

    setDetectedFields(Array.from(fieldsSet));
  }, [htmlContent]);

  // 2. 수정 모드일 때 기존 템플릿 로드
  useEffect(() => {
    if (templateId) {
      const loadTemplate = async () => {
        try {
          const res = await apiFetch(`/api/templates-new?action=detail&id=${templateId}`);
          const data = await res.json();
          if (data.success && data.template) {
            setTemplateName(data.template.template_name);
            setHtmlContent(data.template.html_content || '');
            setWebHtmlContent(data.template.web_html_content || '');
            setIsActive(data.template.is_active === 1);
            setIsPrintActive(data.template.is_print_active !== 0);
            setIsWebActive(data.template.is_web_active !== 0);

            // 데이터 존재 여부에 따른 타겟 자동 체크 제어 (데이터가 존재하는 것만 활성화)
            const hasPrint = !!data.template.html_content;
            const hasWeb = !!data.template.web_html_content;
            if (hasPrint || hasWeb) {
              setTargetPrint(hasPrint && data.template.is_print_active !== 0);
              setTargetWeb(hasWeb && data.template.is_web_active !== 0);
            }
          }
        } catch (err) {
          console.error('템플릿 상세 로드 실패:', err);
        }
      };
      loadTemplate();
    }
  }, [templateId]);

  // 3. 인쇄용 iframe 프리뷰 연동
  useEffect(() => {
    if (printIframeRef.current && htmlContent) {
      const doc = printIframeRef.current.contentDocument || printIframeRef.current.contentWindow?.document;
      if (doc) {
        doc.open();
        const styleTag = `<style>
          html, body { 
            margin: 0 !important; 
            padding: 0 !important; 
            width: 794px !important; 
            height: 1123px !important; 
            overflow: hidden !important; 
            box-sizing: border-box !important;
            background-color: #ffffff !important;
          }
          .page, .sheet, [class*="page"], [class*="sheet"] {
            width: 100% !important;
            height: 100% !important;
            margin: 0 !important;
            box-shadow: none !important;
            box-sizing: border-box !important;
          }
          @media print {
            html, body { 
              margin: 0 !important; 
              padding: 0 !important; 
              overflow: visible !important; 
              height: auto !important; 
            }
          }

          /* 🏢 회사 도장 에디팅 스타일 가이드 */
          .editing-mode .company-seal-wrapper {
            border: 1px dashed transparent !important;
            transition: border-color 0.15s;
          }
          .editing-mode .company-seal-wrapper:hover,
          .editing-mode .company-seal-wrapper.active {
            border: 1px dashed #6366f1 !important;
          }
          .editing-mode .seal-resizer {
            display: none !important;
          }
          .editing-mode .company-seal-wrapper:hover .seal-resizer,
          .editing-mode .company-seal-wrapper.active .seal-resizer {
            display: block !important;
          }
          @media print {
            .company-seal-wrapper {
              border: none !important;
            }
            .seal-resizer {
              display: none !important;
            }
          }
        </style>`;
        
        let styledHtml = htmlContent;
        if (htmlContent.includes('</head>')) {
          styledHtml = htmlContent.replace('</head>', `${styleTag}</head>`);
        } else if (htmlContent.includes('</HEAD>')) {
          styledHtml = htmlContent.replace('</HEAD>', `${styleTag}</HEAD>`);
        } else {
          styledHtml = htmlContent + styleTag;
        }
        doc.write(styledHtml);
        doc.close();

        // 드래그앤드롭 및 리사이즈 활성화
        setupSealInteractions(doc, 'print');

        // iframe 내부 클릭 시에도 부모의 토글 작동 지원 (pointer-events-none을 풀기 위함)
        doc.body.addEventListener('click', () => {
          handleToggleTarget('print');
        });
      }
    }
  }, [htmlContent]);

  // 4. 웹페이지용 iframe 프리뷰 연동
  useEffect(() => {
    if (webIframeRef.current && webHtmlContent) {
      const doc = webIframeRef.current.contentDocument || webIframeRef.current.contentWindow?.document;
      if (doc) {
        doc.open();
        const styleTag = `<style>
          html { 
            margin: 0 !important; 
            padding: 0 !important; 
            width: 100% !important; 
            height: 100% !important; 
            box-sizing: border-box !important;
          }
          body { 
            margin: 0 !important; 
            padding: 40px 20px !important; 
            width: 100% !important; 
            min-height: 100% !important; 
            height: auto !important;
            box-sizing: border-box !important;
            background-color: #f8fafc !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: flex-start !important;
            align-items: center !important;
            overflow-y: auto !important;
          }

          /* 🏢 회사 도장 에디팅 스타일 가이드 */
          .editing-mode .company-seal-wrapper {
            border: 1px dashed transparent !important;
            transition: border-color 0.15s;
          }
          .editing-mode .company-seal-wrapper:hover,
          .editing-mode .company-seal-wrapper.active {
            border: 1px dashed #6366f1 !important;
          }
          .editing-mode .seal-resizer {
            display: none !important;
          }
          .editing-mode .company-seal-wrapper:hover .seal-resizer,
          .editing-mode .company-seal-wrapper.active .seal-resizer {
            display: block !important;
          }
          @media print {
            .company-seal-wrapper {
              border: none !important;
            }
            .seal-resizer {
              display: none !important;
            }
          }
        </style>`;
        
        let styledHtml = webHtmlContent;
        if (webHtmlContent.includes('</head>')) {
          styledHtml = webHtmlContent.replace('</head>', `${styleTag}</head>`);
        } else if (webHtmlContent.includes('</HEAD>')) {
          styledHtml = webHtmlContent.replace('</HEAD>', `${styleTag}</HEAD>`);
        } else {
          styledHtml = webHtmlContent + styleTag;
        }
        doc.write(styledHtml);
        doc.close();

        // 드래그앤드롭 및 리사이즈 활성화
        setupSealInteractions(doc, 'web');

        // iframe 내부 클릭 시에도 부모의 토글 작동 지원 (pointer-events-none을 풀기 위함)
        doc.body.addEventListener('click', () => {
          handleToggleTarget('web');
        });
      }
    }
  }, [webHtmlContent]);

  // 파일 업로드 처리 및 AI HTML 동시 변환 호출
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Data = reader.result as string;
        
        const res = await apiFetch('/api/templates-new/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64Data,
            filename: file.name,
            mimeType: file.type
          })
        });

        const data = await res.json();
        if (data.success) {
          if (targetPrint) {
            setHtmlContent(data.html); // 인쇄용 HTML 업데이트
          }
          if (targetWeb) {
            setWebHtmlContent(data.webHtml || ''); // 웹용 HTML 업데이트
          }
          setDetectedFields(data.detectedFields || []);
          if (!templateName) {
            const defaultName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
            setTemplateName(`${defaultName} - AI 변환 양식`);
          }
        } else {
          alert(`양식 분석 및 HTML 변환에 실패했습니다:\n${data.error}`);
        }
        setIsUploading(false);
      };
    } catch (err: any) {
      console.error(err);
      alert(`파일 변환 오류: ${err.message}`);
      setIsUploading(false);
    }
  };

  // 디자인 수정 타겟 토글 제어 헬퍼 (최소 1개 선택 강제)
  const handleToggleTarget = (type: 'print' | 'web') => {
    const currentPrint = targetPrintRef.current;
    const currentWeb = targetWebRef.current;

    if (type === 'print') {
      if (currentPrint && !currentWeb) {
        alert('디자인 수정 대상은 최소 하나 이상 선택되어야 합니다.');
        return;
      }
      setTargetPrint(!currentPrint);
    } else {
      if (!currentPrint && currentWeb) {
        alert('디자인 수정 대상은 최소 하나 이상 선택되어야 합니다.');
        return;
      }
      setTargetWeb(!currentWeb);
    }
  };

  // 드래그 시작 핸들러
  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>, target: 'print' | 'web') => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;
    
    setCaptureTarget(target);
    setDragStart({ x: startX, y: startY });
    setDragBox({ left: startX, top: startY, width: 0, height: 0 });
  };

  // 드래그 중 핸들러
  const handleDragMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragStart) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    const left = Math.min(dragStart.x, currentX);
    const top = Math.min(dragStart.y, currentY);
    const width = Math.abs(dragStart.x - currentX);
    const height = Math.abs(dragStart.y - currentY);

    setDragBox({ left, top, width, height });
  };

  // 드래그 종료 핸들러
  const handleDragEnd = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragStart || !dragBox) return;

    const currentBox = { ...dragBox };
    const targetType = captureTarget;

    // 즉시 상태 리셋하여 UI 드래그 박스 숨김
    setDragStart(null);
    setDragBox(null);

    // 드래그 영역이 너무 작으면 캡처 무시 (단순 클릭 방지)
    if (currentBox.width < 5 || currentBox.height < 5) return;

    const iframe = targetType === 'print' ? printIframeRef.current : webIframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    const overlayWidth = e.currentTarget.clientWidth;
    const overlayHeight = e.currentTarget.clientHeight;

    try {
      // iframe 내부의 실제 뷰포트 크기 (CSS 픽셀 단위)
      // print의 경우 iframe은 transform: scale로 줄어들어있지만 실제 iframe 크기는 794px 임
      // web의 경우 iframe은 transform scale 없이 w-full h-full이므로 clientWidth와 iframe 뷰포트가 동일함
      const iframeWidth = iframe.clientWidth || doc.documentElement.clientWidth || 794;
      const iframeHeight = iframe.clientHeight || doc.documentElement.clientHeight || 1123;

      // 전체 문서의 실제 크기 (세로 잘림 방지를 위해 scrollHeight를 적용)
      const docWidth = doc.documentElement.scrollWidth || doc.body.scrollWidth || 794;
      const docHeight = doc.documentElement.scrollHeight || doc.body.scrollHeight || 1123;

      // html2canvas로 iframe body 영역 스크린샷
      // 가로 리플로우를 막기 위해 가로폭은 뷰포트 크기(iframeWidth)로 고정하되, 세로는 전체 문서(docHeight)가 다 나오도록 캡처 범위를 지정합니다.
      const canvas = await html2canvas(doc.body, {
        useCORS: true,
        backgroundColor: null,
        logging: false,
        scrollX: 0,
        scrollY: 0,
        width: iframeWidth,
        height: docHeight,
        windowWidth: iframeWidth,
        windowHeight: docHeight
      });

      const ctx = canvas.getContext('2d');
      if (ctx) {
        // html2canvas 결과물(canvas)과 실제 문서 크기 사이의 비율 (가로는 뷰포트 고정폭, 세로는 전체 문서높이 기준)
        const scaleRatioX = canvas.width / iframeWidth;
        const scaleRatioY = canvas.height / docHeight;

        // 오버레이(e.currentTarget) 크기와 iframe 뷰포트(CSS 픽셀 단위) 크기 사이의 비율
        // print의 경우 overlayWidth = 794 * previewScale, iframeWidth = 794 이므로 overlayScale = 794 / overlayWidth
        // web의 경우 overlayWidth와 iframeWidth가 거의 1:1로 같음
        const overlayScaleX = iframeWidth / overlayWidth;
        const overlayScaleY = iframeHeight / overlayHeight;

        // iframe 내의 스크롤 위치
        const scrollX = iframe.contentWindow?.scrollX || doc.documentElement.scrollLeft || doc.body.scrollLeft || 0;
        const scrollY = iframe.contentWindow?.scrollY || doc.documentElement.scrollTop || doc.body.scrollTop || 0;

        // 1단계: 드래그 좌표(오버레이 기준) -> iframe 내부 문서 기준의 절대 CSS 픽셀 좌표로 변환
        const docX = currentBox.left * overlayScaleX + scrollX;
        const docY = currentBox.top * overlayScaleY + scrollY;
        const docW = currentBox.width * overlayScaleX;
        const docH = currentBox.height * overlayScaleY;

        // 2단계: iframe 내부 문서 절대 좌표 -> canvas 해상도 상의 픽셀 좌표로 변환
        const actualX = docX * scaleRatioX;
        const actualY = docY * scaleRatioY;
        const actualW = docW * scaleRatioX;
        const actualH = docH * scaleRatioY;

        console.log('[Capture Debug] Target:', targetType);
        console.log('[Capture Debug] Canvas size:', canvas.width, 'x', canvas.height);
        console.log('[Capture Debug] Scroll:', scrollX, scrollY);
        console.log('[Capture Debug] Scale Ratios:', scaleRatioX, scaleRatioY);
        console.log('[Capture Debug] Overlay Scales:', overlayScaleX, overlayScaleY);
        console.log('[Capture Debug] Document coords:', docX, docY, docW, docH);
        console.log('[Capture Debug] Draw coords:', actualX, actualY, actualW, actualH);

        // 2중 테두리(바깥 흰색 + 안쪽 빨간색) 드로잉을 통해 가독성 극대화 및 shadow 관련 캔버스 렌더링 버그 방지
        ctx.save();
        
        // 캔버스 변환 행렬을 초기화하여 html2canvas가 걸어둔 DPR scale(고해상도 배율)의 중복 적용으로 선이 화면 밖으로 밀려나는 현상 방지
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        // 1. 바깥쪽 흰색 외곽선 (가독성 보조용, 두께 8px 수준)
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(8, Math.round(canvas.width / 120));
        ctx.strokeRect(actualX, actualY, actualW, actualH);
        
        // 2. 안쪽 강렬한 빨간색 실선 (실제 가이드라인, 두께 4px 수준)
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = Math.max(4, Math.round(canvas.width / 240));
        ctx.strokeRect(actualX, actualY, actualW, actualH);
        
        ctx.restore();
      }

      // 용량 압축을 위해 JPEG 80%로 Base64 추출
      const base64Jpg = canvas.toDataURL('image/jpeg', 0.8);
      setCaptureImage(base64Jpg);
    } catch (err) {
      console.error('영역 캡처 실패:', err);
      alert('화면 캡처 중 오류가 발생했습니다.');
    }
  };

  // 자연어 피드백 기반 디자인 튜닝 적용
  const handleApplyTuning = async () => {
    if (!feedback.trim()) {
      alert('수정이나 디자인 보완을 원하는 요구사항을 입력해 주세요.');
      return;
    }
    if (!htmlContent) {
      alert('분석된 양식 HTML 코드가 존재해야 튜닝이 가능합니다. 먼저 양식 파일을 등록해 주세요.');
      return;
    }

    // 전송할 타겟 값 연산
    let targetVal: 'all' | 'print' | 'web' = 'all';
    if (targetPrint && !targetWeb) targetVal = 'print';
    else if (!targetPrint && targetWeb) targetVal = 'web';

    setIsTuning(true);
    try {
      const res = await apiFetch('/api/templates-new/tune', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html: htmlContent,
          webHtml: webHtmlContent,
          feedback: feedback,
          target: targetVal,
          captureImage: captureImage // 빨간 박스 가이드 캡처 추가
        })
      });

      const data = await res.json();
      if (data.success) {
        setHtmlContent(data.html);
        setWebHtmlContent(data.webHtml || '');
        setCaptureImage(null); // 수정 완료 시 첨부 캡처 자동 제거
        if (data.detectedFields && data.detectedFields.length > 0) {
          setDetectedFields(data.detectedFields);
        }
        setFeedback(''); // 피드백 필드 초기화
      } else {
        alert(`디자인 튜닝 적용 실패:\n${data.error}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`AI 튜닝 통신 에러: ${err.message}`);
    } finally {
      setIsTuning(false);
    }
  };

  // 클립보드 복사 헬퍼
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(text);
    setTimeout(() => setCopiedField(null), 1500);
  };

  // 회사 도장(직인) 자동 주입 및 교체 함수
  const handleInsertSeal = (sealBase64: string) => {
    let updatedPrintHtml = htmlContent;
    let updatedWebHtml = webHtmlContent;
    let success = false;

    const insertIntoHtml = (html: string, type: 'print' | 'web') => {
      const size = '60px';
      const left = type === 'print' ? '600px' : '550px';
      const top = type === 'print' ? '960px' : '750px';

      const sealWrapperTag = `<div class="company-seal-wrapper" style="width: ${size}; height: ${size}; position: absolute; left: ${left}; top: ${top}; z-index: 999; cursor: move; box-sizing: border-box; mix-blend-mode: multiply;"><img src="${sealBase64}" alt="회사직인" style="width: 100%; height: 100%; object-fit: contain; display: block; pointer-events: none;" /><div class="seal-resizer" style="width: 10px; height: 10px; background: #6366f1; position: absolute; right: -5px; bottom: -5px; cursor: se-resize; border-radius: 50%; z-index: 1000;"></div></div>`;

      // 1. 기존에 주입된 도장 래퍼가 이미 존재하면 새 도장 이미지로 치환 (위치/크기는 유지하고 src만 교체)
      const wrapperRegex = /(<div[^>]*class="company-seal-wrapper"[^>]*>)([\s\S]*?)(<\/div>)/i;
      if (wrapperRegex.test(html)) {
        return html.replace(wrapperRegex, (match, p1, p2, p3) => {
          const imgReplacer = p2.replace(/src="([^"]*)"/i, `src="${sealBase64}"`);
          return `${p1}${imgReplacer}${p3}`;
        });
      }

      // 2. 신규 주입의 경우, </body> 바로 앞에 주입
      if (html.includes('</body>')) {
        return html.replace('</body>', `${sealWrapperTag}</body>`);
      }
      if (html.includes('</BODY>')) {
        return html.replace('</BODY>', `${sealWrapperTag}</BODY>`);
      }

      return html + sealWrapperTag;
    };

    if (targetPrint && htmlContent) {
      updatedPrintHtml = insertIntoHtml(htmlContent, 'print');
      setHtmlContent(updatedPrintHtml);
      success = true;
    }

    if (targetWeb && webHtmlContent) {
      updatedWebHtml = insertIntoHtml(webHtmlContent, 'web');
      setWebHtmlContent(updatedWebHtml);
      success = true;
    }

    if (success) {
      alert('선택하신 도장 주입이 완료되었습니다. 마우스로 도장을 드래그하여 원하는 위치로 이동시키거나 우측 하단 핸들을 조절해 크기를 변경해 보세요.');
    } else {
      alert('도장 이미지를 주입할 HTML 콘텐츠가 존재하지 않습니다.');
    }
  };

  // 주입된 도장 삭제(주입 취소) 핸들러
  const handleRemoveSeal = () => {
    const removeSealFromHtml = (html: string) => {
      // <div class="company-seal-wrapper">...</div> 태그와 내부 콘텐츠 전체를 삭제하는 정규식
      const wrapperRegex = /<div[^>]*class="company-seal-wrapper"[^>]*>([\s\S]*?)<\/div>/gi;
      return html.replace(wrapperRegex, '');
    };

    let updated = false;
    if (htmlContent && htmlContent.includes('company-seal-wrapper')) {
      setHtmlContent(removeSealFromHtml(htmlContent));
      updated = true;
    }
    if (webHtmlContent && webHtmlContent.includes('company-seal-wrapper')) {
      setWebHtmlContent(removeSealFromHtml(webHtmlContent));
      updated = true;
    }

    if (updated) {
      alert('주입된 회사 도장이 제거되었습니다. (최종 반영을 위해 하단의 저장 버튼을 클릭해 주세요)');
    } else {
      alert('현재 주입된 도장이 존재하지 않습니다.');
    }
  };

  // 최종 저장 제출
  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      alert('템플릿 명칭을 입력해 주세요.');
      return;
    }
    if (!htmlContent.trim()) {
      alert('등록할 HTML 양식 내용이 비어있습니다. 양식 업로드 혹은 코드를 완성해 주세요.');
      return;
    }

    try {
      const res = await apiFetch('/api/templates-new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: templateId,
          template_name: templateName,
          document_type: '',
          html_content: htmlContent,
          web_html_content: webHtmlContent,
          is_active: isActive ? 1 : 0,
          is_print_active: isPrintActive ? 1 : 0,
          is_web_active: isWebActive ? 1 : 0
        })
      });

      const data = await res.json();
      if (data.success) {
        alert(templateId ? '양식이 성공적으로 수정되었습니다.' : '신규 AI 반응형 양식이 성공적으로 등록되었습니다.');
        onSaved();
      } else {
        alert(`양식 저장 실패: ${data.error}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`서버 저장 오류: ${err.message}`);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* 탑 네비게이션 헤더 */}
      <div className="px-6 py-4 bg-slate-950 border-b border-slate-850 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-3 flex-row text-left">
          <button 
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="text-left">
            <h2 className="text-sm font-black text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-400" />
              {templateId ? '양식 관리 AI - 양식 수정' : '양식 관리 AI - 2열 듀얼 양식 제작'}
            </h2>
            <p className="text-[10px] text-slate-500 font-bold mt-0.5">
              각 미리보기 화면 창을 직접 클릭하여 디자인 수정 대상(타겟)을 시각적으로 지정할 수 있습니다.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <label className="flex items-center gap-2 text-xs font-black text-slate-400 mr-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
              className="rounded border-slate-700 bg-slate-800 text-violet-650 focus:ring-violet-500"
            />
            양식 활성화
          </label>
          <button
            onClick={handleSaveTemplate}
            className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-extrabold text-xs transition shadow-lg shadow-violet-600/10 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            최종 승인 및 저장
          </button>
        </div>
      </div>

      {/* 메인 분할 워크스페이스 */}
      <div className="flex-1 flex overflow-hidden min-h-0 bg-slate-900">
        
        {/* 1단: 좌측 설정 및 매핑 패널 */}
        <div className="w-[340px] border-r border-slate-850 flex flex-col bg-slate-950 p-5 overflow-y-auto shrink-0 gap-6">
          
          {/* 양식 기본 설정 */}
          <div className="space-y-2 text-left">
            <h3 className="text-xs font-black text-slate-400 tracking-wider uppercase flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-violet-400" />
              양식명
            </h3>
            <div className="pt-1">
              <input 
                type="text"
                placeholder="예: 재직 증명서"
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 focus:border-violet-650 focus:outline-none text-xs text-white font-bold placeholder-slate-600 shadow-sm transition"
              />
            </div>
          </div>

          {/* AI 이미지/PDF 분석 변환 업로드 존 */}
          <div className="space-y-3.5 text-left">
            <h3 className="text-xs font-black text-slate-400 tracking-wider uppercase flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-violet-400" />
              양식 파일 업로드
            </h3>
            
            <div className="relative border-2 border-dashed border-slate-800 hover:border-violet-600/50 rounded-2xl p-4.5 text-center transition bg-slate-900/30 flex flex-col items-center justify-center min-h-[85px] group">
              <input 
                type="file" 
                accept="image/*,application/pdf"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isUploading}
              />
              {isUploading ? (
                <div className="space-y-1">
                  <RefreshCw className="w-5 h-5 animate-spin text-violet-500 mx-auto" />
                  <p className="text-[10px] font-extrabold text-slate-300">Gemini JSON 듀얼 변환 중...</p>
                  <p className="text-[8px] font-semibold text-slate-500">인쇄용 A4 & 모던 웹페이지 코딩 중</p>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3">
                  <div className="p-2 bg-slate-950 rounded-full text-slate-400 group-hover:text-violet-400 transition shrink-0">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div className="text-left leading-normal">
                    <p className="text-[11px] font-extrabold text-slate-300">이미지 또는 PDF 드래그</p>
                    <p className="text-[9px] font-bold text-slate-500 mt-0.5">A4 비율의 원본 양식 이미지</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AI로 추출된 감지 필드 */}
          {detectedFields.length > 0 && (
            <div className="space-y-2 text-left">
              <h3 className="text-xs font-black text-slate-400 tracking-wider uppercase flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                감지된 바인딩 필드
              </h3>
              <p className="text-[9px] text-slate-500 font-bold leading-normal mb-1">
                아래 필드를 복사해 양식 내에 붙여넣어 활용하세요.
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {detectedFields.map(f => (
                  <button
                    key={f}
                    onClick={() => copyToClipboard(`{{${f}}}`)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300 hover:text-white hover:border-violet-500/30 transition cursor-pointer"
                  >
                    <span>{`{{${f}}}`}</span>
                    {copiedField === `{{${f}}}` ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    ) : (
                      <Copy className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 등록된 회사 도장(직인) 목록 */}
          {htmlContent && (
            <div className="space-y-2 text-left border-t border-slate-850 pt-5">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black text-slate-400 tracking-wider uppercase flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                  등록된 회사 도장
                </h3>
                <button
                  type="button"
                  onClick={handleRemoveSeal}
                  className="px-2 py-1 text-[9px] font-black bg-rose-950/40 hover:bg-rose-900 border border-rose-800/40 hover:border-rose-700 text-rose-300 hover:text-white rounded-md transition cursor-pointer"
                  title="주입된 도장 전체 제거"
                >
                  주입 취소
                </button>
              </div>
              
              {!companyProfile.sealImages || companyProfile.sealImages.length === 0 ? (
                <div className="p-3 bg-slate-900 border border-slate-850 rounded-xl text-center">
                  <p className="text-[10px] text-slate-500 font-bold leading-normal">
                    등록된 회사 도장 이미지가 없습니다.<br />
                    <a href="/settings" className="text-violet-400 hover:underline font-extrabold mt-1 inline-block">
                      ⚙️ 시스템 설정에서 도장 등록하러 가기
                    </a>
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <p className="text-[9px] text-slate-500 font-bold leading-normal">
                    원하는 도장을 선택하면 현재 튜닝 중인 양식에 자동으로 주입됩니다.
                  </p>
                  <div className="flex gap-2.5 items-center flex-wrap pt-1">
                    {companyProfile.sealImages.map((seal: string, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => handleInsertSeal(seal)}
                        className="w-14 h-14 bg-slate-900 border border-slate-800 hover:border-violet-500 rounded-xl flex items-center justify-center p-1.5 transition group cursor-pointer relative shadow-inner"
                        title={`양식에 도장 ${idx + 1} 주입`}
                      >
                        <img src={seal} alt={`도장 썸네일 ${idx + 1}`} className="max-w-[90%] max-h-[90%] object-contain" />
                        <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-xl transition-opacity">
                          <span className="text-[8px] text-white font-extrabold font-sans">주입</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AI 자연어 디자인 튜닝 입력창 (이동 적용) */}
          {htmlContent && (
            <div className="space-y-2.5 text-left border-t border-slate-850 pt-5 mt-auto">
              <h3 className="text-xs font-black text-slate-400 tracking-wider uppercase flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                디자인 수정 요청
              </h3>
              
              <div className="flex items-center justify-between gap-2 pb-0.5">
                <p className="text-[9px] text-slate-500 font-bold leading-normal">
                  {targetPrint && !targetWeb
                    ? "선택된 '인쇄용 A4' 양식에 적용할 수정 요구사항을 입력하세요."
                    : !targetPrint && targetWeb
                    ? "선택된 '모던 웹페이지' 양식에 적용할 수정 요구사항을 입력하세요."
                    : "인쇄용 및 웹용 양식 '모두'에 적용할 수정 요구사항을 입력하세요."}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (isCaptureMode) {
                      setIsCaptureMode(false);
                      setDragStart(null);
                      setDragBox(null);
                    } else {
                      setIsCaptureMode(true);
                      alert('미리보기 영역 위에 마우스를 클릭한 채 드래그하여 디자인을 수정하고 싶은 영역을 지정해 주세요. 빨간색 테두리선이 쳐진 상태로 캡처됩니다.');
                    }
                  }}
                  className={`px-2.5 py-1.5 rounded-xl text-[9px] font-extrabold flex items-center gap-1 transition shrink-0 cursor-pointer ${
                    isCaptureMode 
                      ? 'bg-red-650 hover:bg-red-750 text-white animate-pulse' 
                      : 'bg-slate-900 border border-slate-800 text-slate-350 hover:text-white hover:border-violet-500'
                  }`}
                >
                  {isCaptureMode ? '캡처 취소' : '영역 가이드 캡처 📷'}
                </button>
              </div>

              {/* 캡처된 이미지 썸네일 미리보기 */}
              {captureImage && (
                <div className="relative w-full aspect-[4/3] rounded-xl border border-slate-800 bg-slate-900 overflow-hidden mb-1.5 shadow-inner group">
                  <img src={captureImage} alt="캡처 가이드 이미지" className="w-full h-full object-contain" />
                  <div className="absolute top-2 right-2 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => setCaptureImage(null)}
                      className="p-1 rounded-full bg-slate-950/70 hover:bg-red-650 text-white transition cursor-pointer"
                      title="캡처 이미지 삭제"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-slate-950/70 text-[8px] font-extrabold text-red-400 border border-red-800/30">
                    빨간 박스 영역 가이드
                  </div>
                </div>
              )}

              <div className="pt-1 space-y-2.5">
                <textarea
                  rows={4}
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  placeholder={
                    targetPrint && !targetWeb
                      ? "예: '인쇄 시 직인 영역을 5mm 아래로 이동해줘', '표의 테두리를 얇게 해줘' (인쇄용만 수정)"
                      : !targetPrint && targetWeb
                      ? "예: '카드의 그림자 크기를 줄이고, 둥글게 만들어줘', '웹 배경색을 민트톤으로 바꿀래' (웹용만 수정)"
                      : "예: '폰트를 전체적으로 Outfit으로 맞춰줘', '이름 항목에 강조색 추가해줘' (인쇄용 & 웹용 동시 수정)"
                  }
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 focus:border-violet-650 focus:outline-none text-xs text-white font-bold placeholder-slate-550 shadow-inner resize-none transition"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleApplyTuning();
                    }
                  }}
                  disabled={isTuning}
                />
                <button
                  onClick={handleApplyTuning}
                  disabled={isTuning || !feedback.trim()}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-750 text-white font-extrabold text-xs transition disabled:bg-slate-900 disabled:text-slate-600 border border-slate-850 cursor-pointer shadow-md"
                >
                  {isTuning ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" />
                      디자인 튜닝 적용 중...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      자연어 수정 요청 실행
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

        </div>

        {/* 2단: 중앙 / 우측 - 2열 듀얼 샌드박스 프리뷰 컨테이너 */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-slate-900 relative">
          
          {/* 소형 화면용 모바일 탭 바 (대화면 lg 이상에서는 자동 숨김) */}
          <div className="lg:hidden flex bg-slate-950 p-1.5 border-b border-slate-850 justify-center gap-1.5 shrink-0">
            <button 
              onClick={() => setActiveTab('print')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition cursor-pointer ${activeTab === 'print' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white bg-slate-900/40'}`}
            >
              인쇄용 A4 미리보기
            </button>
            <button 
              onClick={() => setActiveTab('web')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition cursor-pointer ${activeTab === 'web' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white bg-slate-900/40'}`}
            >
              모던 웹페이지 미리보기
            </button>
          </div>

          {/* 좌우 2열 그리드 본체 */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-0 overflow-hidden min-h-0">
            
            {/* 좌열: 인쇄용 A4 프리뷰 */}
            <div 
              onClick={() => !isCaptureMode && handleToggleTarget('print')}
              className={`flex-1 flex flex-col min-h-0 border-r border-slate-850 cursor-pointer select-none transition-all duration-205 border-2 ${
                targetPrint 
                  ? 'border-violet-650/40 bg-violet-950/5' 
                  : 'border-transparent bg-transparent'
              } ${activeTab === 'print' ? 'flex' : 'hidden lg:flex'}`}
            >
              <div className="px-5 py-2.5 bg-slate-900/60 border-b border-slate-850/60 flex items-center justify-between text-[11px] font-bold text-slate-400 shrink-0">
                <span className="flex items-center gap-1.5">
                  <Laptop className={`w-3.5 h-3.5 transition-colors ${targetPrint ? 'text-violet-400' : 'text-slate-500'}`} />
                  인쇄용 A4 미리보기 샌드박스
                </span>
                
                {/* 체크 박스 서클 */}
                <div className="flex items-center gap-3">
                  <label 
                    onClick={(e) => e.stopPropagation()} 
                    className="flex items-center gap-1.5 cursor-pointer select-none text-[10px] bg-slate-950/50 px-2 py-0.5 rounded border border-slate-800 text-slate-300 hover:text-white"
                  >
                    <input
                      type="checkbox"
                      checked={isPrintActive}
                      onChange={(e) => {
                        if (!e.target.checked && !isWebActive) {
                          alert('최소 하나 이상의 양식 형식(인쇄용 또는 웹용)은 사용하도록 설정되어야 합니다.');
                          return;
                        }
                        setIsPrintActive(e.target.checked);
                      }}
                      className="w-3 h-3 rounded accent-violet-650 cursor-pointer"
                    />
                    <span>사용 중</span>
                  </label>

                  {targetPrint && (
                    <span className="text-[9px] text-violet-400 font-extrabold uppercase tracking-wider bg-violet-950/50 px-2 py-0.5 rounded border border-violet-800/30">
                      수정 대상
                    </span>
                  )}
                  <div className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center transition-all ${
                    targetPrint 
                      ? 'bg-violet-600 border-violet-500 text-white shadow-sm shadow-violet-600/30 scale-105' 
                      : 'border-slate-700 bg-slate-900/60 text-transparent'
                  }`}>
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                </div>
              </div>
              
              <div 
                ref={containerRef} 
                className={`flex-1 p-4 flex items-center justify-center overflow-auto transition-opacity duration-205 relative ${
                  targetPrint ? 'bg-slate-950/40' : 'bg-slate-950/70 opacity-40 grayscale-[20%]'
                }`}
                style={{ minHeight: 0 }}
              >
                {/* 캡처 모드 안내 오버레이 */}
                {isCaptureMode && htmlContent && (
                  <div className="absolute inset-0 z-[9998] bg-slate-950/40 backdrop-blur-[1px] flex flex-col items-center justify-center pointer-events-none">
                    <div className="px-4 py-2 rounded-xl bg-slate-950/90 border border-slate-850 text-[10px] font-black text-white flex items-center gap-2 shadow-2xl">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                      마우스를 클릭한 채 드래그하여 수정할 영역을 지정하세요 (인쇄용)
                    </div>
                  </div>
                )}

                {htmlContent ? (
                  <div 
                    className="relative shrink-0 shadow-2xl transition-all duration-200 ease-out bg-white border border-slate-200 overflow-hidden"
                    style={{
                      width: `${794 * previewScale}px`,
                      height: `${1123 * previewScale}px`
                    }}
                  >
                    {/* 드래그 캡처용 마우스 이벤트 투명 레이어 */}
                    {isCaptureMode && (
                      <div
                        onMouseDown={(e) => handleDragStart(e, 'print')}
                        onMouseMove={handleDragMove}
                        onMouseUp={handleDragEnd}
                        className="absolute inset-0 z-[9999] cursor-crosshair bg-slate-950/5"
                      >
                        {dragBox && captureTarget === 'print' && (
                          <div
                            className="absolute border-2 border-dashed border-red-500 bg-red-500/10 pointer-events-none"
                            style={{
                              left: `${dragBox.left}px`,
                              top: `${dragBox.top}px`,
                              width: `${dragBox.width}px`,
                              height: `${dragBox.height}px`
                            }}
                          />
                        )}
                      </div>
                    )}

                    <div 
                      className="absolute left-0 top-0 overflow-hidden flex flex-col origin-top-left"
                      style={{
                        width: '794px',
                        height: '1123px',
                        transform: `scale(${previewScale})`,
                      }}
                    >
                      <iframe 
                        ref={printIframeRef}
                        title="A4 인쇄용 양식 프리뷰"
                        scrolling="no"
                        className="w-full h-full border-none"
                        style={{ overflow: 'hidden' }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-40 text-slate-600 text-center space-y-3">
                    <FileCode className="w-12 h-12 text-slate-800" />
                    <div>
                      <h4 className="text-xs font-black text-slate-550">인쇄용 A4 서식이 비어 있습니다</h4>
                      <p className="text-[10px] text-slate-600 mt-1 max-w-xs leading-relaxed">
                        왼쪽 드롭존에 원본 양식을 업로드해 주세요.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 우열: 모던 웹페이지 프리뷰 */}
            <div 
              onClick={() => !isCaptureMode && handleToggleTarget('web')}
              className={`flex-1 flex flex-col min-h-0 cursor-pointer select-none transition-all duration-205 border-2 ${
                targetWeb 
                  ? 'border-emerald-650/40 bg-emerald-950/5' 
                  : 'border-transparent bg-transparent'
              } ${activeTab === 'web' ? 'flex' : 'hidden lg:flex'}`}
            >
              <div className="px-5 py-2.5 bg-slate-900/60 border-b border-slate-850/60 flex items-center justify-between text-[11px] font-bold text-slate-400 shrink-0">
                <span className="flex items-center gap-1.5">
                  <Globe className={`w-3.5 h-3.5 transition-colors ${targetWeb ? 'text-emerald-400' : 'text-slate-500'}`} />
                  모던 웹페이지 미리보기 샌드박스
                </span>
                
                {/* 체크 박스 서클 */}
                <div className="flex items-center gap-3">
                  <label 
                    onClick={(e) => e.stopPropagation()} 
                    className="flex items-center gap-1.5 cursor-pointer select-none text-[10px] bg-slate-950/50 px-2 py-0.5 rounded border border-slate-800 text-slate-300 hover:text-white"
                  >
                    <input
                      type="checkbox"
                      checked={isWebActive}
                      onChange={(e) => {
                        if (!e.target.checked && !isPrintActive) {
                          alert('최소 하나 이상의 양식 형식(인쇄용 또는 웹용)은 사용하도록 설정되어야 합니다.');
                          return;
                        }
                        setIsWebActive(e.target.checked);
                      }}
                      className="w-3 h-3 rounded accent-emerald-600 cursor-pointer"
                    />
                    <span>사용 중</span>
                  </label>

                  {targetWeb && (
                    <span className="text-[9px] text-emerald-400 font-extrabold uppercase tracking-wider bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/30">
                      수정 대상
                    </span>
                  )}
                  <div className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center transition-all ${
                    targetWeb 
                      ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm shadow-emerald-600/30 scale-105' 
                      : 'border-slate-700 bg-slate-900/60 text-transparent'
                  }`}>
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                </div>
              </div>
              
              <div 
                className={`flex-1 p-4 flex items-stretch justify-stretch overflow-hidden transition-opacity duration-205 relative ${
                  targetWeb ? 'bg-slate-950/20' : 'bg-slate-950/70 opacity-40 grayscale-[20%]'
                }`}
                style={{ minHeight: 0 }}
              >
                {/* 캡처 모드 안내 오버레이 */}
                {isCaptureMode && webHtmlContent && (
                  <div className="absolute inset-0 z-[9998] bg-slate-950/40 backdrop-blur-[1px] flex flex-col items-center justify-center pointer-events-none">
                    <div className="px-4 py-2 rounded-xl bg-slate-950/90 border border-slate-850 text-[10px] font-black text-white flex items-center gap-2 shadow-2xl">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                      마우스를 클릭한 채 드래그하여 수정할 영역을 지정하세요 (웹용)
                    </div>
                  </div>
                )}

                {webHtmlContent ? (
                  <div className="flex-1 shadow-2xl rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden flex flex-col relative">
                    {/* 드래그 캡처용 마우스 이벤트 투명 레이어 */}
                    {isCaptureMode && (
                      <div
                        onMouseDown={(e) => handleDragStart(e, 'web')}
                        onMouseMove={handleDragMove}
                        onMouseUp={handleDragEnd}
                        className="absolute inset-0 z-[9999] cursor-crosshair bg-slate-950/5"
                      >
                        {dragBox && captureTarget === 'web' && (
                          <div
                            className="absolute border-2 border-dashed border-red-500 bg-red-500/10 pointer-events-none"
                            style={{
                              left: `${dragBox.left}px`,
                              top: `${dragBox.top}px`,
                              width: `${dragBox.width}px`,
                              height: `${dragBox.height}px`
                            }}
                          />
                        )}
                      </div>
                    )}

                    <iframe 
                      ref={webIframeRef}
                      title="모던 웹페이지 프리뷰"
                      className="w-full h-full border-none"
                    />
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center py-40 text-slate-650 text-center space-y-3 bg-slate-950/40 rounded-2xl border border-slate-900/50">
                    <Globe className="w-12 h-12 text-slate-800" />
                    <div>
                      <h4 className="text-xs font-black text-slate-550">웹페이지 서식이 존재하지 않습니다</h4>
                      <p className="text-[10px] text-slate-600 mt-1 max-w-xs leading-relaxed">
                        AI 양식 분석 완료 시 웹디자인 관점의 HTML 코드가 이곳에 함께 서빙됩니다.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
