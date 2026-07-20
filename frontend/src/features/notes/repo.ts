/**
 * features/notes/repo.ts — 筆記模組的資料存取入口，統一透過 createResource。
 */

import { createResource } from "@/lib/resource";

import { seedNoteVersions, seedNotes } from "./seed";
import { noteSchema, noteVersionSchema, type Note, type NoteVersion } from "./types";

export const notesRepo = createResource<Note>({
  name: "notes",
  schema: noteSchema,
  seed: seedNotes,
  actions: {
    /** 收藏切換：POST /api/v1/notes/{id}/toggle_favorite/ */
    toggleFavorite: {
      httpAction: "toggle_favorite",
      trial: (record) => ({ pinned: !record.pinned }),
    },
    /** 從垃圾桶復原：POST /api/v1/notes/{id}/restore/ */
    restore: {
      httpAction: "restore",
      trial: () => ({ deleted: false }),
    },
  },
});

export const noteVersionsRepo = createResource<NoteVersion>({
  name: "note_versions",
  schema: noteVersionSchema,
  seed: seedNoteVersions,
});
