import type { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/auth.js";
import { ExchangeService } from "../services/exchangeService.js";

export async function exchangeRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", authenticate);

  fastify.get("/config",  async (req) => (await new ExchangeService(req.userId).getConfig()) ?? null);
  fastify.put("/config",  async (req) => new ExchangeService(req.userId).setConfig(req.body as any));

  fastify.get("/places",       async (req) => new ExchangeService(req.userId).getPlaces());
  fastify.post("/places",      async (req, reply) => reply.code(201).send(await new ExchangeService(req.userId).createPlace(req.body as any)));
  fastify.put("/places/:id",   async (req) => new ExchangeService(req.userId).updatePlace((req.params as any).id, req.body as any));
  fastify.delete("/places/:id",async (req) => { await new ExchangeService(req.userId).deletePlace((req.params as any).id); return { ok: true }; });

  fastify.get("/items",        async (req) => new ExchangeService(req.userId).getItems());
  fastify.post("/items",       async (req, reply) => reply.code(201).send(await new ExchangeService(req.userId).createItem(req.body as any)));
  fastify.put("/items/:id",    async (req) => new ExchangeService(req.userId).updateItem((req.params as any).id, req.body as any));
  fastify.delete("/items/:id", async (req) => { await new ExchangeService(req.userId).deleteItem((req.params as any).id); return { ok: true }; });

  fastify.get("/transactions",        async (req) => new ExchangeService(req.userId).getTxs());
  fastify.post("/transactions",       async (req, reply) => reply.code(201).send(await new ExchangeService(req.userId).createTx(req.body as any)));
  fastify.put("/transactions/:id",    async (req) => new ExchangeService(req.userId).updateTx((req.params as any).id, req.body as any));
  fastify.delete("/transactions/:id", async (req) => { await new ExchangeService(req.userId).deleteTx((req.params as any).id); return { ok: true }; });
}
