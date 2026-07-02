import type { FastifyRequest, FastifyReply } from "fastify";
import { supabaseAnon } from "../lib/supabase.js";

declare module "fastify" {
  interface FastifyRequest {
    userId: string;
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return reply.code(401).send({ error: "Missing or invalid Authorization header" });
  }

  const token = authHeader.slice(7);
  const { data: { user }, error } = await supabaseAnon.auth.getUser(token);

  if (error || !user) {
    return reply.code(401).send({ error: "Unauthorized" });
  }

  request.userId = user.id;
}
