"use client";

import { useEffect, useState } from "react";

/**
 * 每秒回傳一次目前時間戳（僅在 active 為 true 時持續跳動），
 * 讓執行中計時器的顯示能持續更新。時間戳一律在 effect（非 render 階段）
 * 呼叫 Date.now() 取得，避免在元件渲染期間呼叫不純函式。
 * 經過秒數本身仍是即時由時間戳算出，這裡只是驅動重繪並提供「目前時間」。
 */
export function useTicker(active: boolean): number {
  const [now, setNow] = useState(0);

  useEffect(() => {
    const update = () => setNow(Date.now());
    // 以 setTimeout(0) 而非同步呼叫，避免在 effect 主體內直接同步觸發 setState。
    const immediate = window.setTimeout(update, 0);
    if (!active) {
      return () => window.clearTimeout(immediate);
    }
    const id = window.setInterval(update, 1000);
    return () => {
      window.clearTimeout(immediate);
      window.clearInterval(id);
    };
  }, [active]);

  return now;
}
