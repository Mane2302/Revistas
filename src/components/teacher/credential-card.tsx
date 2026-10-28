"use client";

import { Copy, Download, KeyRound, Printer } from "lucide-react";
import type { IssuedCredential } from "@/lib/actions/accounts";
import { toCsv } from "@/lib/csv";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";

/**
 * Muestra las contraseñas temporales UNA SOLA VEZ. No se guardan en ningún lado:
 * al cerrar esta tarjeta ya no se pueden consultar (solo restablecer).
 */
export function CredentialList({ credentials }: { credentials: IssuedCredential[] }) {
  const toast = useToast();
  const text = credentials.map((c) => `${c.displayName}\nUsuario: ${c.username}\nContraseña temporal: ${c.password}`).join("\n\n");

  const download = () => {
    const blob = new Blob([toCsv([["nombre", "usuario", "contrasena_temporal"], ...credentials.map((c) => [c.displayName, c.username, c.password])])], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "credenciales-temporales.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const print = () => {
    const w = window.open("", "_blank", "width=700,height=800");
    if (!w) return;
    const doc = w.document;
    doc.title = "Credenciales";
    const style = doc.createElement("style");
    style.textContent = "body{font-family:sans-serif;padding:24px}.c{border:2px dashed #999;padding:16px;margin:0 0 16px;border-radius:12px;page-break-inside:avoid}.u{font-size:18px}code{font-size:20px;font-weight:bold}";
    doc.head.appendChild(style);
    for (const c of credentials) {
      const card = doc.createElement("div");
      card.className = "c";
      const name = doc.createElement("strong");
      name.textContent = c.displayName;
      const user = doc.createElement("p");
      user.className = "u";
      user.textContent = `Usuario: ${c.username}`;
      const pass = doc.createElement("p");
      pass.append("Contraseña temporal: ");
      const code = doc.createElement("code");
      code.textContent = c.password;
      pass.append(code);
      const note = doc.createElement("p");
      note.textContent = "Al entrar por primera vez tendrás que crear una contraseña nueva.";
      card.append(name, user, pass, note);
      doc.body.append(card);
    }
    w.print();
  };

  return (
    <div className="space-y-3">
      <Alert kind="warning" title="Anota o descarga estas contraseñas ahora">
        Por seguridad no se guardan: después de cerrar este aviso no podrás volver a verlas (solo restablecerlas). Cada alumno deberá cambiarla al entrar.
      </Alert>
      <ul className="max-h-72 space-y-2 overflow-y-auto">
        {credentials.map((c) => (
          <li key={c.username} className="flex items-center gap-3 rounded-xl border border-linea bg-papel px-3 py-2">
            <KeyRound className="size-5 shrink-0 text-cielo" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{c.displayName}</p>
              <p className="text-sm">
                Usuario: <strong>{c.username}</strong> · Contraseña: <code className="rounded bg-white px-1.5 py-0.5 text-base font-bold tracking-wide">{c.password}</code>
              </p>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          icon={<Copy className="size-4" />}
          onClick={() => {
            void navigator.clipboard.writeText(text).then(() => toast("success", "Copiado al portapapeles."));
          }}
        >
          Copiar
        </Button>
        <Button size="sm" variant="secondary" icon={<Printer className="size-4" />} onClick={print}>
          Imprimir tarjetas
        </Button>
        <Button size="sm" variant="secondary" icon={<Download className="size-4" />} onClick={download}>
          Descargar CSV
        </Button>
      </div>
    </div>
  );
}
