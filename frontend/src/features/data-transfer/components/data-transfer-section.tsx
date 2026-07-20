"use client";

/**
 * components/data-transfer-section.tsx — 資料匯出/匯入區塊。
 *
 * 供設定頁（本機模式）嵌入：匯出目前 Dexie 全部資料為 JSON 備份，或從備份檔匯入
 * （合併 / 取代兩種策略）。純前端運作，適用於「本機模式跨電腦攜帶資料」。
 */

import { useCallback, useRef, useState, type ChangeEvent, type DragEvent } from "react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { getActiveQueryClient } from "@/lib/query";
import { exportBackup } from "../export";
import { applyImport, BackupParseError, parseBackupFile } from "../import";
import type { ImportResult, ImportStrategy, ParsedBackup } from "../types";
import { ImportPreviewSheet } from "./import-preview-sheet";

const ACCEPTED_EXTENSION = ".json";

export function DataTransferSection() {
  const [exporting, setExporting] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [fileError, setFileError] = useState<string | undefined>(undefined);
  const [parsed, setParsed] = useState<ParsedBackup | undefined>(undefined);
  const [lastResult, setLastResult] = useState<ImportResult | undefined>(undefined);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const bundle = await exportBackup();
      const rowCount = Object.values(bundle.tables).reduce((sum, rows) => sum + rows.length, 0);
      toast.success(`已匯出 ${rowCount.toLocaleString("zh-TW")} 筆資料，請確認瀏覽器下載內容。`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "匯出失敗，請稍後再試一次。");
    } finally {
      setExporting(false);
    }
  }, []);

  const handleFile = useCallback(async (file: File) => {
    setFileError(undefined);
    setLastResult(undefined);
    setParsing(true);
    try {
      const result = await parseBackupFile(file);
      setParsed(result);
    } catch (err) {
      const message = err instanceof BackupParseError ? err.message : "備份檔讀取失敗，請確認檔案內容。";
      setFileError(message);
      toast.error(message);
    } finally {
      setParsing(false);
    }
  }, []);

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // 允許連續選同一個檔案也能重新觸發 change。
    event.target.value = "";
    if (file) void handleFile(file);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
  }

  async function handleConfirmImport(strategy: ImportStrategy) {
    if (!parsed) return;
    setImporting(true);
    try {
      const result = await applyImport(parsed.bundle, strategy);
      getActiveQueryClient()?.invalidateQueries();
      setParsed(undefined);
      setLastResult(result);
      toast.success(
        `匯入完成：${result.tablesWritten} 張表、共寫入 ${result.rowsWritten.toLocaleString("zh-TW")} 筆資料。`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "匯入失敗，資料未寫入，請再試一次。");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h3 className="text-h3 text-ink">匯出備份</h3>
        <p className="text-caption text-ink-muted">
          將目前模式的所有資料（任務、健康紀錄、設定等 34 張表）匯出為單一 JSON 檔案，供備份或攜帶到另一台電腦匯入。
        </p>
        <p
          role="note"
          className="rounded-md border border-warning-soft bg-warning-soft px-3 py-2 text-caption text-warning"
        >
          備份檔內含健康資料且未加密，若要分享或傳輸給他人，請務必妥善保管、避免上傳到不受信任的地方。
        </p>
        <div>
          <Button variant="secondary" loading={exporting} onClick={handleExport}>
            匯出資料（JSON）
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-3 border-t border-line pt-6">
        <h3 className="text-h3 text-ink">從備份檔匯入</h3>
        <p className="text-caption text-ink-muted">
          選擇或拖放先前匯出的 JSON 備份檔，確認各表筆數後再選擇合併或取代方式套用。
        </p>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={
            "flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-8 text-center transition-colors " +
            (dragActive ? "border-ink bg-paper-sunken" : "border-line-strong bg-paper-sunken/60")
          }
        >
          <p className="text-body text-ink-soft">將 JSON 備份檔拖放到這裡，或</p>
          <Button
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            loading={parsing}
          >
            選擇檔案
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept={`${ACCEPTED_EXTENSION},application/json`}
            className="sr-only"
            aria-label="選擇備份 JSON 檔案"
            onChange={handleInputChange}
          />
          {parsing ? (
            <p className="flex items-center gap-2 text-caption text-ink-muted">
              <Spinner size="sm" /> 正在讀取並驗證檔案內容…
            </p>
          ) : null}
        </div>

        {fileError ? (
          <p role="alert" className="text-caption text-danger">
            {fileError}
          </p>
        ) : null}

        {lastResult ? (
          <div className="flex flex-col gap-2 rounded-md border border-success-soft bg-success-soft px-3 py-2 text-caption text-success">
            <p>
              匯入完成（{lastResult.strategy === "merge" ? "合併" : "取代"}）：{lastResult.tablesWritten} 張表、共
              {lastResult.rowsWritten.toLocaleString("zh-TW")} 筆資料已寫入本機資料庫。
            </p>
            <p>部分畫面可能仍顯示匯入前的資料，建議重新整理頁面以套用最新內容。</p>
            <div>
              <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
                重新整理頁面
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      <ImportPreviewSheet
        open={Boolean(parsed)}
        parsed={parsed}
        importing={importing}
        onCancel={() => setParsed(undefined)}
        onConfirm={(strategy) => void handleConfirmImport(strategy)}
      />
    </div>
  );
}
