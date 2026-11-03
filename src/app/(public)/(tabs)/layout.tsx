import { BottomNav } from "@/components/layout/bottom-nav";

export default function TabsLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <div className="flex flex-1 flex-col pb-16">{children}</div>
      <BottomNav />
    </>
  );
}
