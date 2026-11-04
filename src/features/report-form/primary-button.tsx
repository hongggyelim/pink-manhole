import { cn } from "@/lib/utils";

export function PrimaryButton({ className, ...props }: React.ComponentProps<"button">) {
  return (
    <button
      {...props}
      className={cn(
        "h-14 w-full rounded-lg bg-primary text-lg font-bold text-white transition disabled:bg-primary/35",
        className,
      )}
    />
  );
}
