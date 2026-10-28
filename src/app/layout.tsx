import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/toast";
import "./fonts.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Revista Escolar Digital", template: "%s · Revista Escolar Digital" },
  description: "Imagina, escribe, diseña y publica. Revistas escolares hechas por estudiantes de secundaria.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#fbf8f3",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-MX">
      <body className="min-h-dvh">
        <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:font-bold">
          Saltar al contenido
        </a>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
