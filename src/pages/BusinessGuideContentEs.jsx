/**
 * Ozly for Business — Guía del portal de la organización (español).
 * Mapea cada proceso del portal (app.ozly.au) y qué hacer en cada uno.
 * Los componentes helper los inyecta Guide.jsx (el mismo set que la guía de la app).
 */
export default function BusinessGuideContentEs({ SectionCard, SubSection, StepList, BulletList, Tip, InfoBox, SimpleTable, P, B, FaqItem }) {
  return (
    <>
      {/* ─── 1. QUÉ ES ─── */}
      <SectionCard id="overview" title="1. Qué es Ozly for Business">
        <P>Ozly for Business es el <B>portal web en app.ozly.au</B> para empresas y agencias de limpieza. Te da un solo lugar para recibir las facturas que te mandan los ABN holders con los que trabajás, ver a quién cubrís, marcar facturas como pagadas y exportarlas a tu banco o contador.</P>
        <InfoBox><B>La regla de oro:</B> en Ozly, <B>vos nunca creás una factura</B>. Cada ABN holder emite su propia factura desde la app móvil de Ozly y se la manda a tu organización. El portal es donde <B>recibís, hacés seguimiento y pagás</B> — cada uno sigue siendo independiente bajo su propio ABN.</InfoBox>
        <SubSection title="Qué podés hacer acá">
          <BulletList>
            <li>Invitar a los ABN holders con los que trabajás a tu espacio de trabajo</li>
            <li>Cubrir su plan de Ozly para que te facturen gratis (opcional)</li>
            <li>Recibir sus facturas en tu Inbox, con estado de entrega</li>
            <li>Marcar facturas como pagadas y exportar a ABA (banco) o Xero/MYOB</li>
            <li>Ver dashboards, reportes y un registro de actividad</li>
          </BulletList>
        </SubSection>
        <Tip>El portal está pensado primero para escritorio (hecho para un dueño/admin frente a una computadora). Los ABN holders nunca necesitan el portal — ellos viven en la app móvil.</Tip>
      </SectionCard>

      {/* ─── 2. CREAR ESPACIO DE TRABAJO ─── */}
      <SectionCard id="workspace" title="2. Creá tu espacio de trabajo">
        <SubSection title="Registrate">
          <StepList>
            <li>Entrá a <B>app.ozly.au</B> → <B>Sign up</B>.</li>
            <li>Poné tu email de trabajo — te mandamos un <B>magic link</B> (sin contraseña que recordar). Abrilo para iniciar sesión.</li>
            <li>Ponele nombre a tu organización (tu razón social/nombre comercial) y confirmá tu <B>ABN</B>.</li>
          </StepList>
        </SubSection>
        <SubSection title="Onboarding">
          <P>La primera vez que entrás, un <B>onboarding</B> corto te guía por lo esencial: tu email de facturación (a dónde se envían las facturas), invitar a tu primer ABN holder y tu plan de facturación. Podés saltearlo y hacer cualquier cosa más tarde desde el menú.</P>
          <Tip>Configurá tu <B>email de facturación</B> temprano (Settings) — es la casilla a la que se mandan por email las facturas de los ABN holders, así que tiene que ser una que revises.</Tip>
        </SubSection>
      </SectionCard>

      {/* ─── 3. DASHBOARD ─── */}
      <SectionCard id="dashboard" title="3. Dashboard">
        <P>Tu pantalla de inicio. Resume la plata que entra y sale en el período seleccionado.</P>
        <SimpleTable
          headers={["Tarjeta", "Muestra"]}
          rows={[
            ["Facturas recibidas", "Cuántas facturas te mandaron los ABN holders, y el total"],
            ["Pagadas / Vencidas", "Lo que marcaste como pagado vs lo que todavía se debe"],
            ["Quién facturó", "Los ABN holders más atrasados, así sabés a quién pagar primero"],
            ["Tendencia y estado", "Un gráfico de línea en el tiempo + una dona de pagado/pendiente/vencido"],
          ]}
        />
        <Tip>Usá el <B>filtro de período</B> (arriba del dashboard) para cambiar entre esta semana, quincena, mes o un rango personalizado.</Tip>
      </SectionCard>

      {/* ─── 4. MEMBERS ─── */}
      <SectionCard id="members" title="4. Members — Invitá ABN holders">
        <P>Los &ldquo;Members&rdquo; son los ABN holders independientes que invitaste a tu espacio de trabajo. Invitar a alguien hace que las facturas que emite <B>para vos</B> caigan en tu portal.</P>
        <SubSection title="Invitá a alguien">
          <StepList>
            <li>Menú lateral → <B>Members</B> → <B>Invite member</B>.</li>
            <li>Poné su nombre + celular o email. Ozly le manda un <B>link de invitación</B>.</li>
            <li>Lo tocan en la app de Ozly y aceptan — aparecen como <B>Active</B>.</li>
          </StepList>
        </SubSection>
        <SubSection title="Estados de los members y compliance">
          <SimpleTable
            headers={["Insignia", "Significado"]}
            rows={[
              ["Active", "Aceptó — sus facturas para vos aparecen en tu Inbox"],
              ["Pending", "Invitado, todavía no aceptó"],
              ["Declined", "Rechazó la invitación"],
              ["ABN / Insurance", "Insignias de compliance — muestran si proporcionó un ABN válido y un seguro en archivo"],
            ]}
          />
          <P>Podés <B>suspender / reactivar</B> a un member, y eliminar a alguien que ya no trabaja con vos.</P>
        </SubSection>
        <InfoBox>Invitar a un member <B>no</B> crea una relación de empleo y <B>no</B> cubre automáticamente su plan — cubrir es un paso aparte y opcional (próxima sección).</InfoBox>
      </SectionCard>

      {/* ─── 5. COVER / SPONSORSHIP ─── */}
      <SectionCard id="cover" title="5. Cubrí el plan de un ABN holder (opcional)">
        <P>Este es el diferenciador. Si te suscribís (próxima sección), podés <B>cubrir</B> el acceso ABN de Ozly de un ABN holder — ahí te facturan a <B>tu empresa</B> gratis, sin nada que pagar ellos mismos.</P>
        <SubSection title="Cómo funciona">
          <StepList>
            <li>Tenés una suscripción paga con suficientes asientos.</li>
            <li>En la tarjeta de un member, activá <B>Cover this person</B>.</li>
            <li>Reciben un push: <B>&ldquo;[Tu empresa] ahora cubre tu ABN — no necesitás pagar.&rdquo;</B></li>
            <li>Su facturación de Ozly queda configurada hacia tu organización mientras los cubrís.</li>
          </StepList>
        </SubSection>
        <SubSection title="Reglas importantes">
          <BulletList>
            <li><B>Un sponsor por persona.</B> Si alguien ya está cubierto por otra empresa, vas a ver &ldquo;Already covered by [Empresa]&rdquo; — solo una organización cubre a una persona a la vez.</li>
            <li><B>Igual pueden facturarle a otros.</B> Un ABN holder cubierto puede agregar un <B>top-up personal de $5/mes</B> en la app para también facturarles a clientes fuera de tu organización.</li>
            <li><B>7 días de gracia al cancelar.</B> Si dejás de cubrir (o cancelás tu plan), reciben una ventana de 7 días + un aviso para mantener el acceso pagando ellos mismos.</li>
          </BulletList>
        </SubSection>
        <Tip>Cubrir es por asiento: la cantidad de personas que cubrís debería coincidir con la cantidad de asientos de tu plan. Ozly ajusta tu tier automáticamente a medida que la cantidad de asientos cruza una banda (mirá Billing).</Tip>
      </SectionCard>

      {/* ─── 6. INBOX ─── */}
      <SectionCard id="inbox" title="6. Inbox — Facturas que recibís">
        <P>Cada factura que un ABN holder le manda a tu organización cae acá primero.</P>
        <SubSection title="Cómo llega una factura">
          <P>El ABN holder, en la app de Ozly, crea una factura, te elige como destinatario de la factura, activa <B>&ldquo;Send to org&rdquo;</B> y la manda. Llega a tu Inbox al instante, recibís un email en tu dirección de facturación y los admins reciben un push.</P>
        </SubSection>
        <SubSection title="Estado de entrega">
          <P>Abrí <B>Inbox → Deliveries</B> para ver si cada envío llegó a tu casilla de facturación:</P>
          <SimpleTable
            headers={["Estado", "Significado"]}
            rows={[
              ["Delivered", "El email llegó a tu casilla de facturación"],
              ["Queued", "Enviando — volvé a chequear en un rato"],
              ["Bounced", "Casilla equivocada/bloqueada — corregí tu email de facturación en Settings"],
              ["Failed", "El envío falló — el ABN holder puede reintentar desde su app"],
            ]}
          />
        </SubSection>
        <Tip>Las facturas nuevas aparecen como <B>New</B> hasta que las abrís, y después como <B>Seen</B> — así no se te escapa nada.</Tip>
      </SectionCard>

      {/* ─── 7. INVOICES ─── */}
      <SectionCard id="invoices" title="7. Invoices — Seguí, pagá y exportá">
        <P>La lista completa de todo lo recibido, con filtros y acciones en lote.</P>
        <SubSection title="Buscá y filtrá">
          <BulletList>
            <li>Filtrá por <B>member</B>, <B>estado</B> (pagada / pendiente / vencida) y <B>período</B>.</li>
            <li>Buscá por monto, número o descripción.</li>
          </BulletList>
        </SubSection>
        <SubSection title="Marcá como pagada">
          <StepList>
            <li>Abrí una factura (o seleccioná varias en lote).</li>
            <li>Tocá <B>Mark paid</B> una vez que realmente la pagaste.</li>
            <li>El ABN holder recibe un push: <B>&ldquo;[Empresa] marcó la factura #… como pagada.&rdquo;</B> — manteniendo sincronizados los registros de ambos.</li>
          </StepList>
        </SubSection>
        <SubSection title="Exportá para pagar / para tu contador">
          <BulletList>
            <li><B>Archivo ABA</B> — seleccioná facturas en lote → exportá un lote bancario (ABA) que subís a tu banco para pagarle a todos de una vez.</li>
            <li><B>CSV de Xero / MYOB</B> — exportá para tu software de contabilidad.</li>
          </BulletList>
          <InfoBox>Vos nunca emitís la factura — la edición es mínima y queda registrada en el log de auditoría. El ABN holder es el emisor legal; &ldquo;mark paid&rdquo; es tu registro de pago.</InfoBox>
        </SubSection>
      </SectionCard>

      {/* ─── 8. WORK ─── */}
      <SectionCard id="work" title="8. Work — Historial de trabajos">
        <P>Un historial de solo lectura de los trabajos que los ABN holders crearon en la app y que se relacionan con tu organización. Útil para cruzar lo que se hizo contra lo que se facturó. (Algunos planes te permiten ofrecer trabajo a los members — cuando está activado, también aparece acá).</P>
      </SectionCard>

      {/* ─── 9. BILLING ─── */}
      <SectionCard id="billing" title="9. Billing — Planes y asientos">
        <P>Tu suscripción a Ozly (vos → Ozly), separada de cualquier cosa que paguen los ABN holders. Los tiers escalan según cuántos asientos (personas que cubrís) tengas:</P>
        <SimpleTable
          headers={["Tier", "Asientos", "Por asiento / mes*"]}
          rows={[
            ["Crew", "1–5", "$14.99"],
            ["Squad", "6–15", "$12.99"],
            ["Fleet", "16–30", "$9.99"],
            ["Operation", "31–100", "$7.99"],
            ["Custom", "101+", "Hablá con nosotros"],
          ]}
        />
        <P>* Mensual indicativo. <B>Anual ≈ 2 meses gratis.</B> Hay una <B>prueba gratis de 14 días</B> disponible para organizaciones nuevas.</P>
        <SubSection title="Qué hacer acá">
          <StepList>
            <li><B>Add payment / start trial</B> — abre Stripe Checkout (tarjeta vía Stripe).</li>
            <li><B>Manage subscription</B> — abre el Stripe Customer Portal (actualizar tarjeta, IDs fiscales, ver facturas).</li>
            <li><B>Los asientos escalan solos</B> — a medida que cubrís más/menos personas, Ozly te mueve al tier que corresponde automáticamente.</li>
            <li><B>Downgrade / cancelar</B> — usa un flujo dentro de la app (con un motivo); los ABN holders cubiertos reciben los 7 días de gracia.</li>
          </StepList>
        </SubSection>
        <Tip>El banner de cantidad de asientos marca cualquier desfasaje entre los asientos que pagás y las personas que cubrís — mantenelos alineados para evitar sorpresas.</Tip>
      </SectionCard>

      {/* ─── 10. INTEGRATIONS ─── */}
      <SectionCard id="integrations" title="10. Integrations">
        <P>Settings → <B>Integrations</B>. Conectá Ozly con las herramientas que ya usás.</P>
        <SimpleTable
          headers={["Integración", "Qué hace", "Estado"]}
          rows={[
            ["Stripe", "Facturación con tarjeta para tu suscripción", "Activo"],
            ["Xero / MYOB", "Enviar las facturas recibidas a la contabilidad", "Hoy exportación (CSV); sincronización en vivo en camino"],
            ["Fuentes de trabajo (ServiceM8, Tradify…)", "Traer trabajos desde tu herramienta de agenda", "Próximamente"],
          ]}
        />
        <Tip>Si una integración muestra &ldquo;Próximamente&rdquo;, usá mientras tanto la exportación CSV/ABA — cubre la misma necesidad.</Tip>
      </SectionCard>

      {/* ─── 11. REPORTS & ACTIVITY ─── */}
      <SectionCard id="reports" title="11. Reports y Activity">
        <SubSection title="Reports">
          <P>Menú lateral → <B>Reports</B>. Totales y desgloses por período — facturado vs pagado, por member, para conciliación y época de impuestos.</P>
        </SubSection>
        <SubSection title="Registro de Activity">
          <P>Menú lateral → <B>Activity</B>. Una línea de tiempo de auditoría de lo que pasó en tu espacio de trabajo (invitaciones, coberturas, pagos, ediciones) — útil para rendición de cuentas y disputas.</P>
        </SubSection>
      </SectionCard>

      {/* ─── 12. SETTINGS ─── */}
      <SectionCard id="settings" title="12. Settings">
        <BulletList>
          <li><B>Perfil de la organización</B> — nombre, ABN, logo.</li>
          <li><B>Email de facturación</B> — a dónde se entregan las facturas de los ABN holders (mantenelo actualizado — hay rebotes si está mal).</li>
          <li><B>Preferencias de notificación</B> — sobre qué recibís emails/pushes.</li>
          <li><B>Tema</B> — claro/oscuro.</li>
        </BulletList>
        <Tip>Tip: todo el portal tiene una <B>paleta de comandos ⌘K</B> — apretala para saltar rápido a cualquier pantalla o acción.</Tip>
      </SectionCard>

      {/* ─── 13. FAQ ─── */}
      <SectionCard id="faq" title="13. Preguntas frecuentes">
        <div className="space-y-2">
          <FaqItem q="¿Creo facturas en el portal?" a="No. Cada ABN holder emite su propia factura en la app de Ozly y te la manda — vos recibís, hacés seguimiento y pagás. Ellos son el emisor legal; vos seguís siendo quien lleva el registro, no un empleador." />
          <FaqItem q="¿Cubrir a alguien lo convierte en mi empleado?" a="No. Cubrir solo paga su acceso ABN de Ozly. Siguen siendo independientes bajo su propio ABN. Tus obligaciones de Fair Work, súper, payroll-tax y workers&rsquo;-comp no cambian — Ozly te ayuda a documentarlas, no a evitarlas." />
          <FaqItem q="Alguien aparece como &lsquo;already covered by another company&rsquo; — ¿por qué?" a="Solo una organización puede cubrir el acceso de Ozly de una persona a la vez (un solo sponsor). Pueden cambiar de sponsor desde la app; la organización anterior mantiene 7 días de gracia." />
          <FaqItem q="¿Qué pasa con las personas cubiertas si cancelo?" a="Reciben una ventana de gracia de 7 días más una notificación, así pueden mantener el acceso suscribiéndose ellos mismos antes de que venza." />
          <FaqItem q="¿Cómo le pago realmente a todos?" a="Marcá las facturas como pagadas a medida que las pagás, o seleccioná en lote y exportá un archivo ABA para subirlo a tu banco y pagar el lote de una vez." />
          <FaqItem q="Una factura aparece como &lsquo;Bounced&rsquo; en Deliveries." a="Tu email de facturación está mal o bloqueado. Corregilo en Settings, y después el ABN holder puede reenviarla desde su app." />
          <FaqItem q="¿Hay una prueba gratis?" a="Sí — 14 días para organizaciones nuevas. Después tu plan se renueva automáticamente salvo que canceles antes de que termine." />
        </div>
      </SectionCard>
    </>
  );
}
