import { NextResponse, type NextRequest } from "next/server";
import { signUploadSchema } from "@/shared/schemas";
import { clientIp, hashIp, isRateLimited } from "@/server/services/abuse";
import { createSignedUploads } from "@/server/services/reports";

/** Issues signed upload URLs for a new draft. The draftId becomes the report id. */
export async function POST(req: NextRequest) {
  const parsed = signUploadSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  if (await isRateLimited(hashIp(clientIp(req.headers)))) {
    return NextResponse.json({ error: "잠시 후 다시 시도해주세요." }, { status: 429 });
  }
  const draftId = crypto.randomUUID();
  const uploads = await createSignedUploads(draftId, parsed.data.count);
  return NextResponse.json({ draftId, uploads });
}
