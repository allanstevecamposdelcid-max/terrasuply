"use client";

import Link from "next/link";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function AppHeader() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const isDark = resolvedTheme === "dark";

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-[rgb(var(--border))]">
      <Link href="/" className="flex items-center gap-2.5 font-semibold text-sm">
        <div className="w-7 h-7 rounded-lg bg-green-500/15 flex items-center justify-center">
          <span className="text-green-400 text-xs font-bold">T</span>
        </div>
        <span className="md:hidden">TerraSuply</span>
        <span className="hidden md:inline">Sistema Contable</span>
      </Link>

      <button
        type="button"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className="btn card-soft"
        aria-label="Cambiar tema"
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </header>
  );
}
