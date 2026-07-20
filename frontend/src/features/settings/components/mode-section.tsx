"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { DaiosMode } from "@/lib/mode";
import { resetTrialSeedData, switchToAuthMode, switchToTrialMode } from "../mode-actions";
import { useSettingsUiStore } from "../store";

export interface ModeSectionProps {
  mode: DaiosMode;
}

/** 模式切換：試用 ⇄ 登入，以及（僅試用模式）重置示範資料。 */
export function ModeSection({ mode }: ModeSectionProps) {
  const resetDialogOpen = useSettingsUiStore((s) => s.resetDialogOpen);
  const openResetDialog = useSettingsUiStore((s) => s.openResetDialog);
  const closeResetDialog = useSettingsUiStore((s) => s.closeResetDialog);
  const [switching, setSwitching] = useState(false);
  const [resetting, setResetting] = useState(false);

  function handleSwitch() {
    setSwitching(true);
    if (mode === "trial") {
      switchToAuthMode();
    } else {
      switchToTrialMode();
    }
  }

  async function handleReset() {
    setResetting(true);
    await resetTrialSeedData();
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-h3 text-ink">目前模式</h3>
          <Badge tone={mode === "auth" ? "accent" : "neutral"}>{mode === "auth" ? "登入模式" : "試用模式"}</Badge>
        </div>
        <p className="text-caption text-ink-muted">
          {mode === "trial"
            ? "試用模式的所有資料僅保存在此瀏覽器（IndexedDB），清除瀏覽器資料將會遺失。切換為登入後可跨裝置同步。"
            : "登入模式的資料透過伺服器 API 儲存與同步。切換回試用模式將改用此瀏覽器本機的示範資料。"}
        </p>
        <div>
          <Button variant="secondary" loading={switching} onClick={handleSwitch}>
            {mode === "trial" ? "切換為登入模式" : "切換回試用模式"}
          </Button>
        </div>
      </section>

      {mode === "trial" ? (
        <section className="flex flex-col gap-3 border-t border-line pt-6">
          <h3 className="text-h3 text-ink">重置示範資料</h3>
          <p className="text-caption text-ink-muted">
            清除目前瀏覽器內所有試用資料，並重新產生一套全新的示範資料。此動作無法復原。
          </p>
          <div>
            <Button variant="secondary" onClick={openResetDialog}>
              重置示範資料
            </Button>
          </div>
        </section>
      ) : null}

      <Dialog
        open={resetDialogOpen}
        onClose={closeResetDialog}
        title="確認重置示範資料？"
        description="將清除此瀏覽器內所有試用資料（任務、健康紀錄、設定等），並重新產生示範資料，此動作無法復原。"
        footer={
          <>
            <Button variant="secondary" onClick={closeResetDialog} disabled={resetting}>
              取消
            </Button>
            <Button variant="danger" loading={resetting} onClick={handleReset}>
              確認重置
            </Button>
          </>
        }
      />
    </div>
  );
}
