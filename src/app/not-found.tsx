import { SearchX } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="contenido" className="grid min-h-dvh place-items-center px-4">
      <div className="max-w-md text-center">
        <SearchX className="mx-auto mb-4 size-14 text-coral-oscuro" aria-hidden />
        <h1 className="font-display text-2xl font-bold">No encontramos esta página</h1>
        <p className="mt-2 text-tinta-suave">Puede que no exista, que ya no esté publicada o que no tengas permiso para verla.</p>
        <ButtonLink href="/" className="mt-6">
          Volver al inicio
        </ButtonLink>
      </div>
    </main>
  );
}
