import AppShell from "@/components/AppShell";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <AppShell>{children}</AppShell>
    </div>
  );
}
