import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { calendarRoutes } from "./routes/calendar.js";
import { financeRoutes }  from "./routes/finance.js";
import { exchangeRoutes } from "./routes/exchange.js";

const PORT = Number(process.env.PORT ?? 3000);

const fastify = Fastify({
  logger: process.env.NODE_ENV !== "production"
    ? { transport: { target: "pino-pretty", options: { colorize: true } } }
    : true,
});

await fastify.register(rateLimit, {
  max: 100,
  timeWindow: "1 minute",
});

const FRONTEND_URLS = process.env.FRONTEND_URL?.split(",").map(s => s.trim()).filter(Boolean) ?? true;

await fastify.register(cors, {
  origin: FRONTEND_URLS,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
});

fastify.get("/health", () => ({ status: "ok", ts: new Date().toISOString() }));

await fastify.register(calendarRoutes, { prefix: "/calendar" });
await fastify.register(financeRoutes,  { prefix: "/finance"  });
await fastify.register(exchangeRoutes, { prefix: "/exchange" });

try {
  await fastify.listen({ port: PORT, host: "0.0.0.0" });
  fastify.log.info(`API running on port ${PORT}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
