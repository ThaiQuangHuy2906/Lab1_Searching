import type { Metadata } from "next";
import { Be_Vietnam_Pro, JetBrains_Mono } from "next/font/google";
import { AppShell } from "@/components/app-shell";
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
  title: "Định tuyến giao thông TP.HCM — Lab 1 AI",
  description:
    "Ứng dụng hỗ trợ shipper: 10 thuật toán tìm đường + tối ưu thứ tự giao hàng trên bản đồ TP.HCM",
};

// đặt data-theme TRƯỚC khi paint để không nháy theme (FOUC)
const themeInit = `(function(){try{var t=localStorage.getItem("traffic-theme");document.documentElement.setAttribute("data-theme",t==="light"?"light":"dark");}catch(e){document.documentElement.setAttribute("data-theme","dark");}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" data-theme="dark" suppressHydrationWarning
      className={`${beVietnam.variable} ${jetbrains.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="h-screen overflow-hidden">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
