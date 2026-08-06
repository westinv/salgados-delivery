export type Tab =
  | "entregas"
  | "estoque"
  | "agenda"
  | "historico"
  | "lembretes"
  | "relatorios"
  | "config";

export type Screen = "home" | "wizard" | "done";

export const MENU: { key: Tab; label: string }[] = [
  { key: "entregas", label: "Início" },
  { key: "estoque", label: "Estoque" },
  { key: "agenda", label: "Agenda" },
  { key: "historico", label: "Histórico" },
  { key: "lembretes", label: "Lembretes" },
  { key: "relatorios", label: "Relatórios" },
  { key: "config", label: "Configurações" },
];
