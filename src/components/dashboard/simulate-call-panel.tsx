"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function SimulateCallPanel({ tenantId }: { tenantId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    const form = new FormData(event.currentTarget);
    const payload = {
      tenantId,
      fromPhoneNumber: String(form.get("fromPhoneNumber")),
      callerSpeech: String(form.get("callerSpeech")),
      callerFirstName: String(form.get("callerFirstName") || ""),
      callerLastName: String(form.get("callerLastName") || ""),
      callerCompanyName: String(form.get("callerCompanyName") || ""),
    };

    const response = await fetch("/api/demo/simulate-call", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as {
      ok?: boolean;
      error?: string;
      callId?: string;
      healthScore?: number | null;
      leadIds?: string[];
    };

    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Simulation failed");
      return;
    }

    setResult(
      `Call ${data.callId} processed. Leads: ${data.leadIds?.length ?? 0}. Health score: ${data.healthScore ?? "n/a"}.`,
    );
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Simulate inbound call</CardTitle>
        <CardDescription>
          Runs the mocked Twilio → AI → lead → task → health score vertical slice.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-3" onSubmit={onSubmit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="callerFirstName">First name</Label>
              <Input id="callerFirstName" name="callerFirstName" defaultValue="Alex" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="callerLastName">Last name</Label>
              <Input id="callerLastName" name="callerLastName" defaultValue="Morgan" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="fromPhoneNumber">Caller phone</Label>
              <Input id="fromPhoneNumber" name="fromPhoneNumber" defaultValue="+15550123456" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="callerCompanyName">Company</Label>
              <Input id="callerCompanyName" name="callerCompanyName" defaultValue="Acme Components" />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="callerSpeech">Caller speech</Label>
            <Textarea
              id="callerSpeech"
              name="callerSpeech"
              required
              defaultValue="Hi, I need a CNC machining quote for a low-volume prototype bracket. Can you also book a project review appointment?"
            />
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          {result ? <p className="text-sm text-success">{result}</p> : null}
          <Button type="submit" disabled={loading}>
            {loading ? "Processing call..." : "Simulate inbound call"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
