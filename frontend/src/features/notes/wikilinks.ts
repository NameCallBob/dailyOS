/**
 * features/notes/wikilinks.ts — 簡易雙向連結 [[標題]] 解析。
 *
 * 規則：`[[標題]]` 以「標題完全比對（不分大小寫、去除前後空白）」對應到另一篇筆記。
 * 若找不到對應筆記，視為「尚未建立」的連結（在編輯器內仍可點擊以快速建立同名筆記）。
 */

import type { Note } from "./types";

const WIKILINK_RE = /\[\[([^[\]]+)]]/g;

/** 從內容取出所有 [[標題]] 參照（保留原始大小寫、去重） */
export function extractWikilinkTitles(content: string): string[] {
  const titles = new Set<string>();
  let match: RegExpExecArray | null;
  const re = new RegExp(WIKILINK_RE);
  while ((match = re.exec(content)) !== null) {
    const title = match[1]?.trim();
    if (title) titles.add(title);
  }
  return Array.from(titles);
}

export interface WikilinkResolution {
  title: string;
  note: Note | null;
}

/** 將 [[標題]] 參照解析為實際的筆記物件（找不到則 note: null） */
export function resolveWikilinks(content: string, allNotes: Note[]): WikilinkResolution[] {
  const titles = extractWikilinkTitles(content);
  return titles.map((title) => {
    const note = allNotes.find((n) => !n.deleted && n.title.trim().toLowerCase() === title.toLowerCase()) ?? null;
    return { title, note };
  });
}

/** 找出「反向連結」：所有內容中含有 [[本筆記標題]] 的其他筆記 */
export function findBacklinks(targetTitle: string, allNotes: Note[], excludeId?: string): Note[] {
  const needle = targetTitle.trim().toLowerCase();
  if (!needle) return [];
  return allNotes.filter((note) => {
    if (note.deleted || note.id === excludeId) return false;
    return extractWikilinkTitles(note.content).some((title) => title.trim().toLowerCase() === needle);
  });
}
