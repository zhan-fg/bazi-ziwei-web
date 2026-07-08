-- ============================================================
-- Supabase Migration SQL for bazi-ziwei-web
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard)
--
-- NOTE: This uses bazi_ prefix to avoid conflicts with
-- chinese-name-website tables in the same Supabase instance.
-- ============================================================

-- 1. Bazi users table
CREATE TABLE IF NOT EXISTS bazi_users (
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

-- 2. Bazi claim tokens (one-time use for Gumroad payment flow)
CREATE TABLE IF NOT EXISTS bazi_claim_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  chart_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending',  -- pending | verified | claimed | expired
  email TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Bazi processed sales (idempotency for Gumroad webhook)
CREATE TABLE IF NOT EXISTS bazi_processed_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  product_permalink TEXT,
  price INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Bazi chart analysis cache (DeepSeek results)
CREATE TABLE IF NOT EXISTS bazi_chart_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_id TEXT UNIQUE NOT NULL,
  analysis_text TEXT,
  chart_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bazi_users_email ON bazi_users(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bazi_claim_tokens_token ON bazi_claim_tokens(token);
CREATE INDEX IF NOT EXISTS idx_bazi_claim_tokens_chart_id ON bazi_claim_tokens(chart_id);
CREATE INDEX IF NOT EXISTS idx_bazi_processed_sales_sale_id ON bazi_processed_sales(sale_id);
CREATE INDEX IF NOT EXISTS idx_bazi_chart_cache_chart_id ON bazi_chart_cache(chart_id);

-- RLS
ALTER TABLE bazi_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bazi_claim_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE bazi_processed_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE bazi_chart_cache ENABLE ROW LEVEL SECURITY;

-- Allow public reads on chart_cache
CREATE POLICY "Anyone can read bazi chart_cache" ON bazi_chart_cache
  FOR SELECT USING (true);
