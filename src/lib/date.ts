/**
 * Corrige un Date al equivalente de "misma hora, pero en UTC" según el
 * offset de zona horaria del navegador. `toISOString()` sobre un Date
 * sin corregir da la fecha en UTC, que en Guatemala (UTC-6) ya es
 * "mañana" desde las 6pm hora local — esto adelantaba el marcado de
 * "atrasado" y la fecha de entrega por defecto varias horas antes de
 * tiempo. Todas las funciones de este archivo pasan por acá para que
 * la corrección viva en un solo lugar.
 */
function shiftToLocal(d: Date): Date {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000);
}

/** Fecha local (del navegador) en formato YYYY-MM-DD. */
export function todayLocalStr(): string {
  return shiftToLocal(new Date()).toISOString().slice(0, 10);
}

/** Fecha local, `days` días a partir de hoy, en formato YYYY-MM-DD. */
export function addDaysLocalStr(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return shiftToLocal(d).toISOString().slice(0, 10);
}

/**
 * Convierte un timestamp completo (ej. created_at de Supabase, en UTC)
 * a la fecha local YYYY-MM-DD. Necesario para comparar contra filtros
 * de fecha calculados con `todayLocalStr()` — comparar contra
 * `iso.slice(0, 10)` compara la fecha en UTC y desalinea los registros
 * hechos después de las 6pm hora Guatemala.
 */
export function isoToLocalDateStr(iso: string): string {
  return shiftToLocal(new Date(iso)).toISOString().slice(0, 10);
}

/**
 * Convierte una fecha local YYYY-MM-DD + hora del día a su instante UTC
 * real, para usar en filtros `gte`/`lte` contra columnas timestamptz.
 * `new Date("YYYY-MM-DDTHH:mm:ss")` sin sufijo de zona ya se interpreta
 * como hora local del navegador, así que solo hace falta `toISOString()`.
 * Si `dateStr` viene vacío (ej. el usuario borró el campo de fecha),
 * usa hoy en vez de construir un Invalid Date que rompería `.toISOString()`.
 */
export function localDateTimeToUtcIso(dateStr: string, time: string): string {
  const safeDate = dateStr || todayLocalStr();
  return new Date(`${safeDate}T${time}`).toISOString();
}
