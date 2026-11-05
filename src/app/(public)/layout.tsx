import { GoogleAnalytics } from "@next/third-parties/google";

/**
 * GA4 measurement ID. Unset = no tracking (local dev). Admin pages are outside this layout, so they are never tracked.
 * IDs are case-sensitive and always uppercase ("G-XXXXXXXXXX"); a lowercase value loads gtag.js but collects nothing.
 */
const GA_ID = process.env.NEXT_PUBLIC_GA_ID?.trim().toUpperCase() || undefined;

/** Mobile-first app shell for all public pages. */
export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <div className="relative mx-auto flex min-h-dvh max-w-[480px] flex-col bg-white shadow-sm">{children}</div>
      {/* Page views on client-side navigation come from GA4 Enhanced Measurement (history changes). */}
      {GA_ID && <GoogleAnalytics gaId={GA_ID} />}
    </>
  );
}
