"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Package, Search, Truck } from "lucide-react";

function extractOrderNumber(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // admite pegar el link completo (…/seguimiento/1024) o solo el número
  const match = trimmed.match(/(\d+)\s*$/);
  return match ? match[1] : null;
}

export default function SeguimientoBuscarPage() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  function buscar() {
    const num = extractOrderNumber(value);
    if (!num) {
      setError("Ingresa un número de pedido válido");
      return;
    }
    router.push(`/seguimiento/${num}`);
  }

  return (
    <main
      className="min-h-screen relative overflow-hidden flex items-center justify-center p-4"
      style={{ background: "rgb(var(--bg))" }}
    >
      {/* Fondo decorativo */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -right-20 w-72 h-72 rounded-full bg-green-500/10 blur-3xl animate-float-slow" />
        <div className="absolute -bottom-28 -left-16 w-80 h-80 rounded-full bg-green-500/10 blur-3xl animate-float-slower" />
      </div>

      <div className="relative w-full max-w-md space-y-6 animate-fade-in">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-green-500/15 flex items-center justify-center mx-auto animate-glow-pulse">
            <Truck size={26} className="text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-tight">
              Seguimiento de pedido
            </h1>
            <p className="text-sm text-muted mt-1">
              Consulta el estado de tu pedido con Terra Suply
            </p>
          </div>
        </div>

        <div className="card p-5 space-y-3">
          <label className="text-sm font-medium">Número de pedido</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              className="input input-bordered w-full"
              placeholder="Ej: 1024"
              value={value}
              inputMode="numeric"
              autoFocus
              onChange={(e) => {
                setValue(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && buscar()}
            />
            <button
              onClick={buscar}
              className="btn btn-primary flex items-center justify-center gap-2 shrink-0"
            >
              <Search size={16} /> Buscar
            </button>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <p className="text-xs text-muted">
            Tip: también podés pegar el link que te enviamos por WhatsApp.
          </p>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-xs text-muted">
          Terra Suply System
          <div className="w-5 h-5 rounded-lg bg-green-500/15 flex items-center justify-center">
            <Package size={11} className="text-accent" />
          </div>
        </div>
      </div>
    </main>
  );
}
