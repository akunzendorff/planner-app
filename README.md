# Planner App

Planejador pessoal para organizar calendário, metas, finanças e intercâmbio.

## Módulos

- **Dashboard** — visão geral
- **Calendário** — eventos do dia a dia
- **Metas** — com tarefas vinculadas a eventos
- **Finanças** — transações, cartões de crédito, saldo mensal
- **Intercâmbio** — planejamento de viagem (roteiro, wishlist, orçamento)

## Stack

- React 18 + TypeScript
- Vite + Tailwind CSS v4
- shadcn/ui + Radix UI
- Supabase (auth + banco)
- Fastify (API)

## Como rodar

```bash
npm install
npm run dev
```

Configure a URL da API em `.env`:
```
VITE_API_URL=http://localhost:3000
```
