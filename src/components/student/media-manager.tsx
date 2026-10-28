"use client";

import { Loader2, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";
import { Alert, EmptyState } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { deleteMediaAction, updateMediaCreditsAction, type MediaItem } from "@/lib/actions/media";
import { uploadImageFile } from "@/lib/storage/upload-client";
import { formatBytes, formatDate } from "@/lib/utils";
import { ImageIcon } from "lucide-react";

export function MediaManager({ initial, maxImageMb, notice, usedBytes, quotaBytes }: { initial: MediaItem[]; maxImageMb: number; notice: string; usedBytes: number; quotaBytes: number }) {
  const [items, setItems] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState<MediaItem | null>(null);
  const [deleting, setDeleting] = useState<MediaItem | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const pct = Math.min(100, (usedBytes / quotaBytes) * 100);

  async function upload(files: File[]) {
    setUploading(true);
    for (const f of files.slice(0, 10)) {
      const res = await uploadImageFile(f, maxImageMb);
      if (res.ok && res.data) {
        const item = res.data;
        setItems((prev) => [item, ...prev.filter((p) => p.id !== item.id)]);
        toast("success", res.message ?? "Imagen subida.");
      } else toast("error", res.message ?? "No pudimos subir la imagen.");
    }
    setUploading(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Button onClick={() => input.current?.click()} loading={uploading} icon={<Upload className="size-5" />}>
          Subir imágenes
        </Button>
        <input ref={input} type="file" hidden multiple accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={(e) => { void upload([...(e.target.files ?? [])]); e.target.value = ""; }} />
        <div className="min-w-48 flex-1 text-sm">
          <p className="font-bold">
            Usas {formatBytes(usedBytes)} de {formatBytes(quotaBytes)}
          </p>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-white ring-1 ring-linea">
            <div className={pct > 85 ? "h-full bg-red-500" : "h-full bg-menta"} style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
      {notice && <Alert kind="warning">{notice}</Alert>}
      {uploading && (
        <p className="flex items-center gap-2 text-sm font-bold text-cielo-oscuro">
          <Loader2 className="size-4 animate-spin" /> Subiendo y verificando…
        </p>
      )}
      {items.length === 0 ? (
        <EmptyState icon={ImageIcon} title="Aún no has subido imágenes">
          Sube fotos propias o imágenes con permiso para reutilizarlas (JPG, PNG o WebP, hasta {maxImageMb} MB).
        </EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((m) => (
            <li key={m.id} className="overflow-hidden rounded-2xl border border-linea bg-white shadow-tarjeta">
              {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada temporal */}
              <img src={m.url} alt={m.description ?? m.originalFilename} className="aspect-[4/3] w-full bg-papel object-cover" loading="lazy" />
              <div className="space-y-1 p-3 text-xs">
                <p className="truncate text-sm font-bold">{m.originalFilename}</p>
                <p className="text-tinta-suave">
                  {formatBytes(m.sizeBytes)} · {m.width}×{m.height} · {formatDate(m.createdAt)}
                </p>
                <p className="truncate text-tinta-suave">Autor: {m.creditAuthor ?? "sin registrar"}</p>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="secondary" onClick={() => setEditing(m)}>
                    Créditos
                  </Button>
                  <Button size="sm" variant="ghost" icon={<Trash2 className="size-4" />} onClick={() => setDeleting(m)} aria-label={`Borrar ${m.originalFilename}`} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={editing !== null} onClose={() => setEditing(null)} title="Créditos de la imagen" description="Registra quién la tomó y de dónde la obtuviste.">
        {editing && (
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const values = { creditAuthor: String(fd.get("a") ?? ""), creditSource: String(fd.get("s") ?? ""), creditLicense: String(fd.get("l") ?? ""), description: String(fd.get("d") ?? "") };
              setBusy(true);
              const res = await updateMediaCreditsAction({ id: editing.id, ...values });
              setBusy(false);
              toast(res.ok ? "success" : "error", res.message ?? "");
              if (res.ok) {
                setItems((prev) => prev.map((p) => (p.id === editing.id ? { ...p, ...values } : p)));
                setEditing(null);
              }
            }}
          >
            <Field label="Autor de la fotografía" htmlFor="c-a">
              <Input id="c-a" name="a" defaultValue={editing.creditAuthor ?? ""} maxLength={120} />
            </Field>
            <Field label="Fuente" htmlFor="c-s" hint="Por ejemplo: foto propia, o la página de donde la obtuviste.">
              <Input id="c-s" name="s" defaultValue={editing.creditSource ?? ""} maxLength={300} />
            </Field>
            <Field label="Licencia" htmlFor="c-l" hint="Por ejemplo: Creative Commons BY.">
              <Input id="c-l" name="l" defaultValue={editing.creditLicense ?? ""} maxLength={120} />
            </Field>
            <Field label="Descripción" htmlFor="c-d">
              <Input id="c-d" name="d" defaultValue={editing.description ?? ""} maxLength={300} />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditing(null)}>
                Cancelar
              </Button>
              <Button type="submit" loading={busy}>
                Guardar
              </Button>
            </div>
          </form>
        )}
      </Dialog>
      <ConfirmDialog
        open={deleting !== null}
        title="¿Borrar esta imagen?"
        message="Solo se borrará si no la usas en ningún trabajo."
        confirmLabel="Borrar"
        danger
        loading={busy}
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          setBusy(true);
          const res = await deleteMediaAction(deleting.id);
          setBusy(false);
          toast(res.ok ? "success" : "error", res.message ?? "");
          if (res.ok) setItems((prev) => prev.filter((p) => p.id !== deleting.id));
          setDeleting(null);
        }}
      />
    </div>
  );
}
