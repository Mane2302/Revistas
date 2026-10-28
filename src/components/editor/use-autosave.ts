"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SaveFunction } from "@/lib/document/save";
import type { EditorDocument } from "@/lib/document/schema";

export type SaveStatus = "saved" | "pending" | "saving" | "error" | "offline" | "conflict" | "locked";

export interface LocalBackup {
  baseVersion: number;
  savedAt: string;
  title: string;
  doc: EditorDocument;
}

const DEBOUNCE_MS = 1200;
const BACKUP_DEBOUNCE_MS = 400;

export function readBackup(key: string): LocalBackup | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const value = JSON.parse(raw) as LocalBackup;
    if (typeof value.baseVersion !== "number" || !Array.isArray(value.doc?.pages)) return null;
    return value;
  } catch {
    return null;
  }
}

export function clearBackup(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // almacenamiento no disponible (modo privado): no hay copia que borrar
  }
}

interface Options {
  storageKey: string;
  id: string;
  title: string;
  doc: EditorDocument;
  revision: number;
  initialVersion: number;
  save: SaveFunction;
  enabled: boolean;
}

/**
 * Guardado automático con debounce, copia local mientras hay cambios sin confirmar,
 * reintentos al recuperar la conexión y detección de conflictos de versión.
 * «Guardado» solo se muestra cuando el servidor confirma.
 */
export function useAutosave({ storageKey, id, title, doc, revision, initialVersion, save, enabled }: Options) {
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [savedRevision, setSavedRevision] = useState(revision);
  const [message, setMessage] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [conflictVersion, setConflictVersion] = useState<number | null>(null);

  const version = useRef(initialVersion);
  const savedRevisionRef = useRef(revision);
  const latest = useRef({ title, doc, revision });
  const inFlight = useRef(false);
  const statusRef = useRef<SaveStatus>("saved");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const backupTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    latest.current = { title, doc, revision };
  });

  const setS = useCallback((s: SaveStatus) => {
    statusRef.current = s;
    setStatus(s);
  }, []);

  // Referencia estable para que los reintentos programados llamen siempre a la versión actual.
  const flushRef = useRef<(force?: boolean) => Promise<boolean>>(async () => false);

  const flush = useCallback(
    async (force = false): Promise<boolean> => {
      if (!enabled) return false;
      clearTimeout(timer.current);
      if (inFlight.current) {
        timer.current = setTimeout(() => void flushRef.current(force), 500);
        return false;
      }
      const snap = latest.current;
      if (!force && snap.revision === savedRevisionRef.current) {
        setS("saved");
        return true;
      }
      if (statusRef.current === "locked" || (statusRef.current === "conflict" && !force)) return false;
      if (!navigator.onLine) {
        setS("offline");
        return false;
      }
      inFlight.current = true;
      setS("saving");
      try {
        const res = await save({ id, title: snap.title, doc: snap.doc, expectedVersion: version.current });
        if (res.ok) {
          version.current = res.version;
          savedRevisionRef.current = snap.revision;
          setSavedRevision(snap.revision);
          setLastSavedAt(new Date());
          setMessage("");
          setConflictVersion(null);
          if (latest.current.revision === snap.revision) {
            clearBackup(storageKey);
            setS("saved");
          } else {
            setS("pending");
            timer.current = setTimeout(() => void flushRef.current(), DEBOUNCE_MS);
          }
          return true;
        }
        setMessage(res.message);
        if (res.conflict) {
          setConflictVersion(res.currentVersion);
          setS("conflict");
          return false;
        }
        setS(res.locked ? "locked" : "error");
        if (!res.locked) timer.current = setTimeout(() => void flushRef.current(), 15_000);
        return false;
      } catch {
        setS(navigator.onLine ? "error" : "offline");
        setMessage("No pudimos guardar el trabajo. Tus cambios locales se conservarán mientras sea posible.");
        timer.current = setTimeout(() => void flushRef.current(), 10_000);
        return false;
      } finally {
        inFlight.current = false;
      }
    },
    [enabled, id, save, setS, storageKey],
  );

  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  // Cada cambio: copia local inmediata (con debounce corto) y guardado en el servidor tras una pausa.
  useEffect(() => {
    if (!enabled || revision === savedRevisionRef.current) return;
    clearTimeout(backupTimer.current);
    backupTimer.current = setTimeout(() => {
      try {
        const backup: LocalBackup = { baseVersion: version.current, savedAt: new Date().toISOString(), title: latest.current.title, doc: latest.current.doc };
        window.localStorage.setItem(storageKey, JSON.stringify(backup));
      } catch {
        // sin espacio o modo privado: se sigue intentando guardar en el servidor
      }
    }, BACKUP_DEBOUNCE_MS);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), DEBOUNCE_MS);
  }, [revision, enabled, flush, storageKey]);

  useEffect(() => {
    const onOnline = () => void flush();
    const onOffline = () => setS("offline");
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (latest.current.revision !== savedRevisionRef.current) e.preventDefault();
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("beforeunload", onBeforeUnload);
      clearTimeout(timer.current);
      clearTimeout(backupTimer.current);
    };
  }, [flush, setS]);

  /** Conservar la versión de esta pestaña sobrescribiendo la del servidor (decisión explícita). */
  const keepMine = useCallback(() => {
    if (conflictVersion === null) return;
    version.current = conflictVersion;
    setS("pending");
    void flush(true);
  }, [conflictVersion, flush, setS]);

  const displayStatus: SaveStatus = status === "saved" && revision !== savedRevision ? "pending" : status;
  return { status: displayStatus, message, lastSavedAt, flush, conflictVersion, keepMine };
}
