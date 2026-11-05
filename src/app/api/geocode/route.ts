import { NextResponse, type NextRequest } from "next/server";
import { latLngSchema } from "@/shared/schemas";
import { hitRateLimit } from "@/server/services/abuse";
import { reverseGeocode } from "@/server/services/geocode";

/** Address preview for the location step (keeps the Kakao REST key server-side). */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const parsed = latLngSchema.safeParse({ lat: Number(sp.get("lat")), lng: Number(sp.get("lng")) });
  if (!parsed.success) {
    return NextResponse.json({ error: "대한민국 내 위치만 등록할 수 있어요." }, { status: 400 });
  }
  if (await hitRateLimit("geocode", req.headers)) {
    return NextResponse.json({ error: "잠시 후 다시 시도해주세요." }, { status: 429 });
  }
  const geo = await reverseGeocode(parsed.data.lat, parsed.data.lng);
  return NextResponse.json(geo, { headers: { "Cache-Control": "public, max-age=86400" } });
}
