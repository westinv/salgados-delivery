export interface OrderItemQty {
  nome: string;
  quantidade: number;
}

export function buildDescricao(itens: OrderItemQty[], cliente: string): string {
  if (itens.length === 0) return cliente;
  const itensTexto = itens.map((i) => `${i.quantidade}x ${i.nome}`).join(", ");
  return `${itensTexto} - ${cliente}`;
}

export function parseItemLines(descricao: string, cliente: string): string[] {
  if (descricao === cliente) return [];
  const suffix = ` - ${cliente}`;
  const itemsPart = descricao.endsWith(suffix)
    ? descricao.slice(0, -suffix.length)
    : descricao;
  if (!itemsPart.trim()) return [];
  return itemsPart
    .split(", ")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function sumItemLines(lines: string[]): number {
  return lines.reduce((total, line) => {
    const match = line.match(/^(\d+)x/);
    return total + (match ? parseInt(match[1], 10) : 0);
  }, 0);
}
