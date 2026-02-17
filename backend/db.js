require('dotenv').config();
const postgres = require('postgres');

const sql = postgres(process.env.DATABASE_URL, {
    ssl: 'require', // Supabase requires SSL
    max: 10,        // Max connections
    idle_timeout: 20 // Idle connection timeout in seconds
});

// Helper functions to mimic the previous Mongoose logic but with SQL

async function getGame(gameId) {
    // Fetch game details
    const [game] = await sql`
        SELECT * FROM games WHERE id = ${gameId}
    `;

    if (!game) return null;

    // Fetch players
    constplayers = await sql`
        SELECT * FROM players WHERE game_id = ${gameId}
    `;

    // Fetch history (limit 10 for example)
    const history = await sql`
        SELECT * FROM game_history WHERE game_id = ${gameId} ORDER BY played_at DESC LIMIT 20
    `;

    // Map to structure expected by frontend (camelCase)
    return {
        gameId: game.id,
        word: game.word,
        guessedLetters: game.guessed_letters,
        wrongGuesses: game.wrong_guesses,
        status: game.status,
        wordChooser: game.word_chooser,
        players: players.map(p => ({
            sessionId: p.session_id,
            name: p.name,
            isOnline: p.is_online,
            lastSeen: p.last_seen,
            score: p.score
        })),
        history: history.map(h => ({
            word: h.word,
            winner: h.winner,
            timestamp: h.played_at
        }))
    };
}

async function createGame(gameId, sessionId, initialWord = 'hangman') {
    // Transaction to create game and add first player? 
    // Usually game is created then player joins.
    // Let's just create the game row.

    await sql`
        INSERT INTO games (id, word, word_chooser, status)
        VALUES (${gameId}, ${initialWord}, ${sessionId}, 'waiting')
    `;

    return getGame(gameId);
}

async function updateGame(gameId, updates) {
    // updates is an object with keys like word, guessedLetters, status, wordChooser
    // We need to map camelCase to snake_case columns
    const columns = {};
    if (updates.word !== undefined) columns.word = updates.word;
    if (updates.guessedLetters !== undefined) columns.guessed_letters = updates.guessedLetters; // array handled by postgres automatically? or need JSON.stringify? postgres.js handles arrays -> jsonb
    if (updates.wrongGuesses !== undefined) columns.wrong_guesses = updates.wrongGuesses;
    if (updates.status !== undefined) columns.status = updates.status;
    if (updates.wordChooser !== undefined) columns.word_chooser = updates.wordChooser;

    if (Object.keys(columns).length === 0) return null;

    await sql`
        UPDATE games SET ${sql(columns)} WHERE id = ${gameId}
    `;
}

async function joinGame(gameId, sessionId, name) {
    // Check if player exists
    const [existing] = await sql`
        SELECT * FROM players WHERE session_id = ${sessionId} AND game_id = ${gameId}
    `;

    if (existing) {
        await sql`
            UPDATE players SET 
                is_online = TRUE, 
                last_seen = NOW(),
                name = ${name || existing.name}
            WHERE session_id = ${sessionId}
        `;
    } else {
        await sql`
            INSERT INTO players (session_id, game_id, name, is_online, last_seen, score)
            VALUES (${sessionId}, ${gameId}, ${name}, TRUE, NOW(), 0)
        `;
    }
}

async function updatePlayerStatus(sessionId, isOnline) {
    await sql`
        UPDATE players SET is_online = ${isOnline}, last_seen = NOW() WHERE session_id = ${sessionId}
    `;
}

async function addHistory(gameId, word, winner) {
    await sql`
        INSERT INTO game_history (game_id, word, winner, played_at)
        VALUES (${gameId}, ${word}, ${winner}, NOW())
    `;
}

// Reset game function
async function resetGame(gameId, sessionId) {
    await sql`
        UPDATE games SET 
            word = '',
            guessed_letters = '[]'::jsonb,
            wrong_guesses = 0,
            status = 'waiting',
            word_chooser = ${sessionId}
        WHERE id = ${gameId}
    `;
}

module.exports = {
    sql,
    getGame,
    createGame,
    updateGame,
    joinGame,
    updatePlayerStatus,
    addHistory,
    resetGame
};
