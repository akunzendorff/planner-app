import type { PlaceType, ItemType, ExCat, ExTxType } from "./types";

export const EX_TX_CFG: Record<ExTxType, { label: string; color: string; letter: string; sign: 1 | -1 }> = {
  entrada: { label: "Entrada", color: "#2C7A4B", letter: "E", sign: 1 },
  saida:   { label: "Saída",   color: "#C4581B", letter: "S", sign: -1 },
  diario:  { label: "Diário",  color: "#3B6FA0", letter: "D", sign: -1 },
};

export const PLACE_CFG: Record<PlaceType, { label: string; emoji: string; color: string }> = {
  attraction: { label: "Atração",     emoji: "🏛️", color: "#3B6FA0" },
  restaurant: { label: "Restaurante", emoji: "🍽️", color: "#C4581B" },
  museum:     { label: "Museu",       emoji: "🎨", color: "#8B4BA8" },
  park:       { label: "Parque",      emoji: "🌿", color: "#2C7A4B" },
  shopping:   { label: "Compras",     emoji: "🛍️", color: "#C4911B" },
  hotel:      { label: "Hotel",       emoji: "🏨", color: "#1A7A7A" },
  other:      { label: "Outro",       emoji: "📍", color: "#717182" },
};

export const ITEM_CFG: Record<ItemType, { label: string; emoji: string; color: string }> = {
  flight:        { label: "Voo",           emoji: "✈️", color: "#3B6FA0" },
  train:         { label: "Trem",          emoji: "🚄", color: "#2C7A4B" },
  bus:           { label: "Ônibus",        emoji: "🚌", color: "#C4911B" },
  accommodation: { label: "Hospedagem",    emoji: "🏨", color: "#1A7A7A" },
  activity:      { label: "Atividade",     emoji: "🎯", color: "#C4581B" },
  restaurant:    { label: "Restaurante",   emoji: "🍽️", color: "#8B4BA8" },
  museum:        { label: "Museu/Atração", emoji: "🎨", color: "#8B4BA8" },
  other:         { label: "Outro",         emoji: "📌", color: "#717182" },
};

export const EX_CAT_CFG: Record<ExCat, { label: string; color: string }> = {
  alimentacao: { label: "Alimentação", color: "#C4581B" },
  transporte:  { label: "Transporte",  color: "#3B6FA0" },
  hospedagem:  { label: "Hospedagem",  color: "#1A7A7A" },
  lazer:       { label: "Lazer",       color: "#8B4BA8" },
  compras:     { label: "Compras",     color: "#C4911B" },
  outros:      { label: "Outros",      color: "#717182" },
};

export function formatFX(amount: number, symbol: string): string {
  if (!symbol) return "–";
  return `${symbol} ${Math.abs(amount).toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

export async function fetchExchangeRate(currency: string): Promise<number> {
  const res = await fetch(`https://economia.awesomeapi.com.br/json/last/${currency}-BRL`);
  if (!res.ok) throw new Error("Falha ao buscar taxa de câmbio");
  const data = await res.json();
  const key = `${currency}BRL`;
  const item = data[key];
  if (!item?.bid) throw new Error("Taxa de câmbio não disponível");
  return parseFloat(item.bid);
}
