export async function sendSlackNotification(webhookUrl: string, message: string): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: message,
      mrkdwn: true,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Slack webhook error ${res.status}: ${text}`);
  }
}

export function formatChangeNotification(change: {
  competitor_name: string;
  change_type: string;
  severity: string;
  detected_at: string;
  fields: { label: string; change_type: string }[];
  competitor_url?: string;
}): string {
  const emoji =
    change.severity === "high"
      ? "🔴"
      : change.severity === "medium"
        ? "🟡"
        : "🟢";
  const url = change.competitor_url || "";
  const lines = [
    `${emoji} *${change.competitor_name}* — ${change.change_type} change`,
    `   Severity: *${change.severity.toUpperCase()}*`,
    `   Detected: ${change.detected_at}`,
  ];
  if (url) lines.push(`   URL: ${url}`);
  if (change.fields.length > 0) {
    const changed = change.fields.map((f) => f.label).join(", ");
    lines.push(`   Fields: ${changed}`);
  }
  return lines.join("\n");
}

export function shouldNotify(
  changeType: string,
  severity: string,
  rules: { change_type: string; severity: string; enabled: number }[]
): boolean {
  const active = rules.filter((r) => r.enabled);
  if (active.length === 0) return false;

  let matched = false;
  for (const rule of active) {
    const typeMatch = rule.change_type === "*" || rule.change_type === changeType;
    const sevPriorities = { high: 3, medium: 2, low: 1 };
    const ruleSev = sevPriorities[rule.severity as keyof typeof sevPriorities] || 0;
    const changeSev = sevPriorities[severity as keyof typeof sevPriorities] || 0;
    const sevMatch = changeSev >= ruleSev;
    if (typeMatch && sevMatch) matched = true;
  }
  return matched;
}
