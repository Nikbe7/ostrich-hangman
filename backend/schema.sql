-- Create Tables for Ostrich Hangman

-- Enable UUID extension if we want to use UUIDs, but we are using string IDs for games (e.g. 6 chars)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DROP TABLE IF EXISTS game_history;
DROP TABLE IF EXISTS players;
DROP TABLE IF EXISTS games;

CREATE TABLE games (
    id TEXT PRIMARY KEY, -- The Game ID (e.g., A1B2C3)
    word TEXT,
    guessed_letters JSONB DEFAULT '[]'::jsonb,
    wrong_guesses INT DEFAULT 0,
    status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
    word_chooser TEXT, -- sessionId of current chooser
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE players (
    session_id TEXT PRIMARY KEY,
    game_id TEXT REFERENCES games(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_online BOOLEAN DEFAULT TRUE,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    score INT DEFAULT 0
);

CREATE TABLE game_history (
    id SERIAL PRIMARY KEY,
    game_id TEXT REFERENCES games(id) ON DELETE CASCADE,
    word TEXT NOT NULL,
    winner TEXT, -- sessionId of winner
    played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_players_game_id ON players(game_id);
CREATE INDEX idx_history_game_id ON game_history(game_id);
