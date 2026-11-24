import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAdminContext } from "@/server/auth";
import { ADMIN_PAGE_SIZE, getAdminReportsByIds } from "@/server/services/admin";
import { buildSafetyReportZip } from "@/server/services/safety-report";

const idsSchema = z.array(z.uuid()).min(1).max(ADMIN_PAGE_SIZE);

/** GET /admin/safety-report?ids=a,b → zip of 안전신문고 report text + approved photos per report. */
export async function GET(req: NextRequest) {
  const ctx = await getAdminContext(); // reads cookies + defers to request time
  if (ctx.state !== "admin") {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: ctx.state === "anon" ? 401 : 403 });
  }

  const parsed = idsSchema.safeParse([...new Set((req.nextUrl.searchParams.get("ids") ?? "").split(",").filter(Boolean))]);
  if (!parsed.success) return NextResponse.json({ error: "제보를 1건 이상 선택해 주세요." }, { status: 400 });

  const reports = await getAdminReportsByIds(ctx.supabase, parsed.data);
  if (!reports.length) return NextResponse.json({ error: "제보를 찾을 수 없어요." }, { status: 404 });

  const { zip, zipName } = await buildSafetyReportZip(ctx.supabase, reports);
  return new NextResponse(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="safety-report.zip"; filename*=UTF-8''${encodeURIComponent(zipName)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
