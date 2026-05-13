# ExoKids Web

P0 frontend scaffold for the ExoKids web app.

## Runtime

- Use npm as the only package manager for this app. Do not use pnpm or yarn.
- Use Node.js 22.x LTS.
- Known issue: `corepack enable` can report `not found` in a portable Node.js environment. It is safe to ignore when npm is available.

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

The Vite dev server runs at http://localhost:5173 and proxies `/api` requests to
http://localhost:8000.

## Checks

```bash
npm run lint
npm run build
```
