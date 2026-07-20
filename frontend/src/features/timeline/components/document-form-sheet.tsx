"use client";

/**
 * document-form-sheet.tsx — 新增／編輯健康文件（底部抽屜表單）。
 * 附件以 dataURL 儲存（試用模式落地於 IndexedDB），限制單檔大小。
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, useState, type ChangeEvent } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Sheet } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { ApiRequestError } from "@/lib/types";

import { todayKey } from "../date-utils";
import { MAX_ATTACHMENT_KB, readFileAsDataUrl } from "../file";
import { healthDocumentsResource } from "../resources";
import { DOCUMENT_CATEGORY_VALUES, type HealthDocument } from "../schema";

const formSchema = z.object({
  date: z.string().min(1, "請選擇日期"),
  category: z.enum(DOCUMENT_CATEGORY_VALUES),
  title: z.string().min(1, "請輸入文件名稱").max(80, "名稱過長"),
  provider: z.string().max(60, "院所名稱過長").optional(),
  notes: z.string().max(500, "備註過長").optional(),
});

type FormValues = z.infer<typeof formSchema>;

const CATEGORY_OPTIONS = DOCUMENT_CATEGORY_VALUES.map((value) => ({ value, label: value }));

function toDefaultValues(editing?: HealthDocument | null): FormValues {
  if (!editing) {
    return { date: todayKey(), category: "檢驗報告", title: "", provider: "", notes: "" };
  }
  return {
    date: editing.date,
    category: editing.category,
    title: editing.title,
    provider: editing.provider ?? "",
    notes: editing.notes ?? "",
  };
}

export interface DocumentFormSheetProps {
  open: boolean;
  onClose: () => void;
  editing?: HealthDocument | null;
}

export function DocumentFormSheet({ open, onClose, editing }: DocumentFormSheetProps) {
  const createMutation = healthDocumentsResource.useCreate();
  const updateMutation = healthDocumentsResource.useUpdate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachment, setAttachment] = useState<{ fileName: string; mimeType: string; fileDataUrl: string; fileSizeKb: number } | null>(
    null,
  );
  const [fileError, setFileError] = useState<string | undefined>(undefined);
  const [openKey, setOpenKey] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: toDefaultValues(editing) });

  // 每次抽屜開啟（或切換編輯目標）時重置表單／附件狀態；採 React 建議的
  // 「render 期間依 key 變化調整 state」模式取代 effect，避免在 effect 內
  // 直接呼叫多個 setState。
  const nextOpenKey = open ? (editing?.id ?? "__new__") : null;
  if (nextOpenKey !== openKey) {
    setOpenKey(nextOpenKey);
    if (nextOpenKey !== null) {
      reset(toDefaultValues(editing));
      setAttachment(
        editing?.fileDataUrl
          ? {
              fileName: editing.fileName ?? "附件",
              mimeType: editing.mimeType ?? "application/octet-stream",
              fileDataUrl: editing.fileDataUrl,
              fileSizeKb: editing.fileSizeKb ?? 0,
            }
          : null,
      );
      setFileError(undefined);
    }
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setFileError(undefined);
      const result = await readFileAsDataUrl(file);
      setAttachment(result);
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "讀取檔案失敗，請重試。");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    const payload: Partial<HealthDocument> = {
      date: values.date,
      category: values.category,
      title: values.title.trim(),
      provider: values.provider?.trim() || undefined,
      notes: values.notes?.trim() || undefined,
      fileName: attachment?.fileName,
      mimeType: attachment?.mimeType,
      fileDataUrl: attachment?.fileDataUrl,
      fileSizeKb: attachment?.fileSizeKb,
    };

    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, patch: payload });
        toast.success("已更新文件");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("已新增文件");
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
    <Sheet open={open} onClose={onClose} title={editing ? "編輯文件" : "新增文件"} description="上傳檢驗報告、診斷證明等健康文件">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="日期" type="date" {...register("date")} error={errors.date?.message} />
          <Select label="分類" options={CATEGORY_OPTIONS} {...register("category")} error={errors.category?.message} />
        </div>
        <Input label="文件名稱" placeholder="例如：血液常規報告" {...register("title")} error={errors.title?.message} />
        <Input label="院所／來源" placeholder="例如：聯合醫院" {...register("provider")} error={errors.provider?.message} />

        <div className="flex flex-col gap-1.5">
          <span className="text-label uppercase text-ink-muted">附件</span>
          {attachment ? (
            <div className="flex items-center justify-between gap-3 rounded-md border border-line-strong bg-paper-sunken px-3 py-2 text-caption text-ink-soft">
              <span className="truncate">
                {attachment.fileName}（{attachment.fileSizeKb} KB）
              </span>
              <button
                type="button"
                onClick={() => setAttachment(null)}
                className="shrink-0 text-ink-muted hover:text-ink"
                aria-label="移除附件"
              >
                移除
              </button>
            </div>
          ) : (
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileChange}
              className="text-caption text-ink-soft file:mr-3 file:rounded-md file:border file:border-line-strong file:bg-paper file:px-3 file:py-1.5 file:text-caption file:text-ink"
            />
          )}
          <p className="text-caption text-ink-muted">支援圖片／PDF，單檔上限 {MAX_ATTACHMENT_KB / 1024} MB。</p>
          {fileError ? (
            <p role="alert" className="text-caption text-danger">
              {fileError}
            </p>
          ) : null}
        </div>

        <Textarea label="備註" placeholder="例如：異常項目、醫囑重點" {...register("notes")} error={errors.notes?.message} />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {editing ? "儲存變更" : "新增文件"}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
