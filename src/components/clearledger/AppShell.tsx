import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutList, FileStack, Users, ShieldCheck, Settings, Bell, RotateCcw } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { resetDemoData } from "@/lib/clearledger-api";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const nav = [
  { to: "/", label: "Review queue", icon: LayoutList, exact: true },
  { to: "/documents", label: "Documents", icon: FileStack },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/audit", label: "Audit trail", icon: ShieldCheck },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children, breadcrumb }: { children: ReactNode; breadcrumb: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [resetting, setResetting] = useState(false);

  async function handleReset() {
    if (resetting) return;
    setResetting(true);
    try {
      await resetDemoData();
      toast.success("Demo data restored", {
        description: "Olivia’s wages, progress, findings, and local changes were reset.",
      });
      // Full reload so all screens re-fetch seed state from localStorage.
      window.location.assign("/");
    } catch {
      toast.error("Could not reset demo data");
      setResetting(false);
    }
  }

  return (
    <TooltipProvider delayDuration={250}>
      <div className="flex min-h-screen bg-background text-foreground">
        <aside className="hidden w-52 shrink-0 flex-col border-r border-border bg-card md:flex">
          <div className="flex h-14 items-center gap-2 border-b border-border px-4">
            <span className="flex h-7 w-7 items-center justify-center rounded bg-primary font-mono text-xs font-semibold text-primary-foreground">
              CL
            </span>
            <span className="text-sm font-semibold tracking-tight">ClearLedger</span>
          </div>
          <nav className="flex flex-col gap-0.5 p-2">
            <Link
              to="/"
              className={`flex items-center gap-2.5 rounded px-2.5 py-2 text-sm transition-colors ${
                pathname === "/"
                  ? "bg-accent font-medium text-accent-foreground"
                  : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              <LayoutList className="h-4 w-4" />
              Review queue
            </Link>
            {nav.slice(1).map((item) => (
              <Tooltip key={item.to}>
                <TooltipTrigger asChild>
                  <span className="flex cursor-default items-center gap-2.5 rounded px-2.5 py-2 text-sm text-muted-foreground/50">
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-foreground text-background">
                  Not in this prototype scope
                </TooltipContent>
              </Tooltip>
            ))}
            {pathname.startsWith("/review") && (
              <span className="mt-1 flex items-center gap-2.5 rounded bg-accent px-2.5 py-2 text-sm font-medium text-accent-foreground">
                <ShieldCheck className="h-4 w-4" />
                Return review
              </span>
            )}
          </nav>
          <div className="mt-auto border-t border-border p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Tax year 2025</p>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={resetting}
                  className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground/80 transition-colors hover:text-foreground disabled:opacity-50"
                >
                  <RotateCcw className="h-3 w-3" />
                  {resetting ? "Resetting…" : "Reset demo"}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[200px] bg-foreground text-background">
                Restore original seed data for the case-study walkthrough
              </TooltipContent>
            </Tooltip>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card px-3 sm:gap-3 sm:px-4">
            <Link
              to="/"
              className="flex shrink-0 items-center gap-1.5 md:hidden"
              aria-label="ClearLedger home"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded bg-primary font-mono text-xs font-semibold text-primary-foreground">
                CL
              </span>
            </Link>
            <div className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
              {breadcrumb}
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex cursor-default text-muted-foreground/50">
                  <Bell className="h-4 w-4" />
                </span>
              </TooltipTrigger>
              <TooltipContent className="bg-foreground text-background">
                Notifications not in this prototype
              </TooltipContent>
            </Tooltip>
            <div className="flex items-center gap-2 border-l border-border pl-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary font-mono text-[11px] font-semibold text-secondary-foreground">
                MP
              </span>
              <span className="hidden text-xs leading-tight sm:block">
                <span className="block font-medium">Maya Patel</span>
              </span>
            </div>
          </header>

          <main className="min-w-0 flex-1">{children}</main>

          <footer className="border-t border-border bg-card px-4 py-2 text-[11px] text-muted-foreground">
            Fictional data · simulated AI
            <button
              type="button"
              onClick={handleReset}
              disabled={resetting}
              className="ml-3 inline-flex items-center gap-1 underline-offset-2 hover:underline md:hidden"
            >
              <RotateCcw className="h-3 w-3" />
              Reset demo
            </button>
          </footer>
        </div>
      </div>
    </TooltipProvider>
  );
}
