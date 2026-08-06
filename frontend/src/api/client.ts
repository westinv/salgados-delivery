import type {
  Entrega,
  EstoqueItem,
  EstoqueLogEntry,
  Lembrete,
  LembreteMensal,
  RelatorioResponse,
} from "../types";

const TOKEN_KEY = "sessaoToken";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  auth = false,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(path, { ...options, headers });
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {}

  if (!res.ok) {
    const message =
      (body as { error?: string })?.error || `Erro ${res.status}`;
    throw new ApiError(message, res.status);
  }

  return body as T;
}

export function login(senha: string) {
  return request<{ success: true; token: string; expiresAt: string }>(
    "/api/login",
    { method: "POST", body: JSON.stringify({ senha }) },
  );
}

export function logout() {
  return request<{ success: true }>(
    "/api/logout",
    { method: "POST" },
    true,
  );
}

export function verificarSessao() {
  return request<{ autenticado: boolean }>(
    "/api/verificar-sessao",
    {},
    true,
  );
}

export function alterarSenha(senhaAtual: string, novaSenha: string) {
  return request<{ success: true; message: string }>(
    "/api/alterar-senha",
    { method: "POST", body: JSON.stringify({ senhaAtual, novaSenha }) },
    true,
  );
}

export interface EntregaPayload {
  data: string;
  horario: string;
  descricao: string;
  cliente: string;
  embalagem: string;
  antecedencia_minutos: number;
  itens: { estoque_id: number; quantidade: number }[];
}

export function listarEntregas() {
  return request<Entrega[]>("/api/entregas");
}

export function buscarEntrega(id: number) {
  return request<Entrega>(`/api/entregas/${id}`);
}

export function entregasPorData(data: string) {
  return request<Entrega[]>(`/api/entregas/por-data/${data}`);
}

export function criarEntrega(payload: EntregaPayload) {
  return request<{ success: true; entrega: Entrega; alexa: unknown }>(
    "/api/entregas",
    { method: "POST", body: JSON.stringify(payload) },
  );
}

export function atualizarEntrega(id: number, payload: EntregaPayload) {
  return request<{ success: true; entrega: Entrega; message: string }>(
    `/api/entregas/${id}`,
    { method: "PUT", body: JSON.stringify(payload) },
  );
}

export function removerEntrega(id: number) {
  return request<{ success: true; message: string }>(
    `/api/entregas/${id}`,
    { method: "DELETE" },
  );
}

export function concluirEntrega(id: number) {
  return request<{ success: true; message: string }>(
    `/api/entregas/${id}/concluir`,
    { method: "POST" },
  );
}

export function reverterEntrega(id: number) {
  return request<{ success: true; message: string }>(
    `/api/entregas/${id}/reverter`,
    { method: "POST" },
  );
}

export function testarNotificacao() {
  return request<{ success: true; message: string }>(
    "/api/entregas/testar-notificacao",
    { method: "POST" },
  );
}

export function listarEstoque() {
  return request<EstoqueItem[]>("/api/estoque");
}

export function buscarItemEstoque(id: number) {
  return request<EstoqueItem>(`/api/estoque/${id}`);
}

export function estoqueLog() {
  return request<EstoqueLogEntry[]>("/api/estoque/log");
}

export function criarItemEstoque(payload: {
  nome: string;
  quantidade: number;
  preco_unitario: number;
}) {
  return request<{ success: true; item: EstoqueItem }>("/api/estoque", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function atualizarItemEstoque(
  id: number,
  payload: { nome: string; quantidade: number; preco_unitario: number },
) {
  return request<{ success: true; item: EstoqueItem }>(`/api/estoque/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function adicionarEstoque(id: number, quantidade: number) {
  return request<{ success: true; message: string; item: EstoqueItem }>(
    `/api/estoque/${id}/adicionar`,
    { method: "POST", body: JSON.stringify({ quantidade }) },
  );
}

export function removerEstoque(id: number, quantidade: number) {
  return request<{ success: true; message: string; item: EstoqueItem }>(
    `/api/estoque/${id}/remover`,
    { method: "POST", body: JSON.stringify({ quantidade }) },
  );
}

export function excluirItemEstoque(id: number) {
  return request<{ success: true; message: string }>(`/api/estoque/${id}`, {
    method: "DELETE",
  });
}

export function listarLembretes() {
  return request<Lembrete[]>("/api/lembretes");
}

export function criarLembrete(payload: {
  data: string;
  horario: string;
  descricao: string;
  antecedencia_minutos: number;
}) {
  return request<{ success: true; lembrete: Lembrete; alexa: unknown }>(
    "/api/lembretes",
    { method: "POST", body: JSON.stringify(payload) },
  );
}

export function removerLembrete(id: number) {
  return request<{ success: true; message: string }>(
    `/api/lembretes/${id}`,
    { method: "DELETE" },
  );
}

export function concluirLembrete(id: number) {
  return request<{ success: true; message: string }>(
    `/api/lembretes/${id}/concluir`,
    { method: "POST" },
  );
}

export function listarLembretesMensais() {
  return request<LembreteMensal[]>("/api/lembretes-mensais");
}

export function criarLembreteMensal(payload: {
  descricao: string;
  dia_do_mes: number;
  horario: string;
  antecedencia_minutos: number;
}) {
  return request<{
    success: true;
    lembreteMensal: LembreteMensal;
    lembreteAvulso: Lembrete | null;
  }>("/api/lembretes-mensais", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function atualizarLembreteMensal(
  id: number,
  payload: {
    descricao: string;
    dia_do_mes: number;
    horario: string;
    antecedencia_minutos: number;
  },
) {
  return request<{ success: true; message: string }>(
    `/api/lembretes-mensais/${id}`,
    { method: "PUT", body: JSON.stringify(payload) },
  );
}

export function removerLembreteMensal(id: number) {
  return request<{ success: true; message: string }>(
    `/api/lembretes-mensais/${id}`,
    { method: "DELETE" },
  );
}

export function pausarLembreteMensal(id: number) {
  return request<{ success: true; ativo: boolean; message: string }>(
    `/api/lembretes-mensais/${id}/pausar`,
    { method: "POST" },
  );
}

export function authStatus() {
  return request<{ authenticated: boolean; expiresAt: string | null }>(
    "/auth/status",
  );
}

export function authConfigure(accessCode: string) {
  return request<{ success: true }>("/auth/configure", {
    method: "POST",
    body: JSON.stringify({ accessCode }),
  });
}

export function authLogoutVoiceMonkey() {
  return request<{ success: true }>("/auth/logout");
}

export function relatorios(params: {
  periodo: "hoje" | "semana" | "mes" | "mes-especifico";
  mes?: number;
  ano?: number;
}) {
  const search = new URLSearchParams({ periodo: params.periodo });
  if (params.mes) search.set("mes", String(params.mes));
  if (params.ano) search.set("ano", String(params.ano));
  return request<RelatorioResponse>(`/api/relatorios?${search.toString()}`);
}

export function estoqueBaixo(limite: number) {
  return request<EstoqueItem[]>(`/api/estoque-baixo?limite=${limite}`);
}

export function notificarEstoqueBaixo(limite: number) {
  return request<{ success: true; message: string }>(
    "/api/notificar-estoque-baixo",
    { method: "POST", body: JSON.stringify({ limite }) },
  );
}

export { ApiError };
