/**
 * 極簡 className 合併工具（不引入額外套件）。
 * 接受字串 / 條件物件 / 假值，過濾後以空白合併。
 */
type ClassValue = string | number | null | undefined | false | Record<string, boolean | undefined>;

export function cn(...values: ClassValue[]): string {
  const out: string[] = [];
  for (const value of values) {
    if (!value) continue;
    if (typeof value === "string" || typeof value === "number") {
      out.push(String(value));
    } else {
      for (const [key, enabled] of Object.entries(value)) {
        if (enabled) out.push(key);
      }
    }
  }
  return out.join(" ");
}
