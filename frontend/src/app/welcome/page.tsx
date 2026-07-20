import type { Metadata } from "next";

import { OnboardingFlow } from "@/features/settings/onboarding/onboarding-flow";

export const metadata: Metadata = { title: "歡迎使用" };

/**
 * /welcome — Onboarding 入口。
 *
 * 刻意放在 (app) / (marketing) 路由群組之外：不套用側欄 / 底部導覽等 App Shell 外觀，
 * 呈現全螢幕、專注的初次設定流程；同時也不受 middleware 的模式守門限制
 * （尚未設定 daios_mode 的全新訪客也能直接進入，OnboardingFlow 會在掛載時補設為試用模式）。
 * 已完成 Onboarding 的使用者亦可從「設定」頁重新進入以調整初始選項。
 */
export default function WelcomePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center bg-paper px-6 py-12 sm:py-16">
      <OnboardingFlow />
    </main>
  );
}
