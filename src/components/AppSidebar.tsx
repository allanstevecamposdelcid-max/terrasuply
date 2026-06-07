"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  ShoppingCart,
  Wallet,
  Boxes,
  Plus,
  Truck,
  X,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/ventas", label: "Ventas", icon: ShoppingCart },
  { href: "/ventas/nueva", label: "Nueva venta", icon: Plus },
  { href: "/inventario", label: "Inventario", icon: Boxes },
  { href: "/caja", label: "Caja", icon: Wallet },
  {
    href: "https://trackingt.github.io/order-tracking/admin.html",
    label: "Seguimiento pedidos",
    icon: Truck,
    external: true,
  },
];

interface AppSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

function NavList({
  expanded,
  onClick,
}: {
  expanded?: boolean;
  onClick?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className="px-2 py-2 space-y-0.5">
      {navItems.map(({ href, label, icon: Icon, external }) => {
        const active =
          !external &&
          (pathname === href ||
            (href !== "/" && pathname.startsWith(href + "/")));

        const cls = `group relative flex items-center gap-3 py-2.5 rounded-xl
          text-sm font-medium transition-all duration-150 cursor-pointer
          ${expanded ? "px-3" : "justify-center px-0"}
          ${
            active
              ? "bg-green-500/12 text-green-400"
              : "text-[rgb(var(--muted))] hover:bg-[rgb(var(--card-soft))] hover:text-[rgb(var(--text))]"
          }`;

        const content = (
          <>
            {active && expanded && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-green-400 rounded-r-full" />
            )}
            <Icon
              size={18}
              strokeWidth={active ? 2.5 : 1.8}
              className="shrink-0"
            />
            <span
              className={`truncate whitespace-nowrap transition-opacity duration-150
                ${expanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden pointer-events-none"}`}
            >
              {label}
            </span>
          </>
        );

        if (external) {
          return (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={cls}
              onClick={onClick}
            >
              {content}
            </a>
          );
        }

        return (
          <Link key={href} href={href} className={cls} onClick={onClick}>
            {content}
          </Link>
        );
      })}
    </nav>
  );
}

export default function AppSidebar({ isOpen = false, onClose }: AppSidebarProps) {
  const [expanded, setExpanded] = useState(false);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      {/* ── Desktop sidebar — hover to expand ── */}
      <aside
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        className={`hidden md:flex flex-col shrink-0
          border-r border-[rgb(var(--border))] bg-[rgb(var(--card))]
          transition-[width] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]
          overflow-hidden
          ${expanded ? "w-60" : "w-[60px]"}`}
      >
        {/* Brand */}
        <div
          className={`flex items-center border-b border-[rgb(var(--border))] py-5 transition-[padding] duration-200
            ${expanded ? "px-4 gap-3" : "px-[10px] gap-0 justify-center"}`}
        >
          <div className="w-8 h-8 rounded-xl bg-green-500/15 flex items-center justify-center shrink-0">
            <LayoutDashboard size={16} className="text-green-400" />
          </div>
          <div
            className={`overflow-hidden transition-opacity duration-150
              ${expanded ? "opacity-100 ml-0" : "opacity-0 w-0"}`}
          >
            <p className="text-sm font-semibold leading-tight whitespace-nowrap">
              Terra Suply System
            </p>
            <p className="text-[11px] text-[rgb(var(--muted))] whitespace-nowrap">
              Panel de control
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-2">
          <p
            className={`text-[10px] font-semibold uppercase tracking-widest text-[rgb(var(--muted))]
              px-3 pb-2 whitespace-nowrap transition-opacity duration-150
              ${expanded ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          >
            Navegación
          </p>
          <NavList expanded={expanded} />
        </div>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-[rgb(var(--border))]">
          <p
            className={`text-[11px] text-[rgb(var(--muted))] text-center whitespace-nowrap
              transition-opacity duration-150
              ${expanded ? "opacity-100" : "opacity-0"}`}
          >
            TerraSuply &copy; {new Date().getFullYear()}
          </p>
        </div>
      </aside>

      {/* ── Mobile drawer (hamburger) ── */}
      <div className="md:hidden">
        {/* Backdrop */}
        <div
          onClick={onClose}
          className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300
            ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        />

        {/* Drawer panel */}
        <aside
          className={`fixed top-0 left-0 z-50 h-full w-72 flex flex-col
            bg-[rgb(var(--card))] border-r border-[rgb(var(--border))] shadow-2xl
            transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
            ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-[rgb(var(--border))] shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-green-500/15 flex items-center justify-center">
                <LayoutDashboard size={14} className="text-green-400" />
              </div>
              <span className="text-sm font-semibold">Terra Suply System</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center
                bg-[rgb(var(--card-soft))] border border-[rgb(var(--border))]
                text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] transition-colors duration-150"
              aria-label="Cerrar menú"
            >
              <X size={15} />
            </button>
          </div>

          {/* Nav */}
          <div className="flex-1 overflow-y-auto py-2">
            <NavList expanded={true} onClick={onClose} />
          </div>

          {/* Footer */}
          <div className="px-4 py-4 border-t border-[rgb(var(--border))] shrink-0">
            <p className="text-[11px] text-[rgb(var(--muted))] text-center">
              TerraSuply &copy; {new Date().getFullYear()}
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
