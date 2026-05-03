import { useMemo, useState } from 'react';
import { Card } from '@tremor/react';
import { SearchIcon, SparklesIcon } from '@/components/Icons';

/**
 * /help/glossary — full term & abbreviation reference.
 *
 * Plain-text rendering (no JSX in entries) so search works on the source.
 * Categorised + searchable; each term has abbreviation, full name, plain
 * explanation, optional formula, and optional example with Ozly numbers.
 */

interface Term {
  abbr: string;
  name?: string;
  /** Where it appears in the portal (page hint). */
  where?: string;
  /** Plain-language explanation, 1-3 sentences. */
  explain: string;
  /** Optional formula or rule of thumb. */
  formula?: string;
  /** Optional example (use placeholder values). */
  example?: string;
}

interface Section {
  title: string;
  intro?: string;
  terms: Term[];
}

const SECTIONS: ReadonlyArray<Section> = [
  {
    title: 'Métricas de receita',
    intro: 'Quanto entra, e como isso evolui.',
    terms: [
      {
        abbr: 'MRR',
        name: 'Monthly Recurring Revenue',
        where: 'Cockpit · Finance · Revenue',
        explain:
          'Receita recorrente prevista por mês — soma do valor mensal de todos os planos pagos ativos. Não inclui receitas únicas (one-time).',
        formula: 'soma(mensal_AUD por sub) onde sub.status = paying',
        example:
          'Se você tem 100 ABN ($14.99) + 30 PRO ($19.99) = MRR ≈ $2,099/mês.',
      },
      {
        abbr: 'ARR',
        name: 'Annual Recurring Revenue',
        where: 'Finance Hub',
        explain: 'MRR projetado pra 12 meses — métrica padrão pra tamanho de SaaS.',
        formula: 'ARR = MRR × 12',
      },
      {
        abbr: 'LTV',
        name: 'Lifetime Value',
        where: 'Finance · Revenue',
        explain:
          'Quanto, em média, um cliente paga ao longo do tempo de vida dele. Métrica de saúde — quanto maior o LTV, mais vale gastar pra adquirir.',
        formula: 'LTV ≈ ARPU mensal ÷ churn mensal',
        example: 'ARPU $16 e churn 5%/mês → LTV ≈ $320.',
      },
      {
        abbr: 'ARPU',
        name: 'Average Revenue Per User',
        explain:
          'Receita média por usuário pagante por mês. Tira o efeito de escala — mostra se você cobra bem.',
        formula: 'ARPU = MRR ÷ paying users',
      },
      {
        abbr: 'Burn rate',
        explain:
          'Quanto sai do caixa por mês líquido (custos − receita). Positivo = queimando cash; negativo = lucro.',
        formula: 'burn = avg custo mensal (3 meses) − MRR',
      },
      {
        abbr: 'Profit margin',
        explain:
          'Quanto sobra de cada $1 de receita depois dos custos. Acima de 0 = saudável.',
        formula: '(MRR − custo médio mensal) ÷ MRR',
      },
      {
        abbr: 'Runway',
        explain:
          'Quantos meses você aguenta no ritmo atual antes do cash zerar. <6 meses é zona vermelha.',
        formula: 'cash on hand ÷ burn rate (se positivo)',
      },
    ],
  },
  {
    title: 'Aquisição & marketing',
    intro: 'Quanto custa trazer cliente novo, e por qual canal.',
    terms: [
      {
        abbr: 'CAC',
        name: 'Customer Acquisition Cost',
        where: 'Cockpit · Growth · Sales Funnel',
        explain:
          'Quanto você gasta pra trazer 1 cliente pagante novo. Métrica chave — se CAC > LTV, o negócio sangra dinheiro a cada cliente.',
        formula: 'CAC = total spend em ads ÷ novos paying users no período',
        example: 'Gastou $500 em ads, gerou 10 novos paid → CAC = $50.',
      },
      {
        abbr: 'CAC blended',
        explain:
          'CAC misturando todos os canais (paid + organic). É o "média" — mais realista que olhar só pago, porque organic tem custo zero direto.',
        formula: 'spend total ÷ todos os new paying (incluindo orgânicos)',
      },
      {
        abbr: 'CPA',
        name: 'Cost Per Acquisition',
        explain:
          'Custo pra atingir 1 conversão (signup, install, etc — não necessariamente paid). Subset de CAC mais granular.',
      },
      {
        abbr: 'CTR',
        name: 'Click Through Rate',
        explain: 'Cliques ÷ impressions. Quanto maior, mais relevante o anúncio.',
        formula: 'CTR = clicks ÷ impressions',
        example: '1000 impressions, 30 clicks → CTR = 3%.',
      },
      {
        abbr: 'ROAS',
        name: 'Return On Ad Spend',
        explain:
          'Quanto dólar de receita cada dólar de ad gera. ROAS 3x = $3 de receita por $1 gasto.',
        formula: 'ROAS = receita atribuída ÷ ad spend',
      },
      {
        abbr: 'ROI',
        name: 'Return On Investment',
        explain: 'Lucro ÷ investimento. ROAS é receita; ROI é lucro líquido.',
      },
      {
        abbr: 'ASO',
        name: 'App Store Optimization',
        explain:
          'Otimização de título, screenshots, keywords e descrição na App Store + Play Store pra rankear melhor em buscas.',
      },
      {
        abbr: 'SEO',
        name: 'Search Engine Optimization',
        explain:
          'Otimização do site pra Google rankear bem em buscas orgânicas relevantes.',
      },
      {
        abbr: 'UTM',
        name: 'Urchin Tracking Module',
        where: 'Growth · Attribution',
        explain:
          'Parâmetros na URL (?utm_source=, &utm_medium=, etc) que rastreiam de onde veio o tráfego. Permite atribuir signups a campanhas específicas.',
        example: 'ozly.au/?utm_source=ig&utm_campaign=launch — vem de Instagram, campanha "launch".',
      },
      {
        abbr: 'NPS',
        name: 'Net Promoter Score',
        explain:
          'Satisfação do cliente: "de 0 a 10, recomendaria?". Score = % promotores (9-10) − % detratores (0-6). Acima de 50 = ótimo.',
      },
      {
        abbr: 'KYC',
        name: 'Know Your Customer',
        where: 'Affiliates · Inspector',
        explain:
          'Verificação de identidade do parceiro (afiliado) — TFN/ABN, contrato, banco. Compliance pra payouts legais.',
      },
    ],
  },
  {
    title: 'Funil de vendas — etapas',
    intro: 'Cada etapa do Sales Funnel, em ordem.',
    terms: [
      {
        abbr: 'Impressions',
        explain: 'Número de vezes que seu anúncio foi servido (visto ou não).',
      },
      {
        abbr: 'Clicks',
        explain: 'Cliques no anúncio — saiu da impressão pra ação.',
      },
      {
        abbr: 'Installs',
        explain:
          'App baixado e aberto pela primeira vez. Captado via attribution (UTM + IDFA/GAID + referral).',
      },
      {
        abbr: 'Signups',
        explain: 'Conta criada no app — TFN/ABN cadastrado.',
      },
      {
        abbr: 'Activation',
        explain:
          'Primeira ação significativa em 48h após signup (ex: cadastrou primeiro job). Sinal de que o usuário "entendeu".',
      },
      {
        abbr: 'Trial',
        explain: 'Trial iniciado via RevenueCat — 7 dias grátis.',
      },
      {
        abbr: 'Paid',
        explain: 'Conversão pra plano pago (TFN, ABN ou PRO).',
      },
      {
        abbr: 'Retained 30d',
        explain:
          'Continua ativo após 30 dias (não cancelou e não ficou inativo). Sinal de fit real.',
      },
      {
        abbr: 'Trial→Paid %',
        where: 'Cockpit · Revenue',
        explain: 'Quantos % dos trials viram pagantes. Target inicial: ≥15%.',
        formula: 'trials que viraram paid ÷ trials iniciados no período',
      },
      {
        abbr: 'Churn',
        explain:
          'Cancelamentos no período. Pode ser absoluto (count) ou taxa (%). Mantém abaixo de 5%/mês.',
        formula: 'churn rate = cancelados ÷ paying users no início do período',
      },
    ],
  },
  {
    title: 'Engajamento & retenção',
    terms: [
      {
        abbr: 'DAU',
        name: 'Daily Active Users',
        explain: 'Usuários únicos que abriram o app hoje.',
      },
      {
        abbr: 'WAU',
        name: 'Weekly Active Users',
        explain: 'Usuários únicos que abriram o app na semana.',
      },
      {
        abbr: 'MAU',
        name: 'Monthly Active Users',
        explain: 'Usuários únicos que abriram o app no mês.',
      },
      {
        abbr: 'DAU/MAU',
        explain:
          'Razão DAU sobre MAU — mede stickiness. >50% = engajamento muito alto (Whatsapp-tier). 20-30% = saudável pra utilitário.',
      },
      {
        abbr: 'Cohort',
        explain:
          'Grupo de usuários que se inscreveram no mesmo período (ex: cohort de Janeiro). Permite comparar retenção entre safras.',
      },
      {
        abbr: 'D1/D7/D30',
        explain:
          'Retenção em dia 1, dia 7, dia 30 após signup. D7 acima de 30% é decente pra utilitário.',
      },
    ],
  },
  {
    title: 'Comparações temporais',
    terms: [
      {
        abbr: 'WoW',
        name: 'Week over Week',
        explain: 'Variação vs semana anterior (Δ% comparado a 7 dias atrás).',
      },
      {
        abbr: 'MoM',
        name: 'Month over Month',
        explain: 'Variação vs mês anterior.',
      },
      {
        abbr: 'YoY',
        name: 'Year over Year',
        explain: 'Variação vs mesmo período do ano anterior — tira sazonalidade.',
      },
      {
        abbr: 'YTD',
        name: 'Year to Date',
        explain: 'Acumulado do ano atual até hoje.',
      },
    ],
  },
  {
    title: 'Termos AU & negócio',
    intro: 'Vocabulário fiscal australiano e identificadores legais.',
    terms: [
      {
        abbr: 'ABN',
        name: 'Australian Business Number',
        explain:
          'CNPJ australiano — 11 dígitos. Pra você operar legalmente como sole trader (autônomo) ou empresa.',
      },
      {
        abbr: 'TFN',
        name: 'Tax File Number',
        explain:
          'CPF fiscal australiano — 9 dígitos. Cada pessoa tem o seu, usado pra declaração de imposto.',
      },
      {
        abbr: 'BAS',
        name: 'Business Activity Statement',
        explain:
          'Declaração trimestral pro ATO (Receita Federal AU) — reporta GST coletado, GST pago em despesas, e PAYG.',
      },
      {
        abbr: 'GST',
        name: 'Goods and Services Tax',
        explain:
          'Imposto sobre venda na Austrália — 10%. Você cobra do cliente e repassa pro ATO no BAS.',
      },
      {
        abbr: 'PAYG',
        name: 'Pay As You Go',
        explain:
          'Imposto retido na fonte ou pago em parcelas trimestrais. Funciona como antecipação do imposto anual.',
      },
      {
        abbr: 'ATO',
        name: 'Australian Taxation Office',
        explain: 'Receita Federal australiana.',
      },
      {
        abbr: 'ASIC',
        name: 'Australian Securities & Investments Commission',
        explain: 'Órgão regulador de empresas e mercado de capitais AU.',
      },
      {
        abbr: 'Sole trader',
        explain:
          'Autônomo registrado com ABN — pessoa física fazendo negócio em nome próprio. Equivalente ao MEI brasileiro com mais flexibilidade.',
      },
      {
        abbr: 'Tradie',
        explain:
          'Slang aussie pra quem faz trabalho técnico/manual (encanador, eletricista, paisagista, etc) — público primário do Ozly.',
      },
    ],
  },
  {
    title: 'Plataforma & integrações',
    terms: [
      {
        abbr: 'IAP',
        name: 'In-App Purchase',
        explain:
          'Compra dentro do app via App Store ou Play. Apple/Google ficam com 15-30%, repassam o resto via RevenueCat.',
      },
      {
        abbr: 'RC',
        name: 'RevenueCat',
        explain:
          'Plataforma que abstrai App Store / Play Store / Stripe num único webhook. É a fonte de verdade do Ozly pra subscriptions.',
      },
      {
        abbr: 'Apple Small Business',
        explain:
          'Programa Apple que reduz comissão de 30% pra 15% se você fatura <$1M/ano via App Store. Ozly tá inscrito.',
      },
      {
        abbr: 'ASA',
        name: 'Apple Search Ads',
        where: 'Growth · Channels',
        explain:
          'Plataforma de ads dentro da App Store — você bida em keywords pra aparecer no topo da busca.',
      },
      {
        abbr: 'Promo',
        explain:
          'Acesso grátis dado manualmente via RevenueCat (ex: testers, suporte). Excluído do paid_active KPI pra não inflar receita.',
      },
      {
        abbr: 'Family shared',
        explain:
          'Subscription compartilhada via Apple Family Sharing. Excluída do paid_active — a receita já vem do dono original.',
      },
    ],
  },
  {
    title: 'Engenharia & infra',
    terms: [
      {
        abbr: 'API',
        name: 'Application Programming Interface',
        explain: 'Interface programática — como sistemas conversam entre si.',
      },
      {
        abbr: 'RPC',
        name: 'Remote Procedure Call',
        explain:
          'Função no Supabase chamada do client. Quase toda página do portal chama RPCs (admin_kpi_dashboard, etc).',
      },
      {
        abbr: 'CI/CD',
        name: 'Continuous Integration / Continuous Deployment',
        explain:
          'Pipeline automático: a cada push, roda testes, build, e se passar, faz deploy. Ozly usa GitHub Actions → Cloudflare Pages.',
      },
      {
        abbr: 'OAuth',
        explain:
          'Protocolo padrão pra "Login with Google/Meta" — autoriza apps a acessar dados sem revelar senha.',
      },
      {
        abbr: 'P0/P1/P2/P3',
        explain:
          'Severidade de incident/task. P0 = produção quebrada, ação imediata. P1 = importante. P2 = normal. P3 = nice-to-have.',
      },
      {
        abbr: 'RCA',
        name: 'Root Cause Analysis',
        explain:
          'Análise do que causou um incident — não só o sintoma, a causa raíz. Documentado no campo description do incident.',
      },
      {
        abbr: 'PII',
        name: 'Personally Identifiable Information',
        explain:
          'Dado que identifica pessoa (nome, email, TFN, etc). Trata com cuidado — RLS, criptografia, sem log.',
      },
      {
        abbr: 'RLS',
        name: 'Row Level Security',
        explain:
          'Política do Postgres que filtra linhas por user. No Supabase, garante que cada user só vê seus próprios dados.',
      },
      {
        abbr: 'CSP',
        name: 'Content Security Policy',
        explain:
          'Header HTTP que restringe quais domínios o browser pode carregar (XSS prevention).',
      },
      {
        abbr: 'JWT',
        name: 'JSON Web Token',
        explain:
          'Token criptografado que prova identidade. Supabase auth + Apple Ads usam JWT.',
      },
      {
        abbr: 'IDFA / GAID',
        explain:
          'Apple ID for Advertisers / Google Advertising ID — identificadores opt-in usados pra atribuir installs a campanhas pagas.',
      },
    ],
  },
];

const FLAT = SECTIONS.flatMap((s) => s.terms.map((t) => ({ ...t, section: s.title })));

export function GlossaryPage() {
  const [query, setQuery] = useState('');

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SECTIONS;
    return SECTIONS.map((section) => ({
      ...section,
      terms: section.terms.filter((t) => {
        const haystack = [
          t.abbr,
          t.name,
          t.explain,
          t.formula,
          t.example,
          t.where,
        ]
          .filter((x): x is string => Boolean(x))
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      }),
    })).filter((s) => s.terms.length > 0);
  }, [query]);

  const totalMatches = filteredSections.reduce((sum, s) => sum + s.terms.length, 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex items-start gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-md"
            style={{
              background:
                'linear-gradient(135deg, var(--color-brand-500), var(--color-lime-400))',
            }}
          >
            <SparklesIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-navy-700">
              Glossário & abreviações
            </h1>
            <p className="mt-0.5 text-sm text-navy-400">
              Tradução rápida pra cada termo que aparece nos dashboards.
            </p>
          </div>
        </div>
      </header>

      {/* Search */}
      <div className="ozly-card flex items-center gap-2 bg-white p-2.5">
        <SearchIcon className="ml-1 h-4 w-4 text-navy-300" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Busca: ex CAC, MRR, ABN, churn…"
          className="flex-1 bg-transparent text-sm text-navy-700 placeholder:text-navy-300 focus:outline-none"
          autoFocus
        />
        {query && (
          <span className="rounded-full bg-navy-50 px-2 py-0.5 text-[11px] font-medium text-navy-500">
            {totalMatches} match{totalMatches === 1 ? '' : 'es'}
          </span>
        )}
      </div>

      {/* TOC quick-jump */}
      {!query && (
        <div className="flex flex-wrap gap-1.5 text-xs">
          {SECTIONS.map((s) => (
            <a
              key={s.title}
              href={`#${slugify(s.title)}`}
              className="rounded-md border border-navy-100 bg-white px-2.5 py-1 text-navy-500 transition-colors hover:border-brand-200 hover:text-brand-700"
            >
              {s.title}
            </a>
          ))}
        </div>
      )}

      {/* Sections */}
      {filteredSections.length === 0 ? (
        <Card className="ozly-card">
          <div className="py-10 text-center text-sm text-navy-300">
            Nada encontrado pra &ldquo;{query}&rdquo;. Tenta um termo diferente ou{' '}
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-brand-600 hover:underline"
            >
              limpar busca
            </button>
            .
          </div>
        </Card>
      ) : (
        filteredSections.map((section) => (
          <section key={section.title} id={slugify(section.title)} className="space-y-3">
            <header>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-700">
                {section.title}
              </h2>
              {section.intro && (
                <p className="mt-0.5 text-xs text-navy-400">{section.intro}</p>
              )}
            </header>
            <div className="grid gap-3 md:grid-cols-2">
              {section.terms.map((term) => (
                <TermCard key={`${section.title}-${term.abbr}`} term={term} />
              ))}
            </div>
          </section>
        ))
      )}

      {/* Footer hint */}
      <div className="ozly-card border-navy-100 bg-navy-50/40 p-3 text-[12px] text-navy-500">
        Falta algum termo? Adiciona em{' '}
        <code className="font-mono">src/routes/help/glossary.tsx</code>. Total atual:{' '}
        <strong>{FLAT.length}</strong> entradas em <strong>{SECTIONS.length}</strong>{' '}
        categorias.
      </div>
    </div>
  );
}

function TermCard({ term }: { term: Term }) {
  return (
    <article className="ozly-card bg-white p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-mono text-base font-semibold text-navy-700">
          {term.abbr}
        </h3>
        {term.where && (
          <span className="rounded-full bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium text-brand-700">
            {term.where}
          </span>
        )}
      </div>
      {term.name && (
        <div className="mt-0.5 text-[11px] uppercase tracking-wider text-navy-400">
          {term.name}
        </div>
      )}
      <p className="mt-2 text-sm leading-relaxed text-navy-600">{term.explain}</p>
      {term.formula && (
        <div className="mt-2 rounded-md border border-navy-100 bg-navy-50/60 p-2 font-mono text-[11px] text-navy-700">
          {term.formula}
        </div>
      )}
      {term.example && (
        <div className="mt-2 text-[12px] italic text-navy-500">
          <strong className="not-italic font-medium text-navy-600">Exemplo:</strong>{' '}
          {term.example}
        </div>
      )}
    </article>
  );
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
