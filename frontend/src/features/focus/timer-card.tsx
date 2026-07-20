"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";

import { stopTimerAndLog, timerSessionsResource } from "./api";
import { formatClock, formatDuration } from "./format";
import { useFocusUiStore } from "./store";
import { computeElapsedSeconds, FOCUS_CATEGORY_LABELS, type TimerSession } from "./types";
import { useTicker } from "./use-ticker";

export function TimerCard() {
  const { data, isLoading, isError, refetch } = timerSessionsResource.useList({ ordering: "-updatedAt", pageSize: 100 });
  const openStartSheet = useFocusUiStore((s) => s.openStartSheet);

  const sessions = data?.results ?? [];
  const active = sessions.find((s) => s.status === "running" || s.status === "paused");

  if (isLoading) {
    return (
      <Card className="flex min-h-[220px] items-center justify-center">
        <Spinner size="lg" />
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <ErrorState description="無法載入計時器狀態，請稍後再試一次。" onRetry={() => void refetch()} />
      </Card>
    );
  }

  if (!active) {
    return (
      <Card className="flex flex-col items-center gap-4 py-10 text-center">
        <p className="text-h2 text-ink">尚未開始計時</p>
        <p className="max-w-sm text-body text-ink-muted">選擇任務或直接輸入名稱，立即開始專注。</p>
        <Button onClick={openStartSheet} size="lg">
          開始計時
        </Button>
      </Card>
    );
  }

  return <ActiveTimerCard session={active} />;
}

function ActiveTimerCard({ session }: { session: TimerSession }) {
  const [busy, setBusy] = useState<"pause" | "resume" | "stop" | "cancel" | null>(null);
  const isRunning = session.status === "running";
  const now = useTicker(isRunning);
  // now 於掛載後首個 effect 立即填入實際時間戳；掛載當下短暫為 0 時，
  // computeElapsedSeconds 會將負值經過時間夾在 0，不影響已累積秒數的顯示。
  const elapsed = computeElapsedSeconds(session, now);
  const target = session.targetSeconds;
  const reachedTarget = target != null && elapsed >= target;
  const queryClient = useQueryClient();

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ["timer_sessions"] });
    void queryClient.invalidateQueries({ queryKey: ["time_entries"] });
  }

  async function handlePause() {
    setBusy("pause");
    try {
      await timerSessionsResource.actions.pause(session.id);
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "暫停失敗，請再試一次。");
    } finally {
      setBusy(null);
    }
  }

  async function handleResume() {
    setBusy("resume");
    try {
      await timerSessionsResource.actions.resume(session.id);
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "繼續失敗，請再試一次。");
    } finally {
      setBusy(null);
    }
  }

  async function handleStop() {
    setBusy("stop");
    try {
      await stopTimerAndLog(session);
      invalidate();
      toast.success(`已停止「${session.label}」，共 ${formatDuration(elapsed)}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "停止失敗，請再試一次。");
    } finally {
      setBusy(null);
    }
  }

  async function handleCancel() {
    setBusy("cancel");
    try {
      await timerSessionsResource.actions.cancel(session.id);
      invalidate();
      toast.info("已取消此次計時，不會計入統計。");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "取消失敗，請再試一次。");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{session.label}</CardTitle>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone="accent">{FOCUS_CATEGORY_LABELS[session.category]}</Badge>
            <Badge tone={isRunning ? "success" : "warning"}>{isRunning ? "執行中" : "已暫停"}</Badge>
            {session.mode === "pomodoro" ? <Badge tone="neutral">番茄鐘</Badge> : null}
          </div>
        </div>
      </CardHeader>
      <CardBody className="flex flex-col items-center gap-6 py-4">
        <div className="text-center">
          <p aria-live="off" className="font-mono text-[3.25rem] font-semibold leading-none tabular-nums text-ink">
            {formatClock(elapsed)}
          </p>
          {target != null ? (
            <p className="mt-2 text-caption tabular-nums text-ink-muted">目標 {formatClock(target)}</p>
          ) : null}
        </div>

        {reachedTarget ? (
          <p role="status" className="rounded-md bg-accent-soft px-4 py-2 text-caption text-accent">
            已達成本輪番茄鐘目標，建議休息一下再繼續。
          </p>
        ) : null}

        <div className="flex flex-wrap justify-center gap-2">
          {isRunning ? (
            <Button variant="secondary" onClick={() => void handlePause()} loading={busy === "pause"} disabled={busy !== null}>
              暫停
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => void handleResume()} loading={busy === "resume"} disabled={busy !== null}>
              繼續
            </Button>
          )}
          <Button onClick={() => void handleStop()} loading={busy === "stop"} disabled={busy !== null}>
            停止並記錄
          </Button>
          <Button variant="ghost" onClick={() => void handleCancel()} loading={busy === "cancel"} disabled={busy !== null}>
            取消此次
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
