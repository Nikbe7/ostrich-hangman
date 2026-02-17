require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Allow CORS for the frontend
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "*", // Allow all during dev, strict in prod
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Database
// We use the 'postgres' library via ./db.js
// Connection is established lazily when queries are run.
console.log('Database client initialized');

// Basic Route
app.get('/', (req, res) => {
  res.send('Ostrich Hangman Backend is running');
});

// Socket.io Logic
// Import handlers
require('./socket/handlers')(io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
