"use client";

import { createContext, useContext, type Dispatch } from "react";
import type { MediaItem } from "@/lib/actions/media";
import type { AssetMap } from "@/lib/document/assets";
import type { Page } from "@/lib/document/schema";
import type { EditorAction, EditorState } from "./state";

export interface TemplateOption {
  id: string;
  name: string;
  description: string;
  category: string;
  kind: "cover" | "article" | "extra";
  page: Page;
}

export type LeftTab = "plantillas" | "texto" | "imagenes" | "formas" | "fondo" | "tipografias" | "colores";

export interface EditorContextValue {
  state: EditorState;
  dispatch: Dispatch<EditorAction>;
  mode: "work" | "magazine";
  workKind: "article" | "cover" | null;
  readOnly: boolean;
  assets: AssetMap;
  registerAssets: (map: AssetMap) => void;
  templates: TemplateOption[];
  media: MediaItem[] | null;
  loadMedia: () => Promise<void>;
  removeMedia: (id: string) => void;
  uploadFiles: (files: File[], opts?: { insert?: boolean }) => Promise<MediaItem[]>;
  uploading: boolean;
  maxImageMb: number;
  imageNotice: string;
  chooseTemplate: (t: TemplateOption) => void;
  insertMedia: (item: MediaItem) => void;
  setLeftTab: (tab: LeftTab) => void;
  cropId: string | null;
  setCropId: (id: string | null) => void;
  requestDeletePage: (index: number) => void;
  openInsertWork?: () => void;
}

export const EditorContext = createContext<EditorContextValue | null>(null);

export function useEditor(): EditorContextValue {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor debe usarse dentro del editor");
  return ctx;
}
