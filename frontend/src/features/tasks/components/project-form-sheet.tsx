"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Sheet } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

import { PROJECT_STATUS_LABEL } from "../constants";
import { projectFormSchema, type ProjectFormValues } from "../schema";
import { PROJECT_STATUSES } from "../types";
import type { Project } from "../types";

export interface ProjectFormSheetProps {
  open: boolean;
  onClose: () => void;
  project?: Project;
  onSubmit: (values: ProjectFormValues) => Promise<void>;
}

const COLOR_PRESETS = ["#8a6a52", "#5b7a99", "#93701f", "#3f6b4a", "#2f8f8f", "#6b5b95", "#c0708a", "#a3372e"];

function toFormValues(project?: Project): ProjectFormValues {
  return {
    name: project?.name ?? "",
    description: project?.description ?? "",
    status: project?.status ?? "planning",
    color: project?.color ?? COLOR_PRESETS[0]!,
    startDate: project?.startDate ?? "",
    targetDate: project?.targetDate ?? "",
  };
}

export function ProjectFormSheet({ open, onClose, project, onSubmit }: ProjectFormSheetProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: toFormValues(project),
  });

  useEffect(() => {
    if (open) reset(toFormValues(project));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, project?.id]);

  const color = watch("color");

  const submit = handleSubmit(async (values) => {
    await onSubmit(values);
  });

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={project ? "編輯專案" : "新增專案"}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button type="submit" form="project-form" loading={isSubmitting}>
            儲存
          </Button>
        </>
      }
    >
      <form id="project-form" onSubmit={submit} className="flex flex-col gap-4">
        <Input label="專案名稱" error={errors.name?.message} {...register("name")} />
        <Textarea label="描述" {...register("description")} />
        <Controller
          control={control}
          name="status"
          render={({ field }) => (
            <Select
              label="狀態"
              options={PROJECT_STATUSES.map((s) => ({ value: s, label: PROJECT_STATUS_LABEL[s] }))}
              {...field}
            />
          )}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input type="date" label="開始日期" {...register("startDate")} />
          <Input type="date" label="目標日期" {...register("targetDate")} />
        </div>
        <div>
          <span className="mb-1.5 block text-label uppercase text-ink-muted">顏色</span>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="專案顏色">
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                role="radio"
                aria-checked={color === preset}
                aria-label={preset}
                onClick={() => setValue("color", preset, { shouldDirty: true })}
                className="h-8 w-8 rounded-full border-2"
                style={{
                  backgroundColor: preset,
                  borderColor: color === preset ? "var(--color-ink)" : "transparent",
                }}
              />
            ))}
          </div>
        </div>
      </form>
    </Sheet>
  );
}
