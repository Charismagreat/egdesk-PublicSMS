"use client";

import React from "react";
import { SessionProvider } from "next-auth/react";
import { getEgdeskBasePath } from "@/lib/api";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const basePath = `${getEgdeskBasePath()}/api/auth`;
  return <SessionProvider basePath={basePath}>{children}</SessionProvider>;
}
