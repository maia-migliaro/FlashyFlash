# FlashyFlash

A Notion-inspired flashcard app built with Next.js, Supabase, and deployed on Vercel. Same stack and visual style as Habit Tracker.

## Features

- 📁 **Folders and subfolders**: Nest decks, with breadcrumbs and search
- 🏷️ **Tags**: Filter and organize cards across folders
- ⚡ **Quick add**: Type definition, Tab, answer, Enter — stay in flow
- 📥 **CSV import**: Paste many cards at once
- 🔍 **Search and filters**: Find cards by text, tag, due, new, suspended
- 📦 **Bulk actions**: Select cards to move, suspend, or delete
- 🧠 **Spaced repetition**: Anki-style SM-2 scheduling
- 📅 **Review today**: Daily queue, capped at 20 new and 100 review cards
- ⌨️ **Keyboard shortcuts**: Rate cards with 1–4 and Space
- 🔄 **Click to flip**: Browse cards in a folder
- 🌓 **Dark mode**: Toggle between light and dark themes
- 📱 **Fully responsive**: Works on phone, tablet, and desktop
- 🔐 **Secure authentication**: User accounts with Supabase

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth)
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Supabase account (free tier works)
- A Vercel account (free tier works) when you are ready to deploy

### 1. Install dependencies

In Terminal:

```bash
cd /Users/user/Documents/Projects/FlashyFlash
npm install
```

### 2. Set up Supabase

1. Go to [https://supabase.com](https://supabase.com) and sign in.
2. Click **New project**.
3. Fill in:
   - **Name:** `FlashyFlash` (or any name)
   - **Database password:** choose a strong password and save it
   - **Region:** pick one close to you
4. Click **Create new project** and wait 1–2 minutes.

#### Create the database tables

1. In the left sidebar, click **SQL Editor**.
2. Click **New query**.
3. Open `supabase/schema.sql` from this project, copy **all** of it, and paste it into the editor.
4. Click **Run** (or press Cmd + Enter).
5. You should see a success message. This creates the `folders` and `flashcards` tables plus security rules.

If you already ran the schema once, also run these in the SQL Editor:
- `supabase/migration_srs.sql` — spaced repetition columns
- `supabase/migration_organization.sql` — subfolders, tags, suspend, extra notes

#### Enable email login

1. In the left sidebar, click **Authentication**.
2. Open **Providers** (or **Sign In / Providers**).
3. Make sure **Email** is enabled.

For easier local testing, turn **off** “Confirm email”:

1. Still under **Authentication**, open **Providers** → **Email**.
2. Disable **Confirm email**.
3. Save.

If you leave confirmation on, new users must click a link in their email before they can sign in.

#### Get your API keys

1. Click the **gear icon** (Project Settings) in the left sidebar.
2. Click **API** (sometimes labeled **Data API** or **API Keys**).
3. Copy these two values:
   - **Project URL** — looks like `https://xxxxxxxxxxxxx.supabase.co`
   - **anon public** key — a long string starting with `eyJ...`
4. Use the **anon** key, **not** the `service_role` key.

### 3. Configure environment variables

In Terminal, from the project folder:

```bash
cd /Users/user/Documents/Projects/FlashyFlash
cp .env.local.example .env.local
```

Open `.env.local` and replace the placeholders:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

This file stays private (it is in `.gitignore`).

### 4. Run the app locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), create an account, then create a folder and some flashcards.

## Database Schema

- **folders**: name, optional description, color, owned by a user
- **flashcards**: definition (front), answer (back), belongs to a folder, plus SM-2 fields (`ease_factor`, `interval_days`, `due_date`, …)

Deleting a folder also deletes its flashcards. Row Level Security ensures users only see their own data.

Deleting a folder also deletes its flashcards. Row Level Security ensures users only see their own data.

## Deploy to Vercel

### 1. Put the code on GitHub

In Terminal:

```bash
cd /Users/user/Documents/Projects/FlashyFlash
git init
git add .
git commit -m "Initial FlashyFlash app"
```

Create a new empty repository on GitHub named `FlashyFlash`, then:

```bash
git remote add origin git@github.com:YOUR_GITHUB_USERNAME/FlashyFlash.git
git branch -M main
git push -u origin main
```

Use your GitHub username in the URL. If SSH is already set up (as on this Mac), this should not ask for a password.

### 2. Import the project in Vercel

1. Go to [https://vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **Add New…** → **Project**.
3. Find **FlashyFlash** and click **Import**.
4. Framework Preset should be **Next.js**. Leave the defaults.

### 3. Add environment variables in Vercel

Before you click Deploy, open **Environment Variables** and add the same two values from `.env.local`:

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | your Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your Supabase anon key |

Add them for Production, Preview, and Development.

### 4. Deploy

Click **Deploy**. When it finishes, you get a URL like `https://flashyflash.vercel.app`.

### 5. Tell Supabase about the live URL

1. In Supabase, go to **Authentication** → **URL Configuration**.
2. Set **Site URL** to your Vercel URL, for example `https://flashyflash.vercel.app`.
3. Under **Redirect URLs**, add:
   - `https://flashyflash.vercel.app/**`
   - `http://localhost:3000/**`
4. Save.

After that, sign-up and login will work on the live site.

## Usage

1. Sign up or sign in.
2. Click **New Folder** and give it a name.
3. Open the folder, then click **New Flashcard**.
4. Fill in the **Definition** (front) and **Answer** (back).
5. Click a card to flip it, or click **Review today** to study due cards.
6. After the answer is shown, rate it: **Again**, **Hard**, **Good**, or **Easy** (keys 1–4).
7. Hover a card or folder to edit or delete it.

## Project Structure

```
├── app/
│   ├── auth/          # Sign in / sign up
│   ├── globals.css    # Global styles
│   ├── layout.tsx     # Root layout
│   └── page.tsx       # Main dashboard
├── components/        # Folders, flashcards, modals, theme
├── lib/
│   └── supabase/      # Supabase client utilities
├── supabase/
│   └── schema.sql     # Database schema
├── types/             # TypeScript types
└── middleware.ts      # Auth middleware
```

## License

MIT
