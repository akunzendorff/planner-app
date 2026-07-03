import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { addMonths, format } from "date-fns";
import { toast } from "sonner";
import { financeApi } from "./api";
import type { FinTx, CreditCard, DeleteScope } from "./types";

function generateInstances(data: { description: string; amount: number; type: FinTx["type"]; date: string; cardId?: string; recurrence: { type: "monthly" | "installment"; total: number } }): FinTx[] {
  const groupId = `g_${Date.now()}`;
  const isMonthly = data.recurrence.type === "monthly";
  const total = data.recurrence.total === 0 ? 999 : data.recurrence.total;

  if (isMonthly) {
    const d = parseDate(data.date);
    return [{
      id: `r${Date.now()}_0`,
      type: data.type,
      description: data.description,
      amount: data.amount,
      date: format(d, "yyyy-MM-dd"),
      cardId: data.cardId,
      recurrence: { type: "monthly", groupId, total, count: 1 },
    }];
  }

  const baseAmount = data.amount / total;
  const instances: FinTx[] = [];
  for (let i = 0; i < total; i++) {
    const d = i === 0 ? parseDate(data.date) : addMonths(parseDate(data.date), i);
    instances.push({
      id: `p${Date.now()}_${i}`,
      type: data.type,
      description: `${data.description} (${i + 1}/${total})`,
      amount: baseAmount,
      date: format(d, "yyyy-MM-dd"),
      cardId: data.cardId,
      recurrence: { type: "installment", groupId, total, count: i + 1 },
    });
  }
  return instances;
}

function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

interface FinanceCtx {
  transactions: FinTx[];
  cards: CreditCard[];
  initialBalance: number;
  loading: boolean;
  addTx:    (tx: Omit<FinTx, "id"> & { recurrenceType?: "none" | "monthly" | "installment"; recurrenceTotal?: number }) => void;
  updateTx: (id: string, tx: Omit<FinTx, "id">) => void;
  deleteTx: (id: string, scope?: DeleteScope) => void;
  addCard:    (c: Omit<CreditCard, "id">) => void;
  updateCard: (id: string, c: Omit<CreditCard, "id">) => void;
  deleteCard: (id: string) => void;
  setInitialBalance: (n: number) => void;
}

const Ctx = createContext<FinanceCtx | null>(null);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<FinTx[]>([]);
  const [cards,        setCards]        = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([financeApi.getTransactions(), financeApi.getCards()])
      .then(([savedTxs, savedCards]) => {
        setTransactions(savedTxs);
        setCards(savedCards);
      })
      .catch(e => toast.error("Erro ao carregar finanças", { description: (e as Error).message }))
      .finally(() => setLoading(false));
  }, []);

  const addTx = (data: Omit<FinTx, "id"> & { recurrenceType?: "none" | "monthly" | "installment"; recurrenceTotal?: number }) => {
    const { recurrenceType, recurrenceTotal, ...rest } = data;
    const total = recurrenceTotal ?? 0;
    const hasRecurrence = recurrenceType && recurrenceType !== "none" && (total > 1 || total === 0);

    if (hasRecurrence) {
      const instances = generateInstances({
        ...rest,
        recurrence: { type: recurrenceType as "monthly" | "installment", total: recurrenceTotal! },
      });
      setTransactions(p => [...p, ...instances]);
      instances.forEach(tx => financeApi.createTransaction(tx).catch(e => toast.error("Erro ao salvar", { description: (e as Error).message })));
    } else {
      const tx: FinTx = { id: `f${Date.now()}`, ...rest, recurrence: undefined };
      setTransactions(p => [...p, tx]);
      financeApi.createTransaction(tx).catch(e => toast.error("Erro ao salvar", { description: (e as Error).message }));
    }
  };

  const updateTx = (id: string, data: Omit<FinTx, "id">, scope: DeleteScope = "this") => {
    setTransactions(p => {
      const target = p.find(t => t.id === id);
      if (!target) return p;

      if (!target.recurrence || scope === "this") {
        return p.map(t => t.id === id ? { ...t, ...data } : t);
      }

      const gid = target.recurrence.groupId;
      if (scope === "future") {
        return p.map(t => {
          if (t.recurrence?.groupId !== gid) return t;
          if (t.date < target.date && t.recurrence.count < target.recurrence.count) return t;
          return { ...t, ...data };
        });
      }

      return p.map(t => t.recurrence?.groupId === gid ? { ...t, ...data } : t);
    });
    financeApi.updateTransaction(id, data).catch(e => toast.error("Erro ao salvar", { description: (e as Error).message }));
  };

  const deleteTx = (id: string, scope: DeleteScope = "this") => {
    setTransactions(p => {
      const target = p.find(t => t.id === id);
      if (!target) return p;
      if (scope === "this") return p.filter(t => t.id !== id);
      if (scope === "future") {
        return p.filter(t => {
          if (t.recurrence?.groupId !== target.recurrence?.groupId) return true;
          return t.date < target.date || t.recurrence.count < target.recurrence.count;
        });
      }
      return p.filter(t => !target.recurrence || t.recurrence?.groupId !== target.recurrence?.groupId);
    });
    financeApi.deleteTransaction(id).catch(e => toast.error("Erro ao salvar", { description: (e as Error).message }));
  };

  const addCard = (data: Omit<CreditCard, "id">) => {
    const c: CreditCard = { id: `c${Date.now()}`, ...data };
    setCards(p => [...p, c]);
    financeApi.createCard(c).catch(e => toast.error("Erro ao salvar", { description: (e as Error).message }));
  };

  const updateCard = (id: string, data: Omit<CreditCard, "id">) => {
    setCards(p => p.map(c => c.id === id ? { id, ...data } : c));
    financeApi.updateCard(id, data).catch(e => toast.error("Erro ao salvar", { description: (e as Error).message }));
  };

  const deleteCard = (id: string) => {
    setCards(p => p.filter(c => c.id !== id));
    financeApi.deleteCard(id).catch(e => toast.error("Erro ao salvar", { description: (e as Error).message }));
  };

  return (
    <Ctx.Provider value={{ transactions, cards, initialBalance: 0, loading, addTx, updateTx, deleteTx, addCard, updateCard, deleteCard, setInitialBalance: () => {} }}>
      {children}
    </Ctx.Provider>
  );
}

export function useFinanceStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useFinanceStore must be inside FinanceProvider");
  return ctx;
}

export { useFinanceStore as useFinance };
