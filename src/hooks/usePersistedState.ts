"use client";

import { useState, useEffect, Dispatch, SetStateAction } from "react";

/**
 * SSR 하이드레이션 오류를 우회하여 브라우저 sessionStorage에 상태를 동기화하고 복구해주는 커스텀 훅입니다.
 * 
 * @param key sessionStorage에 저장할 유니크 키 이름
 * @param initialValue 복구된 값이 없을 때 사용할 초기 기본값
 * @returns [현재 상태, 상태 변경 함수, 복구 완료 여부 플래그]
 */
export function usePersistedState<T>(
  key: string,
  initialValue: T
): [T, Dispatch<SetStateAction<T>>, boolean] {
  const [state, setState] = useState<T>(initialValue);
  const [isRestored, setIsRestored] = useState(false);

  // 1. 컴포넌트 마운트 완료 시 브라우저 sessionStorage에서 기존 값 복구
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem(key);
      if (saved !== null && saved !== "undefined") {
        try {
          setState(JSON.parse(saved));
        } catch (e) {
          console.error(`Error parsing sessionStorage key "${key}":`, e);
        }
      }
    }
    setIsRestored(true);
  }, [key]);

  // 2. 상태 변경 시 sessionStorage에 자동 직렬화 저장 (복구 완료 후의 갱신 사항만 반영 가드)
  useEffect(() => {
    if (!isRestored) return;

    if (typeof window !== "undefined") {
      try {
        if (state === undefined) {
          sessionStorage.removeItem(key);
        } else {
          sessionStorage.setItem(key, JSON.stringify(state));
        }
      } catch (e) {
        console.error(`Error writing sessionStorage key "${key}":`, e);
      }
    }
  }, [key, state, isRestored]);

  return [state, setState, isRestored];
}
