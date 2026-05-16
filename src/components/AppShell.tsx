"use client";

import AppHeader from "./AppHeader";
import AppSidebar from "./AppSidebar";
import MobileBottomNav from "./MobileBottomNav";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppHeader />
      <div className="flex flex-1">
        <AppSidebar />
        <main className="flex-1 px-6 py-8 pb-[88px] md:pb-8">{children}</main>
      </div>
      <MobileBottomNav />
    </>
  );
}
