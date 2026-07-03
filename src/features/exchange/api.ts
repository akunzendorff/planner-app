import { supabase } from "../../shared/lib/supabase";
import type { WishlistPlace, ItineraryItem, ExTx, ExConfig } from "./types";

function getUserId() {
  return supabase.auth.getUser().then(({ data }) => data.user?.id);
}

function serializeConfig(c: ExConfig) {
  return { country: c.country, city: c.city, currency: c.currency, currency_symbol: c.currencySymbol, exchange_rate: c.exchangeRate, budget: c.budget, start_date: c.startDate, end_date: c.endDate };
}

function deserializeConfig(raw: any): ExConfig {
  return { country: raw.country, city: raw.city, currency: raw.currency, currencySymbol: raw.currency_symbol, exchangeRate: Number(raw.exchange_rate), budget: Number(raw.budget), startDate: raw.start_date, endDate: raw.end_date };
}

function serializeItem(i: Omit<ItineraryItem, "id">) {
  const { startTime, endTime, placeId, ...rest } = i;
  return { ...rest, start_time: startTime ?? null, end_time: endTime ?? null, place_id: placeId ?? null };
}

function deserializeItem(raw: any): ItineraryItem {
  return { id: raw.id, type: raw.type, title: raw.title, date: raw.date, startTime: raw.start_time ?? undefined, endTime: raw.end_time ?? undefined, location: raw.location ?? undefined, notes: raw.notes ?? undefined, placeId: raw.place_id ?? undefined, confirmed: raw.confirmed };
}

export const exchangeApi = {
  async getConfig(): Promise<ExConfig | null> {
    const { data, error } = await supabase.from("exchange_config").select("*").maybeSingle();
    if (error) throw error;
    return data ? deserializeConfig(data) : null;
  },

  async setConfig(c: ExConfig): Promise<void> {
    const user_id = await getUserId();
    if (!user_id) throw new Error("Not authenticated");
    const { error } = await supabase.from("exchange_config").upsert({ ...serializeConfig(c), user_id });
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
    return (data ?? []).map(deserializeItem);
  },

  async createItem(i: ItineraryItem): Promise<void> {
    const user_id = await getUserId();
    if (!user_id) throw new Error("Not authenticated");
    const { error } = await supabase.from("itinerary_items").insert({ ...serializeItem(i), user_id });
    if (error) throw error;
  },

  async updateItem(id: string, i: Omit<ItineraryItem, "id">): Promise<void> {
    const { error } = await supabase.from("itinerary_items").update(serializeItem({ ...i })).eq("id", id);
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
    const { recurrence, ...rest } = t;
    const { error } = await supabase.from("exchange_transactions").insert({ ...rest, user_id, recurrence: recurrence ?? null });
    if (error) throw error;
  },

  async updateTx(id: string, t: Omit<ExTx, "id">): Promise<void> {
    const { recurrence, ...rest } = t;
    const { error } = await supabase.from("exchange_transactions").update({ ...rest, recurrence: recurrence ?? null }).eq("id", id);
    if (error) throw error;
  },

  async deleteTx(id: string): Promise<void> {
    const { error } = await supabase.from("exchange_transactions").delete().eq("id", id);
    if (error) throw error;
  },
};
