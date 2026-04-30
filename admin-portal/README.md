# Ozly Admin Portal

Internal admin portal for Ozly. See [BRIEFING.md](./BRIEFING.md) for the full spec
(architecture, security layers, schema, telas).

## Run

```sh
pnpm install
cp .env.example .env.local   # fill values locally — never commit
pnpm dev
```

Env vars in `.env.local` (gitignored) for local dev, or **Cloudflare Pages env
vars** for deployed environments. Service role keys never live here.

## Scripts

- `pnpm dev` — Vite dev server
- `pnpm build` — type-check + production build (no source maps)
- `pnpm preview` — preview the prod build locally
- `pnpm lint` — ESLint with banned-syntax rules (BRIEFING § 4)
- `pnpm typecheck` — `tsc --noEmit`
