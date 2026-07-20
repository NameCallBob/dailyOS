"use client";

/**
 * features/calendar/event-form.tsx — 新增／編輯事件表單（bottom sheet，react-hook-form + zod）。
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Sheet } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

import { combineDateTime, toLocalInputDate, toLocalInputTime } from "./date-utils";
import { buildRecurrenceRule, parseRecurrenceRule } from "./recurrence";
import {
  CALENDAR_EVENT_TYPE_LABELS,
  CALENDAR_EVENT_TYPES,
  IANA_TIMEZONES,
  RECURRENCE_FREQS,
  calendarEventFormSchema,
  type CalendarEvent,
  type CalendarEventFormValues,
} from "./schema";

const RECURRENCE_LABELS: Record<(typeof RECURRENCE_FREQS)[number], string> = {
  NONE: "不重複",
  DAILY: "每天",
  WEEKLY: "每週",
  MONTHLY: "每月",
};

export interface EventFormSubmitPayload {
  patch: Partial<CalendarEvent>;
}

export interface EventFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: EventFormSubmitPayload) => void;
  onDelete?: () => void;
  submitting?: boolean;
  /** 編輯既有事件時帶入；新增時為 undefined */
  initialEvent?: CalendarEvent;
  /** 快速新增時可預帶開始/結束時間 */
  defaultRange?: { start: Date; end: Date; allDay?: boolean };
}

function toDefaultValues(event: CalendarEvent | undefined, range: EventFormProps["defaultRange"]): CalendarEventFormValues {
  if (event) {
    const rule = parseRecurrenceRule(event.recurrenceRule);
    return {
      title: event.title,
      description: event.description ?? "",
      date: toLocalInputDate(event.startAt),
      startTime: event.allDay ? undefined : toLocalInputTime(event.startAt),
      endTime: event.allDay ? undefined : toLocalInputTime(event.endAt),
      endDate: toLocalInputDate(event.endAt),
      allDay: event.allDay,
      tz: event.tz,
      type: event.type,
      location: event.location ?? "",
      recurrenceFreq: rule.freq,
      recurrenceInterval: rule.interval,
      recurrenceCount: rule.count,
      recurrenceUntil: rule.until?.slice(0, 10),
    };
  }
  const start = range?.start ?? new Date();
  const end = range?.end ?? new Date(start.getTime() + 60 * 60000);
  return {
    title: "",
    description: "",
    date: toLocalInputDate(start.toISOString()),
    startTime: range?.allDay ? undefined : formatHm(start),
    endTime: range?.allDay ? undefined : formatHm(end),
    endDate: toLocalInputDate(end.toISOString()),
    allDay: Boolean(range?.allDay),
    tz: "Asia/Taipei",
    type: "personal",
    location: "",
    recurrenceFreq: "NONE",
    recurrenceInterval: 1,
    recurrenceCount: undefined,
    recurrenceUntil: undefined,
  };
}

function formatHm(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function EventForm({ open, onClose, onSubmit, onDelete, submitting, initialEvent, defaultRange }: EventFormProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<CalendarEventFormValues>({
    resolver: zodResolver(calendarEventFormSchema),
    defaultValues: toDefaultValues(initialEvent, defaultRange),
  });

  useEffect(() => {
    if (open) {
      reset(toDefaultValues(initialEvent, defaultRange));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialEvent?.id]);

  const allDay = watch("allDay");
  const recurrenceFreq = watch("recurrenceFreq");

  function submit(values: CalendarEventFormValues) {
    const startAt = values.allDay
      ? combineDateTime(values.date, "00:00").toISOString()
      : combineDateTime(values.date, values.startTime ?? "00:00").toISOString();
    const endDateKey = values.allDay ? values.endDate || values.date : values.date;
    const endAt = values.allDay
      ? combineDateTime(nextDayKey(endDateKey), "00:00").toISOString()
      : combineDateTime(values.date, values.endTime ?? "00:00").toISOString();

    const recurrenceRule = buildRecurrenceRule({
      freq: values.recurrenceFreq,
      interval: values.recurrenceInterval,
      count: values.recurrenceCount,
      until: values.recurrenceUntil ? new Date(values.recurrenceUntil).toISOString() : undefined,
    });

    onSubmit({
      patch: {
        title: values.title,
        description: values.description || undefined,
        startAt,
        endAt,
        allDay: values.allDay,
        tz: values.tz,
        type: values.type,
        location: values.location || undefined,
        recurrenceRule,
      },
    });
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={initialEvent ? "編輯事件" : "新增事件"}
      description={initialEvent ? "調整時間或內容後儲存。" : "填寫事件資訊，儲存後將顯示於日曆。"}
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          {initialEvent && onDelete ? (
            <Button type="button" variant="danger" size="sm" onClick={onDelete}>
              刪除事件
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" form="calendar-event-form" size="sm" loading={submitting}>
              儲存
            </Button>
          </div>
        </div>
      }
    >
      <form id="calendar-event-form" onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
        <Input label="標題" placeholder="例如：與設計師討論介面稿" error={errors.title?.message} {...register("title")} />

        <div className="grid grid-cols-2 gap-3">
          <Input label="日期" type="date" error={errors.date?.message} {...register("date")} />
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <Select
                label="類別"
                options={CALENDAR_EVENT_TYPES.map((t) => ({ value: t, label: CALENDAR_EVENT_TYPE_LABELS[t] }))}
                {...field}
              />
            )}
          />
        </div>

        <label className="flex items-center gap-2 text-body text-ink">
          <input type="checkbox" className="h-4 w-4 rounded border-line-strong" {...register("allDay")} />
          全天事件
        </label>

        {allDay ? (
          <Input label="結束日期" type="date" hint="全天事件可跨多天" {...register("endDate")} />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Input label="開始時間" type="time" error={errors.startTime?.message} {...register("startTime")} />
            <Input label="結束時間" type="time" error={errors.endTime?.message} {...register("endTime")} />
          </div>
        )}

        <Controller
          control={control}
          name="tz"
          render={({ field }) => (
            <Select label="時區" options={IANA_TIMEZONES.map((tz) => ({ value: tz, label: tz }))} {...field} />
          )}
        />

        <Input label="地點" placeholder="選填" {...register("location")} />
        <Textarea label="備註" placeholder="選填" rows={3} {...register("description")} />

        <fieldset className="flex flex-col gap-3 rounded-md border border-line p-3">
          <legend className="px-1 text-label uppercase text-ink-muted">重複規則</legend>
          <Controller
            control={control}
            name="recurrenceFreq"
            render={({ field }) => (
              <Select
                label="頻率"
                options={RECURRENCE_FREQS.map((f) => ({ value: f, label: RECURRENCE_LABELS[f] }))}
                {...field}
              />
            )}
          />
          {recurrenceFreq !== "NONE" ? (
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="間隔"
                type="number"
                min={1}
                hint={recurrenceFreq === "DAILY" ? "每幾天" : recurrenceFreq === "WEEKLY" ? "每幾週" : "每幾月"}
                {...register("recurrenceInterval")}
              />
              <Input label="重複次數" type="number" min={1} hint="留空表示不限次數" {...register("recurrenceCount")} />
            </div>
          ) : null}
        </fieldset>
      </form>
    </Sheet>
  );
}

function nextDayKey(dateKey: string): string {
  const d = new Date(dateKey);
  d.setDate(d.getDate() + 1);
  return toLocalInputDate(d.toISOString());
}
