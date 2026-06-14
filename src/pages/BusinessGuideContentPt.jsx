/**
 * Ozly for Business — Guia do usuário do portal da organização (português).
 * Mapeia cada processo do portal (app.ozly.au) e o que fazer em cada um.
 * Conteúdo verificado contra org-portal/src (rotas/componentes) — documenta apenas
 * o que realmente está no ar hoje. Os componentes auxiliares são injetados pelo Guide.jsx.
 */
export default function BusinessGuideContentPt({ SectionCard, SubSection, StepList, BulletList, Tip, InfoBox, SimpleTable, P, B, FaqItem }) {
  return (
    <>
      {/* ─── 1. O QUE É ─── */}
      <SectionCard id="overview" title="1. O Que É o Ozly for Business">
        <P>O Ozly for Business é o <B>portal web em app.ozly.au</B> para empresas e agências de limpeza. Ele te dá um único lugar para receber as invoices que os ABN holders com quem você trabalha te enviam, ver quem você cobre, marcar invoices como pagas e exportá-las para o seu banco ou o seu contador.</P>
        <InfoBox><B>A regra de ouro:</B> no Ozly, <B>você nunca cria uma invoice</B>. Cada ABN holder emite a própria invoice pelo app mobile do Ozly e a envia para a sua organização. O portal é onde você <B>recebe, acompanha e paga</B> — todo mundo continua independente sob o próprio ABN.</InfoBox>
        <SubSection title="O que você pode fazer aqui">
          <BulletList>
            <li>Convidar para o seu workspace os ABN holders com quem você trabalha</li>
            <li>Cobrir o plano Ozly deles para que faturem você de graça (opcional)</li>
            <li>Receber as invoices deles na sua Inbox, com status de entrega</li>
            <li>Marcar invoices como pagas e exportar para Xero, CSV ou um arquivo bancário ABA</li>
            <li>Ver um dashboard, reports de BAS/P&amp;L e um registro de atividades</li>
          </BulletList>
        </SubSection>
        <Tip>O portal é feito primeiro para desktop (pensado para um dono/admin no computador). Os ABN holders nunca precisam do portal — eles vivem no app mobile.</Tip>
      </SectionCard>

      {/* ─── 2. CRIE SEU WORKSPACE ─── */}
      <SectionCard id="workspace" title="2. Crie Seu Workspace">
        <SubSection title="Cadastre-se">
          <StepList>
            <li>Acesse <B>app.ozly.au</B> → <B>Sign up</B>.</li>
            <li>Informe o seu email de trabalho — enviamos um <B>magic link</B> (sem senha para decorar). Abra-o para entrar.</li>
            <li>Dê um nome à sua organização e adicione o seu <B>ABN</B>.</li>
          </StepList>
        </SubSection>
        <SubSection title="Onboarding & o seu Inbox email">
          <P>Depois do cadastro, você passa por um onboarding curto e ganha um guia de onboarding para imprimir (útil para compartilhar com a sua equipe). A única configuração para fazer logo no início é o seu <B>Inbox email</B> em Settings — é o endereço para onde as invoices dos ABN holders são enviadas por email, então precisa ser um que você confere.</P>
          <Tip>Pressione <B>⌘K</B> (Ctrl+K) em qualquer lugar do portal para abrir uma paleta de busca/comandos — a forma mais rápida de pular para qualquer tela ou invoice.</Tip>
        </SubSection>
      </SectionCard>

      {/* ─── 3. DASHBOARD ─── */}
      <SectionCard id="dashboard" title="3. Dashboard">
        <P>Sua tela inicial. Ela resume o dinheiro que entra e sai no período selecionado.</P>
        <SimpleTable
          headers={["Card", "Mostra"]}
          rows={[
            ["Outstanding", "Total ainda devido aos ABN holders (não pago)"],
            ["Overdue", "Desse total, o que está em atraso"],
            ["Paid (this period)", "O que você marcou como pago no intervalo"],
            ["Active members", "ABN holders atualmente no seu workspace"],
          ]}
        />
        <P>Abaixo dos cards você tem um gráfico de <B>tendência de receita</B> ao longo do tempo e um <B>donut de status</B> (paga / enviada / em atraso / rascunho). Use o <B>filtro de período</B> no topo para mudar o intervalo.</P>
      </SectionCard>

      {/* ─── 4. MEMBERS ─── */}
      <SectionCard id="members" title="4. Members — Convide ABN Holders">
        <P>&ldquo;Members&rdquo; são os ABN holders independentes que você convidou para o seu workspace. Convidar alguém faz com que as invoices que essa pessoa emite <B>para você</B> caiam no seu portal.</P>
        <SubSection title="Convide alguém">
          <StepList>
            <li>Menu lateral → <B>Members</B> → <B>Invite member</B>.</li>
            <li>Informe o email ou celular da pessoa. O Ozly envia a ela um <B>convite</B>.</li>
            <li>Ela aceita <B>no app do Ozly</B> — então as invoices dela para você aparecem automaticamente e ela conta como um <B>Active member</B>.</li>
          </StepList>
          <P>Dois cards de KPI no topo mostram <B>Active members</B> e <B>Pending invites</B>. Um card de pendentes te avisa se o convite não pôde ser entregue, para você reenviar.</P>
        </SubSection>
        <SubSection title="Como cada member é cobrado">
          <P>O card de cada member traz um pequeno <B>selo de cobrança</B> que mostra como o acesso da pessoa ao Ozly é pago:</P>
          <SimpleTable
            headers={["Selo", "Significado"]}
            rows={[
              ["Company-covered", "Você paga pelo acesso ABN da pessoa (veja a próxima seção)"],
              ["➕ ABN top-up", "Você cobre a pessoa e ela adicionou um top-up de $5/mês para também faturar outros"],
              ["Self-paid", "A pessoa paga o próprio plano Ozly"],
              ["Needs ABN cover", "Não coberta e não pagante — ainda não pode emitir invoices com ABN"],
            ]}
          />
        </SubSection>
      </SectionCard>

      {/* ─── 5. COVER / PATROCÍNIO ─── */}
      <SectionCard id="cover" title="5. Cubra o Plano de um ABN Holder (opcional)">
        <P>O diferencial: depois de assinar (veja Billing), você pode <B>cobrir</B> o acesso ABN de um ABN holder no Ozly — aí ele fatura a <B>sua empresa</B> de graça, sem nada para pagar do próprio bolso.</P>
        <SubSection title="Como funciona">
          <StepList>
            <li>Você mantém uma assinatura paga com seats suficientes.</li>
            <li>No card de um member, ative o <B>Cover this member</B>. O selo muda para <B>Company-covered</B>.</li>
            <li>Desligue a qualquer momento com <B>Stop covering</B> — o seat fica livre.</li>
          </StepList>
        </SubSection>
        <InfoBox>Um ABN holder coberto pode adicionar um <B>top-up de $5/mês</B> no app (você verá o selo <B>➕ ABN top-up</B>) para também faturar clientes fora da sua organização, enquanto você continua cobrindo o acesso ABN base.</InfoBox>
        <Tip>O seu tier de plano é determinado por quantas pessoas você cobre — o Ozly te move para cima/baixo de tier automaticamente conforme essa contagem cruza uma faixa (veja Billing).</Tip>
      </SectionCard>

      {/* ─── 6. INBOX ─── */}
      <SectionCard id="inbox" title="6. Inbox — Invoices Que Você Recebe">
        <P>Toda invoice que um ABN holder envia para a sua organização cai aqui, da mais nova para a mais antiga.</P>
        <SubSection title="Como uma invoice chega">
          <P>O ABN holder, no app do Ozly, cria uma invoice, escolhe a sua empresa e a envia para a sua organização. Ela aparece na sua Inbox e é enviada por email para o seu endereço de Inbox.</P>
        </SubSection>
        <SubSection title="Status de entrega">
          <P>Cada linha mostra se o email chegou ao seu endereço de Inbox. Filtre por status:</P>
          <SimpleTable
            headers={["Status", "Significado"]}
            rows={[
              ["Delivered", "O email chegou ao seu endereço de Inbox"],
              ["Sending", "Em andamento — confira novamente em instantes"],
              ["Not delivered", "Bounce — corrija o seu Inbox email em Settings"],
              ["Failed", "Falha no envio — o ABN holder pode reenviar pelo app"],
            ]}
          />
          <P>Você pode buscar, filtrar por data e <B>exportar a lista da inbox para CSV</B>.</P>
        </SubSection>
      </SectionCard>

      {/* ─── 7. INVOICES ─── */}
      <SectionCard id="invoices" title="7. Invoices — Acompanhe, Pague & Exporte">
        <P>A lista completa de tudo que foi recebido, com filtros e ações em massa.</P>
        <SubSection title="Encontre & marque como paga">
          <StepList>
            <li>Filtre por <B>member</B>, <B>status</B> (paga / enviada / em atraso) e <B>período</B>; busque por valor, número ou texto.</li>
            <li>Abra uma invoice e toque em <B>Mark paid</B> assim que tiver pago — o ABN holder é notificado, mantendo os registros de vocês dois em sincronia.</li>
          </StepList>
        </SubSection>
        <SubSection title="Exporte (o menu Export ▾)">
          <SimpleTable
            headers={["Export", "Para que serve", "Como"]}
            rows={[
              ["For Xero", "Importar como Bills no Xero", "Export ▾ → For Xero (respeita os seus filtros ativos)"],
              ["As CSV", "Abrir em uma planilha", "Export ▾ → As CSV"],
              ["ABA bank file", "Pagar os seus members em um único lote bancário", "Selecione linhas → escolha invoices não pagas → Generate ABA file → suba no seu banco"],
            ]}
          />
          <InfoBox>Você nunca emite a invoice — o ABN holder é o emissor legal. O &ldquo;Mark paid&rdquo; e as exportações são os seus registros e a sua forma de pagar.</InfoBox>
        </SubSection>
      </SectionCard>

      {/* ─── 8. WORK ─── */}
      <SectionCard id="work" title="8. Work — Trabalhos dos Seus Members">
        <P>Uma visão majoritariamente de leitura dos trabalhos que os ABN holders criaram no app e que se relacionam à sua organização. Cada linha mostra o trabalho, quem o emitiu, datas, local e valor. Os KPIs no topo somam o <B>valor, horas, quantidade de trabalhos e concluídos</B> do período — útil para conferir o trabalho feito contra o que foi faturado. Se um trabalho tem uma mudança proposta, o status reflete isso.</P>
      </SectionCard>

      {/* ─── 9. BILLING ─── */}
      <SectionCard id="billing" title="9. Billing — Planos & Seats">
        <P>A sua assinatura do Ozly (você → Ozly), separada de qualquer coisa que os ABN holders pagam. Os tiers escalam pela quantidade de seats (pessoas que você cobre) que você tem:</P>
        <SimpleTable
          headers={["Tier", "Seats", "Por seat / mês*"]}
          rows={[
            ["Crew", "1–5", "$14.99"],
            ["Squad", "6–15", "$12.99"],
            ["Fleet", "16–30", "$9.99"],
            ["Operation", "31–100", "$7.99"],
            ["Custom", "101+", "Fale com a gente"],
          ]}
        />
        <P>* Valor mensal indicativo. <B>Anual ≈ 2 meses grátis.</B> Um <B>teste grátis de 14 dias</B> está disponível para novas organizações.</P>
        <SubSection title="O que fazer aqui">
          <StepList>
            <li><B>Adicione pagamento / inicie o teste</B> — abre o Stripe Checkout (cartão via Stripe).</li>
            <li><B>Gerencie a assinatura</B> — abre o Stripe Customer Portal (atualize cartão, IDs fiscais, veja invoices).</li>
            <li><B>Seats escalam automaticamente</B> — conforme você cobre mais/menos pessoas, o Ozly te move para o tier correspondente.</li>
            <li><B>Downgrade</B> — usa um fluxo dentro do app (ele pede um motivo e confirma a mudança).</li>
          </StepList>
        </SubSection>
      </SectionCard>

      {/* ─── 10. INTEGRATIONS ─── */}
      <SectionCard id="integrations" title="10. Integrations">
        <P>Settings → <B>Integrations</B>. Hoje o Ozly mantém isto propositalmente enxuto — só aparecem conexões que já estão no ar e funcionando:</P>
        <BulletList>
          <li><B>Upload de CSV</B> — traga dados via uma planilha.</li>
          <li><B>Sincronização de calendário</B> — fica em <B>Settings</B> (na própria seção), para sincronizar trabalhos com o seu calendário.</li>
        </BulletList>
        <InfoBox>Ainda <B>não há integrações de contabilidade ou de fontes de trabalho</B> (Xero/MYOB/ServiceM8) para conectar aqui — elas foram removidas em vez de aparecerem como cards vazios de &ldquo;em breve&rdquo;. Para levar dados ao Xero hoje, use o <B>Export → For Xero</B> na tela de Invoices (seção 7).</InfoBox>
      </SectionCard>

      {/* ─── 11. REPORTS ─── */}
      <SectionCard id="reports" title="11. Reports">
        <P>Menu lateral → <B>Reports</B>. Números para conciliação e época de impostos.</P>
        <BulletList>
          <li><B>BAS — trimestral</B> — ano fiscal australiano (jul→jun); as colunas mapeiam diretamente para os campos do portal da ATO. Exporta para CSV.</li>
          <li><B>Money in &amp; out (P&amp;L)</B> — um resumo de lucros e perdas; o intervalo padrão é o ano fiscal atual, ajustável para detalhar.</li>
          <li><B>Exports &amp; integrations</B> — um guia rápido das exportações Xero / CSV / ABA (que ficam na tela de Invoices).</li>
        </BulletList>
      </SectionCard>

      {/* ─── 12. SETTINGS ─── */}
      <SectionCard id="settings" title="12. Settings">
        <BulletList>
          <li><B>Organisation</B> — nome, ABN, valor/hora padrão e período de cobrança.</li>
          <li><B>Inbox email</B> — para onde as invoices dos ABN holders são entregues (mantenha-o atualizado — endereços errados/bloqueados aparecem como &ldquo;Not delivered&rdquo; na Inbox).</li>
          <li><B>Notifications</B> — escolha sobre o que você recebe por email / push.</li>
          <li><B>Calendar feeds</B> — conecte um calendário para sincronizar trabalhos.</li>
        </BulletList>
        <Tip>Lembre do <B>⌘K</B> — a paleta de comandos busca as suas invoices e pula para qualquer tela ou ação na hora.</Tip>
      </SectionCard>

      {/* ─── 13. FAQ ─── */}
      <SectionCard id="faq" title="13. Perguntas Frequentes">
        <div className="space-y-2">
          <FaqItem q="Eu crio invoices no portal?" a="Não. Cada ABN holder emite a própria invoice no app do Ozly e a envia para você — você recebe, acompanha e paga. Eles são o emissor legal; você continua sendo quem mantém os registros, não um empregador." />
          <FaqItem q="Cobrir alguém torna essa pessoa minha empregada?" a="Não. Cobrir só paga pelo acesso ABN da pessoa no Ozly. Ela continua independente sob o próprio ABN. As suas obrigações de Fair Work, super, payroll-tax e workers&rsquo;-comp não mudam — o Ozly te ajuda a documentá-las, não a evitá-las." />
          <FaqItem q="Como eu levo as invoices para o meu software de contabilidade?" a="Na tela de Invoices, use Export ▾ → For Xero (importa como Bills no Xero) ou As CSV para uma planilha. Ainda não há exportação para MYOB — use CSV para outros softwares." />
          <FaqItem q="Como eu pago todo mundo de fato?" a="Marque as invoices como pagas conforme você as paga, ou use Select rows na tela de Invoices, escolha as não pagas, Generate um arquivo ABA e suba no seu banco para pagar o lote de uma vez." />
          <FaqItem q="Uma invoice aparece como &lsquo;Not delivered&rsquo; na Inbox." a="O email deu bounce — o seu Inbox email está errado ou bloqueado. Corrija em Settings e então o ABN holder pode reenviar pelo app." />
          <FaqItem q="Existe um teste grátis?" a="Sim — 14 dias para novas organizações. Depois disso, o seu plano se renova automaticamente, a menos que você cancele antes do fim, e o seu tier acompanha quantas pessoas você cobre." />
          <FaqItem q="Posso conectar ServiceM8 / Xero / MYOB?" a="Ainda não como integrações ao vivo. Hoje o portal traz upload de CSV e sincronização de calendário; para o Xero, use o Export → For Xero em Invoices. Preferimos lançar exportações que funcionam a botões vazios de &lsquo;em breve&rsquo;." />
        </div>
      </SectionCard>
    </>
  );
}
