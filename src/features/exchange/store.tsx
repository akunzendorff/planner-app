import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { addDays, addWeeks, addMonths, parseISO } from "date-fns";
import { toast } from "sonner";
import { exchangeApi } from "./api";
import type { WishlistPlace, ItineraryItem, ExTx, ExConfig, ExRecurrence } from "./types";

function generateRecurrenceInstances(tx: Omit<ExTx, "id">): ExTx[] {
  const rec = tx.recurrence;
  if (!rec || rec.type === "none") return [{ id: `x${Date.now()}`, ...tx }];

  const instances: ExTx[] = [];
  const groupId = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const startDate = parseISO(tx.date);

  for (let i = 0; i < rec.total; i++) {
    let next: Date;
    if (rec.type === "daily") next = addDays(startDate, i);
    else if (rec.type === "weekly") next = addWeeks(startDate, i);
    else next = addMonths(startDate, i);

    const dateStr = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
    instances.push({
      id: `x${Date.now()}_${i}`,
      ...tx,
      date: dateStr,
      recurrence: { ...rec, groupId, count: i + 1 },
    });
  }
  return instances;
}

interface ExchangeCtx {
  config: ExConfig;
  places: WishlistPlace[];
  items:  ItineraryItem[];
  txs:    ExTx[];
  setConfig:    (c: ExConfig) => void;
  addPlace:     (p: Omit<WishlistPlace, "id">) => void;
  updatePlace:  (id: string, p: Omit<WishlistPlace, "id">) => void;
  deletePlace:  (id: string) => void;
  addItem:      (i: Omit<ItineraryItem, "id">) => void;
  updateItem:   (id: string, i: Omit<ItineraryItem, "id">) => void;
  deleteItem:   (id: string) => void;
  addTx:        (t: Omit<ExTx, "id">) => void;
  updateTx:     (id: string, t: Omit<ExTx, "id">) => void;
  deleteTx:     (id: string) => void;
}

const Ctx = createContext<ExchangeCtx | null>(null);

const EMPTY_CONFIG: ExConfig = { country: "", city: "", currency: "", currencySymbol: "", exchangeRate: 0, budget: 0, startDate: "", endDate: "" };

export function ExchangeProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<ExConfig>(EMPTY_CONFIG);
  const [places, setPlaces]      = useState<WishlistPlace[]>([]);
  const [items,  setItems]       = useState<ItineraryItem[]>([]);
  const [txs,    setTxs]         = useState<ExTx[]>([]);

  useEffect(() => {
    Promise.all([
      exchangeApi.getConfig(),
      exchangeApi.getPlaces(),
      exchangeApi.getItems(),
      exchangeApi.getTxs(),
    ]).then(([cfg, pl, it, tx]) => {
      if (cfg) setConfigState(cfg);
      setPlaces(pl);
      setItems(it);
      setTxs(tx);
    }).catch(e => toast.error("Erro ao carregar intercâmbio", { description: (e as Error).message }));
  }, []);

  const setConfig = (c: ExConfig) => {
    setConfigState(c);
    exchangeApi.setConfig(c).catch(e => toast.error("Erro ao salvar", { description: (e as Error).message }));
  };

  const addPlace = (data: Omit<WishlistPlace, "id">) => {
    const p: WishlistPlace = { id: `p${Date.now()}`, ...data };
    setPlaces(prev => [...prev, p]);
    exchangeApi.createPlace(p).catch(e => toast.error("Erro ao salvar", { description: (e as Error).message }));
  };
  const updatePlace = (id: string, data: Omit<WishlistPlace, "id">) => {
    setPlaces(prev => prev.map(x => x.id === id ? { id, ...data } : x));
    exchangeApi.updatePlace(id, data).catch(e => toast.error("Erro ao salvar", { description: (e as Error).message }));
  };
  const deletePlace = (id: string) => {
    setPlaces(prev => prev.filter(x => x.id !== id));
    exchangeApi.deletePlace(id).catch(e => toast.error("Erro ao salvar", { description: (e as Error).message }));
  };

  const addItem = (data: Omit<ItineraryItem, "id">) => {
    const i: ItineraryItem = { id: `i${Date.now()}`, ...data };
    setItems(prev => [...prev, i]);
    exchangeApi.createItem(i).catch(e => toast.error("Erro ao salvar", { description: (e as Error).message }));
  };
  const updateItem = (id: string, data: Omit<ItineraryItem, "id">) => {
    setItems(prev => prev.map(x => x.id === id ? { id, ...data } : x));
    exchangeApi.updateItem(id, data).catch(e => toast.error("Erro ao salvar", { description: (e as Error).message }));
  };
  const deleteItem = (id: string) => {
    setItems(prev => prev.filter(x => x.id !== id));
    exchangeApi.deleteItem(id).catch(e => toast.error("Erro ao salvar", { description: (e as Error).message }));
  };

  const addTx = (data: Omit<ExTx, "id"> & { recType?: "none" | "daily" | "weekly" | "monthly"; recTotal?: number }) => {
    const { recType, recTotal, ...rest } = data;
    const withRec = recType && recType !== "none" && recTotal
      ? { ...rest, recurrence: { type: recType, groupId: "", total: recTotal, count: 1 } as ExRecurrence }
      : rest;
    const instances = generateRecurrenceInstances(withRec);
    setTxs(prev => [...prev, ...instances]);
    instances.forEach(t => exchangeApi.createTx(t).catch(e => toast.error("Erro ao salvar", { description: (e as Error).message })));
  };
  const updateTx = (id: string, data: Omit<ExTx, "id">) => {
    setTxs(prev => prev.map(x => x.id === id ? { id, ...data } : x));
    exchangeApi.updateTx(id, data).catch(e => toast.error("Erro ao salvar", { description: (e as Error).message }));
  };
  const deleteTx = (id: string, scope: "this" | "future" | "all" = "this") => {
    const target = txs.find(x => x.id === id);
    setTxs(prev => {
      if (!target?.recurrence) return prev.filter(x => x.id !== id);
      const gid = target.recurrence.groupId;
      if (scope === "this") return prev.filter(x => x.id !== id);
      if (scope === "future") return prev.filter(x => !(x.recurrence?.groupId === gid && x.date >= target.date));
      return prev.filter(x => !(x.recurrence?.groupId === gid));
    });
    if (scope === "this") exchangeApi.deleteTx(id).catch(e => toast.error("Erro ao salvar", { description: (e as Error).message }));
    else if (target?.recurrence) {
      const group = txs.filter(x => x.recurrence?.groupId === target.recurrence.groupId);
      group.forEach(t => exchangeApi.deleteTx(t.id).catch(e => toast.error("Erro ao salvar", { description: (e as Error).message })));
    }
  };

  return (
    <Ctx.Provider value={{ config, places, items, txs, setConfig, addPlace, updatePlace, deletePlace, addItem, updateItem, deleteItem, addTx, updateTx, deleteTx }}>
      {children}
    </Ctx.Provider>
  );
}

export function useExchangeStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useExchangeStore must be inside ExchangeProvider");
  return ctx;
}

export { useExchangeStore as useExchange };
