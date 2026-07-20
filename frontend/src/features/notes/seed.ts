/**
 * features/notes/seed.ts — 試用模式種子資料（notes / note_versions）。
 * 日期分布於近 30 天內，內容涵蓋工作筆記、每日筆記、讀書筆記、雙向連結示範等情境。
 */

import type { Note, NoteVersion } from "./types";
import { dailyNoteTitleFor, dateStrDaysAgo, isoDaysAgo } from "./utils";

function base(id: string, createdDaysAgo: number, updatedDaysAgo = createdDaysAgo) {
  return {
    id,
    createdAt: isoDaysAgo(createdDaysAgo, 9, 15),
    updatedAt: isoDaysAgo(updatedDaysAgo, 18, 40),
    version: 1,
    deleted: false,
  };
}

export function seedNotes(): Note[] {
  const notes: Note[] = [
    {
      ...base("note-seed-001", 28),
      title: "DailyOS 專案筆記",
      content:
        "# DailyOS 專案筆記\n\n這是專案的核心設計筆記，之後所有規劃都會連回這篇。\n\n- 前端：Next.js + Tailwind\n- 資料層：試用模式用 Dexie，登入模式打 REST API\n- 詳見 [[架構決策紀錄]] 與 [[每週回顧範本]]\n\n> 保持介面簡潔、雜誌式編排，數據一律 tabular-nums。",
      folder: "工作/DailyOS",
      tags: ["專案", "架構"],
      pinned: true,
      isDaily: false,
      projectId: "proj-seed-dailyos",
      projectName: "DailyOS 開發",
      taskId: "task-seed-001",
      taskTitle: "完成筆記模組 MVP",
    },
    {
      ...base("note-seed-002", 27),
      title: "架構決策紀錄",
      content:
        "# 架構決策紀錄（ADR）\n\n## 為何選 Dexie 做試用模式儲存\n\n1. 不需後端即可完整體驗\n2. IndexedDB 容量足夠、離線可用\n3. 之後同步可用 `updatedAt` + `version` 做基礎的樂觀鎖\n\n連回 [[DailyOS 專案筆記]]。\n\n```ts\ninterface BaseRecord {\n  id: string;\n  version: number;\n}\n```",
      folder: "工作/DailyOS",
      tags: ["架構", "技術決策"],
      pinned: false,
      isDaily: false,
      projectId: "proj-seed-dailyos",
      projectName: "DailyOS 開發",
    },
    {
      ...base("note-seed-003", 25, 3),
      title: "每週回顧範本",
      content:
        "# 每週回顧範本\n\n## 本週完成\n- \n\n## 卡關 / 待釐清\n- \n\n## 下週優先\n- \n\n每週五套用本範本建立新的一篇，可從 [[DailyOS 專案筆記]] 連過來。",
      folder: "工作/範本",
      tags: ["範本", "回顧"],
      pinned: true,
      isDaily: false,
    },
    {
      ...base("note-seed-004", 21, 21),
      title: dailyNoteTitleFor(dateStrDaysAgo(21)),
      content:
        `# ${dailyNoteTitleFor(dateStrDaysAgo(21))}\n\n## 待辦\n- [ ] 回覆客戶信件\n- [ ] 更新 [[DailyOS 專案筆記]]\n\n## 筆記\n今天把筆記模組的資料結構定案，決定用 note_versions 存版本快照。`,
      folder: "每日筆記",
      tags: ["每日筆記"],
      pinned: false,
      isDaily: true,
      dailyDate: dateStrDaysAgo(21),
    },
    {
      ...base("note-seed-005", 14, 14),
      title: dailyNoteTitleFor(dateStrDaysAgo(14)),
      content:
        `# ${dailyNoteTitleFor(dateStrDaysAgo(14))}\n\n## 今日重點\n開會討論 Quick Add 的自然語言解析規則，順便記錄幾個 *邊界情況*。\n\n## 靈感\n- 也許可以支援語音輸入？`,
      folder: "每日筆記",
      tags: ["每日筆記", "會議"],
      pinned: false,
      isDaily: true,
      dailyDate: dateStrDaysAgo(14),
    },
    {
      ...base("note-seed-006", 7, 7),
      title: dailyNoteTitleFor(dateStrDaysAgo(7)),
      content: `# ${dailyNoteTitleFor(dateStrDaysAgo(7))}\n\n休息一天，整理書桌，順手把 [[讀書筆記：原子習慣]] 補完。`,
      folder: "每日筆記",
      tags: ["每日筆記"],
      pinned: false,
      isDaily: true,
      dailyDate: dateStrDaysAgo(7),
    },
    {
      ...base("note-seed-007", 20, 5),
      title: "讀書筆記：原子習慣",
      content:
        "# 讀書筆記：原子習慣\n\n## 核心觀念\n1. 習慣是複利效應的展現\n2. 系統 > 目標\n3. 身分認同驅動行為改變\n\n## 佳句\n> 你不會上升到你目標的高度，你只會落到你系統的水準。\n\n## 行動項目\n- 每天固定時間寫每日筆記，養成回顧習慣（見 [[每週回顧範本]]）",
      folder: "個人/讀書筆記",
      tags: ["讀書", "習慣養成"],
      pinned: true,
      isDaily: false,
    },
    {
      ...base("note-seed-008", 18, 18),
      title: "會議記錄：健康模組需求訪談",
      content:
        "# 會議記錄：健康模組需求訪談\n\n與會：PM、設計、後端\n\n## 結論\n- 症狀紀錄需要可自訂欄位\n- 用藥提醒要能設定多個時段\n\n## Follow-up\n- [ ] 整理成 user story，關聯到 [[DailyOS 專案筆記]]",
      folder: "工作/會議",
      tags: ["會議", "健康模組"],
      pinned: false,
      isDaily: false,
      taskId: "task-seed-002",
      taskTitle: "整理健康模組 user story",
    },
    {
      ...base("note-seed-009", 12, 12),
      title: "旅行清單：東京三日遊",
      content:
        "# 旅行清單：東京三日遊\n\n## 行前準備\n- 護照 / 匯率 / SIM 卡\n\n## 景點\n- 淺草寺\n- 代代木公園\n- 秋葉原\n\n## 預算表\n\n| 項目 | 預估花費 |\n| --- | --- |\n| 機票 | 12000 |\n| 住宿 | 9000 |",
      folder: "個人/旅行",
      tags: ["旅行", "清單"],
      pinned: false,
      isDaily: false,
    },
    {
      ...base("note-seed-010", 9, 2),
      title: "程式片段：Debounce Hook",
      content:
        "# 程式片段：Debounce Hook\n\n實作筆記編輯器自動儲存時使用。\n\n```ts\nfunction useDebouncedValue<T>(value: T, delay = 500): T {\n  const [debounced, setDebounced] = useState(value);\n  useEffect(() => {\n    const timer = setTimeout(() => setDebounced(value), delay);\n    return () => clearTimeout(timer);\n  }, [value, delay]);\n  return debounced;\n}\n```",
      folder: "工作/程式片段",
      tags: ["程式", "React"],
      pinned: false,
      isDaily: false,
    },
    {
      ...base("note-seed-011", 5, 5),
      title: "靈感隨手記",
      content:
        "# 靈感隨手記\n\n- Quick Add 可以加入「連續輸入」模式\n- 筆記匯出時可選擇是否包含 front matter\n- 標籤雲視覺化？",
      folder: "",
      tags: ["靈感"],
      pinned: false,
      isDaily: false,
    },
    {
      ...base("note-seed-012", 3, 1),
      title: "客戶回饋彙整",
      content:
        "# 客戶回饋彙整\n\n## 正面\n- 介面乾淨、載入快\n\n## 待改進\n- 希望筆記可以匯出 Markdown\n- 手機上編輯體驗需要優化\n\n關聯任務：[[DailyOS 專案筆記]]",
      folder: "工作/DailyOS",
      tags: ["回饋", "客戶"],
      pinned: false,
      isDaily: false,
      projectId: "proj-seed-dailyos",
      projectName: "DailyOS 開發",
    },
    {
      ...base("note-seed-013", 16, 16),
      title: "封存草稿：舊版設計說明（已刪除示範）",
      content: "# 封存草稿\n\n這篇用來示範刪除復原機制，內容已不再使用。",
      folder: "工作/DailyOS",
      tags: ["草稿"],
      pinned: false,
      isDaily: false,
      deleted: true,
    },
    {
      ...base("note-seed-014", 2, 0),
      title: dailyNoteTitleFor(dateStrDaysAgo(0)),
      content: `# ${dailyNoteTitleFor(dateStrDaysAgo(0))}\n\n## 今日待辦\n- [ ] 檢查筆記模組驗收項目\n- [ ] 回顧 [[讀書筆記：原子習慣]]`,
      folder: "每日筆記",
      tags: ["每日筆記"],
      pinned: false,
      isDaily: true,
      dailyDate: dateStrDaysAgo(0),
    },
  ];

  return notes;
}

export function seedNoteVersions(): NoteVersion[] {
  const versions: NoteVersion[] = [
    {
      ...base("nver-seed-001", 27, 27),
      noteId: "note-seed-001",
      title: "DailyOS 專案筆記（草稿）",
      content: "# DailyOS 專案筆記\n\n初版草稿，尚未定案儲存策略。",
      folder: "工作/DailyOS",
      tags: ["專案"],
      reason: "auto_snapshot",
      noteVersionAtSnapshot: 1,
    },
    {
      ...base("nver-seed-002", 20, 20),
      noteId: "note-seed-001",
      title: "DailyOS 專案筆記",
      content:
        "# DailyOS 專案筆記\n\n這是專案的核心設計筆記。\n\n- 前端：Next.js + Tailwind\n- 資料層：試用模式用 Dexie，登入模式打 REST API",
      folder: "工作/DailyOS",
      tags: ["專案", "架構"],
      reason: "manual_save",
      noteVersionAtSnapshot: 2,
    },
    {
      ...base("nver-seed-003", 8, 8),
      noteId: "note-seed-007",
      title: "讀書筆記：原子習慣",
      content: "# 讀書筆記：原子習慣\n\n## 核心觀念\n1. 習慣是複利效應的展現\n2. 系統 > 目標",
      folder: "個人/讀書筆記",
      tags: ["讀書"],
      reason: "manual_save",
      noteVersionAtSnapshot: 2,
    },
    {
      ...base("nver-seed-004", 3, 3),
      noteId: "note-seed-010",
      title: "程式片段：Debounce Hook（初版）",
      content: "# 程式片段：Debounce Hook\n\n先用 setTimeout 土砲實作，之後再優化。",
      folder: "工作/程式片段",
      tags: ["程式"],
      reason: "auto_snapshot",
      noteVersionAtSnapshot: 1,
    },
  ];
  return versions;
}
