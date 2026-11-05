/**
 * Single source of truth for every URL in the app. Use these instead of string literals.
 *
 * Exceptions (Next.js requires literal strings there):
 *  - route type params such as `PageProps<"/reports/[reportNo]">` / `LayoutProps<"/admin">`
 *  - `config.matcher` in src/proxy.ts (read statically at build time)
 *  - `crons[].path` in vercel.json
 */
export enum Route {
  Landing = "/",
  Home = "/home",
  Map = "/map",
  Stats = "/stats",
  More = "/more",
  Report = "/report",
  /** Base of the public report detail pages — build them with `routes.reportDetail()`. */
  Reports = "/reports",
  About = "/about",
  Faq = "/faq",
  Notices = "/notices",
  Privacy = "/privacy",
  Lookup = "/lookup",

  Admin = "/admin",
  AdminLogin = "/admin/login",
  AdminForbidden = "/admin/forbidden",
  AdminPhotos = "/admin/photos",
  /** Base of the admin report pages — build them with `routes.adminReport()`. */
  AdminReports = "/admin/reports",
  AdminExport = "/admin/export",
}

export enum ApiRoute {
  Uploads = "/api/uploads",
  Reports = "/api/reports",
  Geocode = "/api/geocode",
  /** Daily cleanup job (Vercel Cron, see vercel.json — the path there must stay a literal). */
  CronCleanup = "/api/cron/cleanup",
}

type QueryValue = string | number | boolean | null | undefined;

/** Appends query params, skipping null/undefined/"" values. Returns the bare path when none remain. */
export function withQuery(path: string, query: Record<string, QueryValue> = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === "") continue;
    params.set(key, String(value));
  }
  return params.size ? `${path}?${params}` : path;
}

/** Dynamic routes. */
export const routes = {
  reportDetail: (reportNo: string) => `${Route.Reports}/${encodeURIComponent(reportNo)}`,
  adminReport: (id: string) => `${Route.AdminReports}/${encodeURIComponent(id)}`,
};
