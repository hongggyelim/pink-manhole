import { Check } from "lucide-react";
import { Fragment } from "react";
import { cn } from "@/lib/utils";

const STEPS = ["사진", "위치", "확인"];

export function Stepper({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="flex items-start px-8 pt-2 pb-5">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < current || (n === current && current === 3);
        const active = n === current;
        return (
          <Fragment key={label}>
            {i > 0 && <li aria-hidden className={cn("mt-3.5 h-0.5 flex-1", n <= current ? "bg-primary/60" : "bg-border")} />}
            <li className="flex w-10 flex-col items-center gap-1.5">
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-full text-sm font-semibold",
                  done || active ? "bg-primary text-white" : "border bg-white text-muted-foreground",
                )}
              >
                {done ? <Check className="size-4" /> : n}
              </span>
              <span className={cn("text-xs", active ? "font-semibold text-primary" : "text-muted-foreground")}>{label}</span>
            </li>
          </Fragment>
        );
      })}
    </ol>
  );
}
