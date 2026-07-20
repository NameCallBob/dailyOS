"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Sheet } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";

import { assertNoCycle, DependencyCycleError } from "../dependency";
import { ENERGY_LABEL, PRIORITY_LABEL, STATUS_LABEL } from "../constants";
import { taskFormSchema, type TaskFormValues } from "../schema";
import { TASK_ENERGIES, TASK_PRIORITIES, TASK_STATUSES } from "../types";
import type { Project, Tag, Task } from "../types";

export interface TaskFormSheetProps {
  open: boolean;
  onClose: () => void;
  task?: Task;
  tasks: Task[];
  projects: Project[];
  tags: Tag[];
  defaultValues?: Partial<TaskFormValues>;
  onSubmit: (values: TaskFormValues & { tagIds: string[]; dependsOn: string[] }) => Promise<void>;
}

function toFormValues(task: Task | undefined, extra?: Partial<TaskFormValues>): TaskFormValues {
  return {
    title: task?.title ?? extra?.title ?? "",
    description: task?.description ?? extra?.description ?? "",
    status: task?.status ?? extra?.status ?? "inbox",
    priority: task?.priority ?? extra?.priority ?? "med",
    projectId: task?.projectId ?? extra?.projectId ?? "",
    tagsInput: "",
    dueDate: task?.dueDate ?? extra?.dueDate ?? "",
    scheduledAt: task?.scheduledAt ? task.scheduledAt.slice(0, 16) : "",
    estimateMin: task?.estimateMin != null ? String(task.estimateMin) : extra?.estimateMin ?? "",
    energy: task?.energy ?? (extra?.energy as TaskFormValues["energy"]) ?? "",
    context: task?.context ?? extra?.context ?? "",
    recurrenceRule: task?.recurrenceRule ?? "",
    parentId: task?.parentId ?? "",
    dependsOnInput: task?.dependsOn ?? [],
    remindAt: task?.remindAt ? task.remindAt.slice(0, 16) : "",
  };
}

export function TaskFormSheet({
  open,
  onClose,
  task,
  tasks,
  projects,
  tags,
  defaultValues,
  onSubmit,
}: TaskFormSheetProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: toFormValues(task, defaultValues),
  });

  useEffect(() => {
    if (open) reset(toFormValues(task, defaultValues));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, task?.id]);

  const currentDependsOn = watch("dependsOnInput") ?? [];

  const eligibleParents = useMemo(() => tasks.filter((t) => t.id !== task?.id), [tasks, task?.id]);
  const eligibleDependencies = useMemo(() => tasks.filter((t) => t.id !== task?.id), [tasks, task?.id]);

  const submit = handleSubmit(async (values) => {
    const dependsOn = values.dependsOnInput ?? [];
    if (task) {
      try {
        assertNoCycle(
          tasks.map((t) => ({ id: t.id, dependsOn: t.dependsOn })),
          task.id,
          dependsOn,
        );
      } catch (err) {
        if (err instanceof DependencyCycleError) {
          toast.error(err.message);
          return;
        }
      }
    }
    const tagIds = (values.tagsInput ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    await onSubmit({ ...values, tagIds: tagIds.length > 0 ? tagIds : task?.tags ?? [], dependsOn });
  });

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={task ? "編輯任務" : "新增任務"}
      description="填寫任務資訊，儲存後立即生效。"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button type="submit" form="task-form" loading={isSubmitting}>
            儲存
          </Button>
        </>
      }
    >
      <form id="task-form" onSubmit={submit} className="flex flex-col gap-4">
        <Input label="標題" placeholder="例如：確認提案內容" error={errors.title?.message} {...register("title")} />
        <Textarea label="描述" placeholder="補充說明（選填）" {...register("description")} />

        <div className="grid grid-cols-2 gap-3">
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select
                label="狀態"
                options={TASK_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
                {...field}
              />
            )}
          />
          <Controller
            control={control}
            name="priority"
            render={({ field }) => (
              <Select
                label="優先權"
                options={TASK_PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABEL[p] }))}
                {...field}
              />
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input type="date" label="到期日" {...register("dueDate")} />
          <Input type="datetime-local" label="排程時間" {...register("scheduledAt")} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input type="number" min={0} label="預估分鐘" {...register("estimateMin")} />
          <Controller
            control={control}
            name="energy"
            render={({ field }) => (
              <Select
                label="所需精力"
                placeholder="未設定"
                options={TASK_ENERGIES.map((e) => ({ value: e, label: ENERGY_LABEL[e] }))}
                {...field}
              />
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Controller
            control={control}
            name="projectId"
            render={({ field }) => (
              <Select
                label="專案"
                placeholder="無專案"
                options={projects.map((p) => ({ value: p.id, label: p.name }))}
                {...field}
              />
            )}
          />
          <Input label="情境（context）" placeholder="例如：@辦公室" {...register("context")} />
        </div>

        <Input
          label="標籤（以逗號分隔標籤 ID）"
          placeholder={tags.map((t) => t.name).join("、")}
          hint={`可用標籤：${tags.map((t) => `${t.name}(${t.id})`).join("、")}`}
          {...register("tagsInput")}
        />

        <Input label="重複規則（RRULE，選填）" placeholder="例如：FREQ=WEEKLY;BYDAY=MO" {...register("recurrenceRule")} />

        <Controller
          control={control}
          name="parentId"
          render={({ field }) => (
            <Select
              label="父任務（設定為子任務）"
              placeholder="無（頂層任務）"
              options={eligibleParents.map((t) => ({ value: t.id, label: t.title }))}
              {...field}
            />
          )}
        />

        <fieldset className="flex flex-col gap-2 rounded-md border border-line p-3">
          <legend className="px-1 text-label uppercase text-ink-muted">相依任務（dependsOn）</legend>
          <p className="text-caption text-ink-muted">此任務需等待以下任務完成才能開始；系統會自動防止循環依賴。</p>
          <div className="flex max-h-40 flex-col gap-1.5 overflow-y-auto">
            {eligibleDependencies.length === 0 ? (
              <p className="text-caption text-ink-faint">無其他任務可選。</p>
            ) : (
              eligibleDependencies.map((t) => {
                const checked = currentDependsOn.includes(t.id);
                return (
                  <label key={t.id} className="flex items-center gap-2 text-caption text-ink-soft">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-line-strong"
                      checked={checked}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...currentDependsOn, t.id]
                          : currentDependsOn.filter((id) => id !== t.id);
                        setValue("dependsOnInput", next, { shouldDirty: true });
                      }}
                    />
                    {t.title}
                  </label>
                );
              })
            )}
          </div>
          {currentDependsOn.length > 0 ? (
            <p className="text-caption text-ink-muted">已選 {currentDependsOn.length} 項</p>
          ) : null}
        </fieldset>

        <Input type="datetime-local" label="提醒時間" {...register("remindAt")} />
      </form>
    </Sheet>
  );
}
