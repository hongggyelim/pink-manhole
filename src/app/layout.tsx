import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { ScrollToTop } from "@/components/layout/scroll-to-top";
import { rootMetadata } from "@/shared/seo";
import "./globals.css";

export const metadata: Metadata = rootMetadata();

export const viewport: Viewport = {
  themeColor: "#e8578a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="min-h-full bg-neutral-100">
        {children}
        {/* usePathname() needs a Suspense boundary under Cache Components */}
        <Suspense>
          <ScrollToTop />
        </Suspense>
      </body>
    </html>
  );
}
