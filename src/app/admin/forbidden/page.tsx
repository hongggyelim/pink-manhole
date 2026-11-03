import { signOut } from "@/server/admin-actions";

export const metadata = { title: "접근 권한 없음" };

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-xl font-bold">접근 권한이 없어요</h1>
      <p className="text-sm text-muted-foreground">관리자 계정이 아니에요.</p>
      <form action={signOut}>
        <button className="rounded-lg border px-4 py-2 text-sm">로그아웃</button>
      </form>
    </main>
  );
}
