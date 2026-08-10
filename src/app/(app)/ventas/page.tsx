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
  Pencil,
  AlertTriangle,
  Wrench,
  DollarSign,
  Link2,
  Mail,
  UserPlus,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { ProfitValue } from "@/components/ProfitGate";
import { todayLocalStr, addDaysLocalStr } from "@/lib/date";

/* =====================
   TYPES
===================== */
type SaleItem = {
  id: string;
  product_id: string | null;
  qty: number;
  unit_price: number;
  unit_cost: number;
  product_name: string;
  image_url: string | null;
};

type Sale = {
  id: string;
  order_number: number;
  customer_name: string;
  customer_phone: string | null;
  customer_address: string | null;
  customer_email: string | null;
  description: string | null;
  total: number;
  dtf_cost: number | null;
  shipping_cost: number;
  other_supplies_cost: number;
  advance_payment: number;
  delivery_date: string | null;
  status: "pendiente" | "enviado";
  created_at: string;
  sale_items: SaleItem[];
};

type SearchProduct = {
  id: string;
  name: string;
  sku: string | null;
  stock: number;
  price: number;
  cost: number;
  active: boolean;
};

function isOverdue(sale: Sale) {
  return (
    !!sale.delivery_date &&
    sale.status !== "enviado" &&
    sale.delivery_date < todayLocalStr()
  );
}

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

  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [creatingManual, setCreatingManual] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function copyTrackingLink(sale: Sale) {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || window.location.origin;
    const url = `${siteUrl}/seguimiento/${sale.order_number}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(sale.id);
      setTimeout(() => setCopiedId((prev) => (prev === sale.id ? null : prev)), 1800);
    } catch {
      prompt("Copia el link de seguimiento:", url);
    }
  }

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
        order_number,
        customer_name,
        customer_phone,
        customer_address,
        customer_email,
        description,
        total,
        dtf_cost,
        shipping_cost,
        other_supplies_cost,
        advance_payment,
        delivery_date,
        status,
        created_at,
        sale_items (
          id,
          product_id,
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
    return (
      (sale.advance_payment || 0) -
      costos -
      (sale.dtf_cost || 0) -
      (sale.other_supplies_cost || 0)
    );
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
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Ventas</h1>
          <p className="text-sm text-muted">Libro diario de pedidos</p>
        </div>
        <button
          onClick={() => setCreatingManual(true)}
          className="btn btn-ghost btn-sm flex items-center gap-1.5 shrink-0 card-soft"
          title="Crear un pedido solo para seguimiento, sin productos todavía"
        >
          <UserPlus size={15} />
          <span className="hidden sm:inline">Pedido manual</span>
        </button>
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
            const atrasado = isOverdue(s);
            const headerBg = atrasado
              ? "rgb(239 68 68 / 0.10)"
              : finalizado
              ? "rgb(var(--accent) / 0.07)"
              : "rgb(var(--muted) / 0.06)";

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
                        {s.customer_name}{" "}
                        <span className="text-xs font-medium text-muted">
                          #{s.order_number}
                        </span>
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
                        {s.customer_email && (
                          <span className="flex items-center gap-1 text-xs text-muted">
                            <Mail size={11} />
                            <span className="truncate max-w-[160px]">{s.customer_email}</span>
                          </span>
                        )}
                        {s.delivery_date && (
                          <span
                            className={`flex items-center gap-1 text-xs ${
                              atrasado ? "text-red-500 font-semibold" : "text-muted"
                            }`}
                          >
                            <Calendar size={11} />
                            Entrega:{" "}
                            {new Date(s.delivery_date + "T00:00:00").toLocaleDateString("es-GT", {
                              day: "2-digit",
                              month: "short",
                            })}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Estado + editar + eliminar */}
                    <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                      {atrasado && (
                        <span
                          title="Pedido atrasado"
                          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-600"
                        >
                          <AlertTriangle size={10} />
                          Atrasado
                        </span>
                      )}
                      <button
                        onClick={() => toggleStatus(s)}
                        title="Cambiar estado"
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-white shadow-sm transition ${
                          finalizado ? "bg-green-500" : "bg-red-500"
                        }`}
                      >
                        <RefreshCw size={10} />
                        {finalizado ? "Finalizado" : "Pendiente"}
                      </button>
                      <button
                        onClick={() => copyTrackingLink(s)}
                        title="Copiar enlace de seguimiento"
                        className="p-1.5 text-muted hover:text-accent transition rounded-lg"
                      >
                        {copiedId === s.id ? (
                          <Check size={15} className="text-green-500" />
                        ) : (
                          <Link2 size={15} />
                        )}
                      </button>
                      <button
                        onClick={() => setEditingSale(s)}
                        title="Editar venta"
                        className="p-1.5 text-muted hover:text-blue-500 transition rounded-lg"
                      >
                        <Pencil size={15} />
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
                      <div className="text-xs space-y-0.5">
                        {s.dtf_cost === null ? (
                          <p className="flex items-center gap-1 text-yellow-600 font-medium">
                            <AlertTriangle size={11} /> DTF: sin registrar
                          </p>
                        ) : (
                          s.dtf_cost > 0 && (
                            <p className="text-muted">Costo DTF: − Q{s.dtf_cost.toFixed(2)}</p>
                          )
                        )}
                        {s.other_supplies_cost > 0 && (
                          <p className="text-muted">
                            Otros insumos: − Q{s.other_supplies_cost.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            );
          })}
        </div>
      )}

      {editingSale && (
        <EditSaleModal
          sale={editingSale}
          onClose={() => setEditingSale(null)}
          onSaved={() => {
            setEditingSale(null);
            loadSales();
          }}
        />
      )}

      {creatingManual && (
        <ManualOrderModal
          onClose={() => setCreatingManual(false)}
          onCreated={() => {
            setCreatingManual(false);
            loadSales();
          }}
        />
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

/* =====================
   EDITAR VENTA — modal
   Permite cambiar cantidades/precios de los productos,
   agregar o quitar productos, y editar DTF, otros insumos
   y fecha de entrega de una venta ya guardada.
===================== */

type EditCartItem = {
  key: string;
  product_id: string | null;
  product_name: string;
  unit_price: number;
  unit_cost: number;
  qty: number;
  image_url: string | null;
  originalQty: number;
};

function EditSaleModal({
  sale,
  onClose,
  onSaved,
}: {
  sale: Sale;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [products, setProducts] = useState<SearchProduct[]>([]);
  const [search, setSearch] = useState("");
  const [openProducts, setOpenProducts] = useState(false);

  const [items, setItems] = useState<EditCartItem[]>(() =>
    sale.sale_items.map((i, idx) => ({
      key: i.id || `orig-${idx}`,
      product_id: i.product_id,
      product_name: i.product_name,
      unit_price: i.unit_price,
      unit_cost: i.unit_cost,
      qty: i.qty,
      image_url: i.image_url,
      originalQty: i.qty,
    }))
  );

  const [dtfCost, setDtfCost] = useState<number | "">(sale.dtf_cost ?? "");
  const [otherSuppliesCost, setOtherSuppliesCost] = useState<number>(
    sale.other_supplies_cost || 0
  );
  const [deliveryDate, setDeliveryDate] = useState<string>(sale.delivery_date ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadProducts() {
      // Trae también los inactivos (soft-deleted): se necesitan para
      // calcular el stock disponible de productos ya vendidos en esta
      // venta, aunque el buscador de abajo solo ofrezca los activos.
      const { data } = await supabase
        .from("products")
        .select("id,name,sku,stock,price,cost,active")
        .order("name");
      setProducts((data as SearchProduct[]) || []);
    }
    loadProducts();
  }, []);

  const activeProducts = products.filter((p) => p.active);

  const filteredProducts = search.trim()
    ? activeProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(search.trim().toLowerCase()) ||
          (p.sku ?? "").toLowerCase().includes(search.trim().toLowerCase())
      )
    : activeProducts;

  function availableStock(it: EditCartItem) {
    if (!it.product_id) return null;
    const p = products.find((p) => p.id === it.product_id);
    if (!p) return null;
    return p.stock + it.originalQty;
  }

  function addProduct(p: SearchProduct) {
    setItems((prev) => {
      const found = prev.find((i) => i.product_id === p.id);
      if (found) {
        return prev.map((i) =>
          i.product_id === p.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [
        ...prev,
        {
          key: `new-${p.id}-${Date.now()}`,
          product_id: p.id,
          product_name: p.name,
          unit_price: p.price,
          unit_cost: p.cost,
          qty: 1,
          image_url: null,
          originalQty: 0,
        },
      ];
    });
    setSearch("");
    setOpenProducts(false);
  }

  function updateQty(key: string, qty: number) {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, qty } : i)));
  }

  function updateUnitPrice(key: string, price: number) {
    if (!Number.isFinite(price) || price < 0) return;
    setItems((prev) =>
      prev.map((i) => (i.key === key ? { ...i, unit_price: price } : i))
    );
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }

  const total = items.reduce((sum, i) => sum + i.qty * i.unit_price, 0);

  async function save() {
    if (items.length === 0) {
      alert("La venta debe tener al menos un producto");
      return;
    }

    const invalida = items.find(
      (i) => !Number.isFinite(i.qty) || i.qty < 1
    );
    if (invalida) {
      alert(`"${invalida.product_name}" necesita una cantidad de al menos 1`);
      return;
    }

    for (const it of items) {
      const available = availableStock(it);
      if (available !== null && it.qty > available) {
        alert(`"${it.product_name}" excede el stock disponible (${available})`);
        return;
      }
    }

    setSaving(true);

    const payloadItems = items.map((i) => ({
      product_id: i.product_id,
      product_name: i.product_name,
      qty: i.qty,
      unit_price: i.unit_price,
      unit_cost: i.unit_cost,
      image_url: i.image_url,
    }));

    const { error: itemsError } = await supabase.rpc("update_sale_items", {
      p_sale_id: sale.id,
      p_items: payloadItems,
    });

    if (itemsError) {
      setSaving(false);
      alert(itemsError.message);
      return;
    }

    const { error: salesError } = await supabase
      .from("sales")
      .update({
        dtf_cost: dtfCost === "" ? null : dtfCost,
        other_supplies_cost: otherSuppliesCost || 0,
        delivery_date: deliveryDate || null,
      })
      .eq("id", sale.id);

    setSaving(false);

    if (salesError) {
      alert(salesError.message);
      return;
    }

    onSaved();
  }

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="card w-full sm:max-w-lg overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-[rgb(var(--card))] z-10"
          style={{ borderColor: "rgb(var(--border))" }}
        >
          <div className="min-w-0">
            <p className="font-semibold text-base truncate">Editar venta</p>
            <p className="text-xs text-muted truncate">{sale.customer_name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-muted hover:text-red-500 transition rounded-lg shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {/* Buscar / agregar producto */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Agregar producto</label>
            <div className="flex gap-2 items-center">
              <Package size={16} />
              <input
                className="input input-bordered w-full"
                placeholder="Buscar producto"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setOpenProducts(true);
                }}
                onFocus={() => setOpenProducts(true)}
              />
            </div>
            {openProducts && (
              <div className="border rounded-xl bg-base-100 shadow max-h-44 overflow-auto">
                {filteredProducts.length === 0 ? (
                  <p className="px-4 py-3 text-xs text-muted">Sin resultados</p>
                ) : (
                  filteredProducts.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addProduct(p)}
                      className="w-full text-left px-4 py-2.5 border-b hover:bg-base-200"
                    >
                      <div className="text-sm font-medium">
                        {p.name}
                        {p.sku ? ` · ${p.sku}` : ""}
                      </div>
                      <div className="text-xs opacity-60">
                        Stock: {p.stock} · Precio: Q{p.price}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Carrito editable */}
          <div className="space-y-2">
            {items.length === 0 && (
              <p className="text-xs text-muted">Esta venta no tiene productos.</p>
            )}
            {items.map((it) => {
              const available = availableStock(it);
              const excedido = available !== null && it.qty > available;
              return (
                <div key={it.key} className="card-soft p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium truncate min-w-0">
                      {it.product_name}
                    </p>
                    <button
                      onClick={() => removeItem(it.key)}
                      className="text-red-500 shrink-0"
                      title="Quitar producto"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-muted">Precio</label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        className="input input-bordered w-full"
                        value={it.unit_price}
                        onChange={(e) =>
                          updateUnitPrice(it.key, Number(e.target.value))
                        }
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-muted">
                        Cantidad
                        {available !== null && (
                          <span className="opacity-60"> · Disp: {available}</span>
                        )}
                      </label>
                      <input
                        type="number"
                        min={1}
                        className={`input input-bordered w-full ${
                          excedido ? "border-red-500" : ""
                        }`}
                        value={it.qty}
                        onChange={(e) =>
                          updateQty(it.key, Number(e.target.value))
                        }
                      />
                    </div>
                  </div>
                  {excedido && (
                    <p className="text-xs text-red-500">
                      Excede el stock disponible ({available})
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* DTF + otros insumos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Costo DTF</label>
              <div className="flex gap-2 items-center">
                <DollarSign size={16} />
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="input input-bordered w-full"
                  value={dtfCost}
                  onChange={(e) =>
                    setDtfCost(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  placeholder="Sin registrar"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Otros insumos</label>
              <div className="flex gap-2 items-center">
                <Wrench size={16} />
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="input input-bordered w-full"
                  value={otherSuppliesCost}
                  onChange={(e) => setOtherSuppliesCost(Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          {/* Fecha de entrega */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Fecha de entrega</label>
            <div className="flex gap-2 items-center">
              <Calendar size={16} />
              <input
                type="date"
                className="input input-bordered w-full"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
              />
            </div>
          </div>

          {/* Total */}
          <div
            className="flex justify-between text-base font-semibold border-t pt-3"
            style={{ borderColor: "rgb(var(--border))" }}
          >
            <span>Total</span>
            <span>Q{total.toFixed(2)}</span>
          </div>

          {/* Acciones */}
          <div className="flex gap-2 pt-1">
            <button className="btn btn-ghost flex-1" onClick={onClose}>
              Cancelar
            </button>
            <button
              className="btn btn-primary flex-1 flex items-center justify-center gap-2"
              onClick={save}
              disabled={saving}
            >
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =====================
   PEDIDO MANUAL — modal
   Crea una venta solo con datos de contacto y fecha de entrega,
   sin productos ni precios todavía (queda rastreable de una vez
   en /seguimiento; los productos se agregan después desde
   "Editar venta").
===================== */

function ManualOrderModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [description, setDescription] = useState("");
  const [deliveryDate, setDeliveryDate] = useState<string>(() => addDaysLocalStr(5));
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!customerName.trim()) {
      alert("Ingresa el nombre del cliente");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("sales").insert({
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim() || null,
      customer_email: customerEmail.trim() || null,
      description: description.trim() || null,
      delivery_date: deliveryDate || null,
    });

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    onCreated();
  }

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="card w-full sm:max-w-md overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: "rgb(var(--border))" }}
        >
          <div>
            <p className="font-semibold text-base">Pedido manual</p>
            <p className="text-xs text-muted">
              Se crea con estado inicial &quot;Pendiente&quot;, sin productos.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-muted hover:text-red-500 transition rounded-lg"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Cliente</label>
            <input
              className="input input-bordered w-full"
              placeholder="Nombre del cliente"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Teléfono</label>
            <div className="flex gap-2 items-center">
              <Phone size={16} className="text-muted shrink-0" />
              <input
                className="input input-bordered w-full"
                placeholder="+502 5555 5555"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <div className="flex gap-2 items-center">
              <Mail size={16} className="text-muted shrink-0" />
              <input
                type="email"
                className="input input-bordered w-full"
                placeholder="cliente@correo.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Descripción (opcional)</label>
            <textarea
              className="w-full resize-none"
              rows={2}
              placeholder="Detalles del pedido…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Fecha de entrega estimada</label>
            <div className="flex gap-2 items-center">
              <Calendar size={16} className="text-muted shrink-0" />
              <input
                type="date"
                className="input input-bordered w-full"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button className="btn btn-ghost flex-1" onClick={onClose}>
              Cancelar
            </button>
            <button
              className="btn btn-primary flex-1 flex items-center justify-center gap-2"
              onClick={save}
              disabled={saving}
            >
              {saving ? "Creando…" : "Crear pedido"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
