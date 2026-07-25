"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Delete button with an inline confirm step (no extra dialog dependency).
 * Cascade-deletes all snapshots + changes for the competitor.
 */
export function DeleteCompetitorButton({
  competitorId,
  competitorName,
}: {
  competitorId: number;
  competitorName: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/competitors/${competitorId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        setDeleting(false);
        setConfirming(false);
      }
    } catch {
      setDeleting(false);
      setConfirming(false);
    }
  }

  if (!confirming) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setConfirming(true)}
        className="text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="h-4 w-4" /> Delete
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground hidden sm:inline">
        Delete {competitorName}?
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setConfirming(false)}
        disabled={deleting}
      >
        Cancel
      </Button>
      <Button
        variant="destructive"
        size="sm"
        onClick={handleDelete}
        disabled={deleting}
      >
        {deleting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
        Confirm delete
      </Button>
    </div>
  );
}
