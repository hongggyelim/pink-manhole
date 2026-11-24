import type { MetadataRoute } from "next";
import { getSitemapReports } from "@/server/services/reports";
import { Route, routes } from "@/shared/routes";
import { siteUrl } from "@/shared/seo";

const PAGES: { path: Route; priority: number; changeFrequency: "daily" | "weekly" | "monthly" | "yearly" }[] = [
  { path: Route.Landing, priority: 1, changeFrequency: "weekly" },
  { path: Route.Home, priority: 0.9, changeFrequency: "daily" },
  { path: Route.Map, priority: 0.9, changeFrequency: "daily" },
  { path: Route.Report, priority: 0.8, changeFrequency: "monthly" },
  { path: Route.About, priority: 0.8, changeFrequency: "monthly" },
  { path: Route.Stats, priority: 0.7, changeFrequency: "daily" },
  { path: Route.Faq, priority: 0.5, changeFrequency: "monthly" },
  { path: Route.Notices, priority: 0.4, changeFrequency: "monthly" },
  { path: Route.Privacy, priority: 0.2, changeFrequency: "yearly" },
];

/** Public pages plus every public report page (hidden / deleted reports are excluded by RLS). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const reports = await getSitemapReports();
  return [
    ...PAGES.map(({ path, priority, changeFrequency }) => ({ url: `${base}${path}`, priority, changeFrequency })),
    ...reports.map((r) => ({
      url: `${base}${routes.reportDetail(r.report_no)}`,
      lastModified: new Date(r.created_at),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
