# Ostrich Hangman 🦩

A modern real-time multiplayer implementation of the classic Hangman game, built with a Next.js frontend, a FastAPI & Socket.IO backend, Supabase for data persistence, and Google Gemini AI for dynamic word validation.

## 🌟 Features

- **Real-Time Multiplayer**: Play together instantly using WebSockets via `socket.io-client`.
- **Dynamic AI Validation**: Words are validated through a Google Gemini Flash API pipeline to ensure they are real (and family-friendly) words before being committed to the database.
- **Smart Game Persistence**: Sessions and user accounts are managed via Supabase enabling you to rejoin disconnected games.
- **Modern Responsive UI**: Fully responsive fixed layout built with Tailwind CSS, Framer Motion for beautiful animations, and a customized aesthetic (`#059669` brand primary).
- **Accounts & History**: Create an account to track your active games and history across devices.

## 🏗️ Architecture

The project is split into two main directories:

### Frontend (`/frontend`)
- **Framework**: [Next.js](https://nextjs.org/) (App Router format)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **State/Network**: React Hooks + Socket.IO Client
- **Hosting**: Deployed on [Vercel](https://vercel.com/)

### Backend (`/backend`)
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) + Asyncio
- **WebSockets**: [python-socketio](https://python-socketio.readthedocs.io/)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL backend)
- **AI Integration**: Custom validation script utilizing the Google Gemini API (`ai_validator.py`)
- **Hosting**: Deployed on [Render](https://render.com/)

---

## 🚀 Getting Started Locally

### Prerequisites
- Node.js (v18+)
- Python (3.10+)
- A Supabase account and project
- A Google API key for Gemini AI

### 1. Clone the repository
```bash
git clone https://github.com/Nikbe7/ostrich-hangman.git
cd ostrich-hangman
```

### 2. Install Git Hooks
This project includes a pre-push hook that runs all tests and enforces minimum test coverage thresholds (55% backend, 50% frontend) before allowing a push. Install it once after cloning:
```bash
sh scripts/setup.sh
```

### 3. Backend Setup
```bash
cd backend

# Create a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Setup Environment Variables
cp .env.example .env
# Edit .env and add your Supabase and Gemini keys
```

**Run the Backend Server:**
```bash
uvicorn main:socket_app --host 0.0.0.0 --port 8000 --reload
```
*The backend will be available at http://localhost:8000*


### 4. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Setup Environment Variables
cp .env.example .env.local
# Make sure NEXT_PUBLIC_BACKEND_URL points to http://localhost:8000 for local dev
```

**Run the Frontend Development Server:**
```bash
npm run dev
```
*The frontend will be available at http://localhost:3000*

---

## 📦 Deployment Configuration

### Vercel (Frontend)
Make sure to specify the deployed backend URL in your Vercel project environment settings:
- `NEXT_PUBLIC_BACKEND_URL`: `https://your-backend-url.onrender.com`

### Render (Backend)
The backend uses a `render.yaml` configuration for easy deployment on Render's free tier. Make sure to populate the following environment variables in the Render dashboard:
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `GEMINI_API_KEY`

> **Note on UptimeRobot / Monitors**: The backend (`main.py`) exposes a root HTTP endpoint at `GET /` specifically designed for uptime monitors to ping with a 200 OK so that the free tier Render server does not go to sleep.

## 🤝 Contributing
Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.
