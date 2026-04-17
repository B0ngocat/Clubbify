"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { selfCheckIn, type SelfCheckInResult } from "./actions";

export function CheckInForm({
  eventId,
  initialCode,
}: {
  eventId: string;
  initialCode?: string;
}) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode ?? "");
  const [result, setResult] = useState<SelfCheckInResult | null>(null);
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = await selfCheckIn(fd);
      setResult(r);
      if (r.ok) {
        setTimeout(() => router.push(`/events/${eventId}`), 1200);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="card p-6 space-y-4">
      <input type="hidden" name="eventId" value={eventId} />
      <div>
        <label htmlFor="code" className="label">Check-in code</label>
        <input
          id="code"
          name="code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          autoComplete="off"
          inputMode="text"
          className="input font-mono text-2xl tracking-widest text-center"
          maxLength={12}
          required
        />
      </div>

      {result && !result.ok ? (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {messageForReason(result.reason)}
        </div>
      ) : null}

      {result && result.ok ? (
        <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
          You're checked in. Taking you back to the event...
        </div>
      ) : null}

      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "Checking you in..." : "I'm here"}
      </button>
    </form>
  );
}

type FailureReason = Extract<SelfCheckInResult, { ok: false }>["reason"];

function messageForReason(r: FailureReason): string {
  switch (r) {
    case "wrong-code":
      return "That code doesn't match. Double-check with an officer.";
    case "expired":
      return "Check-in has closed for this event.";
    case "not-open":
      return "Check-in isn't open yet.";
    case "not-found":
      return "Event not found.";
    case "invalid-input":
      return "Enter a valid code.";
    default:
      return "Something went wrong.";
  }
}
