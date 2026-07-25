import Link from "next/link";
import { Radar } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navbar() {
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

        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/">Dashboard</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/competitors/new">Add competitor</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
