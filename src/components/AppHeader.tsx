"use client";

import Link from "next/link";
import { Moon, Sun, Menu } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface AppHeaderProps {
  onMenuToggle?: () => void;
}

export default function AppHeader({ onMenuToggle }: AppHeaderProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const isDark = resolvedTheme === "dark";

  return (
    <header className="flex items-center justify-between px-4 py-3.5 border-b border-[rgb(var(--border))]">
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        {onMenuToggle && (
          <button
            type="button"
            onClick={onMenuToggle}
            className="w-9 h-9 rounded-xl bg-[rgb(var(--card-soft))] border border-[rgb(var(--border))]
              flex items-center justify-center md:hidden
              text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] transition-colors duration-150"
            aria-label="Abrir menú"
          >
            <Menu size={18} />
          </button>
        )}

        {/* Logo icon only */}
        <Link
          href="/"
          className="w-8 h-8 rounded-xl bg-green-500/15 flex items-center justify-center"
          aria-label="Inicio"
        >
          <span className="text-green-400 text-sm font-bold">T</span>
        </Link>
      </div>

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
