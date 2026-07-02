import { supabase } from "../../shared/lib/supabase";
import type { FinTx, CreditCard } from "./types";

async function getUserId() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id;
}

const TX_TABLE = "finance_transactions";
const CARD_TABLE = "credit_cards";

export const financeApi = {
  async getTransactions(): Promise<FinTx[]> {
    const { data, error } = await supabase.from(TX_TABLE).select("*");
    if (error) throw error;
    return data ?? [];
  },

  async createTransaction(tx: FinTx): Promise<void> {
    const user_id = await getUserId();
    if (!user_id) throw new Error("Not authenticated");
    const { error } = await supabase.from(TX_TABLE).insert({ ...tx, user_id });
    if (error) throw error;
  },

  async updateTransaction(id: string, tx: Omit<FinTx, "id">): Promise<void> {
    const { error } = await supabase.from(TX_TABLE).update(tx).eq("id", id);
    if (error) throw error;
  },

  async deleteTransaction(id: string): Promise<void> {
    const { error } = await supabase.from(TX_TABLE).delete().eq("id", id);
    if (error) throw error;
  },

  async getCards(): Promise<CreditCard[]> {
    const { data, error } = await supabase.from(CARD_TABLE).select("*");
    if (error) throw error;
    return data ?? [];
  },

  async createCard(c: CreditCard): Promise<void> {
    const user_id = await getUserId();
    if (!user_id) throw new Error("Not authenticated");
    const { error } = await supabase.from(CARD_TABLE).insert({ ...c, user_id });
    if (error) throw error;
  },

  async updateCard(id: string, c: Omit<CreditCard, "id">): Promise<void> {
    const { error } = await supabase.from(CARD_TABLE).update(c).eq("id", id);
    if (error) throw error;
  },

  async deleteCard(id: string): Promise<void> {
    const { error } = await supabase.from(CARD_TABLE).delete().eq("id", id);
    if (error) throw error;
  },
};
