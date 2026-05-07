# memo.

A free, open-source spaced repetition flashcard app with AI features. Built for language learners, certification students, and anyone who wants to learn and retain knowledge effectively.

## Features

- **Spaced repetition** — Anki-style SRS algorithm with learning and review phases. Cards are scheduled based on how well you remember them.
- **AI card generation** — Paste your notes or upload a PDF and let Claude generate flashcards for you. Choose between definition, Q&A, or translation formats.
- **AI explanations** — Stuck on a card? Get an instant explanation during study sessions.
- **Study streaks** — Track your daily study habit with a streak calendar and shareable streak cards.
- **Dark mode** — Full dark mode support.
- **OAuth + email auth** — Sign in with Google, GitHub, or email/password.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript + Vite |
| Backend | Express + Node.js + TypeScript |
| Database | PostgreSQL via Prisma ORM (hosted on Supabase) |
| AI | Anthropic Claude API |
| Auth | Passport.js (Google OAuth, GitHub OAuth, local) |

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)
- An [Anthropic API key](https://console.anthropic.com)
- Google and/or GitHub OAuth credentials (optional)

### 1. Clone the repo

```bash
git clone https://github.com/yourname/memo.git
cd memo
```

### 2. Install dependencies

```bash
npm install
cd client && npm install
cd ../server && npm install
cd ..
```

### 3. Set up environment variables

Create `server/.env`:

```env
DATABASE_URL=postgresql://...?pgbouncer=true
DIRECT_URL=postgresql://...
ANTHROPIC_API_KEY=your_anthropic_key
SESSION_SECRET=any_long_random_string
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

`DATABASE_URL` should use port 6543 (Supabase pooler). `DIRECT_URL` should use port 5432 (direct connection, used for migrations).

### 4. Run database migrations

```bash
cd server
npx prisma migrate dev
cd ..
```

### 5. Start the app

```bash
npm run dev
```

This starts the frontend on `http://localhost:5173` and the backend on `http://localhost:3001`.

## Project Structure

```
memo/
├── client/          # React frontend
│   └── src/
│       ├── components/
│       ├── pages/
│       └── lib/
├── server/          # Express backend
│   └── src/
│       ├── routes/
│       ├── lib/
│       └── prisma/
└── package.json     # Root dev script
```
