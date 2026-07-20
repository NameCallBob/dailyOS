"use client";

/**
 * plan-form-sheet.tsx — 新增／編輯復健計畫（底部抽屜表單）。
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

import { BODY_REGION_OPTIONS } from "../constants";
import { rehabPlansResource } from "../resources";
import type { RehabPlan } from "../schema";
import { todayIsoDate } from "../utils";

export interface PlanFormSheetProps {
  open: boolean;
  onClose: () => void;
  editing?: RehabPlan | null;
  onCreated?: (plan: RehabPlan) => void;
}

interface FormValues {
  name: string;
  bodyRegion: string;
  diagnosis: string;
  goal: string;
  therapistName: string;
  clinicName: string;
  startDate: string;
  nextAppointmentAt: string;
  generalCautions: string;
  note: string;
}

function toDefaultValues(editing?: RehabPlan | null): FormValues {
  if (!editing) {
    return {
      name: "",
      bodyRegion: "",
      diagnosis: "",
      goal: "",
      therapistName: "",
      clinicName: "",
      startDate: todayIsoDate(),
      nextAppointmentAt: "",
      generalCautions: "",
      note: "",
    };
  }
  return {
    name: editing.name,
    bodyRegion: editing.bodyRegion ?? "",
    diagnosis: editing.diagnosis ?? "",
    goal: editing.goal ?? "",
    therapistName: editing.therapistName ?? "",
    clinicName: editing.clinicName ?? "",
    startDate: editing.startDate,
    nextAppointmentAt: editing.nextAppointmentAt ?? "",
    generalCautions: editing.generalCautions ?? "",
    note: editing.note ?? "",
  };
}

export function PlanFormSheet({ open, onClose, editing, onCreated }: PlanFormSheetProps) {
  const createMutation = rehabPlansResource.useCreate();
  const updateMutation = rehabPlansResource.useUpdate();

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
    const payload: Partial<RehabPlan> = {
      name: values.name.trim(),
      bodyRegion: values.bodyRegion || undefined,
      diagnosis: values.diagnosis.trim() || undefined,
      goal: values.goal.trim() || undefined,
      therapistName: values.therapistName.trim() || undefined,
      clinicName: values.clinicName.trim() || undefined,
      startDate: values.startDate,
      nextAppointmentAt: values.nextAppointmentAt || undefined,
      generalCautions: values.generalCautions.trim() || undefined,
      note: values.note.trim() || undefined,
    };

    try {
      if (editing) {
        const record = await updateMutation.mutateAsync({ id: editing.id, patch: payload });
        toast.success("已更新復健計畫");
        onCreated?.(record);
      } else {
        const record = await createMutation.mutateAsync({ ...payload, active: true, reviewNotes: [] });
        toast.success("已新增復健計畫");
        onCreated?.(record);
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
      title={editing ? "編輯復健計畫" : "新增復健計畫"}
      description="計畫是多個復健項目的容器，個別項目的組數／劑量請於計畫內另行新增。"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button type="submit" form="rehab-plan-form" loading={isSubmitting}>
            {editing ? "儲存變更" : "建立計畫"}
          </Button>
        </>
      }
    >
      <form id="rehab-plan-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input label="計畫名稱" required error={errors.name?.message} {...register("name", { required: "請輸入計畫名稱" })} />
        <Select label="部位" placeholder="請選擇部位（選填）" options={BODY_REGION_OPTIONS} {...register("bodyRegion")} />
        <Textarea label="診斷／原因" rows={2} {...register("diagnosis")} />
        <Textarea label="復健目標" rows={2} {...register("goal")} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="治療師姓名" {...register("therapistName")} />
          <Input label="診所／院所" {...register("clinicName")} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input type="date" label="開始日期" required error={errors.startDate?.message} {...register("startDate", { required: "請選擇開始日期" })} />
          <Input type="date" label="下次回診日期（選填）" {...register("nextAppointmentAt")} />
        </div>
        <Textarea
          label="一般注意事項"
          hint="例如：疼痛超過幾分需停止、何時該提前回診等安全提醒。"
          rows={2}
          {...register("generalCautions")}
        />
        <Textarea label="備註" rows={2} {...register("note")} />
      </form>
    </Sheet>
  );
}
