import React from "react";
import { Send } from "lucide-react";

export function MessageLogsHeader() {
  return (
    <h1 className="text-3xl font-bold text-slate-800 flex items-center">
      <Send className="w-8 h-8 mr-3 text-purple-500" /> 발송 내역 조회
    </h1>
  );
}
