import { useState, useEffect, useRef } from 'react';

export function useEasyBotVoice() {
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  const recognitionRef = useRef<any>(null);
  const ttsSynthesisRef = useRef<any>(null);
  const currentUtteranceRef = useRef<any>(null);
  const [inputValSetter, setInputValSetter] = useState<(val: string) => void>(() => () => {});

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setSpeechSupported(true);
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = 'ko-KR';

        rec.onstart = () => {
          setIsListening(true);
        };

        rec.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          inputValSetter(transcript);
        };

        rec.onerror = (event: any) => {
          console.error('음성 인식 오류:', event.error);
          setIsListening(false);
        };

        rec.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = rec;
      }
      ttsSynthesisRef.current = window.speechSynthesis;
    }
  }, [inputValSetter]);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error('음성 인식 구동 오류:', err);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const stopSpeaking = () => {
    if (ttsSynthesisRef.current) {
      ttsSynthesisRef.current.cancel();
    }
  };

  const speakImportantNotesOnly = (text: string) => {
    if (!text || typeof text !== 'string') return;
    if (!voiceEnabled || !ttsSynthesisRef.current) return;
    
    stopSpeaking();

    const sentences = text.split(/[.?!]\s+/);
    const genuineWarningKeywords = ['주의', '경고', '금지', '제한', '위험', '차단', '잠금', '⚠️', '🚨'];
    const filteredSentences = sentences.filter(sentence => 
      genuineWarningKeywords.some(keyword => sentence.includes(keyword))
    );

    if (filteredSentences.length === 0) return;

    const limitedSentences = filteredSentences.slice(0, 5);
    const speechText = `관리자님, 주요 주의 사항입니다. ${limitedSentences.join('. ')}`;

    try {
      const utterance = new SpeechSynthesisUtterance(speechText);
      utterance.lang = 'ko-KR';
      utterance.rate = 1.0;
      
      utterance.onstart = () => {
        currentUtteranceRef.current = utterance;
      };
      
      utterance.onend = () => {
        currentUtteranceRef.current = null;
      };

      ttsSynthesisRef.current.speak(utterance);
    } catch (speechErr) {
      console.error('TTS 구동 에러:', speechErr);
    }
  };

  const toggleSpeechRecognition = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return {
    isListening,
    speechSupported,
    voiceEnabled,
    setVoiceEnabled,
    setInputValSetter,
    startListening,
    stopListening,
    stopSpeaking,
    speakImportantNotesOnly,
    toggleSpeechRecognition
  };
}
