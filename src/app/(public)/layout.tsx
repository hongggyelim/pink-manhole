/** Mobile-first app shell for all public pages. */
export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="relative mx-auto flex min-h-dvh max-w-[480px] flex-col bg-white shadow-sm">{children}</div>
  );
}
