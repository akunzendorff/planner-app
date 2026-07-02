import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { addMonths, format } from "date-fns";
import { financeApi } from "./api";
import { loadFromStorage, saveToStorage } from "../../shared/lib/persist";
import type { FinTx, CreditCard, DeleteScope } from "./types";

const SEED_TXS: FinTx[] = [
  { id: "f1",  type: "entrada",  description: "Salário",             amount: 8000,   date: "2026-07-01", recurrence: { type: "monthly", groupId: "g_sal", total: 999, count: 1 } },
  { id: "f2",  type: "entrada",  description: "Freelance",           amount: 2500,   date: "2026-07-15", recurrence: undefined },
  { id: "f3",  type: "saida",    description: "Aluguel",             amount: 1800,   date: "2026-07-05", recurrence: { type: "monthly", groupId: "g_alu", total: 999, count: 1 } },
  { id: "f4",  type: "saida",    description: "Supermercado",        amount: 420,    date: "2026-07-08", recurrence: undefined },
  { id: "f5",  type: "saida",    description: "Farmácia",            amount: 87,     date: "2026-07-12", recurrence: undefined },
  { id: "f6",  type: "saida",    description: "Academia",            amount: 99.9,   date: "2026-07-05", recurrence: { type: "monthly", groupId: "g_aca", total: 999, count: 1 } },
  { id: "f7",  type: "diario",   description: "Uber",                amount: 35,     date: "2026-07-03", recurrence: undefined },
  { id: "f8",  type: "diario",   description: "iFood",               amount: 48.5,   date: "2026-07-06", recurrence: undefined },
  { id: "f9",  type: "economia", description: "Reserva emergência",  amount: 500,    date: "2026-07-01", recurrence: { type: "monthly", groupId: "g_res", total: 999, count: 1 } },
  { id: "f10", type: "economia", description: "Investimento CDB",    amount: 1000,   date: "2026-07-15", recurrence: undefined },
  { id: "f11", type: "cartao",   description: "Netflix",             amount: 55.9,   date: "2026-06-25", cardId: "c1", recurrence: { type: "monthly", groupId: "g_net", total: 999, count: 1 } },
  { id: "f12", type: "cartao",   description: "Restaurante",         amount: 180,    date: "2026-07-05", cardId: "c1", recurrence: undefined },
  { id: "f13", type: "cartao",   description: "Roupa",               amount: 350,    date: "2026-07-08", cardId: "c2", recurrence: undefined },
];

const SEED_CARDS: CreditCard[] = [
  { id: "c1", name: "Nubank", closingDay: 20, dueDay: 27, limit: 5000, color: "#8B47FF" },
  { id: "c2", name: "Inter",  closingDay: 10, dueDay: 17, limit: 3000, color: "#FF7A00" },
];

function generateInstances(data: { description: string; amount: number; type: FinTx["type"]; date: string; cardId?: string; recurrence: { type: "monthly" | "installment"; total: number } }): FinTx[] {
  const groupId = `g_${Date.now()}`;
  const instances: FinTx[] = [];
  const isInfinite = data.recurrence.total === 0;
  const total = isInfinite ? 1 : data.recurrence.total;
  const baseAmount = data.recurrence.type === "installment" ? data.amount / total : data.amount;

  for (let i = 0; i < total; i++) {
    const d = i === 0 ? parseDate(data.date) : addMonths(parseDate(data.date), i);
    instances.push({
      id: `${data.recurrence.type === "installment" ? "p" : "r"}${Date.now()}_${i}`,
      type: data.type,
      description: data.description + (data.recurrence.type === "installment" ? ` (${i + 1}/${total})` : ""),
      amount: baseAmount,
      date: format(d, "yyyy-MM-dd"),
      cardId: data.cardId,
      recurrence: { type: data.recurrence.type, groupId, total: isInfinite ? 0 : data.recurrence.total, count: i + 1 },
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
  const [transactions, setTransactions] = useState<FinTx[]>(loadFromStorage("finance_transactions", SEED_TXS));
  const [cards,        setCards]        = useState<CreditCard[]>(loadFromStorage("finance_cards", SEED_CARDS));

  useEffect(() => {
    Promise.all([financeApi.getTransactions(), financeApi.getCards()])
      .then(([savedTxs, savedCards]) => {
        if (savedTxs.length)   setTransactions(savedTxs);
        if (savedCards.length) setCards(savedCards);
      })
      .catch(console.error);
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
      setTransactions(p => {
        const next = [...p, ...instances];
        saveToStorage("finance_transactions", next);
        return next;
      });
      instances.forEach(tx => financeApi.createTransaction(tx).catch(console.error));
    } else {
      const tx: FinTx = { id: `f${Date.now()}`, ...rest, recurrence: undefined };
      setTransactions(p => {
        const next = [...p, tx];
        saveToStorage("finance_transactions", next);
        return next;
      });
      financeApi.createTransaction(tx).catch(console.error);
    }
  };

  const updateTx = (id: string, data: Omit<FinTx, "id">) => {
    setTransactions(p => {
      const next = p.map(t => t.id === id ? { id, ...data } : t);
      saveToStorage("finance_transactions", next);
      return next;
    });
    financeApi.updateTransaction(id, data).catch(console.error);
  };

  const deleteTx = (id: string, scope: DeleteScope = "this") => {
    setTransactions(p => {
      const target = p.find(t => t.id === id);
      if (!target) return p;
      let next = p;
      if (scope === "this") {
        next = p.filter(t => t.id !== id);
      } else if (scope === "future") {
        next = p.filter(t => {
          if (t.recurrence?.groupId !== target.recurrence?.groupId) return true;
          return t.date < target.date || t.recurrence.count < target.recurrence.count;
        });
      } else {
        // "all"
        next = p.filter(t => !target.recurrence || t.recurrence?.groupId !== target.recurrence?.groupId);
      }
      saveToStorage("finance_transactions", next);
      return next;
    });
    // Fire delete on the specific transaction
    financeApi.deleteTransaction(id).catch(console.error);
  };

  const addCard = (data: Omit<CreditCard, "id">) => {
    const c: CreditCard = { id: `c${Date.now()}`, ...data };
    setCards(p => {
      const next = [...p, c];
      saveToStorage("finance_cards", next);
      return next;
    });
    financeApi.createCard(c).catch(console.error);
  };
  const updateCard = (id: string, data: Omit<CreditCard, "id">) => {
    setCards(p => {
      const next = p.map(c => c.id === id ? { id, ...data } : c);
      saveToStorage("finance_cards", next);
      return next;
    });
    financeApi.updateCard(id, data).catch(console.error);
  };
  const deleteCard = (id: string) => {
    setCards(p => {
      const next = p.filter(c => c.id !== id);
      saveToStorage("finance_cards", next);
      return next;
    });
    financeApi.deleteCard(id).catch(console.error);
  };

  return (
    <Ctx.Provider value={{ transactions, cards, initialBalance: 0, addTx, updateTx, deleteTx, addCard, updateCard, deleteCard, setInitialBalance: () => {} }}>
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
