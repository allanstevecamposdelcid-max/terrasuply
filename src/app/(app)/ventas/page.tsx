"use client";
import { useEffect, useMemo, useState } from "react";

import {
  ChevronDown,
  ChevronRight,
  Trash2,
  RefreshCw,
  Phone,
  MapPin,
  Calendar,
  Wallet,
  ImageOff,
  Banknote,
  Check,
  X,
  Search,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { ProfitValue } from "@/components/ProfitGate";

/* =====================
   TYPES
===================== */
type SaleItem = {
  id: string;
  qty: number;
  unit_price: number;
  unit_cost: number;
  product_name: string;
  image_url: string | null;
};

type Sale = {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  customer_address: string | null;
  description: string | null;
  total: number;
  dtf_cost: number;
  advance_payment: number;
  status: "pendiente" | "enviado";
  created_at: string;
  sale_items: SaleItem[];
};

/* =====================
   PAGE
===================== */

export default function VentasPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [openRows, setOpenRows] = useState<string[]>([]);

  const [payingId, setPayingId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState<number | "">("");

  /* =====================
     BÚSQUEDA Y FILTROS
  ===================== */

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todas" | "pendiente" | "enviado">("todas");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const hayFiltrosActivos = Boolean(search || statusFilter !== "todas" || from || to);

  function limpiarFiltros() {
    setSearch("");
    setStatusFilter("todas");
    setFrom("");
    setTo("");
  }

  /* =====================
     LOAD SALES
  ===================== */

  async function loadSales() {
    setLoading(true);

    const { data, error } = await supabase
      .from("sales")
      .select(`
        id,
        customer_name,
        customer_phone,
        customer_address,
        description,
        total,
        dtf_cost,
        advance_payment,
        status,
        created_at,
        sale_items (
          id,
          qty,
          unit_price,
          unit_cost,
          product_name,
          image_url
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
    } else {
      setSales((data ?? []) as Sale[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadSales();
  }, []);

  /* =====================
     PROFIT (REAL & SAFE)
  ===================== */

  function getProfit(sale: Sale) {
    const costos = sale.sale_items.reduce(
      (sum, i) => sum + i.unit_cost * i.qty,
      0
    );

    return sale.total - costos - sale.dtf_cost;
  }

  function getSaldoPendiente(sale: Sale) {
    return Math.max(sale.total - (sale.advance_payment || 0), 0);
  }

  /* =====================
     LISTA FILTRADA
  ===================== */

  const salesFiltradas = useMemo(() => {
    const q = search.trim().toLowerCase();

    return sales.filter((s) => {
      if (q && !s.customer_name.toLowerCase().includes(q)) return false;
      if (statusFilter !== "todas" && s.status !== statusFilter) return false;

      const d = s.created_at.slice(0, 10);
      if (from && d < from) return false;
      if (to && d > to) return false;

      return true;
    });
  }, [sales, search, statusFilter, from, to]);

  /* =====================
     RECORDATORIO: SALDOS PENDIENTES
  ===================== */

  const saldosPendientes = useMemo(() => {
    return sales
      .map((s) => ({ sale: s, saldo: getSaldoPendiente(s) }))
      .filter((x) => x.saldo > 0)
      .sort((a, b) => b.saldo - a.saldo);
  }, [sales]);

  const [pendientesOpen, setPendientesOpen] = useState(true);

  /* =====================
     CHANGE STATUS
  ===================== */

  async function toggleStatus(sale: Sale) {
    const next =
      sale.status === "pendiente" ? "enviado" : "pendiente";

    const { error } = await supabase
      .from("sales")
      .update({ status: next })
      .eq("id", sale.id);

    if (error) {
      alert(error.message);
    } else {
      loadSales();
    }
  }

  /* =====================
     REGISTRAR PAGO (anticipo -> completar saldo)
  ===================== */

  function startPayment(sale: Sale) {
    setPayingId(sale.id);
    setPayAmount(getSaldoPendiente(sale));
  }

  function cancelPayment() {
    setPayingId(null);
    setPayAmount("");
  }

  async function confirmPayment(sale: Sale) {
    const amount = Number(payAmount);
    if (!amount || amount <= 0) {
      alert("Ingresa un monto válido");
      return;
    }

    const nuevoAnticipo = Math.min(sale.total, (sale.advance_payment || 0) + amount);

    const { error } = await supabase
      .from("sales")
      .update({ advance_payment: nuevoAnticipo })
      .eq("id", sale.id);

    if (error) {
      alert(error.message);
      return;
    }

    cancelPayment();
    loadSales();
  }

  /* =====================
     DELETE SALE
  ===================== */

  async function deleteSale(id: string) {
    const ok = confirm(
      "¿Eliminar esta venta? Esta acción no se puede deshacer."
    );
    if (!ok) return;

    await supabase.from("sale_items").delete().eq("sale_id", id);
    await supabase.from("sales").delete().eq("id", id);

    loadSales();
  }

  function toggleOpen(id: string) {
    setOpenRows((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  /* =====================
     UI
  ===================== */

  return (
    <div className="space-y-6 pb-24">
      <h1 className="text-2xl font-semibold">Ventas (Libro Diario)</h1>

      {/* RECORDATORIO: SALDOS PENDIENTES */}
      {saldosPendientes.length > 0 && (
        <div className="card p-4 space-y-3">
          <button
            onClick={() => setPendientesOpen((v) => !v)}
            className="flex items-center gap-2 text-sm font-medium w-full"
          >
            {pendientesOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <AlertCircle size={16} className="text-yellow-500" />
            Clientes con saldo pendiente
            <span className="text-xs font-normal text-muted">
              ({saldosPendientes.length})
            </span>
          </button>

          {pendientesOpen && (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {saldosPendientes.map(({ sale, saldo }) => (
                <div
                  key={sale.id}
                  className="card-soft px-3 py-2 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {sale.customer_name}
                    </div>
                    {sale.customer_phone && (
                      <div className="flex items-center gap-1 text-xs text-muted">
                        <Phone size={11} />
                        <span className="truncate">{sale.customer_phone}</span>
                      </div>
                    )}
                  </div>

                  <div className="text-sm font-semibold text-yellow-600 shrink-0">
                    Q{saldo.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* BÚSQUEDA Y FILTROS */}
      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px] space-y-1">
          <label className="text-xs text-muted">Buscar cliente</label>
          <div className="flex items-center gap-2">
            <Search size={16} className="text-muted shrink-0" />
            <input
              className="input input-bordered w-full"
              placeholder="Nombre del cliente"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted">Estado</label>
          <select
            className="input input-bordered"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          >
            <option value="todas">Todas</option>
            <option value="pendiente">Pendiente</option>
            <option value="enviado">Enviado</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted">Desde</label>
          <input
            type="date"
            className="input input-bordered"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted">Hasta</label>
          <input
            type="date"
            className="input input-bordered"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>

        {hayFiltrosActivos && (
          <button onClick={limpiarFiltros} className="btn btn-ghost btn-sm text-red-500">
            Limpiar
          </button>
        )}
      </div>

      {loading ? (
        <div className="card p-6 text-sm text-muted">Cargando…</div>
      ) : sales.length === 0 ? (
        <div className="card p-6 text-center text-sm text-muted">
          No hay ventas registradas
        </div>
      ) : salesFiltradas.length === 0 ? (
        <div className="card p-6 text-center text-sm text-muted">
          Ninguna venta coincide con los filtros aplicados
        </div>
      ) : (
        <div className="space-y-3">
          {salesFiltradas.map((s) => {
            const open = openRows.includes(s.id);
            const profit = getProfit(s);
            const saldo = getSaldoPendiente(s);
            const tieneAnticipo = (s.advance_payment || 0) > 0;

            return (
              <div key={s.id} className="card p-3 sm:p-4 space-y-2.5">
                {/* HEADER: fecha / cliente / estado */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-xs text-muted">
                      <Calendar size={12} />
                      {new Date(s.created_at).toLocaleDateString("es-GT", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>

                    <div className="font-semibold text-base truncate leading-tight">
                      {s.customer_name}
                    </div>

                    <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                      {s.customer_phone && (
                        <div className="flex items-center gap-1 text-xs text-muted">
                          <Phone size={12} />
                          <span className="truncate">{s.customer_phone}</span>
                        </div>
                      )}
                      {s.customer_address && (
                        <div className="flex items-center gap-1 text-xs text-muted">
                          <MapPin size={12} />
                          <span className="truncate">{s.customer_address}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => toggleStatus(s)}
                    title="Cambiar estado"
                    className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium ${
                      s.status === "enviado"
                        ? "bg-green-500/15 text-green-600"
                        : "bg-yellow-500/15 text-yellow-600"
                    }`}
                  >
                    {s.status === "enviado" ? "Enviado" : "Pendiente"}
                  </button>
                </div>

                {/* RESUMEN FINANCIERO */}
                <div
                  className={`grid gap-1.5 text-sm ${
                    tieneAnticipo ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2"
                  }`}
                >
                  <Stat label="Total" value={`Q${s.total.toFixed(2)}`} />

                  {tieneAnticipo && (
                    <>
                      <Stat
                        label="Anticipo"
                        value={`Q${s.advance_payment.toFixed(2)}`}
                        icon={<Wallet size={12} />}
                      />
                      <Stat
                        label="Saldo pendiente"
                        value={`Q${saldo.toFixed(2)}`}
                        accent
                      />
                    </>
                  )}

                  <Stat
                    label="Ganancia"
                    value={`Q${profit.toFixed(2)}`}
                    positive={profit >= 0}
                    negative={profit < 0}
                    gated
                  />
                </div>

                {/* REGISTRAR PAGO (saldo pendiente -> completar) */}
                {saldo > 0 && (
                  <div className="card-soft px-3 py-2">
                    {payingId === s.id ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-muted shrink-0">Monto recibido</span>
                        <input
                          type="number"
                          min={0}
                          max={saldo}
                          step="0.01"
                          autoFocus
                          className="input input-bordered w-28 py-1.5 text-sm"
                          value={payAmount}
                          onChange={(e) =>
                            setPayAmount(e.target.value === "" ? "" : Number(e.target.value))
                          }
                        />
                        <button
                          onClick={() => confirmPayment(s)}
                          className="btn btn-primary btn-sm flex items-center gap-1 px-3 py-1.5"
                        >
                          <Check size={14} />
                          Confirmar
                        </button>
                        <button
                          onClick={cancelPayment}
                          className="btn btn-ghost btn-sm flex items-center gap-1 px-2 py-1.5 text-muted"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startPayment(s)}
                        className="flex items-center gap-1.5 text-sm font-medium text-accent"
                      >
                        <Banknote size={15} />
                        Registrar pago de saldo
                      </button>
                    )}
                  </div>
                )}

                {/* TOGGLE DETALLE */}
                <button
                  onClick={() => toggleOpen(s.id)}
                  className="flex items-center gap-1.5 text-sm text-muted hover:text-accent transition"
                >
                  {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  {open ? "Ocultar detalle" : "Ver detalle"}
                  <span className="opacity-60">
                    · {s.sale_items.length}{" "}
                    {s.sale_items.length === 1 ? "producto" : "productos"}
                  </span>
                </button>

                {/* DETALLE: descripción + productos + imágenes */}
                {open && (
                  <div
                    className="space-y-2.5 pt-2.5 border-t"
                    style={{ borderColor: "rgb(var(--border))" }}
                  >
                    {s.description && (
                      <p className="text-sm text-muted whitespace-pre-wrap">
                        {s.description}
                      </p>
                    )}

                    {s.sale_items.map((i) => (
                      <div key={i.id} className="flex items-center gap-3">
                        {i.image_url ? (
                          <a
                            href={i.image_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0"
                            title="Ver diseño en tamaño completo"
                          >
                            <img
                              src={i.image_url}
                              alt={i.product_name}
                              className="w-24 h-24 rounded-xl object-cover border hover:opacity-90 transition"
                              style={{ borderColor: "rgb(var(--border))" }}
                            />
                          </a>
                        ) : (
                          <div
                            className="w-24 h-24 rounded-xl border border-dashed flex items-center justify-center text-muted shrink-0"
                            style={{ borderColor: "rgb(var(--border))" }}
                          >
                            <ImageOff size={20} />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">
                            {i.product_name}
                          </div>
                          <div className="text-xs text-muted">
                            {i.qty} × Q{i.unit_price.toFixed(2)} = Q
                            {(i.qty * i.unit_price).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))}

                    {s.dtf_cost > 0 && (
                      <div className="text-xs text-muted">
                        Costo DTF: − Q{s.dtf_cost.toFixed(2)}
                      </div>
                    )}
                  </div>
                )}

                {/* ACCIONES */}
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => toggleStatus(s)}
                    className="btn btn-ghost btn-sm flex items-center gap-1.5 text-blue-500 hover:text-blue-600"
                  >
                    <RefreshCw size={14} />
                    Cambiar estado
                  </button>

                  <button
                    onClick={() => deleteSale(s.id)}
                    className="btn btn-ghost btn-sm flex items-center gap-1.5 text-red-500 hover:text-red-600"
                  >
                    <Trash2 size={14} />
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* =====================
   STAT (resumen financiero)
===================== */

function Stat({
  label,
  value,
  icon,
  accent,
  positive,
  negative,
  gated,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  accent?: boolean;
  positive?: boolean;
  negative?: boolean;
  gated?: boolean;
}) {
  const cls = `font-semibold ${
    accent
      ? "text-accent"
      : positive
      ? "text-green-600"
      : negative
      ? "text-red-600"
      : ""
  }`;

  return (
    <div className="card-soft px-3 py-2">
      <div className="flex items-center gap-1.5 text-[11px] text-muted">
        {icon}
        {label}
      </div>
      {gated ? <ProfitValue value={value} className={cls} /> : <div className={cls}>{value}</div>}
    </div>
  );
}
