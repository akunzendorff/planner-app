export type PlaceType  = "attraction" | "restaurant" | "museum" | "park" | "shopping" | "hotel" | "other";
export type ItemType   = "flight" | "train" | "bus" | "accommodation" | "activity" | "restaurant" | "museum" | "other";
export type ExCat      = "alimentacao" | "transporte" | "hospedagem" | "lazer" | "compras" | "outros";
export type ExTxType   = "entrada" | "saida" | "diario";
export type ExRecType  = "none" | "daily" | "weekly" | "monthly";

export interface ExRecurrence {
  type: ExRecType;
  groupId: string;
  total: number;
  count: number;
}

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

export interface ExTx {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: ExCat;
  type: ExTxType;
  recurrence?: ExRecurrence;
}

export interface ExConfig {
  country: string;
  city: string;
  currency: string;
  currencySymbol: string;
  exchangeRate: number;
  budget: number;
  startDate: string;
  endDate: string;
}
