"use client";
import { useEffect, useState } from "react";
import { Plus, Trash2, Bell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

interface AlertRule {
  id: number;
  competitor_id: number | null;
  change_type: string;
  severity: string;
  channel: string;
  enabled: number;
  competitor_name?: string;
}

export default function AlertsSettingsPage() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [testStatus, setTestStatus] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/alerts")
      .then((r) => r.json())
      .then((d) => { setRules(d.rules); setLoading(false); });
  }, []);

  async function addRule() {
    const res = await fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        competitor_id: null,
        change_type: "*",
        severity: "medium",
        channel: "slack",
        enabled: 1,
      }),
    });
    const data = await res.json();
    setRules(data.rules);
  }

  async function updateRule(id: number, field: string, value: any) {
    const rule = rules.find((r) => r.id === id);
    if (!rule) return;
    const res = await fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...rule, [field]: value, id }),
    });
    const data = await res.json();
    setRules(data.rules);
  }

  async function deleteRule(id: number) {
    const res = await fetch(`/api/alerts?id=${id}`, { method: "DELETE" });
    const d = await res.json();
    if (d.done) setRules(rules.filter((r) => r.id !== id));
  }

  async function testNotification() {
    setTestStatus("sending...");
    try {
      const res = await fetch("/api/notify/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competitor_name: "Beacon Test",
          change_type: "Pricing",
          severity: "high",
          url: "https://beacon-xu7i.vercel.app",
        }),
      });
      const data = await res.json();
      setTestStatus(data.status === "sent" ? "Sent successfully!" : `Error: ${data.error}`);
    } catch {
      setTestStatus("Request failed");
    }
  }

  if (loading) return <div className="container py-8"><p className="text-muted-foreground">Loading...</p></div>;

  return (
    <div className="container max-w-3xl py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Alert Rules</h1>
          <p className="text-sm text-muted-foreground">
            Control when and how you get notified about competitor changes.
          </p>
        </div>
        <Button onClick={addRule} size="sm">
          <Plus className="mr-1 h-4 w-4" /> Add Rule
        </Button>
      </div>

      {rules.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">
              No alert rules yet. Add one to get notified on Slack when competitors change.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Set the <code>SLACK_WEBHOOK_URL</code> env var in Vercel.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {rules.map((rule) => (
          <Card key={rule.id}>
            <CardContent className="flex flex-wrap items-center gap-4 py-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={!!rule.enabled}
                  onCheckedChange={(v) => updateRule(rule.id, "enabled", v ? 1 : 0)}
                />
              </div>

              <select
                value={rule.change_type}
                onChange={(e) => updateRule(rule.id, "change_type", e.target.value)}
                className="h-9 rounded-md border bg-background px-3 text-sm"
              >
                <option value="*">All types</option>
                <option value="Pricing">Pricing</option>
                <option value="Messaging">Messaging</option>
                <option value="Feature">Feature</option>
                <option value="CTA">CTA</option>
                <option value="SEO">SEO</option>
                <option value="Navigation">Navigation</option>
              </select>

              <select
                value={rule.severity}
                onChange={(e) => updateRule(rule.id, "severity", e.target.value)}
                className="h-9 rounded-md border bg-background px-3 text-sm"
              >
                <option value="low">Low + higher</option>
                <option value="medium">Medium + higher</option>
                <option value="high">High only</option>
              </select>

              <Badge variant="outline" className="ml-auto">
                {rule.competitor_name || "All competitors"}
              </Badge>

              <Button variant="ghost" size="icon" onClick={() => deleteRule(rule.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Test Notification</CardTitle>
          <CardDescription>Send a test Slack message to verify your webhook.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={testNotification}>
              Send Test
            </Button>
            {testStatus && (
              <span className={`text-sm ${testStatus.includes("Error") ? "text-destructive" : "text-muted-foreground"}`}>
                {testStatus}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
