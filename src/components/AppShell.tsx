"use client";

import { useState } from "react";
import AppHeader from "./AppHeader";
import AppSidebar from "./AppSidebar";
import MobileBottomNav from "./MobileBottomNav";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <AppHeader onMenuToggle={() => setMobileOpen((o) => !o)} />
      <div className="flex flex-1">
        <AppSidebar isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
        <main className="flex-1 px-6 py-8 pb-[88px] md:pb-8">{children}</main>
      </div>
      <MobileBottomNav />
    </>
  );
}
