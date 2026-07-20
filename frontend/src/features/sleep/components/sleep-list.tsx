"use client";

/**
 * sleep-list.tsx — 睡眠紀錄清單（Loading / Error / Empty 四態齊備）。
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Spinner } from "@/components/ui/spinner";
import { ENERGY_LABELS, QUALITY_LABELS } from "../constants";
import { useDeleteSleepLogWithUndo } from "../hooks";
import { PRE_SLEEP_ACTIVITY_LABELS, type SleepLog } from "../schema";
import { useSleepUiStore } from "../store";
import { formatDateLong, formatNumber, formatTime, sortByDateDesc } from "../utils";

export interface SleepListProps {
  logs: SleepLog[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

function qualityTone(quality: number): "success" | "accent" | "warning" | "danger" {
  if (quality >= 4) return "success";
  if (quality === 3) return "accent";
  if (quality === 2) return "warning";
  return "danger";
}

export function SleepList({ logs, isLoading, isError, onRetry }: SleepListProps) {
  const openEditForm = useSleepUiStore((s) => s.openEditForm);
  const openCreateForm = useSleepUiStore((s) => s.openCreateForm);
  const { deleteLog } = useDeleteSleepLogWithUndo();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg border border-line bg-paper-raised py-16 text-ink-muted">
        <Spinner /> 載入睡眠紀錄中…
      </div>
    );
  }

  if (isError) {
    return <ErrorState description="睡眠紀錄載入失敗，請稍後再試一次。" onRetry={onRetry} />;
  }

  if (logs.length === 0) {
    return (
      <EmptyState
        title="還沒有任何睡眠紀錄"
        description="新增第一筆紀錄，開始追蹤上床、入睡與起床時間。"
        action={<Button onClick={openCreateForm}>新增睡眠紀錄</Button>}
      />
    );
  }

  const sorted = sortByDateDesc(logs);

  return (
    <div className="flex flex-col gap-3">
      {sorted.map((log) => (
        <div
          key={log.id}
          className="flex flex-col gap-2 rounded-lg border border-line bg-paper-raised p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-body font-medium text-ink">{formatDateLong(log.date)}</span>
              <Badge tone={qualityTone(log.quality)} withGlyph>
                品質 {log.quality} · {QUALITY_LABELS[log.quality]}
              </Badge>
              <Badge tone="neutral" withGlyph={false}>
                精神 {log.morningEnergy} · {ENERGY_LABELS[log.morningEnergy]}
              </Badge>
            </div>
            <p className="text-caption text-ink-muted">
              上床 {formatTime(log.bedtime)} → 入睡 {formatTime(log.sleepAt)} → 起床 {formatTime(log.wakeAt)}
              {"　"}
              <span className="tabular-nums text-ink">{formatNumber(log.hours, 1)} 小時</span>
              {log.awakenings > 0 ? `　夜間清醒 ${log.awakenings} 次` : null}
              {"　睡前："}
              {PRE_SLEEP_ACTIVITY_LABELS[log.preSleepActivity]}
            </p>
            {log.notes ? <p className="text-caption text-ink-muted">備註：{log.notes}</p> : null}
          </div>
          <div className="flex shrink-0 gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => openEditForm(log.id)}>
              編輯
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => deleteLog(log)}>
              刪除
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
