"use client";

import { CircleCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/** Shows "등록이 완료되었습니다" after a submission redirect (/home?submitted=1), then cleans the URL. */
export function SubmittedToast() {
  const sp = useSearchParams();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const submitted = sp.get("submitted") === "1";

  // Show first, THEN strip the param. Stripping it re-runs this effect (submitted → false),
  // so the show must already have happened or the cleanup would cancel it.
  useEffect(() => {
    if (!submitted) return;
    const t = setTimeout(() => {
      setVisible(true);
      const params = new URLSearchParams(window.location.search);
      params.delete("submitted");
      router.replace(params.size ? `/home?${params}` : "/home", { scroll: false });
    }, 0);
    return () => clearTimeout(t);
  }, [submitted, router]);

  // Hide independently of the URL.
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(t);
  }, [visible]);

  if (!visible) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 top-[max(1rem,env(safe-area-inset-top))] z-50 mx-auto flex w-fit items-center gap-2 rounded-full bg-navy px-5 py-3 text-sm font-semibold text-white shadow-lg"
    >
      <CircleCheck className="size-5 text-primary" /> 등록이 완료되었습니다
    </div>
  );
}
