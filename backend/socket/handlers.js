const db = require('../db');
const { isValidWord } = require('../services/wordValidation');

module.exports = (io) => {
    const gameNamespace = io.of('/game');

    gameNamespace.on('connection', (socket) => {
        console.log('User connected to game namespace:', socket.id);

        // JOIN GAME
        socket.on('join_game', async ({ gameId, sessionId, playerName }) => {
            try {
                // Determine name
                const name = playerName || `Player ${socket.id.substr(0, 4)}`;

                // Check if game exists
                let game = await db.getGame(gameId);

                if (!game) {
                    // Create new game
                    console.log(`Creating new game: ${gameId}`);
                    // Initial creation only creates the game row
                    await db.createGame(gameId, sessionId);
                }

                // Add/Update player in the game
                await db.joinGame(gameId, sessionId, name);

                // Fetch latest state to emit
                game = await db.getGame(gameId);

                // Store session info in socket for disconnect handling
                socket.data.sessionId = sessionId;
                socket.data.gameId = gameId;

                socket.join(gameId);

                // Emit updated game state to everyone in the room
                gameNamespace.to(gameId).emit('update_game', game);

                // Notify user they joined
                socket.emit('joined_success', { gameId, sessionId });

            } catch (err) {
                console.error("Error joining game:", err);
                socket.emit('error', 'Could not join game');
            }
        });

        // SUBMIT WORD
        socket.on('submit_word', async ({ gameId, word, sessionId }) => {
            try {
                const game = await db.getGame(gameId);
                if (!game) return;

                // Verify it's this player's turn to choose
                if (game.wordChooser !== sessionId) {
                    socket.emit('error', 'Not your turn to choose a word');
                    return;
                }

                if (!isValidWord(word)) {
                    socket.emit('error', 'Invalid Swedish word');
                    return;
                }

                // Reset game state for new round
                await db.updateGame(gameId, {
                    word: word.toLowerCase(),
                    guessedLetters: [], // db appends? no, we need to reset. updateGame should handle replace. 
                    // In db.js I implemented updateGame to update columns. 
                    // Postgres.js handles array to jsonb conversion.
                    // But wait, my db.js uses `guessed_letters = updates.guessedLetters`.
                    // If I pass [], it should work.
                    wrongGuesses: 0,
                    status: 'playing'
                });

                const updatedGame = await db.getGame(gameId);
                gameNamespace.to(gameId).emit('update_game', updatedGame);

            } catch (err) {
                console.error("Error submitting word:", err);
            }
        });

        // GUESS LETTER
        socket.on('guess_letter', async ({ gameId, letter, sessionId }) => {
            try {
                let game = await db.getGame(gameId);
                if (!game || game.status !== 'playing') return;

                // Normalize
                const guess = letter.toLowerCase();
                if (game.guessedLetters.includes(guess)) return;

                // Update guessed letters
                const newGuessedLetters = [...game.guessedLetters, guess];
                let newWrongGuesses = game.wrongGuesses;

                if (!game.word.includes(guess)) {
                    newWrongGuesses += 1;
                }

                const updates = {
                    guessedLetters: newGuessedLetters,
                    wrongGuesses: newWrongGuesses
                };

                // Check Win Condition
                const isWin = game.word.split('').every(char => newGuessedLetters.includes(char));
                if (isWin) {
                    updates.status = 'finished';
                    updates.wordChooser = sessionId; // Winner chooses next

                    // Add to history
                    await db.addHistory(gameId, game.word, sessionId);
                }

                // Check Loss Condition (e.g. 10 wrong guesses)
                if (newWrongGuesses >= 10 && !isWin) {
                    updates.status = 'finished';

                    // Pass turn to next player
                    const currentIndex = game.players.findIndex(p => p.sessionId === game.wordChooser);
                    const nextIndex = (currentIndex + 1) % game.players.length;
                    updates.wordChooser = game.players[nextIndex].sessionId;
                }

                await db.updateGame(gameId, updates);

                const updatedGame = await db.getGame(gameId);
                gameNamespace.to(gameId).emit('update_game', updatedGame);

            } catch (err) {
                console.error("Error guessing letter:", err);
            }
        });

        // RESET GAME
        socket.on('reset_game', async ({ gameId, sessionId }) => {
            try {
                await db.resetGame(gameId, sessionId);

                const game = await db.getGame(gameId);
                gameNamespace.to(gameId).emit('update_game', game);
                gameNamespace.to(gameId).emit('notification', `Game reset by player.`);

            } catch (err) {
                console.error("Error resetting game:", err);
            }
        });

        // DISCONNECT
        socket.on('disconnecting', async () => {
            try {
                const { sessionId, gameId } = socket.data;
                if (sessionId && gameId) {
                    await db.updatePlayerStatus(sessionId, false); // isOnline = false

                    // Notify others
                    // Fetch generic game state just to get players list updated?
                    // Ideally we just emit 'player_update'. but 'update_game' is full state sync which is fine.
                    const game = await db.getGame(gameId);
                    if (game) {
                        gameNamespace.to(gameId).emit('update_game', game);
                    }
                }
            } catch (err) {
                console.error("Error handling disconnect:", err);
            }
        });
    });
};
