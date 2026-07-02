import type { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/auth.js";
import { FinanceService } from "../services/financeService.js";

export async function financeRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", authenticate);

  fastify.get("/transactions", async (req) =>
    new FinanceService(req.userId).getTransactions());

  fastify.post("/transactions", async (req, reply) =>
    reply.code(201).send(await new FinanceService(req.userId).createTransaction(req.body as any)));

  fastify.put("/transactions/:id", async (req) => {
    const { id } = req.params as { id: string };
    return new FinanceService(req.userId).updateTransaction(id, req.body as any);
  });

  fastify.delete("/transactions/:id", async (req) => {
    const { id } = req.params as { id: string };
    await new FinanceService(req.userId).deleteTransaction(id);
    return { ok: true };
  });

  fastify.get("/cards", async (req) =>
    new FinanceService(req.userId).getCards());

  fastify.post("/cards", async (req, reply) =>
    reply.code(201).send(await new FinanceService(req.userId).createCard(req.body as any)));

  fastify.put("/cards/:id", async (req) => {
    const { id } = req.params as { id: string };
    return new FinanceService(req.userId).updateCard(id, req.body as any);
  });

  fastify.delete("/cards/:id", async (req) => {
    const { id } = req.params as { id: string };
    await new FinanceService(req.userId).deleteCard(id);
    return { ok: true };
  });
}
