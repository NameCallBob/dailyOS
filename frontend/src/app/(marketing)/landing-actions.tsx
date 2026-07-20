"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { setMode } from "@/lib/mode";

type PendingMode = "trial" | "local" | null;

export function LandingActions() {
  const router = useRouter();
  const [pending, setPending] = useState<PendingMode>(null);

  function choose(mode: "trial" | "local") {
    setPending(mode);
    setMode(mode);
    router.push("/dashboard");
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="grid w-full gap-3 sm:grid-cols-3">
        <ModeCard
          title="免費試用"
          desc="載入範例資料，立即體驗。資料存在瀏覽器，可隨時重置。"
          action={
            <Button className="w-full" loading={pending === "trial"} onClick={() => choose("trial")}>
              開始試用
            </Button>
          }
        />
        <ModeCard
          title="本機使用"
          desc="你的真實資料只留在這台裝置，可安裝為 App、本機提醒、匯出/匯入到其他電腦。"
          highlight
          action={
            <Button
              variant="secondary"
              className="w-full"
              loading={pending === "local"}
              onClick={() => choose("local")}
            >
              以本機開始
            </Button>
          }
        />
        <ModeCard
          title="登入雲端"
          desc="資料存於伺服器，跨裝置即時同步，關閉裝置也能收到提醒。"
          action={
            <Button variant="secondary" className="w-full" onClick={() => router.push("/login")}>
              登入 / 註冊
            </Button>
          }
        />
      </div>
      <p className="text-caption text-ink-muted">
        之後都能在「設定」切換模式；本機模式登入後可再開啟雲端同步。
      </p>
    </div>
  );
}

function ModeCard({
  title,
  desc,
  action,
  highlight = false,
}: {
  title: string;
  desc: string;
  action: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={[
        "flex flex-col gap-3 rounded-lg border p-4 text-left",
        highlight ? "border-ink" : "border-line",
      ].join(" ")}
    >
      <h2 className="text-body font-medium text-ink">{title}</h2>
      <p className="flex-1 text-caption text-ink-soft">{desc}</p>
      {action}
    </div>
  );
}
