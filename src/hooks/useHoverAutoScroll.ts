"use client";

import { useRef, useEffect } from "react";

export function useHoverAutoScroll<T extends HTMLElement>() {
  const containerRef = useRef<T | null>(null);
  const animFrameId = useRef<number | null>(null);
  const scrollSpeed = useRef<number>(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateScroll = () => {
      if (el && scrollSpeed.current !== 0) {
        el.scrollLeft += scrollSpeed.current;
      }
      animFrameId.current = requestAnimationFrame(updateScroll);
    };

    animFrameId.current = requestAnimationFrame(updateScroll);

    const handleMouseMove = (e: MouseEvent) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const width = rect.width;

      const relativeX = mouseX / width; // 0.0 ~ 1.0

      const leftThreshold = 0.35; // 좌측 35%
      const rightThreshold = 0.65; // 우측 35%
      const maxSpeed = 8; // 스크롤 최대 속도

      if (relativeX > rightThreshold) {
        // 우측으로 자동 스크롤 (속도 비례)
        const intensity = (relativeX - rightThreshold) / (1 - rightThreshold);
        scrollSpeed.current = Math.min(maxSpeed, Math.max(1, intensity * maxSpeed));
      } else if (relativeX < leftThreshold) {
        // 좌측으로 자동 스크롤 (속도 비례)
        const intensity = (leftThreshold - relativeX) / leftThreshold;
        scrollSpeed.current = -Math.min(maxSpeed, Math.max(1, intensity * maxSpeed));
      } else {
        // 중앙 영역에서는 스크롤 정지 (클릭 및 내용 독서 보장)
        scrollSpeed.current = 0;
      }
    };

    const handleMouseLeave = () => {
      scrollSpeed.current = 0;
    };

    el.addEventListener("mousemove", handleMouseMove);
    el.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
      }
      el.removeEventListener("mousemove", handleMouseMove);
      el.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return containerRef;
}
