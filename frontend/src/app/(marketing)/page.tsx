import { AutoRedirect } from "@/components/auth/auto-redirect";

import { LandingActions } from "./landing-actions";

export default function LandingPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-paper px-6 py-16">
      <AutoRedirect context="landing" />
      <div className="flex w-full max-w-xl flex-col items-center gap-8 text-center">
        <p className="text-label uppercase text-ink-muted">個人任務・健康・生活整合平台</p>
        <h1 className="text-display text-ink">DailyOS</h1>
        <p className="max-w-md text-body text-ink-soft">
          一個安靜、有秩序的地方，記錄任務、身體與生活的每一個細節。選擇最適合你的使用方式——
          先試用、把它當成本機私人工具，或登入雲端跨裝置同步。
        </p>
        <LandingActions />
      </div>
    </main>
  );
}
