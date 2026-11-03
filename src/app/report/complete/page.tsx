import { CircleCheck } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { CopyButton } from "@/features/reports/copy-button";
import { reportNoSchema } from "@/shared/schemas";

export const metadata = { title: "제보 완료" };

export default function CompletePage({ searchParams }: PageProps<"/report/complete">) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Suspense>
        <Complete searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Complete({ searchParams }: { searchParams: PageProps<"/report/complete">["searchParams"] }) {
  const { no } = await searchParams;
  const reportNo = typeof no === "string" && reportNoSchema.safeParse(no).success ? no : null;
  return (
    <>
      <CircleCheck className="size-16 text-primary" />
      <h1 className="mt-5 text-2xl font-bold">제보가 접수되었어요!</h1>
      <p className="mt-2 text-muted-foreground">소중한 제보 감사합니다. 지도에 바로 반영되었어요.</p>
      {reportNo && (
        <div className="mt-8 w-full rounded-2xl bg-pink-soft p-5">
          <p className="text-sm text-muted-foreground">조회번호</p>
          <p className="mt-1 flex items-center justify-center gap-1 font-mono text-xl font-bold">
            {reportNo}
            <CopyButton text={reportNo} />
          </p>
          <p className="mt-2 text-xs text-muted-foreground">조회번호로 처리 상태를 확인할 수 있어요.</p>
        </div>
      )}
      <div className="mt-10 flex w-full flex-col gap-3">
        {reportNo && (
          <Link href={`/reports/${reportNo}`} className="flex h-14 items-center justify-center rounded-full bg-primary text-lg font-bold text-white">
            제보 상세 보기
          </Link>
        )}
        <Link href="/home" className="flex h-14 items-center justify-center rounded-full border text-lg font-bold">
          홈으로
        </Link>
      </div>
    </>
  );
}
