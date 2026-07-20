/**
 * features/nutrition/seed.ts — meal_logs 試用模式種子資料。
 * 近 30 天內分布約 14 筆，涵蓋各餐別、含標籤/份量/部分營養值，
 * 部分記錄刻意不含精確營養數字，示範「不強迫輸入」。
 */

import { newId } from "@/lib/resource";
import type { MealLog } from "./types";

function daysAgoDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function loggedAt(days: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

interface SeedInput {
  daysAgo: number;
  hour: number;
  minute?: number;
  type: MealLog["type"];
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
  notes?: string;
}

const SEED_INPUTS: SeedInput[] = [
  {
    daysAgo: 0,
    hour: 8,
    minute: 15,
    type: "breakfast",
    text: "全麥吐司夾蛋、無糖豆漿",
    foodTags: ["全麥吐司", "雞蛋", "豆漿"],
    portion: "1份",
    calories: 380,
    protein: 18,
    carb: 45,
    fat: 12,
  },
  {
    daysAgo: 0,
    hour: 12,
    minute: 30,
    type: "lunch",
    text: "雞胸肉沙拉佐橄欖油醋",
    foodTags: ["雞胸肉", "生菜", "小番茄"],
    portion: "一大碗",
    calories: 420,
    protein: 35,
    carb: 20,
    fat: 18,
    fiber: 6,
  },
  {
    daysAgo: 0,
    hour: 16,
    minute: 0,
    type: "snack",
    text: "香蕉一根",
    foodTags: ["香蕉"],
    portion: "1根",
  },
  {
    daysAgo: 1,
    hour: 7,
    minute: 50,
    type: "breakfast",
    text: "地瓜稀飯配荷包蛋",
    foodTags: ["地瓜稀飯", "荷包蛋"],
    portion: "1碗",
    calories: 350,
  },
  {
    daysAgo: 1,
    hour: 13,
    minute: 0,
    type: "lunch",
    text: "便當：滷雞腿、燙青菜、白飯",
    foodTags: ["滷雞腿", "燙青菜", "白飯"],
    portion: "1個便當",
    calories: 680,
    protein: 32,
    carb: 78,
    fat: 22,
  },
  {
    daysAgo: 1,
    hour: 19,
    minute: 30,
    type: "dinner",
    text: "番茄牛肉湯麵",
    foodTags: ["牛肉", "番茄", "麵條"],
    portion: "1碗",
    calories: 520,
  },
  {
    daysAgo: 2,
    hour: 8,
    minute: 0,
    type: "supplement",
    text: "綜合維他命、魚油",
    foodTags: ["綜合維他命", "魚油"],
    portion: "各1顆",
  },
  {
    daysAgo: 2,
    hour: 12,
    minute: 20,
    type: "lunch",
    text: "鮭魚炊飯定食",
    foodTags: ["鮭魚", "炊飯", "味噌湯"],
    portion: "1份定食",
    calories: 610,
    protein: 30,
    carb: 65,
    fat: 20,
    calcium: 40,
  },
  {
    daysAgo: 3,
    hour: 9,
    minute: 10,
    type: "breakfast",
    text: "希臘優格佐燕麥與藍莓",
    foodTags: ["希臘優格", "燕麥", "藍莓"],
    portion: "1杯",
    calories: 310,
    protein: 20,
    fiber: 5,
  },
  {
    daysAgo: 3,
    hour: 18,
    minute: 45,
    type: "dinner",
    text: "蒸魚、清炒高麗菜、糙米飯",
    foodTags: ["蒸魚", "高麗菜", "糙米飯"],
    portion: "1人份",
    calories: 540,
  },
  {
    daysAgo: 5,
    hour: 15,
    minute: 30,
    type: "snack",
    text: "無糖拿鐵",
    foodTags: ["咖啡"],
    portion: "1杯 (360ml)",
    water: 300,
  },
  {
    daysAgo: 7,
    hour: 12,
    minute: 0,
    type: "lunch",
    text: "牛肉河粉",
    foodTags: ["牛肉", "河粉"],
    portion: "1碗",
    calories: 560,
    notes: "外食，湯有點鹹",
  },
  {
    daysAgo: 10,
    hour: 19,
    minute: 0,
    type: "dinner",
    text: "火鍋（多蔬菜、少沾醬）",
    foodTags: ["火鍋", "蔬菜", "豆腐"],
    portion: "1人鍋",
    calories: 700,
    protein: 40,
  },
  {
    daysAgo: 14,
    hour: 8,
    minute: 20,
    type: "breakfast",
    text: "飯糰 + 豆漿",
    foodTags: ["飯糰", "豆漿"],
    portion: "1份",
  },
];

export function seedMealLogs(): MealLog[] {
  return SEED_INPUTS.map((input) => {
    const createdAt = loggedAt(input.daysAgo, input.hour, input.minute);
    return {
      id: newId(),
      createdAt,
      updatedAt: createdAt,
      version: 1,
      deleted: false,
      date: daysAgoDate(input.daysAgo),
      loggedAt: createdAt,
      type: input.type,
      text: input.text,
      foodTags: input.foodTags,
      portion: input.portion,
      calories: input.calories,
      protein: input.protein,
      carb: input.carb,
      fat: input.fat,
      calcium: input.calcium,
      fiber: input.fiber,
      water: input.water,
      notes: input.notes,
    } satisfies MealLog;
  });
}
