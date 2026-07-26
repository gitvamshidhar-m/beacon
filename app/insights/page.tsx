"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Bot, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "What pricing trends are my competitors showing this month?",
  "Summarize all messaging changes this week",
  "Which competitor has the most changes recently?",
  "Are there any common patterns across competitor updates?",
  "What counter-strategies should I consider?",
  "What should I be most concerned about?",
];

export default function InsightsPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Ask me anything about your competitors' recent changes. I can analyze trends, summarize shifts, and highlight strategic opportunities.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function ask(question: string) {
    setMessages((m) => [...m, { role: "user", content: question }]);
    setLoading(true);
    setInput("");

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", content: data.answer }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Sorry, I couldn't process that. Make sure GROQ_API_KEY is set." }]);
    }
    setLoading(false);
  }

  return (
    <div className="container max-w-3xl py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Strategic Insights</h1>
        <p className="text-sm text-muted-foreground">
          Ask AI questions about competitor trends and get strategic analysis.
        </p>
      </div>

      <Card className="mb-4">
        <CardContent className="space-y-4 pt-6">
          {messages.map((msg, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-muted">
                {msg.role === "user" ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Sparkles className="h-4 w-4 text-primary" />
                )}
              </div>
              <div className="min-w-0 pt-1 text-sm leading-relaxed whitespace-pre-wrap">
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-muted">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div className="pt-1 text-sm text-muted-foreground animate-pulse">
                Thinking...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </CardContent>
      </Card>

      {/* Suggestions */}
      {messages.length === 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => ask(s)}
              className="rounded-full border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={(e) => { e.preventDefault(); if (input.trim() && !loading) ask(input.trim()); }}
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a strategic question..."
          className="flex-1 rounded-md border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          disabled={loading}
        />
        <Button type="submit" size="icon" disabled={loading || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>

      {/* Copilot suggestions */}
      <LandingPageCopilot />
    </div>
  );
}

function LandingPageCopilot() {
  const [suggestions, setSuggestions] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/copilot");
      const data = await res.json();
      setSuggestions(data.suggestions);
    } catch {
      setSuggestions("Could not load suggestions.");
    }
    setLoading(false);
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" /> Landing Page Copilot
        </CardTitle>
        <CardDescription>
          AI-generated counter-strategies based on recent competitor moves.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!suggestions && !loading && (
          <Button variant="outline" size="sm" onClick={load}>
            Generate counter-strategies
          </Button>
        )}
        {loading && <p className="text-sm text-muted-foreground animate-pulse">Analyzing competitor moves...</p>}
        {suggestions && (
          <div className="text-sm leading-relaxed whitespace-pre-wrap">{suggestions}</div>
        )}
      </CardContent>
    </Card>
  );
}
