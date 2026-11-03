"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      aria-label="복사"
      onClick={async () => {
        await navigator.clipboard?.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
    >
      {done ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}
    </button>
  );
}
