/** Datos para mostrar una imagen: URL firmada temporal y dimensiones originales. */
export interface AssetInfo {
  url: string;
  width: number;
  height: number;
  mime?: string;
}

export type AssetMap = Record<string, AssetInfo>;
