# RampReady — FBO Management Dashboard

RampReady is a web-based FBO (Fixed Base Operator) management dashboard for small aviation airports. It provides two views: a CSR Dashboard for customer service reps and a Line Crew mobile view for ramp workers.

## Tech Stack

- React 19 + Vite
- Tailwind CSS v4
- React Router v7

## Getting Started

```bash
npm install
npm run dev
```

The app runs at `http://localhost:5173`.

## Views

- `/dashboard` — CSR Dashboard (desktop): arrival queue, fuel prices, FBO settings
- `/linecrew` — Line Crew view (mobile-optimized): next inbound, countdown timer, ADS-B data

## Deploying to Vercel

### Option 1: Vercel CLI

```bash
npm i -g vercel
vercel
```

### Option 2: Git Integration

1. Push this repo to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import the repository
4. Vercel auto-detects Vite — no config needed
5. Deploy

### SPA Routing

Create `vercel.json` in the project root to handle client-side routing:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Custom Domain

After deploying, add `getrampready.com` in your Vercel project settings under **Domains**.

## Project Structure

```
src/
  components/    # Reusable UI components
  context/       # React context for shared state
  data/          # Seed data
  pages/         # Route-level page components
```
