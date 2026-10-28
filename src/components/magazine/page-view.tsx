import { ImageIcon } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import type { AssetInfo, AssetMap } from "@/lib/document/assets";
import { computeImageLayout, MM_PER_PT, pageSize } from "@/lib/document/geometry";
import type { Background, ImageElement, Orientation, Page, PageElement, ShapeElement, TextElement } from "@/lib/document/schema";
import { applyTextTransform } from "@/lib/document/text-layout";
import { effectiveItalic, fontCssFamily } from "@/lib/fonts";

// Renderizador único de páginas: lo usan el editor, las miniaturas, la vista previa,
// el catálogo de plantillas y el lector público. `scale` = píxeles por milímetro.

export function boxStyle(el: Pick<PageElement, "x" | "y" | "w" | "h">, scale: number): CSSProperties {
  return { position: "absolute", left: el.x * scale, top: el.y * scale, width: el.w * scale, height: el.h * scale };
}

export function textStyleCss(el: TextElement, scale: number): CSSProperties {
  const s = el.style;
  return {
    fontFamily: fontCssFamily(s.fontFamily),
    fontSize: s.fontSize * MM_PER_PT * scale,
    lineHeight: s.lineHeight,
    color: s.color,
    textAlign: s.align,
    fontWeight: s.fontWeight,
    fontStyle: effectiveItalic(s.fontFamily, s.italic) ? "italic" : "normal",
    textDecorationLine: s.underline ? "underline" : "none",
    letterSpacing: s.letterSpacing * MM_PER_PT * scale,
  };
}

const JUSTIFY: Record<TextElement["verticalAlign"], CSSProperties["justifyContent"]> = {
  top: "flex-start",
  middle: "center",
  bottom: "flex-end",
};

function TextView({ el, scale }: { el: TextElement; scale: number }) {
  return (
    <div
      className="page-text"
      data-text-id={el.id}
      style={{
        ...boxStyle(el, scale),
        ...textStyleCss(el, scale),
        padding: el.padding * scale,
        background: el.background ?? undefined,
        display: "flex",
        flexDirection: "column",
        justifyContent: JUSTIFY[el.verticalAlign],
        overflow: "hidden",
      }}
    >
      <div>{applyTextTransform(el.text, el.style.uppercase) || " "}</div>
    </div>
  );
}

function ImageContent({ el, asset, scale }: { el: Pick<ImageElement, "w" | "h" | "fit" | "zoom" | "focusX" | "focusY">; asset: AssetInfo; scale: number }) {
  const layout = computeImageLayout(asset.width, asset.height, el.w, el.h, el.fit, el.zoom, el.focusX, el.focusY);
  return (
    // eslint-disable-next-line @next/next/no-img-element -- URLs firmadas temporales con recorte exacto; next/image no aplica.
    <img
      src={asset.url}
      alt=""
      draggable={false}
      style={{
        position: "absolute",
        left: layout.left * scale,
        top: layout.top * scale,
        width: layout.width * scale,
        height: layout.height * scale,
        maxWidth: "none",
      }}
    />
  );
}

function ImageView({ el, scale, asset, showPlaceholders }: { el: ImageElement; scale: number; asset?: AssetInfo; showPlaceholders: boolean }) {
  if (!asset && !showPlaceholders) return null;
  const radius = Math.min(el.radius, el.w / 2, el.h / 2) * scale;
  return (
    <div style={{ ...boxStyle(el, scale), borderRadius: radius, overflow: "hidden", opacity: el.opacity }}>
      {asset ? (
        <ImageContent el={el} asset={asset} scale={scale} />
      ) : (
        <div className="image-placeholder flex size-full flex-col items-center justify-center gap-1 text-center text-[#6b7393]">
          <ImageIcon style={{ width: Math.max(10, 8 * scale), height: Math.max(10, 8 * scale) }} aria-hidden />
          {scale > 1.2 && el.placeholder && <span style={{ fontSize: Math.max(9, 3.2 * scale) }} className="px-2 font-semibold">{el.placeholder}</span>}
        </div>
      )}
      {el.borderWidth > 0 && (
        <div
          style={{ position: "absolute", inset: 0, borderRadius: radius, border: `${el.borderWidth * scale}px solid ${el.borderColor}` }}
          aria-hidden
        />
      )}
    </div>
  );
}

function ShapeView({ el, scale }: { el: ShapeElement; scale: number }) {
  if (el.shape === "line") {
    const color = el.stroke ?? el.fill ?? "#000000";
    const t = Math.max(el.strokeWidth, 0.1) * scale;
    const horizontal = el.w >= el.h;
    return (
      <div style={{ ...boxStyle(el, scale), opacity: el.opacity }}>
        <div
          style={
            horizontal
              ? { position: "absolute", left: 0, right: 0, top: (el.h * scale - t) / 2, height: t, background: color }
              : { position: "absolute", top: 0, bottom: 0, left: (el.w * scale - t) / 2, width: t, background: color }
          }
        />
      </div>
    );
  }
  const radius = el.shape === "ellipse" ? "50%" : Math.min(el.radius, el.w / 2, el.h / 2) * scale;
  return (
    <div
      style={{
        ...boxStyle(el, scale),
        background: el.fill ?? "transparent",
        border: el.stroke && el.strokeWidth > 0 ? `${el.strokeWidth * scale}px solid ${el.stroke}` : undefined,
        borderRadius: radius,
        opacity: el.opacity,
        boxSizing: "border-box",
      }}
    />
  );
}

export function ElementView({ el, scale, assets, showPlaceholders = true }: { el: PageElement; scale: number; assets: AssetMap; showPlaceholders?: boolean }) {
  switch (el.type) {
    case "text":
      return <TextView el={el} scale={scale} />;
    case "image":
      return <ImageView el={el} scale={scale} asset={el.assetId ? assets[el.assetId] : undefined} showPlaceholders={showPlaceholders} />;
    case "shape":
      return <ShapeView el={el} scale={scale} />;
  }
}

export function BackgroundView({ background, orientation, scale, assets }: { background: Background; orientation: Orientation; scale: number; assets: AssetMap }) {
  const asset = background.assetId ? assets[background.assetId] : undefined;
  if (!asset) return null;
  const { w, h } = pageSize(orientation);
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", opacity: background.opacity }} aria-hidden>
      <ImageContent el={{ w, h, fit: background.fit, zoom: 1, focusX: 50, focusY: 50 }} asset={asset} scale={scale} />
    </div>
  );
}

interface PageViewProps {
  page: Page;
  orientation: Orientation;
  /** Ancho en píxeles con que se dibuja la página. */
  width: number;
  assets: AssetMap;
  showPlaceholders?: boolean;
  className?: string;
  /** Capa superior opcional (selección del editor). */
  children?: ReactNode;
  label?: string;
  /** Elementos que no se dibujan (el editor los muestra con su propio control). */
  hideIds?: ReadonlySet<string>;
}

export function PageView({ page, orientation, width, assets, showPlaceholders = true, className, children, label, hideIds }: PageViewProps) {
  const { w, h } = pageSize(orientation);
  const scale = width / w;
  return (
    <div
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      style={{ position: "relative", width, height: h * scale, background: page.background.color, overflow: "hidden", flexShrink: 0 }}
    >
      <BackgroundView background={page.background} orientation={orientation} scale={scale} assets={assets} />
      {page.elements.map((el) =>
        hideIds?.has(el.id) ? null : <ElementView key={el.id} el={el} scale={scale} assets={assets} showPlaceholders={showPlaceholders} />,
      )}
      {children}
    </div>
  );
}
