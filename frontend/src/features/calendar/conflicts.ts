/**
 * features/calendar/conflicts.ts — 偵測同時段重疊的事件（衝突提示用）。
 */
import type { Occurrence } from "./recurrence";

export interface ConflictInfo {
  occurrenceId: string;
  conflictsWith: Occurrence[];
}

function overlaps(a: Occurrence, b: Occurrence): boolean {
  return a.start < b.end && b.start < a.end;
}

/** 回傳「occurrenceId -> 與其重疊的其他 occurrence」對照表 */
export function findConflicts(occurrences: Occurrence[]): Map<string, Occurrence[]> {
  const map = new Map<string, Occurrence[]>();
  for (let i = 0; i < occurrences.length; i += 1) {
    for (let j = i + 1; j < occurrences.length; j += 1) {
      const a = occurrences[i];
      const b = occurrences[j];
      if (!a || !b) continue;
      if (a.event.id === b.event.id) continue; // 同一系列自身不算衝突
      if (overlaps(a, b)) {
        map.set(a.occurrenceId, [...(map.get(a.occurrenceId) ?? []), b]);
        map.set(b.occurrenceId, [...(map.get(b.occurrenceId) ?? []), a]);
      }
    }
  }
  return map;
}

/** 檢查「若某事件改成 candidateStart~candidateEnd」是否會與既有 occurrences 衝突 */
export function findConflictsForCandidate(
  candidateStart: Date,
  candidateEnd: Date,
  excludeEventId: string,
  occurrences: Occurrence[],
): Occurrence[] {
  return occurrences.filter(
    (occ) => occ.event.id !== excludeEventId && candidateStart < occ.end && occ.start < candidateEnd,
  );
}
