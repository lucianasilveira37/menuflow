
import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Configure as variáveis do Supabase no .env.local");
}

export const supabase = createBrowserClient(
  supabaseUrl,
  supabaseKey
);
