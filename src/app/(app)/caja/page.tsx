"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Plus,
  CalendarDays,
  Trash2,
  Pin,
  PinOff,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { ProfitValue } from "@/components/ProfitGate";
import { todayLocalStr, localDateTimeToUtcIso } from "@/lib/date";

/* =====================
   TYPES
===================== */

type SaleItem = {
  qty: number;
  unit_cost: number;
};

type Sale = {
  total: number;
  dtf_cost: number | null;
  other_supplies_cost: number;
  advance_payment: number;
  sale_items: SaleItem[];
};

type Expense = {
  id: string;
  description: string;
  amount: number;
  expense_date: string;
  is_fixed: boolean;
};

/* =====================
   PAGE
===================== */

export default function CajaPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);

  // Arranca en UTC (igual en servidor y navegador, sin desajuste de
  // hidratación) y se corrige a la fecha local apenas monta en el
  // navegador, que es quien conoce la zona horaria real.
  const utcToday = () => new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(utcToday);
  const [to, setTo] = useState(utcToday);

  useEffect(() => {
    const t = todayLocalStr();
    setFrom(t);
    setTo(t);
  }, []);

  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [expenseDate, setExpenseDate] = useState(utcToday);
  const [isFixed, setIsFixed] = useState(false);

  useEffect(() => {
    setExpenseDate(todayLocalStr());
  }, []);

  /* =====================
     LOAD DATA
  ===================== */

  async function loadData() {
    setLoading(true);

    let salesQuery = supabase.from("sales").select(`
        total,
        dtf_cost,
        other_supplies_cost,
        advance_payment,
        sale_items (
          qty,
          unit_cost
        )
      `);

    if (from) salesQuery = salesQuery.gte("created_at", localDateTimeToUtcIso(from, "00:00:00"));
    if (to) salesQuery = salesQuery.lte("created_at", localDateTimeToUtcIso(to, "23:59:59.999"));

    const { data: salesData, error: salesError } = await salesQuery;

    // Se trae todo y se filtra acá: un gasto fijo cuenta siempre, sin
    // importar el rango de fecha que se esté viendo.
    const { data: expensesData, error: expensesError } = await supabase
      .from("expenses")
      .select("id,description,amount,expense_date,is_fixed")
      .order("expense_date", { ascending: false });

    if (salesError || expensesError) {
      alert(
        salesError?.message ||
          expensesError?.message ||
          "Error cargando datos"
      );
    } else {
      setSales(salesData || []);
      setExpenses(
        ((expensesData as Expense[]) || []).filter(
          (e) =>
            e.is_fixed ||
            ((!from || e.expense_date >= from) && (!to || e.expense_date <= to))
        )
      );
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [from, to]);

  /* =====================
     CALCULOS (MISMA LÓGICA QUE DASHBOARD)
  ===================== */

  const ingresos = useMemo(
    () => sales.reduce((sum, s) => sum + (s.advance_payment || 0), 0),
    [sales]
  );

  const costoProductos = useMemo(
    () =>
      sales
        .flatMap((s) => s.sale_items)
        .reduce(
          (sum, i) => sum + i.unit_cost * i.qty,
          0
        ),
    [sales]
  );

  const dtfTotal = useMemo(
    () =>
      sales.reduce(
        (sum, s) => sum + (s.dtf_cost || 0),
        0
      ),
    [sales]
  );

  const otherSuppliesTotal = useMemo(
    () =>
      sales.reduce(
        (sum, s) => sum + (s.other_supplies_cost || 0),
        0
      ),
    [sales]
  );

  const gastos = useMemo(
    () =>
      expenses.reduce(
        (sum, r) => sum + Number(r.amount || 0),
        0
      ),
    [expenses]
  );

  const ganancia =
    ingresos - costoProductos - dtfTotal - otherSuppliesTotal - gastos;

  /* =====================
     ACTIONS
  ===================== */

  async function addExpense() {
    if (!desc.trim() || !amount || amount <= 0) {
      alert("Ingresa descripción y monto válido");
      return;
    }

    const { error } = await supabase.from("expenses").insert({
      description: desc,
      amount,
      expense_date: expenseDate,
      is_fixed: isFixed,
    });

    if (error) {
      alert(error.message);
      return;
    }

    setDesc("");
    setAmount("");
    setIsFixed(false);
    loadData();
  }

  async function deleteExpense(id: string) {
    const ok = confirm("¿Eliminar este gasto?");
    if (!ok) return;

    await supabase.from("expenses").delete().eq("id", id);
    loadData();
  }

  async function toggleFixed(e: Expense) {
    const { error } = await supabase
      .from("expenses")
      .update({ is_fixed: !e.is_fixed })
      .eq("id", e.id);
    if (error) { alert(error.message); return; }
    loadData();
  }

  /* =====================
     UI
  ===================== */

  const today = todayLocalStr();
  const monthStart = today.slice(0, 7) + "-01";

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-semibold">Caja</h1>
        <p className="text-sm opacity-70">
          Ingresos, gastos y efectivo del periodo
        </p>
      </div>

      {/* FECHA */}
      <div className="card p-4 flex flex-wrap gap-4 items-end">
        <div className="flex items-center gap-2 text-sm text-muted">
          <CalendarDays size={16} />
          <span>Rango de fecha</span>
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
          onClick={() => { setFrom(today); setTo(today); }}
          className="btn btn-ghost btn-sm"
        >
          Hoy
        </button>

        <button
          onClick={() => { setFrom(monthStart); setTo(today); }}
          className="btn btn-ghost btn-sm"
        >
          Este mes
        </button>

        <button
          onClick={() => { setFrom(""); setTo(""); }}
          className="btn btn-ghost btn-sm text-error"
        >
          Todo
        </button>
      </div>

      {/* RESUMEN */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Resumen
          label="Ingresos"
          value={ingresos}
          icon={<TrendingUp size={16} />}
          color="text-green-500"
        />
        <Resumen
          label="Gastos"
          value={gastos}
          icon={<TrendingDown size={16} />}
          color="text-red-500"
        />
        <Resumen
          label="Caja neta"
          value={ganancia}
          icon={<Wallet size={16} />}
          color={
            ganancia >= 0
              ? "text-green-500"
              : "text-red-500"
          }
          gated
        />
      </div>

      {/* NUEVO GASTO */}
      <div className="card p-5 space-y-4">
        <h2 className="font-medium flex items-center gap-2">
          <Plus size={16} /> Registrar gasto
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            className="input input-bordered"
            placeholder="Descripción"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
          <input
            type="number"
            className="input input-bordered"
            placeholder="Monto"
            min={0}
            value={amount}
            onChange={(e) =>
              setAmount(
                e.target.value === ""
                  ? ""
                  : Number(e.target.value)
              )
            }
          />
          <input
            type="date"
            className="input input-bordered"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
          />
          <button
            onClick={addExpense}
            className="btn btn-primary"
          >
            Agregar
          </button>
        </div>

        <label className="flex items-center gap-2 text-sm text-muted cursor-pointer w-fit">
          <input
            type="checkbox"
            checked={isFixed}
            onChange={(e) => setIsFixed(e.target.checked)}
            className="w-4 h-4"
          />
          Gasto fijo (se repite cada mes automáticamente, sin volver a registrarlo)
        </label>
      </div>

      {/* LISTA GASTOS */}
      <div className="card p-0 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              <th className="p-3 text-left">Descripción</th>
              <th className="p-3 text-left">Fecha</th>
              <th className="p-3 text-right">Monto</th>
              <th className="p-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id} className="border-t">
                <td className="p-3">
                  <div className="flex items-center gap-1.5">
                    {e.description}
                    {e.is_fixed && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-accent/15 text-accent">
                        Fijo
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-3 text-muted text-xs">
                  {new Date(e.expense_date + "T00:00:00").toLocaleDateString("es-GT", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td className="p-3 text-right text-red-500">
                  Q{e.amount.toFixed(2)}
                </td>
                <td className="p-3">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => toggleFixed(e)}
                      title={e.is_fixed ? "Quitar de gastos fijos" : "Marcar como gasto fijo"}
                      className="text-muted hover:text-accent"
                    >
                      {e.is_fixed ? <PinOff size={15} /> : <Pin size={15} />}
                    </button>
                    <button
                      onClick={() => deleteExpense(e.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {expenses.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="p-6 text-center opacity-60"
                >
                  No hay gastos en este periodo
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {loading && (
        <p className="text-sm opacity-60">
          Cargando datos…
        </p>
      )}
    </div>
  );
}

/* =====================
   COMPONENTES
===================== */

function Resumen({
  label,
  value,
  icon,
  color,
  gated,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  gated?: boolean;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-1 text-sm opacity-70">
        {icon}
        <span>{label}</span>
      </div>
      {gated ? (
        <ProfitValue value={`Q${value.toFixed(2)}`} className={`text-2xl font-semibold ${color}`} />
      ) : (
        <p className={`text-2xl font-semibold ${color}`}>
          Q{value.toFixed(2)}
        </p>
      )}
    </div>
  );
}
