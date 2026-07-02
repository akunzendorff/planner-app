import { getDaysInMonth, parseISO, subMonths } from "date-fns";
import type { FinTx, CreditCard, TxType } from "./types";

export const TX_CFG: Record<TxType, { label: string; color: string; letter: string; sign: 1 | -1 }> = {
  entrada:  { label: "Entrada",  color: "#2C7A4B", letter: "E",  sign:  1 },
  saida:    { label: "Saída",    color: "#C4581B", letter: "S",  sign: -1 },
  diario:   { label: "Diário",   color: "#3B6FA0", letter: "D",  sign: -1 },
  economia: { label: "Economia", color: "#1A7A7A", letter: "Ec", sign: -1 },
  cartao:   { label: "Cartão",   color: "#8B4BA8", letter: "C",  sign:  0 },
};

export function formatBRL(n: number): string {
  return `R$ ${Math.abs(n).toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

export interface DayData {
  day: number;
  dateStr: string;
  txs: FinTx[];
  cartaoTxs: FinTx[];
  faturas: { card: CreditCard; amount: number }[];
  saldo: number;
}

function dateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function matchesDate(tx: FinTx, date: string): boolean {
  if (tx.recurrence === "none") return tx.date === date;
  const txDay    = tx.date.slice(8, 10);
  const targetDay = date.slice(8, 10);
  return txDay === targetDay && tx.date.slice(0, 7) <= date.slice(0, 7);
}

export function computeCardFatura(card: CreditCard, year: number, month: number, transactions: FinTx[]): number {
  let billingEndYear: number, billingEndMonth: number;
  let billingStartYear: number, billingStartMonth: number;

  if (card.dueDay > card.closingDay) {
    billingEndYear = year; billingEndMonth = month;
    const prev = subMonths(new Date(year, month, 1), 1);
    billingStartYear = prev.getFullYear(); billingStartMonth = prev.getMonth();
  } else {
    const prev = subMonths(new Date(year, month, 1), 1);
    billingEndYear = prev.getFullYear(); billingEndMonth = prev.getMonth();
    const prev2 = subMonths(new Date(year, month, 1), 2);
    billingStartYear = prev2.getFullYear(); billingStartMonth = prev2.getMonth();
  }

  const startStr = dateStr(billingStartYear, billingStartMonth, card.closingDay + 1);
  const endStr   = dateStr(billingEndYear,   billingEndMonth,   card.closingDay);

  return transactions
    .filter(tx => tx.type === "cartao" && tx.cardId === card.id)
    .filter(tx => {
      if (tx.recurrence === "none") return tx.date >= startStr && tx.date <= endStr;
      const txDayStr = tx.date.slice(8, 10);
      const instStart = `${billingStartYear}-${String(billingStartMonth + 1).padStart(2, "0")}-${txDayStr}`;
      const instEnd   = `${billingEndYear}-${String(billingEndMonth + 1).padStart(2, "0")}-${txDayStr}`;
      return tx.date <= Math.max(instStart, instEnd) && (
        (instStart >= startStr && instStart <= endStr) ||
        (instEnd   >= startStr && instEnd   <= endStr)
      );
    })
    .reduce((s, tx) => s + tx.amount, 0);
}

function computeStartingBalance(year: number, month: number, transactions: FinTx[], cards: CreditCard[], initialBalance: number): number {
  if (transactions.length === 0) return initialBalance;
  const nonCartao = transactions.filter(tx => tx.type !== "cartao");
  if (!nonCartao.length) return initialBalance;
  const earliest = nonCartao.reduce((min, tx) => tx.date < min ? tx.date : min, nonCartao[0].date);
  const earliestDate = parseISO(earliest);
  let sy = earliestDate.getFullYear(), sm = earliestDate.getMonth();
  let balance = initialBalance;
  while (sy < year || (sy === year && sm < month)) {
    const numDays = getDaysInMonth(new Date(sy, sm));
    for (let d = 1; d <= numDays; d++) {
      const ds = dateStr(sy, sm, d);
      for (const tx of transactions) {
        if (tx.type === "cartao") continue;
        if (!matchesDate(tx, ds)) continue;
        balance += tx.type === "entrada" ? tx.amount : -tx.amount;
      }
      for (const card of cards) {
        if (card.dueDay === d) balance -= computeCardFatura(card, sy, sm, transactions);
      }
    }
    sm++; if (sm > 11) { sm = 0; sy++; }
  }
  return balance;
}

export function computeMonthData(year: number, month: number, transactions: FinTx[], cards: CreditCard[], initialBalance: number): DayData[] {
  let saldo = computeStartingBalance(year, month, transactions, cards, initialBalance);
  const numDays = getDaysInMonth(new Date(year, month));
  const result: DayData[] = [];

  for (let d = 1; d <= numDays; d++) {
    const ds = dateStr(year, month, d);
    const txs      = transactions.filter(tx => tx.type !== "cartao" && matchesDate(tx, ds));
    const cartaoTxs = transactions.filter(tx => tx.type === "cartao" && matchesDate(tx, ds));
    const faturas  = cards
      .filter(c => c.dueDay === d)
      .map(c => ({ card: c, amount: computeCardFatura(c, year, month, transactions) }))
      .filter(f => f.amount > 0);

    for (const tx of txs) saldo += tx.type === "entrada" ? tx.amount : -tx.amount;
    for (const f of faturas) saldo -= f.amount;

    result.push({ day: d, dateStr: ds, txs, cartaoTxs, faturas, saldo });
  }
  return result;
}
