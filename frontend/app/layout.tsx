import type { Metadata } from "next";
import { Be_Vietnam_Pro, JetBrains_Mono } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { DEFAULT_THEME, THEME_STORAGE_KEY, THEME_VALUES } from "@/lib/theme";
import { DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY, LANGUAGE_VALUES } from "@/lib/i18n";
import "./globals.css";

const beVietnam = Be_Vietnam_Pro({
  weight: ["400", "500", "700"],
  subsets: ["vietnamese", "latin"],
  variable: "--font-be-vietnam",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  weight: ["400", "700"],
  subsets: ["latin", "latin-ext"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Định tuyến giao thông TP.HCM — Bài thực hành 1 về Trí tuệ nhân tạo",
  description:
    "Bài thực hành định tuyến với chín thuật toán tìm kiếm trên đồ thị và tối ưu thứ tự giao hàng nhiều điểm trên mạng đường TP.HCM.",
};

// đặt data-theme TRƯỚC khi paint để không nháy theme (FOUC)
const themeInit = `(function(){try{var a=${JSON.stringify(THEME_VALUES)};var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});document.documentElement.setAttribute("data-theme",a.indexOf(t)>=0?t:${JSON.stringify(DEFAULT_THEME)});}catch(e){document.documentElement.setAttribute("data-theme",${JSON.stringify(DEFAULT_THEME)});}})();`;
const languageInit = `(function(){try{var a=${JSON.stringify(LANGUAGE_VALUES)};var l=localStorage.getItem(${JSON.stringify(LANGUAGE_STORAGE_KEY)});l=a.indexOf(l)>=0?l:${JSON.stringify(DEFAULT_LANGUAGE)};document.documentElement.lang=l;document.documentElement.setAttribute("data-language",l);}catch(e){document.documentElement.lang=${JSON.stringify(DEFAULT_LANGUAGE)};document.documentElement.setAttribute("data-language",${JSON.stringify(DEFAULT_LANGUAGE)});}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" data-theme={DEFAULT_THEME} suppressHydrationWarning
      className={`${beVietnam.variable} ${jetbrains.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <script dangerouslySetInnerHTML={{ __html: languageInit }} />
      </head>
      <body className="min-h-screen overflow-hidden">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
