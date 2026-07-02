import { supabase } from "../lib/supabase.js";
import type { WishlistPlace, ItineraryItem, ExchangeTx, ExchangeConfig } from "../models/exchange.js";

export class ExchangeService {
  constructor(private userId: string) {}

  async getConfig(): Promise<ExchangeConfig | null> {
    const { data } = await supabase.from("exchange_config").select("*").eq("user_id", this.userId).single();
    if (!data) return null;
    return { country: data.country, city: data.city, currency: data.currency, currencySymbol: data.currency_symbol, exchangeRate: Number(data.exchange_rate), budget: Number(data.budget), startDate: data.start_date, endDate: data.end_date };
  }

  async setConfig(config: ExchangeConfig): Promise<ExchangeConfig> {
    const row = { user_id: this.userId, country: config.country, city: config.city, currency: config.currency, currency_symbol: config.currencySymbol, exchange_rate: config.exchangeRate, budget: config.budget, start_date: config.startDate, end_date: config.endDate };
    const { error } = await supabase.from("exchange_config").upsert(row, { onConflict: "user_id" });
    if (error) throw error;
    return config;
  }

  async getPlaces(): Promise<WishlistPlace[]> {
    const { data, error } = await supabase.from("wishlist_places").select("*").eq("user_id", this.userId).order("created_at");
    if (error) throw error;
    return (data ?? []).map(r => ({ id: r.id, name: r.name, type: r.type, notes: r.notes, visited: r.visited, lat: r.lat ?? undefined, lng: r.lng ?? undefined }));
  }

  async createPlace(p: WishlistPlace): Promise<WishlistPlace> {
    const { data, error } = await supabase.from("wishlist_places").insert({ id: p.id, user_id: this.userId, name: p.name, type: p.type, notes: p.notes, visited: p.visited, lat: p.lat ?? null, lng: p.lng ?? null }).select().single();
    if (error) throw error;
    return { id: data.id, name: data.name, type: data.type, notes: data.notes, visited: data.visited, lat: data.lat ?? undefined, lng: data.lng ?? undefined };
  }

  async updatePlace(id: string, p: Omit<WishlistPlace, "id">): Promise<WishlistPlace> {
    const { data, error } = await supabase.from("wishlist_places").update({ name: p.name, type: p.type, notes: p.notes, visited: p.visited, lat: p.lat ?? null, lng: p.lng ?? null }).eq("id", id).eq("user_id", this.userId).select().single();
    if (error) throw error;
    return { id: data.id, name: data.name, type: data.type, notes: data.notes, visited: data.visited, lat: data.lat ?? undefined, lng: data.lng ?? undefined };
  }

  async deletePlace(id: string): Promise<void> {
    const { error } = await supabase.from("wishlist_places").delete().eq("id", id).eq("user_id", this.userId);
    if (error) throw error;
  }

  async getItems(): Promise<ItineraryItem[]> {
    const { data, error } = await supabase.from("itinerary_items").select("*").eq("user_id", this.userId).order("date");
    if (error) throw error;
    return (data ?? []).map(r => ({ id: r.id, type: r.type, title: r.title, date: r.date, startTime: r.start_time ?? undefined, endTime: r.end_time ?? undefined, location: r.location ?? undefined, notes: r.notes ?? undefined, placeId: r.place_id ?? undefined, confirmed: r.confirmed }));
  }

  async createItem(item: ItineraryItem): Promise<ItineraryItem> {
    const { data, error } = await supabase.from("itinerary_items").insert({ id: item.id, user_id: this.userId, type: item.type, title: item.title, date: item.date, start_time: item.startTime ?? null, end_time: item.endTime ?? null, location: item.location ?? null, notes: item.notes ?? null, place_id: item.placeId ?? null, confirmed: item.confirmed }).select().single();
    if (error) throw error;
    return { id: data.id, type: data.type, title: data.title, date: data.date, startTime: data.start_time ?? undefined, endTime: data.end_time ?? undefined, location: data.location ?? undefined, notes: data.notes ?? undefined, placeId: data.place_id ?? undefined, confirmed: data.confirmed };
  }

  async updateItem(id: string, item: Omit<ItineraryItem, "id">): Promise<ItineraryItem> {
    const { data, error } = await supabase.from("itinerary_items").update({ type: item.type, title: item.title, date: item.date, start_time: item.startTime ?? null, end_time: item.endTime ?? null, location: item.location ?? null, notes: item.notes ?? null, place_id: item.placeId ?? null, confirmed: item.confirmed }).eq("id", id).eq("user_id", this.userId).select().single();
    if (error) throw error;
    return { id: data.id, type: data.type, title: data.title, date: data.date, startTime: data.start_time ?? undefined, endTime: data.end_time ?? undefined, location: data.location ?? undefined, notes: data.notes ?? undefined, placeId: data.place_id ?? undefined, confirmed: data.confirmed };
  }

  async deleteItem(id: string): Promise<void> {
    const { error } = await supabase.from("itinerary_items").delete().eq("id", id).eq("user_id", this.userId);
    if (error) throw error;
  }

  async getTxs(): Promise<ExchangeTx[]> {
    const { data, error } = await supabase.from("exchange_transactions").select("*").eq("user_id", this.userId).order("date");
    if (error) throw error;
    return (data ?? []).map(r => ({ id: r.id, description: r.description, amount: Number(r.amount), date: r.date, category: r.category, type: r.type }));
  }

  async createTx(tx: ExchangeTx): Promise<ExchangeTx> {
    const { data, error } = await supabase.from("exchange_transactions").insert({ id: tx.id, user_id: this.userId, description: tx.description, amount: tx.amount, date: tx.date, category: tx.category, type: tx.type }).select().single();
    if (error) throw error;
    return { id: data.id, description: data.description, amount: Number(data.amount), date: data.date, category: data.category, type: data.type };
  }

  async updateTx(id: string, tx: Omit<ExchangeTx, "id">): Promise<ExchangeTx> {
    const { data, error } = await supabase.from("exchange_transactions").update({ description: tx.description, amount: tx.amount, date: tx.date, category: tx.category, type: tx.type }).eq("id", id).eq("user_id", this.userId).select().single();
    if (error) throw error;
    return { id: data.id, description: data.description, amount: Number(data.amount), date: data.date, category: data.category, type: data.type };
  }

  async deleteTx(id: string): Promise<void> {
    const { error } = await supabase.from("exchange_transactions").delete().eq("id", id).eq("user_id", this.userId);
    if (error) throw error;
  }
}
