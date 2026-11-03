import { NextResponse, type NextRequest } from "next/server";
import { getAdminContext } from "@/server/auth";
import { listAllAdminReports, parseAdminFilters } from "@/server/services/admin";
import { buildReportsWorkbook } from "@/server/services/export";

/** GET /admin/export?view=&q=&sido=&status= → .xlsx of every report matching the dashboard filters. */
export async function GET(req: NextRequest) {
  const ctx = await getAdminContext(); // reads cookies + defers to request time
  if (ctx.state !== "admin") {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: ctx.state === "anon" ? 401 : 403 });
  }

  const { page: _page, ...filters } = parseAdminFilters(Object.fromEntries(req.nextUrl.searchParams));
  void _page;
  const reports = await listAllAdminReports(ctx.supabase, filters);

  const now = new Date();
  const stamp = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  }).format(now);
  const file = await buildReportsWorkbook(reports, filters, { siteUrl: req.nextUrl.origin, exportedAt: stamp });
  const filename = `분홍맨홀_제보_${stamp.replace(/[-: ]/g, "").slice(0, 12)}.xlsx`;

  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="pink-manhole-reports.xlsx"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
