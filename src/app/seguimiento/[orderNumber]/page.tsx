"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { todayLocalStr } from "@/lib/date";
import {
  Package,
  PackageSearch,
  Truck,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  FileText,
  User,
  Search,
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
   HELPERS
===================== */

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-GT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function daysAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return "hoy";
  if (days === 1) return "hace 1 día";
  return `hace ${days} días`;
}

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
  const enviado = order?.status === "enviado";
  const atrasado =
    !!order?.delivery_date && !enviado && order.delivery_date < today;

  const headline = enviado
    ? "¡Tu pedido fue enviado!"
    : "Tu pedido está en preparación";
  const subtext = enviado
    ? "Va en camino hacia ti."
    : "Estamos armando tu pedido con cuidado.";

  return (
    <main
      className="min-h-screen relative overflow-hidden flex items-center justify-center p-4 sm:p-6"
      style={{ background: "rgb(var(--bg))" }}
    >
      {/* Fondo decorativo */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-20 w-72 h-72 rounded-full bg-green-500/10 blur-3xl animate-float-slow" />
        <div className="absolute -bottom-28 -right-16 w-80 h-80 rounded-full bg-green-500/10 blur-3xl animate-float-slower" />
      </div>

      <div className="relative w-full max-w-md space-y-4">
        {/* Marca + volver */}
        <div className="flex items-center justify-between animate-fade-in">
          <Link
            href="/seguimiento"
            className="flex items-center gap-1.5 text-sm text-muted hover:text-accent transition"
          >
            <ArrowLeft size={14} /> Buscar otro pedido
          </Link>
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted">
            Terra Suply System
            <div className="w-5 h-5 rounded-lg bg-green-500/15 flex items-center justify-center">
              <Package size={11} className="text-accent" />
            </div>
          </div>
        </div>

        {loading && (
          <div className="card p-10 text-center space-y-3 animate-fade-in">
            <PackageSearch size={26} className="mx-auto text-accent animate-bounce-soft" />
            <p className="text-sm text-muted">Buscando tu pedido…</p>
          </div>
        )}

        {!loading && notFound && (
          <div className="card p-8 text-center space-y-3 animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto">
              <Search size={22} className="text-red-500" />
            </div>
            <div>
              <p className="font-semibold">No encontramos ese pedido</p>
              <p className="text-sm text-muted mt-0.5">
                Revisa el número e intenta de nuevo.
              </p>
            </div>
            <Link
              href="/seguimiento"
              className="btn btn-primary inline-flex items-center gap-2 mt-2"
            >
              Buscar otro pedido
            </Link>
          </div>
        )}

        {!loading && order && (
          <div className="space-y-4">
            {/* Hero de estado */}
            <div
              className="card p-7 text-center space-y-4 animate-fade-in"
              style={{ animationDelay: "60ms" }}
            >
              <div className="flex justify-center">
                <div
                  className={`w-20 h-20 rounded-full flex items-center justify-center ${
                    enviado ? "bg-accent/15" : "bg-yellow-500/15"
                  } animate-glow-pulse`}
                >
                  {enviado ? (
                    <Truck size={30} className="text-accent" />
                  ) : (
                    <Package size={30} className="text-yellow-600" />
                  )}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">
                  Pedido #{order.order_number}
                </p>
                <h1 className="text-xl font-bold mt-1.5 leading-tight">
                  {headline}
                </h1>
                <p className="text-sm text-muted mt-1">{subtext}</p>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-xs text-muted pt-1">
                <User size={12} />
                {order.customer_name}
              </div>
            </div>

            {/* Progreso */}
            <div
              className="card p-6 animate-fade-in"
              style={{ animationDelay: "140ms" }}
            >
              <OrderProgress status={order.status} />
            </div>

            {/* Atrasado */}
            {atrasado && (
              <div
                className="card p-4 border-l-4 border-red-500 bg-red-500/5 flex items-start gap-2.5 animate-fade-in"
                style={{ animationDelay: "180ms" }}
              >
                <AlertTriangle size={16} className="shrink-0 mt-0.5 text-red-500" />
                <p className="text-sm text-red-500">
                  Este pedido está tardando más de lo esperado. Contáctanos si
                  tienes dudas.
                </p>
              </div>
            )}

            {/* Detalles */}
            <div
              className="card p-6 space-y-4 animate-fade-in"
              style={{ animationDelay: "220ms" }}
            >
              <DetailRow
                icon={<Calendar size={14} />}
                label="Pedido el"
                value={formatDate(order.created_at)}
                hint={daysAgo(order.created_at)}
              />

              {order.delivery_date && (
                <DetailRow
                  icon={<Calendar size={14} />}
                  label="Entrega estimada"
                  value={formatDate(order.delivery_date + "T00:00:00")}
                  warn={atrasado}
                />
              )}

              {order.description && (
                <DetailRow
                  icon={<FileText size={14} />}
                  label="Detalle del pedido"
                  value={order.description}
                  multiline
                />
              )}
            </div>

            <p
              className="text-center text-[11px] text-muted animate-fade-in"
              style={{ animationDelay: "260ms" }}
            >
              Terra Suply System &middot; seguimiento de pedidos
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

/* =====================
   FILA DE DETALLE
===================== */

function DetailRow({
  icon,
  label,
  value,
  hint,
  warn,
  multiline,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  warn?: boolean;
  multiline?: boolean;
}) {
  return (
    <div className={multiline ? "space-y-1.5" : "flex items-center gap-2 text-sm"}>
      <div className={`flex items-center gap-2 text-muted ${multiline ? "" : "shrink-0"}`}>
        {icon}
        <span>{label}</span>
      </div>
      {multiline ? (
        <p className="text-sm whitespace-pre-wrap leading-relaxed pl-[22px]">{value}</p>
      ) : (
        <span className={`ml-auto font-medium text-right ${warn ? "text-red-500" : ""}`}>
          {value}
          {hint && <span className="block text-[11px] font-normal text-muted">{hint}</span>}
        </span>
      )}
    </div>
  );
}

/* =====================
   BARRA DE PROGRESO
===================== */

function OrderProgress({ status }: { status: "pendiente" | "enviado" }) {
  const steps = [
    { key: "recibido", label: "Confirmado", icon: CheckCircle2, done: true },
    { key: "preparando", label: "Preparando", icon: Package, done: true },
    { key: "enviado", label: "Enviado", icon: Truck, done: status === "enviado" },
  ];

  return (
    <div className="flex items-start">
      {steps.map((s, idx) => {
        const isLast = idx === steps.length - 1;
        const isFrontier = s.done && (isLast || !steps[idx + 1].done);
        return (
          <div key={s.key} className={`flex items-start ${isLast ? "" : "flex-1"}`}>
            <div className="flex flex-col items-center gap-2 shrink-0" style={{ width: 68 }}>
              <div
                className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-500 ${
                  s.done ? "bg-accent text-black" : "card-soft text-muted"
                } ${isFrontier ? "animate-glow-pulse" : ""}`}
              >
                <s.icon size={16} className={s.done ? "animate-scale-in" : ""} />
              </div>
              <span
                className={`text-[11px] font-medium text-center leading-tight whitespace-nowrap ${
                  s.done ? "text-accent" : "text-muted"
                }`}
              >
                {s.label}
              </span>
            </div>
            {!isLast && (
              <div
                className="flex-1 h-[3px] mt-[18px] rounded-full overflow-hidden"
                style={{ background: "rgb(var(--border))" }}
              >
                <div
                  className="h-full bg-accent transition-all duration-700 ease-out"
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
