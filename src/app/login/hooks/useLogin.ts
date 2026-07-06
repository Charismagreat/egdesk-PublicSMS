"use client";

import { apiFetch } from '@/lib/api';
import { useState } from "react";
import { useRouter } from "next/navigation";
import { UseLoginResult } from "../types";

// 로그인 관련 상태 및 API 요청 로직을 처리하는 커스텀 훅
export function useLogin(): UseLoginResult {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // 로그인 제출 처리 함수
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "로그인에 실패했습니다.");
        return;
      }

      // 로그인 성공 시 역할(Role)에 맞춰 리다이렉트 지점 분기 설정
      if (data.user?.role === 'EMPLOYEE') {
        router.push("/m/grant-management");
      } else {
        router.push("/");
      }
      router.refresh();
    } catch (err: any) {
      setError("서버와 통신할 수 없습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    username,
    setUsername,
    password,
    setPassword,
    error,
    isLoading,
    handleLogin,
  };
}
