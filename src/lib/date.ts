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
