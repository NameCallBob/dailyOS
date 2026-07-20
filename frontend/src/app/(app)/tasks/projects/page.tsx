import type { Metadata } from "next";
import Link from "next/link";

import { ProjectListPage } from "@/features/tasks/components/project-list";

export const metadata: Metadata = { title: "專案" };

export default function TasksProjectsPage() {
  return (
    <div className="flex flex-col gap-4">
      <Link href="/tasks" className="text-caption text-accent underline underline-offset-2 hover:opacity-80">
        ← 回到任務
      </Link>
      <ProjectListPage />
    </div>
  );
}
