import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronDown, ChevronUp, Mail, Menu, X } from "lucide-react";
import { useI18n } from "../i18n";

/* ═══════════ HELPER COMPONENTS ═══════════ */

function SectionCard({ id, title, children }) {
  return (
    <section id={id} className="scroll-mt-28">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 md:p-10">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-navy-700 mb-6">{title}</h2>
        <div className="prose-guide">{children}</div>
      </div>
    </section>
  );
}

function SubSection({ title, children }) {
  return (
    <div className="mt-8 first:mt-0">
      <h3 className="text-lg sm:text-xl font-bold text-navy-700 mb-3">{title}</h3>
      {children}
    </div>
  );
}

function StepList({ children }) {
  return <ol className="space-y-2 text-slate-600 leading-relaxed list-decimal list-inside marker:font-bold marker:text-brand-500">{children}</ol>;
}

function BulletList({ children }) {
  return <ul className="space-y-1.5 text-slate-600 leading-relaxed list-disc list-inside marker:text-brand-400">{children}</ul>;
}

function Tip({ children }) {
  return (
    <div className="mt-4 rounded-xl bg-lime-50 border border-lime-200 px-5 py-4 text-sm text-lime-800">
      <span className="font-bold">Dica:</span> {children}
    </div>
  );
}

function InfoBox({ children }) {
  return (
    <div className="mt-4 rounded-xl bg-brand-50 border border-brand-200 px-5 py-4 text-sm text-brand-800">
      {children}
    </div>
  );
}

function SimpleTable({ headers, rows }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-50 text-slate-600 font-semibold">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-3 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="text-slate-600">
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function P({ children }) {
  return <p className="text-slate-600 leading-relaxed mt-3 first:mt-0">{children}</p>;
}

function B({ children }) {
  return <strong className="text-slate-800">{children}</strong>;
}

/* ═══════════ TABLE OF CONTENTS DATA ═══════════ */
const tocSections = [
  { id: "primeiros-passos", label: "1. Primeiros Passos" },
  { id: "setup", label: "2. Configuração Inicial" },
  { id: "dashboard", label: "3. Dashboard" },
  { id: "menu-lateral", label: "4. Menu Lateral" },
  { id: "jobs", label: "5. Jobs" },
  { id: "contractors", label: "6. Contractors" },
  { id: "invoices", label: "7. Invoices" },
  { id: "expenses", label: "8. Expenses" },
  { id: "financial", label: "9. Financial" },
  { id: "fiscal", label: "10. Fiscal" },
  { id: "visa-shield", label: "11. Visa Shield" },
  { id: "hustle-score", label: "12. Hustle Score" },
  { id: "google-calendar", label: "13. Google Calendar" },
  { id: "perfil", label: "14. Perfil" },
  { id: "settings", label: "15. Configurações" },
  { id: "assinatura-pro", label: "16. Assinatura Pro" },
  { id: "modo-offline", label: "17. Modo Offline" },
  { id: "indicacao", label: "18. Indicação" },
  { id: "notificacoes", label: "19. Notificações" },
  { id: "seguranca", label: "20. Segurança" },
  { id: "caminhos-alternativos", label: "21. Caminhos Alternativos" },
  { id: "faq", label: "22. FAQ" },
];

/* ═══════════ COLLAPSIBLE FAQ ═══════════ */
function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-slate-50/50 transition">
        <span className="font-semibold text-slate-800 text-sm">{q}</span>
        <ChevronDown size={18} className={`flex-shrink-0 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed">{a}</div>}
    </div>
  );
}

/* ═══════════ MAIN GUIDE PAGE ═══════════ */
export default function Guide() {
  const { t } = useI18n();
  const [tocOpen, setTocOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: "-100px 0px -70% 0px" }
    );
    tocSections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setTocOpen(false);
  };

  return (
    <div className="bg-[#F8FAFC] pt-28 pb-20 md:pt-36 md:pb-28 min-h-screen">
      <div className="mx-auto max-w-7xl px-5">
        {/* Back link */}
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-brand-500 transition mb-8">
          <ArrowLeft size={16} /> {t.guide.backHome}
        </Link>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-navy-700 mb-4">{t.guide.title}</h1>
          <p className="text-slate-500 max-w-2xl mx-auto text-lg">{t.guide.subtitle}</p>
        </div>

        {/* Mobile ToC toggle */}
        <div className="lg:hidden mb-6">
          <button
            onClick={() => setTocOpen(!tocOpen)}
            className="w-full flex items-center justify-between gap-2 rounded-xl bg-white border border-slate-200 px-5 py-4 font-semibold text-slate-700"
          >
            <span className="flex items-center gap-2"><Menu size={18} /> {t.guide.toc}</span>
            {tocOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {tocOpen && (
            <div className="mt-2 rounded-xl bg-white border border-slate-200 p-4 space-y-1 max-h-80 overflow-y-auto">
              {tocSections.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => scrollTo(id)}
                  className={`block w-full text-left text-sm px-3 py-2 rounded-lg transition ${activeSection === id ? "bg-brand-50 text-brand-600 font-semibold" : "text-slate-600 hover:bg-slate-50"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-8">
          {/* Desktop sidebar ToC */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-28 rounded-2xl bg-white border border-slate-200 p-5 max-h-[calc(100vh-8rem)] overflow-y-auto">
              <h3 className="font-bold text-slate-700 mb-3 text-sm uppercase tracking-wider">{t.guide.toc}</h3>
              <nav className="space-y-0.5">
                {tocSections.map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => scrollTo(id)}
                    className={`block w-full text-left text-[13px] px-3 py-1.5 rounded-lg transition ${activeSection === id ? "bg-brand-50 text-brand-600 font-semibold" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}
                  >
                    {label}
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0 space-y-6">

            {/* ─── 1. PRIMEIROS PASSOS ─── */}
            <SectionCard id="primeiros-passos" title="1. Primeiros Passos (Login e Cadastro)">
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
                  <li>Toque em <B>"Sign Up"</B> (botão grande verde)</li>
                  <li>Pronto! Você será direcionado para a tela de Setup</li>
                </StepList>
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
                <P>Toque em <B>"Get Started"</B> (botão verde grande). O Ozly salva tudo e te leva para o Dashboard.</P>
              </SubSection>
            </SectionCard>

            {/* ─── 3. DASHBOARD ─── */}
            <SectionCard id="dashboard" title="3. Dashboard — Tela Principal">
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

            {/* ─── 4. MENU LATERAL ─── */}
            <SectionCard id="menu-lateral" title="4. Menu Lateral (Drawer)">
              <P>Acesse deslizando da esquerda para a direita ou tocando no menu hamburger.</P>

              <SubSection title="Navegação">
                <SimpleTable
                  headers={["Item", "Vai para", "Observação"]}
                  rows={[
                    ["Contractors", "Tela de Contratantes", "—"],
                    ["Jobs", "Tela de Jobs", "—"],
                    ["Financial", "Tela Financeira", "—"],
                    ["Fiscal", "Tela Fiscal", "Requer Pro"],
                    ["Expenses", "Tela de Despesas", "Requer Pro"],
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

            {/* ─── 5. JOBS ─── */}
            <SectionCard id="jobs" title="5. Jobs (Trabalhos)">
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
                <P>Deslize o job para a esquerda para deletar. Indicador "In Progress" aparece durante o horário do job.</P>
              </SubSection>

              <SubSection title="Marcar Job como Completo (3 caminhos)">
                <BulletList>
                  <li>Tela de Jobs → Toque no job → "Complete"</li>
                  <li>Dashboard → Card "Pending Jobs" → botão verde (check)</li>
                  <li>Dashboard → Card "Next Shift" → Toque → "Complete Job"</li>
                </BulletList>
                <InfoBox>Após completar, o sistema registra horas automaticamente, ativa o timer do Golden Hour (60min para criar invoice = 2x XP) e oferece "Generate Invoice".</InfoBox>
              </SubSection>
            </SectionCard>

            {/* ─── 6. CONTRACTORS ─── */}
            <SectionCard id="contractors" title="6. Contractors (Contratantes)">
              <P>Menu lateral → <B>"Contractors"</B>. Duas abas: <B>Agencies</B> e <B>Direct Clients</B>.</P>

              <SubSection title="Criar novo Contractor">
                <P>Botão <B>"+ Add Contractor"</B> ou durante criação de Job/Invoice → <B>"New Client"</B>.</P>
                <StepList>
                  <li><B>Tipo</B>: "Agency" ou "Direct Client"</li>
                  <li><B>"Import from Contacts"</B> — preenche dados do celular</li>
                  <li><B>Nome</B> (obrigatório), <B>Email</B>, <B>Telefone</B>, <B>ABN</B>, <B>Endereço</B>, <B>Notas</B></li>
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

            {/* ─── 7. INVOICES ─── */}
            <SectionCard id="invoices" title="7. Invoices (Faturas)">
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
                  <li><B>Item Manual</B> — Toque "Manual Item". Preencha descrição, horas, rate. Opção de salvar como template.</li>
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
                    ["Share PDF (índigo)", "Gaveta de compartilhamento do sistema"],
                    ["Download PDF (teal)", "Salva na pasta Downloads"],
                    ["Close (cinza)", "Fecha sem enviar (salva como draft)"],
                  ]}
                />
              </SubSection>
            </SectionCard>

            {/* ─── 8. EXPENSES ─── */}
            <SectionCard id="expenses" title="8. Expenses (Despesas)">
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

            {/* ─── 9. FINANCIAL ─── */}
            <SectionCard id="financial" title="9. Financial (Financeiro)">
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

              <SubSection title="Meta de Receita">
                <P>Defina uma meta com <B>"Set Goal"</B>. Acompanhe o progresso com barra visual e <B>"Edit Goal"</B> para ajustar.</P>
              </SubSection>
            </SectionCard>

            {/* ─── 10. FISCAL ─── */}
            <SectionCard id="fiscal" title="10. Fiscal (Impostos)">
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
                  <li><B>Tax Resident</B> — Toggle. Impacto: faixa isenta $18.200 vs 30%</li>
                  <li><B>Medicare Levy</B> — 2% sobre renda tributável (só residentes não-WHM)</li>
                </BulletList>
              </SubSection>

              <SubSection title="Card de Economia Fiscal">
                <P>6 badges de marcos: $100, $200, $500, $1.000, $2.000, $5.000. Toque em qualquer badge para ver equivalência divertida.</P>
              </SubSection>

              <SubSection title="Estimativa de Imposto">
                <P>Mostra: Renda Total → Deduções → Renda Tributável → Imposto → Medicare → Total. Botão "i" para breakdown detalhado por faixa.</P>
              </SubSection>

              <SubSection title="Outras Rendas e Créditos">
                <P>Toque <B>"+"</B> para adicionar. Tipo: Income ou Tax Paid. Frequência: weekly / fortnightly / monthly.</P>
              </SubSection>

              <InfoBox>Apenas estimativas. Baseado nas tabelas ATO 2024-26. Consulte um contador registrado.</InfoBox>
            </SectionCard>

            {/* ─── 11. VISA SHIELD ─── */}
            <SectionCard id="visa-shield" title="11. Visa Shield (Controle de Horas)">
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

            {/* ─── 12. HUSTLE SCORE ─── */}
            <SectionCard id="hustle-score" title="12. Hustle Score (Gamificação)">
              <P>Menu lateral → <B>"Hustle"</B>.</P>

              <SubSection title="Como ganhar XP">
                <SimpleTable
                  headers={["Ação", "XP"]}
                  rows={[
                    ["Completar job", "20 XP"],
                    ["Criar invoice", "50 XP"],
                    ["Golden Hour (invoice em até 60min)", "100 XP (2x)"],
                    ["Registrar despesa", "10 XP"],
                  ]}
                />
              </SubSection>

              <SubSection title="Níveis">
                <SimpleTable
                  headers={["Nível", "Presença Mensal", "Cor"]}
                  rows={[
                    ["Starter", "< 50%", "Teal"],
                    ["Hustler", "50%+", "Azul Royal"],
                    ["Pro", "75%+", "Violeta"],
                    ["Legend", "90%+", "Dourado"],
                  ]}
                />
              </SubSection>

              <SubSection title="Cards Expansíveis">
                <BulletList>
                  <li><B>Attendance</B> — Grid do mês com dias ativos/inativos</li>
                  <li><B>XP Breakdown</B> — Detalhamento por ação + Golden Hour</li>
                  <li><B>All Tiers</B> — Lista de todos os níveis</li>
                </BulletList>
              </SubSection>

              <InfoBox>Se ficar 3+ dias sem usar o app, um overlay "You're getting rusty!" aparece. Registre qualquer atividade para limpar.</InfoBox>
            </SectionCard>

            {/* ─── 13. GOOGLE CALENDAR ─── */}
            <SectionCard id="google-calendar" title="13. Google Calendar">
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
                  <li>Na tela de <B>Jobs</B>, toque no ícone de <B>Sync</B></li>
                  <li>Modal mostra eventos encontrados. O Ozly filtra usando palavras-chave inteligentes (reconhece: shift, cleaning, bond clean, turno, trabalho, etc.)</li>
                  <li>Selecione quais importar com checkboxes</li>
                  <li>Toque em <B>"Review"</B> → configure contractor, business e rate para cada item</li>
                  <li>Toque em <B>"Import"</B></li>
                </StepList>
              </SubSection>

              <SubSection title="Desconectar">
                <P>Settings → <B>"Disconnect"</B> (botão vermelho). Jobs já importados permanecem.</P>
              </SubSection>
            </SectionCard>

            {/* ─── 14. PERFIL ─── */}
            <SectionCard id="perfil" title="14. Perfil">
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
                  <li><B>Endereço</B> — max 300 chars</li>
                  <li><B>Telefone</B> — formato: +61 400 000 000</li>
                  <li><B>Email</B> — somente leitura</li>
                </BulletList>
              </SubSection>

              <SubSection title="Gerenciar Businesses/ABNs">
                <P>Lista de ABNs com nome, número e categoria. Toque para editar (ABN, Company Name, Categoria, Hourly Rate, BSB, Account Number). Botão <B>"+"</B> para adicionar novo.</P>
              </SubSection>
            </SectionCard>

            {/* ─── 15. CONFIGURAÇÕES ─── */}
            <SectionCard id="settings" title="15. Configurações (Settings)">
              <P>Menu lateral → <B>"Settings"</B>.</P>

              <SubSection title="General">
                <BulletList>
                  <li><B>Edit Profile</B> → vai para Perfil</li>
                  <li><B>Theme</B> — Personalized (muda com nível Hustle), Light, Dark, System</li>
                  <li><B>Juice (Efeitos)</B> — Toggle on/off (vibrações, animações, sons)</li>
                  <li><B>Week Start Day</B> — Monday a Sunday</li>
                  <li><B>Invoice Messages</B> — Templates editáveis para envio e lembrete. Placeholders: {"{name}"}, {"{number}"}, {"{amount}"}, {"{date}"}</li>
                </BulletList>
              </SubSection>

              <SubSection title="Language">
                <P>Português / English / Español</P>
              </SubSection>

              <SubSection title="Integrations">
                <P>Google Calendar — veja seção 13.</P>
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

            {/* ─── 16. ASSINATURA PRO ─── */}
            <SectionCard id="assinatura-pro" title="16. Assinatura Pro">
              <P>Settings → <B>"Upgrade to Pro"</B> ou toque em qualquer item que requer Pro.</P>

              <SubSection title="Benefícios">
                <BulletList>
                  <li>Trial de 7 dias incluso</li>
                  <li>Opções: <B>Annual</B> (recomendado) e <B>Monthly</B></li>
                  <li>Preços variam por região (via RevenueCat)</li>
                </BulletList>
              </SubSection>

              <SubSection title="Ações">
                <SimpleTable
                  headers={["Ação", "O que faz"]}
                  rows={[
                    ["Subscribe", "Inicia compra nativa (App Store / Google Play)"],
                    ["Restore Purchases", "Recupera assinatura anterior"],
                    ["Terms / Privacy", "Abre links"],
                    ["X (fechar)", "Volta sem assinar"],
                  ]}
                />
              </SubSection>
            </SectionCard>

            {/* ─── 17. MODO OFFLINE ─── */}
            <SectionCard id="modo-offline" title="17. Modo Offline e Sincronização">
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

            {/* ─── 18. INDICAÇÃO ─── */}
            <SectionCard id="indicacao" title="18. Indicação (Referral)">
              <StepList>
                <li>No Dashboard, encontre o card verde <B>"Ganhe 1 Mês Grátis"</B></li>
                <li>Toque no card</li>
                <li>A gaveta de compartilhamento abre com mensagem pré-formatada</li>
                <li>Envie via WhatsApp, SMS, Email, Telegram ou qualquer app</li>
              </StepList>
              <InfoBox>A mensagem está no idioma do app (PT, EN ou ES).</InfoBox>
            </SectionCard>

            {/* ─── 19. NOTIFICAÇÕES ─── */}
            <SectionCard id="notificacoes" title="19. Notificações Automáticas">
              <P>O Ozly envia notificações inteligentes locais:</P>
              <SimpleTable
                headers={["Notificação", "Quando", "O que mostra"]}
                rows={[
                  ["Morning Briefing", "Todo dia às 7:00", "Jobs do dia + invoices atrasadas"],
                  ["End of Shift", "15min após fim do job", "Complete e fature este job"],
                  ["Expense Reminder", "Quartas às 12:00", "Registre seus recibos da semana"],
                  ["Friday Sweeper", "Sextas às 16:00", "Resumo da semana"],
                  ["Weekly Summary", "Domingos às 18:00", "Estatísticas da semana"],
                ]}
              />
              <P>Ao tocar: navega para a tela relevante. Botões: "Complete", "Snooze 1h", "Mark Paid".</P>
            </SectionCard>

            {/* ─── 20. SEGURANÇA ─── */}
            <SectionCard id="seguranca" title="20. Segurança e Privacidade">
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

            {/* ─── 21. CAMINHOS ALTERNATIVOS ─── */}
            <SectionCard id="caminhos-alternativos" title="21. Todos os Caminhos Alternativos">
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

              <SubSection title="Criar Despesa (2 caminhos)">
                <StepList>
                  <li>Expenses → FAB "Add Expense"</li>
                  <li>Dashboard → Deductible Expenses → "New Expense"</li>
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
              </SubSection>
            </SectionCard>

            {/* ─── 22. FAQ ─── */}
            <SectionCard id="faq" title="22. Perguntas Frequentes (FAQ)">
              <SubSection title="Conta">
                <div className="space-y-2">
                  <FaqItem q="Posso usar sem ABN?" a="Sim! ABN é opcional no cadastro. Complete quando for criar sua primeira invoice." />
                  <FaqItem q="Posso ter vários ABNs?" a='Sim! Adicione quantos ABNs quiser no Perfil. Use o seletor no menu lateral para alternar.' />
                  <FaqItem q="Posso mudar meu tipo de visto depois?" a="Sim. Profile → Visa Type. Os cálculos fiscais e Medicare recalculam automaticamente." />
                  <FaqItem q="Esqueci a senha, e agora?" a='Tela de Login → "Forgot Password?" → digite email → link de reset chega por email.' />
                </div>
              </SubSection>

              <SubSection title="Jobs">
                <div className="space-y-2">
                  <FaqItem q="E se eu trabalhar sem invoice (pagamento em dinheiro)?" a='Marque "Skip Invoice" ao criar o job. Ele conta nas horas (Visa Shield) mas não aparece em "To Invoice".' />
                  <FaqItem q="Posso anexar comprovante de pagamento?" a='Sim. Nos detalhes do job → "Add Receipt" → câmera ou galeria.' />
                  <FaqItem q='O que é o "Golden Hour"?' a="Se criar uma invoice até 60 minutos após completar um job, você ganha 2x XP (100 em vez de 50)." />
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

              <SubSection title="Offline">
                <div className="space-y-2">
                  <FaqItem q="Funciona sem internet?" a="100%. Crie, edite, visualize tudo offline. Sincroniza automaticamente quando tiver conexão." />
                </div>
              </SubSection>
            </SectionCard>

            {/* ─── CONTACT CTA ─── */}
            <div className="rounded-2xl bg-white border border-slate-200 p-10 text-center">
              <h2 className="text-2xl font-bold text-navy-700 mb-2">{t.guide.contactTitle}</h2>
              <p className="text-slate-500 mb-6">{t.guide.contactSubtitle}</p>
              <a
                href="mailto:support@ozly.app"
                className="inline-flex items-center gap-2.5 rounded-full bg-brand-500 px-6 py-3.5 text-white font-semibold hover:bg-brand-600 transition shadow-lg shadow-brand-500/30"
              >
                <Mail size={18} />
                {t.guide.contactButton}
              </a>
            </div>

          </main>
        </div>

        {/* Back to top */}
        <div className="text-center mt-12">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-brand-500 transition"
          >
            <ChevronUp size={16} /> Voltar ao topo
          </button>
        </div>
      </div>
    </div>
  );
}
