"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function NewCompetitorPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, url, category }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to add competitor");
        setSubmitting(false);
        return;
      }
      router.push(`/competitors/${data.competitor.id}`);
      router.refresh();
    } catch {
      setError("Network error — please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="container max-w-xl py-8">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link href="/">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Add a competitor</CardTitle>
          <CardDescription>
            Beacon will track strategic changes on this site over time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="e.g. Acme Inc."
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">Website URL *</Label>
              <Input
                id="url"
                placeholder="acme.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                disabled={submitting}
              />
              <p className="text-xs text-muted-foreground">
                No need to type https:// — we&apos;ll add it for you.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category (optional)</Label>
              <Input
                id="category"
                placeholder="e.g. SaaS, E-commerce, Agency"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={submitting}
              />
            </div>

            {error && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button asChild variant="outline" type="button">
                <Link href="/">Cancel</Link>
              </Button>
              <Button type="submit" disabled={submitting || !name || !url}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Add competitor
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
