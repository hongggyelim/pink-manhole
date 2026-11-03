import { LogOut } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { AdminNavLink } from "@/features/admin/admin-nav";
import { signOut } from "@/server/admin-actions";
import { requireAdminPage } from "@/server/auth";
import { getAdminStats } from "@/server/services/admin";

export default function AdminDashboardLayout({ children }: LayoutProps<"/admin">) {
  return (
    <>
      <header className="sticky top-0 z-30 border-b bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
          <Link href="/admin" className="mr-3 font-extrabold text-navy">분홍맨홀 관리자</Link>
          <NavLink href="/admin">제보 목록</NavLink>
          <NavLink href="/admin/photos">
            사진 검토
            <Suspense>
              <PendingBadge />
            </Suspense>
          </NavLink>
          <div className="flex-1" />
          <Suspense>
            <AdminEmail />
          </Suspense>
          <form action={signOut}>
            <button className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted">
              <LogOut className="size-4" /> 로그아웃
            </button>
          </form>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
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

async function AdminEmail() {
  const { email } = await requireAdminPage();
  return <span className="hidden text-xs text-muted-foreground sm:inline">{email}</span>;
}
