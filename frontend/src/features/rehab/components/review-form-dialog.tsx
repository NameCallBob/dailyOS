"use client";

/**
 * review-form-dialog.tsx — 新增回診／調整紀錄，寫入 rehab_plans.reviewNotes。
 * 純粹記錄用途：即使勾選「包含處方調整」，也不會自動修改任何項目的處方值，
 * 使用者仍需另外到「復健項目」表單手動調整。
 */

import { useEffect } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { newId } from "@/lib/resource";

import { rehabPlansResource } from "../resources";
import type { RehabPlan } from "../schema";
import { todayIsoDate } from "../utils";

export interface ReviewFormDialogProps {
  open: boolean;
  onClose: () => void;
  plan: RehabPlan;
}

interface FormValues {
  date: string;
  note: string;
  adjustment: boolean;
}

export function ReviewFormDialog({ open, onClose, plan }: ReviewFormDialogProps) {
  const updateMutation = rehabPlansResource.useUpdate();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues: { date: todayIsoDate(), note: "", adjustment: false } });

  useEffect(() => {
    if (open) reset({ date: todayIsoDate(), note: "", adjustment: false });
  }, [open, reset]);

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    const entry = { id: newId(), date: values.date, note: values.note.trim(), adjustment: values.adjustment };
    try {
      await updateMutation.mutateAsync({
        id: plan.id,
        patch: { reviewNotes: [...plan.reviewNotes, entry] },
      });
      toast.success("已新增回診紀錄");
      onClose();
    } catch {
      // 失敗提示已由 resource.ts 統一顯示。
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="新增回診紀錄"
      description="記錄回診結果或治療師說明；若有處方調整，請額外到「復健項目」表單手動修改對應數值。"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button type="submit" form="rehab-review-form" loading={isSubmitting}>
            新增
          </Button>
        </>
      }
    >
      <form id="rehab-review-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input type="date" label="日期" required error={errors.date?.message} {...register("date", { required: "請選擇日期" })} />
        <Textarea
          label="回診內容"
          rows={3}
          required
          error={errors.note?.message}
          {...register("note", { required: "請輸入回診內容" })}
        />
        <label className="flex items-center gap-2 text-body text-ink">
          <input type="checkbox" className="h-4 w-4 rounded border-line-strong" {...register("adjustment")} />
          此次回診包含處方調整
        </label>
      </form>
    </Dialog>
  );
}
