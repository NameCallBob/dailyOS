"use client";

/**
 * components/import-preview-sheet.tsx — 匯入前預覽（底部抽屜）：
 * 顯示備份檔各表筆數摘要、來源模式/時間，讓使用者選擇「合併」或「取代」策略後確認匯入。
 */

import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import type { DaiosMode } from "@/lib/mode";
import { tableLabel } from "../constants";
import type { ImportStrategy, ParsedBackup } from "../types";

const MODE_LABELS: Record<DaiosMode, string> = {
  trial: "試用",
  local: "本機",
  auth: "雲端同步",
};

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export interface ImportPreviewSheetProps {
  open: boolean;
  parsed: ParsedBackup | undefined;
  importing: boolean;
  onCancel: () => void;
  onConfirm: (strategy: ImportStrategy) => void;
}

export function ImportPreviewSheet({ open, parsed, importing, onCancel, onConfirm }: ImportPreviewSheetProps) {
  const [strategy, setStrategy] = useState<ImportStrategy>("merge");
  const [replaceAck, setReplaceAck] = useState(false);
  const ackId = useId();

  if (!open || !parsed) return null;

  const nonEmptyRows = parsed.summary.filter((row) => row.count > 0);
  const isEmpty = parsed.totalRows === 0;
  const canConfirm = strategy === "merge" || replaceAck;

  function handleClose() {
    setStrategy("merge");
    setReplaceAck(false);
    onCancel();
  }

  return (
    <Sheet
      open={open}
      onClose={importing ? () => undefined : handleClose}
      title="匯入預覽"
      description={`備份時間：${formatDateTime(parsed.bundle.exportedAt)}．來源模式：${MODE_LABELS[parsed.bundle.mode]}`}
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={importing}>
            取消
          </Button>
          <Button
            variant={strategy === "replace" ? "danger" : "primary"}
            loading={importing}
            disabled={isEmpty || !canConfirm}
            onClick={() => onConfirm(strategy)}
          >
            確認匯入
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {isEmpty ? (
          <p className="rounded-md border border-line-strong bg-paper-sunken px-3 py-2 text-caption text-ink-muted">
            這份備份檔沒有任何資料列，無法匯入。
          </p>
        ) : (
          <div>
            <p className="mb-2 text-caption text-ink-muted">
              共 {nonEmptyRows.length} 張表、{parsed.totalRows.toLocaleString("zh-TW")} 筆資料：
            </p>
            <ul className="max-h-56 overflow-y-auto rounded-md border border-line">
              {nonEmptyRows.map((row) => (
                <li
                  key={row.table}
                  className="flex items-center justify-between gap-3 border-b border-line px-3 py-2 text-body text-ink last:border-b-0"
                >
                  <span>{tableLabel(row.table)}</span>
                  <span className="text-caption text-ink-muted">{row.count.toLocaleString("zh-TW")} 筆</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {parsed.unknownTables.length > 0 ? (
          <p className="rounded-md border border-warning-soft bg-warning-soft px-3 py-2 text-caption text-warning">
            備份檔內含目前版本無法辨識的表格（{parsed.unknownTables.join("、")}），匯入時將略過這些內容。
          </p>
        ) : null}

        {!isEmpty ? (
          <div className="flex flex-col gap-2">
            <Segmented
              label="匯入策略"
              value={strategy}
              onChange={(value) => {
                setStrategy(value as ImportStrategy);
                setReplaceAck(false);
              }}
              options={[
                { value: "merge", label: "合併（保留較新資料）" },
                { value: "replace", label: "取代（清空後匯入）" },
              ]}
            />
            {strategy === "merge" ? (
              <p className="text-caption text-ink-muted">
                依 id 比對，僅在匯入資料的更新時間較新（或本機沒有這筆）時才覆蓋，本機較新的資料會被保留。
              </p>
            ) : (
              <div className="flex flex-col gap-2 rounded-md border border-danger-soft bg-danger-soft/40 px-3 py-2">
                <p className="text-caption text-danger">
                  取代將先清空目前模式的所有本機資料，再整批寫入備份內容，此動作無法復原。
                </p>
                <label htmlFor={ackId} className="flex items-start gap-2 text-caption text-ink">
                  <input
                    id={ackId}
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-line-strong"
                    checked={replaceAck}
                    onChange={(e) => setReplaceAck(e.target.checked)}
                  />
                  我了解取代將清除本機現有資料，且無法復原。
                </label>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </Sheet>
  );
}
