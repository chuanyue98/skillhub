"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { translate, type Lang } from "@/lib/i18n";

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** 取文案：t("hero.title1")，支持 {var} 占位 */
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const LangContext = createContext<LangContextValue>({
  lang: "zh",
  setLang: () => {},
  t: (key) => key,
});

const STORAGE_KEY = "skillhub-lang";

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("zh");

  // 初始语言：localStorage > 浏览器语言 > 中文
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "zh" || saved === "en") {
      setLangState(saved);
    } else {
      const browser = navigator.language?.toLowerCase() ?? "";
      if (browser.startsWith("en")) setLangState("en");
    }
  }, []);

  // 同步 <html lang>
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // 隐私模式下忽略
    }
  };

  const t = (key: string, vars?: Record<string, string | number>) =>
    translate(lang, key, vars);

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang(): LangContextValue {
  return useContext(LangContext);
}
