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

  useEffect(() => {
    if (!submitted) return;
    const show = setTimeout(() => setVisible(true), 0);
    const params = new URLSearchParams(sp);
    params.delete("submitted");
    router.replace(params.size ? `/home?${params}` : "/home", { scroll: false });
    const hide = setTimeout(() => setVisible(false), 3000);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [submitted, sp, router]);

  if (!visible) return null;
  return (
    <div role="status" className="fixed inset-x-0 top-4 z-50 mx-auto flex w-fit items-center gap-2 rounded-full bg-navy px-5 py-3 text-sm font-semibold text-white shadow-lg">
      <CircleCheck className="size-5 text-primary" /> 등록이 완료되었습니다
    </div>
  );
}
