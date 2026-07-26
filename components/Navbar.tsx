"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Radar,
  LayoutDashboard,
  History,
  Sword,
  Search,
  Bell,
  Sparkles,
  Map,
  Zap,
  TrendingUp,
  FileText,
  Shield,
  GitCompare,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/timeline", label: "Timeline", icon: History },
  { href: "/positioning-map", label: "Map", icon: Map },
  { href: "/battle-card", label: "Battle Card", icon: Sword },
  { href: "/gaps", label: "Gaps", icon: Search },
  { href: "/reaction-tracker", label: "Reactions", icon: Zap },
  { href: "/positioning-drift", label: "Drift", icon: TrendingUp },
  { href: "/brief", label: "Brief", icon: FileText },
  { href: "/intelligence", label: "Intel", icon: Shield },
  { href: "/compare", label: "Compare", icon: GitCompare },
  { href: "/insights", label: "Insights", icon: Sparkles },
  { href: "/settings/alerts", label: "Alerts", icon: Bell },
];

export function Navbar() {
  const path = usePathname();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Radar className="h-5 w-5" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-lg font-bold tracking-tight">Beacon</span>
            <span className="text-xs text-muted-foreground">
              Competitor Change Radar
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = path === item.href;
            return (
              <Button
                key={item.href}
                asChild
                variant="ghost"
                size="sm"
                className={cn(
                  "gap-1.5",
                  isActive && "bg-accent text-accent-foreground"
                )}
              >
                <Link href={item.href}>
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </Button>
            );
          })}
          <Button asChild size="sm" className="ml-2 gap-1.5">
            <Link href="/competitors/new">
              <Plus className="h-4 w-4" /> Add
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
