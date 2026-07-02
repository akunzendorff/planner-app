import { apiClient } from "../../shared/lib/apiClient";
import type { FinTx, CreditCard } from "./types";

export const financeApi = {
  // Transactions
  getTransactions:    ()                                    => apiClient.get<FinTx[]>("/finance/transactions"),
  createTransaction:  (tx: FinTx)                          => apiClient.post<FinTx>("/finance/transactions", tx),
  updateTransaction:  (id: string, tx: Omit<FinTx,"id">)  => apiClient.put<FinTx>(`/finance/transactions/${id}`, { id, ...tx }),
  deleteTransaction:  (id: string)                         => apiClient.delete<void>(`/finance/transactions/${id}`),

  // Cards
  getCards:     ()                                          => apiClient.get<CreditCard[]>("/finance/cards"),
  createCard:   (c: CreditCard)                            => apiClient.post<CreditCard>("/finance/cards", c),
  updateCard:   (id: string, c: Omit<CreditCard,"id">)    => apiClient.put<CreditCard>(`/finance/cards/${id}`, { id, ...c }),
  deleteCard:   (id: string)                               => apiClient.delete<void>(`/finance/cards/${id}`),
};
