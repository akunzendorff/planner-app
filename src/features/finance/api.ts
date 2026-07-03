import { supabase } from "../../shared/lib/supabase";
import type { FinTx, CreditCard } from "./types";

function getUserId() {
  return supabase.auth.getUser().then(({ data }) => data.user?.id);
}

function serializeTx(tx: Omit<FinTx, "id">) {
  const { cardId, ...rest } = tx;
  return { ...rest, card_id: cardId ?? null };
}

function deserializeTx(raw: any): FinTx {
  return { id: raw.id, type: raw.type, description: raw.description, amount: Number(raw.amount), date: raw.date, cardId: raw.card_id ?? undefined, recurrence: raw.recurrence ?? undefined };
}

function serializeCard(c: Omit<CreditCard, "id">) {
  const { closingDay, dueDay, limit: l, ...rest } = c;
  return { ...rest, closing_day: closingDay, due_day: dueDay, limit: l };
}

function deserializeCard(raw: any): CreditCard {
  return { id: raw.id, name: raw.name, closingDay: raw.closing_day, dueDay: raw.due_day, limit: Number(raw.limit), color: raw.color };
}

const TX_TABLE = "finance_transactions";
const CARD_TABLE = "credit_cards";

export const financeApi = {
  async getTransactions(): Promise<FinTx[]> {
    const { data, error } = await supabase.from(TX_TABLE).select("*");
    if (error) throw error;
    return (data ?? []).map(deserializeTx);
  },

  async createTransaction(tx: FinTx): Promise<void> {
    const user_id = await getUserId();
    if (!user_id) throw new Error("Not authenticated");
    const { error } = await supabase.from(TX_TABLE).insert({ ...serializeTx(tx), user_id });
    if (error) throw error;
  },

  async updateTransaction(id: string, tx: Omit<FinTx, "id">): Promise<void> {
    const { error } = await supabase.from(TX_TABLE).update(serializeTx({ ...tx })).eq("id", id);
    if (error) throw error;
  },

  async deleteTransaction(id: string): Promise<void> {
    const { error } = await supabase.from(TX_TABLE).delete().eq("id", id);
    if (error) throw error;
  },

  async getCards(): Promise<CreditCard[]> {
    const { data, error } = await supabase.from(CARD_TABLE).select("*");
    if (error) throw error;
    return (data ?? []).map(deserializeCard);
  },

  async createCard(c: CreditCard): Promise<void> {
    const user_id = await getUserId();
    if (!user_id) throw new Error("Not authenticated");
    const { error } = await supabase.from(CARD_TABLE).insert({ ...serializeCard(c), user_id });
    if (error) throw error;
  },

  async updateCard(id: string, c: Omit<CreditCard, "id">): Promise<void> {
    const { error } = await supabase.from(CARD_TABLE).update(serializeCard({ ...c })).eq("id", id);
    if (error) throw error;
  },

  async deleteCard(id: string): Promise<void> {
    const { error } = await supabase.from(CARD_TABLE).delete().eq("id", id);
    if (error) throw error;
  },
};
