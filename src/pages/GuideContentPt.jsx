export default function GuideContentPt({ SectionCard, SubSection, StepList, BulletList, Tip, InfoBox, SimpleTable, P, B, FaqItem }) {
  return (
    <>
      {/* ─── 1. PRIMEIROS PASSOS ─── */}
      <SectionCard id="primeiros-passos" title="1. Primeiros Passos (Login e Cadastro)">
        <InfoBox>
          <B>Vídeo:</B>{" "}
          <a href="https://youtube.com/shorts/Y-ftNz2fGDw?feature=share" target="_blank" rel="noopener noreferrer" className="underline font-semibold">
            Como criar uma conta (YouTube)
          </a>
        </InfoBox>
        <SubSection title="Criar conta com Email">
          <StepList>
            <li>Abra o Ozly</li>
            <li>Toque em <B>"Sign Up"</B> no seletor Login/Sign Up (canto superior)</li>
            <li>Preencha o <B>Email</B> — o campo valida o formato automaticamente</li>
            <li>Crie uma <B>Senha</B> — enquanto digita, você verá:
              <BulletList>
                <li><B>Barra de força da senha</B> (vermelha = fraca, laranja = razoável, amarela = boa, verde = forte)</li>
                <li><B>Chips de requisitos</B> que ficam verdes: <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">6+ chars</code>, <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">A-Z</code>, <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">0-9</code>, <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">!@#</code></li>
              </BulletList>
            </li>
            <li>Preencha <B>Confirmar Senha</B> — check verde = coincidem, X vermelho = não coincidem</li>
            <li><B>Código de indicação</B> (opcional) — cole o código de um amigo para creditar a ele. Se você veio de um link de indicação (<code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">ozly.au/refer/?code=XXX</code>) o campo já vem <B>preenchido e bloqueado</B> (cinza, com cadeado pequeno) — o código se aplica automaticamente ao finalizar o cadastro.</li>
            <li>Toque em <B>"Sign Up"</B> (botão grande verde)</li>
            <li>Pronto! Você será direcionado para a tela de Setup</li>
          </StepList>
          <Tip>O código que você usou aparece depois no <B>Dashboard de Indicação</B> para você confirmar que foi aplicado.</Tip>
        </SubSection>

        <SubSection title="Criar conta com Google">
          <StepList>
            <li>Abra o Ozly</li>
            <li>Toque em <B>"Continue with Google"</B> (botão com logo do Google)</li>
            <li>Selecione sua conta Google no popup do sistema</li>
            <li>Autorize o acesso</li>
            <li>Pronto! Redirecionado para Setup (ou Dashboard se já tem perfil)</li>
          </StepList>
        </SubSection>

        <SubSection title="Fazer Login (já tem conta)">
          <StepList>
            <li>Deixe em <B>"Login"</B> no seletor</li>
            <li>Digite <B>Email</B> e <B>Senha</B></li>
            <li>Toque em <B>"Login"</B></li>
            <li>Ou toque em <B>"Continue with Google"</B> para login rápido</li>
          </StepList>
        </SubSection>

        <SubSection title="Esqueci minha Senha">
          <StepList>
            <li>Na tela de Login, toque em <B>"Forgot Password?"</B> (texto azul à direita)</li>
            <li>Um dialog aparece pedindo seu email</li>
            <li>Digite o email e toque em <B>"Reset"</B></li>
            <li>Verifique sua caixa de entrada (e pasta de spam)</li>
            <li>Clique no link recebido para criar uma nova senha</li>
          </StepList>
        </SubSection>

        <Tip>Toque no <B>ícone de olho</B> ao lado do campo de senha para alternar entre mostrar e esconder o texto.</Tip>
      </SectionCard>

      {/* ─── 2. SETUP ─── */}
      <SectionCard id="setup" title="2. Configuração Inicial (Setup)">
        <InfoBox>
          <B>Vídeo:</B>{" "}
          <a href="https://youtube.com/shorts/Y-ftNz2fGDw?feature=share" target="_blank" rel="noopener noreferrer" className="underline font-semibold">
            Configuração inicial (YouTube)
          </a>
        </InfoBox>
        <P>Após criar a conta, o Setup pede apenas o essencial para você começar.</P>

        <SubSection title="Campos Obrigatórios">
          <StepList>
            <li><B>Foto de Perfil</B> (opcional mas recomendado) — Toque no avatar circular. Opções: Câmera, Galeria ou Remover.</li>
            <li><B>Nome Completo</B> (obrigatório) — Como aparecerá nas invoices. Máximo 100 caracteres.</li>
            <li><B>Código Postal</B> (opcional) — 4 dígitos (ex: 2000 para Sydney).</li>
            <li><B>Tipo de Visto</B> (obrigatório) — Toque em um dos 4 cards:
              <BulletList>
                <li><B>Work Visa</B> — Isento de Medicare Levy</li>
                <li><B>Student Visa</B> — Isento de Medicare, limite 48h/quinzena</li>
                <li><B>Permanent Resident</B> — Paga Medicare 2%</li>
                <li><B>Citizen</B> — Paga Medicare 2%</li>
              </BulletList>
            </li>
            <li><B>Hourly Rate (Taxa Horária)</B> (obrigatório) — Valor padrão: $45.00. Altere para seu valor real.</li>
          </StepList>
        </SubSection>

        <SubSection title="Campos Opcionais (Seção Expansível)">
          <P>Toque na barra <B>"Business Details (Optional)"</B> para expandir:</P>
          <BulletList>
            <li><B>ABN</B> — 11 dígitos (validado se preenchido)</li>
            <li><B>Categoria do ABN</B> — dropdown (Cleaning, Gardening, Construction, etc.)</li>
            <li><B>Company Name</B> — nome da empresa</li>
            <li><B>BSB</B> — 6 dígitos no formato 000-000</li>
            <li><B>Account Number</B> — número da conta bancária</li>
            <li><B>PayID</B> — email, telefone ou ABN</li>
          </BulletList>
          <Tip>Pule esses campos agora. Quando for criar sua primeira invoice, o Ozly vai te avisar para completar esses dados com um botão direto para o Perfil.</Tip>
        </SubSection>

        <SubSection title="Finalizar">
          <P>Toque em <B>"Get Started"</B> (botão verde grande). O Ozly salva tudo e te leva para a tela de Boas-vindas.</P>
        </SubSection>
      </SectionCard>

      {/* ─── 3. WELCOME TRIAL ─── */}
      <SectionCard id="welcome-trial" title="3. Sua Primeira Fatura (Grátis) e Escolha do Plano">
        <P>O Ozly te leva direto ao valor: logo após o Setup, te guiamos na criação da <B>sua primeira invoice de graça</B> — sem cartão, sem plano, sem compromisso. Você só escolhe um plano <B>depois</B> de enviar essa primeira.</P>

        <SubSection title="Crie sua primeira invoice (grátis)">
          <StepList>
            <li><B>"Vamos configurar sua primeira invoice"</B> — digite o <B>nome do cliente</B> (e email, opcional). Toque em <B>"Next"</B>.</li>
            <li><B>"O que você fez para ele?"</B> — digite uma <B>descrição curta do serviço</B>, o <B>valor total</B> e a <B>data</B>. Toque em <B>"Review my invoice"</B>.</li>
            <li>Revise a invoice na próxima tela e envie. <B>Essa primeira invoice é grátis</B> — só é preciso assinar para enviar mais.</li>
          </StepList>
          <Tip>Prefere explorar primeiro? Você pode pular e chegar em tudo pelo Dashboard — mas criar essa primeira invoice é o jeito mais rápido de ver o que o Ozly faz.</Tip>
        </SubSection>

        <SubSection title="Os 2 planos">
          <P>Quando você for enviar uma segunda invoice (ou abrir uma feature Pro), o Ozly oferece um <B>trial grátis de 14 dias</B> em um de dois planos:</P>
          <SimpleTable
            headers={["Plano", "Para quem"]}
            rows={[
              ["ABN", "Contractors / freelancers — emite invoices, gerencia clientes, despesas com OCR, análises fiscais"],
              ["PRO", "Tudo do ABN + ferramentas fiscais avançadas — melhor custo-benefício"],
            ]}
          />
        </SubSection>

        <SubSection title="Começar o trial">
          <P>Escolha um plano, toque em <B>"Start Free Trial"</B> e confirme no App Store / Google Play. Você ganha <B>14 dias de acesso completo</B> sem nada cobrado.</P>
        </SubSection>

        <Tip>O trial começa imediatamente e nada é cobrado de antemão. Cancele antes de terminar pelo App Store / Google Play sem cobrança.</Tip>
      </SectionCard>

      {/* ─── 4. DASHBOARD ─── */}
      <SectionCard id="dashboard" title="4. Dashboard — Tela Principal">
        <InfoBox>
          <B>Vídeo:</B>{" "}
          <a href="https://youtube.com/shorts/U0kqn1DQ80M?feature=share" target="_blank" rel="noopener noreferrer" className="underline font-semibold">
            Como usar o Dashboard (YouTube)
          </a>
        </InfoBox>
        <P>O Dashboard é o centro de controle do Ozly. Tudo que você precisa em uma tela.</P>

        <SubSection title="Barra Superior (App Bar)">
          <SimpleTable
            headers={["Posição", "Ícone", "Ação"]}
            rows={[
              ["Esquerda", "Menu Hamburger", "Abre o menu lateral (Drawer)"],
              ["Centro", "Logo Ozly", "Apenas visual"],
              ["—", "Sync (nuvem)", "Aparece quando offline/erro. Toque para forçar sync"],
              ["—", "Calendário (badge)", "Vai para Jobs com sync do Google Calendar"],
              ["—", "Sino (badge)", "Abre Centro de Notificações"],
              ["Direita", "Exportar", "Copia resumo do Dashboard"],
            ]}
          />
        </SubSection>

        <SubSection title="Cards do Dashboard">
          <P><B>Pending Jobs</B> — Até 3 jobs completos sem invoice. Botões: Complete (verde) e Cancel (vermelho).</P>
          <P><B>Setup/Invite Card</B> — Aparece se o perfil está incompleto.</P>
          <P><B>GST Alert</B> — Aparece se receita anual projetada {">"} $75.000.</P>
          <P><B>Seletor de Período</B> — Weekly / Fortnightly / Monthly. Ícone de calendário para intervalo personalizado.</P>
          <P><B>Forecast (Previsão)</B> — Projeção de receita. Toque para ver modal com 4 filtros: Scheduled (roxo), To Invoice (laranja), To Receive (amarelo), Received (verde).</P>
          <P><B>Invoice Cards</B> — "To Invoice" (laranja): jobs prontos para faturar. "Overdue" (vermelho): invoices atrasadas.</P>
          <P><B>Next Shift</B> — Próximo trabalho com countdown. Toque para Complete, Cancel, Edit ou abrir Google Maps.</P>
          <P><B>Deductible Expenses</B> — Economia fiscal estimada. "View All" para detalhamento, "New Expense" para adicionar.</P>
          <P><B>Referral</B> — Card verde "Ganhe 1 Mês Grátis". Toque para compartilhar.</P>
        </SubSection>

        <Tip>Puxe a tela para baixo (pull-to-refresh) para forçar sincronização completa.</Tip>
      </SectionCard>

      {/* ─── 5. MENU LATERAL ─── */}
      <SectionCard id="menu-lateral" title="5. Menu Lateral (Drawer)">
        <InfoBox>
          <B>Vídeo:</B>{" "}
          <a href="https://youtube.com/shorts/3uOvNdymxec?feature=share" target="_blank" rel="noopener noreferrer" className="underline font-semibold">
            Como navegar o menu lateral (YouTube)
          </a>
        </InfoBox>
        <P>Acesse deslizando da esquerda para a direita ou tocando no menu hamburger.</P>

        <SubSection title="Navegação">
          <P>O menu agrupa os itens pelo que você mais usa: <B>Jobs</B> e <B>Financial</B> no topo, depois suas ferramentas.</P>
          <SimpleTable
            headers={["Item", "Vai para", "Observação"]}
            rows={[
              ["Jobs", "Tela de Jobs", "—"],
              ["Financial", "Tela Financeira", "—"],
              ["Expenses", "Tela de Despesas", "—"],
              ["Contractors", "Tela de Contratantes", "—"],
              ["Organisations", "Tela de Organizações", "Só se uma empresa te convidar"],
              ["Fiscal", "Tela Fiscal", "Requer Pro"],
              ["Visa Shield", "Monitor de horas", "Requer Pro + visto work/student"],
              ["Hustle", "Gamificação (XP)", "—"],
              ["Settings", "Configurações", "—"],
            ]}
          />
          <InfoBox>Items marcados "Requer Pro" abrem a tela de Paywall se você não é assinante.</InfoBox>
        </SubSection>

        <SubSection title="Outras opções">
          <BulletList>
            <li><B>Avatar / Nome</B> — Toque para ir ao Perfil</li>
            <li><B>Seletor de ABN</B> — Troque o ABN ativo ou selecione "All"</li>
            <li><B>Hustle Score</B> — XP, nível, barra de progresso</li>
            <li><B>Logout</B> — Confirmação antes de sair</li>
            <li><B>Última Sincronização</B> — Timestamp no rodapé</li>
          </BulletList>
        </SubSection>
      </SectionCard>

      {/* ─── 6. JOBS ─── */}
      <SectionCard id="jobs" title="6. Jobs (Trabalhos)">
        <InfoBox>
          <B>Vídeo:</B>{" "}
          <a href="https://youtube.com/shorts/2ef45Y-oCCo?feature=share" target="_blank" rel="noopener noreferrer" className="underline font-semibold">
            Como criar um novo trabalho (YouTube)
          </a>
        </InfoBox>
        <SubSection title="Como chegar">
          <SimpleTable
            headers={["Caminho", "Como"]}
            rows={[
              ["Menu lateral", 'Drawer → "Jobs"'],
              ["Dashboard", 'Card "Pending Jobs" → "View All"'],
              ["Dashboard", 'Card "Next Shift" → "View All"'],
              ["Dashboard", "Ícone de calendário no App Bar"],
            ]}
          />
        </SubSection>

        <SubSection title="Visualizações">
          <BulletList>
            <li><B>Lista</B> — Todos os jobs com filtros e busca por texto</li>
            <li><B>Calendário</B> — Visualização mensal/semanal dos jobs no calendário. Toque em um <B>dia</B> para ver os jobs daquele dia; toque em um <B>job dentro do calendário</B> para abrir os detalhes. Use o FAB "+" para criar job já com a data selecionada preenchida.</li>
          </BulletList>
          <P><B>Filtros disponíveis:</B> Status (confirmed, pending, completed, cancelled), Período (today, tomorrow, in N days, overdue) e Business/ABN.</P>
        </SubSection>

        <SubSection title="Criar um novo Job">
          <P>Toque no botão <B>"+ New Job"</B> (flutuante) ou no Dashboard <B>"Add Job"</B>.</P>
          <StepList>
            <li><B>Título</B> — nome do serviço (obrigatório, max 200 chars)</li>
            <li><B>Data</B> — toque no calendário</li>
            <li><B>Horário de Início</B> e <B>Fim</B></li>
            <li><B>Contractor</B> — dropdown (preenche hourly rate automaticamente)</li>
            <li><B>Business/ABN</B> — dropdown</li>
            <li><B>Hourly Rate</B> — preenchido auto, editável</li>
            <li><B>Localização</B> — endereço (max 300 chars)</li>
            <li><B>Notas</B> — informações extras (max 1000 chars)</li>
            <li><B>Skip Invoice</B> — checkbox se não precisa de fatura</li>
            <li>Toque <B>"Save"</B></li>
          </StepList>
          <Tip><B>Aviso de feriado:</B> se a data escolhida cair em um <B>feriado público australiano do seu estado</B>, um dialog aparece — "A(s) data(s) abaixo caem em feriado público em [ESTADO]. Criar o job mesmo assim?" — com <B>Continuar</B> ou <B>Cancelar</B>. Funciona tanto em Add Job quanto em Edit Job. Se seu estado não estiver preenchido no perfil, o Ozly deduz pelo CEP (postcode).</Tip>
        </SubSection>

        <SubSection title="Jobs Recorrentes (Recorrência Custom)">
          <P>Ao criar um job, toque em <B>Recorrência → Custom</B> para abrir o picker.</P>
          <BulletList>
            <li><B>Repete a cada</B> — 1 semana, 2 semanas, 3 semanas ou 4 semanas</li>
            <li><B>Termina em</B> — 1 mês, 6 meses, 12 meses ou escolha uma <B>data final personalizada</B></li>
          </BulletList>
          <P>O Ozly cria todas as ocorrências de uma vez, então elas aparecem no calendário e nas horas do Visa Shield. Cada ocorrência ainda pode ser editada ou cancelada individualmente.</P>
        </SubSection>

        <SubSection title="Interagir com um Job">
          <SimpleTable
            headers={["Ação", "O que faz"]}
            rows={[
              ["Complete", "Marca como completo + registra horas"],
              ["Cancel", "Cancela com confirmação"],
              ["Edit", "Abre formulário de edição"],
              ["Reschedule", "Altera data/hora"],
              ["Create Invoice", "Cria invoice com este job"],
              ["Add Receipt", "Abre câmera/galeria para comprovante"],
              ["Maps", "Abre Google Maps com direção"],
              ["Delete", "Remove permanentemente"],
            ]}
          />
          <P>Deslize o job para a esquerda para deletar. Indicador "In Progress" aparece durante o horário do job. Puxe para baixo (<B>pull-to-refresh</B>) para atualizar a lista com o que o servidor tem.</P>
        </SubSection>

        <SubSection title="Ações em Lote (Multi-select)">
          <P>Útil quando importou muitos jobs do Google Calendar e precisa corrigir rate em vários de uma vez, ou limpar jobs antigos.</P>
          <StepList>
            <li><B>Pressione e segure</B> qualquer card → ativa o modo multi-select (aparecem checkboxes).</li>
            <li>Toque em outros cards para adicionar ou remover da seleção.</li>
            <li>Na barra superior aparecem dois ícones: <B>lápis</B> (alterar valor/hora em todos os selecionados) e <B>lixeira</B> (deletar todos com confirmação).</li>
            <li>Toque no <B>X</B> no canto superior esquerdo para sair do modo.</li>
          </StepList>
        </SubSection>

        <SubSection title="Marcar Job como Completo (3 caminhos)">
          <BulletList>
            <li>Tela de Jobs → Toque no job → "Complete"</li>
            <li>Dashboard → Card "Pending Jobs" → botão verde (check)</li>
            <li>Dashboard → Card "Next Shift" → Toque → "Complete Job"</li>
          </BulletList>
          <InfoBox>Após completar, aparece um <B>bottom sheet de celebração</B> mostrando: horas trabalhadas, receita gerada, XP ganho e um <B>timer visual do Golden Hour</B> (60 minutos para criar invoice = 2x XP). A partir dessa tela você pode tocar em <B>"Generate Invoice"</B> para faturar na hora.</InfoBox>
        </SubSection>
      </SectionCard>

      {/* ─── 7. CONTRACTORS ─── */}
      <SectionCard id="contractors" title="7. Contractors (Contratantes)">
        <InfoBox>
          <B>Vídeo:</B>{" "}
          <a href="https://youtube.com/shorts/fBN6d0GEeNs?feature=share" target="_blank" rel="noopener noreferrer" className="underline font-semibold">
            Como criar um contractor (YouTube)
          </a>
        </InfoBox>
        <P>Menu lateral → <B>"Contractors"</B>. Duas abas: <B>Agencies</B> e <B>Direct Clients</B>.</P>

        <SubSection title="Criar novo Contractor">
          <P>Botão <B>"+ Add Contractor"</B> ou durante criação de Job/Invoice → <B>"New Client"</B>.</P>
          <StepList>
            <li><B>Tipo</B>: "Agency" ou "Direct Client"</li>
            <li><B>"Import from Contacts"</B> — abre a agenda do celular. Importa automaticamente: <B>nome, telefone e email</B>. ABN, endereço e hourly rate você preenche na mão.</li>
            <li><B>Nome</B> (obrigatório), <B>Email</B>, <B>Telefone</B>, <B>ABN</B>, <B>Endereço</B>, <B>Hourly Rate</B> (padrão), <B>Notas</B></li>
            <li>Toque <B>"Save"</B></li>
          </StepList>
        </SubSection>

        <SubSection title="Ações disponíveis">
          <SimpleTable
            headers={["Ação", "O que faz"]}
            rows={[
              ["Call", "Liga para o número"],
              ["WhatsApp", "Abre WhatsApp no número"],
              ["SMS", "Abre SMS"],
              ["Email", "Abre app de email"],
              ["Create Invoice", "Cria invoice para este contractor"],
              ["Create Job", "Cria job para este contractor"],
              ["Edit", "Edita dados"],
              ["Delete", "Remove com confirmação"],
            ]}
          />
        </SubSection>
      </SectionCard>

      {/* ─── 8. INVOICES ─── */}
      <SectionCard id="invoices" title="8. Invoices (Faturas)">
        <InfoBox>
          <B>Vídeo:</B>{" "}
          <a href="https://youtube.com/shorts/4PrnOG9wh50?feature=share" target="_blank" rel="noopener noreferrer" className="underline font-semibold">
            Como criar uma invoice (YouTube)
          </a>
        </InfoBox>
        <SubSection title="6 caminhos para criar uma Invoice">
          <SimpleTable
            headers={["#", "Caminho", "Pré-preenchimento"]}
            rows={[
              ["1", 'Financial → botão "+"', "Em branco"],
              ["2", "Financial → FAB flutuante", "Em branco"],
              ["3", 'Dashboard → "To Invoice" → selecionar jobs', "Contractor + Jobs"],
              ["4", 'Dashboard → Next Shift → Complete → "Generate Invoice"', "Job completo"],
              ["5", 'Dashboard → Forecast → "To Invoice" → toque no job', "Job selecionado"],
              ["6", 'Contractors → toque → "Create Invoice"', "Contractor selecionado"],
            ]}
          />
        </SubSection>

        <SubSection title="Passo a passo">
          <StepList>
            <li><B>Aviso de dados incompletos</B> — Se ABN/dados bancários vazios, aparece dialog com opção "Complete Profile" ou "Later".</li>
            <li><B>Selecionar Contractor</B> — Dropdown. "New Client" para criar na hora.</li>
            <li><B>Selecionar Business/ABN</B> — Dropdown. "New ABN" para criar na hora.</li>
            <li><B>Número da Invoice</B> — Gerado automaticamente (INV-0001, INV-0002...). Editável.</li>
            <li><B>Datas</B> — Emissão (padrão: hoje) e Vencimento (padrão: 14 dias).</li>
            <li><B>Selecionar Jobs</B> — Lista de jobs completos com checkbox.</li>
            <li><B>Item Manual</B> — Toque "Manual Item". Preencha descrição, horas, rate. Opção de <B>salvar como template</B> para reutilizar em futuras invoices.</li>
            <li><B>GST</B> — Toggle para incluir/excluir 10%. Aviso automático se receita {">"} $75k.</li>
            <li><B>Notas</B> — Termos e condições.</li>
            <li><B>Resumo</B> — Subtotal, GST, Total em tempo real.</li>
            <li><B>Criar</B> — Toque "Create Invoice". Gera PDF + mostra XP ganho + Golden Hour se aplicável.</li>
          </StepList>
        </SubSection>

        <SubSection title="Envio (após criar)">
          <SimpleTable
            headers={["Opção", "Ação"]}
            rows={[
              ["WhatsApp (verde)", "Abre WhatsApp com template + PDF"],
              ["Email (azul)", "Email com assunto e corpo pré-preenchidos"],
              ["SMS (índigo)", "Envia mensagem com link/PDF via SMS"],
              ["Share PDF (roxo)", "Gaveta de compartilhamento do sistema"],
              ["Download PDF (teal)", "Salva na pasta Downloads"],
              ["Print (cinza)", "Imprime via impressora nativa do sistema"],
              ["Close", "Fecha sem enviar (salva como draft)"],
            ]}
          />
          <InfoBox>Faturando uma empresa que usa o Ozly for Business? Aparece uma opção extra <B>"Send directly to [Company]"</B> para a invoice cair direto no portal dela — veja a seção 9 (Organizações).</InfoBox>
        </SubSection>
      </SectionCard>

      {/* ─── 9. ORGANISATIONS ─── */}
      <SectionCard id="organisations" title="9. Organizações (Trabalhar para uma Empresa)">
        <P>Se uma empresa de limpeza ou agência usa o <B>Ozly for Business</B>, ela pode te convidar como <B>sub-contractor</B>. Você continua 100% independente — o Ozly nunca cria vínculo empregatício — mas as invoices que você emite <B>para essa empresa</B> aparecem direto no portal dela, e ela pode te oferecer trabalho.</P>

        <SubSection title="Aceitar um convite">
          <StepList>
            <li>A empresa te envia um <B>link de convite</B> (parecido com <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">ozly.au/invite/…</code>) por WhatsApp, SMS ou email.</li>
            <li>Toque no link — o Ozly abre a tela <B>"[Company] te convidou para entrar como sub-contractor"</B>. (Sem o link em mãos? Menu lateral → <B>Organisations</B> → <B>"Have an invite link?"</B> → cole.)</li>
            <li>Leia o aviso: ao aceitar, a empresa vê as invoices que você emite <B>para ela</B> — nada mais. Você pode revogar a qualquer momento.</li>
            <li>Toque em <B>"Accept invitation"</B> (ou <B>"Decline"</B>).</li>
            <li><B>Um último passo</B> — vincule um registro de contractor à empresa. Escolha <B>"Create a new contractor named '[Company]'"</B> (recomendado) ou selecione um existente, e toque em <B>"Continue"</B>.</li>
            <li>Pronto — <B>"You're in."</B> As invoices que você emite para esta organização agora ficam visíveis para ela.</li>
          </StepList>
        </SubSection>

        <SubSection title="A tela de Organisations">
          <P>Menu lateral → <B>Organisations</B>. Cada empresa em que você entrou aparece como um card com:</P>
          <BulletList>
            <li><B>Status</B> — <B>Active</B> (teal), <B>Pending</B> (âmbar) ou <B>Declined</B> (cinza)</li>
            <li><B>Seu papel</B> — geralmente "Member"</li>
            <li><B>Cadência de faturamento</B> — com que frequência ela agrupa suas invoices (Weekly / Fortnightly / Monthly) e quando o ciclo começa</li>
            <li><B>Dica de subsídio</B> — se a empresa cobre seu plano ABN, você vê quanto economiza</li>
          </BulletList>
          <InfoBox>Se a empresa altera os termos de um job que você aceitou, aparece um banner amarelo: <B>"N engagement(s) need your re-confirmation"</B> — toque para ir aos Jobs e aceitar ou rejeitar a mudança (veja abaixo).</InfoBox>
        </SubSection>

        <SubSection title="Enviar uma invoice direto para a empresa">
          <P>Quando você cria uma invoice para um contractor vinculado a uma organização, aparece um bloco extra no compositor da invoice:</P>
          <BulletList>
            <li>Toggle <B>"Send directly to [Company]"</B> (ON por padrão) — envia o PDF por email para a caixa de faturamento da empresa, para cair no portal dela.</li>
            <li><B>"Email me a copy"</B> — marque para também receber o PDF você mesmo.</li>
          </BulletList>
          <P>Depois de enviar, um pequeno <B>badge de entrega</B> mostra o status ao lado da invoice:</P>
          <SimpleTable
            headers={["Badge", "Significado"]}
            rows={[
              ["📤 ✓ Delivered", "A empresa recebeu o email"],
              ["📤 ⏱ Queued", "Enviando — confira de novo em instantes"],
              ["📤 ⚠ Bounced", "Caixa errada ou bloqueada — veja abaixo"],
              ["📤 ❌ Failed", "Falha no envio — tente de novo"],
            ]}
          />
          <P>Toque no badge para abrir os detalhes. Se deu bounce ou falhou, toque em <B>"Try sending again"</B> depois que a empresa confirmar o email de faturamento.</P>
        </SubSection>

        <SubSection title="Mudanças no job e confirmação de pagamento">
          <P><B>Mudança de job proposta</B> — Quando a empresa ajusta um job (horário, local, valor…), você recebe uma push notification e um banner naquele job: <B>"Your business proposed a change"</B> mostrando o antes e o depois. Toque em <B>"Accept change"</B> ou <B>"Reject"</B>.</P>
          <P><B>Confirmar pagamento recebido</B> — Quando a empresa marca uma das suas invoices como paga, ela aparece no Financial com um botão <B>"Confirm payment received"</B>. Toque assim que o dinheiro realmente cair — isso mantém seus registros e os dela sincronizados.</P>
        </SubSection>

        <SubSection title="Conversar com a empresa (mensagens nos dois sentidos)">
          <P>Invoices e jobs vinculados a uma organização têm um botão <B>Messages</B> que abre um chat com a empresa. Suas mensagens ficam à direita; as dela (marcadas como <B>"Business"</B>) à esquerda — prático para resolver uma correção sem sair do app.</P>
        </SubSection>

        <Tip>Trabalhar para uma empresa pelo Ozly não muda sua configuração fiscal — você continua emitindo suas próprias invoices sob seu próprio ABN e segue independente.</Tip>
      </SectionCard>

      {/* ─── 10. EXPENSES ─── */}
      <SectionCard id="expenses" title="10. Expenses (Despesas)">
        <InfoBox>
          <B>Vídeo:</B>{" "}
          <a href="https://youtube.com/shorts/oTwY3_WD_H8?feature=share" target="_blank" rel="noopener noreferrer" className="underline font-semibold">
            Como adicionar uma despesa (YouTube)
          </a>
        </InfoBox>
        <SubSection title="Adicionar uma Despesa">
          <StepList>
            <li><B>Tirar Foto do Recibo</B> — Câmera ou Galeria. O OCR extrai valor, data e nome automaticamente.</li>
            <li><B>Selecionar Business/ABN</B></li>
            <li><B>Preencher Campos</B> — Merchant Name, Data, Total Amount, Categoria (Fuel, Tools, Uniform, Phone, Insurance, Vehicle, Office, Training, Other), Description.</li>
            <li><B>Itens Dedutíveis</B> — Expanda a seção e marque os itens aplicáveis. O Claimable Amount recalcula automaticamente.</li>
            <li><B>Salvar</B> — Toque "Save". Ganha XP.</li>
          </StepList>
        </SubSection>

        <SubSection title="Itens Dedutíveis por Categoria">
          <SimpleTable
            headers={["Categoria", "Itens"]}
            rows={[
              ["Fuel", "Travel between jobs, Client site visits"],
              ["Tools", "Cleaning equipment, Consumable supplies, Safety gear"],
              ["Uniform", "Work uniform, Protective clothing, Laundry"],
              ["Phone", "Work calls, Work data/internet, Work apps"],
              ["Insurance", "Professional indemnity, Income protection"],
              ["Vehicle", "Work travel, Maintenance, Registration, Car insurance"],
              ["Office", "Home office costs, Stationery, Software/subscriptions"],
              ["Training", "Work courses, Certifications, Study materials"],
            ]}
          />
        </SubSection>

        <SubSection title="Filtros e Exportação">
          <BulletList>
            <li><B>Categoria</B>: filtra por tipo</li>
            <li><B>Período</B>: All time / This month / Last month / Fiscal year</li>
            <li><B>"Only Deductible"</B>: mostra apenas despesas com valor dedutível</li>
            <li><B>Exportar</B>: ícone Export → modo de seleção → "Share Selected" como CSV</li>
          </BulletList>
        </SubSection>
      </SectionCard>

      {/* ─── 11. FINANCIAL ─── */}
      <SectionCard id="financial" title="11. Financial (Financeiro)">
        <P>Menu lateral → <B>"Financial"</B>.</P>

        <SubSection title="Cards de Resumo">
          <SimpleTable
            headers={["Card", "Toque → Mostra"]}
            rows={[
              ["This Period", "Invoices do período atual"],
              ["Pending", "Invoices aguardando pagamento"],
              ["Received", "Invoices pagas"],
              ["Overdue", "Invoices atrasadas"],
            ]}
          />
        </SubSection>

        <SubSection title="Ações em uma Invoice">
          <SimpleTable
            headers={["Ação", "O que faz"]}
            rows={[
              ["Delete", "Remove permanentemente"],
              ["Edit", "Reabre para edição"],
              ["Export", "Gera PDF ou Excel"],
              ["Mark as Paid", "Muda status + animação"],
              ["Share", "Gera PDF e compartilha"],
              ["WhatsApp/SMS/Email", "Envia lembrete"],
            ]}
          />
        </SubSection>

        <SubSection title="Mark Paid / Mark Unpaid (toggle)">
          <P>Abra qualquer invoice em <B>Financial</B> (toque para expandir o detalhe). O botão principal de ação é um <B>toggle</B>:</P>
          <BulletList>
            <li>Se a invoice <B>ainda não foi paga</B> → o botão diz <B>"Mark as Paid"</B>. Tocando, o status vira <B>Paid</B> com a animação de confete/celebração de sempre.</li>
            <li>Se a invoice <B>já está Paid</B> → o botão muda para <B>"Mark Unpaid"</B> (com um ícone de desfazer). Tocando, o status volta para <B>Sent</B> — sem animação de celebração desta vez.</li>
          </BulletList>
          <Tip>Útil quando você tocou em "Paid" sem querer ou um pagamento foi estornado e a invoice precisa voltar para a lista de pendentes.</Tip>
        </SubSection>

        <SubSection title="Meta de Receita">
          <P>Defina uma meta com <B>"Set Goal"</B>. Acompanhe o progresso com barra visual e <B>"Edit Goal"</B> para ajustar.</P>
        </SubSection>
      </SectionCard>

      {/* ─── 12. FISCAL ─── */}
      <SectionCard id="fiscal" title="12. Fiscal (Impostos)">
        <P>Menu lateral → <B>"Fiscal"</B> (requer Pro).</P>

        <SubSection title="Tabelas de Imposto (ATO 2024-26)">
          <P><B>Residentes Fiscais:</B></P>
          <SimpleTable
            headers={["Faixa", "Taxa"]}
            rows={[
              ["$0 – $18.200", "0% (isento)"],
              ["$18.201 – $45.000", "16%"],
              ["$45.001 – $135.000", "30%"],
              ["$135.001 – $190.000", "37%"],
              ["$190.001+", "45%"],
            ]}
          />
          <P><B>Não-Residentes:</B> 30% desde o primeiro dólar.</P>
          <P><B>Working Holiday (417/462):</B> 15% fixo até $45k, depois taxas marginais.</P>
        </SubSection>

        <SubSection title="Configurações Fiscais">
          <BulletList>
            <li><B>Tipo de Visto</B> — Recalcula tabela de imposto e Medicare</li>
            <li><B>Tax Resident</B> — Toggle. Impacto: faixa isenta $18.200 vs 30% desde $1</li>
            <li><B>Medicare Levy</B> — 2% sobre renda tributável (só residentes/PR, não WHM)</li>
            <li><B>GST</B> — Toggle manual ou alerta automático se receita {">"} $75k</li>
            <li><B>Work Type</B> — ABN</li>
          </BulletList>
        </SubSection>

        <SubSection title="Medicare Levy — Detalhes">
          <BulletList>
            <li>Renda abaixo de <B>$27.222</B>: isento</li>
            <li>Renda entre <B>$27.222 e $34.028</B>: fase de transição (10% × diferença)</li>
            <li>Renda acima de <B>$34.028</B>: 2% completo</li>
            <li><B>Working Holiday Makers</B>: isentos de Medicare Levy</li>
          </BulletList>
        </SubSection>

        <SubSection title="Card de Economia Fiscal">
          <P>6 badges de marcos: $100, $200, $500, $1.000, $2.000, $5.000. Toque em qualquer badge para ver equivalência divertida.</P>
        </SubSection>

        <SubSection title="Estimativa de Imposto">
          <P>Mostra: Renda Total → Deduções → Renda Tributável → Imposto → Medicare → Total. Botão "i" para breakdown detalhado por faixa.</P>
        </SubSection>

        <SubSection title="Outras Rendas e Créditos">
          <P>Toque <B>"+"</B> para adicionar rendas extras ou impostos já pagos.</P>
          <BulletList>
            <li><B>Tipo:</B> Income (renda) ou Tax Paid (imposto já recolhido)</li>
            <li><B>Frequência:</B> weekly, fortnightly, monthly ou X vezes por semana</li>
            <li>Pode ser <B>ano fiscal completo</B> ou <B>pro-rata</B></li>
            <li>Valores são anualizados automaticamente para o cálculo</li>
          </BulletList>
        </SubSection>

        <SubSection title="Comparação de Horas ABN (Pro)">
          <P>Compare suas horas trabalhadas com outros profissionais da mesma categoria ABN na Austrália.</P>
          <BulletList>
            <li><B>Período:</B> 4, 8 ou 12 semanas</li>
            <li><B>Filtro por Estado:</B> compare dentro do seu estado australiano</li>
            <li><B>Estatísticas:</B> média, mediana, mínimo e máximo do grupo</li>
            <li><B>Ranking percentil:</B> veja onde você se posiciona no grupo</li>
          </BulletList>
        </SubSection>

        <InfoBox>Apenas estimativas. Baseado nas tabelas ATO 2024-26. Consulte um contador registrado (tax agent).</InfoBox>
      </SectionCard>

      {/* ─── 13. VISA SHIELD ─── */}
      <SectionCard id="visa-shield" title="13. Visa Shield (Controle de Horas)">
        <P>Menu lateral → <B>"Visa Shield"</B> (Pro, apenas work/student visa).</P>

        <SubSection title="Tela Principal">
          <BulletList>
            <li>Horas trabalhadas em destaque: <B>"Xh / 48h"</B></li>
            <li>Barra de progresso: Verde {"<"} 40h (seguro), Laranja 40-47h (alerta), Vermelho {">"}= 47h (perigo)</li>
            <li>Alerta STOP! (vermelho, {">"}= 47h) ou WARNING! (laranja, 40-47h)</li>
          </BulletList>
        </SubSection>

        <SubSection title="Detalhamento e Adição Manual">
          <P>Lista de cada registro com título do job, data e horas. Botões de editar e deletar em cada item.</P>
          <P>Toque no <B>"+"</B> flutuante para adicionar horas manualmente: Job, Data, Horas.</P>
          <P>Botão <B>"Export Report"</B> copia CSV para área de transferência.</P>
        </SubSection>

        <InfoBox>O Visa Shield soma horas de TODOS os seus ABNs automaticamente. A quinzena é rotativa — sempre os últimos 14 dias corridos.</InfoBox>
      </SectionCard>

      {/* ─── 14. HUSTLE SCORE ─── */}
      <SectionCard id="hustle-score" title="14. Hustle Score (Gamificação)">
        <P>Menu lateral → <B>"Hustle"</B>.</P>

        <SubSection title="Como ganhar XP">
          <SimpleTable
            headers={["Ação", "XP", "Observação"]}
            rows={[
              ["Criar job", "5 XP", "—"],
              ["Completar job", "20 XP", "—"],
              ["Criar invoice", "50 XP", "2x se Golden Hour"],
              ["Golden Hour (invoice em até 60min)", "100 XP (2x)", "Timer na tela de conclusão"],
              ["Invoice paga (no prazo)", "100 XP", "—"],
              ["Invoice paga (atrasada)", "80 XP", "—"],
              ["Registrar despesa", "100 XP", "120 XP se dedutível"],
              ["Referral (sucesso)", "500 XP", "Indicação convertida"],
              ["Streak 3 dias", "+5 XP", "Bônus cumulativo"],
              ["Streak 7 dias", "+10 XP", "Bônus cumulativo"],
              ["Streak 14 dias", "+30 XP", "Reseta e recomeça"],
            ]}
          />
        </SubSection>

        <SubSection title="Tiers (Níveis por Semestre Fiscal)">
          <P>O progresso é medido por <B>semestre fiscal australiano</B>: S1 (Jul–Dez) e S2 (Jan–Jun). Ao final do semestre, seu tier é reavaliado.</P>
          <SimpleTable
            headers={["Nível", "Presença", "XP Semestral", "Cor", "Efeito no Tema"]}
            rows={[
              ["Starter", "< 50%", "0 XP", "Teal", "Tema padrão"],
              ["Hustler", "50%+", "300 XP", "Azul Royal", "Tons azuis"],
              ["Pro", "75%+", "700 XP", "Violeta", "Tons violeta"],
              ["Legend", "90%+", "1.500 XP", "Dourado", "Preto + dourado"],
            ]}
          />
        </SubSection>

        <SubSection title="Defesa de Tier">
          <BulletList>
            <li>Ao final do semestre fiscal, o tier é reavaliado</li>
            <li>Se não atingiu a meta → desce 1 tier</li>
            <li>Se ultrapassou a meta do próximo → sobe automaticamente</li>
            <li>Starter é piso mínimo (sempre mantido)</li>
          </BulletList>
        </SubSection>

        <SubSection title="Streak (Dias Consecutivos)">
          <BulletList>
            <li>Conta dias seguidos de uso do app</li>
            <li>Máximo de 14 dias, depois reseta e recomeça</li>
            <li>Bônus de XP aos marcos: 3, 7 e 14 dias</li>
          </BulletList>
        </SubSection>

        <SubSection title="Marcos de Economia Fiscal">
          <P>6 badges: $100, $200, $500, $1.000, $2.000, $5.000. Toque em qualquer badge para ver equivalência divertida.</P>
          <SimpleTable
            headers={["Valor", "Equivalência"]}
            rows={[
              ["$100", "Semana de compras no mercado"],
              ["$200", "Jantar especial"],
              ["$500", "Viagem de fim de semana"],
              ["$1.000", "Mês de telefone/internet"],
              ["$2.000", "Passagem ida e volta pra Bali"],
              ["$5.000", "Entrada de um carro"],
            ]}
          />
        </SubSection>

        <SubSection title="Cards Expansíveis">
          <BulletList>
            <li><B>Attendance</B> — Grid do mês com dias ativos/inativos + porcentagem</li>
            <li><B>XP Breakdown</B> — Detalhamento por ação + Golden Hour</li>
            <li><B>All Tiers</B> — Lista de todos os níveis com requisitos</li>
            <li><B>Streak</B> — Dias consecutivos de uso (máximo 14, depois reseta)</li>
          </BulletList>
        </SubSection>

        <InfoBox>Se ficar 3+ dias sem usar o app, um overlay "You're getting rusty!" aparece com mensagem motivacional. Qualquer ação (abrir app, completar job, criar invoice) limpa o overlay.</InfoBox>
      </SectionCard>

      {/* ─── 15. GOOGLE CALENDAR ─── */}
      <SectionCard id="google-calendar" title="15. Google Calendar">
        <SubSection title="Conectar">
          <StepList>
            <li>Vá para <B>Settings → Integrations</B></li>
            <li>Toque em <B>"Connect"</B> (botão verde)</li>
            <li>Faça login no Google e autorize</li>
            <li>Status muda para "Connected" (badge verde)</li>
          </StepList>
        </SubSection>

        <SubSection title="Importar Turnos">
          <StepList>
            <li>Na tela de <B>Jobs</B>, toque no ícone de <B>Sync</B>.</li>
            <li><B>Diálogo "Importar eventos antigos?"</B> aparece: escolha entre <B>"Só futuros"</B> (padrão) ou <B>"Escolher desde quando"</B> (date picker até 2 anos atrás). Eventos passados entram como <B>Concluídos</B> direto, com horas registradas — não poluem a lista de pendentes.</li>
            <li>O Ozly filtra usando palavras-chave inteligentes (reconhece: shift, cleaning, bond clean, turno, trabalho, etc.).</li>
            <li>Se houver <B>conflito</B> de horário com job existente, aparece sheet com 3 opções: <B>Manter Ozly</B>, <B>Manter Google</B> ou <B>Manter os dois</B> (cria job novo ao lado).</li>
            <li>Selecione os eventos a importar com os checkboxes.</li>
            <li>Na tela de Review, selecione os itens e escolha <B>Contractor</B>, <B>ABN</B> e <B>valor/hora</B> no painel do topo — aplica automaticamente em todos os selecionados (sem precisar apertar "Aplicar"). Toque num item específico para ajustar individualmente.</li>
            <li>Toque em <B>"Import"</B>.</li>
          </StepList>
        </SubSection>

        <SubSection title="Auto-sync ao abrir o app">
          <P>Dentro de <B>Settings → Integrations → Google Calendar</B> tem um toggle novo: <B>"Auto-sync on app open"</B>. Ele vem <B>ligado por padrão</B> assim que você conecta o Google Calendar.</P>
          <BulletList>
            <li>Toda vez que o app volta do segundo plano (você reabre ou troca de outro app), o Ozly puxa silenciosamente os novos eventos do Google Calendar.</li>
            <li>Se eventos novos foram importados e você está na <B>aba Dashboard</B>, aparece um snackbar discreto embaixo: <B>"✓ N events synced"</B>. Em outras abas, nada é mostrado.</li>
            <li>Desligue o toggle se preferir importar só manualmente pela tela de Jobs.</li>
          </BulletList>
        </SubSection>

        <SubSection title="Desconectar">
          <P>Settings → <B>"Disconnect"</B> (botão vermelho). Jobs já importados permanecem.</P>
        </SubSection>
      </SectionCard>

      {/* ─── 16. PERFIL ─── */}
      <SectionCard id="perfil" title="16. Perfil">
        <SubSection title="Como chegar">
          <BulletList>
            <li>Menu lateral → Toque no avatar ou nome</li>
            <li>Settings → "Edit Profile"</li>
          </BulletList>
        </SubSection>

        <SubSection title="Informações Pessoais">
          <BulletList>
            <li><B>Avatar</B> — Camera / Gallery / Delete</li>
            <li><B>Nome</B> — max 100 chars</li>
            <li><B>Endereço</B> — campos: Street, Apartment, Suburb, State, Postcode (com autocomplete via Google Places)</li>
            <li><B>Telefone</B> — formato: +61 400 000 000</li>
            <li><B>Email</B> — somente leitura</li>
            <li><B>País de Origem</B> — para referência</li>
            <li><B>Código de Referral</B> — gerado automaticamente, compartilhável</li>
          </BulletList>
        </SubSection>

        <SubSection title="Gerenciar Businesses/ABNs">
          <P>Lista de ABNs com nome, número e categoria. Toque para editar:</P>
          <BulletList>
            <li><B>ABN</B> — 11 dígitos (validado)</li>
            <li><B>Company Name</B> — nome da empresa</li>
            <li><B>Categoria</B> — Cleaning, Gardening, Construction, Hospitality, Delivery, IT, Trades, Healthcare, Education, Retail, Other</li>
            <li><B>Hourly Rate</B> — taxa padrão para jobs desta empresa</li>
            <li><B>BSB</B> — 6 dígitos (formato XXX-XXX)</li>
            <li><B>Account Number</B> — conta bancária</li>
            <li><B>PayID</B> — email, telefone ou ABN para pagamentos instantâneos</li>
          </BulletList>
          <P>Botão <B>"+"</B> para adicionar novo negócio. Use o <B>seletor de ABN</B> no menu lateral para alternar entre negócios.</P>
        </SubSection>

        <SubSection title="Alterar Senha">
          <P>Disponível apenas para login por email/senha. Toque em <B>"Change Password"</B> no Perfil.</P>
        </SubSection>
      </SectionCard>

      {/* ─── 17. CONFIGURAÇÕES ─── */}
      <SectionCard id="settings" title="17. Configurações (Settings)">
        <P>Menu lateral → <B>"Settings"</B>.</P>

        <SubSection title="General">
          <BulletList>
            <li><B>Edit Profile</B> → vai para Perfil</li>
            <li><B>Theme</B> — Personalized (muda com nível Hustle), Light, Dark, System</li>
            <li><B>Juice (Efeitos)</B> — Toggle on/off (vibrações, animações, sons)</li>
            <li><B>Week Start Day</B> — Monday a Sunday</li>
            <li><B>Invoice Messages</B> — Templates editáveis para envio e lembrete (ver abaixo)</li>
          </BulletList>
        </SubSection>

        <SubSection title="Customizar Mensagens de Invoice">
          <P>Em <B>Settings → Invoice Messages</B> você edita dois templates prontos:</P>
          <BulletList>
            <li><B>Send Invoice</B> — mensagem inicial ao enviar uma invoice nova (WhatsApp, SMS, Email)</li>
            <li><B>Payment Reminder</B> — lembrete para invoices atrasadas</li>
          </BulletList>
          <P><B>Placeholders disponíveis:</B> <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{"{name}"}</code> (nome do contractor), <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{"{number}"}</code> (número da invoice), <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{"{amount}"}</code> (valor), <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{"{date}"}</code> (data de vencimento)</P>
          <P><B>Exemplo:</B> "Oi {"{name}"}, segue a invoice {"{number}"} no valor de {"{amount}"} com vencimento em {"{date}"}. Obrigado!"</P>
          <Tip>Toque em <B>"Reset to Default"</B> para voltar aos textos originais se bagunçar algum template.</Tip>
        </SubSection>

        <SubSection title="Language">
          <P>Português / English / Español</P>
        </SubSection>

        <SubSection title="Resgatar código promocional">
          <P>Recebeu um código de uma indicação, presente ou campanha? Toque em <B>"Redeem promo code"</B> em Settings.</P>
          <BulletList>
            <li><B>iOS</B> — abre a tela de resgate nativa da Apple; digite o código lá.</li>
            <li><B>Android</B> — cole o código no diálogo (<B>"Paste the code you received…"</B>) e toque em <B>"Redeem"</B>; o Ozly repassa para a Play Store concluir.</li>
          </BulletList>
        </SubSection>

        <SubSection title="Notifications">
          <P>Toggle individual para cada tipo de notificação:</P>
          <BulletList>
            <li><B>Morning Briefing</B> — Resumo diário às 7h</li>
            <li><B>End of Shift</B> — Lembrete pós-job</li>
            <li><B>Expense Reminder</B> — Quartas ao meio-dia</li>
            <li><B>Friday Sweeper</B> — Resumo semanal às sextas</li>
            <li><B>Weekly Summary</B> — Estatísticas aos domingos</li>
          </BulletList>
          <P>Se uma empresa para quem você trabalha usa o Ozly for Business, você também recebe <B>push notifications</B> quando ela te oferece trabalho, propõe uma mudança de job, te envia uma mensagem ou marca uma das suas invoices como paga ou entregue (veja a seção 21).</P>
        </SubSection>

        <SubSection title="Lembretes de Job (customizáveis)">
          <P>Dentro de <B>Settings → Notifications</B> tem um card dedicado: <B>"Job reminders"</B>. Escolha um ou mais presets — o Ozly dispara uma notificação local antes de cada job futuro:</P>
          <BulletList>
            <li>15 min, 30 min, 1 hora, 2 horas, 4 horas antes</li>
            <li>1 dia, 3 dias, 1 semana antes</li>
            <li><B>Custom</B> → abre um diálogo onde você digita qualquer número de horas</li>
          </BulletList>
          <P><B>Padrões</B> (pré-selecionados na primeira vez): <B>1 hora</B> + <B>1 dia</B> antes.</P>
          <Tip>Toda vez que você muda a seleção, o Ozly <B>reagenda TODOS os jobs futuros</B> — não só os novos. Ou seja: ligar "3 dias antes" hoje cria esse lembrete instantaneamente para cada job já marcado no seu calendário.</Tip>
        </SubSection>

        <SubSection title="Integrations">
          <P>Google Calendar — veja seção 16. O toggle <B>"Auto-sync on app open"</B> também fica aqui (ligado por padrão depois que você conecta).</P>
        </SubSection>

        <SubSection title="Help">
          <P><B>"Help Us Improve"</B> — Dialog com Country, How you found Ozly, Feedback.</P>
        </SubSection>

        <SubSection title="Account">
          <BulletList>
            <li><B>Subscription</B> — Pro (badge dourado) ou Starter (botão Upgrade)</li>
            <li><B>Privacy Policy</B> e <B>Terms of Use</B> — links externos</li>
            <li><B>Delete Account</B> (vermelho) — Dupla confirmação. Exclui TODOS os dados permanentemente.</li>
          </BulletList>
        </SubSection>
      </SectionCard>

      {/* ─── 18. ASSINATURA PRO ─── */}
      <SectionCard id="assinatura-pro" title="18. Assinatura Pro">
        <P>Settings → <B>"Upgrade to Pro"</B> ou toque em qualquer item que requer Pro. Lembre-se: <B>sua primeira invoice é sempre grátis</B> — o paywall só aparece quando você vai enviar mais ou abrir uma ferramenta Pro.</P>

        <SubSection title="Planos Disponíveis">
          <SimpleTable
            headers={["Plano", "Subtítulo", "Inclui"]}
            rows={[
              ["ABN", "Para Contractors", "Invoices PDF profissionais, gestão de contractors, relatórios financeiros, despesas com OCR, análises fiscais"],
              ["PRO", "Tudo — melhor custo-benefício", "Tudo do ABN + ferramentas fiscais avançadas, com alternância de modo"],
            ]}
          />
          <BulletList>
            <li><B>Trial grátis de 14 dias</B> em todos os planos</li>
            <li>Opções: <B>Annual</B> (recomendado — mostra o % que você economiza) e <B>Monthly</B></li>
            <li>Os preços exatos aparecem no app e podem variar por região (gerenciados via App Store / Google Play)</li>
          </BulletList>
        </SubSection>

        <SubSection title="No plano de uma organização (ABN top-up)">
          <P>Se uma empresa para quem você trabalha cobre seu ABN, você pode usar o Ozly para faturar <B>essa empresa</B> sem custo nenhum. Você verá um banner dourado: <B>"You're on [Company]'s plan — Invoices are limited to that organisation. Unlock all clients for +$5/month."</B></P>
          <BulletList>
            <li>Deixe como está para faturar só aquela organização de graça.</li>
            <li>Toque em <B>"Unlock"</B> para adicionar o <B>ABN top-up de +$5/mês</B> e faturar <B>qualquer</B> cliente.</li>
          </BulletList>
        </SubSection>

        <SubSection title="Ações na Tela de Assinatura">
          <SimpleTable
            headers={["Ação", "O que faz"]}
            rows={[
              ["Subscribe / Start Trial", "Inicia compra nativa (App Store / Google Play) com 14 dias grátis"],
              ["Restore Purchases", "Recupera assinatura já comprada (ver abaixo)"],
              ["Monthly ↔ Annual", "Alterna entre mensal e anual (anual mostra o % de economia)"],
              ["Terms / Privacy", "Abre links legais"],
              ["X (fechar)", "Volta sem assinar"],
            ]}
          />
        </SubSection>

        <SubSection title="Restaurar Compras (Restore Purchases)">
          <P>Use quando você <B>já assinou antes</B> e precisa reativar — por exemplo:</P>
          <BulletList>
            <li>Trocou de celular e reinstalou o Ozly</li>
            <li>Deu logout e perdeu o status Pro</li>
            <li>A assinatura sumiu por algum bug</li>
          </BulletList>
          <StepList>
            <li>Abra a tela de assinatura (Settings → Upgrade ou qualquer feature Pro)</li>
            <li>Toque em <B>"Restore Purchases"</B></li>
            <li>Faça login com a mesma conta App Store / Google Play que usou na compra</li>
            <li>O Ozly verifica e devolve o acesso Pro instantaneamente</li>
          </StepList>
          <Tip>Se nada foi encontrado, aparece a mensagem "No active subscription" — nesse caso você realmente não tem assinatura, ou está logado com conta diferente da que comprou.</Tip>
        </SubSection>

        <SubSection title="Quando o Trial Acaba">
          <P>Depois dos 14 dias de trial, se você <B>não assinou</B>:</P>
          <BulletList>
            <li>Features Pro (Fiscal, Expenses avançado, Visa Shield, comparações) ficam bloqueadas</li>
            <li>O Dashboard continua funcionando para ver seus dados já cadastrados</li>
            <li>Ao tocar em qualquer item Pro, você é levado automaticamente para a tela de assinatura</li>
            <li>Em alguns casos (iOS), a tela de assinatura aparece logo ao abrir o app — basta <B>tocar em "Restore Purchases"</B> (se já assinou) ou <B>escolher um plano</B>, ou <B>sair da conta</B> se preferir usar outra</li>
          </BulletList>
        </SubSection>

        <SubSection title="Cancelar a Assinatura">
          <P>O Ozly <B>não cancela pelo app</B> — isso passa pela loja:</P>
          <BulletList>
            <li><B>iOS:</B> App Store → seu perfil → Subscriptions → Ozly → Cancel</li>
            <li><B>Android:</B> Google Play → menu → Payments {"&"} subscriptions → Ozly → Cancel</li>
          </BulletList>
          <P>Sem multa. Você mantém acesso Pro até o fim do período já pago.</P>
        </SubSection>
      </SectionCard>

      {/* ─── 19. MODO OFFLINE ─── */}
      <SectionCard id="modo-offline" title="19. Modo Offline e Sincronização">
        <P>O Ozly é <B>offline-first</B> — todos os dados ficam no celular em banco criptografado (SQLCipher).</P>

        <SimpleTable
          headers={["Situação", "Comportamento"]}
          rows={[
            ["Com internet", "Sincroniza a cada 90s (ativo) ou 5min (idle)"],
            ["Sem internet", 'Mostra "Offline" no App Bar. Tudo funciona localmente'],
            ["Reconexão", "Sincronização imediata automática"],
            ["Pull-to-refresh", "Força sincronização completa manual"],
          ]}
        />

        <SubSection title="Fila de Sincronização">
          <BulletList>
            <li>Operações offline ficam em fila</li>
            <li>Ao reconectar: fila processada automaticamente</li>
            <li>Até 10 tentativas por operação com backoff exponencial</li>
            <li>A cada 6 horas: reconciliação completa</li>
          </BulletList>
        </SubSection>

        <SubSection title="Indicadores Visuais">
          <BulletList>
            <li>Nuvem cortada = offline</li>
            <li>Sync com problema = erro</li>
            <li>Banner "You're offline" em telas de lista</li>
            <li>Timestamp "Last sync" no menu lateral</li>
          </BulletList>
        </SubSection>
      </SectionCard>

      {/* ─── 20. INDICAÇÃO ─── */}
      <SectionCard id="indicacao" title="20. Indicação (Referral)">
        <StepList>
          <li>No Dashboard, encontre o card verde <B>"Ganhe 1 Mês Grátis"</B></li>
          <li>Toque no card</li>
          <li>A gaveta de compartilhamento abre com mensagem pré-formatada</li>
          <li>Envie via WhatsApp, SMS, Email, Telegram ou qualquer app</li>
        </StepList>
        <InfoBox>A mensagem está no idioma do app (PT, EN ou ES).</InfoBox>

        <SubSection title="Como os amigos aplicam seu código">
          <BulletList>
            <li><B>Deep link</B> — quem toca em <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">ozly.au/refer/?code=XXX</code> cai direto na tela de Sign Up com o campo já preenchido e <B>bloqueado</B> (cinza + cadeado). O código é aplicado automaticamente quando o cadastro é finalizado.</li>
            <li><B>Manual</B> — também dá para digitar seu código no campo <B>"Código de indicação"</B> na tela de Sign Up.</li>
          </BulletList>
          <P>O crédito aparece no seu Dashboard de Indicação assim que a pessoa ativar a conta.</P>
        </SubSection>
      </SectionCard>

      {/* ─── 21. NOTIFICAÇÕES ─── */}
      <SectionCard id="notificacoes" title="21. Notificações Automáticas">
        <SubSection title="Lembretes inteligentes (agendados no seu celular)">
          <SimpleTable
            headers={["Notificação", "Quando", "O que mostra"]}
            rows={[
              ["Morning Briefing", "Todo dia às 7:00", "Jobs do dia + invoices atrasadas"],
              ["End of Shift", "15min após fim do job", "Complete e fature este job"],
              ["Expense Reminder", "Quartas às 12:00", "Registre seus recibos da semana"],
              ["Friday Sweeper", "Sextas às 16:00", "Resumo semanal"],
              ["Weekly Summary", "Domingos às 18:00", "Estatísticas da semana"],
              ["Lembretes de job", "Antes de cada job (seus presets)", "Job se aproximando — veja Settings"],
              ["Fim do trial", "3 dias / 1 dia / no dia", "Seu trial está prestes a acabar"],
            ]}
          />
          <P>Ao tocar: navega para a tela relevante. Botões: "Complete", "Snooze 1h", "Mark Paid".</P>
        </SubSection>

        <SubSection title="Atualizações ao vivo de uma empresa (push)">
          <P>Se você trabalha para uma empresa que usa o <B>Ozly for Business</B>, você recebe push notifications em tempo real. Tocar em uma te leva direto para o lugar certo:</P>
          <SimpleTable
            headers={["Você é avisado quando…", "Ao tocar abre"]}
            rows={[
              ["A empresa te oferece trabalho", "Jobs"],
              ["A empresa propõe uma mudança de job", "Jobs (com o banner da mudança)"],
              ["A empresa te envia uma mensagem", "O chat da conversa"],
              ["Uma invoice é marcada como paga / entregue", "Financial"],
              ["A empresa pede para você corrigir uma invoice", "Financial"],
            ]}
          />
        </SubSection>
      </SectionCard>

      {/* ─── 22. SEGURANÇA ─── */}
      <SectionCard id="seguranca" title="22. Segurança e Privacidade">
        <SimpleTable
          headers={["Camada", "Proteção"]}
          rows={[
            ["Banco local", "Criptografado com SQLCipher"],
            ["Tokens", "Armazenados em SecureStorage"],
            ["Servidor", "Row-Level Security — você só vê seus dados"],
            ["Fotos", "URLs assinadas que expiram em 1 hora"],
            ["Uploads", "Nomes de arquivo com timestamp"],
            ["Formulários", "maxLength em todos os campos"],
            ["Logs", "Nunca registram TFN, BSB, senhas, tokens"],
            ["Erros", "Mensagens genéricas ao usuário"],
          ]}
        />
        <SubSection title="Exclusão de Dados">
          <P>Settings → Delete Account → dupla confirmação. Remove: perfil, businesses, jobs, invoices, despesas, contractors, horas, eventos. Conformidade LGPD/GDPR.</P>
        </SubSection>
      </SectionCard>

      {/* ─── 23. CAMINHOS ALTERNATIVOS ─── */}
      <SectionCard id="caminhos-alternativos" title="23. Todos os Caminhos Alternativos">
        <SubSection title="Criar Invoice (6 caminhos)">
          <StepList>
            <li>Financial → "+" ou FAB</li>
            <li>Dashboard → "To Invoice" → selecionar jobs → "Generate Invoice"</li>
            <li>Dashboard → Next Shift → Complete → "Generate Invoice"</li>
            <li>Dashboard → Forecast → "To Invoice" → toque no job</li>
            <li>Contractors → toque → "Create Invoice"</li>
            <li>Financial → toque na invoice → "Edit"</li>
          </StepList>
        </SubSection>

        <SubSection title="Criar Job (3 caminhos)">
          <StepList>
            <li>Jobs → FAB "+ New Job"</li>
            <li>Dashboard → Next Shift → "Add Job"</li>
            <li>Contractors → toque → "Create Job"</li>
          </StepList>
        </SubSection>

        <SubSection title="Criar Despesa (3 caminhos)">
          <StepList>
            <li>Expenses → FAB "Add Expense"</li>
            <li>Dashboard → Deductible Expenses → "New Expense"</li>
            <li>Job Completion Sheet → "New Expense" (após completar um job)</li>
          </StepList>
        </SubSection>

        <SubSection title="Criar Contractor (3 caminhos)">
          <StepList>
            <li>Contractors → FAB "+ Add Contractor"</li>
            <li>Criar Invoice → dropdown → "New Client"</li>
            <li>Criar Job → dropdown → "New Client"</li>
          </StepList>
        </SubSection>

        <SubSection title="Criar Business/ABN (3 caminhos)">
          <StepList>
            <li>Profile → seção Businesses → "+"</li>
            <li>Criar Invoice → dropdown business → "New ABN"</li>
            <li>Add Expense → "Add Business"</li>
          </StepList>
        </SubSection>

        <SubSection title="Acessar Perfil (3 caminhos)">
          <StepList>
            <li>Drawer → toque no avatar</li>
            <li>Drawer → toque no nome</li>
            <li>Settings → "Edit Profile"</li>
          </StepList>
        </SubSection>

        <SubSection title="Marcar Invoice como Paga (3 caminhos)">
          <StepList>
            <li>Financial → toque na invoice → "Mark as Paid"</li>
            <li>Dashboard → Notificações → toque na invoice → "Mark as Paid"</li>
            <li>Dashboard → "Overdue" → notificações → "Mark as Paid"</li>
          </StepList>
          <Tip>O mesmo botão vira <B>"Mark Unpaid"</B> no detalhe da invoice se precisar reverter.</Tip>
        </SubSection>

        <SubSection title="Novidades na 1.5.4">
          <BulletList>
            <li><B>Primeira invoice grátis</B> — crie e envie sua primeira invoice sem plano nem cartão; o paywall só aparece depois.</li>
            <li><B>Organizações</B> — aceite o convite de uma empresa, receba ofertas de trabalho, envie invoices direto para o portal dela e acompanhe o status de entrega (seção 9).</li>
            <li><B>Envio para a organização</B> com badges de status (Delivered / Queued / Bounced / Failed) e reenvio com um toque.</li>
            <li><B>Confirmação de mudança de job</B> e <B>confirmação de pagamento</B> quando você trabalha para uma empresa.</li>
            <li><B>Mensagens nos dois sentidos</B> com a empresa em qualquer invoice ou job.</li>
            <li><B>Push notifications reais</B> para ofertas de trabalho, mudanças de job, mensagens e atualizações de invoice.</li>
            <li><B>ABN top-up (+$5/mês)</B> para liberar o faturamento de todos os clientes quando você está no plano de uma empresa.</li>
            <li><B>Resgatar código promocional</B> em Settings.</li>
            <li>Planos simplificados para <B>ABN</B> e <B>PRO</B>, cada um com trial grátis de 14 dias.</li>
            <li>Versão do app: <B>1.5.4+423</B> — visível em Settings → Help.</li>
          </BulletList>
        </SubSection>
      </SectionCard>

      {/* ─── 24. FAQ ─── */}
      <SectionCard id="faq" title="24. Perguntas Frequentes (FAQ)">
        <SubSection title="Conta">
          <div className="space-y-2">
            <FaqItem q="Posso usar sem ABN?" a="Sim! ABN é opcional no cadastro. Complete quando for criar sua primeira invoice." />
            <FaqItem q="Posso ter vários ABNs?" a='Sim! Adicione quantos ABNs quiser no Perfil. Use o seletor no menu lateral para alternar.' />
            <FaqItem q="Posso mudar meu tipo de visto depois?" a="Sim. Profile → Visa Type. Os cálculos fiscais e Medicare recalculam automaticamente." />
            <FaqItem q="Esqueci a senha, e agora?" a='Tela de Login → "Forgot Password?" → digite email → link de reset chega por email.' />
            <FaqItem q="Posso alterar minha senha?" a='Sim, se o login foi por email/senha. Vá em Perfil → "Change Password". Para Google ou Apple, a senha é gerenciada pelo provedor.' />
            <FaqItem q="Posso baixar a foto de um recibo?" a="Sim. Ao visualizar em tela cheia, toque no botão de download." />
          </div>
        </SubSection>

        <SubSection title="Jobs">
          <div className="space-y-2">
            <FaqItem q="E se eu trabalhar sem invoice (pagamento em dinheiro)?" a='Marque "Skip Invoice" ao criar o job. Ele conta nas horas (Visa Shield) mas não aparece em "To Invoice".' />
            <FaqItem q="Posso anexar comprovante de pagamento?" a='Sim. Nos detalhes do job → "Add Receipt" → câmera ou galeria.' />
            <FaqItem q='O que é o "Golden Hour"?' a="Se criar uma invoice até 60 minutos após completar um job, você ganha 2x XP (100 em vez de 50)." />
          </div>
        </SubSection>

        <SubSection title="Jobs (Completion)">
          <div className="space-y-2">
            <FaqItem q="O que acontece quando completo um job?" a="Um bottom sheet de celebração aparece mostrando horas trabalhadas, receita gerada e XP ganho." />
            <FaqItem q='Por que o botão "Generate Invoice" não aparece?' a='Isso acontece quando o job foi criado com "Skip Invoice" ativa.' />
          </div>
        </SubSection>

        <SubSection title="Invoices">
          <div className="space-y-2">
            <FaqItem q="O número da invoice é automático?" a="Sim (INV-0001, INV-0002...). Mas você pode personalizar tocando no campo." />
            <FaqItem q="A invoice serve como Tax Invoice oficial?" a="Sim, desde que contenha ABN, data, descrição, valor e GST (se registrado). O PDF do Ozly inclui tudo." />
            <FaqItem q="Preciso me registrar para GST?" a="Se sua receita anual ultrapassa $75.000. O Ozly avisa automaticamente com alerta no Dashboard." />
            <FaqItem q="Posso enviar invoice por WhatsApp?" a='Sim. Após criar → escolha "WhatsApp" → PDF é enviado direto no chat.' />
          </div>
        </SubSection>

        <SubSection title="Despesas">
          <div className="space-y-2">
            <FaqItem q="O OCR funciona sempre?" a="Funciona melhor com recibos nítidos. Se falhar, preencha manualmente. O Ozly avisa quando a confiança é baixa." />
            <FaqItem q="Quanto posso deduzir?" a="Depende de quantos itens da categoria são relacionados ao trabalho. Ex: se 2 de 3 itens se aplicam, deduz 66% do valor." />
            <FaqItem q="Preciso guardar os recibos?" a="O ATO exige manter registros por 5 anos. A foto no Ozly conta como registro digital." />
          </div>
        </SubSection>

        <SubSection title="Fiscal">
          <div className="space-y-2">
            <FaqItem q="Os cálculos substituem um contador?" a="Não. São estimativas baseadas nas tabelas ATO 2024-26. Use o relatório exportado como base para seu contador." />
            <FaqItem q='O que é "Tax Resident"?' a="Se esteve na Austrália 183+ dias no ano fiscal. Residentes têm faixa isenta de $18.200." />
          </div>
        </SubSection>

        <SubSection title="Visa Shield">
          <div className="space-y-2">
            <FaqItem q="O limite de 48h é por employer ou total?" a="Total. O Visa Shield soma horas de TODOS os seus ABNs/businesses." />
            <FaqItem q="A quinzena é fixa?" a="Rotativa — sempre os últimos 14 dias corridos." />
          </div>
        </SubSection>

        <SubSection title="Hustle Score">
          <div className="space-y-2">
            <FaqItem q="Como funciona o tier defense?" a="A cada semestre fiscal (Jul-Dez / Jan-Jun), seu tier é reavaliado. Se não atingir a meta de XP do seu tier atual, desce um nível. Se ultrapassar a meta do próximo, sobe automaticamente." />
            <FaqItem q="O que acontece se eu ficar dias sem usar?" a="Após 3+ dias sem abrir o app, aparece um overlay 'You're getting rusty!' com mensagem motivacional. Qualquer ação limpa o overlay." />
            <FaqItem q="O que é o Golden Hour?" a="Se criar uma invoice em até 60 minutos após completar um job, ganha 2x XP (100 em vez de 50). Um timer aparece na tela de conclusão do job." />
          </div>
        </SubSection>

        <SubSection title="Referral">
          <div className="space-y-2">
            <FaqItem q="Como funciona a indicação?" a="Compartilhe seu link de referral pelo Dashboard ou Perfil. Quando alguém se cadastrar pelo seu link, você ganha 500 XP." />
          </div>
        </SubSection>

        <SubSection title="Assinatura">
          <div className="space-y-2">
            <FaqItem q="Minha primeira invoice é mesmo grátis?" a="Sim. Você pode criar e enviar sua primeira invoice sem plano e sem cartão. Só é preciso assinar para enviar mais invoices ou abrir ferramentas Pro." />
            <FaqItem q="Qual a diferença entre ABN e PRO?" a="ABN: invoices PDF profissionais, gestão de contractors, relatórios financeiros, despesas com OCR e análises fiscais — para contractors. PRO (melhor custo-benefício): tudo do ABN mais ferramentas fiscais avançadas, com alternância de modo. Ambos têm trial grátis de 14 dias; os preços exatos aparecem no app e podem variar por região." />
            <FaqItem q="O trial é mesmo grátis?" a="Sim! 14 dias de acesso completo sem cobrança. Cancele a qualquer momento pela App Store ou Google Play antes do trial acabar." />
            <FaqItem q="Como cancelo minha assinatura?" a="Vá à App Store (iOS) ou Google Play (Android) → Assinaturas → Ozly → Cancelar. Você mantém o acesso até o fim do período de cobrança atual." />
            <FaqItem q="Como resgato um código promocional?" a="Settings → Redeem promo code. No iOS, digite na tela de resgate da Apple; no Android, cole no diálogo e toque em Redeem." />
          </div>
        </SubSection>

        <SubSection title="Organizações">
          <div className="space-y-2">
            <FaqItem q="Uma empresa me mandou um link de convite — o que é isso?" a="Uma empresa que usa o Ozly for Business te convidou como sub-contractor independente. Ao aceitar, as invoices que você emite para ela passam a aparecer no portal dela, e ela pode te oferecer trabalho. Você continua independente — não é emprego." />
            <FaqItem q="Trabalhar para uma empresa me custa algo?" a="Não. Se a empresa cobre seu ABN, você pode faturar essa empresa de graça. Para faturar outros clientes também, adicione o ABN top-up de +$5/mês (ou um plano completo)." />
            <FaqItem q="A empresa marcou minha invoice como paga mas ainda não vejo o dinheiro." a="Toque em 'Confirm payment received' só quando o dinheiro realmente cair na sua conta. Isso mantém seus registros e os dela sincronizados." />
            <FaqItem q="Minha invoice para a empresa aparece como 'Bounced'. E agora?" a="O email de faturamento pode estar errado ou bloqueado. Peça para a empresa confirmar a caixa de faturamento, depois toque no badge de entrega → 'Try sending again'." />
          </div>
        </SubSection>

        <SubSection title="Offline">
          <div className="space-y-2">
            <FaqItem q="Funciona sem internet?" a="100%. Crie, edite, visualize tudo offline. Sincroniza automaticamente quando tiver conexão." />
            <FaqItem q="E se eu editar a mesma coisa offline em dois celulares?" a="O Ozly usa resolução por timestamp — a versão mais recente prevalece. Em conflitos críticos, uma tela de resolução manual aparece." />
          </div>
        </SubSection>
      </SectionCard>
    </>
  );
}
