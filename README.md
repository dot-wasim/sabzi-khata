# 🥬 Sabzi Khata

Vegetable Purchase, Sales & Ledger Tracker for Hussain Foods.

## Quick Start

```bash
# Install all dependencies
cd backend && npm install && cd ../frontend && npm install && cd ..

# Set up database
cd backend && npx prisma migrate dev --name init && npx prisma db seed && cd ..

# Run both servers
npm run dev
```

- **Backend**: http://localhost:3001
- **Frontend**: http://localhost:5173

## Default Logins

| User | Username | Password | Role |
|------|----------|----------|------|
| Father | owner | owner123 | OWNER |
| Brother | market | market123 | MARKET_ENTRY |

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + React Query
- **Backend**: Node.js + Express + TypeScript + Prisma ORM
- **Database**: SQLite (dev) / PostgreSQL (prod)
