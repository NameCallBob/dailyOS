"use client";

/** exercise-picker-dialog.tsx — 選擇動作加入訓練，含「最近動作」快速區塊。 */

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";

import { exerciseDefsResource } from "../resources";
import type { ExerciseDef } from "../schema";
import { useWorkoutsStore } from "../store";

export interface ExercisePickerDialogProps {
  open: boolean;
  onClose: () => void;
  onPick: (def: ExerciseDef) => void;
}

export function ExercisePickerDialog({ open, onClose, onPick }: ExercisePickerDialogProps) {
  const defsQuery = exerciseDefsResource.useList({ ordering: "name", pageSize: 200 });
  const recentIds = useWorkoutsStore((s) => s.recentExerciseIds);
  const [search, setSearch] = useState("");

  const defs = defsQuery.data?.results ?? [];

  const recent = useMemo(() => {
    const byId = new Map(defs.map((d) => [d.id, d]));
    return recentIds.map((id) => byId.get(id)).filter((d): d is ExerciseDef => Boolean(d));
  }, [defs, recentIds]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return defs;
    return defs.filter((d) => d.name.toLowerCase().includes(needle) || d.category.includes(needle));
  }, [defs, search]);

  return (
    <Dialog open={open} onClose={onClose} title="選擇動作" description="從動作庫挑選，或先在「動作庫」分頁新增自訂動作。">
      <div className="flex flex-col gap-4">
        <Input label="搜尋動作" placeholder="輸入動作名稱或部位" value={search} onChange={(e) => setSearch(e.target.value)} />

        {recent.length > 0 && !search ? (
          <div>
            <p className="mb-2 text-label uppercase text-ink-muted">最近動作</p>
            <div className="flex flex-wrap gap-2">
              {recent.map((def) => (
                <Button key={def.id} type="button" variant="secondary" size="sm" onClick={() => onPick(def)}>
                  {def.name}
                </Button>
              ))}
            </div>
          </div>
        ) : null}

        <div>
          <p className="mb-2 text-label uppercase text-ink-muted">全部動作</p>
          {filtered.length === 0 ? (
            <EmptyState title="找不到符合的動作" description="請嘗試其他關鍵字，或至「動作庫」新增自訂動作。" />
          ) : (
            <ul className="flex max-h-64 flex-col divide-y divide-line overflow-y-auto">
              {filtered.map((def) => (
                <li key={def.id}>
                  <button
                    type="button"
                    onClick={() => onPick(def)}
                    className="flex w-full items-center justify-between gap-3 py-2.5 text-left hover:bg-paper-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <span className="text-body text-ink">{def.name}</span>
                    <span className="text-caption text-ink-muted">
                      {def.category}
                      {def.equipment ? ` · ${def.equipment}` : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Dialog>
  );
}
