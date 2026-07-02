import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Plus, X, Pencil, CreditCard as CreditCardIcon, Trash2 } from "lucide-react";
import { format, addMonths, subMonths, getDaysInMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useFinance } from "../features/finance/store";
import { computeMonthData, computeCardFatura, formatBRL, TX_CFG, type DayData } from "../features/finance/utils";
import type { FinTx, TxType, CreditCard } from "../features/finance/types";

const TX_TYPES: TxType[] = ["entrada", "saida", "diario", "economia", "cartao"];
const CARD_COLORS = ["#8B47FF", "#FF7A00", "#1A7A7A", "#C4581B", "#2C7A4B", "#3B6FA0"];

type FinTab = "saldos" | "totais" | "cartoes" | "horizonte";
type ModalState =
  | { mode: "closed" }
  | { mode: "add"; prefillDate?: string }
  | { mode: "edit"; tx: FinTx };
type CardModalState =
  | { mode: "closed" }
  | { mode: "add" }
  | { mode: "edit"; card: CreditCard };

function TxIcon({ type, size = 20 }: { type: TxType; size?: number }) {
  const cfg = TX_CFG[type];
  const s = size;
  return (
    <span
      className="inline-flex items-center justify-center rounded-full font-bold flex-shrink-0 text-white"
      style={{ width: s, height: s, backgroundColor: cfg.color, fontSize: s * 0.4 }}
    >
      {cfg.letter}
    </span>
  );
}

function TxModal({
  state, cards, onSave, onDelete, onClose,
}: {
  state: Exclude<ModalState, { mode: "closed" }>;
  cards: CreditCard[];
  onSave: (tx: Omit<FinTx, "id">) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const isEdit = state.mode === "edit";
  const init = isEdit ? state.tx : null;

  const [type, setType]         = useState<TxType>(init?.type ?? "saida");
  const [description, setDesc]  = useState(init?.description ?? "");
  const [amount, setAmount]     = useState(init ? String(init.amount) : "");
  const [date, setDate]         = useState(init?.date ?? (state.mode === "add" ? (state.prefillDate ?? "2026-07-01") : "2026-07-01"));
  const [cardId, setCardId]     = useState(init?.cardId ?? (cards[0]?.id ?? ""));
  const [recurrence, setRec]    = useState<FinTx["recurrence"]>(init?.recurrence ?? "none");

  const submit = () => {
    const n = parseFloat(amount.replace(",", "."));
    if (!description.trim() || isNaN(n) || n <= 0) return;
    onSave({
      type, description: description.trim(), amount: n, date,
      cardId: type === "cartao" ? cardId : undefined,
      recurrence,
    });
  };

  return (
    <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-medium" style={{ fontFamily: "'Playfair Display', serif" }}>
            {isEdit ? "Editar movimentação" : "Nova movimentação"}
          </h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-secondary transition-colors text-muted-foreground">
            <X size={14} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Type selector */}
          <div>
            <label className="block text-xs text-muted-foreground mb-2" style={{ fontFamily: "'DM Mono', monospace" }}>Tipo</label>
            <div className="flex gap-2 flex-wrap">
              {TX_TYPES.map(t => (
                <button key={t} onClick={() => setType(t)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all border ${
                    type === t ? "border-transparent text-white font-medium" : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                  style={type === t ? { backgroundColor: TX_CFG[t].color } : {}}>
                  <TxIcon type={t} size={14} />
                  {TX_CFG[t].label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5" style={{ fontFamily: "'DM Mono', monospace" }}>Descrição</label>
            <input type="text" value={description} autoFocus onChange={e => setDesc(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submit()}
              placeholder="Ex: Supermercado"
              className="w-full px-3 py-2.5 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all placeholder:text-muted-foreground/50" />
          </div>

          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5" style={{ fontFamily: "'DM Mono', monospace" }}>Valor (R$)</label>
              <input type="text" value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="0,00"
                className="w-full px-3 py-2.5 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all placeholder:text-muted-foreground/50" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5" style={{ fontFamily: "'DM Mono', monospace" }}>Data</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all" style={{ fontFamily: "'DM Mono', monospace" }} />
            </div>
          </div>

          {/* Card selector (cartao only) */}
          {type === "cartao" && cards.length > 0 && (
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5" style={{ fontFamily: "'DM Mono', monospace" }}>Cartão</label>
              <select value={cardId} onChange={e => setCardId(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all">
                {cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          {/* Recurrence */}
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium">Recorrência mensal</p>
              <p className="text-xs text-muted-foreground">Repete todo mês no mesmo dia</p>
            </div>
            <button
              onClick={() => setRec(r => r === "none" ? "monthly" : "none")}
              className={`w-10 h-6 rounded-full transition-colors relative ${recurrence === "monthly" ? "bg-accent" : "bg-secondary"}`}>
              <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${recurrence === "monthly" ? "left-5" : "left-1"}`} />
            </button>
          </div>

          {/* Actions */}
          <div className={`flex gap-2 pt-1 ${isEdit ? "justify-between" : "justify-end"}`}>
            {isEdit && onDelete && (
              <button onClick={onDelete} className="px-3 py-2.5 text-sm rounded-lg text-destructive hover:bg-destructive/10 transition-colors">Excluir</button>
            )}
            <div className="flex gap-2">
              <button onClick={onClose} className="px-3 py-2.5 text-sm rounded-lg hover:bg-secondary transition-colors text-muted-foreground">Cancelar</button>
              <button onClick={submit} disabled={!description.trim() || !amount}
                className="px-4 py-2.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-80 disabled:opacity-30 transition-all">
                {isEdit ? "Salvar" : "Adicionar"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CardModal({
  state, onSave, onDelete, onClose,
}: {
  state: Exclude<CardModalState, { mode: "closed" }>;
  onSave: (c: Omit<CreditCard, "id">) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const isEdit = state.mode === "edit";
  const init = isEdit ? state.card : null;

  const [name, setName]             = useState(init?.name ?? "");
  const [closingDay, setClosingDay] = useState(String(init?.closingDay ?? 10));
  const [dueDay, setDueDay]         = useState(String(init?.dueDay ?? 17));
  const [limit, setLimit]           = useState(String(init?.limit ?? 5000));
  const [color, setColor]           = useState(init?.color ?? CARD_COLORS[0]);

  const submit = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), closingDay: +closingDay, dueDay: +dueDay, limit: +limit, color });
  };

  return (
    <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-medium" style={{ fontFamily: "'Playfair Display', serif" }}>
            {isEdit ? "Editar cartão" : "Novo cartão"}
          </h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-secondary transition-colors text-muted-foreground">
            <X size={14} />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5" style={{ fontFamily: "'DM Mono', monospace" }}>Nome do cartão</label>
            <input type="text" value={name} autoFocus onChange={e => setName(e.target.value)} placeholder="Ex: Nubank"
              className="w-full px-3 py-2.5 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all placeholder:text-muted-foreground/50" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5" style={{ fontFamily: "'DM Mono', monospace" }}>Fechamento</label>
              <input type="number" min={1} max={28} value={closingDay} onChange={e => setClosingDay(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all" style={{ fontFamily: "'DM Mono', monospace" }} />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5" style={{ fontFamily: "'DM Mono', monospace" }}>Vencimento</label>
              <input type="number" min={1} max={28} value={dueDay} onChange={e => setDueDay(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all" style={{ fontFamily: "'DM Mono', monospace" }} />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5" style={{ fontFamily: "'DM Mono', monospace" }}>Limite</label>
              <input type="number" min={0} value={limit} onChange={e => setLimit(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all" style={{ fontFamily: "'DM Mono', monospace" }} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-2" style={{ fontFamily: "'DM Mono', monospace" }}>Cor</label>
            <div className="flex gap-2">
              {CARD_COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-all ${color === c ? "ring-2 ring-offset-2 ring-offset-card scale-110" : "hover:scale-105"}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div className={`flex gap-2 pt-1 ${isEdit ? "justify-between" : "justify-end"}`}>
            {isEdit && onDelete && (
              <button onClick={onDelete} className="px-3 py-2.5 text-sm rounded-lg text-destructive hover:bg-destructive/10 transition-colors">Excluir</button>
            )}
            <div className="flex gap-2">
              <button onClick={onClose} className="px-3 py-2.5 text-sm rounded-lg hover:bg-secondary transition-colors text-muted-foreground">Cancelar</button>
              <button onClick={submit} disabled={!name.trim()}
                className="px-4 py-2.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-80 disabled:opacity-30 transition-all">
                {isEdit ? "Salvar" : "Adicionar"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DayRow({
  data, onAdd, onEdit,
}: {
  data: DayData;
  onAdd: (date: string) => void;
  onEdit: (tx: FinTx) => void;
}) {
  const { day, dateStr, txs, cartaoTxs, faturas, saldo } = data;
  const saldoPositive = saldo >= 0;
  const saldoColor = saldo === 0
    ? "bg-secondary/40 text-muted-foreground"
    : saldoPositive
    ? "bg-emerald-50 text-emerald-700"
    : "bg-red-50 text-red-700";

  // Build all rows: actual transactions + cartao display rows + fatura rows
  const rows: { label: string; amount: number; color: string; letter: string; tx?: FinTx; isFatura?: boolean; cardName?: string }[] = [
    ...txs.map(tx => ({
      label: tx.description + (tx.recurrence === "monthly" ? " ↻" : ""),
      amount: tx.amount,
      color: TX_CFG[tx.type].color,
      letter: TX_CFG[tx.type].letter,
      tx,
    })),
    ...cartaoTxs.map(tx => ({
      label: tx.description + (tx.recurrence === "monthly" ? " ↻" : ""),
      amount: tx.amount,
      color: TX_CFG.cartao.color,
      letter: TX_CFG.cartao.letter,
      tx,
    })),
    ...faturas.map(f => ({
      label: `Fatura ${f.card.name}`,
      amount: f.amount,
      color: f.card.color,
      letter: "F",
      isFatura: true,
      cardName: f.card.name,
    })),
  ];

  const isEmpty = rows.length === 0;
  const weekDay = format(new Date(dateStr + "T12:00:00"), "EEE", { locale: ptBR });

  return (
    <div className={`flex items-stretch border-b border-border group transition-colors hover:bg-secondary/20 ${isEmpty ? "opacity-50" : ""}`}>
      {/* Day number */}
      <div className="w-14 flex-shrink-0 flex flex-col items-center justify-start pt-3 pb-2 border-r border-border">
        <span className="text-sm font-medium leading-none">{String(day).padStart(2, "0")}</span>
        <span className="text-[10px] text-muted-foreground mt-0.5 uppercase" style={{ fontFamily: "'DM Mono', monospace" }}>{weekDay}</span>
      </div>

      {/* Transactions */}
      <div className="flex-1 py-1 min-w-0">
        {isEmpty ? (
          <div className="px-3 py-2 text-xs text-muted-foreground/50 italic">—</div>
        ) : (
          rows.map((row, i) => (
            <div
              key={i}
              onClick={() => row.tx && onEdit(row.tx)}
              className={`flex items-center gap-2 px-3 py-1.5 ${row.tx ? "cursor-pointer hover:bg-secondary/40 rounded-md mx-1" : ""} transition-colors`}
            >
              <span
                className="inline-flex items-center justify-center rounded-full text-white font-bold flex-shrink-0"
                style={{ width: 20, height: 20, backgroundColor: row.color, fontSize: 8 }}
              >
                {row.letter}
              </span>
              <span className={`text-sm flex-1 truncate ${row.isFatura ? "font-medium" : ""}`}>{row.label}</span>
              <span
                className="text-sm flex-shrink-0 tabular-nums"
                style={{ fontFamily: "'DM Mono', monospace", color: row.color }}
              >
                {formatBRL(row.amount)}
              </span>
            </div>
          ))
        )}
        {/* Add button (shows on hover) */}
        <button
          onClick={() => onAdd(dateStr)}
          className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <Plus size={11} /> adicionar
        </button>
      </div>

      {/* Saldo */}
      <div className={`w-28 sm:w-36 flex-shrink-0 flex items-center justify-end px-3 sm:px-4 text-sm font-medium tabular-nums transition-colors ${saldoColor}`}
        style={{ fontFamily: "'DM Mono', monospace" }}>
        {saldo < 0 ? "-" : ""}{formatBRL(saldo)}
      </div>
    </div>
  );
}

function formatCompact(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1000) {
    const k = abs / 1000;
    const str = k.toFixed(2).replace(/\.?0+$/, "");
    return `${sign}${str}K`;
  }
  if (abs % 1 !== 0) return `${sign}${abs.toFixed(1)}`;
  return `${sign}${Math.round(abs)}`;
}

function saldoCellStyle(value: number, maxPos: number, maxNeg: number): { backgroundColor: string; color?: string } {
  if (value === 0) return { backgroundColor: "transparent" };
  if (value > 0) {
    const t = Math.min(value / (maxPos || 1), 1);
    // pale yellow → light green → rich green
    const r = Math.round(255 - t * 130);
    const g = Math.round(243 - t * 60);
    const b = Math.round(176 - t * 160);
    return { backgroundColor: `rgb(${r},${g},${b})`, color: t > 0.5 ? "#1a4731" : "#3a6a20" };
  }
  // negative
  const t = Math.min(Math.abs(value) / (Math.abs(maxNeg) || 1), 1);
  const r = Math.round(255 - t * 30);
  const g = Math.round(220 - t * 160);
  const b = Math.round(220 - t * 160);
  return { backgroundColor: `rgb(${r},${g},${b})`, color: t > 0.5 ? "#7f1d1d" : "#b91c1c" };
}

function HorizonteTab({
  startDate, transactions, cards, initialBalance,
}: {
  startDate: Date;
  transactions: Parameters<typeof computeMonthData>[2];
  cards: Parameters<typeof computeMonthData>[3];
  initialBalance: number;
}) {
  const TODAY = new Date(2026, 6, 2);
  const numMonths = 3;
  const months = Array.from({ length: numMonths }, (_, i) => addMonths(startDate, i));

  const allMonthData = useMemo(
    () => months.map(m => computeMonthData(m.getFullYear(), m.getMonth(), transactions, cards, initialBalance)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [startDate.toISOString(), transactions, cards, initialBalance],
  );

  const allSaldos = allMonthData.flatMap(data => data.map(d => d.saldo));
  const maxPos = Math.max(0, ...allSaldos);
  const maxNeg = Math.min(0, ...allSaldos);

  const maxDays = Math.max(...allMonthData.map(d => d.length));

  return (
    <div className="bg-card border border-border rounded-xl overflow-x-auto">
      <table className="w-full border-collapse" style={{ fontFamily: "'DM Mono', monospace" }}>
        <thead>
          <tr>
            {months.map((m, mi) => {
              const isCurrentMonth = m.getFullYear() === TODAY.getFullYear() && m.getMonth() === TODAY.getMonth();
              return (
                <th key={mi} colSpan={2}
                  className={`text-sm font-semibold py-3 px-4 border-b border-border text-center ${isCurrentMonth ? "bg-foreground text-background" : "bg-secondary/40 text-foreground"}`}>
                  {format(m, "MMM/yy", { locale: ptBR })}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: maxDays }, (_, rowIdx) => {
            const day = rowIdx + 1;
            return (
              <tr key={day} className="border-b border-border/40 last:border-0">
                {months.map((m, mi) => {
                  const dayData = allMonthData[mi][rowIdx];
                  if (!dayData) {
                    // Month has fewer days — empty cells
                    return <td key={mi} colSpan={2} className="border-l border-border/30 first:border-l-0" />;
                  }

                  const isToday =
                    m.getFullYear() === TODAY.getFullYear() &&
                    m.getMonth() === TODAY.getMonth() &&
                    day === TODAY.getDate();

                  const cellStyle = saldoCellStyle(dayData.saldo, maxPos, maxNeg);

                  return (
                    <React.Fragment key={mi}>
                      <td className={`w-10 text-center text-sm py-2 px-2 border-l border-border/30 first:border-l-0 select-none ${isToday ? "font-bold text-accent" : "text-muted-foreground"}`}>
                        {day}
                      </td>
                      <td className="text-right text-sm py-2 px-3 font-medium tabular-nums transition-colors"
                        style={cellStyle}>
                        {formatCompact(dayData.saldo)}
                      </td>
                    </React.Fragment>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function FinancePage() {
  const { transactions, cards, addTx, updateTx, deleteTx, addCard, updateCard, deleteCard } = useFinance();

  const [tab, setTab] = useState<FinTab>("saldos");
  const [viewDate, setViewDate] = useState(new Date(2026, 6, 1)); // July 2026
  const [txModal, setTxModal]   = useState<ModalState>({ mode: "closed" });
  const [cardModal, setCardModal] = useState<CardModalState>({ mode: "closed" });

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const monthData = useMemo(
    () => computeMonthData(year, month, transactions, cards, 0),
    [year, month, transactions, cards],
  );

  const totals = useMemo(() => {
    const t = { entrada: 0, saida: 0, diario: 0, economia: 0, cartao: 0, fatura: 0 };
    for (const day of monthData) {
      for (const tx of day.txs) t[tx.type] += tx.amount;
      for (const tx of day.cartaoTxs) t.cartao += tx.amount;
      for (const f of day.faturas) t.fatura += f.amount;
    }
    return t;
  }, [monthData]);

  const performance = totals.entrada - totals.saida - totals.diario - totals.economia - totals.fatura;
  const economizado = totals.entrada > 0 ? (totals.economia / totals.entrada) * 100 : 0;
  const custoDeVida = totals.saida + totals.diario + totals.fatura;
  const numDays = getDaysInMonth(viewDate);
  const diarioMedio = totals.diario / (numDays || 1);

  const lastSaldo = monthData[monthData.length - 1]?.saldo ?? 0;

  const saveTx = (tx: Omit<FinTx, "id">) => {
    if (txModal.mode === "add") addTx(tx);
    else if (txModal.mode === "edit") updateTx(txModal.tx.id, tx);
    setTxModal({ mode: "closed" });
  };
  const deleteTxHandler = () => {
    if (txModal.mode === "edit") deleteTx(txModal.tx.id);
    setTxModal({ mode: "closed" });
  };
  const saveCard = (c: Omit<CreditCard, "id">) => {
    if (cardModal.mode === "add") addCard(c);
    else if (cardModal.mode === "edit") updateCard(cardModal.card.id, c);
    setCardModal({ mode: "closed" });
  };
  const deleteCardHandler = () => {
    if (cardModal.mode === "edit") deleteCard(cardModal.card.id);
    setCardModal({ mode: "closed" });
  };

  const monthLabel = format(viewDate, "MMM/yy", { locale: ptBR });

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-10" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-medium tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
            Finanças
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Month nav */}
          <div className="flex items-center gap-1">
            <button onClick={() => setViewDate(d => subMonths(d, 1))}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-medium w-16 text-center capitalize" style={{ fontFamily: "'DM Mono', monospace" }}>
              {monthLabel}
            </span>
            <button onClick={() => setViewDate(d => addMonths(d, 1))}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
              <ChevronRight size={16} />
            </button>
          </div>

          <button onClick={() => setTxModal({ mode: "add" })}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-80 transition-opacity">
            <Plus size={14} /> Movimentação
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-2.5">
          <span className="text-xs text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>saldo final</span>
          <span className={`text-sm font-semibold tabular-nums ${lastSaldo >= 0 ? "text-emerald-600" : "text-red-600"}`}
            style={{ fontFamily: "'DM Mono', monospace" }}>
            {formatBRL(lastSaldo)}
          </span>
        </div>
        <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-2.5">
          <span className="text-xs text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>performance</span>
          <span className={`text-sm font-semibold tabular-nums ${performance >= 0 ? "text-emerald-600" : "text-red-600"}`}
            style={{ fontFamily: "'DM Mono', monospace" }}>
            {performance >= 0 ? "+" : ""}{formatBRL(performance)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-0.5 bg-secondary rounded-lg p-1 mb-6 w-fit">
        {([["saldos", "Saldos"], ["totais", "Totais"], ["cartoes", "Cartões"], ["horizonte", "Horizonte"]] as [FinTab, string][]).map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)}
            className={`px-4 py-1.5 text-xs rounded-md transition-all ${tab === v ? "bg-card text-foreground shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}>
            {l}
          </button>
        ))}
      </div>

      {tab === "saldos" && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Column headers */}
          <div className="flex border-b border-border bg-secondary/40">
            <div className="w-14 flex-shrink-0 px-3 py-2 border-r border-border">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider" style={{ fontFamily: "'DM Mono', monospace" }}>Dia</span>
            </div>
            <div className="flex-1 px-3 py-2">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider" style={{ fontFamily: "'DM Mono', monospace" }}>Movimentações</span>
            </div>
            <div className="w-28 sm:w-36 flex-shrink-0 px-3 sm:px-4 py-2 text-right">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider" style={{ fontFamily: "'DM Mono', monospace" }}>Saldo</span>
            </div>
          </div>

          {/* Day rows */}
          <div className="divide-y-0">
            {monthData.map(day => (
              <DayRow
                key={day.day}
                data={day}
                onAdd={date => setTxModal({ mode: "add", prefillDate: date })}
                onEdit={tx => setTxModal({ mode: "edit", tx })}
              />
            ))}
          </div>
        </div>
      )}

      {tab === "totais" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Movimentações do mês */}
          <div>
            <h2 className="text-xs text-muted-foreground uppercase tracking-widest mb-4" style={{ fontFamily: "'DM Mono', monospace" }}>
              Movimentações do mês
            </h2>
            <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
              {(["entrada","saida","diario","economia"] as TxType[]).map(type => (
                <div key={type} className="flex items-center gap-3 px-4 py-3.5">
                  <TxIcon type={type} size={24} />
                  <span className="text-sm flex-1 capitalize">{TX_CFG[type].label.toLowerCase()}s</span>
                  <span className="text-sm font-medium tabular-nums" style={{ fontFamily: "'DM Mono', monospace", color: TX_CFG[type].color }}>
                    {formatBRL(totals[type])}
                  </span>
                </div>
              ))}
              <div className="flex items-center gap-3 px-4 py-3.5">
                <TxIcon type="cartao" size={24} />
                <span className="text-sm flex-1">Gastos com cartão</span>
                <span className="text-sm font-medium tabular-nums" style={{ fontFamily: "'DM Mono', monospace", color: TX_CFG.cartao.color }}>
                  {formatBRL(totals.cartao)}
                </span>
              </div>
              {totals.fatura > 0 && (
                <div className="flex items-center gap-3 px-4 py-3.5 bg-secondary/30">
                  <span className="inline-flex items-center justify-center rounded-full text-white font-bold flex-shrink-0 text-[8px]"
                    style={{ width: 24, height: 24, backgroundColor: "#C4581B" }}>F</span>
                  <span className="text-sm flex-1 text-muted-foreground">Faturas pagas este mês</span>
                  <span className="text-sm font-medium tabular-nums text-destructive" style={{ fontFamily: "'DM Mono', monospace" }}>
                    -{formatBRL(totals.fatura)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Cálculos */}
          <div>
            <h2 className="text-xs text-muted-foreground uppercase tracking-widest mb-4" style={{ fontFamily: "'DM Mono', monospace" }}>
              Cálculos do mês
            </h2>
            <div className="space-y-3">
              {/* Performance */}
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium">Performance</p>
                  <span className={`text-sm font-semibold tabular-nums ${performance >= 0 ? "text-emerald-600" : "text-red-600"}`}
                    style={{ fontFamily: "'DM Mono', monospace" }}>
                    {performance >= 0 ? "+" : ""}{formatBRL(performance)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {performance >= 0 ? "sobrou dinheiro" : "gastou mais do que entrou"}
                </p>
              </div>

              {/* Economizado */}
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">Economizado</p>
                  <span className="text-sm font-semibold tabular-nums" style={{ fontFamily: "'DM Mono', monospace", color: TX_CFG.economia.color }}>
                    {economizado.toFixed(1)}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(economizado, 100)}%`, backgroundColor: TX_CFG.economia.color }} />
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {economizado >= 20 ? "dentro do ideal (≥20%)" : "abaixo do ideal (20–30%)"}
                </p>
              </div>

              {/* Custo de vida */}
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium">Custo de vida</p>
                  <span className="text-sm font-semibold tabular-nums" style={{ fontFamily: "'DM Mono', monospace" }}>
                    {formatBRL(custoDeVida)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">saídas + diários + cartão</p>
              </div>

              {/* Diário médio */}
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium">Diário médio</p>
                  <span className="text-sm font-semibold tabular-nums" style={{ fontFamily: "'DM Mono', monospace", color: TX_CFG.diario.color }}>
                    {formatBRL(diarioMedio)}<span className="text-muted-foreground font-normal">/dia</span>
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">total diários ÷ {numDays} dias</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "cartoes" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm text-muted-foreground">
              {cards.length} {cards.length === 1 ? "cartão cadastrado" : "cartões cadastrados"}
            </h2>
            <button onClick={() => setCardModal({ mode: "add" })}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-80 transition-opacity">
              <Plus size={14} /> Novo cartão
            </button>
          </div>

          {cards.length === 0 && (
            <div className="py-20 text-center border border-dashed border-border rounded-xl">
              <CreditCardIcon size={32} className="mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum cartão ainda.</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {cards.map(card => {
              const fatura = computeCardFatura(card, year, month, transactions);
              const usedLimit = transactions
                .filter(tx => tx.type === "cartao" && tx.cardId === card.id)
                .reduce((s, tx) => s + tx.amount, 0);
              const usedPct = card.limit > 0 ? Math.min((usedLimit / card.limit) * 100, 100) : 0;

              return (
                <div key={card.id} className="bg-card border border-border rounded-2xl p-5 relative overflow-hidden">
                  {/* Color accent */}
                  <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ backgroundColor: card.color }} />

                  <div className="flex items-start justify-between mb-4 mt-1">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: card.color + "20" }}>
                        <CreditCardIcon size={18} style={{ color: card.color }} />
                      </div>
                      <div>
                        <p className="font-medium">{card.name}</p>
                        <p className="text-xs text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>
                          fecha dia {card.closingDay} · vence dia {card.dueDay}
                        </p>
                      </div>
                    </div>
                    <button onClick={() => setCardModal({ mode: "edit", card })}
                      className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-secondary transition-colors text-muted-foreground">
                      <Pencil size={13} />
                    </button>
                  </div>

                  {/* Limit bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5" style={{ fontFamily: "'DM Mono', monospace" }}>
                      <span>Limite utilizado</span>
                      <span>{formatBRL(usedLimit)} / {formatBRL(card.limit)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${usedPct}%`, backgroundColor: card.color }} />
                    </div>
                  </div>

                  {/* Fatura */}
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <span className="text-xs text-muted-foreground">Fatura {format(viewDate, "MMM/yy", { locale: ptBR })}</span>
                    <span className="text-sm font-semibold tabular-nums" style={{ fontFamily: "'DM Mono', monospace", color: fatura > 0 ? "#C4581B" : "inherit" }}>
                      {fatura > 0 ? formatBRL(fatura) : "R$ 0,00"}
                    </span>
                  </div>

                  {/* Cartao transactions this month */}
                  {(() => {
                    const cardTxs = monthData.flatMap(d => d.cartaoTxs).filter(tx => tx.cardId === card.id);
                    if (cardTxs.length === 0) return null;
                    return (
                      <div className="mt-3 space-y-1">
                        {cardTxs.slice(0, 4).map(tx => (
                          <div key={tx.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <div className="w-1 h-1 rounded-full" style={{ backgroundColor: card.color }} />
                            <span className="flex-1 truncate">{tx.description}</span>
                            <span style={{ fontFamily: "'DM Mono', monospace" }}>{formatBRL(tx.amount)}</span>
                          </div>
                        ))}
                        {cardTxs.length > 4 && (
                          <p className="text-xs text-muted-foreground pl-3">+{cardTxs.length - 4} mais</p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {txModal.mode !== "closed" && (
        <TxModal
          state={txModal}
          cards={cards}
          onSave={saveTx}
          onDelete={txModal.mode === "edit" ? deleteTxHandler : undefined}
          onClose={() => setTxModal({ mode: "closed" })}
        />
      )}
      {cardModal.mode !== "closed" && (
        <CardModal
          state={cardModal}
          onSave={saveCard}
          onDelete={cardModal.mode === "edit" ? deleteCardHandler : undefined}
          onClose={() => setCardModal({ mode: "closed" })}
        />
      )}

      {tab === "horizonte" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>
              saldo acumulado dia a dia · 3 meses
            </p>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: "rgb(125,213,95)" }} /> positivo
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: "rgb(225,60,60)" }} /> negativo
              </span>
            </div>
          </div>
          <HorizonteTab
            startDate={viewDate}
            transactions={transactions}
            cards={cards}
            initialBalance={0}
          />
        </div>
      )}
    </main>
  );
}
