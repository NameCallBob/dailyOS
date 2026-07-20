"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { DATA_VISIBILITY_OPTIONS } from "../constants";
import { exportAllData, purgeAllData } from "../export";
import { useSingletonResource } from "../hooks";
import { userProfileResource } from "../resources";
import { seedUserProfile } from "../seed";
import { useSettingsUiStore } from "../store";

const CONFIRM_PHRASE = "刪除";

/** 隱私與資料：健康資料預設私人可見度、匯出、完整刪除（不可復原）。 */
export function PrivacySection() {
  const { record, isLoading, isError, errorMessage, save, refetch } = useSingletonResource(
    userProfileResource,
    () => seedUserProfile()[0]!,
  );
  const deleteDialogOpen = useSettingsUiStore((s) => s.deleteDialogOpen);
  const openDeleteDialog = useSettingsUiStore((s) => s.openDeleteDialog);
  const closeDeleteDialog = useSettingsUiStore((s) => s.closeDeleteDialog);

  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const router = useRouter();

  if (isError) {
    return <ErrorState description={errorMessage ?? "隱私設定載入失敗，請稍後再試一次。"} onRetry={refetch} />;
  }

  if (isLoading || !record) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner />
      </div>
    );
  }

  async function handleExport() {
    setExporting(true);
    try {
      await exportAllData();
      toast.success("資料已匯出，請確認瀏覽器下載內容。");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "匯出失敗，請稍後再試一次。");
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await purgeAllData();
      toast.success("所有資料已永久刪除。");
      closeDeleteDialog();
      setConfirmText("");
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "刪除失敗，請稍後再試一次。");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-h3 text-ink">健康資料可見度</h3>
          <Badge tone={record.healthDataVisibility === "private" ? "neutral" : "accent"}>
            {record.healthDataVisibility === "private" ? "僅自己可見" : "可分享"}
          </Badge>
        </div>
        <p className="text-caption text-ink-muted">
          健康資料（身體數據、症狀、用藥、飲食等）預設僅本人可見，除非您主動切換為可分享。
        </p>
        <Segmented
          label="健康資料可見度"
          value={record.healthDataVisibility}
          onChange={(value) => {
            save({ healthDataVisibility: value as "private" | "shared" });
            toast.success(value === "private" ? "已設為僅自己可見。" : "已設為可分享。");
          }}
          options={[...DATA_VISIBILITY_OPTIONS]}
        />
      </section>

      <section className="flex flex-col gap-3 border-t border-line pt-6">
        <h3 className="text-h3 text-ink">匯出我的資料</h3>
        <p className="text-caption text-ink-muted">
          將目前帳號 / 裝置上的所有資料匯出為單一 JSON 檔案，方便備份或攜出。
        </p>
        <div>
          <Button variant="secondary" loading={exporting} onClick={handleExport}>
            匯出資料（JSON）
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-3 border-t border-line pt-6">
        <h3 className="text-h3 text-danger">完整刪除資料</h3>
        <p className="text-caption text-ink-muted">
          永久刪除所有紀錄與設定，此動作無法復原。建議刪除前先匯出備份。
        </p>
        <div>
          <Button variant="danger" onClick={openDeleteDialog}>
            刪除所有資料
          </Button>
        </div>
      </section>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          closeDeleteDialog();
          setConfirmText("");
        }}
        title="確認永久刪除所有資料？"
        description="此動作將清除所有任務、健康紀錄與設定，且無法復原。"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                closeDeleteDialog();
                setConfirmText("");
              }}
              disabled={deleting}
            >
              取消
            </Button>
            <Button variant="danger" loading={deleting} disabled={confirmText !== CONFIRM_PHRASE} onClick={handleDelete}>
              永久刪除
            </Button>
          </>
        }
      >
        <Input
          label={`請輸入「${CONFIRM_PHRASE}」以確認`}
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          autoFocus
        />
      </Dialog>
    </div>
  );
}
