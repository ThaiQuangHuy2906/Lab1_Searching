"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "./ui/button";
import { useApp } from "@/lib/store";

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useApp((s) => s.theme);
  const toggleTheme = useApp((s) => s.toggleTheme);
  return (
    <Button
      variant="ghost"
      size="iconSm"
      className={className}
      aria-label={theme === "dark" ? "Chuyển chế độ Sáng" : "Chuyển chế độ Tối"}
      title={theme === "dark" ? "Chuyển chế độ Sáng" : "Chuyển chế độ Tối"}
      onClick={toggleTheme}
    >
      {theme === "dark" ? <Sun /> : <Moon />}
    </Button>
  );
}
