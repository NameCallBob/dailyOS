"use client";

/**
 * symptom-log-form-sheet.tsx — 新增／編輯症狀發作紀錄（底部抽屜表單）。
 *
 * 快速紀錄優先：僅「症狀」「開始時間」「強度」為必填，部位／誘因／緩解／備註／照片
 * 皆選填且視覺上退居次要位置。若偵測到疑似緊急狀況（強度極高或文字含警示關鍵字），
 * 顯示保守就醫提醒——純提示、不阻擋送出、不做診斷。
 */

import { useEffect, useMemo, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Sheet } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { ApiRequestError } from "@/lib/types";

import { RELIEF_PRESETS, TRIGGER_PRESETS, type BodyRegionKey } from "../constants";
import { symptomDefsResource, symptomLogsResource } from "../resources";
import type { SymptomDefinition, SymptomLog } from "../schema";
import { evaluateUrgency, formatTime, todayIsoDate } from "../utils";
import { BodyMapPicker } from "./body-map-picker";
import { IntensityScale } from "./intensity-scale";
import { TagChipsInput } from "./tag-chips-input";
import { UrgentCareBanner } from "./urgent-care-banner";

export interface SymptomLogFormSheetProps {
  open: boolean;
  onClose: () => void;
  editing?: SymptomLog | null;
  defs: SymptomDefinition[];
  prefillDefId?: string | null;
  onCreateDef: () => void;
}

interface FormValues {
  symptomDefId: string;
  date: string;
  time: string;
  intensity: number | undefined;
  bodyLocation: string;
  durationMin: number | undefined;
  triggers: string[];
  relief: string[];
  notes: string;
  photo: string;
}

function toDefaultValues(editing?: SymptomLog | null, prefillDefId?: string | null): FormValues {
  if (!editing) {
    return {
      symptomDefId: prefillDefId ?? "",
      date: todayIsoDate(),
      time: formatTime(new Date().toISOString()) || "08:00",
      intensity: undefined,
      bodyLocation: "",
      durationMin: undefined,
      triggers: [],
      relief: [],
      notes: "",
      photo: "",
    };
  }
  return {
    symptomDefId: editing.symptomDefId,
    date: editing.date,
    time: formatTime(editing.startAt) || "08:00",
    intensity: editing.intensity,
    bodyLocation: editing.bodyLocation ?? "",
    durationMin: editing.durationMin,
    triggers: editing.triggers ?? [],
    relief: editing.relief ?? [],
    notes: editing.notes ?? "",
    photo: editing.photo ?? "",
  };
}

const MAX_PHOTO_BYTES = 2 * 1024 * 1024; // 2MB，避免 Dexie/表單過度肥大

export function SymptomLogFormSheet({ open, onClose, editing, defs, prefillDefId, onCreateDef }: SymptomLogFormSheetProps) {
  const createMutation = symptomLogsResource.useCreate();
  const updateMutation = symptomLogsResource.useUpdate();
  const [photoError, setPhotoError] = useState<string | undefined>();

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues: toDefaultValues(editing, prefillDefId) });

  useEffect(() => {
    if (open) {
      reset(toDefaultValues(editing, prefillDefId));
      setPhotoError(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id]);

  const watched = watch();
  const activeDefs = useMemo(() => defs.filter((d) => !d.archived || d.id === watched.symptomDefId), [defs, watched.symptomDefId]);
  const selectedDef = defs.find((d) => d.id === watched.symptomDefId);

  const urgency = evaluateUrgency({
    intensity: watched.intensity,
    notes: watched.notes,
    bodyLocation: watched.bodyLocation,
    name: selectedDef?.name,
  });

  function handlePhotoChange(file: File | undefined) {
    setPhotoError(undefined);
    if (!file) {
      setValue("photo", "");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError("照片檔案過大（上限 2MB），請選擇較小的檔案。");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setValue("photo", typeof reader.result === "string" ? reader.result : "");
    };
    reader.onerror = () => setPhotoError("讀取照片失敗，請再試一次。");
    reader.readAsDataURL(file);
  }

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    if (!values.symptomDefId) {
      setError("symptomDefId", { type: "required", message: "請選擇症狀" });
      return;
    }
    if (values.intensity === undefined || Number.isNaN(values.intensity)) {
      setError("intensity", { type: "required", message: "請選擇強度" });
      return;
    }
    const startAt = new Date(`${values.date}T${values.time || "00:00"}:00`).toISOString();
    const payload: Partial<SymptomLog> = {
      symptomDefId: values.symptomDefId,
      date: values.date,
      startAt,
      intensity: values.intensity ?? 0,
      bodyLocation: values.bodyLocation || undefined,
      durationMin: values.durationMin,
      triggers: values.triggers.length > 0 ? values.triggers : undefined,
      relief: values.relief.length > 0 ? values.relief : undefined,
      notes: values.notes.trim() || undefined,
      photo: values.photo || undefined,
    };

    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, patch: payload });
        toast.success("已更新症狀紀錄");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("已新增症狀紀錄");
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
      title={editing ? "編輯症狀紀錄" : "新增症狀紀錄"}
      description="症狀、開始時間與強度為必填；其餘欄位可略過，先記下來之後再補充也沒關係。"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button type="submit" form="symptom-log-form" loading={isSubmitting}>
            {editing ? "儲存變更" : "新增紀錄"}
          </Button>
        </>
      }
    >
      <form id="symptom-log-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        {urgency.triggered ? <UrgentCareBanner /> : null}

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Select
              label="症狀"
              required
              placeholder={activeDefs.length === 0 ? "尚無症狀，請先新增" : "請選擇"}
              options={activeDefs.map((d) => ({ value: d.id, label: `${d.name}（${d.category}）` }))}
              error={errors.symptomDefId?.message}
              {...register("symptomDefId", { required: "請選擇症狀" })}
            />
          </div>
          <Button type="button" variant="secondary" size="md" onClick={onCreateDef}>
            + 新症狀
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input type="date" label="日期" required {...register("date", { required: "請選擇日期" })} error={errors.date?.message} />
          <Input type="time" label="開始時間" required {...register("time", { required: "請選擇時間" })} error={errors.time?.message} />
        </div>

        <IntensityScale
          value={watched.intensity}
          onChange={(v) => setValue("intensity", v, { shouldValidate: true })}
          error={errors.intensity?.message}
        />

        <BodyMapPicker
          value={watched.bodyLocation as BodyRegionKey | string | undefined}
          onChange={(v) => setValue("bodyLocation", v ?? "")}
        />

        <Input
          type="number"
          min={0}
          step={5}
          inputMode="numeric"
          label="持續時間（分鐘，選填）"
          error={errors.durationMin?.message}
          {...register("durationMin", { valueAsNumber: true })}
        />

        <TagChipsInput
          label="可能誘因（選填）"
          value={watched.triggers}
          onChange={(v) => setValue("triggers", v)}
          presets={TRIGGER_PRESETS}
        />
        <TagChipsInput
          label="緩解方式（選填）"
          value={watched.relief}
          onChange={(v) => setValue("relief", v)}
          presets={RELIEF_PRESETS}
        />

        <Textarea
          label="備註（選填）"
          placeholder="描述當下狀況、伴隨症狀等"
          {...register("notes", { maxLength: { value: 500, message: "備註過長" } })}
          error={errors.notes?.message}
        />

        <div className="flex flex-col gap-1.5">
          <span className="text-label uppercase text-ink-muted">照片（選填）</span>
          {watched.photo ? (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={watched.photo} alt="症狀照片預覽" className="h-20 w-20 rounded-md border border-line object-cover" />
              <Button type="button" variant="ghost" size="sm" onClick={() => handlePhotoChange(undefined)}>
                移除照片
              </Button>
            </div>
          ) : (
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handlePhotoChange(e.target.files?.[0])}
              className="text-caption text-ink-soft file:mr-3 file:rounded-md file:border file:border-line-strong file:bg-paper-sunken file:px-3 file:py-1.5 file:text-caption file:text-ink"
            />
          )}
          {photoError ? (
            <p role="alert" className="text-caption text-danger">
              {photoError}
            </p>
          ) : null}
        </div>
      </form>
    </Sheet>
  );
}
