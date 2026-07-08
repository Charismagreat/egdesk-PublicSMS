"use client";

import React from "react";
import { CheckCircle, ShieldAlert, AlertTriangle } from "lucide-react";

interface ToastProps {
  toast: {
    message: string;
    type: "success" | "error" | "warn";
  } | null;
}

export default function Toast({ toast }: ToastProps) {
  if (!toast) return null;

  return (
    <div
      className={`fixed top-6 right-6 z-50 p-4 rounded-xl shadow-2xl border flex items-center gap-3 animate-fade-in ${
        toast.type === "success"
          ? "bg-green-50 text-green-700 border-green-200"
          : toast.type === "error"
          ? "bg-red-50 text-red-700 border-red-200"
          : "bg-amber-50 text-amber-700 border-amber-200"
      }`}
    >
      {toast.type === "success" && <CheckCircle className="w-5 h-5 text-green-650" />}
      {toast.type === "error" && <ShieldAlert className="w-5 h-5 text-red-650" />}
      {toast.type === "warn" && <AlertTriangle className="w-5 h-5 text-amber-650" />}
      <span className="text-xs font-semibold">{toast.message}</span>
    </div>
  );
}
