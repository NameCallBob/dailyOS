"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState, OfflineState } from "@/components/ui/error-state";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { useOnlineStatus } from "@/components/pwa/use-online-status";

import { mealLogsResource } from "./resource";
import { MEAL_TYPE_LABELS, type MealLog } from "./types";
import { formatDateLabel, formatTime, groupByDate, todayDateStr } from "./utils";

export interface MealListProps {
  logs: MealLog[];
  isLoading: boolean;
  isError: boolean;
  isEmptySource: boolean;
  onRetry: () => void;
  onEdit: (id: string) => void;
  onOpenCreate: () => void;
}

/** 依日期分組的飲食紀錄清單，含 Loading / Error / Empty / Offline 四態與刪除 Undo。 */
export function MealList({ logs, isLoading, isError, isEmptySource, onRetry, onEdit, onOpenCreate }: MealListProps) {
  const isOnline = useOnlineStatus();
  const queryClient = useQueryClient();
  const createMutation = mealLogsResource.useCreate();
  const removeMutation = mealLogsResource.useRemove();
  const [pendingDelete, setPendingDelete] = useState<{ id: string; text: string } | null>(null);

  async function handleDuplicate(log: MealLog) {
    const now = new Date();
    try {
      await createMutation.mutateAsync({
        type: log.type,
        date: todayDateStr(),
        loggedAt: now.toISOString(),
        text: log.text,
        foodTags: log.foodTags,
        portion: log.portion,
        photo: log.photo,
        calories: log.calories,
        protein: log.protein,
        carb: log.carb,
        fat: log.fat,
        calcium: log.calcium,
        fiber: log.fiber,
        water: log.water,
        customNutrients: log.customNutrients,
        notes: log.notes,
      });
      toast.success(`已將「${log.text}」複製到今天。`);
    } catch {
      // 失敗提示由 mutation 統一處理
    }
  }

  async function handleDelete(log: MealLog) {
    try {
      await removeMutation.mutateAsync(log.id);
      setPendingDelete({ id: log.id, text: log.text });
      window.setTimeout(() => {
        setPendingDelete((current) => (current?.id === log.id ? null : current));
      }, 6000);
    } catch {
      // 失敗提示由 mutation 統一處理
    }
  }

  async function handleUndo() {
    if (!pendingDelete) return;
    try {
      await mealLogsResource.update(pendingDelete.id, { deleted: false });
      await queryClient.invalidateQueries({ queryKey: ["meal_logs"] });
      toast.success("已復原這筆紀錄。");
    } catch {
      toast.error("復原失敗，請重新整理後再試。");
    } finally {
      setPendingDelete(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg border border-line bg-paper-raised py-16 text-ink-muted">
        <Spinner /> <span>載入飲食紀錄中…</span>
      </div>
    );
  }

  if (isError) {
    return <ErrorState description="無法載入飲食紀錄，請確認網路連線後重試。" onRetry={onRetry} />;
  }

  if (!isOnline && isEmptySource) {
    return <OfflineState />;
  }

  if (logs.length === 0) {
    return (
      <EmptyState
        title={isEmptySource ? "還沒有任何飲食紀錄" : "此範圍內沒有符合的紀錄"}
        description={isEmptySource ? "點擊下方按鈕開始記錄第一餐，或使用常用範本快速新增。" : "試著切換日期範圍或餐別篩選。"}
        action={isEmptySource ? <Button onClick={onOpenCreate}>+ 新增第一筆紀錄</Button> : undefined}
      />
    );
  }

  const grouped = groupByDate(logs);

  return (
    <div className="flex flex-col gap-6">
      {!isOnline ? (
        <p role="status" className="rounded-md border border-line-strong bg-paper-sunken px-3 py-2 text-caption text-ink-muted">
          目前離線，顯示的是已快取的資料。
        </p>
      ) : null}

      {pendingDelete ? (
        <div className="flex items-center justify-between rounded-md border border-line-strong bg-paper-sunken px-4 py-3">
          <span className="text-caption text-ink-soft">已刪除「{pendingDelete.text}」</span>
          <Button variant="ghost" size="sm" onClick={handleUndo}>
            復原
          </Button>
        </div>
      ) : null}

      {grouped.map((group) => (
        <section key={group.date} className="flex flex-col gap-2">
          <h3 className="text-h3 text-ink">{formatDateLabel(group.date)}</h3>
          <ul className="flex flex-col gap-2">
            {group.logs.map((log) => (
              <li key={log.id} className="rounded-lg border border-line bg-paper-raised p-4">
                <div className="flex items-start gap-3">
                  {log.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={log.photo} alt="" className="h-14 w-14 flex-shrink-0 rounded-md border border-line object-cover" />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="accent">{MEAL_TYPE_LABELS[log.type]}</Badge>
                      <span className="text-caption tabular-nums text-ink-muted">{formatTime(log.loggedAt)}</span>
                      {log.portion ? <span className="text-caption text-ink-muted">· {log.portion}</span> : null}
                    </div>
                    <p className="mt-1 truncate text-body text-ink">{log.text}</p>
                    {log.foodTags.length > 0 ? (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {log.foodTags.map((tag) => (
                          <span key={tag} className="rounded-full bg-paper-sunken px-2 py-0.5 text-label text-ink-muted">
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-caption tabular-nums text-ink-muted">
                      {log.calories !== undefined ? <span>{log.calories} kcal</span> : null}
                      {log.protein !== undefined ? <span>蛋白質 {log.protein}g</span> : null}
                      {log.carb !== undefined ? <span>碳水 {log.carb}g</span> : null}
                      {log.fat !== undefined ? <span>脂肪 {log.fat}g</span> : null}
                    </div>
                    {log.notes ? <p className="mt-1 text-caption text-ink-muted">備註：{log.notes}</p> : null}
                  </div>
                </div>
                <div className="mt-3 flex justify-end gap-2 border-t border-line pt-3">
                  <Button variant="ghost" size="sm" onClick={() => handleDuplicate(log)}>
                    重複到今天
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onEdit(log.id)}>
                    編輯
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(log)}>
                    刪除
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
