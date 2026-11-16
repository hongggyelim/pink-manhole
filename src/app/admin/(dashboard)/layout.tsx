import { LogOut, MessageCircle } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { AdminNavLink } from "@/features/admin/admin-nav";
import { signOut } from "@/server/admin-actions";
import { requireAdminPage } from "@/server/auth";
import { getAdminStats } from "@/server/services/admin";
import { getKakaoNotifyStatus } from "@/server/services/kakao-notify";
import { Route } from "@/shared/routes";

export default function AdminDashboardLayout({ children }: LayoutProps<"/admin">) {
  return (
    <>
      <header className="sticky top-0 z-30 border-b bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-2 px-4">
          <Link href={Route.Admin} className="flex h-14 items-center font-extrabold text-navy md:mr-3">분홍 맨홀 관리자</Link>
          {/* Mobile: nav drops to its own full-width row below the logo/logout row. */}
          <nav className="order-last -mx-1 flex w-full gap-1 pb-2 md:order-none md:mx-0 md:w-auto md:pb-0 [&>a]:flex-1 [&>a]:justify-center md:[&>a]:flex-none">
            <NavLink href={Route.Admin}>제보 목록</NavLink>
            <NavLink href={Route.AdminPhotos}>
              사진 검토
              <Suspense>
                <PendingBadge />
              </Suspense>
            </NavLink>
          </nav>
          <div className="flex-1" />
          <Suspense>
            <KakaoNotifyLink />
          </Suspense>
          <Suspense>
            <AdminEmail />
          </Suspense>
          <form action={signOut}>
            <button aria-label="로그아웃" className="flex items-center gap-1 rounded-lg px-2 py-2 text-sm text-muted-foreground hover:bg-muted sm:px-3">
              <LogOut className="size-4" /> <span className="hidden sm:inline">로그아웃</span>
            </button>
          </form>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-4 sm:py-6">{children}</div>
    </>
  );
}

/** usePathname() needs a Suspense boundary on dynamic routes; fallback = inactive link. */
function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <Link href={href} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground">
          {children}
        </Link>
      }
    >
      <AdminNavLink href={href}>{children}</AdminNavLink>
    </Suspense>
  );
}

async function PendingBadge() {
  const { supabase } = await requireAdminPage();
  const { pendingPhotos } = await getAdminStats(supabase);
  if (!pendingPhotos) return null;
  return <span className="rounded-full bg-primary px-1.5 text-xs font-bold text-white">{pendingPhotos}</span>;
}

/** KakaoTalk new-report alert status; clicking (re)connects via Kakao OAuth (route handler, so a plain <a>). */
async function KakaoNotifyLink() {
  const { supabase } = await requireAdminPage();
  const { connected } = await getKakaoNotifyStatus(supabase);
  return (
    <a
      href={Route.AdminKakaoConnect}
      title={connected ? "새 제보 카카오톡 알림 켜짐 (누르면 다시 연결)" : "새 제보를 카카오톡으로 받기"}
      className="flex items-center gap-1 rounded-lg px-2 py-2 text-sm text-muted-foreground hover:bg-muted sm:px-3"
    >
      <MessageCircle className={connected ? "size-4 fill-[#FEE500] text-[#3C1E1E]" : "size-4"} />
      <span className="hidden sm:inline">{connected ? "카톡 알림 ON" : "카톡 알림 연결"}</span>
    </a>
  );
}

async function AdminEmail() {
  const { email } = await requireAdminPage();
  return <span className="hidden text-xs text-muted-foreground md:inline">{email}</span>;
}
