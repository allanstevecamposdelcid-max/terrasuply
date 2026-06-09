"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  User,
  Phone,
  MapPin,
  Package,
  Save,
  DollarSign,
  Wallet,
  Trash2,
  ImagePlus,
  X,
  Loader2,
  Truck,
} from "lucide-react";
import { useRouter } from "next/navigation";

/* =====================
   TYPES
===================== */
type Product = {
  id: string;
  name: string;
  sku: string | null;
  stock: number;
  price: number;
  cost: number;
};

type CartItem = {
  product: Product;
  qty: number;
  unit_price: number; // ✅ precio editable solo en esta venta
  image_url: string | null; // ✅ imagen del producto a vender (URL pública)
  uploading: boolean;
};

const SALE_IMAGES_BUCKET = "sale-images";

export default function NuevaVentaPage() {
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [openProducts, setOpenProducts] = useState(false);

  const [cart, setCart] = useState<CartItem[]>([]);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [description, setDescription] = useState("");

  const [dtfCost, setDtfCost] = useState(0);
  const [shippingPct, setShippingPct] = useState(0);
  const [advancePayment, setAdvancePayment] = useState(0);
  const [loading, setLoading] = useState(false);

  async function loadProducts(q = "") {
    let query = supabase
      .from("products")
      .select("id,name,sku,stock,price,cost")
      .eq("active", true)
      .order("name");

    if (q.trim()) query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%`);

    const { data } = await query;
    setProducts((data as Product[]) || []);
  }

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => loadProducts(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenProducts(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function addToCart(product: Product) {
    setCart((prev) => {
      const found = prev.find((i) => i.product.id === product.id);
      if (found) {
        if (found.qty + 1 > product.stock) {
          alert("Stock insuficiente");
          return prev;
        }
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [
        ...prev,
        { product, qty: 1, unit_price: product.price, image_url: null, uploading: false },
      ];
    });

    setSearch("");
    setOpenProducts(false);
  }

  function updateQty(productId: string, qty: number) {
    setCart((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, qty } : i))
    );
  }

  function clampQty(productId: string) {
    setCart((prev) =>
      prev.map((i) =>
        i.product.id === productId
          ? { ...i, qty: Math.min(Math.max(1, i.qty || 1), i.product.stock) }
          : i
      )
    );
  }

  function updateUnitPrice(productId: string, price: number) {
    if (!Number.isFinite(price) || price < 0) return;
    setCart((prev) =>
      prev.map((i) =>
        i.product.id === productId ? { ...i, unit_price: price } : i
      )
    );
  }

  function removeItem(productId: string) {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  }

  /* =====================
     IMAGEN DEL PRODUCTO (se sube a Supabase Storage
     y se guarda la URL pública resultante)
  ===================== */

  async function uploadItemImage(productId: string, path: string, file: File) {
    setCart((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, uploading: true } : i))
    );

    const { error: uploadError } = await supabase.storage
      .from(SALE_IMAGES_BUCKET)
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (uploadError) {
      alert(uploadError.message);
      setCart((prev) =>
        prev.map((i) => (i.product.id === productId ? { ...i, uploading: false } : i))
      );
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(SALE_IMAGES_BUCKET).getPublicUrl(path);

    setCart((prev) =>
      prev.map((i) =>
        i.product.id === productId
          ? { ...i, image_url: publicUrl, uploading: false }
          : i
      )
    );
  }

  function removeItemImage(productId: string) {
    setCart((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, image_url: null } : i))
    );
  }

  const total = cart.reduce((sum, i) => sum + i.qty * i.unit_price, 0);
  const shippingCost = total * (shippingPct || 0) / 100;
  const totalNeto = total - shippingCost;
  const saldoPendiente = Math.max(totalNeto - (advancePayment || 0), 0);

  async function saveSale() {
    if (!customerName || cart.length === 0) {
      alert("Agrega cliente y productos");
      return;
    }

    if (cart.some((i) => i.uploading)) {
      alert("Espera a que terminen de subirse las imágenes");
      return;
    }

    const excedido = cart.find((i) => i.qty > i.product.stock);
    if (excedido) {
      alert(
        `"${excedido.product.name}" excede el stock disponible (${excedido.product.stock})`
      );
      return;
    }

    setLoading(true);

    const items = cart.map((i) => ({
      product_id: i.product.id,
      product_name: i.product.name,
      qty: i.qty,
      unit_price: i.unit_price, // ✅ usa el precio editado
      unit_cost: i.product.cost,
      image_url: i.image_url,
    }));

    const { error } = await supabase.rpc("create_sale_multi", {
      p_customer_name: customerName,
      p_customer_phone: customerPhone || null,
      p_customer_address: customerAddress || null,
      p_items: items,
      p_dtf_cost: dtfCost,
      p_advance_payment: advancePayment || 0,
      p_description: description || null,
      p_shipping_cost: shippingCost || 0,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    router.push("/ventas");
  }

  return (
    <div className="max-w-xl mx-auto space-y-8 pb-24">
      <h1 className="text-2xl font-semibold">Nueva venta</h1>

      <div className="card p-6 space-y-6">
        {/* CLIENTE */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Cliente</label>

          <div className="flex gap-2 items-center">
            <User size={16} />
            <input
              className="input input-bordered w-full"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Nombre del cliente"
            />
          </div>

          <div className="flex gap-2 items-center">
            <Phone size={16} />
            <input
              className="input input-bordered w-full"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Teléfono (opcional)"
            />
          </div>

          <div className="flex gap-2 items-center">
            <MapPin size={16} />
            <input
              className="input input-bordered w-full"
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              placeholder="Dirección (opcional)"
            />
          </div>
        </div>

        {/* DESCRIPCIÓN DE LA VENTA */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Descripción de la venta</label>
          <textarea
            className="w-full resize-none"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detalles del pedido: tallas, colores, instrucciones especiales… (opcional)"
          />
        </div>

        {/* PRODUCTOS */}
        <div className="space-y-3" ref={dropdownRef}>
          <label className="text-sm font-medium">Productos</label>

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
            <div className="border rounded-xl bg-base-100 shadow max-h-56 overflow-auto">
              {products.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  disabled={p.stock <= 0}
                  onClick={() => addToCart(p)}
                  className="w-full text-left px-4 py-3 border-b hover:bg-base-200"
                >
                  <div className="font-medium">
                    {p.name}
                    {p.sku ? ` · ${p.sku}` : ""}
                  </div>
                  <div className="text-xs opacity-60">
                    Stock: {p.stock} · Precio: Q{p.price}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* CARRITO */}
        {cart.length > 0 && (
          <div className="space-y-3">
            {cart.map((i) => {
              const inputId = `sale-image-${i.product.id}`;
              return (
                <div
                  key={i.product.id}
                  className="card-soft p-3 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{i.product.name}</div>
                      <div className="text-xs opacity-60">
                        Precio original: Q{i.product.price}
                      </div>
                    </div>

                    <button
                      onClick={() => removeItem(i.product.id)}
                      className="btn btn-ghost btn-sm text-red-500"
                      title="Quitar producto"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    {/* IMAGEN DEL PRODUCTO A VENDER (diseño de la playera) */}
                    <div className="shrink-0">
                      {i.image_url ? (
                        <div className="relative w-28 h-28 sm:w-32 sm:h-32">
                          <img
                            src={i.image_url}
                            alt={i.product.name}
                            className="w-28 h-28 sm:w-32 sm:h-32 rounded-xl object-cover border"
                            style={{ borderColor: "rgb(var(--border))" }}
                          />
                          <button
                            type="button"
                            onClick={() => removeItemImage(i.product.id)}
                            title="Quitar imagen"
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <label
                          htmlFor={inputId}
                          className="w-28 h-28 sm:w-32 sm:h-32 rounded-xl border border-dashed flex flex-col items-center justify-center gap-1.5 text-muted text-xs text-center cursor-pointer hover:border-accent hover:text-accent transition"
                          style={{ borderColor: "rgb(var(--border))" }}
                        >
                          {i.uploading ? (
                            <Loader2 size={20} className="animate-spin" />
                          ) : (
                            <>
                              <ImagePlus size={20} />
                              <span>Foto del diseño</span>
                            </>
                          )}
                        </label>
                      )}
                      <input
                        id={inputId}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={i.uploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
                            const path = `${Date.now()}-${i.product.id}.${ext}`;
                            uploadItemImage(i.product.id, path, file);
                          }
                          e.target.value = "";
                        }}
                      />
                    </div>

                    <div className="flex-1 flex flex-col gap-2">
                      <div>
                        <label className="text-xs text-muted">Precio (esta venta)</label>
                        {/* ✅ PRECIO EDITABLE SOLO PARA ESTA VENTA */}
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          className="input input-bordered w-full"
                          value={i.unit_price}
                          onChange={(e) =>
                            updateUnitPrice(i.product.id, Number(e.target.value))
                          }
                        />
                      </div>

                      <div>
                        <label className="text-xs text-muted">
                          Cantidad{" "}
                          <span className="opacity-60">
                            · Disponible: {i.product.stock}
                          </span>
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={i.product.stock}
                          className={`input input-bordered w-full ${
                            i.qty > i.product.stock ? "border-red-500" : ""
                          }`}
                          value={i.qty}
                          onChange={(e) => updateQty(i.product.id, Number(e.target.value))}
                          onBlur={() => clampQty(i.product.id)}
                        />
                        {i.qty > i.product.stock && (
                          <p className="text-xs text-red-500 mt-1">
                            Excede el stock disponible ({i.product.stock})
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* DTF + ENVÍO + ANTICIPO */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                onChange={(e) => setDtfCost(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Paquetería Comisión</label>
            <div className="flex gap-2 items-center">
              <Truck size={16} />
              <div className="flex items-center input input-bordered w-full gap-1 px-3">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="1"
                  style={{ background: "transparent", border: "none", outline: "none", padding: 0 }}
                  className="w-full text-sm"
                  value={shippingPct || ""}
                  onChange={(e) => setShippingPct(Number(e.target.value))}
                  placeholder="0"
                />
                <span className="text-muted text-sm shrink-0">%</span>
              </div>
            </div>
            {shippingPct > 0 && (
              <p className="text-xs text-muted">= Q{shippingCost.toFixed(2)}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Anticipo recibido</label>
            <div className="flex gap-2 items-center">
              <Wallet size={16} />
              <input
                type="number"
                min={0}
                step="0.01"
                className="input input-bordered w-full"
                value={advancePayment}
                onChange={(e) => setAdvancePayment(Number(e.target.value))}
                placeholder="Q0.00"
              />
            </div>
          </div>
        </div>

        {/* TOTAL */}
        <div className="space-y-1 border-t pt-4" style={{ borderColor: "rgb(var(--border))" }}>
          <div className="flex justify-between text-sm text-muted">
            <span>Subtotal productos</span>
            <span>Q{total.toFixed(2)}</span>
          </div>

          {shippingCost > 0 && (
            <div className="flex justify-between text-sm text-muted">
              <span>Paquetería Comisión ({shippingPct}%)</span>
              <span>− Q{shippingCost.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between text-lg font-semibold pt-1">
            <span>Total</span>
            <span>Q{totalNeto.toFixed(2)}</span>
          </div>

          {advancePayment > 0 && (
            <>
              <div className="flex justify-between text-sm text-muted">
                <span>Anticipo (transferencia)</span>
                <span>− Q{Number(advancePayment).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold text-accent">
                <span>Saldo pendiente (efectivo)</span>
                <span>Q{saldoPendiente.toFixed(2)}</span>
              </div>
            </>
          )}
        </div>

        {/* SAVE */}
        <button
          onClick={saveSale}
          disabled={loading}
          className="btn btn-primary w-full flex justify-center gap-2"
        >
          <Save size={16} />
          {loading ? "Guardando..." : "Guardar venta"}
        </button>
      </div>
    </div>
  );
}
