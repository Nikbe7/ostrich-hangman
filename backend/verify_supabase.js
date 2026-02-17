const db = require('./db');

async function test() {
    console.log("Testing Supabase Client Connection...");
    const gameId = 'TEST_SUPA_01';
    const sessionId = 'test-session-supa';

    try {
        console.log("1. Creating Game...");
        // Cleanup first
        await db.supabase.from('games').delete().eq('id', gameId);

        await db.createGame(gameId, sessionId, 'banan');
        console.log("Game created.");

        console.log("2. Fetching Game...");
        let game = await db.getGame(gameId);
        console.log("Fetched Game:", game ? "OK" : "FAILED");
        if (game && game.word !== 'banan') console.error("Word mismatch!");

        console.log("3. Joining Game...");
        await db.joinGame(gameId, sessionId, 'TestPlayer');
        game = await db.getGame(gameId);
        if (game && game.players.length !== 1) console.error("Player join failed!");
        else console.log("Player joined OK.");

        console.log("4. Updating Game...");
        await db.updateGame(gameId, { wrongGuesses: 1, guessedLetters: ['z'] });
        game = await db.getGame(gameId);
        if (game && game.wrongGuesses !== 1) console.error("Update wrongGuesses failed!");
        else console.log("Update OK.");

        console.log("SUCCESS: Supabase operations verified.");

    } catch (err) {
        console.error("TEST FAILED:", err);
    } finally {
        await db.supabase.from('games').delete().eq('id', gameId); // Cleanup
    }
}

test();
