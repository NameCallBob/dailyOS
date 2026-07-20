"use client";

/**
 * features/calendar/calendar-view.tsx — 日曆模組主組件：資料載入、範圍計算、
 * 檢視切換、拖曳確認、表單、匯入匯出的整合點。
 */
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState, OfflineState } from "@/components/ui/error-state";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { useOnlineStatus } from "@/components/pwa/use-online-status";

import { AgendaView } from "./agenda-view";
import { CalendarToolbar } from "./calendar-toolbar";
import {
  addDays,
  addMonths,
  formatDateLabel,
  formatMonthLabel,
  formatWeekRangeLabel,
  startOfMonth,
  startOfWeek,
  toDateKey,
} from "./date-utils";
import { findConflicts, findConflictsForCandidate } from "./conflicts";
import { EventForm, type EventFormSubmitPayload } from "./event-form";
import { downloadIcs, type ImportedEvent } from "./ics";
import { IcsImportDialog } from "./ics-import-dialog";
import { MonthView } from "./month-view";
import { MoveConfirmDialog, type PendingMove } from "./move-confirm-dialog";
import { expandEvents, type Occurrence } from "./recurrence";
import { calendarEventsResource } from "./resource";
import type { CalendarEvent } from "./schema";
import { useCalendarStore } from "./store";
import { TimeGrid, type MoveRequest } from "./time-grid";
import { UndoBar } from "./undo-bar";

const RANGE_PADDING_DAYS = 7; // 展開重複事件時，視窗範圍外緣多預留天數，避免邊界誤判

export function CalendarView() {
  const { view, focusedDateKey, setView, setFocusedDateKey, goToday } = useCalendarStore();
  const online = useOnlineStatus();

  const listQuery = calendarEventsResource.useList({ pageSize: 500 });
  const createMutation = calendarEventsResource.useCreate();
  const updateMutation = calendarEventsResource.useUpdate();
  const removeMutation = calendarEventsResource.useRemove();

  const [formState, setFormState] = useState<
    | { mode: "create"; defaultRange: { start: Date; end: Date; allDay?: boolean } }
    | { mode: "edit"; event: CalendarEvent }
    | null
  >(null);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [undoState, setUndoState] = useState<{ event: CalendarEvent } | null>(null);

  const focusedDate = useMemo(() => new Date(`${focusedDateKey}T00:00:00`), [focusedDateKey]);

  const { rangeStart, rangeEnd, rangeLabel } = useMemo(() => {
    if (view === "day") {
      const start = focusedDate;
      return { rangeStart: start, rangeEnd: addDays(start, 1), rangeLabel: formatDateLabel(start) };
    }
    if (view === "week") {
      const start = startOfWeek(focusedDate);
      return { rangeStart: start, rangeEnd: addDays(start, 7), rangeLabel: formatWeekRangeLabel(start) };
    }
    if (view === "month") {
      const monthStart = startOfMonth(focusedDate);
      const gridStart = startOfWeek(monthStart);
      return { rangeStart: gridStart, rangeEnd: addDays(gridStart, 42), rangeLabel: formatMonthLabel(focusedDate) };
    }
    // agenda：以 focusedDate 為起點的 30 天捲動視窗
    return {
      rangeStart: focusedDate,
      rangeEnd: addDays(focusedDate, 30),
      rangeLabel: `${formatDateLabel(focusedDate)} 起 30 天`,
    };
  }, [view, focusedDate]);

  const events = useMemo(() => listQuery.data?.results ?? [], [listQuery.data]);

  const occurrences = useMemo(
    () => expandEvents(events, addDays(rangeStart, -RANGE_PADDING_DAYS), addDays(rangeEnd, RANGE_PADDING_DAYS)),
    [events, rangeStart, rangeEnd],
  );

  const visibleOccurrences = useMemo(
    () => occurrences.filter((occ) => occ.start < rangeEnd && occ.end > rangeStart),
    [occurrences, rangeStart, rangeEnd],
  );

  const conflictMap = useMemo(() => findConflicts(occurrences), [occurrences]);
  const conflictIds = useMemo(() => new Set(conflictMap.keys()), [conflictMap]);

  function step(direction: 1 | -1) {
    if (view === "day") setFocusedDateKey(toDateKey(addDays(focusedDate, direction)));
    else if (view === "week") setFocusedDateKey(toDateKey(addDays(focusedDate, 7 * direction)));
    else if (view === "month") setFocusedDateKey(toDateKey(addMonths(focusedDate, direction)));
    else setFocusedDateKey(toDateKey(addDays(focusedDate, 30 * direction)));
  }

  function openCreate(start: Date, end: Date, allDay?: boolean) {
    setFormState({ mode: "create", defaultRange: { start, end, allDay } });
  }

  function openEdit(occurrence: Occurrence) {
    setFormState({ mode: "edit", event: occurrence.event });
  }

  function closeForm() {
    setFormState(null);
  }

  function handleFormSubmit({ patch }: EventFormSubmitPayload) {
    if (formState?.mode === "edit") {
      updateMutation.mutate(
        { id: formState.event.id, patch },
        {
          onSuccess: () => {
            toast.success("事件已更新");
            closeForm();
          },
        },
      );
    } else {
      createMutation.mutate(patch, {
        onSuccess: () => {
          toast.success("事件已新增");
          closeForm();
        },
      });
    }
  }

  function handleDelete() {
    if (formState?.mode !== "edit") return;
    const target = formState.event;
    closeForm();
    removeMutation.mutate(target.id, {
      onSuccess: () => {
        setUndoState({ event: target });
      },
    });
  }

  function handleUndoDelete() {
    if (!undoState) return;
    updateMutation.mutate(
      { id: undoState.event.id, patch: { deleted: false } as Partial<CalendarEvent> },
      {
        onSuccess: () => toast.success("已復原刪除"),
      },
    );
    setUndoState(null);
  }

  function requestMove({ occurrence, newStart, newEnd }: MoveRequest) {
    const isRecurring = Boolean(occurrence.event.recurrenceRule);
    const conflicts = findConflictsForCandidate(newStart, newEnd, occurrence.event.id, occurrences);
    if (isRecurring || conflicts.length > 0) {
      setPendingMove({ occurrence, newStart, newEnd, conflicts });
      return;
    }
    commitMove(occurrence, newStart, newEnd);
  }

  function commitMove(occurrence: Occurrence, newStart: Date, newEnd: Date) {
    const deltaMs = newStart.getTime() - occurrence.start.getTime();
    const baseStart = new Date(new Date(occurrence.event.startAt).getTime() + deltaMs);
    const baseEnd = new Date(new Date(occurrence.event.endAt).getTime() + deltaMs);
    updateMutation.mutate(
      {
        id: occurrence.event.id,
        patch: { startAt: baseStart.toISOString(), endAt: baseEnd.toISOString() },
      },
      {
        onSuccess: () => toast.success("時間已調整"),
      },
    );
  }

  function handleConfirmMove() {
    if (!pendingMove) return;
    commitMove(pendingMove.occurrence, pendingMove.newStart, pendingMove.newEnd);
    setPendingMove(null);
  }

  async function handleImportConfirm(imported: ImportedEvent[]) {
    let success = 0;
    let failed = 0;
    for (const item of imported) {
      try {
        await calendarEventsResource.create({
          title: item.title,
          description: item.description,
          startAt: item.startAt,
          endAt: item.endAt,
          allDay: item.allDay,
          tz: "Asia/Taipei",
          type: item.type,
          location: item.location,
          recurrenceRule: item.recurrenceRule,
        });
        success += 1;
      } catch {
        failed += 1;
      }
    }
    await listQuery.refetch();
    if (failed === 0) toast.success(`已匯入 ${success} 筆事件`);
    else toast.error(`匯入完成：成功 ${success} 筆、失敗 ${failed} 筆`);
  }

  function handleExport() {
    if (events.length === 0) {
      toast.info("目前沒有事件可匯出");
      return;
    }
    downloadIcs(events);
    toast.success("已匯出 ICS 檔案");
  }

  const todayKey = toDateKey(new Date());

  const weeks = useMemo(() => {
    if (view !== "month") return [];
    const out: Date[][] = [];
    for (let w = 0; w < 6; w += 1) {
      const week: Date[] = [];
      for (let d = 0; d < 7; d += 1) week.push(addDays(rangeStart, w * 7 + d));
      out.push(week);
    }
    return out;
  }, [view, rangeStart]);

  const monthOccurrencesByDay = useMemo(() => {
    const map = new Map<string, Occurrence[]>();
    for (const occ of visibleOccurrences) {
      const key = toDateKey(occ.start);
      const list = map.get(key) ?? [];
      list.push(occ);
      map.set(key, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.start.getTime() - b.start.getTime());
    return map;
  }, [visibleOccurrences]);

  const timedOccurrences = useMemo(() => visibleOccurrences.filter((o) => !o.event.allDay), [visibleOccurrences]);
  const allDayOccurrences = useMemo(() => visibleOccurrences.filter((o) => o.event.allDay), [visibleOccurrences]);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1 text-ink">日曆</h1>
        <p className="text-caption text-ink-muted">安排行程、追蹤重複事件，並掌握時間衝突。</p>
      </header>

      {!online ? <OfflineState /> : null}

      <CalendarToolbar
        view={view}
        onViewChange={setView}
        rangeLabel={rangeLabel}
        onPrev={() => step(-1)}
        onNext={() => step(1)}
        onToday={goToday}
        onCreate={() => openCreate(new Date(), new Date(Date.now() + 60 * 60000))}
        onExport={handleExport}
        onImportClick={() => setImportOpen(true)}
      />

      {listQuery.isLoading ? (
        <div className="flex items-center justify-center rounded-lg border border-line bg-paper-raised py-16">
          <Spinner />
        </div>
      ) : listQuery.isError ? (
        <ErrorState description="日曆事件載入失敗，請檢查連線後重試。" onRetry={() => listQuery.refetch()} />
      ) : events.length === 0 ? (
        <EmptyState
          title="還沒有任何事件"
          description="新增第一筆行程，或從其他行事曆匯入 ICS 檔案。"
          action={
            <button
              type="button"
              onClick={() => openCreate(new Date(), new Date(Date.now() + 60 * 60000))}
              className="text-body font-medium text-accent underline underline-offset-2"
            >
              新增事件
            </button>
          }
        />
      ) : (
        <>
          {view === "day" ? (
            <TimeGrid
              days={[rangeStart]}
              timedOccurrences={timedOccurrences}
              allDayOccurrences={allDayOccurrences}
              conflictIds={conflictIds}
              onOpenEvent={openEdit}
              onRequestMove={requestMove}
              onQuickCreate={(s, e) => openCreate(s, e)}
              todayKey={todayKey}
            />
          ) : null}

          {view === "week" ? (
            <TimeGrid
              days={Array.from({ length: 7 }, (_, i) => addDays(rangeStart, i))}
              timedOccurrences={timedOccurrences}
              allDayOccurrences={allDayOccurrences}
              conflictIds={conflictIds}
              onOpenEvent={openEdit}
              onRequestMove={requestMove}
              onQuickCreate={(s, e) => openCreate(s, e)}
              todayKey={todayKey}
            />
          ) : null}

          {view === "month" ? (
            <MonthView
              weeks={weeks}
              monthDate={focusedDate}
              occurrencesByDay={monthOccurrencesByDay}
              conflictIds={conflictIds}
              todayKey={todayKey}
              onOpenEvent={openEdit}
              onOpenDay={(day) => {
                setFocusedDateKey(toDateKey(day));
                setView("day");
              }}
              onRequestMove={requestMove}
              onQuickCreate={(day) => openCreate(day, addDays(day, 0))}
            />
          ) : null}

          {view === "agenda" ? <AgendaView occurrences={visibleOccurrences} conflictIds={conflictIds} onOpenEvent={openEdit} /> : null}
        </>
      )}

      <EventForm
        open={Boolean(formState)}
        onClose={closeForm}
        onSubmit={handleFormSubmit}
        onDelete={formState?.mode === "edit" ? handleDelete : undefined}
        submitting={createMutation.isPending || updateMutation.isPending}
        initialEvent={formState?.mode === "edit" ? formState.event : undefined}
        defaultRange={formState?.mode === "create" ? formState.defaultRange : undefined}
      />

      <MoveConfirmDialog
        pending={pendingMove}
        onCancel={() => setPendingMove(null)}
        onConfirm={handleConfirmMove}
        submitting={updateMutation.isPending}
      />

      <IcsImportDialog open={importOpen} onClose={() => setImportOpen(false)} onConfirm={handleImportConfirm} />

      {undoState ? (
        <UndoBar
          message={`已刪除「${undoState.event.title}」`}
          onUndo={handleUndoDelete}
          onExpire={() => setUndoState(null)}
        />
      ) : null}
    </div>
  );
}
