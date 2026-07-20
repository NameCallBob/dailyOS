/**
 * Quick Add 寫入邏輯。刻意不透過個別模組的 createResource() 實例，
 * 避免與 features/<module> 未來自訂的 zod schema / seed 搶用同一張表的種子旗標。
 * 直接以 db.ts 已宣告的資料表為準（trial）或呼叫共用 REST 端點（auth）。
 *
 * 重要：即便不經過 createResource()，寫入的欄位仍必須對齊各模組 schema.ts 的
 * 必填欄位（否則該模組畫面讀到這筆資料時會因缺欄位而顯示異常或壞掉的關聯）。
 * 因此以下逐一對照各模組 schema 手動組出合法欄位，而非隨意欄位名稱。
 */

import { getDb } from "@/lib/db";
import { httpResource } from "@/lib/http";
import { isAuth } from "@/lib/mode";
import { newId, nowIso } from "@/lib/resource";

import type { QuickAddCategory } from "./parse";

const CATEGORY_TABLE: Record<QuickAddCategory, string> = {
  task: "tasks",
  note: "notes",
  water: "water_logs",
  weight: "body_metrics",
  symptom: "symptom_logs",
  workout: "workouts",
  habit: "habit_logs",
  appointment: "calendar_events",
};

function buildRecord(fields: Record<string, unknown>): Record<string, unknown> {
  const timestamp = nowIso();
  return {
    id: newId(),
    createdAt: timestamp,
    updatedAt: timestamp,
    version: 1,
    deleted: false,
    ...fields,
  };
}

async function writeRecord(table: string, fields: Record<string, unknown>): Promise<Record<string, unknown>> {
  const record = buildRecord(fields);

  if (isAuth()) {
    return (await httpResource<Record<string, unknown>>(table).create(record)) as Record<string, unknown>;
  }

  const db = getDb();
  await db.table(table).put(record);
  return record;
}

/**
 * 依名稱找出既有的「定義」記錄（symptom_defs / habits），找不到則建立一筆新的。
 * 兩種 transport 皆以大小寫不敏感、去除頭尾空白的方式比對 name 欄位。
 */
async function findOrCreateDef(
  table: string,
  name: string,
  buildNew: () => Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const normalized = name.trim().toLowerCase();

  if (isAuth()) {
    const res = await httpResource<Record<string, unknown>>(table).list({ search: name, pageSize: 50 });
    const found = res.results.find((r) => String(r.name ?? "").trim().toLowerCase() === normalized);
    if (found) return found;
    return (await httpResource<Record<string, unknown>>(table).create(buildRecord(buildNew()))) as Record<
      string,
      unknown
    >;
  }

  const db = getDb();
  const all = await db.table(table).toArray();
  const found = all.find(
    (r) => !(r as { deleted?: boolean }).deleted && String((r as { name?: unknown }).name ?? "").trim().toLowerCase() === normalized,
  );
  if (found) return found;
  const record = buildRecord(buildNew());
  await db.table(table).put(record);
  return record;
}

export interface QuickAddSubmission {
  category: QuickAddCategory;
  title: string;
  when?: string;
  amountMl?: number;
  weightKg?: number;
}

export async function submitQuickAdd(input: QuickAddSubmission): Promise<void> {
  const table = CATEGORY_TABLE[input.category];
  const now = nowIso();
  const title = input.title.trim() || "未命名";

  switch (input.category) {
    case "task":
      // schema: features/tasks/schema.ts — status 必須是 TASK_STATUSES 之一。
      await writeRecord(table, {
        title,
        status: "inbox",
        dueDate: input.when ?? null,
      });
      return;

    case "note":
      // schema: features/notes/types.ts — 欄位為 content（非 body），folder/tags/isDaily 皆必填。
      await writeRecord(table, {
        title,
        content: "",
        folder: "",
        tags: [],
        pinned: false,
        isDaily: false,
      });
      return;

    case "water":
      // schema: features/body/schema.ts waterLogSchema
      await writeRecord(table, {
        amountMl: input.amountMl ?? 0,
        loggedAt: input.when ?? now,
        date: (input.when ?? now).slice(0, 10),
      });
      return;

    case "weight":
      // schema: features/body/schema.ts bodyMetricSchema — 欄位為 weightKg + source（必填）。
      await writeRecord(table, {
        date: (input.when ?? now).slice(0, 10),
        loggedAt: input.when ?? now,
        weightKg: input.weightKg ?? 0,
        source: "manual",
      });
      return;

    case "symptom": {
      // schema: features/symptoms/schema.ts — symptom_logs 需要有效的 symptomDefId，
      // 因此先以名稱比對／建立對應的 symptom_defs 記錄。
      const def = await findOrCreateDef("symptom_defs", title, () => ({
        name: title.slice(0, 30),
        category: "自訂",
        archived: false,
      }));
      await writeRecord(table, {
        symptomDefId: def.id,
        date: (input.when ?? now).slice(0, 10),
        startAt: input.when ?? now,
        intensity: 5,
      });
      return;
    }

    case "workout":
      // schema: features/workouts/schema.ts workoutSchema — type/durationMin/feeling 皆必填，
      // Quick Add 僅能提供合理預設值，細節請至「健身」頁補完。
      await writeRecord(table, {
        date: (input.when ?? now).slice(0, 10),
        startAt: input.when ?? now,
        type: "自訂",
        durationMin: 30,
        feeling: "normal",
        goal: title,
      });
      return;

    case "habit": {
      // schema: features/habits/types.ts — habit_logs 需要有效的 habitId，
      // 因此先以名稱比對／建立對應的 habits 定義（預設為每日打卡型）。
      const habit = await findOrCreateDef("habits", title, () => ({
        name: title.slice(0, 60),
        icon: "✅",
        type: "boolean",
        targetValue: 1,
        increment: 1,
        schedule: { type: "daily" },
        archived: false,
        sortOrder: 0,
      }));
      await writeRecord(table, {
        habitId: habit.id,
        date: (input.when ?? now).slice(0, 10),
        value: Number((habit as { targetValue?: number }).targetValue ?? 1),
        loggedAt: input.when ?? now,
      });
      return;
    }

    case "appointment": {
      // schema: features/calendar/schema.ts calendarEventSchema — endAt/allDay/tz/type 皆必填。
      const startAt = input.when ?? now;
      const endAt = new Date(new Date(startAt).getTime() + 60 * 60 * 1000).toISOString();
      const tz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";
      await writeRecord(table, {
        title,
        startAt,
        endAt,
        allDay: false,
        tz,
        type: "other",
      });
      return;
    }

    default:
      return;
  }
}
