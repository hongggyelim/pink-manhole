import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "관리자", template: "%s · 분홍 맨홀 관리자" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return <div className="min-h-dvh bg-neutral-50 text-[15px]">{children}</div>;
}
