"use client";

import { useRef, useEffect } from "react";

export function useHoverAutoScroll<T extends HTMLElement>() {
  const containerRef = useRef<T | null>(null);
  const animFrameId = useRef<number | null>(null);
  const currentSpeed = useRef<number>(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // 연속 60fps 스크롤 업데이트 루프
    const loop = () => {
      if (el && currentSpeed.current !== 0) {
        el.scrollLeft += currentSpeed.current;
      }
      animFrameId.current = requestAnimationFrame(loop);
    };

    animFrameId.current = requestAnimationFrame(loop);

    const handleMouseMove = (e: MouseEvent) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();

      // 마우스 커서가 컨테이너 범위 내에 있는지 판별
      const isOver =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;

      if (!isOver) {
        currentSpeed.current = 0;
        return;
      }

      const mouseX = e.clientX - rect.left;
      const width = rect.width;
      const ratio = mouseX / width; // 0.0 ~ 1.0

      const maxSpeed = 12; // 최대 스크롤 속도 (px/frame)

      if (ratio > 0.6) {
        // 우측 40% 영역: 오른쪽으로 스크롤
        const intensity = (ratio - 0.6) / 0.4;
        currentSpeed.current = Math.min(maxSpeed, Math.max(1.5, intensity * maxSpeed));
      } else if (ratio < 0.4) {
        // 좌측 40% 영역: 왼쪽으로 스크롤
        const intensity = (0.4 - ratio) / 0.4;
        currentSpeed.current = -Math.min(maxSpeed, Math.max(1.5, intensity * maxSpeed));
      } else {
        // 중앙 20% 영역: 정지
        currentSpeed.current = 0;
      }
    };

    const handleMouseLeave = () => {
      currentSpeed.current = 0;
    };

    window.addEventListener("mousemove", handleMouseMove);
    el.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
      }
      window.removeEventListener("mousemove", handleMouseMove);
      el.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return containerRef;
}
