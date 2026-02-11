require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const mongoose = require('mongoose');
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

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.warn("MongoDB URI not provided. Database features will not work.");
} else {
  mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));
}

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
