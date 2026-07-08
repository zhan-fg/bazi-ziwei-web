import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Public client — for client-side reads
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client — for server-side writes (bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

// ═══════════════════════════════════════════════════════════
// Table names (bazi_ prefix to avoid conflict with
// chinese-name-website which shares this Supabase instance)
// ═══════════════════════════════════════════════════════════
export const TABLES = {
  users: "bazi_users",
  claimTokens: "bazi_claim_tokens",
  processedSales: "bazi_processed_sales",
  chartCache: "bazi_chart_cache",
} as const;

// ============================================================
// Database schema (run in Supabase SQL Editor):
// ============================================================
/*
-- Bazi users table
CREATE TABLE bazi_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anonymous_id TEXT UNIQUE NOT NULL,
  email TEXT,
  free_uses_remaining INT DEFAULT 3,
  report_unlocks_remaining INT DEFAULT 0,
  unlocked_charts TEXT[] DEFAULT '{}',
  subscription_status TEXT DEFAULT 'none',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bazi claim tokens (one-time use for Gumroad payment flow)
CREATE TABLE bazi_claim_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  chart_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending',  -- pending | verified | claimed | expired
  email TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bazi processed sales (idempotency for Gumroad webhook)
CREATE TABLE bazi_processed_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  product_permalink TEXT,
  price INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bazi chart analysis cache (DeepSeek results)
CREATE TABLE bazi_chart_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_id TEXT UNIQUE NOT NULL,
  analysis_text TEXT,
  chart_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_bazi_users_email ON bazi_users(email) WHERE email IS NOT NULL;
CREATE INDEX idx_bazi_claim_tokens_token ON bazi_claim_tokens(token);
CREATE INDEX idx_bazi_claim_tokens_chart_id ON bazi_claim_tokens(chart_id);
CREATE INDEX idx_bazi_processed_sales_sale_id ON bazi_processed_sales(sale_id);
CREATE INDEX idx_bazi_chart_cache_chart_id ON bazi_chart_cache(chart_id);

-- RLS
ALTER TABLE bazi_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bazi_claim_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE bazi_processed_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE bazi_chart_cache ENABLE ROW LEVEL SECURITY;
*/
