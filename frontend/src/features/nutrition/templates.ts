/**
 * features/nutrition/templates.ts — 常用餐點範本。
 *
 * 範本不屬於可同步資源（未在 lib/db.ts 宣告資料表），僅為降低操作成本的
 * 個人化捷徑，因此以 localStorage 儲存（zustand persist），與 meal_logs
 * 本身的 repo 資料流分離；不影響試用/登入模式切換。
 */

"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { MealType } from "./types";

export interface MealTemplate {
  id: string;
  label: string;
  type: MealType;
  text: string;
  foodTags: string[];
  portion?: string;
  calories?: number;
  protein?: number;
  carb?: number;
  fat?: number;
  calcium?: number;
  fiber?: number;
  water?: number;
}

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `tpl-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const DEFAULT_TEMPLATES: MealTemplate[] = [
  {
    id: "tpl-default-breakfast",
    label: "常見早餐",
    type: "breakfast",
    text: "全麥吐司夾蛋、無糖豆漿",
    foodTags: ["全麥吐司", "雞蛋", "豆漿"],
    portion: "1份",
  },
  {
    id: "tpl-default-lunch",
    label: "便當午餐",
    type: "lunch",
    text: "便當：主菜、燙青菜、白飯",
    foodTags: ["便當", "燙青菜"],
    portion: "1個便當",
  },
  {
    id: "tpl-default-water",
    label: "喝水 300ml",
    type: "snack",
    text: "開水",
    foodTags: ["水"],
    portion: "1杯",
    water: 300,
  },
];

interface TemplateState {
  templates: MealTemplate[];
  addTemplate: (input: Omit<MealTemplate, "id">) => void;
  removeTemplate: (id: string) => void;
}

export const useMealTemplateStore = create<TemplateState>()(
  persist(
    (set) => ({
      templates: DEFAULT_TEMPLATES,
      addTemplate: (input) =>
        set((state) => ({ templates: [...state.templates, { ...input, id: makeId() }] })),
      removeTemplate: (id) =>
        set((state) => ({ templates: state.templates.filter((t) => t.id !== id) })),
    }),
    { name: "dailyos_nutrition_templates" },
  ),
);
