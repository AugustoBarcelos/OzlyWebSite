# Shipping changes — processo de deploy

> `main` é **protegida**: ninguém faz push direto (nem admin). **Toda** mudança sobe via Pull Request.
> Foi isso que faltou um dia: mudança ficou presa numa branch sem merge e o site continuou com o conteúdo antigo.

## TL;DR

```bash
git checkout main && git pull
git checkout -b <tipo>/<nome-curto>        # ex: fix/pricing-typo, feat/org-inbox-merge
# ...edita, commita...
git push -u origin <branch>
gh pr create --fill --base main
# espera a CI ficar verde, então:
gh pr merge --squash --delete-branch
```

Merge na `main` **dispara o deploy automático** (ver tabela). Depois, **hard refresh** (Cmd+Shift+R) na URL pra furar cache de CDN.

## O que cada deploy publica

| Push na `main` mexendo em… | Workflow | Publica em | Host |
|---|---|---|---|
| `src/**`, `public/**`, `index.html`, `package.json`, `vite.config.js`, `scripts/**` | `deploy.yml` | **ozly.au** — site de marketing | GitHub Pages |
| `org-portal/**` | `org-portal.yml` | **app.ozly.au** — portal das empresas | Cloudflare Pages |
| `admin-portal/**` | `admin-portal.yml` | **admin.ozly.au** — portal interno | Cloudflare Pages |

- `deploy.yml` (marketing) roda **só no push pra `main`** (não em PR).
- `org-portal.yml` e `admin-portal.yml` rodam **em PR também** (security gates) e de novo no merge pra deployar. Qualquer gate vermelho **bloqueia o deploy**: secret scan (TruffleHog), SAST (Semgrep), lint, typecheck, vitest, checagem de CSP em `public/_headers`, "sem `console.log`", "sem source maps no dist".

## Passo a passo

1. **Branch a partir da `main`** atualizada (`git checkout main && git pull`).
2. **Commita** com prefixo: `feat:`, `fix:`, `ux:`, `security:`, `docs:`, `chore:`. Mensagem no que mudou e por quê.
3. **Push da branch + abre PR** pra `main` (`gh pr create --fill`).
4. **Espera a CI ficar verde** (gates do org-portal/admin-portal, se você mexeu nessas pastas). Acompanha com `gh pr checks` ou `gh run watch`.
5. **Merge** (`gh pr merge --squash --delete-branch`). **Self-merge é permitido** — não precisa de segundo aprovador (0 reviews exigidos).
6. **Confere o deploy**: `gh run watch` ou aba Actions; depois **hard refresh** na URL ao vivo.

## Regras e pegadinhas

- ❌ **Nunca** `git push origin main` — bloqueado (erro de protected branch). Sempre PR.
- O marketing é **SPA**: textos de pricing/guia ficam no bundle JS → sempre **hard refresh** depois do deploy, senão você vê o bundle antigo em cache.
- Mudou i18n? São 3 arquivos: `src/i18n/{en,es,pt}.json` — **mantenha os três em sincronia**.
- Não commite segredos — a CI do portal faz secret-scan e **reprova o PR**.
- `main` não pode ser deletada nem receber force-push.

## Hotfix / emergência

Mesmo fluxo: branch → PR → merge. **Não há escape hatch de push direto** (proposital, `enforce_admins` ligado). Em emergência real: Settings → Branches → suspende a proteção temporariamente, pusha, e **religa logo em seguida**.

## Verificação pós-deploy (rápida)

- **ozly.au**: abre `ozly.au/#pricing` com hard refresh → confere o conteúdo.
- **app.ozly.au** / **admin.ozly.au**: `gh run list --workflow=org-portal.yml --limit 3` deve mostrar o último run `success`; abre a URL e confere.
