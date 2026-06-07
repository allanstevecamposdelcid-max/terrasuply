"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Lock } from "lucide-react";

/* =====================
   BLOQUEO DE INFORMACIÓN CONFIDENCIAL (GANANCIAS)
   El sistema lo usan empleados y dueños: las cifras de
   ganancia se ocultan detrás de una contraseña compartida
   (definida en NEXT_PUBLIC_GANANCIAS_PIN) y permanecen
   visibles solo durante la sesión del navegador.
===================== */

const STORAGE_KEY = "ts_ganancias_unlocked";
const PIN = process.env.NEXT_PUBLIC_GANANCIAS_PIN ?? "";

type ProfitCtx = {
  unlocked: boolean;
  request: () => void;
};

const Ctx = createContext<ProfitCtx>({ unlocked: false, request: () => {} });

export function ProfitProvider({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(STORAGE_KEY) === "1") setUnlocked(true);
  }, []);

  function request() {
    if (unlocked) return;
    setValue("");
    setError(false);
    setOpen(true);
  }

  function confirm() {
    if (PIN && value === PIN) {
      sessionStorage.setItem(STORAGE_KEY, "1");
      setUnlocked(true);
      setOpen(false);
    } else {
      setError(true);
    }
  }

  return (
    <Ctx.Provider value={{ unlocked, request }}>
      {children}

      {open && (
        <div
          className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="card p-5 w-full max-w-xs space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 font-medium">
              <Lock size={16} />
              Información confidencial
            </div>
            <p className="text-xs text-muted">
              Ingresa la contraseña para ver las ganancias.
            </p>

            <input
              type="password"
              autoFocus
              className="input input-bordered w-full"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError(false);
              }}
              onKeyDown={(e) => e.key === "Enter" && confirm()}
              placeholder="Contraseña"
            />

            {error && (
              <p className="text-xs text-red-500">Contraseña incorrecta</p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-ghost flex-1"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary flex-1"
                onClick={confirm}
              >
                Ver
              </button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}

export function useProfitGate() {
  return useContext(Ctx);
}

/**
 * Muestra `value` solo si el usuario ya desbloqueó las ganancias;
 * de lo contrario muestra un botón con candado que abre el prompt de contraseña.
 */
export function ProfitValue({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const { unlocked, request } = useProfitGate();

  if (unlocked) return <span className={className}>{value}</span>;

  return (
    <button
      type="button"
      onClick={request}
      className={`inline-flex items-center gap-1.5 text-muted hover:text-accent transition ${className ?? ""}`}
      title="Información confidencial — clic para desbloquear"
    >
      <Lock size={14} />
      <span className="text-sm">Ver</span>
    </button>
  );
}
