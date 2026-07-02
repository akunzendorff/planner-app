import { supabase } from "../../shared/lib/supabase";
import type { WishlistPlace, ItineraryItem, ExTx, ExConfig } from "./types";

async function getUserId() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id;
}

export const exchangeApi = {
  async getConfig(): Promise<ExConfig | null> {
    const { data, error } = await supabase.from("exchange_config").select("*").maybeSingle();
    if (error) throw error;
    return data;
  },

  async setConfig(c: ExConfig): Promise<void> {
    const user_id = await getUserId();
    if (!user_id) throw new Error("Not authenticated");
    const { error } = await supabase.from("exchange_config").upsert({ ...c, user_id }).select().single();
    if (error) throw error;
  },

  async getPlaces(): Promise<WishlistPlace[]> {
    const { data, error } = await supabase.from("wishlist_places").select("*");
    if (error) throw error;
    return data ?? [];
  },

  async createPlace(p: WishlistPlace): Promise<void> {
    const user_id = await getUserId();
    if (!user_id) throw new Error("Not authenticated");
    const { error } = await supabase.from("wishlist_places").insert({ ...p, user_id });
    if (error) throw error;
  },

  async updatePlace(id: string, p: Omit<WishlistPlace, "id">): Promise<void> {
    const { error } = await supabase.from("wishlist_places").update(p).eq("id", id);
    if (error) throw error;
  },

  async deletePlace(id: string): Promise<void> {
    const { error } = await supabase.from("wishlist_places").delete().eq("id", id);
    if (error) throw error;
  },

  async getItems(): Promise<ItineraryItem[]> {
    const { data, error } = await supabase.from("itinerary_items").select("*");
    if (error) throw error;
    return data ?? [];
  },

  async createItem(i: ItineraryItem): Promise<void> {
    const user_id = await getUserId();
    if (!user_id) throw new Error("Not authenticated");
    const { error } = await supabase.from("itinerary_items").insert({ ...i, user_id });
    if (error) throw error;
  },

  async updateItem(id: string, i: Omit<ItineraryItem, "id">): Promise<void> {
    const { error } = await supabase.from("itinerary_items").update(i).eq("id", id);
    if (error) throw error;
  },

  async deleteItem(id: string): Promise<void> {
    const { error } = await supabase.from("itinerary_items").delete().eq("id", id);
    if (error) throw error;
  },

  async getTxs(): Promise<ExTx[]> {
    const { data, error } = await supabase.from("exchange_transactions").select("*");
    if (error) throw error;
    return data ?? [];
  },

  async createTx(t: ExTx): Promise<void> {
    const user_id = await getUserId();
    if (!user_id) throw new Error("Not authenticated");
    const { error } = await supabase.from("exchange_transactions").insert({ ...t, user_id });
    if (error) throw error;
  },

  async updateTx(id: string, t: Omit<ExTx, "id">): Promise<void> {
    const { error } = await supabase.from("exchange_transactions").update(t).eq("id", id);
    if (error) throw error;
  },

  async deleteTx(id: string): Promise<void> {
    const { error } = await supabase.from("exchange_transactions").delete().eq("id", id);
    if (error) throw error;
  },
};
