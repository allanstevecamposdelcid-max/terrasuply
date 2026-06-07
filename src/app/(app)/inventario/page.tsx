"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Tag,
  DollarSign,
  Package,
  Boxes,
} from "lucide-react";

/* =====================
   TYPES
===================== */

type Product = {
  id: string;
  name: string;
  sku: string | null;
  stock: number;
  cost: number;
  price: number;
  active?: boolean;
};

/* =====================
   PAGE
===================== */

export default function InventarioPage() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  /* ===== LOAD ===== */

  async function load() {
    setLoading(true);

    let query = supabase
      .from("products")
      .select("id,name,sku,stock,cost,price,active")
      .eq("active", true)
      .order("created_at", { ascending: false });

    if (q.trim()) {
      query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%`);
    }

    const { data, error } = await query;
    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    setItems((data as Product[]) || []);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [q]);

  /* ===== DELETE (SOFT) ===== */

  async function deleteProduct(id: string) {
    const ok = confirm(
      "¿Eliminar este producto?\nNo se podrá vender, pero el historial se conserva."
    );
    if (!ok) return;

    const { error } = await supabase
      .from("products")
      .update({ active: false })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    load();
  }

  return (
    <div className="space-y-6 pb-28">
      <div>
        <h1 className="text-2xl font-semibold">Inventario</h1>
        <p className="text-sm text-muted">Productos disponibles para la venta</p>
      </div>

      {/* SEARCH */}
      <div className="flex items-center gap-2 max-w-sm">
        <Search size={16} className="text-muted shrink-0" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre o código..."
          className="input input-bordered w-full"
        />
      </div>

      {loading && <div className="text-sm text-muted">Cargando…</div>}

      {/* LIST */}
      {!loading && items.length === 0 ? (
        <div className="card p-6 text-center text-sm text-muted">
          No hay productos registrados
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((p) => (
            <div key={p.id} className="card p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{p.name}</div>
                  {p.sku && (
                    <div className="flex items-center gap-1 text-xs text-muted mt-0.5">
                      <Tag size={12} />
                      <span className="truncate">{p.sku}</span>
                    </div>
                  )}
                </div>

                <span
                  className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium ${
                    p.stock <= 0
                      ? "bg-red-500/15 text-red-600"
                      : "bg-green-500/15 text-green-600"
                  }`}
                >
                  {p.stock <= 0 ? "Agotado" : `${p.stock} disponibles`}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <Info label="Precio" value={`Q${p.price.toFixed(2)}`} accent />
                <Info label="Costo" value={`Q${p.cost.toFixed(2)}`} />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => {
                    setEditing(p);
                    setOpenEdit(true);
                  }}
                  className="btn btn-ghost btn-sm flex items-center gap-1.5 text-blue-500 hover:text-blue-600"
                >
                  <Pencil size={14} />
                  Editar
                </button>

                <button
                  onClick={() => deleteProduct(p.id)}
                  className="btn btn-ghost btn-sm flex items-center gap-1.5 text-red-500 hover:text-red-600"
                >
                  <Trash2 size={14} />
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE */}
      <button
        className="btn btn-primary fixed left-4 right-4 bottom-[84px] md:left-auto md:right-8 md:bottom-8 md:w-auto md:px-6 flex items-center justify-center gap-2 shadow-lg"
        onClick={() => setOpenCreate(true)}
      >
        <Plus size={16} />
        Crear producto
      </button>

      {openCreate && (
        <CreateProductModal
          onClose={() => setOpenCreate(false)}
          onCreated={() => {
            setOpenCreate(false);
            load();
          }}
        />
      )}

      {openEdit && editing && (
        <EditProductModal
          product={editing}
          onClose={() => {
            setOpenEdit(false);
            setEditing(null);
          }}
          onSaved={() => {
            setOpenEdit(false);
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

/* =====================
   INFO (precio / costo)
===================== */

function Info({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="card-soft px-3 py-2">
      <div className="text-[11px] text-muted">{label}</div>
      <div className={`font-semibold ${accent ? "text-accent" : ""}`}>{value}</div>
    </div>
  );
}

/* =====================
   CREATE MODAL
===================== */

function CreateProductModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");

  const [stock, setStock] = useState<number | "">("");
  const [cost, setCost] = useState<number | "">("");
  const [price, setPrice] = useState<number | "">("");

  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) {
      alert("Nombre requerido");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("products").insert({
      name: name.trim(),
      sku: sku.trim() || null,
      stock: Number(stock || 0),
      cost: Number(cost || 0),
      price: Number(price || 0),
      active: true,
    });

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    onCreated();
  }

  return (
    <Modal title="Crear producto" onClose={onClose}>
      <ProductForm
        name={name}
        setName={setName}
        sku={sku}
        setSku={setSku}
        stock={stock}
        setStock={setStock}
        cost={cost}
        setCost={setCost}
        price={price}
        setPrice={setPrice}
      />

      <ModalActions onClose={onClose} onSave={save} saving={saving} />
    </Modal>
  );
}

/* =====================
   EDIT MODAL
===================== */

function EditProductModal({
  product,
  onClose,
  onSaved,
}: {
  product: Product;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(product.name);
  const [sku, setSku] = useState(product.sku ?? "");
  const [stock, setStock] = useState<number | "">(product.stock);
  const [cost, setCost] = useState<number | "">(product.cost);
  const [price, setPrice] = useState<number | "">(product.price);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);

    const { error } = await supabase
      .from("products")
      .update({
        name: name.trim(),
        sku: sku.trim() || null,
        stock: Number(stock || 0),
        cost: Number(cost || 0),
        price: Number(price || 0),
      })
      .eq("id", product.id);

    setSaving(false);
    if (error) return alert(error.message);
    onSaved();
  }

  return (
    <Modal title="Editar producto" onClose={onClose}>
      <ProductForm
        name={name}
        setName={setName}
        sku={sku}
        setSku={setSku}
        stock={stock}
        setStock={setStock}
        cost={cost}
        setCost={setCost}
        price={price}
        setPrice={setPrice}
      />

      <ModalActions onClose={onClose} onSave={save} saving={saving} />
    </Modal>
  );
}

/* =====================
   SHARED UI
===================== */

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] bg-black/40 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="card w-full sm:max-w-md p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="font-semibold text-lg">{title}</div>
        {children}
      </div>
    </div>
  );
}

function ModalActions({
  onClose,
  onSave,
  saving,
}: {
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="flex gap-2 pt-1">
      <button className="btn btn-ghost flex-1" onClick={onClose}>
        Cancelar
      </button>
      <button className="btn btn-primary flex-1" onClick={onSave} disabled={saving}>
        {saving ? "Guardando..." : "Guardar"}
      </button>
    </div>
  );
}

type NumField = number | "";

function ProductForm({
  name,
  setName,
  sku,
  setSku,
  stock,
  setStock,
  cost,
  setCost,
  price,
  setPrice,
}: {
  name: string;
  setName: (v: string) => void;
  sku: string;
  setSku: (v: string) => void;
  stock: NumField;
  setStock: (v: NumField) => void;
  cost: NumField;
  setCost: (v: NumField) => void;
  price: NumField;
  setPrice: (v: NumField) => void;
}) {
  function asNumber(raw: string): NumField {
    return raw === "" ? "" : Number(raw);
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center">
        <Package size={16} className="text-muted shrink-0" />
        <input
          className="input input-bordered w-full"
          placeholder="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="flex gap-2 items-center">
        <Tag size={16} className="text-muted shrink-0" />
        <input
          className="input input-bordered w-full"
          placeholder="Código (SKU)"
          value={sku}
          onChange={(e) => setSku(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <label className="flex items-center gap-1 text-xs text-muted">
            <Boxes size={12} /> Stock
          </label>
          <input
            type="number"
            min={0}
            className="input input-bordered w-full"
            value={stock}
            onChange={(e) => setStock(asNumber(e.target.value))}
          />
        </div>

        <div className="space-y-1">
          <label className="flex items-center gap-1 text-xs text-muted">
            <DollarSign size={12} /> Costo
          </label>
          <input
            type="number"
            min={0}
            step="0.01"
            className="input input-bordered w-full"
            value={cost}
            onChange={(e) => setCost(asNumber(e.target.value))}
          />
        </div>

        <div className="space-y-1">
          <label className="flex items-center gap-1 text-xs text-muted">
            <DollarSign size={12} /> Precio
          </label>
          <input
            type="number"
            min={0}
            step="0.01"
            className="input input-bordered w-full"
            value={price}
            onChange={(e) => setPrice(asNumber(e.target.value))}
          />
        </div>
      </div>
    </div>
  );
}
