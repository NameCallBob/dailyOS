"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";

import { mealLogsResource } from "./resource";
import { useMealTemplateStore, type MealTemplate } from "./templates";
import { MEAL_TYPE_LABELS, MEAL_TYPES, type MealLog, type MealType } from "./types";
import { todayDateStr } from "./utils";

export interface RecentEntry {
  text: string;
  type: MealType;
  portion?: string;
  foodTags: string[];
  calories?: number;
  protein?: number;
  carb?: number;
  fat?: number;
  calcium?: number;
  fiber?: number;
  water?: number;
}

function buildRecentEntries(logs: MealLog[]): RecentEntry[] {
  const seen = new Set<string>();
  const out: RecentEntry[] = [];
  for (const log of logs) {
    const key = log.text.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({
      text: log.text,
      type: log.type,
      portion: log.portion,
      foodTags: log.foodTags,
      calories: log.calories,
      protein: log.protein,
      carb: log.carb,
      fat: log.fat,
      calcium: log.calcium,
      fiber: log.fiber,
      water: log.water,
    });
    if (out.length >= 6) break;
  }
  return out;
}

export interface QuickActionsBarProps {
  recentLogs: MealLog[];
  onOpenCreate: () => void;
  onOpenBatch: () => void;
  onCopyYesterday: () => void;
  copyYesterdayDisabled: boolean;
}

/** 低操作成本快捷列：常用範本 / 最近使用（一鍵套用）+ 新增/複製昨日/批次新增。 */
export function QuickActionsBar({
  recentLogs,
  onOpenCreate,
  onOpenBatch,
  onCopyYesterday,
  copyYesterdayDisabled,
}: QuickActionsBarProps) {
  const { templates, addTemplate, removeTemplate } = useMealTemplateStore();
  const createMutation = mealLogsResource.useCreate();
  const [manageOpen, setManageOpen] = useState(false);
  const [newTpl, setNewTpl] = useState({ label: "", type: "breakfast" as MealType, text: "", portion: "" });

  const recentEntries = useMemo(() => buildRecentEntries(recentLogs), [recentLogs]);

  async function applyEntry(entry: RecentEntry | MealTemplate) {
    const now = new Date();
    try {
      await createMutation.mutateAsync({
        type: entry.type,
        date: todayDateStr(),
        loggedAt: now.toISOString(),
        text: entry.text,
        portion: entry.portion,
        foodTags: entry.foodTags,
        calories: entry.calories,
        protein: entry.protein,
        carb: entry.carb,
        fat: entry.fat,
        calcium: entry.calcium,
        fiber: entry.fiber,
        water: entry.water,
      });
      toast.success(`已新增「${entry.text}」。`);
    } catch {
      // 失敗提示由 mutation 統一處理
    }
  }

  function handleAddTemplate() {
    if (!newTpl.label.trim() || !newTpl.text.trim()) {
      toast.error("請輸入範本名稱與內容。");
      return;
    }
    addTemplate({ label: newTpl.label, type: newTpl.type, text: newTpl.text, portion: newTpl.portion, foodTags: [] });
    setNewTpl({ label: "", type: "breakfast", text: "", portion: "" });
    toast.success("已新增常用範本。");
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={onOpenCreate}>+ 新增紀錄</Button>
        <Button variant="secondary" onClick={onOpenBatch}>
          批次新增
        </Button>
        <Button variant="secondary" onClick={onCopyYesterday} disabled={copyYesterdayDisabled}>
          複製昨日
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setManageOpen(true)}>
          管理常用範本
        </Button>
      </div>

      {templates.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-label uppercase text-ink-muted">常用範本，點一下即新增</span>
          <div className="flex flex-wrap gap-2">
            {templates.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => applyEntry(tpl)}
                disabled={createMutation.isPending}
                className="rounded-full border border-line-strong bg-paper px-3 py-1.5 text-caption text-ink-soft transition-colors hover:bg-paper-sunken disabled:opacity-50"
              >
                {tpl.label}
                <span className="ml-1 text-ink-faint">· {MEAL_TYPE_LABELS[tpl.type]}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {recentEntries.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-label uppercase text-ink-muted">最近使用</span>
          <div className="flex flex-wrap gap-2">
            {recentEntries.map((entry) => (
              <button
                key={entry.text}
                type="button"
                onClick={() => applyEntry(entry)}
                disabled={createMutation.isPending}
                className="rounded-full border border-dashed border-line-strong bg-paper px-3 py-1.5 text-caption text-ink-soft transition-colors hover:bg-paper-sunken disabled:opacity-50"
              >
                {entry.text}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <Dialog open={manageOpen} onClose={() => setManageOpen(false)} title="管理常用範本" description="用於一鍵新增常吃的餐點，減少重複輸入">
        <div className="flex flex-col gap-4">
          {templates.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {templates.map((tpl) => (
                <li key={tpl.id} className="flex items-center justify-between gap-2 rounded-md border border-line px-3 py-2">
                  <span className="text-body text-ink">
                    {tpl.label}
                    <span className="ml-2 text-caption text-ink-muted">
                      {MEAL_TYPE_LABELS[tpl.type]} · {tpl.text}
                    </span>
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => removeTemplate(tpl.id)}>
                    刪除
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-caption text-ink-muted">尚無常用範本。</p>
          )}

          <div className="grid grid-cols-2 gap-2 border-t border-line pt-4">
            <Input
              label="範本名稱"
              placeholder="例如：常見早餐"
              value={newTpl.label}
              onChange={(e) => setNewTpl((s) => ({ ...s, label: e.target.value }))}
            />
            <Select
              label="餐別"
              options={MEAL_TYPES.map((t) => ({ value: t, label: MEAL_TYPE_LABELS[t] }))}
              value={newTpl.type}
              onChange={(e) => setNewTpl((s) => ({ ...s, type: e.target.value as MealType }))}
            />
            <div className="col-span-2">
              <Input
                label="內容"
                placeholder="例如：全麥吐司夾蛋"
                value={newTpl.text}
                onChange={(e) => setNewTpl((s) => ({ ...s, text: e.target.value }))}
              />
            </div>
            <div className="col-span-2">
              <Input
                label="份量（選填）"
                value={newTpl.portion}
                onChange={(e) => setNewTpl((s) => ({ ...s, portion: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="button" onClick={handleAddTemplate}>
              新增範本
            </Button>
          </div>
        </div>
      </Dialog>
    </section>
  );
}
