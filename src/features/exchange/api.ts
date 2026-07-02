import { apiClient } from "../../shared/lib/apiClient";
import type { WishlistPlace, ItineraryItem, ExTx, ExConfig } from "./types";

export const exchangeApi = {
  // Config
  getConfig:  ()                   => apiClient.get<ExConfig | null>("/exchange/config"),
  setConfig:  (c: ExConfig)        => apiClient.put<ExConfig>("/exchange/config", c),

  // Places
  getPlaces:    ()                                        => apiClient.get<WishlistPlace[]>("/exchange/places"),
  createPlace:  (p: WishlistPlace)                        => apiClient.post<WishlistPlace>("/exchange/places", p),
  updatePlace:  (id: string, p: Omit<WishlistPlace,"id">) => apiClient.put<WishlistPlace>(`/exchange/places/${id}`, { id, ...p }),
  deletePlace:  (id: string)                              => apiClient.delete<void>(`/exchange/places/${id}`),

  // Itinerary items
  getItems:    ()                                          => apiClient.get<ItineraryItem[]>("/exchange/items"),
  createItem:  (i: ItineraryItem)                          => apiClient.post<ItineraryItem>("/exchange/items", i),
  updateItem:  (id: string, i: Omit<ItineraryItem,"id">)  => apiClient.put<ItineraryItem>(`/exchange/items/${id}`, { id, ...i }),
  deleteItem:  (id: string)                               => apiClient.delete<void>(`/exchange/items/${id}`),

  // Transactions
  getTxs:      ()                                         => apiClient.get<ExTx[]>("/exchange/transactions"),
  createTx:    (t: ExTx)                                  => apiClient.post<ExTx>("/exchange/transactions", t),
  updateTx:    (id: string, t: Omit<ExTx,"id">)          => apiClient.put<ExTx>(`/exchange/transactions/${id}`, { id, ...t }),
  deleteTx:    (id: string)                               => apiClient.delete<void>(`/exchange/transactions/${id}`),
};
