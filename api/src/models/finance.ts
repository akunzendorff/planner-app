export type TxType = "entrada" | "saida" | "diario" | "economia" | "cartao";
export type Recurrence = "none" | "monthly";

export interface FinanceTx {
  id: string;
  type: TxType;
  description: string;
  amount: number;
  date: string;
  cardId?: string;
  recurrence: Recurrence;
}

export interface CreditCard {
  id: string;
  name: string;
  closingDay: number;
  dueDay: number;
  limit: number;
  color: string;
}
