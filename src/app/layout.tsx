import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import SidebarWrapper from "@/components/SidebarWrapper";
import MainContentWrapper from "@/components/MainContentWrapper";
import EasyBot from "@/components/EasyBot";
import AIHelpManager from "@/components/AIHelpManager";
import DynamicTitle from "@/components/DynamicTitle";
import AuthProvider from "@/components/AuthProvider";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EGDESK SMS",
  description: "중소기업을 위한 AI 기반 자율 경영 플랫폼",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full" suppressHydrationWarning>
      <body className={`${inter.className} h-full overflow-hidden flex bg-slate-50 text-slate-900 antialiased`} suppressHydrationWarning>
        <AuthProvider>
          <DynamicTitle />
          <SidebarWrapper>
            <Sidebar />
          </SidebarWrapper>
          <main className="flex-1 overflow-y-auto min-w-0">
            <MainContentWrapper>
              {children}
            </MainContentWrapper>
          </main>
          <EasyBot />
          <AIHelpManager />
        </AuthProvider>
      </body>
    </html>
  );
}
