import type { Metadata } from "next";
import { Archivo, JetBrains_Mono } from "next/font/google";
import { LangProvider } from "@/components/LangProvider";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://skillhub-ai.vercel.app"),
  title: "SkillHub · AI 智能体技能库",
  description:
    "聚合 GitHub 上开源 AI Agent Skills（SKILL.md）：搜索、预览、一键安装。",
};

export const viewport = {
  themeColor: "#f1f2f0",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body
        className={`${archivo.variable} ${jetbrains.variable} min-h-screen bg-paper font-sans text-ink antialiased`}
      >
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  );
}
