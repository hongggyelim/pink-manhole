import { NextResponse, type NextRequest } from "next/server";
import { createReportSchema } from "@/shared/schemas";
import { clientIp, hashIp, isRateLimited } from "@/server/services/abuse";
import { createReport, ReportError } from "@/server/services/reports";

export async function POST(req: NextRequest) {
  const parsed = createReportSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값을 확인해주세요." }, { status: 400 });
  }
  const ipHash = hashIp(clientIp(req.headers));
  if (await isRateLimited(ipHash)) {
    return NextResponse.json({ error: "잠시 후 다시 시도해주세요." }, { status: 429 });
  }
  try {
    const reportNo = await createReport(parsed.data, {
      ipHash,
      userAgent: req.headers.get("user-agent") ?? "",
    });
    return NextResponse.json({ reportNo }, { status: 201 });
  } catch (e) {
    if (e instanceof ReportError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("createReport failed", e);
    return NextResponse.json({ error: "제보 등록에 실패했습니다." }, { status: 500 });
  }
}
