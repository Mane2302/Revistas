"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { Input } from "./field";

/** Campo de contraseña con botón para mostrar u ocultar lo que se escribe. */
export function PasswordInput({ className, ...rest }: Omit<ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input type={visible ? "text" : "password"} className={cn("pr-12", className)} autoCapitalize="none" spellCheck={false} {...rest} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-1 my-1 rounded-lg px-2.5 text-tinta-suave hover:bg-tinta/5 hover:text-tinta"
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        aria-pressed={visible}
        title={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
      >
        {visible ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
      </button>
    </div>
  );
}
