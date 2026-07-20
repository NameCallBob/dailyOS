"use client";

/**
 * symptom-def-form-sheet.tsx — 新增／編輯「症狀定義」（底部抽屜表單）。
 * 症狀定義本身很輕量（名稱 + 分類 + 說明），刻意不放額外必填欄位，
 * 讓使用者可以快速建立自訂症狀後立即開始記錄。
 */

import { useEffect } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Sheet } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { ApiRequestError } from "@/lib/types";

import { SYMPTOM_CATEGORIES } from "../constants";
import { symptomDefsResource } from "../resources";
import type { SymptomDefinition } from "../schema";

export interface SymptomDefFormSheetProps {
  open: boolean;
  onClose: () => void;
  editing?: SymptomDefinition | null;
}

interface FormValues {
  name: string;
  category: string;
  note: string;
}

function toDefaultValues(editing?: SymptomDefinition | null): FormValues {
  if (!editing) return { name: "", category: "疼痛", note: "" };
  return { name: editing.name, category: editing.category, note: editing.note ?? "" };
}

export function SymptomDefFormSheet({ open, onClose, editing }: SymptomDefFormSheetProps) {
  const createMutation = symptomDefsResource.useCreate();
  const updateMutation = symptomDefsResource.useUpdate();

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
    const payload: Partial<SymptomDefinition> = {
      name: values.name.trim(),
      category: values.category as SymptomDefinition["category"],
      note: values.note.trim() || undefined,
      archived: editing?.archived ?? false,
    };

    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, patch: payload });
        toast.success("已更新症狀設定");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("已新增自訂症狀");
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
      title={editing ? "編輯症狀" : "新增自訂症狀"}
      description="先建立症狀項目（例如「右肩痠痛」），之後就能快速為它記錄每次發作。"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button type="submit" form="symptom-def-form" loading={isSubmitting}>
            {editing ? "儲存變更" : "新增症狀"}
          </Button>
        </>
      }
    >
      <form id="symptom-def-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label="症狀名稱"
          required
          placeholder="例如：偏頭痛、右膝痠痛、焦慮情緒"
          error={errors.name?.message}
          {...register("name", { required: "請輸入症狀名稱", maxLength: { value: 30, message: "名稱過長" } })}
        />
        <Select
          label="分類"
          required
          options={SYMPTOM_CATEGORIES}
          error={errors.category?.message}
          {...register("category", { required: "請選擇分類" })}
        />
        <Textarea
          label="說明（選填）"
          placeholder="補充描述，例如常見誘因或型態"
          error={errors.note?.message}
          {...register("note", { maxLength: { value: 200, message: "說明過長" } })}
        />
      </form>
    </Sheet>
  );
}
