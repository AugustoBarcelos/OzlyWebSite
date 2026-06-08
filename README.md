# Ozly — Website & Portals

Marketing site e portais do Ozly (domínio canônico **ozly.au**). React 19 + Vite + Tailwind CSS, deploy via Cloudflare Pages.

## Estrutura

| Pasta | Descrição |
|---|---|
| `src/` | Site de marketing (React + React Router) — landing, pricing, help, etc. |
| `public/` | Assets estáticos servidos como estão |
| `admin-portal/` | Portal admin (`admin.ozly.au`) — ver [admin-portal/README.md](admin-portal/README.md) |
| `org-portal/` | Portal de empresas (`app.ozly.au`) — ver [org-portal/docs/ORG_PORTAL_OVERVIEW.md](org-portal/docs/ORG_PORTAL_OVERVIEW.md) |
| `cloudflare-worker/` | Worker de OG tags para `ozly.au/v/:code` — ver [cloudflare-worker/README.md](cloudflare-worker/README.md) |
| `marketing/` | Material de marca/handoff — ver [marketing/CMO_BRAND_HANDOFF.md](marketing/CMO_BRAND_HANDOFF.md) |
| `scripts/` | Scripts de build (ex: `postbuild.js`) |

## Desenvolvimento

```bash
npm install
npm run dev      # servidor de dev (Vite)
npm run build    # build de produção + postbuild
npm run preview  # preview do build
npm run lint     # ESLint
```

Configuração via `.env.local` (ver `.env.example`).
