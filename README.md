# ResumeIQ — AI-Powered ATS Resume Analyzer

> Know your resume score before the recruiter does.

ResumeIQ analyzes your resume against any job description using Google Gemini Vision AI and returns an ATS match score, keyword gaps, a professional review, and improvement suggestions — instantly.

---

## Features

- **ATS Match Score** — Circular progress ring (green/yellow/red)
- **Keyword Analysis** — Matched vs. missing keywords side by side
- **Professional Review** — Qualitative AI assessment of your fit
- **Smart Suggestions** — Numbered, actionable improvement tips
- **Analysis History** — Save and revisit past analyses (Firebase Firestore)
- **Dark Mode** — Full light/dark theme support
- **Anonymous** — No account or login required

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS |
| Icons | lucide-react |
| Forms | react-hook-form + zod |
| Toasts | sonner |
| AI | Google Gemini 1.5 Flash |
| Database | Firebase Firestore |
| PDF | pdfjs-dist (browser-side) |

---

## Project Structure

```
resumeiq/
├── app/
│   ├── layout.tsx          # Root layout with Header, Footer, ThemeProvider
│   ├── page.tsx            # Landing page
│   ├── analyze/page.tsx    # Analyzer (core product)
│   ├── history/page.tsx    # Past analyses
│   ├── about/page.tsx      # How it works + FAQ
│   └── copyright/page.tsx  # Legal page
├── components/
│   ├── Header.tsx          # Sticky nav with dark mode toggle
│   ├── Footer.tsx          # Footer with copyright
│   ├── ThemeProvider.tsx   # next-themes wrapper
│   ├── ScoreRing.tsx       # Animated SVG circular score ring
│   └── ResultTabs.tsx      # Review / Keywords / Suggestions tabs
├── lib/
│   ├── firebase.ts         # Firebase app initialization
│   ├── db.ts               # Firestore CRUD operations
│   ├── gemini.ts           # Gemini API calls (review + ATS score)
│   └── pdfUtils.ts         # PDF → base64 image conversion (PDF.js)
├── types/
│   └── index.ts            # Shared TypeScript types
├── public/
│   └── pdf.worker.min.mjs  # PDF.js worker (copied from node_modules)
└── .env.local              # Your API keys (never commit this)
```

---

## Setup

### 1. Clone & Install

```bash
cd resumeiq
npm install
```

### 2. Get API Keys

**Google Gemini API:**
1. Go to [Google AI Studio](https://aistudio.google.com)
2. Create a new API key
3. Copy it

**Firebase:**
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Add a Web app
4. Copy the config values
5. Go to **Firestore Database** → Create database (start in test mode for development)

### 3. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in your keys:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Usage

1. Go to `/analyze`
2. Upload your PDF resume (max 5MB)
3. Paste the job description (min 100 characters)
4. Select your target domain
5. Click **Analyze Resume**
6. View your score, keywords, review, and suggestions
7. Click **Save Analysis** to store it in Firestore history

---

## Deployment (Vercel)

1. Push to GitHub
2. Import the repo at [vercel.com](https://vercel.com)
3. Add all `NEXT_PUBLIC_*` environment variables in the Vercel dashboard
4. Deploy

---

## License

© 2026 ResumeIQ. All rights reserved. Developed by Bablou.
