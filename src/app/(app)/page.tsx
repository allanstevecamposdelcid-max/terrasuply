"use client";

import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import Link from "next/link";
import {
  TrendingUp,
  Clock,
  CheckCircle,
  Wallet,
  Calendar,
  Moon,
  Sun,
  Shirt,
  Printer,
  Wrench,
  AlertTriangle,
  Boxes,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { ProfitValue } from "@/components/ProfitGate";
import { todayLocalStr } from "@/lib/date";

/* ======================
   TYPES
====================== */

type SaleItem = {
  qty: number;
  unit_cost: number;
};

type Sale = {
  id: string;
  customer_name: string;
  total: number;
  dtf_cost: number | null;
  other_supplies_cost: number;
  advance_payment: number;
  delivery_date: string | null;
  status: "pendiente" | "enviado";
  created_at: string;
  sale_items: SaleItem[];
};

type Expense = {
  amount: number;
  expense_date: string;
};

type LowStockProduct = {
  id: string;
  name: string;
  stock: number;
  min_stock: number;
};

/* ======================
   PAGE
====================== */

export default function DashboardPage() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [products, setProducts] = useState<LowStockProduct[]>([]);
  const [loading, setLoading] = useState(true);

  // 🔥 FILTRO FECHA
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  // 🔥 ATAJOS
  const today = todayLocalStr();
  const monthStart = today.slice(0, 7) + "-01";

  /* ======================
     LOAD DATA
  ====================== */

  async function loadData() {
    setLoading(true);

    const [
      { data: salesData },
      { data: expensesData },
      { data: productsData },
    ] = await Promise.all([
      supabase.from("sales").select(`
        id,
        customer_name,
        total,
        dtf_cost,
        other_supplies_cost,
        advance_payment,
        delivery_date,
        status,
        created_at,
        sale_items (
          qty,
          unit_cost
        )
      `),
      supabase.from("expenses").select("amount, expense_date"),
      supabase.from("products").select("id,name,stock,min_stock").eq("active", true),
    ]);

    setSales(salesData || []);
    setExpenses(expensesData || []);
    setProducts(productsData || []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
    setMounted(true);
  }, []);

  /* ======================
     FILTRO VENTAS
  ====================== */

  const salesFiltradas = useMemo(() => {
    return sales.filter((s) => {
      const d = s.created_at.slice(0, 10);

      if (from && d < from) return false;
      if (to && d > to) return false;

      return true;
    });
  }, [sales, from, to]);

  /* ======================
     CALCULOS
  ====================== */

  const totalVentas = useMemo(
    () => salesFiltradas.reduce((sum, s) => sum + (s.advance_payment || 0), 0),
    [salesFiltradas]
  );

  const pendiente = useMemo(
    () =>
      salesFiltradas
        .filter((s) => s.status === "pendiente")
        .reduce((sum, s) => sum + (s.advance_payment || 0), 0),
    [salesFiltradas]
  );

  const enviado = useMemo(
    () =>
      salesFiltradas
        .filter((s) => s.status === "enviado")
        .reduce((sum, s) => sum + (s.advance_payment || 0), 0),
    [salesFiltradas]
  );

  const costoProductos = useMemo(
    () =>
      salesFiltradas
        .flatMap((s) => s.sale_items)
        .reduce((sum, i) => sum + i.unit_cost * i.qty, 0),
    [salesFiltradas]
  );

  const dtfTotal = useMemo(
    () => salesFiltradas.reduce((sum, s) => sum + (s.dtf_cost || 0), 0),
    [salesFiltradas]
  );

  const otherSuppliesTotal = useMemo(
    () => salesFiltradas.reduce((sum, s) => sum + (s.other_supplies_cost || 0), 0),
    [salesFiltradas]
  );

  const gastos = useMemo(
    () =>
      expenses
        .filter((e) => {
          if (from && e.expense_date < from) return false;
          if (to && e.expense_date > to) return false;
          return true;
        })
        .reduce((sum, e) => sum + e.amount, 0),
    [expenses, from, to]
  );

  const ganancia =
    totalVentas - costoProductos - dtfTotal - otherSuppliesTotal - gastos;

  /* ======================
     ALERTAS (no dependen del filtro de fecha)
  ====================== */

  const pedidosAtrasados = useMemo(
    () =>
      sales.filter(
        (s) =>
          !!s.delivery_date && s.status !== "enviado" && s.delivery_date < today
      ),
    [sales, today]
  );

  const dtfSinRegistrar = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 2);
    const cutoffIso = cutoff.toISOString();
    return sales.filter((s) => s.dtf_cost === null && s.created_at <= cutoffIso);
  }, [sales]);

  const stockBajo = useMemo(
    () => products.filter((p) => p.stock <= p.min_stock),
    [products]
  );

  /* ======================
     UI
  ====================== */

  return (
    <main className="max-w-6xl mx-auto px-6 py-10 space-y-10">
      {/* HEADER */}
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-tight">
            Terra Suply System
          </h1>
          <p className="text-sm text-muted">
            Resumen general del negocio
          </p>
        </div>
        {mounted && (
          <button
            type="button"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="btn card-soft shrink-0 mt-1"
            aria-label="Cambiar tema"
          >
            {resolvedTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        )}
      </header>

      {/* ALERTAS */}
      {(pedidosAtrasados.length > 0 ||
        dtfSinRegistrar.length > 0 ||
        stockBajo.length > 0) && (
        <section className="space-y-3">
          {pedidosAtrasados.length > 0 && (
            <div className="card p-4 border-l-4 border-red-500 bg-red-500/5 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-red-600">
                <AlertTriangle size={18} />
                {pedidosAtrasados.length} pedido
                {pedidosAtrasados.length !== 1 ? "s" : ""} atrasado
                {pedidosAtrasados.length !== 1 ? "s" : ""}
              </div>
              <ul className="text-sm space-y-1">
                {pedidosAtrasados.slice(0, 5).map((s) => (
                  <li key={s.id} className="flex justify-between gap-3 text-muted">
                    <span className="truncate">{s.customer_name}</span>
                    <span className="shrink-0">
                      Entrega:{" "}
                      {new Date(s.delivery_date + "T00:00:00").toLocaleDateString(
                        "es-GT",
                        { day: "2-digit", month: "short" }
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              {pedidosAtrasados.length > 5 && (
                <p className="text-xs text-muted">
                  +{pedidosAtrasados.length - 5} más…
                </p>
              )}
              <Link href="/ventas" className="text-xs font-medium text-accent">
                Ver en Ventas →
              </Link>
            </div>
          )}

          {dtfSinRegistrar.length > 0 && (
            <div className="card p-4 border-l-4 border-yellow-500 bg-yellow-500/5 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-yellow-600">
                <Printer size={18} />
                {dtfSinRegistrar.length} pedido
                {dtfSinRegistrar.length !== 1 ? "s" : ""} sin costo DTF registrado
                (+2 días)
              </div>
              <ul className="text-sm space-y-1">
                {dtfSinRegistrar.slice(0, 5).map((s) => (
                  <li key={s.id} className="text-muted truncate">
                    {s.customer_name}
                  </li>
                ))}
              </ul>
              {dtfSinRegistrar.length > 5 && (
                <p className="text-xs text-muted">
                  +{dtfSinRegistrar.length - 5} más…
                </p>
              )}
              <Link href="/ventas" className="text-xs font-medium text-accent">
                Ver en Ventas →
              </Link>
            </div>
          )}

          {stockBajo.length > 0 && (
            <div className="card p-4 border-l-4 border-orange-500 bg-orange-500/5 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-orange-600">
                <Boxes size={18} />
                {stockBajo.length} producto{stockBajo.length !== 1 ? "s" : ""} con
                stock bajo
              </div>
              <ul className="text-sm space-y-1">
                {stockBajo.slice(0, 5).map((p) => (
                  <li key={p.id} className="flex justify-between gap-3 text-muted">
                    <span className="truncate">{p.name}</span>
                    <span className="shrink-0">
                      {p.stock} / mín. {p.min_stock}
                    </span>
                  </li>
                ))}
              </ul>
              {stockBajo.length > 5 && (
                <p className="text-xs text-muted">+{stockBajo.length - 5} más…</p>
              )}
              <Link href="/inventario" className="text-xs font-medium text-accent">
                Ver en Inventario →
              </Link>
            </div>
          )}
        </section>
      )}

      {/* FILTROS */}
      <section className="card p-4 flex flex-wrap gap-4 items-end">
        <div className="flex items-center gap-2 text-sm text-muted">
          <Calendar size={16} />
          <span>Filtrar por fecha</span>
        </div>

        <div>
          <label className="text-xs text-muted">Desde</label>
          <input
            type="date"
            className="input input-bordered"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>

        <div>
          <label className="text-xs text-muted">Hasta</label>
          <input
            type="date"
            className="input input-bordered"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>

        <button
          onClick={() => {
            setFrom(today);
            setTo(today);
          }}
          className="btn btn-ghost btn-sm"
        >
          Hoy
        </button>

        <button
          onClick={() => {
            setFrom(monthStart);
            setTo(today);
          }}
          className="btn btn-ghost btn-sm"
        >
          Este mes
        </button>

        <button
          onClick={() => {
            setFrom("");
            setTo("");
          }}
          className="btn btn-ghost btn-sm text-error"
        >
          Limpiar
        </button>
      </section>

      {/* MÉTRICAS */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Metric
          label="Ventas"
          value={<ProfitValue value={`Q${totalVentas.toFixed(2)}`} className="text-3xl font-semibold text-green-400" />}
          icon={<TrendingUp size={18} />}
          raw
        />
        <Metric
          label="Pendiente"
          value={<ProfitValue value={`Q${pendiente.toFixed(2)}`} className="text-3xl font-semibold" />}
          icon={<Clock size={18} />}
          raw
        />
        <Metric
          label="Finalizado"
          value={<ProfitValue value={`Q${enviado.toFixed(2)}`} className="text-3xl font-semibold" />}
          icon={<CheckCircle size={18} />}
          raw
        />
        <Metric
          label="Ganancia"
          value={<ProfitValue value={`Q${ganancia.toFixed(2)}`} className="text-3xl font-semibold" />}
          icon={<Wallet size={18} />}
          raw
        />
      </section>

      {/* COSTOS (información confidencial) */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted">Costos del periodo filtrado</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Metric
            label="Gasto en playeras"
            value={<ProfitValue value={`Q${costoProductos.toFixed(2)}`} className="text-3xl font-semibold" />}
            icon={<Shirt size={18} />}
            raw
          />
          <Metric
            label="Costo DTF"
            value={<ProfitValue value={`Q${dtfTotal.toFixed(2)}`} className="text-3xl font-semibold" />}
            icon={<Printer size={18} />}
            raw
          />
          <Metric
            label="Otros insumos"
            value={<ProfitValue value={`Q${otherSuppliesTotal.toFixed(2)}`} className="text-3xl font-semibold" />}
            icon={<Wrench size={18} />}
            raw
          />
        </div>
      </section>


      {loading && <p className="text-sm opacity-60">Cargando datos…</p>}
    </main>
  );
}

/* ======================
   COMPONENTES
====================== */

function Metric({
  icon,
  label,
  value,
  raw,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  raw?: boolean;
}) {
  return (
    <div className="card p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2 text-muted text-sm">
        {icon}
        <span>{label}</span>
      </div>
      {raw ? value : <div className="text-3xl font-semibold">{value}</div>}
    </div>
  );
}

