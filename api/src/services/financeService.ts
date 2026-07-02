import { supabase } from "../lib/supabase.js";
import type { FinanceTx, CreditCard } from "../models/finance.js";

function rowToTx(row: any): FinanceTx {
  return {
    id:          row.id,
    type:        row.type,
    description: row.description,
    amount:      Number(row.amount),
    date:        row.date,
    cardId:      row.card_id ?? undefined,
    recurrence:  row.recurrence,
  };
}

function rowToCard(row: any): CreditCard {
  return {
    id:          row.id,
    name:        row.name,
    closingDay:  row.closing_day,
    dueDay:      row.due_day,
    limit:       Number(row.limit),
    color:       row.color,
  };
}

export class FinanceService {
  constructor(private userId: string) {}

  async getTransactions(): Promise<FinanceTx[]> {
    const { data, error } = await supabase
      .from("finance_transactions")
      .select("*")
      .eq("user_id", this.userId)
      .order("date");
    if (error) throw error;
    return (data ?? []).map(rowToTx);
  }

  async createTransaction(tx: FinanceTx): Promise<FinanceTx> {
    const { data, error } = await supabase
      .from("finance_transactions")
      .insert({ id: tx.id, user_id: this.userId, type: tx.type, description: tx.description, amount: tx.amount, date: tx.date, card_id: tx.cardId ?? null, recurrence: tx.recurrence })
      .select().single();
    if (error) throw error;
    return rowToTx(data);
  }

  async updateTransaction(id: string, tx: Omit<FinanceTx, "id">): Promise<FinanceTx> {
    const { data, error } = await supabase
      .from("finance_transactions")
      .update({ type: tx.type, description: tx.description, amount: tx.amount, date: tx.date, card_id: tx.cardId ?? null, recurrence: tx.recurrence })
      .eq("id", id).eq("user_id", this.userId)
      .select().single();
    if (error) throw error;
    return rowToTx(data);
  }

  async deleteTransaction(id: string): Promise<void> {
    const { error } = await supabase.from("finance_transactions").delete().eq("id", id).eq("user_id", this.userId);
    if (error) throw error;
  }

  async getCards(): Promise<CreditCard[]> {
    const { data, error } = await supabase.from("credit_cards").select("*").eq("user_id", this.userId).order("created_at");
    if (error) throw error;
    return (data ?? []).map(rowToCard);
  }

  async createCard(card: CreditCard): Promise<CreditCard> {
    const { data, error } = await supabase
      .from("credit_cards")
      .insert({ id: card.id, user_id: this.userId, name: card.name, closing_day: card.closingDay, due_day: card.dueDay, limit: card.limit, color: card.color })
      .select().single();
    if (error) throw error;
    return rowToCard(data);
  }

  async updateCard(id: string, card: Omit<CreditCard, "id">): Promise<CreditCard> {
    const { data, error } = await supabase
      .from("credit_cards")
      .update({ name: card.name, closing_day: card.closingDay, due_day: card.dueDay, limit: card.limit, color: card.color })
      .eq("id", id).eq("user_id", this.userId)
      .select().single();
    if (error) throw error;
    return rowToCard(data);
  }

  async deleteCard(id: string): Promise<void> {
    const { error } = await supabase.from("credit_cards").delete().eq("id", id).eq("user_id", this.userId);
    if (error) throw error;
  }
}
