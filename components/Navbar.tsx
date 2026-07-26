"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
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
  ChevronDown,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const primaryNav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/timeline", label: "Timeline", icon: History },
  { href: "/intelligence", label: "Intel", icon: Shield },
  { href: "/insights", label: "Insights", icon: Sparkles },
  { href: "/settings/alerts", label: "Alerts", icon: Bell },
];

const moreNav = [
  { href: "/positioning-map", label: "Map", icon: Map },
  { href: "/battle-card", label: "Battle Card", icon: Sword },
  { href: "/compare", label: "Compare", icon: GitCompare },
  { href: "/gaps", label: "Gaps", icon: Search },
  { href: "/reaction-tracker", label: "Reactions", icon: Zap },
  { href: "/positioning-drift", label: "Drift", icon: TrendingUp },
  { href: "/brief", label: "Brief", icon: FileText },
];

export function Navbar() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

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
          {primaryNav.map((item) => {
            const Icon = item.icon;
            const isActive = path === item.href;
            return (
              <Button
                key={item.href}
                asChild
                variant="ghost"
                size="sm"
                className={cn("gap-1.5", isActive && "bg-accent text-accent-foreground")}
              >
                <Link href={item.href}>
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </Button>
            );
          })}

          {/* More dropdown */}
          <div ref={ref} className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={() => setOpen(!open)}
            >
              More <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
            </Button>
            {open && (
              <div className="absolute right-0 top-full mt-1 w-48 rounded-md border bg-popover p-1.5 shadow-md">
                {moreNav.map((item) => {
                  const Icon = item.icon;
                  const isActive = path === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-2 rounded-sm px-2.5 py-2 text-sm transition-colors hover:bg-accent",
                        isActive && "bg-accent font-medium"
                      )}
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

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
