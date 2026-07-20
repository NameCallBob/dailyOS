"use client";

import Link from "next/link";

import { Card } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import type { DaiosMode } from "@/lib/mode";
import { useSettingsUiStore, type SettingsTab } from "../store";
import { ModeSection } from "./mode-section";
import { NotificationForm } from "./notification-form";
import { PrivacySection } from "./privacy-section";
import { ProfileForm } from "./profile-form";

const TAB_ITEMS: { value: SettingsTab; label: string }[] = [
  { value: "profile", label: "個人資料" },
  { value: "notifications", label: "通知偏好" },
  { value: "privacy", label: "隱私與資料" },
  { value: "mode", label: "模式" },
];

export interface SettingsPageProps {
  mode: DaiosMode;
}

export function SettingsPage({ mode }: SettingsPageProps) {
  const tab = useSettingsUiStore((s) => s.tab);
  const setTab = useSettingsUiStore((s) => s.setTab);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-label uppercase text-ink-muted">系統</p>
        <h1 className="text-h1 text-ink">設定</h1>
        <p className="text-caption text-ink-muted">
          管理個人資料、通知偏好、隱私與資料，以及帳號模式。
          <Link href="/welcome" className="ml-1 text-ink underline underline-offset-2">
            重新查看初次導覽
          </Link>
        </p>
      </header>

      <Tabs items={TAB_ITEMS} value={tab} onChange={(value) => setTab(value as SettingsTab)} />

      <Card>
        {tab === "profile" ? <ProfileForm /> : null}
        {tab === "notifications" ? <NotificationForm /> : null}
        {tab === "privacy" ? <PrivacySection /> : null}
        {tab === "mode" ? <ModeSection mode={mode} /> : null}
      </Card>
    </div>
  );
}
