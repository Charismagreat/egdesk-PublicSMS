'use client';

import { apiFetch } from '@/lib/api';
import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { RefreshCw, AlertCircle, Printer, X, Laptop, Globe, FileCheck } from 'lucide-react';

function PrintViewContent() {
  const searchParams = useSearchParams();
  const templateId = searchParams.get('templateId');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 인쇄 출력 모드 분기 상태: 'print' (클래식 A4) vs 'web' (세련된 모던 웹)
  const [printMode, setPrintMode] = useState<'print' | 'web'>('print');
  const [isPrintActive, setIsPrintActive] = useState(true);
  const [isWebActive, setIsWebActive] = useState(true);
  const [renderedHtml, setRenderedHtml] = useState<string>('');
  
  // 발급 완료 상태 기록 완료 여부
  const [isLogged, setIsLogged] = useState(false);

  // 동적 화면 맞춤용 스케일 상태 및 iframe 참조
  const [scale, setScale] = useState(1);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // 동적 콘텐츠 높이 감지 및 A4 핏 대응
  const [contentWidth, setContentWidth] = useState(794);
  const [contentHeight, setContentHeight] = useState(1123);

  // DB 및 localStorage에서 읽어온 상태 보존용
  const [rawData, setRawData] = useState<any>(null);
  const [templateHtml, setTemplateHtml] = useState<string>('');
  const [webTemplateHtml, setWebTemplateHtml] = useState<string>(''); // 웹 전용 HTML 템플릿
  const [companyProfileData, setCompanyProfileData] = useState<any>(null);
  const [templateName, setTemplateName] = useState<string>(''); // 템플릿 이름 저장용
  const [documentType, setDocumentType] = useState<string>('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const isScm = documentType && (
    documentType.startsWith('ESTIMATE_') || 
    documentType.startsWith('PURCHASE_ORDER_')
  );

  const handleRegisterScm = async () => {
    setIsRegistering(true);
    try {
      const res = await apiFetch('/api/estimates/direct-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_type: documentType,
          ...rawData
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || 'SCM 거래가 성공적으로 등록되었습니다.');
        localStorage.removeItem('web_form_print_data');
        if (window.opener && !window.opener.closed) {
          window.opener.location.href = '/estimates';
        } else {
          window.open('/estimates', '_blank');
        }
        window.close();
      } else {
        alert(`등록 실패: ${data.error}`);
      }
    } catch (err: any) {
      alert(`서버 통신 중 오류가 발생했습니다: ${err.message}`);
    } finally {
      setIsRegistering(false);
      setIsConfirmModalOpen(false);
    }
  };

  // 수동 입력 값들 상태 관리 (Mustache 바인딩 상태 유지용)
  const [manualData, setManualData] = useState({
    staff_name: '',
    resident_id: '',
    usage: '',
    address: '',
    position: '',
    department: '',
    issue_dept: '',
    issue_phone: '',
    issue_email: '',
    issue_fax: ''
  });

  // 재직기간 자동 계산 헬퍼 함수
  const calculateEmploymentPeriod = (joinedDateStr?: string, resignedDateStr?: string) => {
    if (!joinedDateStr) return '';
    
    const cleanDate = (dateStr: string) => {
      return dateStr.replace(/[^0-9-]/g, '');
    };
    
    const start = new Date(cleanDate(joinedDateStr));
    const end = resignedDateStr ? new Date(cleanDate(resignedDateStr)) : new Date();
    
    if (isNaN(start.getTime())) return joinedDateStr;
    
    let years = end.getFullYear() - start.getFullYear();
    let months = end.getMonth() - start.getMonth();
    let days = end.getDate() - start.getDate();
    
    if (days < 0) {
      months -= 1;
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }
    
    let periodText = '';
    if (years > 0) periodText += `${years}년 `;
    if (months > 0) periodText += `${months}개월`;
    if (periodText === '') periodText = '1개월 미만';
    
    const formatDate = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}.${m}.${d}`;
    };
    
    return `${formatDate(start)} ~ ${resignedDateStr ? formatDate(end) : '현재 재직 중'} (${periodText.trim()})`;
  };

  // 브라우저 윈도우 크기 변화 감지하여 용지 축소 스케일 계산 (동적 콘텐츠 크기 대응)
  const handleResize = () => {
    const containerWidth = window.innerWidth;
    const containerHeight = window.innerHeight;
    
    const availableWidth = containerWidth - 64;
    const availableHeight = containerHeight - 52 - 64;
    
    const scaleX = availableWidth / contentWidth;
    const scaleY = availableHeight / contentHeight;
    const computedScale = Math.min(scaleX, scaleY);
    
    setScale(Math.max(0.1, Math.min(computedScale, 1.0)));
  };

  useEffect(() => {
    // 모드 전환 시 기본 값 초기 세팅
    if (printMode === 'print') {
      setContentWidth(794);
      setContentHeight(1123);
    } else {
      setContentWidth(794);
      setContentHeight(1150);
    }
  }, [printMode]);

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [printMode, contentWidth, contentHeight]);

  useEffect(() => {
    if (!templateId) {
      setError('필수 출력 파라미터(templateId)가 누락되었습니다.');
      setLoading(false);
      return;
    }

    const loadAndRender = async () => {
      try {
        // 1. 로컬스토리지에서 사전에 전송한 최종 데이터셋 복구
        const storedJson = localStorage.getItem('web_form_print_data');
        if (!storedJson) {
          throw new Error('인쇄용 데이터(localStorage)가 존재하지 않습니다. 메인 화면에서 양식 출력을 다시 실행하십시오.');
        }

        let printData: any;
        try {
          printData = JSON.parse(storedJson);
        } catch (e) {
          throw new Error('인쇄용 데이터 포맷이 유효하지 않습니다.');
        }

        // 2. 템플릿 정보 로드
        const tempRes = await apiFetch(`/api/templates-new?action=detail&id=${templateId}`);
        const tempData = await tempRes.json();
        if (!tempData.success || !tempData.template) {
          throw new Error(tempData.error || '템플릿 정보를 불러오는 데 실패했습니다.');
        }
        const template = tempData.template;
        const companyProfile = tempData.companyProfile || {};

        // 3. 바인딩용 최종 데이터셋 조립
        const bindingData: Record<string, any> = {
          ...companyProfile,
          ...printData
        };

        // [비즈니스 가드] 재직증명서 발급 목적 검증: 현재 재직 중인 직원만 발급 허용
        const isEmploymentCert = template.template_name.includes('재직');
        if (isEmploymentCert && bindingData.employment_status) {
          const status = String(bindingData.employment_status).trim();
          const isEmployed = 
            status.includes('재직') || 
            status.includes('근무') || 
            status.toLowerCase() === 'employed' || 
            status.toLowerCase() === 'active';
          if (!isEmployed) {
            throw new Error(`[출력 제한] 선택된 사원(${bindingData.staff_name || bindingData.name})은 현재 재직 상태가 아닙니다 (현재 상태: ${status}). 재직증명서는 재직 중인 직원만 발급이 가능합니다. 퇴직한 사원은 [경력증명서] 양식을 활용해 주십시오.`);
          }
        }

        // 원본 및 회사 프로필 상태 보존
        setRawData(bindingData);
        setTemplateHtml(template.html_content);
        setWebTemplateHtml(template.web_html_content || ''); // 웹 전용 HTML 보존
        setCompanyProfileData(companyProfile);
        setTemplateName(template.template_name || '');
        setDocumentType(template.document_type || '');
        if (typeof window !== 'undefined' && template.template_name) {
          document.title = template.template_name;
        }

        // 개별 활성 상태 동기화
        const printActive = template.is_print_active !== 0;
        const webActive = template.is_web_active !== 0;
        setIsPrintActive(printActive);
        setIsWebActive(webActive);

        // 사용 가능 상태에 따른 기본 printMode 분기 처리
        if (!printActive && webActive) {
          setPrintMode('web');
        } else if (printActive && !webActive) {
          setPrintMode('print');
        } else if (!template.html_content && template.web_html_content) {
          setPrintMode('web');
        }

        // 덮어쓸 수동 필드 상태 동기화
        setManualData({
          staff_name: bindingData.staff_name || bindingData.name || '',
          resident_id: bindingData.resident_id || '',
          usage: bindingData.usage || '',
          address: bindingData.address || '',
          position: bindingData.position || '',
          department: bindingData.department || '',
          issue_dept: bindingData.issue_dept || '',
          issue_phone: bindingData.issue_phone || companyProfile.phone || '',
          issue_email: bindingData.issue_email || companyProfile.email || '',
          issue_fax: bindingData.issue_fax || ''
        });

        setLoading(false);

        // 4. 발급대장에 안전하게 로그 적재
        const recordIdVal = bindingData.record_id || 'MANUAL';
        const recordNameVal = bindingData.staff_name || bindingData.name || '알수없음';
        await logPrintHistory(template.id, recordIdVal, recordNameVal, bindingData);

      } catch (err: any) {
        console.error(err);
        setError(err.message || '인쇄 양식 렌더링 중 알 수 없는 오류가 발생했습니다.');
        setLoading(false);
      }
    };

    loadAndRender();
  }, [templateId]);

  // 실시간 Mustache 치환 및 데이터 업데이트
  useEffect(() => {
    if (!loading && !error && rawData) {
      const now = new Date();
      const issue_year = String(now.getFullYear());
      const issue_month = String(now.getMonth() + 1);
      const issue_day = String(now.getDate());

      const finalBindingData = {
        ...companyProfileData,
        ...rawData,
        
        employment_period: rawData.employment_period || calculateEmploymentPeriod(rawData.joined_date, rawData.resigned_date),
        
        // 성명 바인딩 불일치 보정 (template.html 에는 {{name}}이 사용됨)
        name: manualData.staff_name || rawData.staff_name || rawData.name || '',
        staff_name: manualData.staff_name || rawData.staff_name || '',
        
        resident_id: manualData.resident_id,
        usage: manualData.usage,
        address: manualData.address || rawData.address || '',
        position: manualData.position,
        department: manualData.department,
        
        // 템플릿의 접두사 불일치 (issue_ vs issuer_) 조율 및 이메일 오타 수정
        issue_dept: manualData.issue_dept,
        issue_phone: manualData.issue_phone,
        issue_email: manualData.issue_email,
        issue_fax: manualData.issue_fax,
        
        issuer_dept: manualData.issue_dept,
        issuer_phone: manualData.issue_phone,
        issuer_email: manualData.issue_email,
        issuer_fax: manualData.issue_fax,
        
        issue_year,
        issue_month,
        issue_day
      };

      // 현재 선택된 출력 모드에 맞는 소스 템플릿 선택
      const activeTemplateSource = printMode === 'print' ? templateHtml : (webTemplateHtml || templateHtml);
      const compiled = compileMustache(activeTemplateSource, finalBindingData);
      setRenderedHtml(compiled);
    }
  }, [manualData, loading, error, rawData, templateHtml, webTemplateHtml, companyProfileData, printMode]);

  // renderedHtml이 변경되거나 로딩이 완료된 후 iframe 내부의 도장 위치 강제 앵커링 조치 (Card 자식으로 편입)
  useEffect(() => {
    if (!loading && !error && iframeRef.current) {
      let attempts = 0;
      const maxAttempts = 20; // 100ms * 20 = 2초간 폴링 대기

      const handleAnchorSeal = () => {
        try {
          const iframe = iframeRef.current;
          if (!iframe) return false;
          const doc = iframe.contentDocument || iframe.contentWindow?.document;
          if (!doc) return false;

          const wrapper = doc.querySelector('.company-seal-wrapper') as HTMLElement;
          const card = doc.querySelector('.card, .web-card, .page, [class*="page"], .A4, .a4') as HTMLElement;
          
          // 콘텐츠 실제 높이를 측정하여 동적 스케일 조율
          const targetElement = card || doc.body;
          if (targetElement) {
            const actualWidth = printMode === 'print' ? 794 : (targetElement.offsetWidth || 800);
            const actualHeight = targetElement.scrollHeight || targetElement.offsetHeight || 1123;
            
            // 무한 렌더링 루프 방지 조건
            if (Math.abs(contentWidth - actualWidth) > 10 || Math.abs(contentHeight - actualHeight) > 10) {
              setContentWidth(actualWidth);
              setContentHeight(actualHeight);
            }
          }

          if (wrapper && card) {
            if (wrapper.parentElement !== card) {
              const wrapperRect = wrapper.getBoundingClientRect();
              const cardRect = card.getBoundingClientRect();
              
              // 렌더링 스케일(DPR 및 transform scale) 고려한 정확한 상대 좌표 복원
              const scale = cardRect.width / card.offsetWidth || 1;
              let relativeLeft = (wrapperRect.left - cardRect.left) / scale;
              let relativeTop = (wrapperRect.top - cardRect.top) / scale;
              
              const cardHeight = card.offsetHeight || card.clientHeight || 1000;
              
              // 구버전 절대좌표 오염 검출 및 대표이사 성명 우측으로 강제 리셋
              if (relativeTop > cardHeight - 120 || relativeTop > 800) {
                relativeTop = cardHeight - 100;
                relativeLeft = printMode === 'print' ? 520 : 320;
                console.log(`⚠️ [Seal Anchor] 비정상적인 구버전 절대좌표를 대표이사 성명 우측으로 자동 리셋했습니다: left=${relativeLeft}px, top=${relativeTop}px`);
              }
              
              card.appendChild(wrapper);
              
              wrapper.style.left = `${relativeLeft}px`;
              wrapper.style.top = `${relativeTop}px`;
              console.log(`✅ [Seal Anchor] 도장을 카드 내부로 상대좌표 보정 이동 완료: left=${relativeLeft}px, top=${relativeTop}px`);
            }
            return true;
          }
        } catch (e) {
          console.warn('[Seal Anchor] 도장 앵커링 중 오류 발생:', e);
        }
        return false;
      };

      // 100ms 마다 DOM 렌더링 완료 상태를 폴링하여 체크
      const intervalId = setInterval(() => {
        const success = handleAnchorSeal();
        attempts++;
        if (success || attempts >= maxAttempts) {
          clearInterval(intervalId);
        }
      }, 100);

      const iframe = iframeRef.current;
      const onLoadHandler = () => {
        handleAnchorSeal();
      };
      iframe.addEventListener('load', onLoadHandler);
      handleAnchorSeal(); // 즉시 실행

      return () => {
        clearInterval(intervalId);
        iframe.removeEventListener('load', onLoadHandler);
      };
    }
  }, [renderedHtml, loading, error, printMode]);

  // Mustache 치환 엔진
  const compileMustache = (html: string, data: Record<string, any>): string => {
    if (!html) return '';
    let result = html;
    
    // items 배열 섹션 처리
    result = result.replace(/\{\{#items\}\}([\s\S]*?)\{\{\/items\}\}/g, (match, body) => {
      const items = data.items;
      if (!Array.isArray(items)) return '';
      return items.map((item: any) => {
        let itemHtml = body;
        itemHtml = itemHtml.replace(/\{\{#has_cost_breakdown\}\}([\s\S]*?)\{\{\/has_cost_breakdown\}\}/g, (m, innerBody) => {
          return item.has_cost_breakdown ? compileMustache(innerBody, item) : '';
        });
        return compileMustache(itemHtml, item);
      }).join('');
    });

    // 그 외 단일 Boolean 및 섹션 처리
    result = result.replace(/\{\{#([a-zA-Z0-9_]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (match, key, body) => {
      const val = data[key];
      if (Array.isArray(val)) {
        return val.map((item: any) => compileMustache(body, item)).join('');
      } else if (val) {
        return compileMustache(body, data);
      }
      return '';
    });

    // 단일 변수 치환 (dot.notation 지원)
    result = result.replace(/\{\{([a-zA-Z0-9_.]+)\}\}/g, (match, key) => {
      const cleanKey = key.trim();
      if (cleanKey.includes('.')) {
        const parts = cleanKey.split('.');
        let current = data;
        for (const part of parts) {
          if (current === null || current === undefined) return '';
          current = current[part];
        }
        return current !== undefined ? String(current) : '';
      }
      return data[cleanKey] !== undefined ? String(data[cleanKey]) : '';
    });

    return result;
  };

  // 발급 대장 이력 적재
  const logPrintHistory = async (tempId: number, recId: string, recName: string, printData: any) => {
    try {
      const res = await apiFetch('/api/templates-new/print-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: tempId,
          record_id: recId,
          record_name: recName || '',
          print_data: printData
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsLogged(true);
        console.log('✅ 발급 대장에 기록이 성공적으로 보존되었습니다.');
      } else {
        console.warn('발급 대장 기록 실패:', data.error);
      }
    } catch (err) {
      console.error('발급 대장 기록 통신 오류:', err);
    }
  };

  const handlePrint = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      if (printMode === 'web') {
        try {
          const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow.document;
          const body = doc.body;
          const html = doc.documentElement;
          
          // 콘텐츠의 전체 높이를 구함
          const height = Math.max(
            body.scrollHeight,
            body.offsetHeight,
            html.clientHeight,
            html.scrollHeight,
            html.offsetHeight
          );
          
          // iframe 높이를 임시로 가득 채워서 잘림 방지
          iframeRef.current.style.height = `${height}px`;
        } catch (e) {
          console.warn('iframe 높이 동적 계산 실패:', e);
        }
      }

      // 비동기 렌더링 페인팅 대기용 지연 시간 추가 (150ms)
      setTimeout(() => {
        if (iframeRef.current && iframeRef.current.contentWindow) {
          iframeRef.current.contentWindow.focus();
          iframeRef.current.contentWindow.print();
        }
        
        if (printMode === 'web') {
          // 인쇄창 호출 후 원래 높이로 복구
          setTimeout(() => {
            if (iframeRef.current) {
              iframeRef.current.style.height = '100%';
            }
          }, 1000);
        }
      }, 150);
    } else {
      window.print();
    }
  };

  const handleClose = () => {
    window.close();
  };

  const buildIframeContent = () => {
    const hasHtmlTag = renderedHtml.includes('<html') || renderedHtml.includes('<HTML');
    
    // 모드별 여백 및 컨테이너 스타일 차별화
    const inlineStyles = printMode === 'print' ? `
      <style>
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: 794px !important;
          height: 1123px !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
          background-color: #ffffff !important;
          font-family: 'Malgun Gothic', '맑은 고딕', Arial, sans-serif;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        body {
          padding: 0 !important; /* 기존 패딩 덮어쓰기 해제하여 템플릿의 원래 여백 보존 */
          position: relative !important;
          box-sizing: border-box !important;
        }
        .page, [class*="page"], .A4, .a4 {
          width: 100% !important;
          height: 100% !important;
          padding: 15mm 10mm !important;
          box-shadow: none !important;
          margin: 0 !important;
          box-sizing: border-box !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: space-between !important;
        }
        table {
          border-collapse: collapse !important;
          margin-top: 10px;
          margin-bottom: 10px;
        }
        td, th {
          border-collapse: collapse !important;
          vertical-align: middle;
        }
        img {
          max-width: 100% !important;
          height: auto !important;
        }
        @media print {
          @page {
            size: A4;
            margin: 0 !important; /* 브라우저 기본 헤더/푸터 강제 감춤 */
          }
          html, body {
            overflow: visible !important;
            height: auto !important;
          }
          body {
            padding: 0 !important; /* 인쇄용 표준 A4 여백은 템플릿 내 container 스타일 사용 */
            margin: 0 !important;
          }
        }
        /* 🏢 회사 도장 인쇄용 뷰 가이드라인 제거 */
        .company-seal-wrapper {
          border: none !important;
          outline: none !important;
        }
        .seal-resizer {
          display: none !important;
        }
      </style>
    ` : `
      <style>
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          height: 100% !important;
          box-sizing: border-box !important;
          background-color: #f4f7fa !important; /* 모던 웹용 연한 배경색 노출 */
          font-family: 'Malgun Gothic', '맑은 고딕', Arial, sans-serif;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        body {
          padding: 20px 10px !important; /* 상하 여백 압축 */
          overflow: hidden !important; /* 스크롤바 원천 제거 */
          display: flex !important;
          justify-content: center !important;
          align-items: flex-start !important; /* 상단 정렬하여 윗 공간 둥둥 뜸 현상 해결 */
        }
        /* 화면 프리뷰 상태에서도 아래 직인 영역이 잘리지 않도록 간격을 조율 */
        .card, .web-card {
          box-sizing: border-box !important;
          position: relative !important;
          width: 794px !important; /* A4 가로폭인 794px로 고정 */
          max-width: 794px !important;
          height: auto !important; /* 고정 높이 제거하여 콘텐츠 내용이 다 나오도록 함 */
          min-height: 1000px !important; /* 최소 높이 보장 */
          padding: 40px 30px !important; /* 내부 패딩 조율 */
          background-color: #ffffff !important;
          border-radius: 12px !important;
          box-shadow: 0 10px 25px rgba(0,0,0,0.05) !important;
        }
        .header {
          margin-bottom: 25px !important;
          padding-bottom: 20px !important;
        }
        .grid {
          gap: 15px !important;
          margin-bottom: 25px !important;
        }
        .field-value {
          padding: 12px 14px !important;
        }
        .statement-box {
          padding: 24px !important;
          margin: 30px 0 !important;
        }
        .issuer-card {
          padding: 20px !important;
          margin-top: 20px !important;
        }
        .footer-brand {
          margin-top: 35px !important;
        }
        /* 인쇄 시 브라우저 머리글/바닥글 숨김 및 화면 레이아웃과 100% 동기화 */
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page {
            size: A4;
            margin: 0 !important; /* 브라우저 기본 헤더/푸터 강제 감춤 */
          }
          html, body {
            overflow: visible !important;
            height: auto !important;
            background-color: #ffffff !important;
            display: flex !important;
            justify-content: center !important;
            align-items: flex-start !important;
          }
          body {
            padding: 20px 10px !important; /* 화면 프리뷰와 동일한 여백 보장 */
            margin: 0 !important;
          }
          .card, .web-card {
            border: none !important;
            box-shadow: none !important;
            padding: 40px 30px !important; /* 화면 프리뷰와 동일한 패딩 유지하여 레이아웃 어긋남 방지 */
            margin: 0 !important;
            width: 794px !important;
            max-width: 794px !important;
            background: #ffffff !important;
            height: auto !important;
            min-height: 1000px !important;
          }
        }
        /* 🏢 회사 도장 인쇄용 뷰 가이드라인 제거 */
        .company-seal-wrapper {
          border: none !important;
          outline: none !important;
        }
        .seal-resizer {
          display: none !important;
        }
      </style>
    `;

    const autoAnchorScript = `
      <script>
        (function() {
          function moveSeal() {
            const wrapper = document.querySelector('.company-seal-wrapper');
            const card = document.querySelector('.card, .web-card, .page, [class*="page"], .A4, .a4');
            if (wrapper && card && wrapper.parentElement !== card) {
              const wrapperRect = wrapper.getBoundingClientRect();
              const cardRect = card.getBoundingClientRect();
              const scale = cardRect.width / card.offsetWidth || 1;
              let relativeLeft = (wrapperRect.left - cardRect.left) / scale;
              let relativeTop = (wrapperRect.top - cardRect.top) / scale;
              
              const cardHeight = card.offsetHeight || card.clientHeight || 1000;
              const cardWidth = card.offsetWidth || card.clientWidth || 800;
              if (relativeTop > cardHeight - 120 || relativeTop > 800) {
                relativeTop = cardHeight - 100;
                const isPrint = cardWidth > 790 && cardWidth < 800;
                relativeLeft = isPrint ? 520 : 320;
              }
              
              card.appendChild(wrapper);
              
              wrapper.style.left = relativeLeft + 'px';
              wrapper.style.top = relativeTop + 'px';
            }
          }
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', moveSeal);
          } else {
            moveSeal();
          }
        })();
      </script>
    `;

    if (hasHtmlTag) {
      let finalHtml = renderedHtml;
      
      // 타이틀 태그 주입 및 치환
      const titleTag = `<title>${templateName || 'Print Document'}</title>`;
      if (finalHtml.toLowerCase().includes('<title>') || finalHtml.toLowerCase().includes('<title ')) {
        finalHtml = finalHtml.replace(/<title>[\s\S]*?<\/title>/gi, titleTag);
        finalHtml = finalHtml.replace(/<title [^>]*>[\s\S]*?<\/title>/gi, titleTag);
      } else {
        const headCloseIndex = finalHtml.toLowerCase().indexOf('</head>');
        if (headCloseIndex !== -1) {
          finalHtml = finalHtml.substring(0, headCloseIndex) + titleTag + finalHtml.substring(headCloseIndex);
        }
      }

      const headCloseIndex = finalHtml.toLowerCase().indexOf('</head>');
      if (headCloseIndex !== -1) {
        finalHtml = finalHtml.substring(0, headCloseIndex) + inlineStyles + finalHtml.substring(headCloseIndex);
      } else {
        finalHtml = inlineStyles + finalHtml;
      }
      
      const bodyCloseIndex = finalHtml.toLowerCase().indexOf('</body>');
      if (bodyCloseIndex !== -1) {
        finalHtml = finalHtml.substring(0, bodyCloseIndex) + autoAnchorScript + finalHtml.substring(bodyCloseIndex);
      } else {
        finalHtml = finalHtml + autoAnchorScript;
      }
      return finalHtml;
    } else {
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>${templateName || 'Print Document'}</title>
            ${inlineStyles}
          </head>
          <body>
            ${renderedHtml}
            ${autoAnchorScript}
          </body>
        </html>
      `;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-500">
        <RefreshCw className="w-10 h-10 animate-spin text-violet-600 mb-3" />
        <p className="text-sm font-extrabold">양식에 데이터를 매핑하고 렌더링하는 중...</p>
        <p className="text-[10px] text-slate-400 mt-1">발급 대장 이력을 등록하는 중입니다.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 text-center max-w-md mx-auto">
        <div className="p-4 bg-rose-50 rounded-full text-rose-500 mb-4 border border-rose-100">
          <AlertCircle className="w-10 h-10" />
        </div>
        <h3 className="text-lg font-black text-slate-800">양식 출력 에러</h3>
        <p className="text-xs text-slate-500 mt-2 font-medium leading-relaxed">{error}</p>
        <button 
          onClick={handleClose}
          className="mt-6 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition rounded-xl cursor-pointer"
        >
          창 닫기
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-100 h-screen overflow-hidden flex flex-col justify-start items-center">
      {/* 화면 상단에만 노출되는 인쇄 제어 툴바 (인쇄 시 숨김 처리) */}
      <div className="w-full bg-slate-900 px-6 py-3 border-b border-slate-880 flex items-center justify-between no-print shrink-0 shadow-md">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-violet-400" />
            <span className="text-xs font-black text-white mr-2">
              양식 출력 프리뷰
            </span>
          </div>

          {/* 출력용 포맷 탭 스위치 */}
          {isPrintActive && isWebActive ? (
            <div className="flex bg-slate-950 p-1.5 rounded-xl shrink-0 gap-1.5 border border-slate-850">
              <button
                onClick={() => setPrintMode('print')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[10px] font-black transition cursor-pointer ${
                  printMode === 'print' 
                    ? 'bg-violet-600 text-white shadow-sm shadow-violet-650/30' 
                    : 'text-slate-400 hover:text-white bg-slate-900/40'
                }`}
              >
                <Laptop className="w-3 h-3" />
                인쇄용 A4 형식
              </button>
              <button
                onClick={() => {
                  if (!webTemplateHtml) {
                    alert('변환된 모던 웹페이지 템플릿이 존재하지 않습니다. 먼저 에디터에서 양식을 AI 분석해 주세요.');
                    return;
                  }
                  setPrintMode('web');
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[10px] font-black transition cursor-pointer ${
                  printMode === 'web' 
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-650/30' 
                    : 'text-slate-400 hover:text-white bg-slate-900/40'
                }`}
              >
                <Globe className="w-3 h-3" />
                모던 웹페이지 형식
              </button>
            </div>
          ) : (
            <div className="text-[10px] font-black px-3.5 py-1.5 rounded-lg bg-slate-950 border border-slate-850 text-slate-350 flex items-center gap-1.5 select-none">
              {isPrintActive ? (
                <>
                  <Laptop className="w-3 h-3 text-violet-400" />
                  인쇄용 A4 형식 전용
                </>
              ) : (
                <>
                  <Globe className="w-3 h-3 text-emerald-400" />
                  모던 웹페이지 형식 전용
                </>
              )}
            </div>
          )}

          {isLogged && (
            <span className="text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-900 px-2 py-0.5 rounded font-extrabold">
              대장 기록 보존 완료
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className={`flex items-center gap-1.5 px-4.5 py-2 rounded-xl text-white font-extrabold text-xs transition cursor-pointer shadow-md ${
              printMode === 'print' ? 'bg-violet-600 hover:bg-violet-755' : 'bg-emerald-600 hover:bg-emerald-750'
            }`}
          >
            <Printer className="w-3.5 h-3.5" />
            인쇄 (Print)
          </button>
          <button
            onClick={handleClose}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white text-xs font-extrabold transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            닫기
          </button>
        </div>
      </div>

      {/* 인쇄 대상 A4 컨테이너 (화면 크기에 따른 반응형 scale-down 적용) */}
      <div className="flex-1 w-full pt-0 pb-4 px-4 flex justify-center items-start overflow-hidden print-container">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body {
              background-color: #ffffff !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .no-print {
              display: none !important;
            }
            .print-container {
              padding: 0 !important;
              margin: 0 !important;
              overflow: visible !important;
              display: block !important;
            }
            .a4-print-box {
              border: none !important;
              box-shadow: none !important;
              margin: 0 !important;
              width: 210mm !important;
              height: 297mm !important;
              transform: none !important;
              transform-origin: none !important;
              page-break-after: avoid !important;
              page-break-inside: avoid !important;
            }
          }
        `}} />
        <div 
          style={{
            width: printMode === 'print' ? '794px' : '800px',
            height: printMode === 'print' ? '1123px' : '1450px',
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease-out',
          }}
          className={`overflow-hidden a4-print-box text-left shrink-0 flex flex-col transition-colors duration-200 ${
            printMode === 'print' 
              ? 'bg-white shadow-2xl border border-slate-300' 
              : 'bg-transparent border-none shadow-none'
          }`}
        >
          <iframe
            ref={iframeRef}
            srcDoc={buildIframeContent()}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              overflow: 'hidden'
            }}
            scrolling="no"
          />
        </div>
      </div>

      {/* SCM 최종 등록 확인 모달 */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in text-left">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-150 shadow-2xl flex flex-col overflow-hidden max-h-[85vh] text-slate-850">
            
            {/* 헤더 */}
            <div className="p-6 border-b border-slate-150 bg-slate-50 flex items-start gap-3 shrink-0">
              <div className="p-2 rounded-xl bg-indigo-100 text-indigo-600">
                <FileCheck className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h3 className="text-base font-black text-slate-800">
                  SCM 거래 등록 최종 확인
                </h3>
                <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                  SCM 데이터베이스(DB)에 이 거래를 정식 등록하시겠습니까?
                </p>
              </div>
            </div>

            {/* 본문 */}
            <div className="p-6 flex-1 min-h-0 overflow-y-auto space-y-4 text-left text-xs font-semibold text-slate-800">
              <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 flex flex-col gap-2.5">
                <div className="flex justify-between border-b border-slate-150 pb-2">
                  <span className="text-slate-400">거래 구분</span>
                  <span className="font-extrabold text-indigo-700">
                    {documentType.startsWith('ESTIMATE_') ? '보낼 견적서 (OUTBOUND)' : '보낼 발주서 (INBOUND PO)'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-150 pb-2">
                  <span className="text-slate-400">거래처 상호</span>
                  <span className="font-bold">
                    {documentType.startsWith('ESTIMATE_') ? rawData?.recipient_company : rawData?.supplier_company}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-150 pb-2">
                  <span className="text-slate-400">거래 유형</span>
                  <span className="font-bold">{rawData?.transaction_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">총합계 금액</span>
                  <span className="font-black text-indigo-600 font-mono">
                    {Number(rawData?.total_amount || 0).toLocaleString()}원
                  </span>
                </div>
              </div>

              {documentType.startsWith('PURCHASE_ORDER_') && (
                <div className="p-3 bg-amber-50 border border-amber-150 rounded-xl text-[10px] text-amber-800 font-bold leading-normal">
                  💡 <b>섀도우 견적 자동 연동:</b> 발주서 등록 시 공급처로부터 받은 섀도우 견적서(Inbound Estimate) 대장이 백엔드 트랜잭션에 의해 동시에 자동 생성 및 연계 적재됩니다.
                </div>
              )}
            </div>

            {/* 하단 버튼 */}
            <div className="p-4 border-t border-slate-150 bg-slate-50 flex justify-end gap-2 shrink-0">
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-350 text-slate-700 font-extrabold text-xs transition rounded-xl cursor-pointer"
                disabled={isRegistering}
              >
                취소
              </button>
              <button
                onClick={handleRegisterScm}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs transition rounded-xl cursor-pointer shadow-md flex items-center gap-1.5"
                disabled={isRegistering}
              >
                {isRegistering ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    등록 처리 중...
                  </>
                ) : (
                  '확인 및 DB 등록'
                )}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default function WebTemplatePrintPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-500">
        <RefreshCw className="w-10 h-10 animate-spin text-violet-600 mb-3" />
        <p className="text-sm font-extrabold">프린트 페이지 초기화 중...</p>
      </div>
    }>
      <PrintViewContent />
    </Suspense>
  );
}
