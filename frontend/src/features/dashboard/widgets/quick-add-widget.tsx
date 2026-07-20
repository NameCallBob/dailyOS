"use client";

import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuickAddStore } from "@/components/quick-add/store";

export function QuickAddWidget() {
  const show = useQuickAddStore((state) => state.show);

  return (
    <Card className="flex flex-col justify-between">
      <CardHeader>
        <CardTitle>快速新增</CardTitle>
      </CardHeader>
      <CardBody className="flex flex-1 flex-col justify-between gap-4">
        <p className="text-caption text-ink-muted">
          用一句話快速記錄任務、筆記、飲水、體重、症狀、運動、習慣或行程。
        </p>
        <div className="flex flex-col gap-2">
          <Button onClick={show} className="w-full">
            開啟快速新增
          </Button>
          <p className="text-center text-label text-ink-faint">快捷鍵 ⌘/Ctrl + K 或按 N</p>
        </div>
      </CardBody>
    </Card>
  );
}
