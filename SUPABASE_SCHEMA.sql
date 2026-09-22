-- ═══════════════════════════════════════════════════════════
-- CodeGuard AI — Supabase Database Schema (v2.1)
-- Run this ENTIRE script in Supabase SQL Editor
-- Updated: Gemini 3.5 Flash • 20 reviews/day
-- ═══════════════════════════════════════════════════════════

-- ─── 1. USERS TABLE ───
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  daily_count INTEGER DEFAULT 0,
  last_review_date DATE,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 2. REVIEWS TABLE ───
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  code TEXT NOT NULL,
  language TEXT NOT NULL,
  ai_feedback JSONB,
  ghost_mode BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 3. CHATS TABLE ───
CREATE TABLE IF NOT EXISTS public.chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID REFERENCES public.reviews(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 4. ENABLE ROW LEVEL SECURITY ───
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

-- ─── 5. DROP OLD POLICIES (safe to re-run) ───
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "users_insert_own" ON public.users;
DROP POLICY IF EXISTS "reviews_select_own" ON public.reviews;
DROP POLICY IF EXISTS "reviews_insert_own" ON public.reviews;
DROP POLICY IF EXISTS "reviews_delete_own" ON public.reviews;
DROP POLICY IF EXISTS "chats_select_own" ON public.chats;
DROP POLICY IF EXISTS "chats_insert_own" ON public.chats;

-- ─── 6. RLS POLICIES ───
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "reviews_select_own" ON public.reviews
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "reviews_insert_own" ON public.reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reviews_delete_own" ON public.reviews
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "chats_select_own" ON public.chats
  FOR SELECT USING (
    review_id IN (SELECT id FROM public.reviews WHERE user_id = auth.uid())
  );
CREATE POLICY "chats_insert_own" ON public.chats
  FOR INSERT WITH CHECK (
    review_id IN (SELECT id FROM public.reviews WHERE user_id = auth.uid())
  );

-- ─── 7. AUTO-CREATE PROFILE ON SIGNUP ───
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, username, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'username', SPLIT_PART(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── 8. BACKFILL: Create profiles for existing auth users ───
INSERT INTO public.users (id, username, email)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data ->> 'username', SPLIT_PART(u.email, '@', 1)),
  u.email
FROM auth.users u
LEFT JOIN public.users p ON u.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- ─── 9. INDEXES ───
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON public.reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chats_review_id ON public.chats(review_id);
CREATE INDEX IF NOT EXISTS idx_users_last_review ON public.users(last_review_date);

-- ✅ Schema v2.1 complete! Gemini 3.5 Flash • 20/day
-- Verify: SELECT id, username, email FROM public.users;
