"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Spinner } from "@/components/ui/spinner";
import { useResolvedWidgetOrder } from "./layout";
import { dashboardLayoutResource } from "./resources";
import type { DashboardWidgetConfig } from "./types";
import { WidgetSettingsSheet } from "./widget-settings-sheet";
import { WIDGET_COMPONENTS, WIDGET_SPAN } from "./widgets";

export function DashboardView() {
  const { data, isLoading, isError, refetch } = dashboardLayoutResource.useList();
  const update = dashboardLayoutResource.useUpdate();
  const create = dashboardLayoutResource.useCreate();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const layout = data?.results[0];
  const resolvedWidgets = useResolvedWidgetOrder(layout?.widgets);

  // 極端情況：若 dashboard_layout 表為空（理論上 seed 會避免），建立一筆預設版面。
  useEffect(() => {
    if (!isLoading && !isError && data && data.results.length === 0 && !create.isPending) {
      create.mutate({ widgets: resolvedWidgets });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isError, data]);

  function persist(widgets: DashboardWidgetConfig[]) {
    if (!layout) return;
    update.mutate({ id: layout.id, patch: { widgets } });
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return <ErrorState description="版面設定載入失敗。" onRetry={() => refetch()} />;
  }

  const visibleWidgets = resolvedWidgets.filter((w) => w.visible);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <h1 className="sr-only">總覽</h1>
        <div />
        <Button variant="secondary" size="sm" onClick={() => setSettingsOpen(true)}>
          自訂版面
        </Button>
      </div>

      {visibleWidgets.length === 0 ? (
        <ErrorState
          title="沒有顯示中的小工具"
          description="目前所有小工具都被隱藏了，點右上角「自訂版面」重新開啟。"
          action={
            <Button variant="secondary" size="sm" onClick={() => setSettingsOpen(true)}>
              開啟版面設定
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleWidgets.map((widget) => {
            const Widget = WIDGET_COMPONENTS[widget.key];
            const span = WIDGET_SPAN[widget.key];
            return (
              <div key={widget.key} className={span}>
                <Widget />
              </div>
            );
          })}
        </div>
      )}

      <WidgetSettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        widgets={resolvedWidgets}
        onChange={persist}
        saving={update.isPending}
      />
    </div>
  );
}
