import { useCallback, useState } from "react";

export function useLocalStorageNumber(key: string, defaultValue: number) {
  const [value, setValue] = useState<number>(() => {
    const stored = parseInt(localStorage.getItem(key) || "", 10);
    return Number.isFinite(stored) ? stored : defaultValue;
  });

  const update = useCallback(
    (next: number) => {
      setValue(next);
      localStorage.setItem(key, String(next));
    },
    [key],
  );

  return [value, update] as const;
}
