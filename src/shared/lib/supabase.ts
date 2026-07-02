import { createClient } from "@supabase/supabase-js";
import { projectId, publicAnonKey } from "../../config/supabase";

export const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey,
);
