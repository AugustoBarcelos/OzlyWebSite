/**
 * Ozly for Business — Guía del portal de la organización (español).
 * Mapea cada proceso del portal (app.ozly.au) y qué hacer en cada uno.
 * Contenido verificado contra org-portal/src (rutas/componentes) — solo documenta
 * lo que realmente se entrega hoy. Los componentes helper los inyecta Guide.jsx.
 */
export default function BusinessGuideContentEs({ SectionCard, SubSection, StepList, BulletList, Tip, InfoBox, SimpleTable, P, B, FaqItem }) {
  return (
    <>
      {/* ─── 1. QUÉ ES ─── */}
      <SectionCard id="overview" title="1. Qué es Ozly for Business">
        <P>Ozly for Business es el <B>portal web en app.ozly.au</B> para empresas y agencias de limpieza. Te da un solo lugar para recibir las facturas que te mandan los ABN holders con los que trabajás, ver a quién cubrís, marcar facturas como pagadas y exportarlas a tu banco o a tu contador.</P>
        <InfoBox><B>La regla de oro:</B> en Ozly, <B>vos nunca creás una factura</B>. Cada ABN holder emite su propia factura desde la app móvil de Ozly y se la manda a tu organización. El portal es donde <B>recibís, hacés seguimiento y pagás</B> — cada uno sigue siendo independiente bajo su propio ABN.</InfoBox>
        <SubSection title="Qué podés hacer acá">
          <BulletList>
            <li>Invitar a los ABN holders con los que trabajás a tu espacio de trabajo</li>
            <li>Cubrir su plan de Ozly para que te facturen gratis (opcional)</li>
            <li>Recibir sus facturas en tu Inbox, con estado de entrega</li>
            <li>Marcar facturas como pagadas y exportar a Xero, CSV o un archivo bancario ABA</li>
            <li>Ver un dashboard, reportes de BAS/P&amp;L y un registro de actividad</li>
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
            <li>Ponele nombre a tu organización y agregá tu <B>ABN</B>.</li>
          </StepList>
        </SubSection>
        <SubSection title="Onboarding y tu Inbox email">
          <P>Después de registrarte tenés un onboarding corto y una guía de onboarding imprimible (cómoda para compartir con tu equipo). Lo único que conviene configurar temprano es tu <B>Inbox email</B> en Settings — esa es la dirección a la que se mandan por email las facturas de los ABN holders, así que tiene que ser una que revises.</P>
          <Tip>Apretá <B>⌘K</B> (Ctrl+K) en cualquier parte del portal para abrir una paleta de búsqueda/comandos — la forma más rápida de saltar a cualquier pantalla o factura.</Tip>
        </SubSection>
      </SectionCard>

      {/* ─── 3. DASHBOARD ─── */}
      <SectionCard id="dashboard" title="3. Dashboard">
        <P>Tu pantalla de inicio. Resume la plata que entra y sale en el período seleccionado.</P>
        <SimpleTable
          headers={["Tarjeta", "Muestra"]}
          rows={[
            ["Outstanding", "Total que todavía les debés a los ABN holders (sin pagar)"],
            ["Overdue", "De eso, lo que está vencido"],
            ["Paid (this period)", "Lo que marcaste como pagado en el rango"],
            ["Active members", "ABN holders actualmente en tu espacio de trabajo"],
          ]}
        />
        <P>Debajo de las tarjetas tenés un gráfico de <B>tendencia de ingresos</B> en el tiempo y una <B>dona de estado</B> (pagada / enviada / vencida / borrador). Usá el <B>filtro de período</B> de arriba para cambiar el rango.</P>
      </SectionCard>

      {/* ─── 4. MEMBERS ─── */}
      <SectionCard id="members" title="4. Members — Invitá ABN holders">
        <P>Los &ldquo;Members&rdquo; son los ABN holders independientes que invitaste a tu espacio de trabajo. Invitar a alguien hace que las facturas que emite <B>para vos</B> caigan en tu portal.</P>
        <SubSection title="Invitá a alguien">
          <StepList>
            <li>Menú lateral → <B>Members</B> → <B>Invite member</B>.</li>
            <li>Poné su email o celular. Ozly le manda una <B>invitación</B>.</li>
            <li>La aceptan <B>en la app de Ozly</B> — y ahí sus facturas para vos aparecen automáticamente y cuentan como un <B>Active member</B>.</li>
          </StepList>
          <P>Dos tarjetas de KPI arriba muestran <B>Active members</B> y <B>Pending invites</B>. Una tarjeta de pendientes te avisa si la invitación no se pudo entregar, así la podés reenviar.</P>
        </SubSection>
        <SubSection title="Cómo se factura a cada member">
          <P>La tarjeta de cada member lleva una pequeña <B>insignia de facturación</B> que muestra cómo se paga su acceso a Ozly:</P>
          <SimpleTable
            headers={["Insignia", "Significado"]}
            rows={[
              ["Company-covered", "Vos pagás su acceso ABN (mirá la próxima sección)"],
              ["➕ ABN top-up", "Vos los cubrís y ellos agregaron un top-up de $5/mes para también facturarles a otros"],
              ["Self-paid", "Pagan su propio plan de Ozly"],
              ["Needs ABN cover", "Sin cobertura y sin pagar — todavía no pueden emitir facturas con ABN"],
            ]}
          />
        </SubSection>
      </SectionCard>

      {/* ─── 5. COVER / SPONSORSHIP ─── */}
      <SectionCard id="cover" title="5. Cubrí el plan de un ABN holder (opcional)">
        <P>El diferenciador: una vez que te suscribís (mirá Billing), podés <B>cubrir</B> el acceso ABN de Ozly de un ABN holder — ahí te facturan a <B>tu empresa</B> gratis, sin nada que pagar ellos mismos.</P>
        <SubSection title="Cómo funciona">
          <StepList>
            <li>Tenés una suscripción paga con suficientes asientos.</li>
            <li>En la tarjeta de un member, activá <B>Cover this member</B>. La insignia pasa a <B>Company-covered</B>.</li>
            <li>Desactivala cuando quieras con <B>Stop covering</B> — el asiento se libera.</li>
          </StepList>
        </SubSection>
        <InfoBox>Un ABN holder cubierto puede agregar un <B>top-up de $5/mes</B> en la app (vas a ver la insignia <B>➕ ABN top-up</B>) para también facturarles a clientes fuera de tu organización, mientras vos seguís cubriendo el acceso ABN base.</InfoBox>
        <Tip>Tu tier de plan está determinado por cuántas personas cubrís — Ozly te sube/baja de tier automáticamente a medida que esa cantidad cruza una banda (mirá Billing).</Tip>
      </SectionCard>

      {/* ─── 6. INBOX ─── */}
      <SectionCard id="inbox" title="6. Inbox — Facturas que recibís">
        <P>Cada factura que un ABN holder le manda a tu organización cae acá, las más nuevas primero.</P>
        <SubSection title="Cómo llega una factura">
          <P>El ABN holder, en la app de Ozly, crea una factura, elige tu empresa y se la manda a tu organización. Aparece en tu Inbox y se manda por email a tu dirección de Inbox.</P>
        </SubSection>
        <SubSection title="Estado de entrega">
          <P>Cada fila muestra si el email llegó a tu dirección de Inbox. Filtrá por estado:</P>
          <SimpleTable
            headers={["Estado", "Significado"]}
            rows={[
              ["Delivered", "El email llegó a tu dirección de Inbox"],
              ["Sending", "En progreso — volvé a chequear en un rato"],
              ["Not delivered", "Rebotó — corregí tu Inbox email en Settings"],
              ["Failed", "El envío falló — el ABN holder puede reenviarla desde su app"],
            ]}
          />
          <P>Podés buscar, filtrar por fecha y <B>exportar la lista del inbox a CSV</B>.</P>
        </SubSection>
      </SectionCard>

      {/* ─── 7. INVOICES ─── */}
      <SectionCard id="invoices" title="7. Invoices — Seguí, pagá y exportá">
        <P>La lista completa de todo lo recibido, con filtros y acciones en lote.</P>
        <SubSection title="Encontrá y marcá como pagada">
          <StepList>
            <li>Filtrá por <B>member</B>, <B>estado</B> (pagada / enviada / vencida) y <B>período</B>; buscá por monto, número o texto.</li>
            <li>Abrí una factura y tocá <B>Mark paid</B> una vez que la pagaste — al ABN holder se le notifica, manteniendo sincronizados los registros de ambos.</li>
          </StepList>
        </SubSection>
        <SubSection title="Exportar (el menú Export ▾)">
          <SimpleTable
            headers={["Exportación", "Para qué sirve", "Cómo"]}
            rows={[
              ["For Xero", "Importar como Bills en Xero", "Export ▾ → For Xero (respeta tus filtros activos)"],
              ["As CSV", "Abrir en una planilla", "Export ▾ → As CSV"],
              ["Archivo bancario ABA", "Pagarles a tus members en un solo lote bancario", "Seleccioná filas → elegí facturas sin pagar → Generate ABA file → subilo a tu banco"],
            ]}
          />
          <InfoBox>Vos nunca emitís la factura — el ABN holder es el emisor legal. &ldquo;Mark paid&rdquo; y las exportaciones son tus registros y tu forma de pagar.</InfoBox>
        </SubSection>
      </SectionCard>

      {/* ─── 8. WORK ─── */}
      <SectionCard id="work" title="8. Work — Trabajos de tus members">
        <P>Una vista mayormente de lectura de los trabajos que los ABN holders crearon en la app y que se relacionan con tu organización. Cada fila muestra el trabajo, quién lo emitió, fechas, ubicación y valor. Los KPIs de arriba totalizan el <B>valor, las horas, la cantidad de trabajos y los completados</B> del período — cómodo para cruzar el trabajo hecho contra lo que se facturó. Si un trabajo tiene un cambio propuesto, su estado lo refleja.</P>
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
            <li><B>Los asientos escalan solos</B> — a medida que cubrís más/menos personas, Ozly te mueve al tier que corresponde.</li>
            <li><B>Downgrade</B> — usa un flujo dentro de la app (te pide un motivo y confirma el cambio).</li>
          </StepList>
        </SubSection>
      </SectionCard>

      {/* ─── 10. INTEGRATIONS ─── */}
      <SectionCard id="integrations" title="10. Integrations">
        <P>Settings → <B>Integrations</B>. Hoy Ozly mantiene esto chico a propósito — solo aparecen las conexiones que ya están entregadas y funcionando:</P>
        <BulletList>
          <li><B>CSV upload</B> — traé datos a través de una planilla.</li>
          <li><B>Calendar sync</B> — vive en <B>Settings</B> (su propia sección), para sincronizar trabajos con tu calendario.</li>
        </BulletList>
        <InfoBox>Todavía <B>no hay integraciones de contabilidad ni de fuentes de trabajo</B> (Xero/MYOB/ServiceM8) para conectar acá — las sacamos en vez de mostrarlas como tarjetas vacías de &ldquo;coming soon&rdquo;. Para meter datos en Xero hoy, usá el <B>Export → For Xero</B> en la pantalla de Invoices (sección 7).</InfoBox>
      </SectionCard>

      {/* ─── 11. REPORTS ─── */}
      <SectionCard id="reports" title="11. Reports">
        <P>Menú lateral → <B>Reports</B>. Números para conciliación y época de impuestos.</P>
        <BulletList>
          <li><B>BAS — trimestral</B> — año fiscal australiano (jul→jun); las columnas se mapean directamente con los campos del portal de la ATO. Exporta a CSV.</li>
          <li><B>Money in &amp; out (P&amp;L)</B> — un resumen de pérdidas y ganancias; el rango por defecto es el año fiscal actual, ajustable para profundizar.</li>
          <li><B>Exports &amp; integrations</B> — una guía rápida de las exportaciones Xero / CSV / ABA (que viven en la pantalla de Invoices).</li>
        </BulletList>
      </SectionCard>

      {/* ─── 12. SETTINGS ─── */}
      <SectionCard id="settings" title="12. Settings">
        <BulletList>
          <li><B>Organisation</B> — nombre, ABN, tarifa por hora por defecto y período de facturación.</li>
          <li><B>Inbox email</B> — a dónde se entregan las facturas de los ABN holders (mantenelo actualizado — las direcciones equivocadas/bloqueadas aparecen como &ldquo;Not delivered&rdquo; en el Inbox).</li>
          <li><B>Notifications</B> — elegí sobre qué recibís emails / pushes.</li>
          <li><B>Calendar feeds</B> — conectá un calendario para sincronizar trabajos.</li>
        </BulletList>
        <Tip>Acordate del <B>⌘K</B> — la paleta de comandos busca en tus facturas y salta a cualquier pantalla o acción al instante.</Tip>
      </SectionCard>

      {/* ─── 13. FAQ ─── */}
      <SectionCard id="faq" title="13. Preguntas frecuentes">
        <div className="space-y-2">
          <FaqItem q="¿Creo facturas en el portal?" a="No. Cada ABN holder emite su propia factura en la app de Ozly y te la manda — vos recibís, hacés seguimiento y pagás. Ellos son el emisor legal; vos seguís siendo quien lleva el registro, no un empleador." />
          <FaqItem q="¿Cubrir a alguien lo convierte en mi empleado?" a="No. Cubrir solo paga su acceso ABN de Ozly. Siguen siendo independientes bajo su propio ABN. Tus obligaciones de Fair Work, súper, payroll-tax y workers&rsquo;-comp no cambian — Ozly te ayuda a documentarlas, no a evitarlas." />
          <FaqItem q="¿Cómo meto las facturas en mi software de contabilidad?" a="En la pantalla de Invoices, usá Export ▾ → For Xero (importa como Bills en Xero) o As CSV para una planilla. Todavía no hay exportación a MYOB — usá CSV para otro software." />
          <FaqItem q="¿Cómo le pago realmente a todos?" a="Marcá las facturas como pagadas a medida que las pagás, o seleccioná filas en la pantalla de Invoices, elegí las que están sin pagar, generá un archivo ABA y subilo a tu banco para pagar el lote de una vez." />
          <FaqItem q="Una factura aparece como &lsquo;Not delivered&rsquo; en el Inbox." a="El email rebotó — tu Inbox email está mal o bloqueado. Corregilo en Settings, y después el ABN holder puede reenviarla desde su app." />
          <FaqItem q="¿Hay una prueba gratis?" a="Sí — 14 días para organizaciones nuevas. Después tu plan se renueva automáticamente salvo que canceles antes de que termine, y tu tier sigue cuántas personas cubrís." />
          <FaqItem q="¿Puedo conectar ServiceM8 / Xero / MYOB?" a="Todavía no como integraciones en vivo. Hoy el portal entrega CSV upload y calendar sync; para Xero, usá el Export → For Xero en Invoices. Preferimos entregar exportaciones que funcionan antes que botones vacíos de &lsquo;coming soon&rsquo;." />
        </div>
      </SectionCard>
    </>
  );
}
