/**
 * lib/nav.ts — 導覽註冊表（Single Source of Truth）。
 * App Shell（桌面側欄 / 手機底部導覽）與未來的命令面板都應從此讀取，
 * 不得在元件內自建模組清單。
 */

export type NavGroup = "工作" | "個人" | "健康" | "系統";

export interface NavItem {
  key: string;
  label: string;
  path: string;
  group: NavGroup;
  /** 是否出現在手機底部導覽（拇指可達，建議 ≤5 項） */
  primary?: boolean;
  /** icon 對照 components/ui/nav-icon.tsx 內的 key */
  icon: string;
}

export const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "總覽", path: "/dashboard", group: "工作", primary: true, icon: "dashboard" },
  { key: "tasks", label: "任務", path: "/tasks", group: "工作", primary: true, icon: "tasks" },
  { key: "calendar", label: "日曆", path: "/calendar", group: "工作", primary: true, icon: "calendar" },
  { key: "focus", label: "專注", path: "/focus", group: "工作", primary: true, icon: "focus" },

  { key: "notes", label: "筆記", path: "/notes", group: "個人", icon: "notes" },
  { key: "habits", label: "習慣", path: "/habits", group: "個人", icon: "habits" },

  { key: "body", label: "身體數據", path: "/body", group: "健康", icon: "body" },
  { key: "nutrition", label: "飲食", path: "/nutrition", group: "健康", icon: "nutrition" },
  { key: "sleep", label: "睡眠", path: "/sleep", group: "健康", icon: "sleep" },
  { key: "symptoms", label: "症狀", path: "/symptoms", group: "健康", icon: "symptoms" },
  { key: "meds", label: "用藥", path: "/meds", group: "健康", icon: "meds" },
  { key: "workouts", label: "健身", path: "/workouts", group: "健康", icon: "workouts" },
  { key: "rehab", label: "復健", path: "/rehab", group: "健康", icon: "rehab" },
  { key: "timeline", label: "健康時間線", path: "/timeline", group: "健康", icon: "timeline" },

  { key: "settings", label: "設定", path: "/settings", group: "系統", primary: true, icon: "settings" },
];

export const NAV_GROUPS: NavGroup[] = ["工作", "個人", "健康", "系統"];

export function navItemsByGroup(group: NavGroup): NavItem[] {
  return NAV_ITEMS.filter((item) => item.group === group);
}

export const PRIMARY_NAV_ITEMS: NavItem[] = NAV_ITEMS.filter((item) => item.primary);
