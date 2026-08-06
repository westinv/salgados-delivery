import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import * as api from "../api/client";
import type { Entrega, EstoqueItem, Lembrete, LembreteMensal } from "../types";

interface DataContextValue {
  entregas: Entrega[];
  estoqueItems: EstoqueItem[];
  lembretes: Lembrete[];
  lembretesMensais: LembreteMensal[];
  loading: boolean;
  reloadEntregas: () => Promise<void>;
  reloadEstoque: () => Promise<void>;
  reloadLembretes: () => Promise<void>;
  reloadLembretesMensais: () => Promise<void>;
  reloadAll: () => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [estoqueItems, setEstoqueItems] = useState<EstoqueItem[]>([]);
  const [lembretes, setLembretes] = useState<Lembrete[]>([]);
  const [lembretesMensais, setLembretesMensais] = useState<LembreteMensal[]>(
    [],
  );
  const [loading, setLoading] = useState(true);

  const reloadEntregas = useCallback(async () => {
    setEntregas(await api.listarEntregas());
  }, []);
  const reloadEstoque = useCallback(async () => {
    setEstoqueItems(await api.listarEstoque());
  }, []);
  const reloadLembretes = useCallback(async () => {
    setLembretes(await api.listarLembretes());
  }, []);
  const reloadLembretesMensais = useCallback(async () => {
    setLembretesMensais(await api.listarLembretesMensais());
  }, []);

  const reloadAll = useCallback(async () => {
    await Promise.all([
      reloadEntregas(),
      reloadEstoque(),
      reloadLembretes(),
      reloadLembretesMensais(),
    ]);
  }, [reloadEntregas, reloadEstoque, reloadLembretes, reloadLembretesMensais]);

  useEffect(() => {
    setLoading(true);
    reloadAll().finally(() => setLoading(false));
  }, [reloadAll]);

  return (
    <DataContext.Provider
      value={{
        entregas,
        estoqueItems,
        lembretes,
        lembretesMensais,
        loading,
        reloadEntregas,
        reloadEstoque,
        reloadLembretes,
        reloadLembretesMensais,
        reloadAll,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
