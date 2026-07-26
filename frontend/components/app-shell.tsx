"use client";

// Client shell: khởi tạo theme trước khi render con + Toaster theo theme.

import * as React from "react";
import { Toaster } from "sonner";
import { useApp } from "@/lib/store";

export function AppShell({ children }: { children: React.ReactNode }) {
  const theme = useApp((s) => s.theme);
  const initTheme = useApp((s) => s.initTheme);
  React.useEffect(() => {
    initTheme();
  }, [initTheme]);
  return (
    <>
      {children}
      <Toaster
        theme={theme}
        position="top-center"
        toastOptions={{
          style: {
            background: "rgb(var(--surface-panel))",
            border: "1px solid rgb(var(--surface-border))",
            color: "rgb(var(--ink))",
          },
        }}
      />
    </>
  );
}
