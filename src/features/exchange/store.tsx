import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { exchangeApi } from "./api";
import type { WishlistPlace, ItineraryItem, ExTx, ExConfig } from "./types";

const DEFAULT_CONFIG: ExConfig = {
  country: "França", city: "Paris", currency: "EUR", currencySymbol: "€",
  exchangeRate: 5.85, budget: 3000, startDate: "2026-08-01", endDate: "2026-12-15",
};

const SEED_PLACES: WishlistPlace[] = [
  { id: "p1", name: "Torre Eiffel",    type: "attraction", notes: "Subir ao topo ao pôr do sol",     visited: false, lat: 48.8584, lng: 2.2945 },
  { id: "p2", name: "Museu do Louvre", type: "museum",     notes: "Ver a Mona Lisa + coleção egípcia", visited: false, lat: 48.8606, lng: 2.3376 },
  { id: "p3", name: "Notre-Dame",      type: "attraction", notes: "Reconstrução concluída em 2024!",  visited: false, lat: 48.8530, lng: 2.3499 },
  { id: "p4", name: "Sacré-Cœur",     type: "attraction", notes: "Vista panorâmica de Montmartre",   visited: true,  lat: 48.8867, lng: 2.3431 },
  { id: "p5", name: "Musée d'Orsay",  type: "museum",     notes: "Impressionismo — Monet, Van Gogh", visited: false, lat: 48.8600, lng: 2.3266 },
];

const SEED_ITEMS: ItineraryItem[] = [
  { id: "i1", type: "flight",        title: "GRU → CDG (Air France)",  date: "2026-08-01", startTime: "21:00",             location: "Aeroporto de Guarulhos", notes: "Embarque 19:00", confirmed: true  },
  { id: "i2", type: "accommodation", title: "Check-in — Hôtel du Nord", date: "2026-08-02", startTime: "15:00",             location: "10 Rue de la Grange",    notes: "Reserva #82913", confirmed: true  },
  { id: "i3", type: "activity",      title: "Torre Eiffel",             date: "2026-08-03", startTime: "10:00", endTime: "12:30", placeId: "p1", confirmed: false },
  { id: "i4", type: "museum",        title: "Museu do Louvre",          date: "2026-08-04", startTime: "09:00", endTime: "13:00", placeId: "p2", confirmed: false },
];

const SEED_TXS: ExTx[] = [
  { id: "x1", description: "Jantar chegada",       amount: 45,    date: "2026-08-02", category: "alimentacao", type: "expense" },
  { id: "x2", description: "Metrô (carnet)",       amount: 17.10, date: "2026-08-03", category: "transporte",  type: "expense" },
  { id: "x3", description: "Ingresso Torre Eiffel", amount: 28.30, date: "2026-08-03", category: "lazer",      type: "expense" },
];

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

export function ExchangeProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<ExConfig>(DEFAULT_CONFIG);
  const [places, setPlaces]      = useState<WishlistPlace[]>(SEED_PLACES);
  const [items,  setItems]       = useState<ItineraryItem[]>(SEED_ITEMS);
  const [txs,    setTxs]         = useState<ExTx[]>(SEED_TXS);

  useEffect(() => {
    Promise.all([
      exchangeApi.getConfig(),
      exchangeApi.getPlaces(),
      exchangeApi.getItems(),
      exchangeApi.getTxs(),
    ]).then(([cfg, pl, it, tx]) => {
      if (cfg)         setConfigState(cfg);
      if (pl.length)   setPlaces(pl);
      if (it.length)   setItems(it);
      if (tx.length)   setTxs(tx);
    }).catch(console.error);
  }, []);

  const setConfig = (c: ExConfig) => {
    setConfigState(c);
    exchangeApi.setConfig(c).catch(console.error);
  };

  const addPlace = (data: Omit<WishlistPlace, "id">) => {
    const p: WishlistPlace = { id: `p${Date.now()}`, ...data };
    setPlaces(prev => [...prev, p]);
    exchangeApi.createPlace(p).catch(console.error);
  };
  const updatePlace = (id: string, data: Omit<WishlistPlace, "id">) => {
    setPlaces(prev => prev.map(x => x.id === id ? { id, ...data } : x));
    exchangeApi.updatePlace(id, data).catch(console.error);
  };
  const deletePlace = (id: string) => {
    setPlaces(prev => prev.filter(x => x.id !== id));
    exchangeApi.deletePlace(id).catch(console.error);
  };

  const addItem = (data: Omit<ItineraryItem, "id">) => {
    const i: ItineraryItem = { id: `i${Date.now()}`, ...data };
    setItems(prev => [...prev, i]);
    exchangeApi.createItem(i).catch(console.error);
  };
  const updateItem = (id: string, data: Omit<ItineraryItem, "id">) => {
    setItems(prev => prev.map(x => x.id === id ? { id, ...data } : x));
    exchangeApi.updateItem(id, data).catch(console.error);
  };
  const deleteItem = (id: string) => {
    setItems(prev => prev.filter(x => x.id !== id));
    exchangeApi.deleteItem(id).catch(console.error);
  };

  const addTx = (data: Omit<ExTx, "id">) => {
    const t: ExTx = { id: `x${Date.now()}`, ...data };
    setTxs(prev => [...prev, t]);
    exchangeApi.createTx(t).catch(console.error);
  };
  const updateTx = (id: string, data: Omit<ExTx, "id">) => {
    setTxs(prev => prev.map(x => x.id === id ? { id, ...data } : x));
    exchangeApi.updateTx(id, data).catch(console.error);
  };
  const deleteTx = (id: string) => {
    setTxs(prev => prev.filter(x => x.id !== id));
    exchangeApi.deleteTx(id).catch(console.error);
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
