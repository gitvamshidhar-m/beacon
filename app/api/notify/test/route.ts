import { NextResponse } from "next/server";
import { sendSlackNotification, formatChangeNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json();
  const webhookUrl = body.webhook_url || process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    return NextResponse.json(
      { error: "No webhook URL provided. Set SLACK_WEBHOOK_URL env var or pass webhook_url in body." },
      { status: 400 }
    );
  }

  const testChange = {
    competitor_name: body.competitor_name || "Test Competitor",
    change_type: body.change_type || "Pricing",
    severity: body.severity || "high",
    detected_at: new Date().toISOString(),
    competitor_url: body.url || "https://example.com",
    fields: [{ label: "Pricing", change_type: "Pricing" }],
  };

  const message = formatChangeNotification(testChange);

  try {
    await sendSlackNotification(webhookUrl, message);
    return NextResponse.json({ status: "sent", message });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
