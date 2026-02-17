require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_KEY in .env");
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper functions using Supabase JS Client

async function getGame(gameId) {
    // Fetch game details
    const { data: game, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

    if (gameError || !game) return null;

    // Fetch players
    const { data: players, error: playersError } = await supabase
        .from('players')
        .select('*')
        .eq('game_id', gameId);

    // Fetch history
    const { data: history, error: historyError } = await supabase
        .from('game_history')
        .select('*')
        .eq('game_id', gameId)
        .order('played_at', { ascending: false })
        .limit(20);

    // Map to structure expected by frontend (camelCase)
    // Note: Supabase returns columns as they are in DB (snake_case)
    return {
        gameId: game.id,
        word: game.word,
        guessedLetters: game.guessed_letters,
        wrongGuesses: game.wrong_guesses,
        status: game.status,
        wordChooser: game.word_chooser,
        players: (players || []).map(p => ({
            sessionId: p.session_id,
            name: p.name,
            isOnline: p.is_online,
            lastSeen: p.last_seen,
            score: p.score
        })),
        history: (history || []).map(h => ({
            word: h.word,
            winner: h.winner,
            timestamp: h.played_at
        }))
    };
}

async function createGame(gameId, sessionId, initialWord = 'hangman') {
    const { data, error } = await supabase
        .from('games')
        .insert([
            { id: gameId, word: initialWord, word_chooser: sessionId, status: 'waiting' }
        ]);

    if (error) throw error;
    // We don't return the full object here, the caller usually fetches getGame after
}

async function updateGame(gameId, updates) {
    // updates is an object with keys like word, guessedLetters, status, wordChooser
    const columns = {};
    if (updates.word !== undefined) columns.word = updates.word;
    if (updates.guessedLetters !== undefined) columns.guessed_letters = updates.guessedLetters;
    if (updates.wrongGuesses !== undefined) columns.wrong_guesses = updates.wrongGuesses;
    if (updates.status !== undefined) columns.status = updates.status;
    if (updates.wordChooser !== undefined) columns.word_chooser = updates.wordChooser;

    if (Object.keys(columns).length === 0) return null;

    const { error } = await supabase
        .from('games')
        .update(columns)
        .eq('id', gameId);

    if (error) throw error;
}

async function joinGame(gameId, sessionId, name) {
    // Check if player exists
    const { data: existing } = await supabase
        .from('players')
        .select('*')
        .eq('session_id', sessionId)
        .eq('game_id', gameId)
        .single();

    if (existing) {
        await supabase
            .from('players')
            .update({
                is_online: true,
                last_seen: new Date(),
                name: name || existing.name
            })
            .eq('session_id', sessionId);
    } else {
        await supabase
            .from('players')
            .insert([{
                session_id: sessionId,
                game_id: gameId,
                name: name,
                is_online: true,
                last_seen: new Date(),
                score: 0
            }]);
    }
}

async function updatePlayerStatus(sessionId, isOnline) {
    await supabase
        .from('players')
        .update({ is_online: isOnline, last_seen: new Date() })
        .eq('session_id', sessionId);
}

async function addHistory(gameId, word, winner) {
    await supabase
        .from('game_history')
        .insert([{
            game_id: gameId,
            word: word,
            winner: winner,
            played_at: new Date()
        }]);
}

async function resetGame(gameId, sessionId) {
    await supabase
        .from('games')
        .update({
            word: '',
            guessed_letters: [],
            wrong_guesses: 0,
            status: 'waiting',
            word_chooser: sessionId
        })
        .eq('id', gameId);
}

module.exports = {
    supabase,
    getGame,
    createGame,
    updateGame,
    joinGame,
    updatePlayerStatus,
    addHistory,
    resetGame
};
