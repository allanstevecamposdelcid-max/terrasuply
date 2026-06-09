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
  FileText,
  Package,
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
  shipping_cost: number;
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
  const [openDescriptions, setOpenDescriptions] = useState<string[]>([]);

  const [payingId, setPayingId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState<number | "">("");

  /* =====================
     BÚSQUEDA Y FILTROS
  ===================== */

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todas" | "pendiente" | "enviado">("todas");

  const hayFiltrosActivos = Boolean(search || statusFilter !== "todas");

  function limpiarFiltros() {
    setSearch("");
    setStatusFilter("todas");
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
        shipping_cost,
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
     PROFIT
  ===================== */

  function getProfit(sale: Sale) {
    const costos = sale.sale_items.reduce(
      (sum, i) => sum + i.unit_cost * i.qty,
      0
    );
    return sale.total - costos - sale.dtf_cost - (sale.shipping_cost || 0);
  }

  function getSaldoPendiente(sale: Sale) {
    const saldoBruto = Math.max(sale.total - (sale.advance_payment || 0), 0);
    return Math.max(saldoBruto - (sale.shipping_cost || 0), 0);
  }

  /* =====================
     LISTA FILTRADA
  ===================== */

  const salesFiltradas = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sales.filter((s) => {
      if (q && !s.customer_name.toLowerCase().includes(q)) return false;
      if (statusFilter !== "todas" && s.status !== statusFilter) return false;
      return true;
    });
  }, [sales, search, statusFilter]);

  /* =====================
     CHANGE STATUS
  ===================== */

  async function toggleStatus(sale: Sale) {
    const next = sale.status === "pendiente" ? "enviado" : "pendiente";
    const { error } = await supabase
      .from("sales")
      .update({ status: next })
      .eq("id", sale.id);
    if (error) alert(error.message);
    else loadSales();
  }

  /* =====================
     REGISTRAR PAGO
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
    if (!amount || amount <= 0) { alert("Ingresa un monto válido"); return; }
    const nuevoAnticipo = Math.min(sale.total, (sale.advance_payment || 0) + amount);
    const { error } = await supabase
      .from("sales")
      .update({ advance_payment: nuevoAnticipo })
      .eq("id", sale.id);
    if (error) { alert(error.message); return; }
    cancelPayment();
    loadSales();
  }

  /* =====================
     DELETE SALE
  ===================== */

  async function deleteSale(id: string) {
    const ok = confirm("¿Eliminar esta venta? Esta acción no se puede deshacer.");
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

  function toggleDescription(id: string) {
    setOpenDescriptions((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  /* =====================
     UI
  ===================== */

  return (
    <div className="space-y-5 pb-24">

      {/* TÍTULO */}
      <div>
        <h1 className="text-2xl font-semibold">Ventas</h1>
        <p className="text-sm text-muted">Libro diario de pedidos</p>
      </div>

      {/* FILTROS */}
      <div className="card p-3 space-y-3">

        {/* Fila 1: búsqueda + chips de estado */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Búsqueda */}
          <div className="flex items-center gap-2 flex-1 min-w-[180px] card-soft px-3 py-2">
            <Search size={14} className="text-muted shrink-0" />
            <input
              style={{ background: "transparent", border: "none", outline: "none", padding: 0 }}
              className="w-full text-sm"
              placeholder="Buscar cliente…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-muted hover:text-red-500 shrink-0">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Chips de estado */}
          <div className="card-soft flex p-1 gap-0.5">
            {(["todas", "pendiente", "enviado"] as const).map((v) => {
              const label = v === "todas" ? "Todas" : v === "pendiente" ? "Pendiente" : "Finalizado";
              return (
                <button
                  key={v}
                  onClick={() => setStatusFilter(v)}
                  className={`px-3 py-1.5 rounded-[10px] text-xs font-medium transition-all ${
                    statusFilter === v ? "bg-accent text-black" : "text-muted"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {hayFiltrosActivos && (
            <button
              onClick={limpiarFiltros}
              className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1 transition"
            >
              <X size={13} /> Limpiar
            </button>
          )}
        </div>

      </div>

      {/* LISTA */}
      {loading ? (
        <div className="card p-8 text-center text-sm text-muted">Cargando…</div>
      ) : sales.length === 0 ? (
        <div className="card p-8 text-center text-sm text-muted">No hay ventas registradas</div>
      ) : salesFiltradas.length === 0 ? (
        <div className="card p-8 text-center text-sm text-muted">
          Ninguna venta coincide con los filtros
        </div>
      ) : (
        <div className="space-y-3">
          {salesFiltradas.map((s) => {
            const open = openRows.includes(s.id);
            const descOpen = openDescriptions.includes(s.id);
            const profit = getProfit(s);
            const saldo = getSaldoPendiente(s);
            const tieneAnticipo = (s.advance_payment || 0) > 0;
            const finalizado = s.status === "enviado";
            const headerBg = finalizado ? "rgb(var(--accent) / 0.07)" : "rgb(var(--muted) / 0.06)";

            return (
              <div
                key={s.id}
                className="card overflow-hidden p-0"
              >
                {/* ── ENCABEZADO con tinte de color ── */}
                <div
                  className="px-4 pt-4 pb-3"
                  style={{ background: headerBg }}
                >
                  <div className="flex items-start gap-3">
                    {/* Nombre + info de contacto */}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-lg leading-tight truncate">
                        {s.customer_name}
                      </p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                        <span className="flex items-center gap-1 text-xs text-muted">
                          <Calendar size={11} />
                          {new Date(s.created_at).toLocaleDateString("es-GT", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                        {s.customer_phone && (
                          <span className="flex items-center gap-1 text-xs text-muted">
                            <Phone size={11} />
                            {s.customer_phone}
                          </span>
                        )}
                        {s.customer_address && (
                          <span className="flex items-center gap-1 text-xs text-muted">
                            <MapPin size={11} />
                            <span className="truncate max-w-[140px]">{s.customer_address}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Estado + eliminar */}
                    <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                      <button
                        onClick={() => toggleStatus(s)}
                        title="Cambiar estado"
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                          finalizado
                            ? "bg-green-500/20 text-green-600"
                            : "bg-yellow-500/20 text-yellow-600"
                        }`}
                      >
                        <RefreshCw size={10} />
                        {finalizado ? "Finalizado" : "Pendiente"}
                      </button>
                      <button
                        onClick={() => deleteSale(s.id)}
                        title="Eliminar venta"
                        className="p-1.5 text-muted hover:text-red-500 transition rounded-lg"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* ── CUERPO ── */}
                <div className="px-4 pb-4 pt-3 space-y-3">

                  {/* Métricas financieras */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <MiniStat
                      label="Total"
                      value={`Q${s.total.toFixed(2)}`}
                      bold
                    />
                    {tieneAnticipo && (
                      <>
                        <MiniStat
                          label="Anticipo"
                          value={`Q${s.advance_payment.toFixed(2)}`}
                          icon={<Wallet size={10} />}
                        />
                        <MiniStat
                          label="Saldo pendiente"
                          value={`Q${saldo.toFixed(2)}`}
                          colorClass="text-accent"
                        />
                      </>
                    )}
                    <MiniStat
                      label="Ganancia"
                      value={`Q${profit.toFixed(2)}`}
                      colorClass={profit >= 0 ? "text-green-600" : "text-red-600"}
                      gated
                    />
                  </div>

                  {/* Cobrar saldo pendiente */}
                  {saldo > 0 && (
                    <div className="card-soft px-3 py-2.5 rounded-xl">
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
                            <Check size={14} /> Confirmar
                          </button>
                          <button
                            onClick={cancelPayment}
                            className="btn btn-ghost btn-sm p-1.5 text-muted"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startPayment(s)}
                          className="flex items-center gap-2 text-sm font-medium text-accent"
                        >
                          <Banknote size={15} />
                          Cobrar saldo (Q{saldo.toFixed(2)})
                        </button>
                      )}
                    </div>
                  )}

                  {/* Footer: toggles */}
                  <div
                    className="flex items-center gap-4 pt-1 border-t"
                    style={{ borderColor: "rgb(var(--border))" }}
                  >
                    {s.description && (
                      <button
                        onClick={() => toggleDescription(s.id)}
                        className={`flex items-center gap-1.5 text-xs transition ${
                          descOpen ? "text-accent" : "text-muted hover:text-accent"
                        }`}
                      >
                        <FileText size={13} />
                        {descOpen ? "Ocultar desc." : "Descripción"}
                      </button>
                    )}
                    <button
                      onClick={() => toggleOpen(s.id)}
                      className={`flex items-center gap-1.5 text-xs transition ${
                        open ? "text-accent" : "text-muted hover:text-accent"
                      }`}
                    >
                      <Package size={13} />
                      {s.sale_items.length}{" "}
                      {s.sale_items.length === 1 ? "producto" : "productos"}
                      {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </button>
                  </div>

                  {/* Descripción expandida */}
                  {descOpen && s.description && (
                    <p className="text-sm text-muted whitespace-pre-wrap leading-relaxed">
                      {s.description}
                    </p>
                  )}

                  {/* Detalle de productos */}
                  {open && (
                    <div
                      className="space-y-3 pt-2 border-t"
                      style={{ borderColor: "rgb(var(--border))" }}
                    >
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
                            <p className="text-sm font-medium truncate">{i.product_name}</p>
                            <p className="text-xs text-muted">
                              {i.qty} × Q{i.unit_price.toFixed(2)} ={" "}
                              <span className="font-semibold">Q{(i.qty * i.unit_price).toFixed(2)}</span>
                            </p>
                          </div>
                        </div>
                      ))}
                      {s.dtf_cost > 0 && (
                        <p className="text-xs text-muted">
                          Costo DTF: − Q{s.dtf_cost.toFixed(2)}
                        </p>
                      )}
                    </div>
                  )}

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
   MINI STAT — tile financiero dentro de una venta
===================== */

function MiniStat({
  label,
  value,
  icon,
  colorClass,
  gated,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  bold?: boolean;
  colorClass?: string;
  gated?: boolean;
}) {
  const cls = `font-bold text-sm ${colorClass ?? ""}`;
  return (
    <div className="card-soft rounded-xl px-3 py-2">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted mb-0.5">
        {icon}
        {label}
      </div>
      {gated ? (
        <ProfitValue value={value} className={cls} />
      ) : (
        <p className={cls}>{value}</p>
      )}
    </div>
  );
}
