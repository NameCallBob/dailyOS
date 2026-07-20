"use client";

/** exercise-def-form-sheet.tsx — 新增／編輯動作庫項目。 */

import { useEffect } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Sheet } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { ApiRequestError } from "@/lib/types";

import { exerciseDefsResource } from "../resources";
import type { ExerciseDef } from "../schema";
import { MUSCLE_GROUP_OPTIONS, type MuscleGroup } from "../types";

export interface ExerciseDefFormSheetProps {
  open: boolean;
  onClose: () => void;
  editing?: ExerciseDef | null;
}

interface FormValues {
  name: string;
  category: MuscleGroup;
  equipment: string;
  notes: string;
}

function toDefaultValues(editing?: ExerciseDef | null): FormValues {
  if (!editing) return { name: "", category: "全身", equipment: "", notes: "" };
  return {
    name: editing.name,
    category: editing.category,
    equipment: editing.equipment ?? "",
    notes: editing.notes ?? "",
  };
}

export function ExerciseDefFormSheet({ open, onClose, editing }: ExerciseDefFormSheetProps) {
  const createMutation = exerciseDefsResource.useCreate();
  const updateMutation = exerciseDefsResource.useUpdate();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues: toDefaultValues(editing) });

  useEffect(() => {
    if (open) reset(toDefaultValues(editing));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id]);

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    const payload: Partial<ExerciseDef> = {
      name: values.name.trim(),
      category: values.category,
      equipment: values.equipment.trim() || undefined,
      notes: values.notes.trim() || undefined,
      isCustom: true,
    };
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, patch: payload });
        toast.success("已更新動作");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("已新增自訂動作");
      }
      onClose();
    } catch (err) {
      if (err instanceof ApiRequestError && err.fieldErrors) {
        for (const [field, messages] of Object.entries(err.fieldErrors)) {
          setError(field as keyof FormValues, { type: "server", message: messages[0] ?? "格式不正確" });
        }
      }
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editing ? "編輯動作" : "新增自訂動作"}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button type="submit" form="exercise-def-form" loading={isSubmitting}>
            {editing ? "儲存變更" : "新增動作"}
          </Button>
        </>
      }
    >
      <form id="exercise-def-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input label="動作名稱" required {...register("name", { required: "請輸入動作名稱" })} error={errors.name?.message} />
        <Select label="訓練部位" options={[...MUSCLE_GROUP_OPTIONS]} required {...register("category", { required: true })} />
        <Input label="器材（選填）" placeholder="例如：槓鈴、啞鈴、徒手" {...register("equipment")} />
        <Textarea label="備註（選填）" {...register("notes")} />
      </form>
    </Sheet>
  );
}
