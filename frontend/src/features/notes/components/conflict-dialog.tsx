"use client";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

import { formatDateTime } from "../utils";

export interface ConflictDialogProps {
  open: boolean;
  localTitle: string;
  serverTitle: string;
  serverUpdatedAt: string;
  onKeepMineOverwrite: () => void;
  onDiscardMineReload: () => void;
  onSaveAsCopy: () => void;
  onClose: () => void;
}

/**
 * 儲存衝突提示：偵測到此筆記在你編輯期間已被更新（其他分頁 / 裝置 / 使用者），
 * 依規範「衝突不得無聲覆蓋」——一律停下來讓使用者選擇處理方式。
 */
export function ConflictDialog({
  open,
  localTitle,
  serverTitle,
  serverUpdatedAt,
  onKeepMineOverwrite,
  onDiscardMineReload,
  onSaveAsCopy,
  onClose,
}: ConflictDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="儲存衝突"
      description={`這篇筆記已於 ${formatDateTime(serverUpdatedAt)} 被更新為「${serverTitle}」，與你目前編輯的「${localTitle}」不同步。`}
      footer={
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" size="sm" onClick={onDiscardMineReload}>
            放棄我的變更並載入最新版本
          </Button>
          <Button variant="secondary" size="sm" onClick={onSaveAsCopy}>
            另存為新筆記
          </Button>
          <Button variant="primary" size="sm" onClick={onKeepMineOverwrite}>
            仍以我的版本覆蓋（保留歷史快照）
          </Button>
        </div>
      }
    >
      <p className="text-body text-ink-soft">
        選擇「仍以我的版本覆蓋」時，系統會先把目前伺服器上的最新內容存成一筆版本紀錄，再套用你的變更，避免任何一方的內容遺失。
      </p>
    </Dialog>
  );
}
