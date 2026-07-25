import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
      <p className="text-lg text-muted-foreground">
        This page doesn&apos;t exist.
      </p>
      <Button asChild>
        <Link href="/">Go to dashboard</Link>
      </Button>
    </div>
  );
}
