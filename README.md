# Historic Graves Trail PWA 

Community heritage trail recording app for the SECreTour EU-funded project. A web-first Progressive Web App for volunteer contributors to capture and curate Points of Interest (POIs) for local heritage trails in Ireland.

**[User Guide](docs/USER_GUIDE.md)** — How to record sites, add details, sync, and export.

## Tech Stack

- **Vite** — build tool
- **React 19** — UI
- **TypeScript** — strict mode
- **Tailwind CSS** — styling
- **React Router v7** — navigation
- **Dexie.js** — IndexedDB for offline storage
- **vite-plugin-pwa** — service worker and PWA manifest

## Getting Started

```bash
pnpm install
pnpm dev
```

## Scripts

- `pnpm dev` — start dev server
- `pnpm build` — production build
- `pnpm test` — run tests
- `pnpm lint` — run ESLint

## Pre-commit

Before committing, run `pnpm test` and `pnpm lint` and fix any failures.
