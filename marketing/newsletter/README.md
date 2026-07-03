# Ozly Newsletter — estrutura + como gerar e disparar

O disparo é pelo **admin** (peixes ozly): Messaging ▸ Broadcast → canal **Email** →
segmento **Newsletter (consentidos)** → escreve/cola → cria draft → **Send now**.
Só recebe quem tem `marketing_opt_in=true` **+** leads pré-signup (`newsletter_subscribers`);
cada e-mail já sai com unsubscribe (link + `List-Unsubscribe` one-click). Nada a configurar.

## Estrutura base de uma edição
1. **Subject** — ≤ ~50 caracteres, orientado a benefício. Sem emoji. Nunca chamar o app de "free/grátis" (trial / 1ª invoice são ofertas reais, essas pode citar).
2. **Preheader** — ~90 caracteres (a linha que aparece na prévia da caixa de entrada).
3. **Hook** — 1–2 linhas, direto ao valor.
4. **2–3 blocos de valor** — cada um: mini-título + 1–2 frases concretas e acionáveis.
5. **1 CTA** — uma ação só (abrir o app / conferir X / mandar invoice).
6. **Assinatura** — "— Equipe Ozly". (O unsubscribe é adicionado automático no envio.)
7. **Tamanho:** ~150–180 palavras. Gente skima — menos é mais.

## Voz (resumo do BRAND_VOICE)
Direto, plano, tom australiano-amigável. **Sem emojis.** Público: sole traders com ABN na
Austrália (muitos migrantes LATAM) → PT-BR / EN-AU / ES-LATAM. Só fatos reais de imposto/ATO —
**não invente números**. Nunca "free/grátis" pro app.

## Prompt de geração (Workers AI / Gemini / Claude / eu)
> Escreva UMA edição da newsletter do Ozly para sole traders com ABN na Austrália (muitos
> migrantes LATAM). Voz: direta, plana, australiana-amigável, SEM emojis; nunca chame o app de
> "free/grátis" (pode citar trial / 1ª invoice como ofertas reais). Tópico: {TÓPICO}. Saída:
> subject (≤50 car, benefício), preheader (≤90 car), corpo = hook de 1 linha + 2–3 blocos de
> valor (mini-título + 1–2 frases concretas/acionáveis) + 1 CTA. Máx ~180 palavras. Sem
> encheção. Só fatos reais de imposto/ATO — não invente números. Idiomas: EN (AU), PT-BR, ES-LATAM.

## Ideias de tópicos (backlog)
- Novo ano fiscal / mudança de faixa de imposto (FY2026-27) ← 1ª edição, feita
- Prazos da ATO se aproximando (BAS trimestral, tax return)
- Receber mais rápido: invoice na hora que termina o job
- OCR de recibos: montar as deduções sem dor
- Visa Shield: não estourar o limite de horas do visto
- Golden Hour / hábitos que aumentam a renda

Edições ficam neste diretório como rascunho (ex.: `2026-07-new-financial-year.md`) — a fonte de
envio é o composer do admin; o arquivo é só referência/histórico.
