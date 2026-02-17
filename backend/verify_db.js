const db = require('./db');

async function test() {
    console.log("Testing Database Connection...");
    const gameId = 'TEST01';
    const sessionId = 'test-session';

    try {
        console.log("1. Creating Game...");
        // Cleanup first just in case
        await db.sql`DELETE FROM games WHERE id = ${gameId}`;

        await db.createGame(gameId, sessionId, 'banan');
        console.log("Game created.");

        console.log("2. Fetching Game...");
        let game = await db.getGame(gameId);
        console.log("Fetched Game:", game ? "OK" : "FAILED");
        if (game.word !== 'banan') console.error("Word mismatch!");

        console.log("3. Joining Game...");
        await db.joinGame(gameId, sessionId, 'TestPlayer');
        game = await db.getGame(gameId);
        if (game.players.length !== 1) console.error("Player join failed!");
        else console.log("Player joined OK.");

        console.log("4. Updating Game...");
        await db.updateGame(gameId, { wrongGuesses: 1, guessedLetters: ['z'] });
        game = await db.getGame(gameId);
        if (game.wrongGuesses !== 1) console.error("Update wrongGuesses failed!");
        if (!game.guessedLetters.includes('z')) console.error("Update guessedLetters failed!");
        else console.log("Update OK.");

        console.log("SUCCESS: Database operations verified.");

    } catch (err) {
        console.error("TEST FAILED:", err);
    } finally {
        await db.sql`DELETE FROM games WHERE id = ${gameId}`; // Cleanup
        process.exit();
    }
}

test();
