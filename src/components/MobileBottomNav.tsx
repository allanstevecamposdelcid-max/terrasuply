"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  ShoppingCart,
  Plus,
  Boxes,
  Menu,
  X,
  Wallet,
  BarChart3,
  Truck,
} from "lucide-react";

const menuItems = [
  { href: "/caja", label: "Caja", icon: Wallet },
  { href: "/graficas", label: "Gráficas", icon: BarChart3 },
  {
    href: "https://trackingt.github.io/order-tracking/admin.html",
    label: "Seguimiento pedidos",
    icon: Truck,
    external: true,
  },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href + "/"));

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setMenuOpen(false)}
        className={`fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden
          transition-opacity duration-300
          ${menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      />

      {/* Bottom sheet */}
      <div
        className={`fixed left-0 right-0 z-40 md:hidden
          bg-[rgb(var(--card))] border-t border-[rgb(var(--border))]
          rounded-t-2xl shadow-2xl
          transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
          ${menuOpen ? "translate-y-0" : "translate-y-full"}`}
        style={{ bottom: "68px" }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[rgb(var(--card-soft))]" />
        </div>

        {/* Sheet header */}
        <div className="flex items-center justify-between px-5 py-3">
          <span className="text-sm font-semibold">Más opciones</span>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className="w-7 h-7 rounded-lg bg-[rgb(var(--card-soft))] flex items-center justify-center"
          >
            <X size={14} className="text-[rgb(var(--muted))]" />
          </button>
        </div>

        {/* Sheet items */}
        <div className="px-4 pb-6 space-y-1">
          {menuItems.map(({ href, label, icon: Icon, external }) => {
            const active = !external && isActive(href);
            const cls = `flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium
              transition-colors duration-150
              ${active
                ? "bg-green-500/15 text-green-400"
                : "text-[rgb(var(--text))] hover:bg-[rgb(var(--card-soft))]"
              }`;

            if (external) {
              return (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cls}
                  onClick={() => setMenuOpen(false)}
                >
                  <Icon size={18} strokeWidth={1.8} />
                  {label}
                </a>
              );
            }

            return (
              <Link
                key={href}
                href={href}
                className={cls}
                onClick={() => setMenuOpen(false)}
              >
                <Icon size={18} strokeWidth={active ? 2.5 : 1.8} />
                {label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Bottom nav bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden h-[68px]
          flex items-end pb-2 px-2
          bg-[rgb(var(--card))]/95 backdrop-blur-md
          border-t border-[rgb(var(--border))]"
      >
        {/* Inicio */}
        <Link
          href="/"
          className={`flex-1 flex flex-col items-center gap-0.5 pb-1 transition-all duration-150
            ${isActive("/") ? "text-green-400" : "text-[rgb(var(--muted))]"}`}
        >
          <LayoutDashboard size={22} strokeWidth={isActive("/") ? 2.5 : 1.8} />
          <span className="text-[10px] font-medium">Inicio</span>
        </Link>

        {/* Ventas */}
        <Link
          href="/ventas"
          className={`flex-1 flex flex-col items-center gap-0.5 pb-1 transition-all duration-150
            ${isActive("/ventas") && !pathname.startsWith("/ventas/nueva")
              ? "text-green-400"
              : "text-[rgb(var(--muted))]"}`}
        >
          <ShoppingCart
            size={22}
            strokeWidth={isActive("/ventas") && !pathname.startsWith("/ventas/nueva") ? 2.5 : 1.8}
          />
          <span className="text-[10px] font-medium">Ventas</span>
        </Link>

        {/* Nueva — FAB */}
        <div className="flex-1 flex flex-col items-center">
          <Link
            href="/ventas/nueva"
            className="w-12 h-12 rounded-full bg-[rgb(var(--text))]
              flex items-center justify-center -mt-5
              shadow-lg shadow-black/30 transition-transform duration-150 active:scale-95"
            aria-label="Nueva venta"
          >
            <Plus size={24} className="text-[rgb(var(--bg))]" strokeWidth={2.5} />
          </Link>
          <span className="text-[10px] font-medium text-[rgb(var(--muted))] mt-0.5">Nueva</span>
        </div>

        {/* Inventario */}
        <Link
          href="/inventario"
          className={`flex-1 flex flex-col items-center gap-0.5 pb-1 transition-all duration-150
            ${isActive("/inventario") ? "text-green-400" : "text-[rgb(var(--muted))]"}`}
        >
          <Boxes size={22} strokeWidth={isActive("/inventario") ? 2.5 : 1.8} />
          <span className="text-[10px] font-medium">Inventario</span>
        </Link>

        {/* Menú */}
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className={`flex-1 flex flex-col items-center gap-0.5 pb-1 transition-all duration-150
            ${menuOpen ? "text-green-400" : "text-[rgb(var(--muted))]"}`}
        >
          <Menu size={22} strokeWidth={menuOpen ? 2.5 : 1.8} />
          <span className="text-[10px] font-medium">Menú</span>
        </button>
      </nav>
    </>
  );
}
