import type { Metadata } from "next";
import { Be_Vietnam_Pro, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${beVietnam.variable} ${jetbrains.variable}`}>
      <body className="h-screen overflow-hidden">
        {children}
        <Toaster
          theme="dark"
          position="top-center"
          toastOptions={{
            style: { background: "#18181b", border: "1px solid #27272a", color: "#f4f4f5" },
          }}
        />
      </body>
    </html>
  );
}
