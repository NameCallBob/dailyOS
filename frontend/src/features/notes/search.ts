/**
 * features/notes/search.ts — Client 端全文搜尋（不依賴後端 `search` 參數，
 * 直接在已載入的筆記陣列上比對，即時回饋，並附上比對片段供高亮預覽）。
 */

import type { Note } from "./types";
import { excerpt } from "./utils";

export interface NoteSearchHit {
  note: Note;
  score: number;
  matchField: "title" | "content" | "tag" | "folder";
  snippet: string;
}

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

/**
 * 對筆記陣列做全文搜尋：
 * - 標題完全比對 > 標題部分比對 > 標籤比對 > 內容比對 > 資料夾比對
 * - 回傳依分數由高到低排序
 */
export function searchNotes(notes: Note[], rawQuery: string): NoteSearchHit[] {
  const query = normalize(rawQuery);
  if (!query) {
    return notes.map((note) => ({ note, score: 0, matchField: "content", snippet: excerpt(note.content) }));
  }

  const hits: NoteSearchHit[] = [];

  for (const note of notes) {
    const title = normalize(note.title);
    const content = normalize(note.content);
    const folder = normalize(note.folder);
    const tagHit = note.tags.find((t) => normalize(t).includes(query));

    if (title === query) {
      hits.push({ note, score: 100, matchField: "title", snippet: note.title });
      continue;
    }
    if (title.includes(query)) {
      hits.push({ note, score: 80, matchField: "title", snippet: note.title });
      continue;
    }
    if (tagHit) {
      hits.push({ note, score: 60, matchField: "tag", snippet: `標籤：${tagHit}` });
      continue;
    }
    const contentIdx = content.indexOf(query);
    if (contentIdx >= 0) {
      const start = Math.max(0, contentIdx - 20);
      const snippet = `…${note.content.slice(start, contentIdx + query.length + 40)}…`;
      hits.push({ note, score: 40, matchField: "content", snippet });
      continue;
    }
    if (folder.includes(query)) {
      hits.push({ note, score: 20, matchField: "folder", snippet: `資料夾：${note.folder}` });
    }
  }

  return hits.sort((a, b) => b.score - a.score || b.note.updatedAt.localeCompare(a.note.updatedAt));
}
