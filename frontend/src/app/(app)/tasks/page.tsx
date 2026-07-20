import type { Metadata } from "next";
import Link from "next/link";

import { TaskListPage } from "@/features/tasks/components/task-list";

export const metadata: Metadata = { title: "任務" };

export default function TasksPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-ink">任務</h1>
          <p className="mt-1 text-caption text-ink-muted">今天、即將到來、收件匣、全部與已完成任務一次管理。</p>
        </div>
        <Link href="/tasks/projects" className="text-caption text-accent underline underline-offset-2 hover:opacity-80">
          管理專案 →
        </Link>
      </div>
      <TaskListPage />
    </div>
  );
}
