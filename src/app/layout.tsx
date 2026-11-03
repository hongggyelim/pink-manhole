import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "분홍맨홀", template: "%s · 분홍맨홀" },
  description: "전국의 분홍맨홀을 찾아 제보해주세요. 당신의 제보가 더 안전한 일상을 만듭니다.",
};

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
        <div className="relative mx-auto flex min-h-dvh max-w-[480px] flex-col bg-white shadow-sm">
          {children}
        </div>
      </body>
    </html>
  );
}
