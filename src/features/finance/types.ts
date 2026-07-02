export type TxType = "entrada" | "saida" | "diario" | "economia" | "cartao";

export interface Recurrence {
  type: "monthly" | "installment";
  groupId: string;
  total: number;  // total occurrences
  count: number;  // current index (1-based)
}

export interface FinTx {
  id: string;
  type: TxType;
  description: string;
  amount: number;
  date: string; // "yyyy-MM-dd"
  cardId?: string;
  recurrence?: Recurrence;
}

export type DeleteScope = "this" | "future" | "all";

export interface CreditCard {
  id: string;
  name: string;
  closingDay: number;
  dueDay: number;
  limit: number;
  color: string;
}
