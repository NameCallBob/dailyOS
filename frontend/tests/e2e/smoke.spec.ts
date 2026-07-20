import { test, expect, type Page } from "@playwright/test";

/**
 * 冒煙測試（Smoke test）— 驗證試用模式的核心路徑：
 *   落地頁 → 選「試用」 → /dashboard 載入 seed → 新增一筆任務
 *   → 重新整理仍在（Dexie 持久化） → 切換模式 cookie 正確
 *
 * 僅涵蓋「試用模式」（Dexie，無需後端）；登入模式需要真實後端 API，
 * 不在本冒煙測試範圍內，僅驗證「切換到登入模式」會正確清除 daios_mode
 * cookie 並導向 /login（符合 middleware.ts 的導流規則）。
 */

const MODE_COOKIE = "daios_mode";

async function getModeCookie(page: Page): Promise<string | undefined> {
  const cookies = await page.context().cookies();
  return cookies.find((c) => c.name === MODE_COOKIE)?.value;
}

test.describe("DailyOS 試用模式冒煙測試", () => {
  test("落地頁選試用 → dashboard 載入 seed → 新增任務 → 重新整理仍在 → 切換模式 cookie 正確", async ({
    page,
  }) => {
    // 1) 落地頁 → 選「試用」
    await page.goto("/");
    await expect(page.getByRole("button", { name: "免費試用" })).toBeVisible();
    await page.getByRole("button", { name: "免費試用" }).click();

    // 2) 導向 /dashboard，且 daios_mode cookie 已寫入 "trial"
    await page.waitForURL(/\/dashboard$/);
    await expect.poll(() => getModeCookie(page)).toBe("trial");

    // Dashboard 載入完成：至少可看到頁面標題（總覽），且沒有卡在載入中的 Spinner 太久。
    await expect(page.getByRole("heading", { name: "總覽" }).first()).toBeVisible({ timeout: 10_000 });

    // 3) 切換到「任務」頁，確認 seed 資料已載入（清單非「載入中」/錯誤狀態，且至少有既有任務或可新增）。
    await page.goto("/tasks");
    await expect(page.getByRole("heading", { name: "任務", exact: true })).toBeVisible();
    // 預設「今天」檢視只顯示今日到期的任務，先確認至少有既有 seed 任務渲染出來。
    await expect(page.getByRole("checkbox", { name: /^選取「/ }).first()).toBeVisible();

    // 4) 新增一筆任務（不填到期日，故切到「全部」分頁才看得到）
    const uniqueTitle = `冒煙測試任務 ${Date.now()}`;
    await page.getByRole("button", { name: "新增任務" }).first().click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    // Sheet 進場有滑入／淡入動畫（見 components/ui/sheet.tsx 的 animate-slide-up）；
    // 動畫完全結束前操作輸入框，在極快速的自動化點擊下可能與 focus-trap 的
    // 初始 focus 設定互相干擾而遺失剛輸入的值，先等待動畫穩定再操作。
    await dialog.getByLabel("標題").waitFor({ state: "visible" });
    await page.waitForTimeout(500);
    await dialog.getByLabel("標題").fill(uniqueTitle);
    await expect(dialog.getByLabel("標題")).toHaveValue(uniqueTitle);
    await dialog.getByRole("button", { name: "儲存" }).click();

    await expect(dialog).toBeHidden();
    await page.getByRole("tab", { name: "全部" }).click();
    await expect(page.getByText(uniqueTitle)).toBeVisible({ timeout: 10_000 });

    // 5) 重新整理仍在（試用模式資料落地於瀏覽器 IndexedDB / Dexie，非僅記憶體狀態）
    await page.reload();
    await page.getByRole("tab", { name: "全部" }).click();
    await expect(page.getByText(uniqueTitle)).toBeVisible({ timeout: 10_000 });

    // 6) 切換模式：從「設定」頁點擊「切換為登入模式」，
    //    應清除 daios_mode cookie 並導向 /login（真正切為 auth 需登入成功才會寫回 cookie，
    //    因此這裡驗證的是「離開試用模式」這一段的 cookie / 導流行為）。
    await page.goto("/settings");
    await page.getByRole("tab", { name: "模式" }).click();
    await page.getByRole("button", { name: "切換為登入模式" }).click();
    await page.waitForURL(/\/login$/);
    await expect.poll(() => getModeCookie(page)).toBeUndefined();

    // 7) middleware 導流：清除 daios_mode 後造訪任一 (app) 路徑應被導回落地頁 "/"。
    await page.goto("/dashboard");
    await page.waitForURL((url) => url.pathname === "/");

    // 8) 手動寫回 daios_mode=trial cookie 後，(app) 路徑應可再次進入（middleware 放行）。
    await page.context().addCookies([
      {
        name: MODE_COOKIE,
        value: "trial",
        url: page.url(),
      },
    ]);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: "總覽" }).first()).toBeVisible();
  });

  test("daios_mode=auth 但沒有 daios_token 時，middleware 會導向 /login", async ({ page }) => {
    await page.goto("/");
    await page.context().addCookies([{ name: MODE_COOKIE, value: "auth", url: page.url() }]);
    await page.goto("/dashboard");
    await page.waitForURL(/\/login$/);
  });
});
