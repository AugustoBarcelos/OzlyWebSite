/**
 * Ozly for Business — Guia do usuário do portal da organização (português).
 * Mapeia cada processo do portal (app.ozly.au) e o que fazer em cada um.
 * Os componentes auxiliares são injetados pelo Guide.jsx (mesmo conjunto do guia do app).
 */
export default function BusinessGuideContentPt({ SectionCard, SubSection, StepList, BulletList, Tip, InfoBox, SimpleTable, P, B, FaqItem }) {
  return (
    <>
      {/* ─── 1. O QUE É ─── */}
      <SectionCard id="overview" title="1. O Que É o Ozly for Business">
        <P>O Ozly for Business é o <B>portal web em app.ozly.au</B> para empresas e agências de limpeza. Ele te dá um único lugar para receber as invoices que os ABN holders com quem você trabalha te enviam, ver quem você cobre, marcar invoices como pagas e exportá-las para o seu banco ou contador.</P>
        <InfoBox><B>A regra de ouro:</B> no Ozly, <B>você nunca cria uma invoice</B>. Cada ABN holder emite a própria invoice pelo app do Ozly e a envia para a sua organização. O portal é onde você <B>recebe, acompanha e paga</B> — todo mundo continua independente sob o próprio ABN.</InfoBox>
        <SubSection title="O que você pode fazer aqui">
          <BulletList>
            <li>Convidar para o seu workspace os ABN holders com quem você trabalha</li>
            <li>Cobrir o plano Ozly deles para que faturem você de graça (opcional)</li>
            <li>Receber as invoices deles na sua Inbox, com status de entrega</li>
            <li>Marcar invoices como pagas e exportar para ABA (banco) ou Xero/MYOB</li>
            <li>Ver dashboards, reports e um registro de atividades</li>
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
            <li>Dê um nome à sua organização (o nome da sua empresa/nome fantasia) e confirme o seu <B>ABN</B>.</li>
          </StepList>
        </SubSection>
        <SubSection title="Onboarding">
          <P>Na primeira vez que você entra, um <B>onboarding</B> rápido te guia pelo essencial: o seu email de cobrança (para onde as invoices são enviadas), o convite do seu primeiro ABN holder e o seu plano de Billing. Você pode pular e fazer qualquer parte depois pelo menu.</P>
          <Tip>Configure o seu <B>email de cobrança</B> logo no início (Settings) — é a caixa de entrada para onde as invoices dos ABN holders são enviadas por email, então precisa ser uma que você confere.</Tip>
        </SubSection>
      </SectionCard>

      {/* ─── 3. DASHBOARD ─── */}
      <SectionCard id="dashboard" title="3. Dashboard">
        <P>Sua tela inicial. Ela resume o dinheiro que entra e sai no período selecionado.</P>
        <SimpleTable
          headers={["Card", "Mostra"]}
          rows={[
            ["Invoices recebidas", "Quantas invoices os ABN holders te enviaram, e o total"],
            ["Pagas / Em atraso", "O que você marcou como pago vs o que ainda está em aberto"],
            ["Quem está faturando", "Os ABN holders mais em atraso, para você saber quem pagar primeiro"],
            ["Tendência & status", "Um gráfico de linha ao longo do tempo + um donut de pago/pendente/em atraso"],
          ]}
        />
        <Tip>Use o <B>filtro de período</B> (no topo do dashboard) para alternar entre esta semana, quinzena, mês ou um intervalo personalizado.</Tip>
      </SectionCard>

      {/* ─── 4. MEMBERS ─── */}
      <SectionCard id="members" title="4. Members — Convide ABN Holders">
        <P>&ldquo;Members&rdquo; são os ABN holders independentes que você convidou para o seu workspace. Convidar alguém faz com que as invoices que essa pessoa emite <B>para você</B> caiam no seu portal.</P>
        <SubSection title="Convide alguém">
          <StepList>
            <li>Menu lateral → <B>Members</B> → <B>Invite member</B>.</li>
            <li>Informe o nome + celular ou email da pessoa. O Ozly envia a ela um <B>link de convite</B>.</li>
            <li>Ela toca no link no app do Ozly e aceita — então aparece como <B>Active</B>.</li>
          </StepList>
        </SubSection>
        <SubSection title="Status dos members & conformidade">
          <SimpleTable
            headers={["Selo", "Significado"]}
            rows={[
              ["Active", "Aceitou — as invoices dela para você aparecem na sua Inbox"],
              ["Pending", "Convidada, ainda não aceitou"],
              ["Declined", "Recusou o convite"],
              ["ABN / Insurance", "Selos de conformidade — mostram se a pessoa forneceu um ABN válido e seguro registrado"],
            ]}
          />
          <P>Você pode <B>suspender / reativar</B> um member e remover alguém que não trabalha mais com você.</P>
        </SubSection>
        <InfoBox>Convidar um member <B>não</B> cria um vínculo empregatício e <B>não</B> cobre automaticamente o plano da pessoa — cobrir é uma etapa separada e opcional (próxima seção).</InfoBox>
      </SectionCard>

      {/* ─── 5. COVER / PATROCÍNIO ─── */}
      <SectionCard id="cover" title="5. Cubra o Plano de um ABN Holder (opcional)">
        <P>Este é o diferencial. Se você assinar (próxima seção), pode <B>cobrir</B> o acesso ao ABN no Ozly de um ABN holder — aí ele fatura a <B>sua empresa</B> de graça, sem nada para pagar do próprio bolso.</P>
        <SubSection title="Como funciona">
          <StepList>
            <li>Você mantém uma assinatura paga com seats suficientes.</li>
            <li>No card de um member, ative o <B>Cover this person</B>.</li>
            <li>A pessoa recebe um push: <B>&ldquo;[Sua empresa] agora cobre o seu ABN — você não precisa pagar.&rdquo;</B></li>
            <li>O faturamento dela no Ozly passa a ser para a sua organização enquanto você a cobre.</li>
          </StepList>
        </SubSection>
        <SubSection title="Regras importantes">
          <BulletList>
            <li><B>Um patrocinador por pessoa.</B> Se alguém já é coberto por outra empresa, você verá &ldquo;Já coberto por [Empresa]&rdquo; — apenas uma organização cobre uma pessoa por vez.</li>
            <li><B>Ela ainda pode faturar outros.</B> Um ABN holder coberto pode adicionar um <B>complemento pessoal de $5/mês</B> no app para também faturar clientes fora da sua organização.</li>
            <li><B>7 dias de carência ao cancelar.</B> Se você parar de cobrir (ou cancelar o seu plano), a pessoa ganha uma janela de 7 dias + um aviso para manter o acesso pagando por conta própria.</li>
          </BulletList>
        </SubSection>
        <Tip>O cover é por seat: o número de pessoas que você cobre deve corresponder à quantidade de seats do seu plano. O Ozly ajusta o seu tier automaticamente conforme a sua contagem de seats cruza uma faixa (veja Billing).</Tip>
      </SectionCard>

      {/* ─── 6. INBOX ─── */}
      <SectionCard id="inbox" title="6. Inbox — Invoices Que Você Recebe">
        <P>Toda invoice que um ABN holder envia para a sua organização cai aqui primeiro.</P>
        <SubSection title="Como uma invoice chega">
          <P>O ABN holder, no app do Ozly, cria uma invoice, escolhe a sua empresa como destinatário da cobrança, ativa o <B>&ldquo;Send to org&rdquo;</B> e envia. Ela cai na sua Inbox na hora, você recebe um email no seu endereço de cobrança, e os admins recebem um push.</P>
        </SubSection>
        <SubSection title="Status de entrega">
          <P>Abra <B>Inbox → Deliveries</B> para ver se cada envio chegou à sua caixa de cobrança:</P>
          <SimpleTable
            headers={["Status", "Significado"]}
            rows={[
              ["Delivered", "O email chegou à sua caixa de cobrança"],
              ["Queued", "Enviando — confira novamente em instantes"],
              ["Bounced", "Caixa errada/bloqueada — corrija o seu email de cobrança em Settings"],
              ["Failed", "Falha no envio — o ABN holder pode tentar de novo pelo app"],
            ]}
          />
        </SubSection>
        <Tip>Invoices novas aparecem como <B>New</B> até você abri-las, e depois como <B>Seen</B> — assim nada passa batido.</Tip>
      </SectionCard>

      {/* ─── 7. INVOICES ─── */}
      <SectionCard id="invoices" title="7. Invoices — Acompanhe, Pague & Exporte">
        <P>A lista completa de tudo que foi recebido, com filtros e ações em massa.</P>
        <SubSection title="Encontre & filtre">
          <BulletList>
            <li>Filtre por <B>member</B>, <B>status</B> (paga / pendente / em atraso) e <B>período</B>.</li>
            <li>Busque por valor, número ou descrição.</li>
          </BulletList>
        </SubSection>
        <SubSection title="Mark paid">
          <StepList>
            <li>Abra uma invoice (ou selecione várias em massa).</li>
            <li>Toque em <B>Mark paid</B> assim que você realmente tiver pago.</li>
            <li>O ABN holder recebe um push: <B>&ldquo;[Empresa] marcou a invoice #… como paga.&rdquo;</B> — mantendo os registros de vocês dois em sincronia.</li>
          </StepList>
        </SubSection>
        <SubSection title="Exporte para pagar / para o seu contador">
          <BulletList>
            <li><B>Arquivo ABA</B> — selecione invoices em massa → exporte um lote bancário (ABA) que você sobe no seu banco para pagar todo mundo de uma vez.</li>
            <li><B>CSV Xero / MYOB</B> — exporte para o seu software de contabilidade.</li>
          </BulletList>
          <InfoBox>Você nunca emite a invoice — a edição é mínima e registrada em log de auditoria. O ABN holder é o emissor legal; o &ldquo;mark paid&rdquo; é o seu registro de pagamento.</InfoBox>
        </SubSection>
      </SectionCard>

      {/* ─── 8. WORK ─── */}
      <SectionCard id="work" title="8. Work — Histórico de Trabalhos">
        <P>Um histórico somente leitura dos trabalhos que os ABN holders criaram no app e que se relacionam à sua organização. Útil para conferir o que foi feito contra o que foi faturado. (Alguns planos permitem que você ofereça trabalhos aos members — quando ativado, isso também aparece aqui.)</P>
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
            <li><B>Seats escalam automaticamente</B> — conforme você cobre mais/menos pessoas, o Ozly te move para o tier correspondente automaticamente.</li>
            <li><B>Downgrade / cancelar</B> — usa um fluxo dentro do app (com um motivo); os ABN holders cobertos ganham os 7 dias de carência.</li>
          </StepList>
        </SubSection>
        <Tip>O banner de contagem de seats sinaliza qualquer divergência entre os seats que você paga e as pessoas que você cobre — mantenha-os alinhados para evitar surpresas.</Tip>
      </SectionCard>

      {/* ─── 10. INTEGRATIONS ─── */}
      <SectionCard id="integrations" title="10. Integrations">
        <P>Settings → <B>Integrations</B>. Conecte o Ozly às ferramentas que você já usa.</P>
        <SimpleTable
          headers={["Integração", "O que faz", "Status"]}
          rows={[
            ["Stripe", "Cobrança por cartão da sua assinatura", "Ativo"],
            ["Xero / MYOB", "Envia as invoices recebidas para a contabilidade", "Exportação (CSV) hoje; sincronização ao vivo em breve"],
            ["Fontes de trabalho (ServiceM8, Tradify…)", "Puxa trabalhos da sua ferramenta de agendamento", "Em breve"],
          ]}
        />
        <Tip>Se uma integração mostrar &ldquo;Em breve&rdquo;, use a exportação CSV/ABA enquanto isso — ela atende à mesma necessidade.</Tip>
      </SectionCard>

      {/* ─── 11. REPORTS & ACTIVITY ─── */}
      <SectionCard id="reports" title="11. Reports & Activity">
        <SubSection title="Reports">
          <P>Menu lateral → <B>Reports</B>. Totais e detalhamentos ao longo de um período — faturado vs pago, por member, para conciliação e época de impostos.</P>
        </SubSection>
        <SubSection title="Registro de atividades">
          <P>Menu lateral → <B>Activity</B>. Uma linha do tempo de auditoria do que aconteceu no seu workspace (convites, covers, pagamentos, edições) — útil para responsabilização e disputas.</P>
        </SubSection>
      </SectionCard>

      {/* ─── 12. SETTINGS ─── */}
      <SectionCard id="settings" title="12. Settings">
        <BulletList>
          <li><B>Perfil da organização</B> — nome, ABN, logo.</li>
          <li><B>Email de cobrança</B> — para onde as invoices dos ABN holders são entregues (mantenha-o atualizado — acontecem bounces se estiver errado).</li>
          <li><B>Preferências de notificação</B> — sobre o que você recebe por email/push.</li>
          <li><B>Tema</B> — claro/escuro.</li>
        </BulletList>
        <Tip>Dica: o portal inteiro tem uma <B>paleta de comandos ⌘K</B> — pressione para pular rapidamente para qualquer tela ou ação.</Tip>
      </SectionCard>

      {/* ─── 13. FAQ ─── */}
      <SectionCard id="faq" title="13. Perguntas Frequentes">
        <div className="space-y-2">
          <FaqItem q="Eu crio invoices no portal?" a="Não. Cada ABN holder emite a própria invoice no app do Ozly e a envia para você — você recebe, acompanha e paga. Eles são o emissor legal; você continua sendo quem mantém os registros, não um empregador." />
          <FaqItem q="Cobrir alguém torna essa pessoa minha empregada?" a="Não. Cobrir só paga pelo acesso ao ABN dela no Ozly. Ela continua independente sob o próprio ABN. As suas obrigações de Fair Work, super, payroll-tax e workers&rsquo;-comp não mudam — o Ozly te ajuda a documentá-las, não a evitá-las." />
          <FaqItem q="Alguém aparece como &lsquo;já coberto por outra empresa&rsquo; — por quê?" a="Apenas uma organização pode cobrir o acesso de uma pessoa no Ozly por vez (patrocinador único). Ela pode trocar de patrocinador pelo app; a organização anterior mantém 7 dias de carência." />
          <FaqItem q="O que acontece com as pessoas cobertas se eu cancelar?" a="Elas ganham uma janela de carência de 7 dias mais uma notificação, para poderem manter o acesso assinando por conta própria antes que expire." />
          <FaqItem q="Como eu pago todo mundo de fato?" a="Marque as invoices como pagas conforme você as paga, ou selecione em massa e exporte um arquivo ABA para subir no seu banco e pagar o lote de uma vez." />
          <FaqItem q="Uma invoice aparece como &lsquo;Bounced&rsquo; em Deliveries." a="O seu email de cobrança está errado ou bloqueado. Corrija em Settings e então o ABN holder pode reenviar pelo app." />
          <FaqItem q="Existe um teste grátis?" a="Sim — 14 dias para novas organizações. Depois disso, o seu plano se renova automaticamente, a menos que você cancele antes do fim." />
        </div>
      </SectionCard>
    </>
  );
}
