"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import { Sheet } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";

import { nowIso } from "@/lib/resource";
import { findActiveSession, timerSessionsResource } from "./api";
import { focusCategorySchema, FOCUS_CATEGORY_OPTIONS, POMODORO_DEFAULTS, timerModeSchema } from "./types";

const formSchema = z.object({
  label: z.string().min(1, "請輸入名稱").max(120),
  category: focusCategorySchema,
  mode: timerModeSchema,
  targetMinutes: z.coerce.number().int().min(1, "至少 1 分鐘").max(240, "最長 240 分鐘").optional(),
  taskId: z.string().max(80).optional(),
  projectId: z.string().max(80).optional(),
  note: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof formSchema>;

export interface StartTimerSheetProps {
  open: boolean;
  onClose: () => void;
  onStarted?: () => void;
}

export function StartTimerSheet({ open, onClose, onStarted }: StartTimerSheetProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      label: "",
      category: "deep_work",
      mode: "stopwatch",
      targetMinutes: POMODORO_DEFAULTS.focusMinutes,
      taskId: "",
      projectId: "",
      note: "",
    },
  });

  const mode = watch("mode");

  async function onSubmit(values: FormValues) {
    try {
      // 啟動前檢查：同一使用者僅允許一個執行中（含暫停中）的計時器。
      const current = await timerSessionsResource.list({ pageSize: 100 });
      const active = findActiveSession(current.results);
      if (active) {
        toast.error(`「${active.label}」尚在計時中，請先停止或取消後再開始新的計時。`);
        return;
      }

      const startAt = nowIso();
      await timerSessionsResource.create({
        label: values.label.trim(),
        category: values.category,
        taskId: values.taskId?.trim() ? values.taskId.trim() : null,
        projectId: values.projectId?.trim() ? values.projectId.trim() : null,
        status: "running",
        mode: values.mode,
        targetSeconds: values.mode === "pomodoro" ? (values.targetMinutes ?? POMODORO_DEFAULTS.focusMinutes) * 60 : null,
        sessionStartAt: startAt,
        accumulatedSeconds: 0,
        startedAt: startAt,
        pausedAt: null,
        completedAt: null,
        pomodoroPhase: values.mode === "pomodoro" ? "focus" : null,
        pomodoroCount: 0,
        note: values.note?.trim() ?? "",
      });
      toast.success("計時器已開始");
      reset();
      onStarted?.();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "啟動計時器失敗，請再試一次。");
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="開始新的計時"
      description="設定名稱與分類後即可開始，同一時間僅能有一個執行中的計時器。"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button type="submit" form="start-timer-form" loading={isSubmitting}>
            開始計時
          </Button>
        </>
      }
    >
      <form id="start-timer-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input label="名稱" placeholder="例如：撰寫季度報告" error={errors.label?.message} {...register("label")} />

        <Select label="分類" options={FOCUS_CATEGORY_OPTIONS} error={errors.category?.message} {...register("category")} />

        <div className="flex flex-col gap-1.5">
          <span className="text-label uppercase text-ink-muted">模式</span>
          <Segmented
            label="計時模式"
            value={mode}
            onChange={(v) => setValue("mode", v as FormValues["mode"], { shouldValidate: true })}
            options={[
              { value: "stopwatch", label: "碼表（正向計時）" },
              { value: "pomodoro", label: "番茄鐘（倒數）" },
            ]}
          />
        </div>

        {mode === "pomodoro" ? (
          <Input
            type="number"
            label="目標分鐘數"
            min={1}
            max={240}
            error={errors.targetMinutes?.message}
            {...register("targetMinutes")}
          />
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="關聯任務（選填）" placeholder="任務 ID / 名稱" {...register("taskId")} />
          <Input label="關聯專案（選填）" placeholder="專案 ID / 名稱" {...register("projectId")} />
        </div>

        <Textarea label="備註（選填）" rows={2} {...register("note")} />
      </form>
    </Sheet>
  );
}
