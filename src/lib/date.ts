/**
 * Fecha local en formato YYYY-MM-DD.
 * `toISOString()` solo se usa aquí después de compensar el offset de
 * zona horaria del navegador — usarlo directo sobre `new Date()` da la
 * fecha en UTC, que en Guatemala (UTC-6) ya es "mañana" desde las 6pm
 * hora local, adelantando el marcado de "atrasado" y el cálculo de
 * fecha de entrega por defecto varias horas antes de tiempo.
 */
export function todayLocalStr(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

export function addDaysLocalStr(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

/**
 * Convierte un timestamp completo (ej. created_at de Supabase, en UTC)
 * a la fecha local YYYY-MM-DD. Necesario para comparar contra filtros
 * de fecha calculados con `todayLocalStr()` — comparar contra
 * `iso.slice(0, 10)` compara la fecha en UTC y desalinea los registros
 * hechos después de las 6pm hora Guatemala.
 */
export function isoToLocalDateStr(iso: string): string {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

/**
 * Convierte una fecha local YYYY-MM-DD + hora del día a su instante UTC
 * real, para usar en filtros `gte`/`lte` contra columnas timestamptz.
 * `new Date("YYYY-MM-DDTHH:mm:ss")` sin sufijo de zona ya se interpreta
 * como hora local del navegador, así que solo hace falta `toISOString()`.
 */
export function localDateTimeToUtcIso(dateStr: string, time: string): string {
  return new Date(`${dateStr}T${time}`).toISOString();
}
