import Link from "next/link";

import { AutoRedirect } from "@/components/auth/auto-redirect";

import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-paper px-6 py-16">
      <AutoRedirect context="login" />
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col gap-1 text-center">
          <Link href="/" className="text-label uppercase text-ink-muted">
            DailyOS
          </Link>
          <h1 className="text-h1 text-ink">登入</h1>
        </div>
        <LoginForm />
        <p className="text-center text-caption text-ink-muted">
          還沒有帳號嗎？
          <Link href="/" className="ml-1 text-ink underline underline-offset-2">
            回到首頁改用試用模式
          </Link>
        </p>
      </div>
    </main>
  );
}
