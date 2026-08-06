export type StatusEntrega = "agendada" | "concluida" | "atencao";
export type StatusLembrete = "agendado" | "concluido";

export interface ItemPedido {
  id?: number;
  estoque_id: number;
  quantidade: number;
  nome?: string;
}

export interface Entrega {
  id: number;
  data: string; // "YYYY-MM-DD"
  horario: string; // "HH:mm"
  descricao: string;
  cliente?: string;
  embalagem: string;
  antecedencia_minutos: number;
  status: StatusEntrega;
  notificado: number;
  created_at: string;
  itens?: ItemPedido[];
}

export interface EstoqueItem {
  id: number;
  nome: string;
  quantidade: number;
  preco_unitario: number;
  updated_at: string;
}

export interface EstoqueLogEntry {
  id: number;
  estoque_id: number;
  nome_produto: string;
  tipo: "entrada" | "saida" | "criacao" | "remocao";
  quantidade: number;
  quantidade_anterior: number;
  quantidade_depois: number;
  created_at: string;
}

export interface Lembrete {
  id: number;
  data: string;
  horario: string;
  descricao: string;
  antecedencia_minutos: number;
  status: StatusLembrete;
  notificado: number;
  lembrete_mensal_id: number | null;
  created_at: string;
}

export interface LembreteMensal {
  id: number;
  descricao: string;
  dia_do_mes: number;
  horario: string;
  antecedencia_minutos: number;
  ativo: number;
  created_at: string;
}

export type Embalagem = "nenhuma" | "tupperware" | "isopor";

export interface RelatorioResponse {
  totalEntregas: number;
  totalVendas: number;
  porDia: { data: string; dataOriginal: string; quantidade: number }[];
  maisVendidos: { nome: string; quantidade: number }[];
  estoqueBaixo: { nome: string; quantidade: number }[];
}
