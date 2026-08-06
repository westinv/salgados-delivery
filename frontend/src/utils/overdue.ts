import { combineDateTime } from "./date";

export function formatOverdue(data: string, horario: string, now = new Date()): string {
  const scheduled = combineDateTime(data, horario);
  const diffMs = now.getTime() - scheduled.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `Passou ${Math.max(minutes, 0)}min!`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Passou ${hours}h!`;
  const days = Math.floor(hours / 24);
  return `Passou ${days}d!`;
}
