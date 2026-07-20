/**
 * features/data-transfer/constants.ts — 匯入預覽用的資料表中文顯示名稱。
 * 分組與命名對齊 lib/db.ts 的表格分類（工作／個人／健康／系統）。
 */

import type { DbTableName } from "@/lib/db";

export const TABLE_LABELS: Record<DbTableName, string> = {
  tasks: "任務",
  projects: "專案",
  tags: "標籤",
  calendar_events: "行事曆事件",
  timer_sessions: "計時紀錄",
  time_entries: "工時紀錄",

  notes: "筆記",
  note_versions: "筆記版本",
  habits: "習慣",
  habit_logs: "習慣紀錄",

  body_metrics: "身體數據",
  water_logs: "飲水紀錄",
  meal_logs: "飲食紀錄",
  sleep_logs: "睡眠紀錄",
  symptom_defs: "症狀項目",
  symptom_logs: "症狀紀錄",
  medications: "用藥項目",
  medication_schedules: "用藥排程",
  medication_logs: "用藥紀錄",
  supplements: "補充品",
  workouts: "運動紀錄",
  workout_exercises: "運動項目",
  workout_sets: "運動組數",
  exercise_defs: "動作定義",
  rehab_plans: "復健計畫",
  rehab_exercises: "復健動作",
  rehab_sessions: "復健紀錄",
  health_documents: "健康文件",
  appointments: "回診預約",

  activities: "活動時間軸",
  user_profile: "個人資料",
  user_preferences: "使用偏好",
  notification_prefs: "通知偏好",
  dashboard_layout: "儀表板配置",
};

export function tableLabel(name: DbTableName): string {
  return TABLE_LABELS[name] ?? name;
}
