# Clubbify

Student Retention Management (SRM) platform built around clubs. Students discover
and join clubs, officers run them, and advisors use resulting engagement signals
to identify and support at-risk students.

## Stack

- Next.js 15 (App Router, Server Actions, React Server Components)
- TypeScript (strict)
- Postgres + Prisma
- Auth.js v5 (NextAuth) — Google SSO with email-domain allowlist
- Tailwind CSS
- Zod validation

## Getting started

```bash
# 1. Install deps
pnpm install

# 2. Copy env and fill in values
cp .env.example .env

# 3. Create DB tables and seed
pnpm db:push
pnpm db:seed

# 4. Run the dev server
pnpm dev
```

Open http://localhost:3000.

## Auth setup

1. Create a Google OAuth client in [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Add `http://localhost:3000/api/auth/callback/google` as an authorized redirect URI.
3. Set `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` in `.env`.
4. Set `AUTH_SECRET` via `openssl rand -base64 32`.
5. The seeded org's `emailDomainAllowlist` is `clubbify.test`. To sign in with your
   real Google account, either add your domain to that allowlist in the DB or set
   `ALLOWED_EMAIL_DOMAINS=yourdomain.com` in `.env`.

## Seeded accounts

- `admin@clubbify.test` — admin
- `advisor1@clubbify.test`, `advisor2@clubbify.test` — advisors with assigned students
- `chess.pres@clubbify.test`, `robo.pres@clubbify.test`, `debate.pres@clubbify.test` — club officers
- `student1..student30@clubbify.test` — students

## Milestone 1 (shipped)

- Google SSO + domain allowlist
- Prisma schema for all v1 models (including points + attendance check-in code)
- Authed shell with role-aware nav
- Clubs directory + detail with join/leave
- Events feed + detail + RSVP
- Officer club overview + event CRUD
- `/me` stub (engagement gauge arrives in M2)

## Upcoming milestones

- M2: attendance (3-way — code / QR / officer roster), per-club points with idempotent awarder, announcements, engagement score, nightly + event-driven recompute.
- M3: advisor dashboard, intervention log, at-risk alerts.
- M4: admin console, digests + reminders, Google Calendar sync.
