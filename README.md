<div align="center">

![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?style=for-the-badge&logo=tailwindcss)
![Gemini](https://img.shields.io/badge/Gemini-3.5_Flash-4285F4?style=for-the-badge&logo=google)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?style=for-the-badge&logo=supabase)

# 🛡️ CodeGuard AI

### Ship secure code with AI — 20 free reviews/day

Paste any code, get simple clear feedback on bugs, security risks, and a complete fixed solution you can apply in one click.

[Live Demo](https://codeguard-ai-project.vercel.app) • [Features](#features) • [Quick Start](#quick-start)

</div>

---

## ✨ Features

**🔍 AI Review — Simple & Fast**
- Powered by **Gemini 3.5 Flash Lite** — 0.8s avg, 20/day free
- Top 3-5 issues only, beginner-friendly language
- Each issue in **one bordered box** — Severity, Where, Problem, Why it matters
- Security table + **Score /10** + complete fixed code

**💻 Editor That Feels Real**
- Monaco Editor with **inline red squiggles** on buggy lines (hover to see why)
- **Diff view + Apply Fix** — see before/after, apply in one click
- **Ctrl+Enter** to Review, **Esc** to clear
- **Char count + limit bar** — `2,340 / 50,000`
- **Auto language detect** — paste Python, auto switches

**💬 Short Clean Chat**
- Max 120 words, bullet points, easy English
- Ask about any line, get fix snippet
- Clear chat button

**👻 Ghost Mode + Credits**
- Ghost ON = unlimited, never saved, privacy-first
- 20 free reviews/day, server-side enforced

**📊 Dashboard**
- Search by code, filter by language, **sort Critical First**
- **Security trend chart** — last 5 scores 32 → 98, compact clean design
- Expand All / Collapse All, Delete All with toast (no alert)
- Better empty state with vulnerable → fixed illustration + Load Sample CTA

**👤 Account**
- Profile page — editable username, join date, total reviews, credits, logout everywhere
- Toast notifications, copy feedback with green check
- Onboarding tour for first visit (3 steps, skip)

---

## 🛠️ Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, TypeScript, Vite, Tailwind 4, Framer Motion |
| Editor | Monaco Editor, DiffEditor |
| AI | Gemini 3.5 Flash Lite |
| Backend | Node.js, Express |
| DB & Auth | Supabase PostgreSQL + Auth + RLS |
| Icons | Lucide React |

---

## ⚡ Quick Start

**1. Clone & Install**
```bash
git clone https://github.com/your-username/codeguard-ai.git
cd codeguard-ai
npm install
cd server && npm install && cd ..
```

**2. Supabase**
- Create project at supabase.com
- SQL Editor → paste `SUPABASE_SCHEMA.sql` → Run
- Settings → API → copy URL, anon key, service_role key

**3. Env**
Root `.env`:
```
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

`server/.env`:
```
PORT=3001
FRONTEND_URL=http://localhost:5173
GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=gemini-3.5-flash-lite
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**4. Run**
```bash
# Terminal 1
cd server && npm run dev

# Terminal 2
npm run dev
```
Open http://localhost:5173

---

## 🔐 Security

- RLS on all tables — users only see own data
- JWT verification on every API call
- Service key only on backend
- Ghost Mode — memory-only analysis

---

<div align="center">

**Designed & Developed by Owais Ahmed**
Roll No: 2467-2024

</div>
