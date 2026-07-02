import type { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/auth.js";
import { CalendarService } from "../services/calendarService.js";

export async function calendarRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", authenticate);

  fastify.get("/events", async (req) => {
    return new CalendarService(req.userId).getEvents();
  });

  fastify.post("/events", async (req, reply) => {
    const body = req.body as any;
    const event = await new CalendarService(req.userId).createEvent(body);
    return reply.code(201).send(event);
  });

  fastify.put("/events/:id", async (req) => {
    const { id } = req.params as { id: string };
    const body = req.body as any;
    return new CalendarService(req.userId).updateEvent(id, body);
  });

  fastify.delete("/events/:id", async (req) => {
    const { id } = req.params as { id: string };
    await new CalendarService(req.userId).deleteEvent(id);
    return { ok: true };
  });

  fastify.get("/goals", async (req) => {
    return new CalendarService(req.userId).getGoals();
  });

  fastify.post("/goals", async (req, reply) => {
    const goal = await new CalendarService(req.userId).createGoal(req.body as any);
    return reply.code(201).send(goal);
  });

  fastify.put("/goals/:id", async (req) => {
    const { id } = req.params as { id: string };
    return new CalendarService(req.userId).updateGoal(id, req.body as any);
  });

  fastify.delete("/goals/:id", async (req) => {
    const { id } = req.params as { id: string };
    await new CalendarService(req.userId).deleteGoal(id);
    return { ok: true };
  });
}
