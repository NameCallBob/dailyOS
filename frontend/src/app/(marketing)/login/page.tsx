import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { MODE_COOKIE, TOKEN_COOKIE } from "@/lib/mode";

import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const cookieStore = await cookies();
  const mode = cookieStore.get(MODE_COOKIE)?.value;
  const token = cookieStore.get(TOKEN_COOKIE)?.value;
  // 注意：mode === "auth" 但沒有 token 時「不可」導向 /dashboard——
  // middleware 會因為缺 token 把 /dashboard 導回這裡，若在此無條件放行
  // 會與 middleware 形成無限重導迴圈（ERR_TOO_MANY_REDIRECTS）。
  if (mode === "trial" || (mode === "auth" && token)) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-paper px-6 py-16">
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
