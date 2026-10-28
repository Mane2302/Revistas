import type { EditorDocument } from "./schema";

/** Datos que el editor envía al guardar. */
export interface SavePayload {
  id: string;
  title: string;
  doc: EditorDocument;
  expectedVersion: number;
}

export type SaveResult =
  | { ok: true; version: number }
  | { ok: false; conflict: true; currentVersion: number; message: string }
  | { ok: false; conflict: false; message: string; locked?: boolean };

export type SaveFunction = (payload: SavePayload) => Promise<SaveResult>;
