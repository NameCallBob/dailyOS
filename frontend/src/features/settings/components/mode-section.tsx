"use client";

import { useState } from "react";

import { InstallButton } from "@/components/pwa/install-button";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { allModes, type DaiosMode } from "@/lib/mode";
import { resetTrialSeedData, switchToAuthMode, switchToLocalMode, switchToTrialMode } from "../mode-actions";
import { useSettingsUiStore } from "../store";

export interface ModeSectionProps {
  mode: DaiosMode;
}

const MODE_LABEL: Record<DaiosMode, string> = {
  trial: "試用模式",
  local: "本機模式",
  auth: "雲端模式",
};

const MODE_TONE: Record<DaiosMode, BadgeTone> = {
  trial: "neutral",
  local: "success",
  auth: "accent",
};

const MODE_DESCRIPTION: Record<DaiosMode, string> = {
  trial: "所有資料僅保存在此瀏覽器（IndexedDB 示範資料庫），可隨時一鍵重置，適合評估與試用。清除瀏覽器資料將會遺失。",
  local: "你的真實資料只保存在這台裝置的瀏覽器（IndexedDB），不會自動載入示範資料。可安裝為 App、開啟本機提醒、以 JSON 匯出/匯入攜帶到其他電腦；登入後可另外選擇開啟雲端同步。",
  auth: "資料透過伺服器 API 儲存，跨裝置即時同步，關閉裝置也能由後端推播提醒。",
};

const MODE_SWITCH_LABEL: Record<DaiosMode, string> = {
  trial: "切換為試用模式",
  local: "切換為本機模式",
  auth: "切換為雲端模式（前往登入）",
};

/** 模式切換：試用／本機／雲端三種模式，以及（僅試用模式）重置示範資料。 */
export function ModeSection({ mode }: ModeSectionProps) {
  const resetDialogOpen = useSettingsUiStore((s) => s.resetDialogOpen);
  const openResetDialog = useSettingsUiStore((s) => s.openResetDialog);
  const closeResetDialog = useSettingsUiStore((s) => s.closeResetDialog);
  const [switchingTo, setSwitchingTo] = useState<DaiosMode | null>(null);
  const [resetting, setResetting] = useState(false);

  function handleSwitch(target: DaiosMode) {
    if (target === mode) return;
    setSwitchingTo(target);
    if (target === "trial") switchToTrialMode();
    else if (target === "local") switchToLocalMode();
    else switchToAuthMode();
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
          <Badge tone={MODE_TONE[mode]}>{MODE_LABEL[mode]}</Badge>
        </div>
        <p className="text-caption text-ink-muted">{MODE_DESCRIPTION[mode]}</p>
        {mode === "local" ? (
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-line-strong bg-paper-sunken px-3 py-2">
            <span className="text-caption text-ink-soft">本機模式可安裝為 App，關閉分頁後仍能從桌面／主畫面開啟。</span>
            <InstallButton />
          </div>
        ) : null}
      </section>

      <section className="flex flex-col gap-3 border-t border-line pt-6">
        <h3 className="text-h3 text-ink">切換模式</h3>
        <p className="text-caption text-ink-muted">
          切換模式會整頁重新導向並套用新的資料來源；trial 與 local 使用各自獨立的本機資料庫，彼此不會互相污染。
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          {allModes()
            .filter((candidate) => candidate !== mode)
            .map((candidate) => (
              <Button
                key={candidate}
                variant="secondary"
                loading={switchingTo === candidate}
                disabled={switchingTo !== null && switchingTo !== candidate}
                onClick={() => handleSwitch(candidate)}
              >
                {MODE_SWITCH_LABEL[candidate]}
              </Button>
            ))}
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
