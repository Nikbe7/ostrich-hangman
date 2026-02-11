const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
    sessionId: { type: String, required: true },
    name: { type: String, required: true },
    isOnline: { type: Boolean, default: true },
    lastSeen: { type: Date, default: Date.now },
    score: { type: Number, default: 0 }
});

const gameSchema = new mongoose.Schema({
    gameId: { type: String, required: true, unique: true },
    word: { type: String }, // The current word to guess
    guessedLetters: [{ type: String }],
    wrongGuesses: { type: Number, default: 0 },
    status: {
        type: String,
        enum: ['waiting', 'playing', 'finished'],
        default: 'waiting'
    },
    players: [playerSchema],
    wordChooser: { type: String }, // sessionId of the player who chose the CURRENT word
    history: [{
        word: String,
        winner: String, // sessionId
        timestamp: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Game', gameSchema);
