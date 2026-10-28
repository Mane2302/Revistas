"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Solo el identificador: el detalle queda en los registros del servidor.
    console.error("Error de la aplicación", error.digest ?? "");
  }, [error]);

  return (
    <main id="contenido" className="grid min-h-dvh place-items-center px-4">
      <div className="max-w-md text-center">
        <TriangleAlert className="mx-auto mb-4 size-14 text-sol" aria-hidden />
        <h1 className="font-display text-2xl font-bold">Algo salió mal</h1>
        <p className="mt-2 text-tinta-suave">No pudimos cargar esta página. Revisa tu conexión e inténtalo de nuevo. Si el problema continúa, avisa a tu profesor.</p>
        {error.digest && <p className="mt-2 text-xs text-tinta-suave">Código: {error.digest}</p>}
        <Button className="mt-6" onClick={reset} icon={<RotateCcw className="size-4" />}>
          Reintentar
        </Button>
      </div>
    </main>
  );
}
