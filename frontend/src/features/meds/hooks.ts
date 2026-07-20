/**
 * features/meds/hooks.ts — 跨資源的組合邏輯：
 * - repoFor()：依 sourceType 取得 medications/supplements 對應的 repo。
 * - useSyncSchedules()：新增/編輯藥物或保健品後，同步 medication_schedules（依 times[] 展開）。
 * - useRecordDose()：記錄服用/漏服，並在「已服用且有追蹤庫存」時同步扣減 remainingQty。
 * - useDeleteItemWithUndo()／useRestoreItem()：軟刪除 + 5 秒內復原。
 *
 * 安全邊界：本檔案不做任何劑量調整或交互作用判斷，扣庫存純粹是「數量 - 服用量」的簿記運算。
 */

"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { toast } from "@/components/ui/toast";
import { nowIso } from "@/lib/resource";
import { medicationLogsRepo, medicationSchedulesRepo, medicationsRepo, supplementsRepo } from "./repo";
import { useMedsUiStore } from "./store";
import type { LogStatus, Medication, SourceType } from "./types";

/**
 * 依 sourceType 取得對應 repo。Medication／Supplement 結構完全相同，
 * 這裡統一以 medicationsRepo 的型別為準，避免聯合型別造成的成員存取問題。
 */
export function repoFor(sourceType: SourceType): typeof medicationsRepo {
  return (sourceType === "medication" ? medicationsRepo : supplementsRepo) as typeof medicationsRepo;
}

/** 依 times[] 同步該藥物/保健品的服用時段表；新增缺少的時段、移除多餘的時段（軟刪除）。 */
export function useSyncSchedules() {
  const queryClient = useQueryClient();

  return useCallback(
    async (sourceType: SourceType, medicationId: string, times: string[], active: boolean) => {
      try {
        const existing = await medicationSchedulesRepo.list({
          filters: { medicationId },
          pageSize: 200,
        });
        const existingBySlot = new Map(existing.results.filter((s) => s.sourceType === sourceType).map((s) => [s.timeOfDay, s]));

        const wanted = new Set(times);

        for (const time of times) {
          const found = existingBySlot.get(time);
          if (found) {
            if (found.active !== active) {
              await medicationSchedulesRepo.update(found.id, { active });
            }
          } else {
            await medicationSchedulesRepo.create({
              medicationId,
              sourceType,
              timeOfDay: time,
              active,
            });
          }
        }

        for (const [time, schedule] of existingBySlot.entries()) {
          if (!wanted.has(time)) {
            await medicationSchedulesRepo.remove(schedule.id);
          }
        }

        queryClient.invalidateQueries({ queryKey: ["medication_schedules"] });
      } catch {
        // 排程同步失敗不應阻擋主要的新增/編輯流程；僅提示，不 throw。
        toast.error("服用時段同步失敗，可稍後於編輯畫面重新儲存。");
      }
    },
    [queryClient],
  );
}

export interface RecordDoseInput {
  sourceType: SourceType;
  item: Medication;
  status: LogStatus;
  scheduledFor: string;
  scheduleId?: string;
  quantity?: number;
  note?: string;
}

/** 記錄一次服用/漏服/略過；status=taken 且有填數量時，同步扣減庫存（單純算術，非劑量判斷）。 */
export function useRecordDose() {
  const queryClient = useQueryClient();
  const medUpdate = medicationsRepo.useUpdate();
  const suppUpdate = supplementsRepo.useUpdate();

  const mutate = useCallback(
    async (input: RecordDoseInput) => {
      const { sourceType, item, status, scheduledFor, scheduleId, quantity, note } = input;
      try {
        await medicationLogsRepo.create({
          medicationId: item.id,
          sourceType,
          scheduleId,
          scheduledFor,
          status,
          takenAt: status === "taken" ? nowIso() : undefined,
          quantity: status === "taken" ? quantity : undefined,
          note,
        });

        if (status === "taken" && quantity !== undefined && item.remainingQty !== undefined) {
          const nextQty = Math.max(0, item.remainingQty - quantity);
          const update = sourceType === "medication" ? medUpdate : suppUpdate;
          update.mutate({ id: item.id, patch: { remainingQty: nextQty } });
        }

        toast.success(
          status === "taken" ? `已記錄「${item.name}」服用。` : status === "missed" ? `已記錄「${item.name}」漏服。` : `已記錄略過「${item.name}」。`,
        );
        queryClient.invalidateQueries({ queryKey: ["medication_logs"] });
      } catch {
        toast.error("記錄失敗，請再試一次。");
      }
    },
    [medUpdate, queryClient, suppUpdate],
  );

  return { mutate };
}

/** 補貨：直接設定新的剩餘量（使用者自行輸入，系統不建議數量）。 */
export function useRefillItem() {
  const medUpdate = medicationsRepo.useUpdate();
  const suppUpdate = supplementsRepo.useUpdate();

  return useCallback(
    (sourceType: SourceType, item: Medication, newQty: number) => {
      const update = sourceType === "medication" ? medUpdate : suppUpdate;
      update.mutate(
        { id: item.id, patch: { remainingQty: newQty } },
        {
          onSuccess: () => toast.success(`已更新「${item.name}」剩餘量為 ${newQty}${item.unit}。`),
        },
      );
    },
    [medUpdate, suppUpdate],
  );
}

export function useDeleteItemWithUndo() {
  const medRemove = medicationsRepo.useRemove();
  const suppRemove = supplementsRepo.useRemove();
  const setLastDeleted = useMedsUiStore((s) => s.setLastDeleted);

  const deleteItem = useCallback(
    (sourceType: SourceType, item: Medication) => {
      const remove = sourceType === "medication" ? medRemove : suppRemove;
      remove.mutate(item.id, {
        onSuccess: () => {
          setLastDeleted({ item, sourceType });
          toast.info(`已刪除「${item.name}」，可於 5 秒內復原。`, 5000);
          window.setTimeout(() => {
            if (useMedsUiStore.getState().lastDeleted?.item.id === item.id) {
              setLastDeleted(null);
            }
          }, 5000);
        },
      });
    },
    [medRemove, setLastDeleted, suppRemove],
  );

  return { deleteItem };
}

export function useRestoreItem() {
  const medUpdate = medicationsRepo.useUpdate();
  const suppUpdate = supplementsRepo.useUpdate();
  const setLastDeleted = useMedsUiStore((s) => s.setLastDeleted);

  return useCallback(
    (sourceType: SourceType, item: Medication) => {
      const update = sourceType === "medication" ? medUpdate : suppUpdate;
      update.mutate(
        { id: item.id, patch: { deleted: false } },
        {
          onSuccess: () => {
            setLastDeleted(null);
            toast.success(`已復原「${item.name}」。`);
          },
        },
      );
    },
    [medUpdate, setLastDeleted, suppUpdate],
  );
}

