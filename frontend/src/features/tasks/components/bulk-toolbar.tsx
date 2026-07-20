"use client";

import { Button } from "@/components/ui/button";

export interface BulkToolbarProps {
  count: number;
  onComplete: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onClear: () => void;
}

export function BulkToolbar({ count, onComplete, onArchive, onDelete, onClear }: BulkToolbarProps) {
  if (count === 0) return null;
  return (
    <div
      role="toolbar"
      aria-label="批次操作"
      className="flex flex-wrap items-center gap-2 rounded-md border border-line-strong bg-paper-sunken px-3 py-2"
    >
      <span className="text-caption text-ink">已選取 {count} 項</span>
      <div className="ml-auto flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={onComplete}>
          批次完成
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={onArchive}>
          批次封存
        </Button>
        <Button type="button" size="sm" variant="danger" onClick={onDelete}>
          批次刪除
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onClear}>
          取消選取
        </Button>
      </div>
    </div>
  );
}
