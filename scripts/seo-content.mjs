/**
 * Prerendered SEO content per route × language, consumed by postbuild.js.
 *
 * This is what crawlers index — each language is written natively (not
 * translated literally) and tuned for what that audience actually types
 * into Google: EN "sole trader invoice app", PT "como emitir invoice ABN
 * austrália", ES "facturar con ABN en australia". Page <title> and meta
 * description come from src/i18n/<lang>.json → seo.* (single source of
 * truth shared with the client-side useSeoMeta hook).
 *
 * H1s here mirror the visible page intent; bodies are real, useful copy —
 * never keyword soup. If you add a route, add all three languages.
 */

const STORES = `<p><a href="https://apps.apple.com/au/app/ozly/id6760398649">App Store</a> · <a href="https://play.google.com/store/apps/details?id=com.augusto.ozly">Google Play</a></p>`;

export const content = {
  /* ════════════════════════════ HOME ════════════════════════════ */
  "/": {
    en: {
      h1: 'Invoicing &amp; Tax Tracker<span class="accent">for Australian Sole Traders</span>',
      body: `
      <p class="sub">Send invoices, scan receipts, and stay on top of GST and PAYG tax — on iOS and Android.</p>
      <p>Ozly is the all-in-one mobile app built for Australian sole traders, independent contractors, tradies, freelancers, and small-business owners. From the moment you register an ABN, Ozly helps you run every financial side of your business: unlimited professional invoices, AI receipt scanning, ATO-aligned expense tracking, real-time GST estimates, PAYG income-tax projections, jobs and quotes, contractor payments, and end-of-financial-year reporting — all from your phone, on iOS or Android, with encrypted cloud sync across devices.</p>

      <h2>Invoicing without limits</h2>
      <p>Create and send professional invoices in under a minute. Add line items, GST (10%), PAYG withholding, due dates, purchase orders, and custom notes. Attach your logo and payment details. Track payment status in real time, send automatic reminders for overdue invoices, and keep a clean audit trail. There are no per-invoice fees and no percentage taken from your earnings — send your first invoice on us, then unlock unlimited invoicing on a simple monthly plan.</p>

      <h2>AI-powered receipt scanning</h2>
      <p>Scan any paper or digital receipt with your phone camera. Ozly's AI reads the total, date, supplier, GST amount, and product category automatically, so you never type an expense by hand. Matched receipts are saved to encrypted cloud storage and linked back to the right job or tax period. At tax time, everything is already sorted, categorised, and export-ready.</p>

      <h2>Expense tracking aligned with the ATO</h2>
      <p>Every expense category in Ozly maps to a deductible classification recognised by the Australian Taxation Office: motor vehicle, tools and equipment, phone and internet, home office, subscriptions, travel, uniforms, training, and more. Add mileage with the built-in logbook, split mixed-use purchases, and attach notes for audit evidence. Your deductions stay defensible, so at EOFY you pay what you owe — and not a dollar more.</p>

      <h2>Live GST, BAS &amp; PAYG estimates</h2>
      <p>Ozly's tax dashboard updates every time you invoice or spend. See exactly what you owe in GST this quarter, how your BAS is shaping up, and your projected PAYG instalment for the year. Get alerts before you cross the $75,000 GST registration threshold. Export BAS-ready summaries directly to your accountant or straight into the ATO Business Portal.</p>

      <h2>Jobs, quotes &amp; contractor payments</h2>
      <p>Quote jobs, schedule work, track materials, and convert accepted quotes to invoices with one tap. Manage subbies and contractors, capture their ABN details, track what you paid them across the year, and generate Taxable Payments Annual Report (TPAR) data when the ATO needs it. Ideal for cleaners, tradies, delivery drivers, bike mechanics, hair stylists, freelance consultants, and cafe owners with a second income.</p>

      <h2>Built specifically for Australian sole traders</h2>
      <p>Ozly is not a generic bookkeeping tool retrofitted for Australia. It is designed from day one around the Australian Taxation Office, the Australian Privacy Principles, and the realities of sole-trader life. The app ships in English, Portuguese, and Spanish so newcomers and migrant workers feel at home. Whether you are cleaning homes in Sydney, fixing bikes in Melbourne, delivering food in Brisbane, styling hair in Perth, or running a cafe on the side in Adelaide, Ozly keeps your books tidy, your GST tracked, and your tax reports ready for the ATO.</p>

      <h2>Simple, transparent pricing</h2>
      <p>Your first invoice is on us — no card required. A plan then unlocks unlimited invoices, expenses, receipts, and live tax estimates, plus advanced reports, multi-business support, contractor batch payments, and priority human support — for a flat, transparent monthly price. No lock-in contracts, no setup fees, no surprise charges, cancel anytime. Your data is always yours, always exportable.</p>

      <h2>Private, secure, Australian-owned</h2>
      <p>Your data is encrypted in transit and at rest. You decide what syncs to the cloud and what stays on-device. We never sell your data. Ozly is operated by Ozly Pty Ltd, based in Australia, and complies with the Privacy Act 1988 and the Australian Privacy Principles. Delete your account at any time and every byte of your data is permanently purged within 30 days.</p>

      <h2>Get started with Ozly in 2 minutes</h2>
      <p>Install Ozly on your phone, sign up with Apple, Google, or email, add your ABN, and send your first invoice before the kettle boils. No credit card required, no demo call, no trial timer.</p>
      <p><a href="https://apps.apple.com/au/app/ozly/id6760398649">Download Ozly on the App Store</a> · <a href="https://play.google.com/store/apps/details?id=com.augusto.ozly">Get Ozly on Google Play</a></p>
      <p>Need more detail? Read the full <a href="/guide/">Ozly user guide</a>, browse the <a href="/support/">Support &amp; FAQ</a>, or review our <a href="/privacy-policy/">Privacy Policy</a> and <a href="/terms-of-use/">Terms of Use</a>.</p>
      `,
    },
    pt: {
      h1: 'Invoice, ABN e Impostos na Austrália<span class="accent">— num app só, em português</span>',
      body: `
      <p class="sub">Emita invoices, escaneie recibos e acompanhe GST e imposto de renda na Austrália — no iOS e Android.</p>
      <p>O Ozly é o app feito pra quem trabalha por conta própria na Austrália com ABN: cleaner, tradie, entregador, cozinheiro, babá, freelancer. Se você é brasileiro ou brasileira na Austrália e vive de trampo com ABN, o Ozly resolve a parte chata: invoice profissional ilimitada, leitura automática de recibo com IA, despesas dedutíveis organizadas do jeito que o ATO (a Receita australiana) espera, estimativa de GST e de imposto em tempo real, agenda de jobs e relatório pronto pro tax return — tudo no celular, em português.</p>

      <h2>Como emitir invoice com ABN — sem limite e sem taxa</h2>
      <p>Crie e mande uma invoice profissional em menos de um minuto: itens, GST (10%), data de vencimento, seus dados de pagamento e logo. Acompanhe o status em tempo real, mande lembrete automático de invoice atrasada e mantenha o histórico organizado. Não tem taxa por invoice e não tem porcentagem sobre o que você ganha — sua primeira invoice é por nossa conta, e os planos liberam invoice ilimitada.</p>

      <h2>Recibo escaneado com IA — chega de digitar despesa</h2>
      <p>Aponte a câmera pro recibo (de papel ou digital) e o Ozly lê valor, data, loja, GST e categoria sozinho. Cada recibo fica salvo na nuvem criptografada e ligado ao job ou período fiscal certo. Na hora do tax return, está tudo categorizado e pronto pra exportar pro seu contador.</p>

      <h2>Despesas dedutíveis do jeito que o ATO espera</h2>
      <p>Toda categoria de despesa no Ozly corresponde a uma classificação dedutível reconhecida pelo Australian Taxation Office: carro e combustível, ferramentas, celular e internet, home office, uniforme, cursos e mais. Registre quilometragem com o logbook embutido e anexe comprovantes. Suas deduções ficam defensáveis — no fim do ano fiscal você paga o que deve, e nem um dólar a mais.</p>

      <h2>Quanto de imposto vou pagar na Austrália?</h2>
      <p>O painel fiscal do Ozly atualiza a cada invoice e a cada despesa: estimativa de GST do trimestre, projeção do imposto de renda (PAYG) do ano e alerta antes de você cruzar o limite de $75.000 que obriga o registro de GST. Sem surpresa de conta de imposto que você não viu chegando.</p>

      <h2>Jobs, orçamentos e sub-contractors</h2>
      <p>Agende jobs, faça orçamento, converta orçamento aceito em invoice com um toque. Se você repassa trabalho pra outros contractors, registre o ABN deles e o quanto pagou no ano — pronto pro relatório TPAR quando o ATO pedir. Perfeito pra quem faz cleaning, construção, delivery, cozinha ou aged care.</p>

      <h2>Feito pra quem chegou agora na Austrália</h2>
      <p>O Ozly nasceu pensando em quem trabalha com ABN e não quer se perder na burocracia australiana — incluindo a comunidade brasileira. O app inteiro funciona em português: telas, suporte e o <a href="/pt/guide">guia completo em português</a>. Visto de estudante? O Visa Shield monitora suas horas trabalhadas pra você ficar dentro do limite do visto.</p>

      <h2>Preço transparente, sem pegadinha</h2>
      <p>Sua primeira invoice é por nossa conta, sem cartão. Os planos liberam invoice, despesas, recibos e estimativa de imposto ilimitados, além de relatórios avançados, comparação de tarifas e o monitor de horas do visto — preço fixo, transparente, cancela quando quiser. Seus dados são seus, sempre exportáveis, protegidos pela lei de privacidade australiana (Privacy Act 1988).</p>

      <h2>Comece em 2 minutos</h2>
      <p>Baixe o Ozly, entre com Apple, Google ou email, adicione seu ABN e mande sua primeira invoice antes do café ficar pronto. Sem cartão de crédito, sem call de demonstração.</p>
      ${STORES}
      <p>Quer mais detalhe? Leia o <a href="/pt/guide">guia Ozly em português</a> ou as <a href="/pt/support">perguntas frequentes</a>.</p>
      `,
    },
    es: {
      h1: 'Invoices, ABN e Impuestos en Australia<span class="accent">— en una sola app, en español</span>',
      body: `
      <p class="sub">Emite invoices, escanea recibos y controla el GST y tu impuesto en Australia — en iOS y Android.</p>
      <p>Ozly es la app para quien trabaja por su cuenta en Australia con ABN: limpieza, construcción, delivery, cocina, cuidado de personas, freelance. Si sos latino o latina en Australia y vivís de trabajos con ABN, Ozly te saca la parte pesada: invoices profesionales ilimitadas, lectura automática de recibos con IA, gastos deducibles organizados como los espera el ATO (la oficina de impuestos australiana), estimación de GST y de impuesto en tiempo real, agenda de jobs y reportes listos para el tax return — todo en el celular, en español.</p>

      <h2>Cómo facturar con ABN — sin límite y sin comisión</h2>
      <p>Crea y manda una invoice profesional en menos de un minuto: ítems, GST (10%), fecha de vencimiento, tus datos de pago y tu logo. Sigue el estado en tiempo real, manda recordatorios automáticos de invoices vencidas y mantén el historial ordenado. Sin comisión por invoice y sin porcentaje sobre lo que ganás — tu primera invoice va por nuestra cuenta, y los planes desbloquean facturación ilimitada.</p>

      <h2>Recibos escaneados con IA — basta de tipear gastos</h2>
      <p>Apunta la cámara al recibo (de papel o digital) y Ozly lee solo el total, la fecha, la tienda, el GST y la categoría. Cada recibo queda guardado en la nube cifrada y vinculado al job o período fiscal correcto. Cuando llega el tax return, ya está todo categorizado y listo para exportar a tu contador.</p>

      <h2>Gastos deducibles como los espera el ATO</h2>
      <p>Cada categoría de gasto en Ozly corresponde a una clasificación deducible reconocida por el Australian Taxation Office: auto y combustible, herramientas, celular e internet, home office, uniformes, cursos y más. Registra kilometraje con el logbook integrado y adjunta comprobantes. Tus deducciones quedan defendibles — al cierre del año fiscal pagas lo que debes, y ni un dólar más.</p>

      <h2>¿Cuánto impuesto voy a pagar en Australia?</h2>
      <p>El panel fiscal de Ozly se actualiza con cada invoice y cada gasto: estimación del GST del trimestre, proyección del impuesto del año (PAYG) y alerta antes de cruzar el límite de $75.000 que obliga a registrarse en GST. Sin sorpresas de cuentas de impuestos que no viste venir.</p>

      <h2>Jobs, presupuestos y subcontratistas</h2>
      <p>Agenda jobs, arma presupuestos y convierte un presupuesto aceptado en invoice con un toque. Si le pasas trabajo a otros contractors, registra su ABN y cuánto les pagaste en el año — listo para el reporte TPAR cuando el ATO lo pida. Ideal para limpieza, construcción, delivery, cocina y aged care.</p>

      <h2>Hecho para quien recién llega a Australia</h2>
      <p>Ozly nació pensando en quien trabaja con ABN y no quiere perderse en la burocracia australiana — incluida la comunidad latina. La app entera funciona en español: pantallas, soporte y la <a href="/es/guide">guía completa en español</a>. ¿Visa de estudiante? El Visa Shield monitorea tus horas trabajadas para que no te pases del límite de tu visa.</p>

      <h2>Precio transparente, sin letra chica</h2>
      <p>Tu primera invoice va por nuestra cuenta, sin tarjeta. Los planes desbloquean invoices, gastos, recibos y estimación de impuestos ilimitados, más reportes avanzados, comparación de tarifas y el monitor de horas de visa — precio fijo, transparente, cancelas cuando quieras. Tus datos son tuyos, siempre exportables, protegidos por la ley de privacidad australiana (Privacy Act 1988).</p>

      <h2>Empieza en 2 minutos</h2>
      <p>Descarga Ozly, entra con Apple, Google o email, agrega tu ABN y manda tu primera invoice antes de que se enfríe el café. Sin tarjeta de crédito, sin llamadas de demo.</p>
      ${STORES}
      <p>¿Quieres más detalle? Lee la <a href="/es/guide">guía Ozly en español</a> o las <a href="/es/support">preguntas frecuentes</a>.</p>
      `,
    },
  },

  /* ═══════════════════════════ SUPPORT ═══════════════════════════ */
  "/support": {
    en: {
      h1: "Ozly Support &amp; Frequently Asked Questions",
      body: `
      <p>Find answers to the most common questions about using Ozly — the invoicing and tax app for Australian sole traders. Our FAQ covers account setup, invoicing, expenses, GST, PAYG tax, receipts, subscriptions, and more.</p>

      <h2>Popular topics</h2>
      <ul>
        <li><strong>Getting started:</strong> Create your account, set up your ABN, and send your first invoice in minutes.</li>
        <li><strong>Invoicing:</strong> Add line items, GST, PAYG withholding, due dates, and track payments.</li>
        <li><strong>Expenses &amp; receipts:</strong> Scan receipts with your camera and categorise deductible expenses.</li>
        <li><strong>Tax:</strong> Understand GST thresholds, BAS, PAYG instalments, and end-of-financial-year reports.</li>
        <li><strong>Visa Shield:</strong> Track your working hours against your student-visa limit.</li>
        <li><strong>Jobs &amp; contractors:</strong> Manage clients, quotes, recurring jobs, and contractor payments.</li>
        <li><strong>Subscriptions:</strong> Basic vs. Pro, cancellations, refunds, and App Store / Play Store billing.</li>
      </ul>

      <h2>Need personal help?</h2>
      <p>Email us at <a href="mailto:support@ozly.com.au">support@ozly.com.au</a> or check the full <a href="/guide/">Ozly user guide</a> for step-by-step instructions.</p>
      `,
    },
    pt: {
      h1: "Ajuda Ozly — Perguntas Frequentes em Português",
      body: `
      <p>Respostas em português pras dúvidas mais comuns sobre o Ozly — o app de invoice e impostos pra quem trabalha com ABN na Austrália. Conta, invoice, despesas, GST, tax return, visto e assinatura: está tudo aqui.</p>

      <h2>Tópicos mais buscados</h2>
      <ul>
        <li><strong>Primeiros passos:</strong> criar a conta, configurar o ABN e mandar a primeira invoice em minutos.</li>
        <li><strong>Invoices:</strong> itens, GST, vencimento, lembrete de cobrança e acompanhamento de pagamento.</li>
        <li><strong>Despesas e recibos:</strong> escanear recibo com a câmera e categorizar despesas dedutíveis do tax return.</li>
        <li><strong>Impostos:</strong> limite de GST, BAS, PAYG e relatório do fim do ano fiscal australiano.</li>
        <li><strong>Visa Shield:</strong> acompanhar suas horas trabalhadas dentro do limite do visto de estudante.</li>
        <li><strong>Jobs e contractors:</strong> clientes, orçamentos, jobs recorrentes e pagamento de sub-contractors.</li>
        <li><strong>Assinatura:</strong> Basic vs. Pro, cancelamento, reembolso e cobrança pela App Store / Play Store.</li>
      </ul>

      <h2>Precisa falar com a gente?</h2>
      <p>Manda um email pra <a href="mailto:support@ozly.com.au">support@ozly.com.au</a> (pode escrever em português!) ou veja o <a href="/pt/guide">guia completo em português</a>.</p>
      `,
    },
    es: {
      h1: "Ayuda Ozly — Preguntas Frecuentes en Español",
      body: `
      <p>Respuestas en español a las dudas más comunes sobre Ozly — la app de invoices e impuestos para quien trabaja con ABN en Australia. Cuenta, invoices, gastos, GST, tax return, visa y suscripción: está todo acá.</p>

      <h2>Temas más buscados</h2>
      <ul>
        <li><strong>Primeros pasos:</strong> crear la cuenta, configurar el ABN y mandar la primera invoice en minutos.</li>
        <li><strong>Invoices:</strong> ítems, GST, vencimiento, recordatorios de cobro y seguimiento de pagos.</li>
        <li><strong>Gastos y recibos:</strong> escanear recibos con la cámara y categorizar gastos deducibles del tax return.</li>
        <li><strong>Impuestos:</strong> límite de GST, BAS, PAYG y reportes del cierre del año fiscal australiano.</li>
        <li><strong>Visa Shield:</strong> controlar tus horas trabajadas dentro del límite de tu visa de estudiante.</li>
        <li><strong>Jobs y contractors:</strong> clientes, presupuestos, jobs recurrentes y pagos a subcontratistas.</li>
        <li><strong>Suscripción:</strong> Basic vs. Pro, cancelación, reembolsos y cobro por App Store / Play Store.</li>
      </ul>

      <h2>¿Necesitas hablar con nosotros?</h2>
      <p>Escríbenos a <a href="mailto:support@ozly.com.au">support@ozly.com.au</a> (¡puedes escribir en español!) o mira la <a href="/es/guide">guía completa en español</a>.</p>
      `,
    },
  },

  /* ════════════════════════════ GUIDE ════════════════════════════ */
  "/guide": {
    en: {
      h1: "Ozly User Guide",
      body: `
      <p>The Ozly user guide walks you through every feature of the app, with screenshots and step-by-step instructions written for Australian sole traders, contractors, and tradies.</p>

      <h2>What is covered</h2>
      <ul>
        <li><strong>Getting started:</strong> Creating an account, setting up your ABN, and choosing your plan.</li>
        <li><strong>Dashboard:</strong> Reading your income, expense, GST, and tax estimates at a glance.</li>
        <li><strong>Invoicing:</strong> Creating and sending invoices, adding GST and PAYG withholding, tracking payments.</li>
        <li><strong>Expenses:</strong> Capturing receipts, matching categories, and claiming ATO-deductible expenses.</li>
        <li><strong>Jobs:</strong> Quoting, scheduling, completing, and invoicing jobs for clients.</li>
        <li><strong>Contractors:</strong> Paying subbies, tracking contractor totals, and preparing TPAR data.</li>
        <li><strong>Tax reports:</strong> GST, BAS, PAYG instalments, and end-of-financial-year summaries.</li>
        <li><strong>Settings:</strong> Business details, invoice branding, notifications, language, and sync.</li>
      </ul>

      <h2>Questions?</h2>
      <p>Visit the <a href="/support/">Support &amp; FAQ</a> page or email <a href="mailto:support@ozly.com.au">support@ozly.com.au</a>.</p>
      `,
    },
    pt: {
      h1: "Guia Ozly em Português",
      body: `
      <p>O guia completo do Ozly em português: passo a passo de cada função do app, escrito pra quem trabalha com ABN na Austrália — cleaning, construção, delivery, cozinha, aged care e qualquer outro trampo por conta própria.</p>

      <h2>O que tem no guia</h2>
      <ul>
        <li><strong>Primeiros passos:</strong> criar a conta, configurar seu ABN e escolher o plano.</li>
        <li><strong>Dashboard:</strong> entender sua receita, despesas, GST e estimativa de imposto num olhar.</li>
        <li><strong>Invoices:</strong> como emitir invoice na Austrália, adicionar GST, acompanhar pagamento e cobrar atrasado.</li>
        <li><strong>Despesas:</strong> escanear recibos, categorizar e declarar despesas dedutíveis aceitas pelo ATO.</li>
        <li><strong>Jobs:</strong> orçar, agendar, concluir e faturar jobs pros seus clientes.</li>
        <li><strong>Contractors:</strong> pagar sub-contractors, somar totais do ano e preparar o TPAR.</li>
        <li><strong>Relatórios de imposto:</strong> GST, BAS, PAYG e o resumo do fim do ano fiscal.</li>
        <li><strong>Configurações:</strong> dados do negócio, logo na invoice, notificações, idioma e sincronização.</li>
      </ul>

      <h2>Ficou com dúvida?</h2>
      <p>Veja as <a href="/pt/support">perguntas frequentes em português</a> ou manda um email pra <a href="mailto:support@ozly.com.au">support@ozly.com.au</a>.</p>
      `,
    },
    es: {
      h1: "Guía Ozly en Español",
      body: `
      <p>La guía completa de Ozly en español: paso a paso de cada función de la app, escrita para quien trabaja con ABN en Australia — limpieza, construcción, delivery, cocina, aged care y cualquier otro trabajo por cuenta propia.</p>

      <h2>Qué encuentras en la guía</h2>
      <ul>
        <li><strong>Primeros pasos:</strong> crear la cuenta, configurar tu ABN y elegir el plan.</li>
        <li><strong>Dashboard:</strong> entender tus ingresos, gastos, GST y estimación de impuesto de un vistazo.</li>
        <li><strong>Invoices:</strong> cómo facturar en Australia, agregar GST, seguir pagos y reclamar invoices vencidas.</li>
        <li><strong>Gastos:</strong> escanear recibos, categorizar y declarar gastos deducibles aceptados por el ATO.</li>
        <li><strong>Jobs:</strong> presupuestar, agendar, completar y facturar jobs a tus clientes.</li>
        <li><strong>Contractors:</strong> pagar a subcontratistas, sumar totales del año y preparar el TPAR.</li>
        <li><strong>Reportes de impuestos:</strong> GST, BAS, PAYG y el resumen del cierre del año fiscal.</li>
        <li><strong>Configuración:</strong> datos del negocio, logo en la invoice, notificaciones, idioma y sincronización.</li>
      </ul>

      <h2>¿Te quedaron dudas?</h2>
      <p>Mira las <a href="/es/support">preguntas frecuentes en español</a> o escribe a <a href="mailto:support@ozly.com.au">support@ozly.com.au</a>.</p>
      `,
    },
  },

  /* ══════════════════════════ BUSINESS ══════════════════════════ */
  "/guide/business": {
    en: {
      h1: "Ozly for Business — Portal Guide",
      body: `
      <p class="sub">A step-by-step guide to running Ozly for Business at app.ozly.au — written for the owner or admin.</p>
      <p>In Ozly you never create an invoice: the ABN holders you work with issue their own invoices in the app and send them to your organisation. The portal is where you receive, track and pay them — everyone stays independent under their own ABN.</p>
      <h2>What this guide covers</h2>
      <ul>
        <li><strong>Create your workspace:</strong> sign up, onboarding and your billing email.</li>
        <li><strong>Members:</strong> invite the ABN holders you work with and read compliance badges.</li>
        <li><strong>Cover a plan:</strong> sponsor an ABN holder's Ozly access so their invoicing to you is covered.</li>
        <li><strong>Inbox &amp; deliveries:</strong> receive invoices and track delivery status.</li>
        <li><strong>Invoices:</strong> mark paid and export For Xero, As CSV, or an ABA bank file.</li>
        <li><strong>Billing:</strong> Crew/Squad/Fleet/Operation tiers, seats, trial and the Stripe portal.</li>
        <li><strong>Integrations, Reports, Activity and Settings.</strong></li>
      </ul>
      <h2>Questions?</h2>
      <p>See the <a href="/support/">Support &amp; FAQ</a> or email <a href="mailto:support@ozly.com.au">support@ozly.com.au</a>.</p>
      `,
    },
    pt: {
      h1: "Ozly para Empresas — Guia do Portal",
      body: `
      <p class="sub">Guia passo a passo pra operar o Ozly para Empresas no app.ozly.au — pro dono ou admin.</p>
      <p>No Ozly você nunca cria invoice: os ABN holders com quem você trabalha emitem as próprias invoices no app e enviam pra sua organização. O portal é onde você recebe, acompanha e paga — todo mundo continua independente sob o próprio ABN.</p>
      <h2>O que tem neste guia</h2>
      <ul>
        <li><strong>Criar o workspace:</strong> cadastro, onboarding e o email de faturamento.</li>
        <li><strong>Members:</strong> convidar os ABN holders e ler os selos de compliance.</li>
        <li><strong>Cobrir um plano:</strong> custear o acesso Ozly de um ABN holder — as invoices dele pra você ficam cobertas.</li>
        <li><strong>Inbox e entregas:</strong> receber invoices e acompanhar o status de entrega.</li>
        <li><strong>Invoices:</strong> marcar como paga e exportar For Xero, As CSV ou arquivo ABA.</li>
        <li><strong>Billing:</strong> planos Crew/Squad/Fleet/Operation, seats, trial e o portal Stripe.</li>
        <li><strong>Integrações, Relatórios, Atividade e Configurações.</strong></li>
      </ul>
      <h2>Dúvidas?</h2>
      <p>Veja o <a href="/pt/support">Suporte &amp; FAQ</a> ou escreva pra <a href="mailto:support@ozly.com.au">support@ozly.com.au</a>.</p>
      `,
    },
    es: {
      h1: "Ozly para Empresas — Guía del Portal",
      body: `
      <p class="sub">Guía paso a paso para operar Ozly para Empresas en app.ozly.au — para el dueño o admin.</p>
      <p>En Ozly nunca creás una invoice: los ABN holders con los que trabajás emiten sus propias invoices desde la app y las envían a tu organización. El portal es donde las recibís, seguís y pagás — todos siguen independientes bajo su propio ABN.</p>
      <h2>Qué cubre esta guía</h2>
      <ul>
        <li><strong>Crear el workspace:</strong> registro, onboarding y el email de facturación.</li>
        <li><strong>Members:</strong> invitar a los ABN holders y leer los sellos de compliance.</li>
        <li><strong>Cubrir un plan:</strong> costear el acceso Ozly de un ABN holder — su facturación hacia vos queda cubierta.</li>
        <li><strong>Inbox y entregas:</strong> recibir invoices y seguir el estado de entrega.</li>
        <li><strong>Invoices:</strong> marcar como pagada y exportar For Xero, As CSV o archivo ABA.</li>
        <li><strong>Billing:</strong> planes Crew/Squad/Fleet/Operation, seats, trial y el portal Stripe.</li>
        <li><strong>Integraciones, Reportes, Actividad y Configuración.</strong></li>
      </ul>
      <h2>¿Dudas?</h2>
      <p>Mirá el <a href="/es/support">Soporte &amp; FAQ</a> o escribí a <a href="mailto:support@ozly.com.au">support@ozly.com.au</a>.</p>
      `,
    },
  },

  "/business": {
    en: {
      h1: "Ozly for Organisations — Manage Sub-contractors Without Spreadsheets",
      body: `
      <p class="sub">One portal to invite sub-contractors, receive their invoices, pay them and keep every record tidy.</p>
      <p>Ozly for Organisations is the web portal for Australian businesses that work with ABN sub-contractors — cleaning companies, construction crews, delivery fleets, care providers. Your contractors invoice you from the Ozly app; every invoice lands in one inbox with the ABN details, payment status, and audit trail already attached.</p>

      <h2>How it works</h2>
      <ul>
        <li><strong>Invite:</strong> Add your sub-contractors by email — they get the Ozly app and are linked to your organisation.</li>
        <li><strong>Receive:</strong> Their invoices arrive in your portal inbox, complete with ABN, line items and GST.</li>
        <li><strong>Pay &amp; record:</strong> Mark invoices paid, export totals, and keep TPAR-ready records of what you paid each contractor.</li>
      </ul>

      <h2>Compliance, documented</h2>
      <p>The sub-contractor relationship is properly documented: who invoiced whom, when, for what, with full history retained. You stay in control of your Fair Work, super and tax obligations — Ozly keeps the paperwork. Data is encrypted, Australian-hosted, and covered by the Privacy Act 1988.</p>

      <h2>Pricing</h2>
      <p>Per-seat pricing from $7.99 to $14.99 per contractor per month depending on team size, with annual discounts. 14-day trial, no payment method required to start. <a href="https://app.ozly.au/signup">Start your trial at app.ozly.au</a>.</p>
      `,
    },
    pt: {
      h1: "Ozly para Organizações — Gerencie Sub-contractors sem Planilha",
      body: `
      <p class="sub">Um portal pra convidar sub-contractors, receber as invoices deles, pagar e manter cada registro em ordem.</p>
      <p>O Ozly para Organizações é o portal web pra empresas na Austrália que trabalham com sub-contractors de ABN — empresas de cleaning, equipes de construção, frotas de delivery, prestadores de cuidado. Seus contractors emitem invoice pelo app do Ozly; cada invoice chega numa caixa de entrada única, já com ABN, status de pagamento e histórico completo.</p>

      <h2>Como funciona</h2>
      <ul>
        <li><strong>Convide:</strong> adicione seus sub-contractors por email — eles baixam o app do Ozly e ficam vinculados à sua organização.</li>
        <li><strong>Receba:</strong> as invoices deles chegam na caixa de entrada do portal, com ABN, itens e GST.</li>
        <li><strong>Pague e registre:</strong> marque invoices como pagas, exporte totais e mantenha registros prontos pro TPAR.</li>
      </ul>

      <h2>Compliance documentado</h2>
      <p>A relação de sub-contratação fica devidamente documentada: quem faturou, quando, pelo quê, com histórico completo. As obrigações de Fair Work, super e impostos continuam suas — o Ozly cuida da papelada. Dados criptografados, hospedados na Austrália, cobertos pelo Privacy Act 1988.</p>

      <h2>Preços</h2>
      <p>Preço por assento, de $7.99 a $14.99 por contractor por mês conforme o tamanho do time, com desconto anual. Teste de 14 dias, sem cartão pra começar. <a href="https://app.ozly.au/signup">Comece seu teste em app.ozly.au</a>.</p>
      `,
    },
    es: {
      h1: "Ozly para Organizaciones — Gestiona Subcontratistas sin Planillas",
      body: `
      <p class="sub">Un portal para invitar subcontratistas, recibir sus invoices, pagarles y mantener cada registro en orden.</p>
      <p>Ozly para Organizaciones es el portal web para empresas en Australia que trabajan con subcontratistas con ABN — empresas de limpieza, cuadrillas de construcción, flotas de delivery, proveedores de cuidado. Tus contractors facturan desde la app de Ozly; cada invoice llega a una sola bandeja de entrada, ya con el ABN, el estado de pago y el historial completo.</p>

      <h2>Cómo funciona</h2>
      <ul>
        <li><strong>Invita:</strong> agrega a tus subcontratistas por email — descargan la app de Ozly y quedan vinculados a tu organización.</li>
        <li><strong>Recibe:</strong> sus invoices llegan a la bandeja del portal, con ABN, ítems y GST.</li>
        <li><strong>Paga y registra:</strong> marca invoices como pagadas, exporta totales y mantén registros listos para el TPAR.</li>
      </ul>

      <h2>Compliance documentado</h2>
      <p>La relación de subcontratación queda bien documentada: quién facturó, cuándo, por qué, con historial completo. Tus obligaciones de Fair Work, super e impuestos siguen siendo tuyas — Ozly se encarga del papeleo. Datos cifrados, alojados en Australia, cubiertos por el Privacy Act 1988.</p>

      <h2>Precios</h2>
      <p>Precio por asiento, de $7.99 a $14.99 por contractor por mes según el tamaño del equipo, con descuento anual. Prueba de 14 días, sin tarjeta para empezar. <a href="https://app.ozly.au/signup">Empieza tu prueba en app.ozly.au</a>.</p>
      `,
    },
  },
};
