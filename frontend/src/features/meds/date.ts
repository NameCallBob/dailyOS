/**
 * features/meds/date.ts — 純日期工具（本地時區，YYYY-MM-DD 字串）。
 * 與其他模組相同慣例，避免相依額外套件；本檔獨立於本模組內，不引用其他模組。
 */

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** 將 Date 轉為本地 YYYY-MM-DD（非 UTC，避免跨時區日期偏移）。 */
export function formatDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function today(): string {
  return formatDate(new Date());
}

export function addDays(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  date.setDate(date.getDate() + delta);
  return formatDate(date);
}

export function formatDisplayDate(dateStr: string): string {
  const [, m, d] = dateStr.split("-").map(Number);
  return `${m}/${d}`;
}

export function formatDisplayDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getMonth() + 1}/${d.getDate()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** 由今天往回推 n 天（含今天）產生日期字串陣列，由舊到新排序。 */
export function lastNDays(n: number, from: string = today()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    out.push(addDays(from, -i));
  }
  return out;
}
