"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { NOTIFICATION_CHANNEL_DEFS, buildTimezoneOptions, detectTimezone } from "../constants";
import { useSingletonResource } from "../hooks";
import { notificationPrefsResource } from "../resources";
import type { NotificationChannels, NotificationPrefs } from "../schema";
import { seedNotificationPrefs } from "../seed";

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "請輸入 HH:mm 格式的時間");

const formSchema = z.object({
  channels: z.object({
    taskReminders: z.boolean(),
    habitReminders: z.boolean(),
    medicationReminders: z.boolean(),
    waterReminders: z.boolean(),
    workoutReminders: z.boolean(),
    appointmentReminders: z.boolean(),
    weeklySummary: z.boolean(),
  }),
  quietHoursEnabled: z.boolean(),
  quietHoursStart: timeSchema,
  quietHoursEnd: timeSchema,
  timezone: z.string().min(1, "請選擇時區"),
});

type FormValues = z.infer<typeof formSchema>;

function prefsToFormValues(prefs: NotificationPrefs): FormValues {
  return {
    channels: prefs.channels,
    quietHoursEnabled: prefs.quietHoursEnabled,
    quietHoursStart: prefs.quietHoursStart,
    quietHoursEnd: prefs.quietHoursEnd,
    timezone: prefs.timezone,
  };
}

/** 通知偏好：各類型開關、安靜時段、時區。 */
export function NotificationForm() {
  const { record, isLoading, isError, errorMessage, save, isSaving, refetch } = useSingletonResource(
    notificationPrefsResource,
    () => seedNotificationPrefs()[0]!,
  );

  const {
    control,
    register,
    handleSubmit,
    watch,
    reset,
    formState: { isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: record ? prefsToFormValues(record) : undefined,
  });

  useEffect(() => {
    if (record) reset(prefsToFormValues(record));
  }, [record, reset]);

  if (isError) {
    return <ErrorState description={errorMessage ?? "通知偏好載入失敗，請稍後再試一次。"} onRetry={refetch} />;
  }

  if (isLoading || !record) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner />
      </div>
    );
  }

  const quietHoursEnabled = watch("quietHoursEnabled");

  function onSubmit(values: FormValues) {
    save({
      channels: values.channels as NotificationChannels,
      quietHoursEnabled: values.quietHoursEnabled,
      quietHoursStart: values.quietHoursStart,
      quietHoursEnd: values.quietHoursEnd,
      timezone: values.timezone,
    });
    toast.success("通知偏好已儲存。");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8">
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-label uppercase text-ink-muted">通知類型</legend>
        <div className="flex flex-col divide-y divide-line">
          {NOTIFICATION_CHANNEL_DEFS.map((channel) => (
            <label
              key={channel.key}
              htmlFor={`channel-${channel.key}`}
              className="flex cursor-pointer items-center justify-between gap-4 py-3"
            >
              <span className="flex flex-col">
                <span className="text-body text-ink">{channel.label}</span>
                <span className="text-caption text-ink-muted">{channel.description}</span>
              </span>
              <input
                id={`channel-${channel.key}`}
                type="checkbox"
                role="switch"
                className="h-5 w-9 shrink-0 cursor-pointer accent-ink"
                {...register(`channels.${channel.key}`)}
              />
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 text-label uppercase text-ink-muted">安靜時段與時區</legend>
        <label htmlFor="quiet-hours-enabled" className="flex cursor-pointer items-center justify-between gap-4">
          <span className="flex flex-col">
            <span className="text-body text-ink">啟用安靜時段</span>
            <span className="text-caption text-ink-muted">此時段內不會發送非緊急通知。</span>
          </span>
          <input
            id="quiet-hours-enabled"
            type="checkbox"
            role="switch"
            className="h-5 w-9 shrink-0 cursor-pointer accent-ink"
            {...register("quietHoursEnabled")}
          />
        </label>

        {quietHoursEnabled ? (
          <div className="grid grid-cols-2 gap-4">
            <Input label="開始時間" type="time" {...register("quietHoursStart")} />
            <Input label="結束時間" type="time" {...register("quietHoursEnd")} />
          </div>
        ) : null}

        <Controller
          control={control}
          name="timezone"
          render={({ field }) => (
            <Select
              label="時區"
              options={buildTimezoneOptions(field.value)}
              value={field.value}
              onChange={(e) => field.onChange(e.target.value)}
              hint={`偵測到的裝置時區：${detectTimezone()}`}
            />
          )}
        />
      </fieldset>

      <div className="flex justify-end">
        <Button type="submit" loading={isSaving} disabled={!isDirty && !isSaving}>
          儲存通知偏好
        </Button>
      </div>
    </form>
  );
}
