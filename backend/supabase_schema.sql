-- Execute this entire script in your Supabase SQL Editor

-- 1. Create the Users table
CREATE TABLE IF NOT EXISTS public.app_users (
    id UUID PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    games TEXT[] DEFAULT '{}'
);

-- 2. Create the Sessions table
CREATE TABLE IF NOT EXISTS public.app_sessions (
    token TEXT PRIMARY KEY,
    user_id UUID REFERENCES public.app_users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create the Words table
CREATE TABLE IF NOT EXISTS public.app_words (
    word TEXT PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create the Games table
CREATE TABLE IF NOT EXISTS public.app_games (
    id TEXT PRIMARY KEY,
    state JSONB NOT NULL DEFAULT '{}'::jsonb,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create Indexes for performance
CREATE INDEX IF NOT EXISTS idx_app_users_username ON public.app_users(username);
CREATE INDEX IF NOT EXISTS idx_app_sessions_user_id ON public.app_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_app_games_last_activity ON public.app_games(last_activity);

