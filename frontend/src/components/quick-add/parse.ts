/**
 * Quick Add 自然語句解析（輕量規則式，非 NLP 模型）。
 *
 * 設計原則：解析結果一律視為「預覽」，信心不足（medium/low）時 UI 必須讓使用者
 * 確認或修改欄位後才可送出，絕不直接寫入資料庫。
 */

import type { ParseConfidence } from "@/lib/types";

export type QuickAddCategory =
  | "task"
  | "note"
  | "water"
  | "weight"
  | "symptom"
  | "workout"
  | "habit"
  | "appointment";

export const QUICK_ADD_CATEGORIES: { value: QuickAddCategory; label: string }[] = [
  { value: "task", label: "任務" },
  { value: "note", label: "筆記" },
  { value: "water", label: "飲水" },
  { value: "weight", label: "體重" },
  { value: "symptom", label: "症狀" },
  { value: "workout", label: "運動" },
  { value: "habit", label: "習慣" },
  { value: "appointment", label: "行程" },
];

export interface QuickAddParseResult {
  category: QuickAddCategory;
  confidence: ParseConfidence;
  title: string;
  /** 解析出的日期時間（ISO），適用於 task/appointment */
  when?: string;
  /** 適用於 water（毫升） */
  amountMl?: number;
  /** 適用於 weight（公斤） */
  weightKg?: number;
  /** 人類可讀的解析摘要，顯示於預覽卡 */
  summary: string;
}

const WATER_RE = /(喝水|飲水|水分)/;
const WATER_AMOUNT_RE = /(\d+(?:\.\d+)?)\s*(?:毫升|ml|cc)/i;

const WEIGHT_RE = /體重/;
const WEIGHT_VALUE_RE = /(\d+(?:\.\d+)?)\s*(?:公斤|kg|公斤重)/i;

const SYMPTOM_RE = /(頭痛|腹痛|噁心|頭暈|不舒服|症狀|發燒|咳嗽|過敏)/;
const WORKOUT_RE = /(運動|跑步|重訓|健身|游泳|瑜珈|騎車)/;
const HABIT_RE = /(習慣|打卡)/;
const APPOINTMENT_RE = /(回診|看診|門診|預約|會議|行程|約)/;

const WEEKDAY_MAP: Record<string, number> = {
  日: 0,
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
};

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** 解析中文相對日期（今天/明天/後天/星期X），回傳當日 00:00 的 Date；找不到則回傳 undefined */
function parseRelativeDate(text: string, now: Date): Date | undefined {
  const today = startOfDay(now);
  if (text.includes("明天") || text.includes("明日")) {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return d;
  }
  if (text.includes("後天")) {
    const d = new Date(today);
    d.setDate(d.getDate() + 2);
    return d;
  }
  if (text.includes("今天") || text.includes("今日")) {
    return today;
  }
  const weekdayMatch = text.match(/(?:星期|週|周)([日一二三四五六])/);
  if (weekdayMatch) {
    const targetDow = WEEKDAY_MAP[weekdayMatch[1] ?? ""];
    if (targetDow !== undefined) {
      const d = new Date(today);
      const currentDow = d.getDay();
      let diff = targetDow - currentDow;
      if (diff <= 0) diff += 7;
      d.setDate(d.getDate() + diff);
      return d;
    }
  }
  return undefined;
}

const CN_NUM: Record<string, number> = {
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
  十: 10,
  十一: 11,
  十二: 12,
};

function cnNumberToInt(token: string): number | undefined {
  if (/^\d+$/.test(token)) return parseInt(token, 10);
  if (CN_NUM[token] !== undefined) return CN_NUM[token];
  return undefined;
}

/** 解析時刻，如「下午三點」「15:30」「上午9點半」，回傳 { hour, minute } */
function parseTimeOfDay(text: string): { hour: number; minute: number } | undefined {
  const digitTime = text.match(/(\d{1,2}):(\d{2})/);
  if (digitTime) {
    return { hour: parseInt(digitTime[1] ?? "0", 10), minute: parseInt(digitTime[2] ?? "0", 10) };
  }

  const cnTime = text.match(/(上午|下午|早上|晚上|中午)?\s*([0-9一二三四五六七八九十]{1,3})\s*點\s*(半|([0-9一二三四五六七八九十]{1,2})分)?/);
  if (cnTime) {
    const period = cnTime[1];
    const hourToken = cnTime[2] ?? "";
    let hour = cnNumberToInt(hourToken) ?? 0;
    const minuteToken = cnTime[3];
    let minute = 0;
    if (minuteToken === "半") {
      minute = 30;
    } else if (cnTime[4]) {
      minute = cnNumberToInt(cnTime[4]) ?? 0;
    }
    if ((period === "下午" || period === "晚上") && hour < 12) hour += 12;
    if (period === "中午" && hour < 12) hour += 12;
    return { hour, minute };
  }

  return undefined;
}

function stripKeywords(text: string, patterns: RegExp[]): string {
  let result = text;
  for (const pattern of patterns) {
    result = result.replace(pattern, "");
  }
  return result.trim();
}

export function parseQuickAdd(rawText: string, now: Date = new Date()): QuickAddParseResult {
  const text = rawText.trim();

  if (!text) {
    return { category: "task", confidence: "low", title: "", summary: "請輸入內容" };
  }

  // 飲水
  if (WATER_RE.test(text)) {
    const amountMatch = text.match(WATER_AMOUNT_RE);
    const amountMl = amountMatch ? Number(amountMatch[1]) : undefined;
    return {
      category: "water",
      confidence: amountMl ? "high" : "medium",
      title: text,
      amountMl,
      summary: amountMl ? `記錄飲水 ${amountMl} 毫升` : "偵測到飲水紀錄，請確認毫升數",
    };
  }

  // 體重
  if (WEIGHT_RE.test(text)) {
    const valueMatch = text.match(WEIGHT_VALUE_RE);
    const weightKg = valueMatch ? Number(valueMatch[1]) : undefined;
    return {
      category: "weight",
      confidence: weightKg ? "high" : "medium",
      title: text,
      weightKg,
      summary: weightKg ? `記錄體重 ${weightKg} 公斤` : "偵測到體重紀錄，請確認數值",
    };
  }

  // 行程 / 回診（含日期時間解析）
  if (APPOINTMENT_RE.test(text)) {
    const date = parseRelativeDate(text, now);
    const time = parseTimeOfDay(text);
    let when: string | undefined;
    let confidence: ParseConfidence = "low";
    if (date) {
      const combined = new Date(date);
      if (time) {
        combined.setHours(time.hour, time.minute, 0, 0);
        confidence = "high";
      } else {
        confidence = "medium";
      }
      when = combined.toISOString();
    }
    const title =
      stripKeywords(text, [/星期[日一二三四五六]/, /週[日一二三四五六]/, /周[日一二三四五六]/]) || text;
    return {
      category: "appointment",
      confidence,
      title,
      when,
      summary: when ? `新增行程於 ${new Date(when).toLocaleString("zh-TW")}` : "偵測到行程，請確認日期時間",
    };
  }

  // 症狀
  if (SYMPTOM_RE.test(text)) {
    return {
      category: "symptom",
      confidence: "medium",
      title: text,
      summary: "偵測到症狀紀錄，請確認嚴重程度",
    };
  }

  // 運動
  if (WORKOUT_RE.test(text)) {
    return {
      category: "workout",
      confidence: "medium",
      title: text,
      summary: "偵測到運動紀錄",
    };
  }

  // 習慣
  if (HABIT_RE.test(text)) {
    return {
      category: "habit",
      confidence: "medium",
      title: text,
      summary: "偵測到習慣打卡",
    };
  }

  // 預設：任務（嘗試解析日期作為到期日）
  const date = parseRelativeDate(text, now);
  const time = parseTimeOfDay(text);
  let when: string | undefined;
  if (date) {
    const combined = new Date(date);
    if (time) combined.setHours(time.hour, time.minute, 0, 0);
    when = combined.toISOString();
  }
  return {
    category: "task",
    confidence: when ? "medium" : "low",
    title: text,
    when,
    summary: when ? `新增任務，到期於 ${new Date(when).toLocaleString("zh-TW")}` : "新增任務",
  };
}
