export function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayLocal(): string {
  return formatLocalDate(new Date());
}

export function addDaysLocal(base: Date, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return formatLocalDate(d);
}

const DIAS_SEMANA = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
];

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

function parseYMD(data: string): Date {
  const [y, m, d] = data.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatLongDatePtBR(data: string): string {
  const d = parseYMD(data);
  return `${DIAS_SEMANA[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

export function formatShortDatePtBR(data: string, withYear = false): string {
  const d = parseYMD(data);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return withYear ? `${dd}/${mm}/${d.getFullYear()}` : `${dd}/${mm}`;
}

export function agendaGroupLabel(data: string): string {
  const hoje = todayLocal();
  const amanha = addDaysLocal(new Date(), 1);
  const shortDate = formatShortDatePtBR(data);
  if (data === hoje) return `Hoje, ${shortDate}`;
  if (data === amanha) return `Amanhã, ${shortDate}`;
  const d = parseYMD(data);
  const w = DIAS_SEMANA[d.getDay()];
  return `${w.charAt(0).toUpperCase()}${w.slice(1)}, ${shortDate}`;
}

export function dayBadgeLabel(data: string): string {
  const hoje = todayLocal();
  const amanha = addDaysLocal(new Date(), 1);
  if (data === hoje) return "HOJE";
  if (data === amanha) return "AMANHÃ";
  return formatShortDatePtBR(data);
}

export function combineDateTime(data: string, horario: string): Date {
  const [y, m, d] = data.split("-").map(Number);
  const [h, min] = horario.split(":").map(Number);
  return new Date(y, m - 1, d, h, min);
}
