/**
 * features/focus/api.ts — 專注模組的資料存取入口。
 *
 * 資源：
 * - timer_sessions：計時器生命週期，自訂 action：pause / resume / stop / cancel
 *   （對應 REST：POST /api/v1/timer_sessions/{id}/pause|resume|stop|cancel/）
 * - time_entries：已完成的時間區段（由 timer 結束或手動補登產生），供統計使用
 */

import { createResource, nowIso } from "@/lib/resource";
import { toast } from "@/components/ui/toast";

import { computeElapsedSeconds, timeEntrySchema, timerSessionSchema, type TimerSession } from "./types";
import { seedTimeEntries, seedTimerSessions } from "./seed";

export const timerSessionsResource = createResource({
  name: "timer_sessions",
  schema: timerSessionSchema,
  seed: seedTimerSessions,
  actions: {
    pause: {
      httpAction: "pause",
      trial: (record: TimerSession) => {
        if (record.status !== "running") return {};
        const elapsed = computeElapsedSeconds(record);
        return {
          status: "paused" as const,
          accumulatedSeconds: elapsed,
          startedAt: null,
          pausedAt: nowIso(),
        };
      },
    },
    resume: {
      httpAction: "resume",
      trial: (record: TimerSession) => {
        if (record.status !== "paused") return {};
        return {
          status: "running" as const,
          startedAt: nowIso(),
          pausedAt: null,
        };
      },
    },
    stop: {
      httpAction: "stop",
      trial: (record: TimerSession) => {
        if (record.status !== "running" && record.status !== "paused") return {};
        const elapsed = computeElapsedSeconds(record);
        return {
          status: "completed" as const,
          accumulatedSeconds: elapsed,
          startedAt: null,
          completedAt: nowIso(),
        };
      },
    },
    cancel: {
      httpAction: "cancel",
      trial: (record: TimerSession) => {
        if (record.status !== "running" && record.status !== "paused") return {};
        return {
          status: "cancelled" as const,
          startedAt: null,
          completedAt: nowIso(),
        };
      },
    },
  },
});

export const timeEntriesResource = createResource({
  name: "time_entries",
  schema: timeEntrySchema,
  seed: seedTimeEntries,
});

/** 檢查是否已有「執行中或暫停中」的計時器（同一使用者僅允許一個）。 */
export function findActiveSession(sessions: TimerSession[]): TimerSession | undefined {
  return sessions.find((s) => !s.deleted && (s.status === "running" || s.status === "paused"));
}

/**
 * 停止計時器並將完成的區段寫入 time_entries，供統計使用。
 * 呼叫端須先確認 session 狀態為 running/paused。
 */
export async function stopTimerAndLog(session: TimerSession): Promise<void> {
  const stopped = await timerSessionsResource.actions.stop(session.id);
  const durationSeconds = stopped.accumulatedSeconds;
  if (durationSeconds <= 0) return; // 太短（例如立即停止）不記錄
  const endAt = stopped.completedAt ?? nowIso();
  const startAt = stopped.sessionStartAt;
  try {
    await timeEntriesResource.create({
      label: stopped.label,
      category: stopped.category,
      taskId: stopped.taskId,
      projectId: stopped.projectId,
      timerSessionId: stopped.id,
      startAt,
      endAt,
      durationSeconds,
      source: "timer",
      note: stopped.note,
    });
  } catch {
    toast.error("計時已停止，但寫入時間紀錄失敗，請至歷史紀錄手動補登。");
  }
}
