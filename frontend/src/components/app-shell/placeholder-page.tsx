import { EmptyState } from "@/components/ui/empty-state";

export function PlaceholderPage({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1 text-ink">{title}</h1>
        <p className="text-caption text-ink-muted">此模組尚未實作，將由對應的 module agent 建置。</p>
      </header>
      <EmptyState
        title={`${title}即將推出`}
        description={description ?? "此頁面為 Foundation 佔位頁，功能將由後續模組開發補齊。"}
      />
    </div>
  );
}
