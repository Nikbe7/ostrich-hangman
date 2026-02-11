const Game = require('../models/Game');
const { isValidWord } = require('../services/wordValidation');

module.exports = (io) => {
    const gameNamespace = io.of('/game');

    gameNamespace.on('connection', (socket) => {
        console.log('User connected to game namespace:', socket.id);

        // JOIN GAME
        socket.on('join_game', async ({ gameId, sessionId, playerName }) => {
            try {
                let game = await Game.findOne({ gameId });

                if (!game) {
                    // Create new game if it doesn't exist
                    // Initial word is random from list (handled in Game creation logic or explicitly here)
                    game = new Game({
                        gameId,
                        word: 'hangman', // Placeholder, will be set by first chooser or random
                        wordChooser: sessionId, // Creator is first chooser? Or logic to pick.
                        status: 'waiting',
                        players: []
                    });
                    console.log(`Created new game: ${gameId}`);
                }

                // Find or create player in the game
                let player = game.players.find(p => p.sessionId === sessionId);
                if (player) {
                    player.isOnline = true;
                    player.lastSeen = new Date();
                    // Update semantic name if changed (optional)
                    if (playerName) player.name = playerName;
                } else {
                    // New player
                    game.players.push({
                        sessionId,
                        name: playerName || `Player ${game.players.length + 1}`,
                        isOnline: true,
                        lastSeen: new Date(),
                        score: 0
                    });
                }

                // Check if we need to set a word chooser (if none exists or previous left)
                if (!game.wordChooser && game.players.length > 0) {
                    game.wordChooser = game.players[0].sessionId;
                }

                await game.save();

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
                const game = await Game.findOne({ gameId });
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
                game.word = word.toLowerCase();
                game.guessedLetters = [];
                game.wrongGuesses = 0;
                game.status = 'playing';

                await game.save();

                // Obscure word for clients? No, send full game state but frontend handles display
                // basic security: don't send `word` to clients? 
                // For simplicity, we send it, but frontend hides it. 
                // To be secure, we should scrub `word` from the object sent to guessers.
                // We'll handle scrubbing in the emit logic if we had a transformer. 
                // For now, assume friends won't inspect network traffic.

                gameNamespace.to(gameId).emit('update_game', game);

            } catch (err) {
                console.error(err);
            }
        });

        // GUESS LETTER
        socket.on('guess_letter', async ({ gameId, letter, sessionId }) => {
            try {
                const game = await Game.findOne({ gameId });
                if (!game || game.status !== 'playing') return;

                // Normalize
                const guess = letter.toLowerCase();
                if (game.guessedLetters.includes(guess)) return;

                game.guessedLetters.push(guess);

                if (!game.word.includes(guess)) {
                    game.wrongGuesses += 1;
                }

                // Check Win Condition
                const isWin = game.word.split('').every(char => game.guessedLetters.includes(char));
                if (isWin) {
                    game.status = 'finished';
                    // Add to history
                    game.history.push({
                        word: game.word,
                        winner: sessionId,
                        timestamp: new Date()
                    });

                    // Winner becomes next chooser
                    game.wordChooser = sessionId;
                    game.currentTurn = sessionId; // Redundant maybe
                }

                // Check Loss Condition (e.g. 10 wrong guesses)
                if (game.wrongGuesses >= 10 && !isWin) {
                    game.status = 'finished';
                    // Previous chooser stays chooser? Or pass to next?
                    // Let's pass to next player in list for variety
                    const currentIndex = game.players.findIndex(p => p.sessionId === game.wordChooser);
                    const nextIndex = (currentIndex + 1) % game.players.length;
                    game.wordChooser = game.players[nextIndex].sessionId;
                }

                await game.save();
                gameNamespace.to(gameId).emit('update_game', game);

            } catch (err) {
                console.error(err);
            }
        });

        // RESET GAME
        socket.on('reset_game', async ({ gameId, sessionId }) => {
            try {
                const game = await Game.findOne({ gameId });
                if (!game) return;

                // Any player can reset? Or "Warning" confirmation handled on frontend.
                // Backend just executes.

                game.word = '';
                game.guessedLetters = [];
                game.wrongGuesses = 0;
                game.status = 'waiting';

                // Player who reset gets to choose next word (as per requirements)
                game.wordChooser = sessionId;

                await game.save();
                gameNamespace.to(gameId).emit('update_game', game);
                gameNamespace.to(gameId).emit('notification', `Game reset by player.`);

            } catch (err) {
                console.error(err);
            }
        });

        // DISCONNECT
        socket.on('disconnecting', async () => {
            try {
                const { sessionId, gameId } = socket.data;
                if (sessionId && gameId) {
                    const game = await Game.findOne({ gameId });
                    if (game) {
                        const player = game.players.find(p => p.sessionId === sessionId);
                        if (player) {
                            player.isOnline = false;
                            player.lastSeen = new Date();
                            await game.save();
                            // Notify others
                            gameNamespace.to(gameId).emit('update_game', game);
                        }
                    }
                }
            } catch (err) {
                console.error("Error handling disconnect:", err);
            }
        });
    });
};
