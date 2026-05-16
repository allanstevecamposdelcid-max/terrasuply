"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Wallet,
  BarChart3,
  Boxes,
  Plus,
  Truck,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/ventas", label: "Ventas", icon: ShoppingCart },
  { href: "/ventas/nueva", label: "Nueva venta", icon: Plus },
  { href: "/inventario", label: "Inventario", icon: Boxes },
  { href: "/caja", label: "Caja", icon: Wallet },
  { href: "/graficas", label: "Gráficas", icon: BarChart3 },
  {
    href: "https://trackingt.github.io/order-tracking/admin.html",
    label: "Seguimiento pedidos",
    icon: Truck,
    external: true,
  },
];

export default function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-[rgb(var(--border))] bg-[rgb(var(--card))]">

      {/* Brand */}
      <div className="px-5 py-5 border-b border-[rgb(var(--border))]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-green-500/15 flex items-center justify-center shrink-0">
            <LayoutDashboard size={16} className="text-green-400" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">Sistema Contable</p>
            <p className="text-[11px] text-[rgb(var(--muted))]">TerraSuply</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[rgb(var(--muted))] px-3 pb-3">
          Navegación
        </p>

        {navItems.map(({ href, label, icon: Icon, external }) => {
          const active =
            !external &&
            (pathname === href ||
              (href !== "/" && pathname.startsWith(href + "/")));

          const cls = `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl
            text-sm font-medium transition-all duration-150 cursor-pointer
            ${
              active
                ? "bg-green-500/12 text-green-400"
                : "text-[rgb(var(--muted))] hover:bg-[rgb(var(--card-soft))] hover:text-[rgb(var(--text))]"
            }`;

          const content = (
            <>
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-green-400 rounded-r-full" />
              )}
              <Icon
                size={17}
                strokeWidth={active ? 2.5 : 1.8}
                className="shrink-0 transition-transform duration-150 group-hover:scale-105"
              />
              <span className="truncate">{label}</span>
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
              >
                {content}
              </a>
            );
          }

          return (
            <Link key={href} href={href} className={cls}>
              {content}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-[rgb(var(--border))]">
        <p className="text-[11px] text-[rgb(var(--muted))] text-center">
          TerraSuply &copy; {new Date().getFullYear()}
        </p>
      </div>
    </aside>
  );
}
