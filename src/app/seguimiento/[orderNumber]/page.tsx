"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { todayLocalStr } from "@/lib/date";
import {
  Package,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowLeft,
  FileText,
} from "lucide-react";

/* =====================
   TYPES
===================== */

type TrackedOrder = {
  order_number: number;
  customer_name: string;
  description: string | null;
  status: "pendiente" | "enviado";
  created_at: string;
  delivery_date: string | null;
};

/* =====================
   PAGE
===================== */

export default function SeguimientoResultPage() {
  const params = useParams<{ orderNumber: string }>();
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      const n = Number(params.orderNumber);

      if (!params.orderNumber || Number.isNaN(n)) {
        setNotFound(true);
        setOrder(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setNotFound(false);

      const { data, error } = await supabase
        .from("sales")
        .select(
          "order_number,customer_name,description,status,created_at,delivery_date"
        )
        .eq("order_number", n)
        .maybeSingle();

      if (error || !data) {
        setNotFound(true);
        setOrder(null);
      } else {
        setOrder(data as TrackedOrder);
      }
      setLoading(false);
    }
    load();
  }, [params.orderNumber]);

  const today = todayLocalStr();
  const atrasado =
    !!order?.delivery_date &&
    order.status !== "enviado" &&
    order.delivery_date < today;

  return (
    <main
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "rgb(var(--bg))" }}
    >
      <div className="w-full max-w-md space-y-5 animate-fade-in">
        <Link
          href="/seguimiento"
          className="flex items-center gap-1.5 text-sm text-muted hover:text-accent transition w-fit"
        >
          <ArrowLeft size={14} /> Buscar otro pedido
        </Link>

        {loading && (
          <div className="card p-10 text-center text-sm text-muted">
            Buscando pedido…
          </div>
        )}

        {!loading && notFound && (
          <div className="card p-8 text-center space-y-2">
            <Package size={28} className="mx-auto text-muted opacity-40" />
            <p className="font-medium">No encontramos ese pedido</p>
            <p className="text-sm text-muted">
              Verifica el número e intenta de nuevo.
            </p>
          </div>
        )}

        {!loading && order && (
          <div className="card p-6 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted uppercase tracking-wide">
                  Pedido
                </p>
                <p className="text-2xl font-bold text-accent">
                  #{order.order_number}
                </p>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-green-500/15 flex items-center justify-center shrink-0">
                <Package size={20} className="text-accent" />
              </div>
            </div>

            <div>
              <p className="text-xs text-muted">Cliente</p>
              <p className="font-medium">{order.customer_name}</p>
            </div>

            {/* Progreso */}
            <OrderProgress status={order.status} />

            {atrasado && (
              <div className="flex items-start gap-2 rounded-xl px-3 py-2.5 bg-red-500/10 text-red-500 text-sm">
                <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                <span>
                  Este pedido está tardando más de lo esperado. Contáctanos si
                  tienes dudas.
                </span>
              </div>
            )}

            {/* Detalles */}
            <div
              className="space-y-2 border-t pt-4"
              style={{ borderColor: "rgb(var(--border))" }}
            >
              <div className="flex items-center gap-2 text-sm">
                <Calendar size={14} className="text-muted shrink-0" />
                <span className="text-muted">Pedido el</span>
                <span className="ml-auto font-medium">
                  {new Date(order.created_at).toLocaleDateString("es-GT", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>

              {order.delivery_date && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar size={14} className="text-muted shrink-0" />
                  <span className="text-muted">Entrega estimada</span>
                  <span
                    className={`ml-auto font-medium ${
                      atrasado ? "text-red-500" : ""
                    }`}
                  >
                    {new Date(
                      order.delivery_date + "T00:00:00"
                    ).toLocaleDateString("es-GT", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              )}

              {order.description && (
                <div className="flex items-start gap-2 text-sm pt-1">
                  <FileText size={14} className="text-muted shrink-0 mt-0.5" />
                  <span className="text-muted whitespace-pre-wrap">
                    {order.description}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

/* =====================
   BARRA DE PROGRESO
===================== */

function OrderProgress({ status }: { status: "pendiente" | "enviado" }) {
  const steps = [
    { key: "recibido", label: "Recibido", icon: CheckCircle2, done: true },
    { key: "preparando", label: "En preparación", icon: Clock, done: true },
    { key: "enviado", label: "Enviado", icon: Package, done: status === "enviado" },
  ];

  return (
    <div className="flex items-center">
      {steps.map((s, idx) => {
        const isLast = idx === steps.length - 1;
        return (
          <div key={s.key} className={`flex items-center ${isLast ? "" : "flex-1"}`}>
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 ${
                  s.done
                    ? `bg-accent text-black ${isLast ? "animate-pulse-accent" : ""}`
                    : "card-soft text-muted"
                }`}
              >
                <s.icon size={15} />
              </div>
              <span
                className={`text-[10px] font-medium whitespace-nowrap ${
                  s.done ? "text-accent" : "text-muted"
                }`}
              >
                {s.label}
              </span>
            </div>
            {!isLast && (
              <div
                className="flex-1 h-[2px] mx-1 -mt-4 rounded-full overflow-hidden"
                style={{ background: "rgb(var(--border))" }}
              >
                <div
                  className="h-full bg-accent transition-all duration-700"
                  style={{ width: steps[idx + 1].done ? "100%" : "0%" }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
