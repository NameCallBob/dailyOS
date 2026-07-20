import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright 設定 — 冒煙測試（tests/e2e/**）。
 * 預設對本機 `next start`（production build）跑測試，確保與部署行為一致；
 * 若要對 `next dev` 跑，改用 PW_BASE_URL / PW_SKIP_WEBSERVER 環境變數即可。
 */
const PORT = process.env.PW_PORT ?? "3900";
const baseURL = process.env.PW_BASE_URL ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.PW_SKIP_WEBSERVER
    ? undefined
    : {
        command: `npm run build && npm run start -- -p ${PORT}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
