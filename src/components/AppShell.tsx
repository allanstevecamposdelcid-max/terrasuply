"use client";

import AppSidebar from "./AppSidebar";
import MobileBottomNav from "./MobileBottomNav";
import { ProfitProvider } from "./ProfitGate";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ProfitProvider>
      <div className="flex flex-1">
        <AppSidebar />
        <main className="flex-1 min-w-0 px-6 py-8 pb-[88px] md:pb-8">
          {children}
        </main>
      </div>
      <MobileBottomNav />
    </ProfitProvider>
  );
}
