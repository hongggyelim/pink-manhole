"use client";

import { useActionState } from "react";
import { signIn } from "@/server/admin-actions";

export function LoginForm() {
  const [error, action, pending] = useActionState(signIn, null);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="email" className="text-sm font-medium">이메일</label>
        <input id="email" name="email" type="email" required autoComplete="username"
          className="mt-1.5 h-11 w-full rounded-lg border bg-white px-3 outline-none focus:border-primary" />
      </div>
      <div>
        <label htmlFor="password" className="text-sm font-medium">비밀번호</label>
        <input id="password" name="password" type="password" required autoComplete="current-password"
          className="mt-1.5 h-11 w-full rounded-lg border bg-white px-3 outline-none focus:border-primary" />
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <button disabled={pending} className="h-11 w-full rounded-lg bg-primary font-semibold text-white disabled:opacity-60">
        {pending ? "로그인 중…" : "로그인"}
      </button>
    </form>
  );
}
