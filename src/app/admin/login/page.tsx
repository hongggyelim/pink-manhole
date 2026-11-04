import { MapPin } from "lucide-react";
import { LoginForm } from "@/features/admin/login-form";

export const metadata = { title: "로그인" };

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border bg-white p-8 shadow-sm">
        <p className="flex items-center gap-1.5 text-xl font-extrabold text-navy">
          <MapPin className="size-6 fill-primary text-primary [&>circle]:fill-white [&>circle]:stroke-white" />
          분홍 맨홀 관리자
        </p>
        <p className="mt-1 mb-6 text-sm text-muted-foreground">관리자 계정으로 로그인하세요.</p>
        <LoginForm />
      </div>
    </main>
  );
}
