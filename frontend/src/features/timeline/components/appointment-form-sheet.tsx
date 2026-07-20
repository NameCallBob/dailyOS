"use client";

/**
 * appointment-form-sheet.tsx — 新增／編輯回診（底部抽屜表單）。
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Sheet } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { ApiRequestError } from "@/lib/types";

import { formatTime, todayKey } from "../date-utils";
import { appointmentsResource } from "../resources";
import { APPOINTMENT_STATUS_LABEL, APPOINTMENT_STATUS_VALUES, type Appointment } from "../schema";

const formSchema = z.object({
  date: z.string().min(1, "請選擇日期"),
  time: z.string().min(1, "請選擇時間"),
  doctor: z.string().max(40, "醫師姓名過長").optional(),
  department: z.string().max(40, "科別過長").optional(),
  location: z.string().min(1, "請輸入地點").max(80, "地點過長"),
  reason: z.string().max(200, "回診原因過長").optional(),
  status: z.enum(APPOINTMENT_STATUS_VALUES),
  reminderMinutesBefore: z.coerce.number().int().min(0).max(10080).optional(),
  followUpNeeded: z.boolean(),
  notes: z.string().max(500, "備註過長").optional(),
});

type FormValues = z.infer<typeof formSchema>;

const STATUS_OPTIONS = APPOINTMENT_STATUS_VALUES.map((value) => ({ value, label: APPOINTMENT_STATUS_LABEL[value] }));

function toDefaultValues(editing?: Appointment | null): FormValues {
  if (!editing) {
    return {
      date: todayKey(),
      time: "09:00",
      doctor: "",
      department: "",
      location: "",
      reason: "",
      status: "scheduled",
      reminderMinutesBefore: 60,
      followUpNeeded: false,
      notes: "",
    };
  }
  return {
    date: editing.startAt.slice(0, 10),
    time: formatTime(editing.startAt),
    doctor: editing.doctor ?? "",
    department: editing.department ?? "",
    location: editing.location,
    reason: editing.reason ?? "",
    status: editing.status,
    reminderMinutesBefore: editing.reminderMinutesBefore,
    followUpNeeded: editing.followUpNeeded,
    notes: editing.notes ?? "",
  };
}

export interface AppointmentFormSheetProps {
  open: boolean;
  onClose: () => void;
  editing?: Appointment | null;
}

export function AppointmentFormSheet({ open, onClose, editing }: AppointmentFormSheetProps) {
  const createMutation = appointmentsResource.useCreate();
  const updateMutation = appointmentsResource.useUpdate();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: toDefaultValues(editing) });

  useEffect(() => {
    if (open) reset(toDefaultValues(editing));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id]);

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    const startAt = new Date(`${values.date}T${values.time || "00:00"}:00`).toISOString();
    const payload: Partial<Appointment> = {
      startAt,
      doctor: values.doctor?.trim() || undefined,
      department: values.department?.trim() || undefined,
      location: values.location.trim(),
      reason: values.reason?.trim() || undefined,
      status: values.status,
      reminderMinutesBefore: values.reminderMinutesBefore,
      followUpNeeded: values.followUpNeeded,
      notes: values.notes?.trim() || undefined,
    };

    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, patch: payload });
        toast.success("已更新回診紀錄");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("已新增回診紀錄");
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
    <Sheet open={open} onClose={onClose} title={editing ? "編輯回診" : "新增回診"} description="安排或記錄一次回診／看診">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="日期" type="date" {...register("date")} error={errors.date?.message} />
          <Input label="時間" type="time" {...register("time")} error={errors.time?.message} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="醫師" placeholder="例如：陳〇〇 醫師" {...register("doctor")} error={errors.doctor?.message} />
          <Input label="科別" placeholder="例如：骨科" {...register("department")} error={errors.department?.message} />
        </div>
        <Input label="地點" placeholder="院所名稱" {...register("location")} error={errors.location?.message} />
        <Input label="回診原因" placeholder="例如：追蹤下背痛" {...register("reason")} error={errors.reason?.message} />
        <div className="grid grid-cols-2 gap-3">
          <Select label="狀態" options={STATUS_OPTIONS} {...register("status")} error={errors.status?.message} />
          <Input
            label="提醒（分鐘前）"
            type="number"
            min={0}
            {...register("reminderMinutesBefore")}
            error={errors.reminderMinutesBefore?.message}
          />
        </div>
        <label className="flex items-center gap-2 text-body text-ink-soft">
          <input type="checkbox" className="h-4 w-4 rounded border-line-strong" {...register("followUpNeeded")} />
          需要安排下次回診
        </label>
        <Textarea label="備註" placeholder="例如：需攜帶前次報告" {...register("notes")} error={errors.notes?.message} />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {editing ? "儲存變更" : "新增回診"}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
