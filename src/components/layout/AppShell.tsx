import Link from "next/link";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/layout/LogoutButton";

interface NavItem {
  href: string;
  label: string;
}

interface AppShellProps {
  title: string;
  subtitle?: string;
  nav: NavItem[];
  children: React.ReactNode;
  currentPath?: string;
}

export function AppShell({ title, subtitle, nav, children, currentPath }: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div>
            <Link href="/" className="text-lg font-bold text-emerald-700">
              Equivalente
            </Link>
            <p className="text-xs text-slate-500">Más opciones sin salirte del plan.</p>
          </div>
          <div className="flex items-center gap-2 text-right">
            <div>
              <p className="text-sm font-medium">{title}</p>
              {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
            </div>
            <LogoutButton />
          </div>
        </div>
        <nav className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-4 pb-2">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                currentPath === item.href
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-3xl space-y-4 p-4 pb-24">{children}</main>
    </div>
  );
}
