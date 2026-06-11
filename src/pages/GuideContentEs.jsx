export default function GuideContentEs({ SectionCard, SubSection, StepList, BulletList, Tip, InfoBox, SimpleTable, P, B, FaqItem }) {
  return (
    <>
      {/* ─── 1. PRIMEIROS PASSOS ─── */}
      <SectionCard id="primeiros-passos" title="1. Primeros Pasos (Login y Registro)">
        <InfoBox>
          <B>Video:</B>{" "}
          <a href="https://youtube.com/shorts/Y-ftNz2fGDw?feature=share" target="_blank" rel="noopener noreferrer" className="underline font-semibold">
            Cómo crear una cuenta (YouTube)
          </a>
        </InfoBox>
        <SubSection title="Crear cuenta con Email">
          <StepList>
            <li>Abrí Ozly</li>
            <li>Tocá <B>"Sign Up"</B> en el selector Login/Sign Up (esquina superior)</li>
            <li>Completá el <B>Email</B> — el campo valida el formato automáticamente</li>
            <li>Creá una <B>Contraseña</B> — mientras escribís, vas a ver:
              <BulletList>
                <li><B>Barra de fortaleza de contraseña</B> (roja = débil, naranja = regular, amarilla = buena, verde = fuerte)</li>
                <li><B>Chips de requisitos</B> que se ponen verdes: <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">6+ chars</code>, <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">A-Z</code>, <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">0-9</code>, <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">!@#</code></li>
              </BulletList>
            </li>
            <li>Completá <B>Confirmar Contraseña</B> — check verde = coinciden, X roja = no coinciden</li>
            <li><B>Código de referido</B> (opcional) — pegá el código de un amigo para acreditarle. Si llegaste por un link de referido (<code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">ozly.au/refer/?code=XXX</code>) el campo ya viene <B>completado y bloqueado</B> (gris, con un candadito) — el código se aplica automáticamente al terminar el registro.</li>
            <li>Tocá <B>"Sign Up"</B> (botón grande verde)</li>
            <li>¡Listo! Vas a ser redirigido a la pantalla de Setup</li>
          </StepList>
          <Tip>El código que usaste aparece después en el <B>Dashboard de Referidos</B> así podés confirmar que se aplicó.</Tip>
        </SubSection>

        <SubSection title="Crear cuenta con Google">
          <StepList>
            <li>Abrí Ozly</li>
            <li>Tocá <B>"Continue with Google"</B> (botón con logo de Google)</li>
            <li>Seleccioná tu cuenta de Google en el popup del sistema</li>
            <li>Autorizá el acceso</li>
            <li>¡Listo! Redirigido a Setup (o Dashboard si ya tenés perfil)</li>
          </StepList>
        </SubSection>

        <SubSection title="Iniciar Sesión (ya tenés cuenta)">
          <StepList>
            <li>Dejá seleccionado <B>"Login"</B> en el selector</li>
            <li>Ingresá <B>Email</B> y <B>Contraseña</B></li>
            <li>Tocá <B>"Login"</B></li>
            <li>O tocá <B>"Continue with Google"</B> para login rápido</li>
          </StepList>
        </SubSection>

        <SubSection title="Olvidé mi Contraseña">
          <StepList>
            <li>En la pantalla de Login, tocá <B>"Forgot Password?"</B> (texto azul a la derecha)</li>
            <li>Aparece un diálogo pidiendo tu email</li>
            <li>Ingresá el email y tocá <B>"Reset"</B></li>
            <li>Revisá tu bandeja de entrada (y la carpeta de spam)</li>
            <li>Hacé clic en el enlace recibido para crear una nueva contraseña</li>
          </StepList>
        </SubSection>

        <Tip>Tocá el <B>ícono del ojo</B> al lado del campo de contraseña para alternar entre mostrar y ocultar el texto.</Tip>
      </SectionCard>

      {/* ─── 2. SETUP ─── */}
      <SectionCard id="setup" title="2. Configuración Inicial (Setup)">
        <InfoBox>
          <B>Video:</B>{" "}
          <a href="https://youtube.com/shorts/Y-ftNz2fGDw?feature=share" target="_blank" rel="noopener noreferrer" className="underline font-semibold">
            Configuración inicial (YouTube)
          </a>
        </InfoBox>
        <P>Después de crear la cuenta, el Setup pide solo lo esencial para que empieces.</P>

        <SubSection title="Campos Obligatorios">
          <StepList>
            <li><B>Foto de Perfil</B> (opcional pero recomendado) — Tocá el avatar circular. Opciones: Cámara, Galería o Eliminar.</li>
            <li><B>Nombre Completo</B> (obligatorio) — Como aparecerá en las invoices. Máximo 100 caracteres.</li>
            <li><B>Código Postal</B> (opcional) — 4 dígitos (ej: 2000 para Sydney).</li>
            <li><B>Tipo de Visa</B> (obligatorio) — Tocá una de las 4 tarjetas:
              <BulletList>
                <li><B>Work Visa</B> — Exento de Medicare Levy</li>
                <li><B>Student Visa</B> — Exento de Medicare, límite 48h/quincena</li>
                <li><B>Permanent Resident</B> — Paga Medicare 2%</li>
                <li><B>Citizen</B> — Paga Medicare 2%</li>
              </BulletList>
            </li>
            <li><B>Hourly Rate (Tarifa por Hora)</B> (obligatorio) — Valor por defecto: $45.00. Cambialo a tu valor real.</li>
          </StepList>
        </SubSection>

        <SubSection title="Campos Opcionales (Sección Expandible)">
          <P>Tocá la barra <B>"Business Details (Optional)"</B> para expandir:</P>
          <BulletList>
            <li><B>ABN</B> — 11 dígitos (validado si se completa)</li>
            <li><B>Categoría del ABN</B> — dropdown (Cleaning, Gardening, Construction, etc.)</li>
            <li><B>Company Name</B> — nombre de la empresa</li>
            <li><B>BSB</B> — 6 dígitos en formato 000-000</li>
            <li><B>Account Number</B> — número de cuenta bancaria</li>
            <li><B>PayID</B> — email, teléfono o ABN</li>
          </BulletList>
          <Tip>Saltá estos campos por ahora. Cuando vayas a crear tu primera invoice, Ozly te va a avisar para completar estos datos con un botón directo a tu Perfil.</Tip>
        </SubSection>

        <SubSection title="Finalizar">
          <P>Tocá <B>"Get Started"</B> (botón grande verde). Ozly guarda todo y te lleva a la pantalla de Bienvenida.</P>
        </SubSection>
      </SectionCard>

      {/* ─── 3. WELCOME TRIAL ─── */}
      <SectionCard id="welcome-trial" title="3. Tu Primera Factura (Gratis) y Elección de Plan">
        <P>Ozly te lleva al valor primero: justo después del Setup, te guiamos para crear <B>tu primera invoice totalmente gratis</B> — sin tarjeta, sin plan, sin compromiso. Recién elegís un plan <B>después</B> de haber enviado esa primera.</P>

        <SubSection title="Creá tu primera invoice (gratis)">
          <StepList>
            <li><B>"Let's set up your first invoice"</B> — escribí el <B>nombre del cliente</B> (y el email, opcional). Tocá <B>"Next"</B>.</li>
            <li><B>"What did you do for them?"</B> — escribí una breve <B>descripción del trabajo</B>, el <B>monto total</B> y la <B>fecha</B>. Tocá <B>"Review my invoice"</B>.</li>
            <li>Revisá la invoice en la pantalla siguiente y enviala. <B>Esta primera invoice es gratis</B> — solo necesitás una suscripción para enviar más.</li>
          </StepList>
          <Tip>¿Preferís explorar primero? Podés saltear y llegar a todo desde el Dashboard — pero crear esa primera invoice es la forma más rápida de ver qué hace Ozly.</Tip>
        </SubSection>

        <SubSection title="Los 2 planes">
          <P>Cuando vayas a enviar una segunda invoice (o abrir una función Pro), Ozly te ofrece un <B>trial gratis de 14 días</B> en uno de dos planes:</P>
          <SimpleTable
            headers={["Plan", "Para quién"]}
            rows={[
              ["ABN", "Contractors / freelancers — emití invoices, gestioná clientes, gastos con OCR, analítica fiscal"],
              ["PRO", "Todo lo de ABN + herramientas fiscales avanzadas — la mejor relación precio/valor"],
            ]}
          />
        </SubSection>

        <SubSection title="Empezar el trial">
          <P>Elegí un plan, tocá <B>"Start Free Trial"</B> y confirmá con el App Store / Google Play. Obtenés <B>14 días de acceso completo</B> sin que se cobre nada.</P>
        </SubSection>

        <Tip>El trial arranca en el momento y no se cobra nada por adelantado. Podés cancelar antes del vencimiento desde el App Store / Google Play sin ningún cargo.</Tip>
      </SectionCard>

      {/* ─── 4. DASHBOARD ─── */}
      <SectionCard id="dashboard" title="4. Dashboard — Pantalla Principal">
        <InfoBox>
          <B>Video:</B>{" "}
          <a href="https://youtube.com/shorts/U0kqn1DQ80M?feature=share" target="_blank" rel="noopener noreferrer" className="underline font-semibold">
            Cómo usar el Dashboard (YouTube)
          </a>
        </InfoBox>
        <P>El Dashboard es el centro de control de Ozly. Todo lo que necesitás en una sola pantalla.</P>

        <SubSection title="Barra Superior (App Bar)">
          <SimpleTable
            headers={["Posición", "Ícono", "Acción"]}
            rows={[
              ["Izquierda", "Menú Hamburguesa", "Abre el menú lateral (Drawer)"],
              ["Centro", "Logo Ozly", "Solo visual"],
              ["—", "Sync (nube)", "Aparece cuando estás offline/error. Tocá para forzar sync"],
              ["—", "Calendario (badge)", "Va a Jobs con sync de Google Calendar"],
              ["—", "Campana (badge)", "Abre el Centro de Notificaciones"],
              ["Derecha", "Exportar", "Copia el resumen del Dashboard"],
            ]}
          />
        </SubSection>

        <SubSection title="Cards del Dashboard">
          <P><B>Pending Jobs</B> — Hasta 3 jobs completos sin invoice. Botones: Complete (verde) y Cancel (rojo).</P>
          <P><B>Setup/Invite Card</B> — Aparece si el perfil está incompleto.</P>
          <P><B>GST Alert</B> — Aparece si los ingresos anuales proyectados {">"} $75.000.</P>
          <P><B>Selector de Período</B> — Weekly / Fortnightly / Monthly. Ícono de calendario para rango personalizado.</P>
          <P><B>Forecast (Previsión)</B> — Proyección de ingresos. Tocá para ver el modal con 4 filtros: Scheduled (violeta), To Invoice (naranja), To Receive (amarillo), Received (verde).</P>
          <P><B>Invoice Cards</B> — "To Invoice" (naranja): jobs listos para facturar. "Overdue" (rojo): invoices vencidas.</P>
          <P><B>Next Shift</B> — Próximo trabajo con cuenta regresiva. Tocá para Complete, Cancel, Edit o abrir Google Maps.</P>
          <P><B>Deductible Expenses</B> — Ahorro fiscal estimado. "View All" para el detalle, "New Expense" para agregar.</P>
          <P><B>Referral</B> — Card verde "Ganá 1 Mes Gratis". Tocá para compartir.</P>
        </SubSection>

        <Tip>Arrastrá la pantalla hacia abajo (pull-to-refresh) para forzar una sincronización completa.</Tip>
      </SectionCard>

      {/* ─── 5. MENU LATERAL ─── */}
      <SectionCard id="menu-lateral" title="5. Menú Lateral (Drawer)">
        <InfoBox>
          <B>Video:</B>{" "}
          <a href="https://youtube.com/shorts/3uOvNdymxec?feature=share" target="_blank" rel="noopener noreferrer" className="underline font-semibold">
            Cómo navegar por el menú lateral (YouTube)
          </a>
        </InfoBox>
        <P>Accedé deslizando de izquierda a derecha o tocando el menú hamburguesa.</P>

        <SubSection title="Navegación">
          <P>El menú agrupa los items por lo que más hacés: <B>Jobs</B> y <B>Financial</B> arriba, después tus herramientas.</P>
          <SimpleTable
            headers={["Item", "Va a", "Observación"]}
            rows={[
              ["Jobs", "Pantalla de Jobs", "—"],
              ["Financial", "Pantalla Financiera", "—"],
              ["Expenses", "Pantalla de Gastos", "—"],
              ["Contractors", "Pantalla de Contratantes", "—"],
              ["Organisations", "Pantalla de Organizaciones", "Solo si una empresa te invitó"],
              ["Fiscal", "Pantalla Fiscal", "Requiere Pro"],
              ["Visa Shield", "Monitor de horas", "Requiere Pro + visa work/student"],
              ["Hustle", "Gamificación (XP)", "—"],
              ["Settings", "Configuración", "—"],
            ]}
          />
          <InfoBox>Los items marcados "Requiere Pro" abren la pantalla de Paywall si no sos suscriptor.</InfoBox>
        </SubSection>

        <SubSection title="Otras opciones">
          <BulletList>
            <li><B>Avatar / Nombre</B> — Tocá para ir al Perfil</li>
            <li><B>Selector de ABN</B> — Cambiá el ABN activo o seleccioná "All"</li>
            <li><B>Hustle Score</B> — XP, nivel, barra de progreso</li>
            <li><B>Logout</B> — Confirmación antes de salir</li>
            <li><B>Última Sincronización</B> — Timestamp en el pie de página</li>
          </BulletList>
        </SubSection>
      </SectionCard>

      {/* ─── 6. JOBS ─── */}
      <SectionCard id="jobs" title="6. Jobs (Trabajos)">
        <InfoBox>
          <B>Video:</B>{" "}
          <a href="https://youtube.com/shorts/2ef45Y-oCCo?feature=share" target="_blank" rel="noopener noreferrer" className="underline font-semibold">
            Cómo crear un nuevo trabajo (YouTube)
          </a>
        </InfoBox>
        <SubSection title="Cómo llegar">
          <SimpleTable
            headers={["Camino", "Cómo"]}
            rows={[
              ["Menú lateral", 'Drawer → "Jobs"'],
              ["Dashboard", 'Card "Pending Jobs" → "View All"'],
              ["Dashboard", 'Card "Next Shift" → "View All"'],
              ["Dashboard", "Ícono de calendario en el App Bar"],
            ]}
          />
        </SubSection>

        <SubSection title="Visualizaciones">
          <BulletList>
            <li><B>Lista</B> — Todos los jobs con filtros y búsqueda por texto</li>
            <li><B>Calendario</B> — Vista mensual/semanal de los jobs en el calendario. Tocá un <B>día</B> para ver los jobs de ese día; tocá un <B>job adentro del calendario</B> para abrir el detalle. Usá el FAB "+" para crear un job con la fecha del día seleccionado ya completada.</li>
          </BulletList>
          <P><B>Filtros disponibles:</B> Estado (confirmed, pending, completed, cancelled), Período (today, tomorrow, in N days, overdue) y Business/ABN.</P>
        </SubSection>

        <SubSection title="Crear un nuevo Job">
          <P>Tocá el botón <B>"+ New Job"</B> (flotante) o en el Dashboard <B>"Add Job"</B>.</P>
          <StepList>
            <li><B>Título</B> — nombre del servicio (obligatorio, max 200 chars)</li>
            <li><B>Fecha</B> — tocá el calendario</li>
            <li><B>Horario de Inicio</B> y <B>Fin</B></li>
            <li><B>Contractor</B> — dropdown (completa el hourly rate automáticamente)</li>
            <li><B>Business/ABN</B> — dropdown</li>
            <li><B>Hourly Rate</B> — completado automáticamente, editable</li>
            <li><B>Ubicación</B> — dirección (max 300 chars)</li>
            <li><B>Notas</B> — información extra (max 1000 chars)</li>
            <li><B>Skip Invoice</B> — checkbox si no se necesita factura</li>
            <li>Tocá <B>"Save"</B></li>
          </StepList>
          <Tip><B>Aviso de feriado:</B> si la fecha elegida cae en un <B>feriado público australiano de tu estado</B>, aparece un diálogo — "La/s fecha/s siguiente/s caen en feriado público en [ESTADO]. ¿Crear el job igual?" — con <B>Continuar</B> o <B>Cancelar</B>. Funciona tanto en Add Job como en Edit Job. Si tu estado está vacío en el perfil, Ozly lo deduce desde el postcode.</Tip>
        </SubSection>

        <SubSection title="Jobs Recurrentes (Recurrencia Custom)">
          <P>Al crear un job, tocá <B>Recurrencia → Custom</B> para abrir el picker.</P>
          <BulletList>
            <li><B>Se repite cada</B> — 1 semana, 2 semanas, 3 semanas o 4 semanas</li>
            <li><B>Termina en</B> — 1 mes, 6 meses, 12 meses o elegí una <B>fecha de fin personalizada</B></li>
          </BulletList>
          <P>Ozly crea todas las ocurrencias de una, así aparecen en el calendario y en las horas del Visa Shield. Cada una se puede editar o cancelar individualmente.</P>
        </SubSection>

        <SubSection title="Interactuar con un Job">
          <SimpleTable
            headers={["Acción", "Qué hace"]}
            rows={[
              ["Complete", "Marca como completo + registra horas"],
              ["Cancel", "Cancela con confirmación"],
              ["Edit", "Abre el formulario de edición"],
              ["Reschedule", "Cambia fecha/hora"],
              ["Create Invoice", "Crea una invoice con este job"],
              ["Add Receipt", "Abre cámara/galería para comprobante"],
              ["Maps", "Abre Google Maps con indicaciones"],
              ["Delete", "Elimina permanentemente"],
            ]}
          />
          <P>Deslizá el job hacia la izquierda para eliminar. El indicador "In Progress" aparece durante el horario del job. Tirá la lista hacia abajo (<B>pull-to-refresh</B>) para actualizarla con lo que hay en el servidor.</P>
        </SubSection>

        <SubSection title="Acciones en Lote (Multi-select)">
          <P>Útil cuando importaste varios jobs del Google Calendar y necesitás corregir el rate de muchos a la vez, o borrar jobs viejos.</P>
          <StepList>
            <li><B>Mantené presionado</B> cualquier card → se activa el modo multi-select (aparecen checkboxes).</li>
            <li>Tocá otros cards para agregarlos o sacarlos de la selección.</li>
            <li>En la barra superior aparecen dos íconos: <B>lápiz</B> (cambia el valor/hora en todos los seleccionados) y <B>papelera</B> (elimina todos con confirmación).</li>
            <li>Tocá la <B>X</B> arriba a la izquierda para salir del modo.</li>
          </StepList>
        </SubSection>

        <SubSection title="Marcar Job como Completo (3 caminos)">
          <BulletList>
            <li>Pantalla de Jobs → Tocá el job → "Complete"</li>
            <li>Dashboard → Card "Pending Jobs" → botón verde (check)</li>
            <li>Dashboard → Card "Next Shift" → Tocá → "Complete Job"</li>
          </BulletList>
          <InfoBox>Después de completar, aparece un <B>bottom sheet de celebración</B> mostrando: horas trabajadas, ingreso generado, XP ganado y un <B>timer visual del Golden Hour</B> (60 minutos para crear invoice = 2x XP). Desde esa pantalla podés tocar <B>"Generate Invoice"</B> para facturar ahí mismo.</InfoBox>
        </SubSection>
      </SectionCard>

      {/* ─── 7. CONTRACTORS ─── */}
      <SectionCard id="contractors" title="7. Contractors (Contratantes)">
        <InfoBox>
          <B>Video:</B>{" "}
          <a href="https://youtube.com/shorts/fBN6d0GEeNs?feature=share" target="_blank" rel="noopener noreferrer" className="underline font-semibold">
            Cómo crear un contractor (YouTube)
          </a>
        </InfoBox>
        <P>Menú lateral → <B>"Contractors"</B>. Dos pestañas: <B>Agencies</B> y <B>Direct Clients</B>.</P>

        <SubSection title="Crear nuevo Contractor">
          <P>Botón <B>"+ Add Contractor"</B> o durante la creación de Job/Invoice → <B>"New Client"</B>.</P>
          <StepList>
            <li><B>Tipo</B>: "Agency" o "Direct Client"</li>
            <li><B>"Import from Contacts"</B> — abre la agenda del celular. Importa automáticamente: <B>nombre, teléfono y email</B>. ABN, dirección y hourly rate los completás a mano.</li>
            <li><B>Nombre</B> (obligatorio), <B>Email</B>, <B>Teléfono</B>, <B>ABN</B>, <B>Dirección</B>, <B>Hourly Rate</B> (por defecto), <B>Notas</B></li>
            <li>Tocá <B>"Save"</B></li>
          </StepList>
        </SubSection>

        <SubSection title="Acciones disponibles">
          <SimpleTable
            headers={["Acción", "Qué hace"]}
            rows={[
              ["Call", "Llama al número"],
              ["WhatsApp", "Abre WhatsApp con el número"],
              ["SMS", "Abre SMS"],
              ["Email", "Abre la app de email"],
              ["Create Invoice", "Crea invoice para este contractor"],
              ["Create Job", "Crea job para este contractor"],
              ["Edit", "Edita los datos"],
              ["Delete", "Elimina con confirmación"],
            ]}
          />
        </SubSection>
      </SectionCard>

      {/* ─── 8. INVOICES ─── */}
      <SectionCard id="invoices" title="8. Invoices (Facturas)">
        <InfoBox>
          <B>Video:</B>{" "}
          <a href="https://youtube.com/shorts/4PrnOG9wh50?feature=share" target="_blank" rel="noopener noreferrer" className="underline font-semibold">
            Cómo crear una invoice (YouTube)
          </a>
        </InfoBox>
        <SubSection title="6 caminos para crear una Invoice">
          <SimpleTable
            headers={["#", "Camino", "Datos prellenados"]}
            rows={[
              ["1", 'Financial → botón "+"', "En blanco"],
              ["2", "Financial → FAB flotante", "En blanco"],
              ["3", 'Dashboard → "To Invoice" → seleccionar jobs', "Contractor + Jobs"],
              ["4", 'Dashboard → Next Shift → Complete → "Generate Invoice"', "Job completo"],
              ["5", 'Dashboard → Forecast → "To Invoice" → tocá el job', "Job seleccionado"],
              ["6", 'Contractors → tocá → "Create Invoice"', "Contractor seleccionado"],
            ]}
          />
        </SubSection>

        <SubSection title="Paso a paso">
          <StepList>
            <li><B>Aviso de datos incompletos</B> — Si el ABN/datos bancarios están vacíos, aparece un diálogo con la opción "Complete Profile" o "Later".</li>
            <li><B>Seleccionar Contractor</B> — Dropdown. "New Client" para crear en el momento.</li>
            <li><B>Seleccionar Business/ABN</B> — Dropdown. "New ABN" para crear en el momento.</li>
            <li><B>Número de Invoice</B> — Generado automáticamente (INV-0001, INV-0002...). Editable.</li>
            <li><B>Fechas</B> — Emisión (por defecto: hoy) y Vencimiento (por defecto: 14 días).</li>
            <li><B>Seleccionar Jobs</B> — Lista de jobs completos con checkbox.</li>
            <li><B>Item Manual</B> — Tocá "Manual Item". Completá descripción, horas, tarifa. Opción de <B>guardar como template</B> para reutilizar en futuras invoices.</li>
            <li><B>GST</B> — Toggle para incluir/excluir 10%. Aviso automático si los ingresos {">"} $75k.</li>
            <li><B>Notas</B> — Términos y condiciones.</li>
            <li><B>Resumen</B> — Subtotal, GST, Total en tiempo real.</li>
            <li><B>Crear</B> — Tocá "Create Invoice". Genera PDF + muestra XP ganado + Golden Hour si corresponde.</li>
          </StepList>
        </SubSection>

        <SubSection title="Envío (después de crear)">
          <SimpleTable
            headers={["Opción", "Acción"]}
            rows={[
              ["WhatsApp (verde)", "Abre WhatsApp con template + PDF"],
              ["Email (azul)", "Email con asunto y cuerpo prellenados"],
              ["SMS (índigo)", "Envía mensaje con enlace/PDF por SMS"],
              ["Share PDF (violeta)", "Bandeja de compartir del sistema"],
              ["Download PDF (teal)", "Guarda en la carpeta Descargas"],
              ["Print (gris)", "Imprime con la impresora nativa del sistema"],
              ["Close", "Cierra sin enviar (guarda como borrador)"],
            ]}
          />
          <InfoBox>¿Le facturás a una empresa que usa Ozly for Business? Aparece una opción extra <B>"Send directly to [Empresa]"</B> para que la invoice caiga directo en su portal — mirá la sección 9 (Organizaciones).</InfoBox>
        </SubSection>
      </SectionCard>

      {/* ─── 9. ORGANISATIONS ─── */}
      <SectionCard id="organisations" title="9. Organizaciones (Trabajar para una Empresa)">
        <P>Si una empresa de limpieza o agencia usa <B>Ozly for Business</B>, puede invitarte como <B>sub-contractor</B>. Seguís siendo 100% independiente — Ozly nunca crea una relación de empleo — pero las invoices que emitís <B>a esa empresa</B> aparecen directo en su portal, y ellos pueden ofrecerte trabajo.</P>

        <SubSection title="Aceptar una invitación">
          <StepList>
            <li>La empresa te envía un <B>link de invitación</B> (con el formato <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">ozly.au/invite/…</code>) por WhatsApp, SMS o email.</li>
            <li>Tocá el link — Ozly abre la pantalla <B>"[Empresa] te invitó a unirte como sub-contractor"</B>. (¿No tenés el link a mano? Menú lateral → <B>Organisations</B> → <B>"Have an invite link?"</B> → pegalo.)</li>
            <li>Leé la nota: al aceptar, la empresa ve las invoices que emitís <B>a ellos</B> — nada más. Podés revocar el acceso cuando quieras.</li>
            <li>Tocá <B>"Accept invitation"</B> (o <B>"Decline"</B>).</li>
            <li><B>Un último paso</B> — vinculá un contractor a la empresa. Elegí <B>"Create a new contractor named '[Empresa]'"</B> (recomendado) o seleccioná uno existente, y tocá <B>"Continue"</B>.</li>
            <li>Listo — <B>"You're in."</B> Las invoices que emitís a esta organización ahora son visibles para ellos.</li>
          </StepList>
        </SubSection>

        <SubSection title="La pantalla de Organisations">
          <P>Menú lateral → <B>Organisations</B>. Cada empresa a la que te uniste aparece como un card con:</P>
          <BulletList>
            <li><B>Estado</B> — <B>Active</B> (teal), <B>Pending</B> (ámbar) o <B>Declined</B> (gris)</li>
            <li><B>Tu rol</B> — normalmente "Member"</li>
            <li><B>Frecuencia de facturación</B> — cada cuánto agrupan tus invoices (Weekly / Fortnightly / Monthly) y cuándo arranca el ciclo</li>
            <li><B>Aviso de subsidio</B> — si la empresa cubre tu plan ABN, vas a ver cuánto ahorrás</li>
          </BulletList>
          <InfoBox>Si la empresa edita los términos de un job que acordaste, aparece un banner amarillo: <B>"N engagement(s) need your re-confirmation"</B> — tocalo para ir a Jobs y aceptar o rechazar el cambio (ver abajo).</InfoBox>
        </SubSection>

        <SubSection title="Enviar una invoice directo a la empresa">
          <P>Cuando creás una invoice para un contractor vinculado a una organización, aparece un bloque extra en el editor de invoice:</P>
          <BulletList>
            <li>Toggle <B>"Send directly to [Empresa]"</B> (activado por defecto) — envía el PDF por email a la casilla de facturación de la empresa para que caiga en su portal.</li>
            <li><B>"Email me a copy"</B> — marcalo para recibir también el PDF vos.</li>
          </BulletList>
          <P>Después de enviar, un pequeño <B>badge de entrega</B> muestra el estado al lado de la invoice:</P>
          <SimpleTable
            headers={["Badge", "Significado"]}
            rows={[
              ["📤 ✓ Delivered", "La empresa recibió el email"],
              ["📤 ⏱ Queued", "Enviando — revisá en un rato"],
              ["📤 ⚠ Bounced", "Casilla incorrecta o bloqueada — ver abajo"],
              ["📤 ❌ Failed", "El envío falló — reintentá"],
            ]}
          />
          <P>Tocá el badge para abrir el detalle. Si rebotó o falló, tocá <B>"Try sending again"</B> después de que la empresa confirme su email de facturación.</P>
        </SubSection>

        <SubSection title="Cambios en jobs y confirmación de pago">
          <P><B>Cambio de job propuesto</B> — Cuando la empresa ajusta un job (horario, lugar, tarifa…), recibís una notificación push y un banner en ese job: <B>"Your business proposed a change"</B> mostrando lo viejo vs lo nuevo. Tocá <B>"Accept change"</B> o <B>"Reject"</B>.</P>
          <P><B>Confirmar pago recibido</B> — Cuando la empresa marca una de tus invoices como pagada, aparece en Financial con un botón <B>"Confirm payment received"</B>. Tocalo recién cuando la plata realmente llegue — así mantenés tus registros y los de ellos sincronizados.</P>
        </SubSection>

        <SubSection title="Mensajearte con la empresa (2 vías)">
          <P>Las invoices y jobs vinculados a una organización tienen un botón <B>Messages</B> que abre un chat con la empresa. Tus mensajes van a la derecha; los de ellos (con la etiqueta <B>"Business"</B>) a la izquierda — práctico para resolver una corrección sin salir de la app.</P>
        </SubSection>

        <Tip>Trabajar para una empresa a través de Ozly no cambia tu configuración fiscal — seguís emitiendo tus propias invoices bajo tu propio ABN y seguís siendo independiente.</Tip>
      </SectionCard>

      {/* ─── 10. EXPENSES ─── */}
      <SectionCard id="expenses" title="10. Expenses (Gastos)">
        <InfoBox>
          <B>Video:</B>{" "}
          <a href="https://youtube.com/shorts/oTwY3_WD_H8?feature=share" target="_blank" rel="noopener noreferrer" className="underline font-semibold">
            Cómo agregar un gasto (YouTube)
          </a>
        </InfoBox>
        <SubSection title="Agregar un Gasto">
          <StepList>
            <li><B>Sacar Foto del Recibo</B> — Cámara o Galería. El OCR extrae monto, fecha y nombre automáticamente.</li>
            <li><B>Seleccionar Business/ABN</B></li>
            <li><B>Completar Campos</B> — Merchant Name, Fecha, Total Amount, Categoría (Fuel, Tools, Uniform, Phone, Insurance, Vehicle, Office, Training, Other), Descripción.</li>
            <li><B>Items Deducibles</B> — Expandí la sección y marcá los items aplicables. El Claimable Amount se recalcula automáticamente.</li>
            <li><B>Guardar</B> — Tocá "Save". Ganás XP.</li>
          </StepList>
        </SubSection>

        <SubSection title="Items Deducibles por Categoría">
          <SimpleTable
            headers={["Categoría", "Items"]}
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

        <SubSection title="Filtros y Exportación">
          <BulletList>
            <li><B>Categoría</B>: filtra por tipo</li>
            <li><B>Período</B>: All time / This month / Last month / Fiscal year</li>
            <li><B>"Only Deductible"</B>: muestra solo gastos con monto deducible</li>
            <li><B>Exportar</B>: ícono Export → modo de selección → "Share Selected" como CSV</li>
          </BulletList>
        </SubSection>
      </SectionCard>

      {/* ─── 11. FINANCIAL ─── */}
      <SectionCard id="financial" title="11. Financial (Financiero)">
        <P>Menú lateral → <B>"Financial"</B>.</P>

        <SubSection title="Cards de Resumen">
          <SimpleTable
            headers={["Card", "Tocá → Muestra"]}
            rows={[
              ["This Period", "Invoices del período actual"],
              ["Pending", "Invoices esperando pago"],
              ["Received", "Invoices pagadas"],
              ["Overdue", "Invoices vencidas"],
            ]}
          />
        </SubSection>

        <SubSection title="Acciones en una Invoice">
          <SimpleTable
            headers={["Acción", "Qué hace"]}
            rows={[
              ["Delete", "Elimina permanentemente"],
              ["Edit", "Reabre para edición"],
              ["Export", "Genera PDF o Excel"],
              ["Mark as Paid", "Cambia estado + animación"],
              ["Share", "Genera PDF y comparte"],
              ["WhatsApp/SMS/Email", "Envía recordatorio"],
            ]}
          />
        </SubSection>

        <SubSection title="Mark Paid / Mark Unpaid (toggle)">
          <P>Abrí cualquier invoice en <B>Financial</B> (tocala para expandir el detalle). El botón principal de acción es un <B>toggle</B>:</P>
          <BulletList>
            <li>Si la invoice <B>todavía no está paga</B> → el botón dice <B>"Mark as Paid"</B>. Al tocarlo, el estado pasa a <B>Paid</B> con la animación de confeti/celebración de siempre.</li>
            <li>Si la invoice <B>ya está Paid</B> → el botón cambia a <B>"Mark Unpaid"</B> (con un ícono de deshacer). Al tocarlo, el estado vuelve a <B>Sent</B> — sin animación de celebración esta vez.</li>
          </BulletList>
          <Tip>Útil cuando tocaste "Paid" sin querer o un pago se rechazó y necesitás devolver la invoice a la lista de pendientes.</Tip>
        </SubSection>

        <SubSection title="Meta de Ingresos">
          <P>Definí una meta con <B>"Set Goal"</B>. Seguí el progreso con la barra visual y <B>"Edit Goal"</B> para ajustar.</P>
        </SubSection>
      </SectionCard>

      {/* ─── 12. FISCAL ─── */}
      <SectionCard id="fiscal" title="12. Fiscal (Impuestos)">
        <P>Menú lateral → <B>"Fiscal"</B> (requiere Pro).</P>

        <SubSection title="Tablas de Impuestos (ATO 2024-26)">
          <P><B>Residentes Fiscales:</B></P>
          <SimpleTable
            headers={["Rango", "Tasa"]}
            rows={[
              ["$0 – $18.200", "0% (exento)"],
              ["$18.201 – $45.000", "16%"],
              ["$45.001 – $135.000", "30%"],
              ["$135.001 – $190.000", "37%"],
              ["$190.001+", "45%"],
            ]}
          />
          <P><B>No Residentes:</B> 30% desde el primer dólar.</P>
          <P><B>Working Holiday (417/462):</B> 15% fijo hasta $45k, después tasas marginales.</P>
        </SubSection>

        <SubSection title="Configuraciones Fiscales">
          <BulletList>
            <li><B>Tipo de Visa</B> — Recalcula tabla de impuestos y Medicare</li>
            <li><B>Tax Resident</B> — Toggle. Impacto: rango exento $18.200 vs 30% desde $1</li>
            <li><B>Medicare Levy</B> — 2% sobre ingreso gravable (solo residentes/PR, no WHM)</li>
            <li><B>GST</B> — Toggle manual o alerta automática si los ingresos {">"} $75k</li>
            <li><B>Work Type</B> — ABN</li>
          </BulletList>
        </SubSection>

        <SubSection title="Medicare Levy — Detalles">
          <BulletList>
            <li>Ingreso por debajo de <B>$27.222</B>: exento</li>
            <li>Ingreso entre <B>$27.222 y $34.028</B>: fase de transición (10% x diferencia)</li>
            <li>Ingreso por encima de <B>$34.028</B>: 2% completo</li>
            <li><B>Working Holiday Makers</B>: exentos de Medicare Levy</li>
          </BulletList>
        </SubSection>

        <SubSection title="Card de Ahorro Fiscal">
          <P>6 badges de hitos: $100, $200, $500, $1.000, $2.000, $5.000. Tocá cualquier badge para ver una equivalencia divertida.</P>
        </SubSection>

        <SubSection title="Estimación de Impuestos">
          <P>Muestra: Ingreso Total → Deducciones → Ingreso Gravable → Impuesto → Medicare → Total. Botón "i" para desglose detallado por rango.</P>
        </SubSection>

        <SubSection title="Otros Ingresos y Créditos">
          <P>Tocá <B>"+"</B> para agregar ingresos extras o impuestos ya pagados.</P>
          <BulletList>
            <li><B>Tipo:</B> Income (ingreso) o Tax Paid (impuesto ya retenido)</li>
            <li><B>Frecuencia:</B> weekly, fortnightly, monthly o X veces por semana</li>
            <li>Puede ser <B>año fiscal completo</B> o <B>pro-rata</B></li>
            <li>Los valores se anualizan automáticamente para el cálculo</li>
          </BulletList>
        </SubSection>

        <SubSection title="Comparación de Horas ABN (Pro)">
          <P>Compará tus horas trabajadas con otros profesionales de la misma categoría ABN en Australia.</P>
          <BulletList>
            <li><B>Período:</B> 4, 8 o 12 semanas</li>
            <li><B>Filtro por Estado:</B> compará dentro de tu estado australiano</li>
            <li><B>Estadísticas:</B> promedio, mediana, mínimo y máximo del grupo</li>
            <li><B>Ranking percentil:</B> mirá dónde te ubicás en el grupo</li>
          </BulletList>
        </SubSection>

        <InfoBox>Solo estimaciones. Basado en las tablas ATO 2024-26. Consultá a un contador registrado (tax agent).</InfoBox>
      </SectionCard>

      {/* ─── 13. VISA SHIELD ─── */}
      <SectionCard id="visa-shield" title="13. Visa Shield (Control de Horas)">
        <P>Menú lateral → <B>"Visa Shield"</B> (Pro, solo visa work/student).</P>

        <SubSection title="Pantalla Principal">
          <BulletList>
            <li>Horas trabajadas en destaque: <B>"Xh / 48h"</B></li>
            <li>Barra de progreso: Verde {"<"} 40h (seguro), Naranja 40-47h (alerta), Rojo {">="} 47h (peligro)</li>
            <li>Alerta STOP! (rojo, {">="} 47h) o WARNING! (naranja, 40-47h)</li>
          </BulletList>
        </SubSection>

        <SubSection title="Detalle y Carga Manual">
          <P>Lista de cada registro con título del job, fecha y horas. Botones de editar y eliminar en cada item.</P>
          <P>Tocá el <B>"+"</B> flotante para agregar horas manualmente: Job, Fecha, Horas.</P>
          <P>Botón <B>"Export Report"</B> copia CSV al portapapeles.</P>
        </SubSection>

        <InfoBox>El Visa Shield suma horas de TODOS tus ABNs automáticamente. La quincena es rotativa — siempre los últimos 14 días corridos.</InfoBox>
      </SectionCard>

      {/* ─── 14. HUSTLE SCORE ─── */}
      <SectionCard id="hustle-score" title="14. Hustle Score (Gamificación)">
        <P>Menú lateral → <B>"Hustle"</B>.</P>

        <SubSection title="Cómo ganar XP">
          <SimpleTable
            headers={["Acción", "XP", "Nota"]}
            rows={[
              ["Crear job", "5 XP", "—"],
              ["Completar job", "20 XP", "—"],
              ["Crear invoice", "50 XP", "2x si Golden Hour"],
              ["Golden Hour (invoice en 60min)", "100 XP (2x)", "Timer en pantalla de conclusión"],
              ["Invoice pagada (a tiempo)", "100 XP", "—"],
              ["Invoice pagada (vencida)", "80 XP", "—"],
              ["Registrar gasto", "100 XP", "120 XP si deducible"],
              ["Referido (éxito)", "500 XP", "Referido convertido"],
              ["Streak 3 días", "+5 XP", "Bonus acumulativo"],
              ["Streak 7 días", "+10 XP", "Bonus acumulativo"],
              ["Streak 14 días", "+30 XP", "Se reinicia"],
            ]}
          />
        </SubSection>

        <SubSection title="Tiers (Niveles por Semestre Fiscal)">
          <SimpleTable
            headers={["Nivel", "Presencia", "XP Semestral", "Color", "Efecto en Tema"]}
            rows={[
              ["Starter", "< 50%", "0 XP", "Teal", "Tema estándar"],
              ["Hustler", "50%+", "300 XP", "Azul Royal", "Tonos azules"],
              ["Pro", "75%+", "700 XP", "Violeta", "Tonos violeta"],
              ["Legend", "90%+", "1.500 XP", "Dorado", "Negro + dorado"],
            ]}
          />
          <P>El progreso se mide por semestre fiscal australiano: S1 (Jul–Dic) y S2 (Ene–Jun).</P>
        </SubSection>

        <SubSection title="Defensa de Tier">
          <BulletList>
            <li>Al final del semestre: si no alcanzaste la meta de XP de tu tier actual, <B>bajás 1 tier</B></li>
            <li>Si superaste la meta del siguiente tier, <B>subís automáticamente</B></li>
            <li>Starter se mantiene siempre (no se pierde)</li>
          </BulletList>
        </SubSection>

        <SubSection title="Streak (Días Consecutivos)">
          <BulletList>
            <li>Cada día que usás la app suma 1 al streak</li>
            <li>Bonus de XP en los hitos: <B>3 días (+5 XP)</B>, <B>7 días (+10 XP)</B>, <B>14 días (+30 XP)</B></li>
            <li>Después de 14 días el streak se reinicia y empieza de nuevo</li>
            <li>Si pasás un día sin usar la app, el streak vuelve a 0</li>
          </BulletList>
        </SubSection>

        <SubSection title="Hitos de Ahorro Fiscal">
          <P>Al alcanzar hitos de ahorro con gastos deducibles, aparecen badges:</P>
          <SimpleTable
            headers={["Monto", "Equivalencia"]}
            rows={[
              ["$100", "Una semana de compras en el supermercado"],
              ["$200", "Una cena especial"],
              ["$500", "Un viaje de fin de semana"],
              ["$1.000", "Un mes de teléfono/internet"],
              ["$2.000", "Un vuelo ida y vuelta a Bali"],
              ["$5.000", "La entrada de un auto"],
            ]}
          />
        </SubSection>

        <SubSection title="Cards Expandibles">
          <BulletList>
            <li><B>Attendance</B> — Grilla del mes con días activos/inactivos + porcentaje</li>
            <li><B>XP Breakdown</B> — Desglose por acción + Golden Hour</li>
            <li><B>All Tiers</B> — Lista de todos los niveles con requisitos</li>
            <li><B>Streak</B> — Días consecutivos de uso (máximo 14, después se reinicia)</li>
          </BulletList>
        </SubSection>

        <InfoBox>Si pasás 3+ días sin usar la app, aparece un overlay "You're getting rusty!" con un mensaje motivacional. Cualquier acción (abrir la app, completar un job, crear una invoice) limpia el overlay.</InfoBox>
      </SectionCard>

      {/* ─── 15. GOOGLE CALENDAR ─── */}
      <SectionCard id="google-calendar" title="15. Google Calendar">
        <SubSection title="Conectar">
          <StepList>
            <li>Andá a <B>Settings → Integrations</B></li>
            <li>Tocá <B>"Connect"</B> (botón verde)</li>
            <li>Iniciá sesión en Google y autorizá</li>
            <li>El estado cambia a "Connected" (badge verde)</li>
          </StepList>
        </SubSection>

        <SubSection title="Importar Turnos">
          <StepList>
            <li>En la pantalla de <B>Jobs</B>, tocá el ícono de <B>Sync</B>.</li>
            <li><B>Diálogo "¿Importar eventos pasados?"</B> aparece: elegí entre <B>"Solo futuros"</B> (por defecto) o <B>"Elegir desde cuándo"</B> (date picker, hasta 2 años atrás). Los eventos pasados entran como <B>Completados</B> directo, con horas registradas — no ensucian la lista de pendientes.</li>
            <li>Ozly filtra con palabras clave inteligentes (reconoce: shift, cleaning, bond clean, turno, trabalho, etc.).</li>
            <li>Si hay <B>conflicto</B> de horario con un job existente, aparece una hoja con 3 opciones: <B>Mantener Ozly</B>, <B>Mantener Google</B> o <B>Mantener ambos</B> (crea un job nuevo al lado).</li>
            <li>Seleccioná los eventos a importar con los checkboxes.</li>
            <li>En la pantalla de Review, seleccioná items y elegí <B>Contractor</B>, <B>ABN</B> y <B>valor/hora</B> en el panel de arriba — se aplica al instante a todos los seleccionados (sin botón "Aplicar"). Tocá un item específico para ajustarlo individualmente.</li>
            <li>Tocá <B>"Import"</B>.</li>
          </StepList>
        </SubSection>

        <SubSection title="Auto-sync al abrir la app">
          <P>Dentro de <B>Settings → Integrations → Google Calendar</B> hay un toggle nuevo: <B>"Auto-sync on app open"</B>. Viene <B>activado por defecto</B> apenas conectás Google Calendar.</P>
          <BulletList>
            <li>Cada vez que la app vuelve del segundo plano (la reabrís o cambiás desde otra app), Ozly trae silenciosamente los eventos nuevos de Google Calendar.</li>
            <li>Si se importaron eventos nuevos y estás en la <B>pestaña Dashboard</B>, aparece un snackbar discreto abajo: <B>"✓ N events synced"</B>. En las otras pestañas no se muestra nada.</li>
            <li>Desactivá el toggle si preferís importar solo manualmente desde la pantalla de Jobs.</li>
          </BulletList>
        </SubSection>

        <SubSection title="Desconectar">
          <P>Settings → <B>"Disconnect"</B> (botón rojo). Los jobs ya importados se mantienen.</P>
        </SubSection>
      </SectionCard>

      {/* ─── 16. PERFIL ─── */}
      <SectionCard id="perfil" title="16. Perfil">
        <SubSection title="Cómo llegar">
          <BulletList>
            <li>Menú lateral → Tocá el avatar o el nombre</li>
            <li>Settings → "Edit Profile"</li>
          </BulletList>
        </SubSection>

        <SubSection title="Información Personal">
          <BulletList>
            <li><B>Avatar</B> — Cámara / Galería / Eliminar</li>
            <li><B>Nombre</B> — max 100 chars</li>
            <li><B>Dirección</B> — Campos detallados:
              <BulletList>
                <li><B>Street</B> — calle (con autocomplete)</li>
                <li><B>Apartment</B> — depto/unidad (opcional)</li>
                <li><B>Suburb</B> — barrio/localidad (con autocomplete)</li>
                <li><B>State</B> — estado australiano (con autocomplete)</li>
                <li><B>Postcode</B> — código postal (con autocomplete)</li>
              </BulletList>
            </li>
            <li><B>Teléfono</B> — formato: +61 400 000 000</li>
            <li><B>Email</B> — solo lectura</li>
            <li><B>País de Origen</B> — para referencia</li>
            <li><B>Código de Referral</B> — generado automáticamente, compartible</li>
          </BulletList>
        </SubSection>

        <SubSection title="Cambiar Contraseña">
          <StepList>
            <li>Tocá <B>"Change Password"</B> en la sección de perfil</li>
            <li>Ingresá tu <B>contraseña actual</B></li>
            <li>Ingresá la <B>nueva contraseña</B> — la barra de fortaleza te indica la seguridad</li>
            <li>Confirmá la nueva contraseña</li>
            <li>Tocá <B>"Update"</B></li>
          </StepList>
          <Tip>Si olvidaste tu contraseña actual, usá "Forgot Password?" en la pantalla de Login para recibir un enlace de reset por email.</Tip>
        </SubSection>

        <SubSection title="Administrar Businesses/ABNs">
          <P>Lista de ABNs con nombre, número y categoría. Tocá para editar:</P>
          <BulletList>
            <li><B>ABN</B> — 11 dígitos (validado)</li>
            <li><B>Company Name</B> — nombre de la empresa</li>
            <li><B>Categoría</B> — Cleaning, Gardening, Construction, Hospitality, Delivery, IT, Trades, Healthcare, Education, Retail, Other</li>
            <li><B>Hourly Rate</B> — tarifa por defecto para jobs de este negocio</li>
            <li><B>BSB</B> — 6 dígitos (formato XXX-XXX)</li>
            <li><B>Account Number</B> — cuenta bancaria</li>
            <li><B>PayID</B> — email, teléfono o ABN para pagos instantáneos</li>
          </BulletList>
          <P>Botón <B>"+"</B> para agregar un nuevo negocio. Usá el <B>selector de ABN</B> en el menú lateral para alternar entre negocios.</P>
        </SubSection>
      </SectionCard>

      {/* ─── 17. CONFIGURAÇÕES ─── */}
      <SectionCard id="settings" title="17. Configuración (Settings)">
        <P>Menú lateral → <B>"Settings"</B>.</P>

        <SubSection title="General">
          <BulletList>
            <li><B>Edit Profile</B> → va al Perfil</li>
            <li><B>Theme</B> — Personalized (cambia con el nivel Hustle), Light, Dark, System</li>
            <li><B>Juice (Efectos)</B> — Toggle on/off (vibraciones, animaciones, sonidos)</li>
            <li><B>Week Start Day</B> — Lunes a Domingo</li>
            <li><B>Invoice Messages</B> — Templates editables para envío y recordatorio (ver abajo)</li>
          </BulletList>
        </SubSection>

        <SubSection title="Personalizar Mensajes de Invoice">
          <P>En <B>Settings → Invoice Messages</B> editás dos templates listos:</P>
          <BulletList>
            <li><B>Send Invoice</B> — mensaje inicial al mandar una invoice nueva (WhatsApp, SMS, Email)</li>
            <li><B>Payment Reminder</B> — recordatorio para invoices atrasadas</li>
          </BulletList>
          <P><B>Placeholders disponibles:</B> <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{"{name}"}</code> (nombre del contractor), <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{"{number}"}</code> (número de la invoice), <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{"{amount}"}</code> (monto), <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{"{date}"}</code> (fecha de vencimiento)</P>
          <P><B>Ejemplo:</B> "Hola {"{name}"}, acá va la invoice {"{number}"} por {"{amount}"} con vencimiento {"{date}"}. ¡Gracias!"</P>
          <Tip>Tocá <B>"Reset to Default"</B> para volver a los textos originales si arruinaste un template.</Tip>
        </SubSection>

        <SubSection title="Idioma">
          <P>Português / English / Español</P>
        </SubSection>

        <SubSection title="Canjear código promocional">
          <P>¿Tenés un código de un referido, un regalo o una campaña? Tocá <B>"Redeem promo code"</B> en Settings.</P>
          <BulletList>
            <li><B>iOS</B> — se abre la hoja de canje propia de Apple; escribí el código ahí.</li>
            <li><B>Android</B> — pegá el código en el diálogo (<B>"Paste the code you received…"</B>) y tocá <B>"Redeem"</B>; Ozly lo deriva a la Play Store para finalizar.</li>
          </BulletList>
        </SubSection>

        <SubSection title="Notificaciones">
          <P>Toggle individual para cada tipo de notificación:</P>
          <BulletList>
            <li><B>Morning Briefing</B> — Resumen diario a las 7h</li>
            <li><B>End of Shift</B> — Recordatorio post-job</li>
            <li><B>Expense Reminder</B> — Miércoles al mediodía</li>
            <li><B>Friday Sweeper</B> — Resumen semanal los viernes</li>
            <li><B>Weekly Summary</B> — Estadísticas los domingos</li>
          </BulletList>
          <P>Si una empresa para la que trabajás usa Ozly for Business, también vas a recibir <B>notificaciones push</B> cuando te ofrezcan trabajo, propongan un cambio en un job, te manden un mensaje o marquen una de tus invoices como pagada o entregada (ver sección 21).</P>
        </SubSection>

        <SubSection title="Recordatorios de Job (personalizables)">
          <P>Dentro de <B>Settings → Notifications</B> hay una tarjeta dedicada: <B>"Job reminders"</B>. Elegí uno o más presets — Ozly dispara una notificación local antes de cada job futuro:</P>
          <BulletList>
            <li>15 min, 30 min, 1 hora, 2 horas, 4 horas antes</li>
            <li>1 día, 3 días, 1 semana antes</li>
            <li><B>Custom</B> → abre un diálogo donde escribís cualquier cantidad de horas</li>
          </BulletList>
          <P><B>Por defecto</B> (pre-seleccionados la primera vez): <B>1 hora</B> + <B>1 día</B> antes.</P>
          <Tip>Cada vez que cambiás la selección, Ozly <B>reagenda TODOS los jobs futuros</B> — no sólo los nuevos. O sea: activar "3 días antes" hoy crea ese recordatorio al toque para cada job que ya tengas en el calendario.</Tip>
        </SubSection>

        <SubSection title="Integraciones">
          <P>Google Calendar — mirá la sección 16. El toggle <B>"Auto-sync on app open"</B> también vive acá (activado por defecto después de conectar).</P>
        </SubSection>

        <SubSection title="Ayuda">
          <P><B>"Help Us Improve"</B> — Diálogo con País, Cómo encontraste Ozly, Feedback.</P>
        </SubSection>

        <SubSection title="Cuenta">
          <BulletList>
            <li><B>Subscription</B> — Pro (badge dorado) o Starter (botón Upgrade)</li>
            <li><B>Privacy Policy</B> y <B>Terms of Use</B> — enlaces externos</li>
            <li><B>Delete Account</B> (rojo) — Doble confirmación. Elimina TODOS los datos permanentemente.</li>
          </BulletList>
        </SubSection>
      </SectionCard>

      {/* ─── 18. ASSINATURA PRO ─── */}
      <SectionCard id="assinatura-pro" title="18. Suscripción Pro">
        <P>Settings → <B>"Upgrade to Pro"</B> o tocá cualquier item que requiera Pro. Recordá: <B>tu primera invoice siempre es gratis</B> — el paywall recién aparece cuando vas a enviar más o abrir una herramienta Pro.</P>

        <SubSection title="Planes Disponibles">
          <SimpleTable
            headers={["Plan", "Subtítulo", "Incluye"]}
            rows={[
              ["ABN", "Para Contractors", "Invoices PDF profesionales, gestión de contractors, reportes financieros, gastos con OCR, analítica fiscal"],
              ["PRO", "Todo — la mejor relación precio/valor", "Todo lo de ABN + herramientas fiscales avanzadas, con cambio de modo"],
            ]}
          />
          <BulletList>
            <li><B>14 días de trial gratis</B> en todos los planes</li>
            <li>Opciones: <B>Annual</B> (recomendado — muestra el % que ahorrás) y <B>Monthly</B></li>
            <li>Los precios exactos se muestran en la app y pueden variar por región (administrados vía App Store / Google Play)</li>
          </BulletList>
        </SubSection>

        <SubSection title="En el plan de una organización (ABN top-up)">
          <P>Si una empresa para la que trabajás cubre tu ABN, podés usar Ozly para facturarle a <B>esa empresa</B> sin costo para vos. Vas a ver un banner dorado: <B>"You're on [Empresa]'s plan — Invoices are limited to that organisation. Unlock all clients for +$5/month."</B></P>
          <BulletList>
            <li>Dejalo como está para facturarle solo a esa organización gratis.</li>
            <li>Tocá <B>"Unlock"</B> para agregar el <B>ABN top-up de +$5/mes</B> y facturarle a <B>cualquier</B> cliente.</li>
          </BulletList>
        </SubSection>

        <SubSection title="Acciones en la Pantalla de Suscripción">
          <SimpleTable
            headers={["Acción", "Qué hace"]}
            rows={[
              ["Subscribe / Start Trial", "Inicia compra nativa (App Store / Google Play) con 14 días gratis"],
              ["Restore Purchases", "Recupera una suscripción que ya compraste (ver abajo)"],
              ["Monthly ↔ Annual", "Alterna entre mensual y anual (el anual muestra el % de ahorro)"],
              ["Terms / Privacy", "Abre enlaces legales"],
              ["X (cerrar)", "Vuelve sin suscribirse"],
            ]}
          />
        </SubSection>

        <SubSection title="Restaurar Compras (Restore Purchases)">
          <P>Usalo cuando <B>ya te suscribiste antes</B> y necesitás reactivar — por ejemplo:</P>
          <BulletList>
            <li>Cambiaste de celular y reinstalaste Ozly</li>
            <li>Hiciste logout y perdiste el estado Pro</li>
            <li>La suscripción desapareció por algún bug</li>
          </BulletList>
          <StepList>
            <li>Abrí la pantalla de suscripción (Settings → Upgrade o cualquier feature Pro)</li>
            <li>Tocá <B>"Restore Purchases"</B></li>
            <li>Logueate con la misma cuenta de App Store / Google Play que usaste al comprar</li>
            <li>Ozly verifica y te devuelve el acceso Pro al instante</li>
          </StepList>
          <Tip>Si no encuentra nada, sale el mensaje "No active subscription" — significa que realmente no tenés suscripción, o estás logueado con una cuenta distinta a la que compró.</Tip>
        </SubSection>

        <SubSection title="Cuando Termina el Trial">
          <P>Después de los 14 días de trial, si <B>no te suscribiste</B>:</P>
          <BulletList>
            <li>Las features Pro (Fiscal, Expenses avanzado, Visa Shield, comparaciones) quedan bloqueadas</li>
            <li>El Dashboard sigue funcionando para ver los datos que ya cargaste</li>
            <li>Al tocar cualquier item Pro te lleva automáticamente a la pantalla de suscripción</li>
            <li>En algunos casos (iOS), la pantalla de suscripción aparece apenas abrís la app — tocá <B>"Restore Purchases"</B> (si ya te suscribiste), <B>elegí un plan</B>, o <B>cerrá sesión</B> si preferís usar otra cuenta</li>
          </BulletList>
        </SubSection>

        <SubSection title="Cancelar la Suscripción">
          <P>Ozly <B>no cancela desde la app</B> — la cancelación va por la tienda:</P>
          <BulletList>
            <li><B>iOS:</B> App Store → tu perfil → Subscriptions → Ozly → Cancel</li>
            <li><B>Android:</B> Google Play → menú → Payments {"&"} subscriptions → Ozly → Cancel</li>
          </BulletList>
          <P>Sin multa. Mantenés el acceso Pro hasta el fin del período ya pago.</P>
        </SubSection>
      </SectionCard>

      {/* ─── 19. MODO OFFLINE ─── */}
      <SectionCard id="modo-offline" title="19. Modo Offline y Sincronización">
        <P>Ozly es <B>offline-first</B> — todos los datos quedan en el celular en una base encriptada (SQLCipher).</P>

        <SimpleTable
          headers={["Situación", "Comportamiento"]}
          rows={[
            ["Con internet", "Sincroniza cada 90s (activo) o 5min (inactivo)"],
            ["Sin internet", 'Muestra "Offline" en el App Bar. Todo funciona localmente'],
            ["Reconexión", "Sincronización inmediata automática"],
            ["Pull-to-refresh", "Fuerza sincronización completa manual"],
          ]}
        />

        <SubSection title="Cola de Sincronización">
          <BulletList>
            <li>Las operaciones offline quedan en cola</li>
            <li>Al reconectar: la cola se procesa automáticamente</li>
            <li>Hasta 10 reintentos por operación con backoff exponencial</li>
            <li>Cada 6 horas: reconciliación completa</li>
          </BulletList>
        </SubSection>

        <SubSection title="Indicadores Visuales">
          <BulletList>
            <li>Nube tachada = offline</li>
            <li>Sync con problema = error</li>
            <li>Banner "You're offline" en pantallas de lista</li>
            <li>Timestamp "Last sync" en el menú lateral</li>
          </BulletList>
        </SubSection>
      </SectionCard>

      {/* ─── 20. INDICAÇÃO ─── */}
      <SectionCard id="indicacao" title="20. Referencia (Referral)">
        <StepList>
          <li>En el Dashboard, encontrá el card verde <B>"Ganá 1 Mes Gratis"</B></li>
          <li>Tocá el card</li>
          <li>Se abre la bandeja de compartir con un mensaje preformateado</li>
          <li>Enviá por WhatsApp, SMS, Email, Telegram o cualquier app</li>
        </StepList>
        <InfoBox>El mensaje está en el idioma de la app (PT, EN o ES).</InfoBox>

        <SubSection title="Cómo aplican tu código tus amigos">
          <BulletList>
            <li><B>Deep link</B> — quien toca <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">ozly.au/refer/?code=XXX</code> cae directo en la pantalla de Sign Up con el campo ya completado y <B>bloqueado</B> (gris + candado). El código se aplica automáticamente al finalizar el registro.</li>
            <li><B>Manual</B> — también pueden escribir tu código en el campo <B>"Código de referido"</B> en la pantalla de Sign Up.</li>
          </BulletList>
          <P>El crédito aparece en tu Dashboard de Referidos apenas la persona activa la cuenta.</P>
        </SubSection>
      </SectionCard>

      {/* ─── 21. NOTIFICAÇÕES ─── */}
      <SectionCard id="notificacoes" title="21. Notificaciones Automáticas">
        <SubSection title="Recordatorios inteligentes (programados en tu celular)">
          <SimpleTable
            headers={["Notificación", "Cuándo", "Qué muestra"]}
            rows={[
              ["Morning Briefing", "Todos los días a las 7:00", "Jobs del día + invoices vencidas"],
              ["End of Shift", "15min después de terminar el job", "Completá y facturá este job"],
              ["Expense Reminder", "Miércoles a las 12:00", "Registrá tus recibos de la semana"],
              ["Friday Sweeper", "Viernes a las 16:00", "Resumen de la semana"],
              ["Weekly Summary", "Domingos a las 18:00", "Estadísticas de la semana"],
              ["Job reminders", "Antes de cada job (tus presets)", "Job próximo — ver Settings"],
              ["Trial ending", "3 días / 1 día / el día", "Tu trial está por terminar"],
            ]}
          />
          <P>Al tocar: navega a la pantalla correspondiente. Botones: "Complete", "Snooze 1h", "Mark Paid".</P>
        </SubSection>

        <SubSection title="Novedades en vivo de una empresa (push)">
          <P>Si trabajás para una empresa que usa <B>Ozly for Business</B>, vas a recibir notificaciones push en tiempo real. Al tocar una, te lleva directo al lugar indicado:</P>
          <SimpleTable
            headers={["Te llega cuando…", "Al tocar abre"]}
            rows={[
              ["La empresa te ofrece trabajo", "Jobs"],
              ["La empresa propone un cambio en un job", "Jobs (con el banner del cambio)"],
              ["La empresa te manda un mensaje", "El hilo de la conversación"],
              ["Una invoice se marca como pagada / entregada", "Financial"],
              ["La empresa te pide corregir una invoice", "Financial"],
            ]}
          />
        </SubSection>
      </SectionCard>

      {/* ─── 22. SEGURANÇA ─── */}
      <SectionCard id="seguranca" title="22. Seguridad y Privacidad">
        <SimpleTable
          headers={["Capa", "Protección"]}
          rows={[
            ["Base local", "Encriptada con SQLCipher"],
            ["Tokens", "Almacenados en SecureStorage"],
            ["Servidor", "Row-Level Security — solo ves tus datos"],
            ["Fotos", "URLs firmadas que expiran en 1 hora"],
            ["Uploads", "Nombres de archivo con timestamp"],
            ["Formularios", "maxLength en todos los campos"],
            ["Logs", "Nunca registran TFN, BSB, contraseñas, tokens"],
            ["Errores", "Mensajes genéricos al usuario"],
          ]}
        />
        <SubSection title="Eliminación de Datos">
          <P>Settings → Delete Account → doble confirmación. Elimina: perfil, businesses, jobs, invoices, gastos, contractors, horas, eventos. Cumplimiento LGPD/GDPR.</P>
        </SubSection>
      </SectionCard>

      {/* ─── 23. CAMINHOS ALTERNATIVOS ─── */}
      <SectionCard id="caminhos-alternativos" title="23. Todos los Caminos Alternativos">
        <SubSection title="Crear Invoice (6 caminos)">
          <StepList>
            <li>Financial → "+" o FAB</li>
            <li>Dashboard → "To Invoice" → seleccionar jobs → "Generate Invoice"</li>
            <li>Dashboard → Next Shift → Complete → "Generate Invoice"</li>
            <li>Dashboard → Forecast → "To Invoice" → tocá el job</li>
            <li>Contractors → tocá → "Create Invoice"</li>
            <li>Financial → tocá la invoice → "Edit"</li>
          </StepList>
        </SubSection>

        <SubSection title="Crear Job (3 caminos)">
          <StepList>
            <li>Jobs → FAB "+ New Job"</li>
            <li>Dashboard → Next Shift → "Add Job"</li>
            <li>Contractors → tocá → "Create Job"</li>
          </StepList>
        </SubSection>

        <SubSection title="Crear Gasto (3 caminos)">
          <StepList>
            <li>Expenses → FAB "Add Expense"</li>
            <li>Dashboard → Deductible Expenses → "New Expense"</li>
            <li>Jobs → Detalles del job → "Add Receipt" → cámara o galería</li>
          </StepList>
        </SubSection>

        <SubSection title="Crear Contractor (3 caminos)">
          <StepList>
            <li>Contractors → FAB "+ Add Contractor"</li>
            <li>Crear Invoice → dropdown → "New Client"</li>
            <li>Crear Job → dropdown → "New Client"</li>
          </StepList>
        </SubSection>

        <SubSection title="Crear Business/ABN (3 caminos)">
          <StepList>
            <li>Profile → sección Businesses → "+"</li>
            <li>Crear Invoice → dropdown business → "New ABN"</li>
            <li>Add Expense → "Add Business"</li>
          </StepList>
        </SubSection>

        <SubSection title="Acceder al Perfil (3 caminos)">
          <StepList>
            <li>Drawer → tocá el avatar</li>
            <li>Drawer → tocá el nombre</li>
            <li>Settings → "Edit Profile"</li>
          </StepList>
        </SubSection>

        <SubSection title="Marcar Invoice como Pagada (3 caminos)">
          <StepList>
            <li>Financial → tocá la invoice → "Mark as Paid"</li>
            <li>Dashboard → Notificaciones → tocá la invoice → "Mark as Paid"</li>
            <li>Dashboard → "Overdue" → notificaciones → "Mark as Paid"</li>
          </StepList>
          <Tip>El mismo botón cambia a <B>"Mark Unpaid"</B> en el detalle de la invoice si necesitás revertir.</Tip>
        </SubSection>

        <SubSection title="Novedades en 1.5.4">
          <BulletList>
            <li><B>Primera invoice gratis</B> — creá y enviá tu primera invoice sin plan ni tarjeta; el paywall recién aparece después.</li>
            <li><B>Organizaciones</B> — aceptá la invitación de una empresa, recibí ofertas de trabajo, enviá invoices directo a su portal y seguí el estado de entrega (sección 9).</li>
            <li><B>Envío a la organización</B> con badges de estado (Delivered / Queued / Bounced / Failed) y reintento con un toque.</li>
            <li><B>Confirmación de cambio de job</B> y <B>confirmación de pago</B> cuando trabajás para una empresa.</li>
            <li><B>Mensajería de 2 vías</B> con la empresa en cualquier invoice o job.</li>
            <li><B>Notificaciones push reales</B> para ofertas de trabajo, cambios en jobs, mensajes y novedades de invoices.</li>
            <li><B>ABN top-up (+$5/mes)</B> para desbloquear la facturación a todos los clientes cuando estás en el plan de una empresa.</li>
            <li><B>Canjear código promocional</B> en Settings.</li>
            <li>Planes simplificados a <B>ABN</B> y <B>PRO</B>, cada uno con trial gratis de 14 días.</li>
            <li>Versión de la app: <B>1.5.4+423</B> — visible en Settings → Help.</li>
          </BulletList>
        </SubSection>
      </SectionCard>

      {/* ─── 24. FAQ ─── */}
      <SectionCard id="faq" title="24. Preguntas Frecuentes (FAQ)">
        <SubSection title="Cuenta">
          <div className="space-y-2">
            <FaqItem q="¿Puedo usarlo sin ABN?" a="¡Sí! El ABN es opcional en el registro. Completalo cuando vayas a crear tu primera invoice." />
            <FaqItem q="¿Puedo tener varios ABNs?" a="¡Sí! Agregá todos los ABNs que quieras en tu Perfil. Usá el selector en el menú lateral para alternar entre ellos." />
            <FaqItem q="¿Puedo cambiar mi tipo de visa después?" a="Sí. Profile → Visa Type. Los cálculos fiscales y de Medicare se recalculan automáticamente." />
            <FaqItem q="Olvidé mi contraseña, ¿y ahora?" a='Pantalla de Login → "Forgot Password?" → ingresá el email → te llega un enlace de reset por email.' />
            <FaqItem q="¿Cómo cambio mi contraseña?" a='En el Perfil → "Change Password". Ingresá la contraseña actual, la nueva contraseña y confirmala. Si olvidaste la actual, usá "Forgot Password?" en el Login.' />
            <FaqItem q="¿Cómo cambio mi foto de perfil?" a="En el Perfil → tocá el avatar circular. Opciones: Cámara (sacar foto nueva), Galería (elegir foto existente) o Eliminar (quitar foto actual)." />
          </div>
        </SubSection>

        <SubSection title="Jobs">
          <div className="space-y-2">
            <FaqItem q="¿Y si trabajo sin invoice (pago en efectivo)?" a='Marcá "Skip Invoice" al crear el job. Cuenta en las horas (Visa Shield) pero no aparece en "To Invoice".' />
            <FaqItem q="¿Puedo adjuntar comprobante de pago?" a='Sí. En los detalles del job → "Add Receipt" → cámara o galería.' />
            <FaqItem q='¿Qué es el "Golden Hour"?' a="Si creás una invoice dentro de los 60 minutos después de completar un job, ganás 2x XP (100 en vez de 50)." />
          </div>
        </SubSection>

        <SubSection title="Completar Jobs">
          <div className="space-y-2">
            <FaqItem q="¿Puedo completar un job antes de la hora de fin?" a='Sí. Tocá el job → "Complete". Las horas se registran según el horario real (inicio a la hora actual).' />
            <FaqItem q="¿Qué pasa si olvido completar un job?" a="El job queda como pendiente. Podés completarlo después desde la pantalla de Jobs o desde el card Pending Jobs del Dashboard." />
          </div>
        </SubSection>

        <SubSection title="Invoices">
          <div className="space-y-2">
            <FaqItem q="¿El número de invoice es automático?" a="Sí (INV-0001, INV-0002...). Pero podés personalizarlo tocando el campo." />
            <FaqItem q="¿La invoice sirve como Tax Invoice oficial?" a="Sí, siempre que contenga ABN, fecha, descripción, monto y GST (si estás registrado). El PDF de Ozly incluye todo." />
            <FaqItem q="¿Necesito registrarme para GST?" a="Si tus ingresos anuales superan los $75.000. Ozly te avisa automáticamente con una alerta en el Dashboard." />
            <FaqItem q="¿Puedo enviar la invoice por WhatsApp?" a='Sí. Después de crear → elegí "WhatsApp" → el PDF se envía directo en el chat.' />
          </div>
        </SubSection>

        <SubSection title="Gastos">
          <div className="space-y-2">
            <FaqItem q="¿El OCR funciona siempre?" a="Funciona mejor con recibos nítidos. Si falla, completá manualmente. Ozly te avisa cuando la confianza es baja." />
            <FaqItem q="¿Cuánto puedo deducir?" a="Depende de cuántos items de la categoría están relacionados con el trabajo. Ej: si 2 de 3 items aplican, se deduce el 66% del monto." />
            <FaqItem q="¿Necesito guardar los recibos?" a="El ATO exige mantener registros por 5 años. La foto en Ozly cuenta como registro digital." />
          </div>
        </SubSection>

        <SubSection title="Fiscal">
          <div className="space-y-2">
            <FaqItem q="¿Los cálculos reemplazan a un contador?" a="No. Son estimaciones basadas en las tablas ATO 2024-26. Usá el reporte exportado como base para tu contador." />
            <FaqItem q='¿Qué es "Tax Resident"?' a="Si estuviste en Australia 183+ días en el año fiscal. Los residentes tienen un rango exento de $18.200." />
          </div>
        </SubSection>

        <SubSection title="Visa Shield">
          <div className="space-y-2">
            <FaqItem q="¿El límite de 48h es por empleador o total?" a="Total. El Visa Shield suma horas de TODOS tus ABNs/businesses." />
            <FaqItem q="¿La quincena es fija?" a="Rotativa — siempre los últimos 14 días corridos." />
          </div>
        </SubSection>

        <SubSection title="Hustle Score">
          <div className="space-y-2">
            <FaqItem q="¿Cómo funciona la defensa de tier?" a="En cada semestre fiscal (Jul-Dic / Ene-Jun), tu tier se reevalúa. Si no alcanzás la meta de XP de tu tier actual, bajás un nivel. Si superás la meta del siguiente, subís automáticamente." />
            <FaqItem q="¿Qué pasa si paso días sin usar la app?" a="Después de 3+ días sin abrir la app, aparece un overlay 'You're getting rusty!' con un mensaje motivacional. Cualquier acción limpia el overlay." />
            <FaqItem q="¿Qué es el Golden Hour?" a="Si creás una invoice dentro de los 60 minutos después de completar un job, ganás 2x XP (100 en vez de 50). Aparece un timer en la pantalla de finalización del job." />
          </div>
        </SubSection>

        <SubSection title="Referral">
          <div className="space-y-2">
            <FaqItem q="¿Cómo funciona la referencia?" a="Compartí tu enlace de referral desde el Dashboard o el Perfil. Cuando alguien se registre a través de tu enlace, ganás 500 XP." />
          </div>
        </SubSection>

        <SubSection title="Suscripción">
          <div className="space-y-2">
            <FaqItem q="¿Mi primera invoice es realmente gratis?" a="Sí. Podés crear y enviar tu primera invoice sin plan y sin tarjeta. Recién necesitás una suscripción para enviar más invoices o abrir herramientas Pro." />
            <FaqItem q="¿Cuál es la diferencia entre ABN y PRO?" a="ABN: invoices PDF profesionales, gestión de contractors, reportes financieros, gastos con OCR y analítica fiscal — para contractors. PRO (la mejor relación precio/valor): todo lo de ABN más herramientas fiscales avanzadas, con cambio de modo. Ambos tienen un trial gratis de 14 días; los precios exactos se muestran en la app y pueden variar por región." />
            <FaqItem q="¿El trial es gratis de verdad?" a="¡Sí! 14 días de acceso completo sin cobro. Cancelá en cualquier momento a través de la App Store o Google Play antes de que termine el trial." />
            <FaqItem q="¿Cómo cancelo mi suscripción?" a="Andá a la App Store (iOS) o Google Play (Android) → Suscripciones → Ozly → Cancelar. Mantenés el acceso hasta que termine el período de facturación actual." />
            <FaqItem q="¿Cómo canjeo un código promocional?" a="Settings → Redeem promo code. En iOS, escribilo en la hoja de canje de Apple; en Android, pegalo en el diálogo y tocá Redeem." />
          </div>
        </SubSection>

        <SubSection title="Organizaciones">
          <div className="space-y-2">
            <FaqItem q="Una empresa me mandó un link de invitación — ¿qué es?" a="Una empresa que usa Ozly for Business te invitó como sub-contractor independiente. Al aceptar, las invoices que emitís a ellos aparecen en su portal, y pueden ofrecerte trabajo. Seguís siendo independiente — no es una relación de empleo." />
            <FaqItem q="¿Trabajar para una empresa me cuesta algo?" a="No. Si la empresa cubre tu ABN, podés facturarle a esa empresa gratis. Para facturarle también a otros clientes, agregá el ABN top-up de +$5/mes (o un plan completo)." />
            <FaqItem q="La empresa marcó mi invoice como pagada pero todavía no veo la plata." a="Tocá 'Confirm payment received' recién cuando la plata realmente llegue a tu cuenta. Así mantenés tus registros y los de ellos sincronizados." />
            <FaqItem q="Mi invoice a la empresa muestra 'Bounced'. ¿Y ahora?" a="El email de facturación puede estar mal o bloqueado. Pedile a la empresa que confirme su casilla de facturación, después tocá el badge de entrega → 'Try sending again'." />
          </div>
        </SubSection>

        <SubSection title="Offline">
          <div className="space-y-2">
            <FaqItem q="¿Funciona sin internet?" a="100%. Creá, editá, mirá todo offline. Se sincroniza automáticamente cuando tengas conexión." />
            <FaqItem q="¿Y si edito lo mismo offline en dos celulares?" a="Ozly usa resolución por timestamp — la versión más reciente prevalece. En conflictos críticos, aparece una pantalla de resolución manual." />
          </div>
        </SubSection>
      </SectionCard>
    </>
  );
}
