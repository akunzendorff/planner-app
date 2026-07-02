export type PlaceType  = "attraction" | "restaurant" | "museum" | "park" | "shopping" | "hotel" | "other";
export type ItemType   = "flight" | "train" | "bus" | "accommodation" | "activity" | "restaurant" | "museum" | "other";
export type ExCategory = "alimentacao" | "transporte" | "hospedagem" | "lazer" | "compras" | "outros";

export interface WishlistPlace {
  id: string;
  name: string;
  type: PlaceType;
  notes: string;
  visited: boolean;
  lat?: number;
  lng?: number;
}

export interface ItineraryItem {
  id: string;
  type: ItemType;
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  notes?: string;
  placeId?: string;
  confirmed: boolean;
}

export interface ExchangeTx {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: ExCategory;
  type: "expense" | "income";
}

export interface ExchangeConfig {
  country: string;
  city: string;
  currency: string;
  currencySymbol: string;
  exchangeRate: number;
  budget: number;
  startDate: string;
  endDate: string;
}
