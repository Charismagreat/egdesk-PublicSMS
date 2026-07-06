"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// 테이블 오더 진입 시 테이블 번호 입력 상태와 라우팅 로직을 격리한 커스텀 훅
export function useTableOrderEntry() {
  const [tableNumber, setTableNumber] = useState("");
  const router = useRouter();

  // "메뉴 보기" 이동 핸들러
  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableNumber) return alert("테이블 번호를 입력해주세요.");
    router.push(`/table-order/${tableNumber}`);
  };

  return {
    tableNumber,
    setTableNumber,
    handleStart,
  };
}
