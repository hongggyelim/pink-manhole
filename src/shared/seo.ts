import type { Metadata } from "next";
import { Route } from "./routes";

export const SITE_NAME = "분홍 맨홀";
export const SITE_DESCRIPTION = "전국의 분홍 맨홀을 찾아 제보해주세요. 당신의 제보가 더 안전한 일상을 만듭니다.";

/**
 * Absolute site origin, used as `metadataBase` so og:image / og:url become absolute URLs
 * (KakaoTalk, Slack etc. ignore relative ones). Order: explicit env → Vercel production
 * domain (set automatically on Vercel) → local dev.
 */
export function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}

/** 1200×630 share card. Regenerate with `node scripts/og/generate.mjs`. */
export const DEFAULT_OG_IMAGE = {
  url: "/og/default.png",
  width: 1200,
  height: 630,
  alt: "분홍색 맨홀을 발견하고 휴대폰으로 사진을 찍는 사람 — 분홍 맨홀 제보 서비스",
};

type OgImage = { url: string; width?: number; height?: number; alt?: string };

/**
 * Page metadata with a complete Open Graph / Twitter card. Next.js REPLACES (not merges)
 * `openGraph` between segments, so every page must pass all of it — use this helper
 * instead of setting `openGraph` by hand.
 */
export function pageMetadata({
  title,
  description = SITE_DESCRIPTION,
  path,
  images = [DEFAULT_OG_IMAGE],
}: {
  /** Page title without the site name (the layout template adds " · 분홍 맨홀"). Omit for the site default. */
  title?: string;
  description?: string;
  path: string;
  images?: OgImage[];
}): Metadata {
  const fullTitle = title ? `${title} · ${SITE_NAME}` : SITE_NAME;
  return {
    ...(title ? { title } : {}),
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "ko_KR",
      url: path,
      title: fullTitle,
      description,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: images.map((i) => i.url),
    },
  };
}

/** Root defaults (layout). */
export function rootMetadata(): Metadata {
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
    applicationName: SITE_NAME,
    ...pageMetadata({ path: Route.Landing }),
  };
}
