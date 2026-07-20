"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Sheet } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";

import { timeEntriesResource } from "./api";
import { formatDateTimeLocal } from "./format";
import { focusCategorySchema, FOCUS_CATEGORY_OPTIONS } from "./types";

const formSchema = z
  .object({
    label: z.string().min(1, "請輸入名稱").max(120),
    category: focusCategorySchema,
    startAt: z.string().min(1, "請選擇開始時間"),
    endAt: z.string().min(1, "請選擇結束時間"),
    taskId: z.string().max(80).optional(),
    projectId: z.string().max(80).optional(),
    note: z.string().max(500).optional(),
  })
  .refine((v) => new Date(v.endAt).getTime() > new Date(v.startAt).getTime(), {
    message: "結束時間必須晚於開始時間",
    path: ["endAt"],
  });

type FormValues = z.infer<typeof formSchema>;

export interface ManualEntrySheetProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function ManualEntrySheet({ open, onClose, onSaved }: ManualEntrySheetProps) {
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      label: "",
      category: "deep_work",
      startAt: formatDateTimeLocal(hourAgo.toISOString()),
      endAt: formatDateTimeLocal(now.toISOString()),
      taskId: "",
      projectId: "",
      note: "",
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      const startAt = new Date(values.startAt).toISOString();
      const endAt = new Date(values.endAt).toISOString();
      const durationSeconds = Math.round((new Date(endAt).getTime() - new Date(startAt).getTime()) / 1000);
      await timeEntriesResource.create({
        label: values.label.trim(),
        category: values.category,
        taskId: values.taskId?.trim() ? values.taskId.trim() : null,
        projectId: values.projectId?.trim() ? values.projectId.trim() : null,
        timerSessionId: null,
        startAt,
        endAt,
        durationSeconds,
        source: "manual",
        note: values.note?.trim() ?? "",
      });
      toast.success("已補登時間紀錄");
      reset();
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "補登失敗，請再試一次。");
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="手動補登時間"
      description="忘記啟動計時器時，可在此手動記錄一段已完成的時間區段。"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button type="submit" form="manual-entry-form" loading={isSubmitting}>
            儲存
          </Button>
        </>
      }
    >
      <form id="manual-entry-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input label="名稱" placeholder="例如：機場候機閱讀" error={errors.label?.message} {...register("label")} />

        <Select label="分類" options={FOCUS_CATEGORY_OPTIONS} error={errors.category?.message} {...register("category")} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input type="datetime-local" label="開始時間" error={errors.startAt?.message} {...register("startAt")} />
          <Input type="datetime-local" label="結束時間" error={errors.endAt?.message} {...register("endAt")} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="關聯任務（選填）" placeholder="任務 ID / 名稱" {...register("taskId")} />
          <Input label="關聯專案（選填）" placeholder="專案 ID / 名稱" {...register("projectId")} />
        </div>

        <Textarea label="備註（選填）" rows={2} {...register("note")} />
      </form>
    </Sheet>
  );
}
