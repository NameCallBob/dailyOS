/**
 * features/timeline/seed.ts — 種子資料（試用模式，首次讀取空表時植入）。
 * 日期分布於近 30 天內，資料為逼真示意內容，非真實病歷。
 */

import { daysAgo, toDateKey } from "./date-utils";
import type {
  Activity,
  Appointment,
  HealthDocument,
  ReadMedication,
  ReadMedicationLog,
  ReadRehabSession,
  ReadSymptomLog,
  ReadWorkout,
} from "./schema";

function base(id: string, at: Date) {
  const iso = at.toISOString();
  return { id, createdAt: iso, updatedAt: iso, version: 1, deleted: false };
}

// 1x1 透明 PNG，作為附件示意用（非真實檢驗影像）
const PLACEHOLDER_IMAGE_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

// ---------------------------------------------------------------------------
// 本模組擁有：health_documents
// ---------------------------------------------------------------------------

export function seedHealthDocuments(): HealthDocument[] {
  return [
    {
      ...base("doc-1", daysAgo(28, 10, 0)),
      date: toDateKey(daysAgo(28)),
      category: "檢驗報告",
      title: "年度健康檢查—血液常規",
      provider: "聯合醫院健檢中心",
      fileName: "血液常規報告.png",
      mimeType: "image/png",
      fileDataUrl: PLACEHOLDER_IMAGE_DATA_URL,
      fileSizeKb: 42,
      notes: "空腹血糖、血脂皆在正常範圍，膽固醇略高於標準，建議追蹤飲食。",
    },
    {
      ...base("doc-2", daysAgo(28, 10, 5)),
      date: toDateKey(daysAgo(28)),
      category: "影像報告",
      title: "胸部 X 光",
      provider: "聯合醫院健檢中心",
      fileName: "胸部X光.png",
      mimeType: "image/png",
      fileDataUrl: PLACEHOLDER_IMAGE_DATA_URL,
      fileSizeKb: 58,
      notes: "無異常發現。",
    },
    {
      ...base("doc-3", daysAgo(21, 15, 30)),
      date: toDateKey(daysAgo(21)),
      category: "診斷證明",
      title: "急性腸胃炎診斷證明",
      provider: "康寧家醫科診所",
      fileName: "診斷證明書.png",
      mimeType: "image/png",
      fileDataUrl: PLACEHOLDER_IMAGE_DATA_URL,
      fileSizeKb: 30,
      appointmentId: "appt-4",
      notes: "建議休息 2 天，清淡飲食。",
    },
    {
      ...base("doc-4", daysAgo(14, 11, 0)),
      date: toDateKey(daysAgo(14)),
      category: "收據/費用",
      title: "復健治療費用收據",
      provider: "康寧復健科診所",
      fileName: "收據.png",
      mimeType: "image/png",
      fileDataUrl: PLACEHOLDER_IMAGE_DATA_URL,
      fileSizeKb: 18,
      notes: "自費項目：徒手治療 NT$800。",
    },
    {
      ...base("doc-5", daysAgo(9, 9, 20)),
      date: toDateKey(daysAgo(9)),
      category: "轉診單",
      title: "轉診至骨科門診",
      provider: "康寧家醫科診所",
      notes: "因下背痛反覆發作，建議轉診骨科進一步評估。",
    },
    {
      ...base("doc-6", daysAgo(6, 16, 0)),
      date: toDateKey(daysAgo(6)),
      category: "影像報告",
      title: "腰椎 MRI 報告",
      provider: "聯合醫院骨科",
      fileName: "腰椎MRI.png",
      mimeType: "image/png",
      fileDataUrl: PLACEHOLDER_IMAGE_DATA_URL,
      fileSizeKb: 76,
      appointmentId: "appt-2",
      notes: "L4-L5 輕度椎間盤突出，建議物理治療為主，暫不需手術。",
    },
    {
      ...base("doc-7", daysAgo(2, 14, 45)),
      date: toDateKey(daysAgo(2)),
      category: "病歷摘要",
      title: "骨科門診病歷摘要",
      provider: "聯合醫院骨科",
      notes: "持續復健治療，四週後回診追蹤。",
    },
    {
      ...base("doc-8", daysAgo(0, 8, 30)),
      date: toDateKey(daysAgo(0)),
      category: "其他",
      title: "藥局用藥說明單",
      provider: "康健藥局",
      fileName: "用藥說明.png",
      mimeType: "image/png",
      fileDataUrl: PLACEHOLDER_IMAGE_DATA_URL,
      fileSizeKb: 12,
    },
  ];
}

// ---------------------------------------------------------------------------
// 本模組擁有：appointments
// ---------------------------------------------------------------------------

export function seedAppointments(): Appointment[] {
  return [
    {
      ...base("appt-1", daysAgo(28, 9, 0)),
      startAt: daysAgo(28, 9, 0).toISOString(),
      endAt: daysAgo(28, 11, 0).toISOString(),
      doctor: "陳〇〇 醫師",
      department: "家醫科／健檢",
      location: "聯合醫院健檢中心",
      reason: "年度健康檢查",
      status: "completed",
      followUpNeeded: false,
      notes: "空腹 8 小時後抽血。",
    },
    {
      ...base("appt-2", daysAgo(21, 15, 0)),
      startAt: daysAgo(21, 15, 0).toISOString(),
      endAt: daysAgo(21, 15, 30).toISOString(),
      doctor: "林〇〇 醫師",
      department: "家醫科",
      location: "康寧家醫科診所",
      reason: "腸胃不適",
      status: "completed",
      followUpNeeded: false,
    },
    {
      ...base("appt-3", daysAgo(14, 10, 30)),
      startAt: daysAgo(14, 10, 30).toISOString(),
      endAt: daysAgo(14, 11, 0).toISOString(),
      doctor: "王〇〇 治療師",
      department: "復健科",
      location: "康寧復健科診所",
      reason: "下背痛評估",
      status: "completed",
      followUpNeeded: true,
      notes: "建議安排腰椎 MRI 檢查。",
    },
    {
      ...base("appt-4", daysAgo(9, 9, 20)),
      startAt: daysAgo(9, 9, 20).toISOString(),
      endAt: daysAgo(9, 9, 40).toISOString(),
      doctor: "林〇〇 醫師",
      department: "家醫科",
      location: "康寧家醫科診所",
      reason: "下背痛未改善，轉診骨科",
      status: "completed",
      followUpNeeded: true,
    },
    {
      ...base("appt-5", daysAgo(6, 16, 0)),
      startAt: daysAgo(6, 16, 0).toISOString(),
      endAt: daysAgo(6, 16, 30).toISOString(),
      doctor: "張〇〇 醫師",
      department: "骨科",
      location: "聯合醫院骨科",
      reason: "腰椎 MRI 判讀",
      status: "completed",
      followUpNeeded: true,
      notes: "安排每週 2 次物理治療，4 週後回診。",
    },
    {
      ...base("appt-6", daysAgo(2, 14, 30)),
      startAt: daysAgo(2, 14, 30).toISOString(),
      endAt: daysAgo(2, 15, 0).toISOString(),
      doctor: "張〇〇 醫師",
      department: "骨科",
      location: "聯合醫院骨科",
      reason: "回診追蹤",
      status: "completed",
      followUpNeeded: true,
    },
    {
      ...base("appt-7", daysAgo(0, 9, 0)),
      startAt: daysAgo(-4, 15, 0).toISOString(),
      doctor: "張〇〇 醫師",
      department: "骨科",
      location: "聯合醫院骨科",
      reason: "四週後回診追蹤",
      status: "scheduled",
      reminderMinutesBefore: 120,
      followUpNeeded: false,
      notes: "記得攜帶前次 MRI 報告。",
    },
    {
      ...base("appt-8", daysAgo(0, 9, 5)),
      startAt: daysAgo(-11, 10, 0).toISOString(),
      doctor: "陳〇〇 醫師",
      department: "牙科",
      location: "微笑牙醫診所",
      reason: "半年洗牙",
      status: "scheduled",
      reminderMinutesBefore: 60,
      followUpNeeded: false,
    },
  ];
}

// ---------------------------------------------------------------------------
// 本模組擁有：activities（日活動量彙總）
// ---------------------------------------------------------------------------

export function seedActivities(): Activity[] {
  const rows: Activity[] = [];
  // 近 10 天，來源以 apple_health 為主（每日一筆）
  for (let i = 0; i < 10; i += 1) {
    const day = daysAgo(i, 23, 0);
    rows.push({
      ...base(`activity-ah-${i}`, day),
      type: "daily_summary",
      occurredAt: day.toISOString(),
      date: toDateKey(day),
      steps: 6000 + ((i * 733) % 5000),
      walkTimeMin: 40 + (i % 6) * 5,
      distanceKm: Number((4 + ((i * 37) % 40) / 10).toFixed(1)),
      standTimeMin: 8 + (i % 5),
      activeMin: 25 + (i % 7) * 3,
      sedentaryMin: 600 - (i % 6) * 10,
      source: "apple_health",
      isPrimary: true,
    });
  }
  // 第 3、4 天同時有穿戴裝置的紀錄（示範多來源不應無聲加總，僅第一筆設為 isPrimary）
  rows.push({
    ...base("activity-wear-3", daysAgo(3, 23, 5)),
    type: "daily_summary",
    occurredAt: daysAgo(3, 23, 5).toISOString(),
    date: toDateKey(daysAgo(3)),
    steps: 7120,
    walkTimeMin: 52,
    distanceKm: 5.4,
    standTimeMin: 11,
    activeMin: 38,
    sedentaryMin: 560,
    source: "wearable",
    isPrimary: false,
    notes: "與 Apple 健康同日皆有紀錄，數字略有差異（裝置演算法不同），不加總顯示。",
  });
  rows.push({
    ...base("activity-wear-4", daysAgo(4, 23, 5)),
    type: "daily_summary",
    occurredAt: daysAgo(4, 23, 5).toISOString(),
    date: toDateKey(daysAgo(4)),
    steps: 5480,
    walkTimeMin: 33,
    distanceKm: 4.1,
    standTimeMin: 7,
    activeMin: 22,
    sedentaryMin: 610,
    source: "wearable",
    isPrimary: false,
  });
  // 手動補登一筆（例如忘記戴裝置）
  rows.push({
    ...base("activity-manual-15", daysAgo(15, 21, 0)),
    type: "daily_summary",
    occurredAt: daysAgo(15, 21, 0).toISOString(),
    date: toDateKey(daysAgo(15)),
    steps: 8000,
    walkTimeMin: 60,
    source: "manual",
    isPrimary: true,
    notes: "當天忘記戴手錶，依手機估算步數手動補登。",
  });
  // 匯入一筆舊資料
  rows.push({
    ...base("activity-import-25", daysAgo(25, 20, 0)),
    type: "daily_summary",
    occurredAt: daysAgo(25, 20, 0).toISOString(),
    date: toDateKey(daysAgo(25)),
    steps: 4200,
    walkTimeMin: 28,
    distanceKm: 3.0,
    standTimeMin: 6,
    activeMin: 18,
    sedentaryMin: 640,
    source: "import",
    isPrimary: true,
    notes: "自舊款穿戴裝置 CSV 匯出檔匯入。",
  });
  return rows;
}

// ---------------------------------------------------------------------------
// 唯讀彙整（symptoms／workouts／rehab／meds 模組尚未建置頁面，此處提供 lazy-seed
// 以利「健康時間線」完整展示；欄位對齊各模組已預先定義的 schema）
// ---------------------------------------------------------------------------

export function seedTimelineSymptomLogs(): ReadSymptomLog[] {
  return [
    {
      ...base("symptom-log-1", daysAgo(21, 14, 0)),
      symptomDefId: "symptom-def-gi",
      symptomLabel: "腸胃不適",
      date: toDateKey(daysAgo(21)),
      startAt: daysAgo(21, 14, 0).toISOString(),
      intensity: 6,
      bodyLocation: "腹部",
      durationMin: 180,
      notes: "食用生冷食物後開始不適，就醫後緩解。",
    },
    {
      ...base("symptom-log-2", daysAgo(16, 20, 0)),
      symptomDefId: "symptom-def-back",
      symptomLabel: "下背痛",
      date: toDateKey(daysAgo(16)),
      startAt: daysAgo(16, 20, 0).toISOString(),
      intensity: 5,
      bodyLocation: "腰椎",
      durationMin: 60,
      notes: "久坐後起身時明顯，休息後略緩解。",
    },
    {
      ...base("symptom-log-3", daysAgo(14, 9, 0)),
      symptomDefId: "symptom-def-back",
      symptomLabel: "下背痛",
      date: toDateKey(daysAgo(14)),
      startAt: daysAgo(14, 9, 0).toISOString(),
      intensity: 6,
      bodyLocation: "腰椎",
      durationMin: 90,
    },
    {
      ...base("symptom-log-4", daysAgo(9, 8, 0)),
      symptomDefId: "symptom-def-back",
      symptomLabel: "下背痛",
      date: toDateKey(daysAgo(9)),
      startAt: daysAgo(9, 8, 0).toISOString(),
      intensity: 7,
      bodyLocation: "腰椎、右腿麻",
      durationMin: 120,
      notes: "痛感延伸至右下肢，就醫轉診骨科。",
    },
    {
      ...base("symptom-log-5", daysAgo(5, 21, 30)),
      symptomDefId: "symptom-def-headache",
      symptomLabel: "偏頭痛",
      date: toDateKey(daysAgo(5)),
      startAt: daysAgo(5, 21, 30).toISOString(),
      intensity: 4,
      bodyLocation: "右側太陽穴",
      durationMin: 45,
    },
    {
      ...base("symptom-log-6", daysAgo(1, 7, 30)),
      symptomDefId: "symptom-def-back",
      symptomLabel: "下背痛",
      date: toDateKey(daysAgo(1)),
      startAt: daysAgo(1, 7, 30).toISOString(),
      intensity: 3,
      bodyLocation: "腰椎",
      durationMin: 30,
      notes: "開始物理治療後已明顯改善。",
    },
  ];
}

export function seedTimelineWorkouts(): ReadWorkout[] {
  return [
    { ...base("timeline-workout-1", daysAgo(27, 7, 0)), date: toDateKey(daysAgo(27)), type: "晨跑", durationMinutes: 30, caloriesBurned: 280 },
    { ...base("timeline-workout-2", daysAgo(24, 18, 0)), date: toDateKey(daysAgo(24)), type: "重量訓練", durationMinutes: 50, caloriesBurned: 320 },
    { ...base("timeline-workout-3", daysAgo(19, 7, 30)), date: toDateKey(daysAgo(19)), type: "游泳", durationMinutes: 45, caloriesBurned: 400 },
    { ...base("timeline-workout-4", daysAgo(12, 18, 30)), date: toDateKey(daysAgo(12)), type: "瑜伽", durationMinutes: 40, caloriesBurned: 150 },
    { ...base("timeline-workout-5", daysAgo(8, 7, 0)), date: toDateKey(daysAgo(8)), type: "飛輪", durationMinutes: 35, caloriesBurned: 300, notes: "下背痛尚未緩解，強度降低。" },
    { ...base("timeline-workout-6", daysAgo(0, 7, 0)), date: toDateKey(daysAgo(0)), type: "散步", durationMinutes: 25, caloriesBurned: 90 },
  ];
}

export function seedTimelineRehabSessions(): ReadRehabSession[] {
  return [
    {
      ...base("rehab-session-1", daysAgo(13, 11, 0)),
      date: toDateKey(daysAgo(13)),
      exerciseSummary: "腰椎核心穩定訓練 + 熱敷",
      durationMin: 45,
      painLevelBefore: 6,
      painLevelAfter: 4,
      notes: "治療師調整姿勢矯正動作。",
    },
    {
      ...base("rehab-session-2", daysAgo(10, 11, 0)),
      date: toDateKey(daysAgo(10)),
      exerciseSummary: "徒手治療 + 牽引",
      durationMin: 40,
      painLevelBefore: 5,
      painLevelAfter: 3,
    },
    {
      ...base("rehab-session-3", daysAgo(6, 11, 0)),
      date: toDateKey(daysAgo(6)),
      exerciseSummary: "核心訓練 + 伸展",
      durationMin: 45,
      painLevelBefore: 4,
      painLevelAfter: 2,
    },
    {
      ...base("rehab-session-4", daysAgo(3, 11, 0)),
      date: toDateKey(daysAgo(3)),
      exerciseSummary: "核心訓練 + 姿勢衛教",
      durationMin: 45,
      painLevelBefore: 3,
      painLevelAfter: 2,
      notes: "疼痛持續下降，維持每週兩次頻率。",
    },
    {
      ...base("rehab-session-5", daysAgo(0, 11, 0)),
      date: toDateKey(daysAgo(0)),
      exerciseSummary: "核心訓練 + 深層肌肉放鬆",
      durationMin: 40,
      painLevelBefore: 3,
      painLevelAfter: 1,
    },
  ];
}

export function seedTimelineMedications(): ReadMedication[] {
  return [
    { ...base("timeline-med-1", daysAgo(20, 9, 0)), name: "普拿疼 Panadol", unit: "錠" },
    { ...base("timeline-med-2", daysAgo(20, 9, 0)), name: "肌肉鬆弛劑", unit: "錠" },
    { ...base("timeline-med-3", daysAgo(20, 9, 0)), name: "維他命 D3", unit: "粒" },
  ];
}

export function seedTimelineMedicationLogs(): ReadMedicationLog[] {
  const rows: ReadMedicationLog[] = [];
  for (let i = 0; i < 8; i += 1) {
    const day = daysAgo(i, 8, 30);
    rows.push({
      ...base(`timeline-medlog-am-${i}`, day),
      medicationId: "timeline-med-3",
      scheduledFor: day.toISOString(),
      status: i === 5 ? "missed" : "taken",
      takenAt: i === 5 ? undefined : day.toISOString(),
      quantity: 1,
    });
  }
  rows.push({
    ...base("timeline-medlog-pain-9", daysAgo(9, 10, 0)),
    medicationId: "timeline-med-1",
    scheduledFor: daysAgo(9, 10, 0).toISOString(),
    status: "taken",
    takenAt: daysAgo(9, 10, 5).toISOString(),
    quantity: 1,
    note: "下背痛發作時服用。",
  });
  rows.push({
    ...base("timeline-medlog-relax-6", daysAgo(6, 21, 0)),
    medicationId: "timeline-med-2",
    scheduledFor: daysAgo(6, 21, 0).toISOString(),
    status: "taken",
    takenAt: daysAgo(6, 21, 10).toISOString(),
    quantity: 1,
  });
  return rows;
}
