import { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';

export function useEasyBotScreenshot() {
  const [screenshotBlob, setScreenshotBlob] = useState<Blob | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [screenRecordBlob, setScreenRecordBlob] = useState<Blob | null>(null);
  const [screenRecordPreview, setScreenRecordPreview] = useState<string | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordStreamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [isEditingScreenshot, setIsEditingScreenshot] = useState(false);
  const [drawingMode, setDrawingMode] = useState<'none' | 'pen' | 'blur'>('none');
  const [canvasImage, setCanvasImage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastXRef = useRef(0);
  const lastYRef = useRef(0);

  // 언마운트 시 녹화 해제
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (recordStreamRef.current) {
        recordStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // 캔버스 이미지 그리기 용 훅
  useEffect(() => {
    if (isEditingScreenshot && canvasImage && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.onload = () => {
        const maxWidth = Math.min(window.innerWidth * 0.94, 1800);
        const maxHeight = window.innerHeight * 0.8;
        
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = (maxHeight / height) * width;
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
      };
      img.src = canvasImage;
    }
  }, [isEditingScreenshot, canvasImage]);

  // 드로잉 모드에 맞춰 캔버스 커서 강제 지정
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const redPencilCursor = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23ef4444' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><path d='M12 20h9'/><path d='M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z'/></svg>") 3 21, crosshair`;
      const blurBrushCursor = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%234b5563' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><path d='m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21Z'/><path d='M22 21H7'/><path d='m5 11 9 9'/></svg>") 3 21, crosshair`;

      let cursorValue = 'default';
      if (drawingMode === 'pen') {
        cursorValue = redPencilCursor;
      } else if (drawingMode === 'blur') {
        cursorValue = blurBrushCursor;
      }
      canvas.style.setProperty('cursor', cursorValue, 'important');
    }
  }, [drawingMode, isEditingScreenshot]);

  const handleCaptureScreenshot = async () => {
    const originalGetComputedStyle = window.getComputedStyle;
    
    window.getComputedStyle = function (el, pseudoElt) {
      const style = originalGetComputedStyle.call(window, el, pseudoElt);
      
      return new Proxy(style, {
        get(target, prop) {
          const val = target[prop as any];
          if (typeof val === 'string') {
            const valLower = val.toLowerCase();
            if (
              valLower.includes('lab(') || 
              valLower.includes('oklch(') || 
              valLower.includes('oklab(') || 
              valLower.includes('lch(')
            ) {
              return 'transparent';
            }
          }
          if (typeof val === 'function') {
            return function (...args: any[]) {
              const res = (val as Function).apply(target, args);
              if (typeof res === 'string') {
                const resLower = res.toLowerCase();
                if (
                  resLower.includes('lab(') || 
                  resLower.includes('oklch(') || 
                  resLower.includes('oklab(') || 
                  resLower.includes('lch(')
                ) {
                  return 'transparent';
                }
              }
              return res;
            };
          }
          return val;
        }
      });
    };

    const backupStyleElements: { el: HTMLStyleElement; originalText: string }[] = [];
    try {
      const styleElements = Array.from(document.querySelectorAll('style')) as HTMLStyleElement[];
      styleElements.forEach((el) => {
        if (el.textContent) {
          const text = el.textContent;
          if (
            text.includes('lab(') || 
            text.includes('oklch(') || 
            text.includes('oklab(') || 
            text.includes('lch(')
          ) {
            backupStyleElements.push({ el, originalText: text });
            const cleanText = text
              .replace(/lab\([^)]*\)/gi, 'transparent')
              .replace(/oklch\([^)]*\)/gi, 'transparent')
              .replace(/oklab\([^)]*\)/gi, 'transparent')
              .replace(/lch\([^)]*\)/gi, 'transparent');
            el.textContent = cleanText;
          }
        }
      });
    } catch (styleErr) {
      console.warn('style 태그 사전 필터링 스킵:', styleErr);
    }

    try {
      const element = document.body;
      const canvas = await html2canvas(element, {
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        ignoreElements: (el) => {
          return el.classList.contains('ignore-capture') || el.id === 'easybot-widget-root' || el.getAttribute('data-easybot-widget') !== null;
        }
      });

      const dataUrl = canvas.toDataURL('image/png');
      setCanvasImage(dataUrl);
      setDrawingMode('pen');
      setIsEditingScreenshot(true);
    } catch (error: any) {
      console.error('스크린샷 캡처 실패:', error);
      alert(`화면 캡처에 실패했습니다. 상세 요인: ${error.message || error}`);
    } finally {
      window.getComputedStyle = originalGetComputedStyle;
      backupStyleElements.forEach((item) => {
        try {
          item.el.textContent = item.originalText;
        } catch (e) {}
      });
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (drawingMode === 'none') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    isDrawingRef.current = true;
    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    lastXRef.current = x;
    lastYRef.current = y;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || drawingMode === 'none') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    if (drawingMode === 'pen') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 4;
    } else if (drawingMode === 'blur') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.lineWidth = 20;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
    
    lastXRef.current = x;
    lastYRef.current = y;
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const handleSaveEditedScreenshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (blob) {
        setScreenshotBlob(blob);
        const previewUrl = URL.createObjectURL(blob);
        setScreenshotPreview(previewUrl);
      }
      setIsEditingScreenshot(false);
    }, 'image/png');
  };

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "monitor"
        },
        audio: false
      });

      recordStreamRef.current = stream;
      setIsRecording(true);
      setRecordingSeconds(0);

      const options = { mimeType: 'video/webm; codecs=vp9' };
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, options);
      } catch (e) {
        recorder = new MediaRecorder(stream);
      }

      mediaRecorderRef.current = recorder;
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        setScreenRecordBlob(blob);
        const previewUrl = URL.createObjectURL(blob);
        setScreenRecordPreview(previewUrl);
        setIsRecording(false);
        
        stream.getTracks().forEach(track => track.stop());
        
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
      };

      stream.getVideoTracks()[0].onended = () => {
        if (recorder.state !== 'inactive') {
          recorder.stop();
        }
      };

      recorder.start();

      const timer = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 29) {
            if (recorder.state !== 'inactive') {
              recorder.stop();
            }
            clearInterval(timer);
            return 30;
          }
          return prev + 1;
        });
      }, 1000);

      recordingTimerRef.current = timer;

    } catch (error) {
      console.error('화면 녹화 실패:', error);
      setIsRecording(false);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  return {
    screenshotBlob,
    setScreenshotBlob,
    screenshotPreview,
    setScreenshotPreview,
    screenRecordBlob,
    setScreenRecordBlob,
    screenRecordPreview,
    setScreenRecordPreview,
    isRecording,
    recordingSeconds,
    isEditingScreenshot,
    setIsEditingScreenshot,
    drawingMode,
    setDrawingMode,
    canvasImage,
    setCanvasImage,
    canvasRef,
    handleCaptureScreenshot,
    startDrawing,
    draw,
    stopDrawing,
    handleSaveEditedScreenshot,
    handleStartRecording,
    handleStopRecording
  };
}
