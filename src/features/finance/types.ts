export type TxType = "entrada" | "saida" | "diario" | "economia" | "cartao";
export type ExCat = "alimentacao" | "transporte" | "hospedagem" | "lazer" | "compras" | "outros";

export interface FinTx {
  id: string;
  type: TxType;
  description: string;
  amount: number;
  date: string; // "yyyy-MM-dd"
  cardId?: string;
  recurrence: "none" | "monthly";
}

export interface CreditCard {
  id: string;
  name: string;
  closingDay: number;
  dueDay: number;
  limit: number;
  color: string;
}
