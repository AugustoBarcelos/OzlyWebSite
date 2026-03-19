export default function GuideContentEs({ SectionCard, SubSection, StepList, BulletList, Tip, InfoBox, SimpleTable, P, B, FaqItem }) {
  return (
    <>
      {/* ─── 1. PRIMEIROS PASSOS ─── */}
      <SectionCard id="primeiros-passos" title="1. Primeros Pasos (Login y Registro)">
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
            <li>Tocá <B>"Sign Up"</B> (botón grande verde)</li>
            <li>¡Listo! Vas a ser redirigido a la pantalla de Setup</li>
          </StepList>
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
          <P>Tocá <B>"Get Started"</B> (botón grande verde). Ozly guarda todo y te lleva al Dashboard.</P>
        </SubSection>
      </SectionCard>

      {/* ─── 3. DASHBOARD ─── */}
      <SectionCard id="dashboard" title="3. Dashboard — Pantalla Principal">
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

      {/* ─── 4. MENU LATERAL ─── */}
      <SectionCard id="menu-lateral" title="4. Menú Lateral (Drawer)">
        <P>Accedé deslizando de izquierda a derecha o tocando el menú hamburguesa.</P>

        <SubSection title="Navegación">
          <SimpleTable
            headers={["Item", "Va a", "Observación"]}
            rows={[
              ["Contractors", "Pantalla de Contratantes", "—"],
              ["Jobs", "Pantalla de Jobs", "—"],
              ["Financial", "Pantalla Financiera", "—"],
              ["Fiscal", "Pantalla Fiscal", "Requiere Pro"],
              ["Expenses", "Pantalla de Gastos", "Requiere Pro"],
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

      {/* ─── 5. JOBS ─── */}
      <SectionCard id="jobs" title="5. Jobs (Trabajos)">
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
            <li><B>Calendario</B> — Vista mensual/semanal de los jobs en el calendario</li>
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
          <P>Deslizá el job hacia la izquierda para eliminar. El indicador "In Progress" aparece durante el horario del job.</P>
        </SubSection>

        <SubSection title="Marcar Job como Completo (3 caminos)">
          <BulletList>
            <li>Pantalla de Jobs → Tocá el job → "Complete"</li>
            <li>Dashboard → Card "Pending Jobs" → botón verde (check)</li>
            <li>Dashboard → Card "Next Shift" → Tocá → "Complete Job"</li>
          </BulletList>
          <InfoBox>Después de completar, el sistema registra horas automáticamente, activa el timer del Golden Hour (60min para crear invoice = 2x XP) y ofrece "Generate Invoice".</InfoBox>
        </SubSection>
      </SectionCard>

      {/* ─── 6. CONTRACTORS ─── */}
      <SectionCard id="contractors" title="6. Contractors (Contratantes)">
        <P>Menú lateral → <B>"Contractors"</B>. Dos pestañas: <B>Agencies</B> y <B>Direct Clients</B>.</P>

        <SubSection title="Crear nuevo Contractor">
          <P>Botón <B>"+ Add Contractor"</B> o durante la creación de Job/Invoice → <B>"New Client"</B>.</P>
          <StepList>
            <li><B>Tipo</B>: "Agency" o "Direct Client"</li>
            <li><B>"Import from Contacts"</B> — completa datos del celular</li>
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

      {/* ─── 7. INVOICES ─── */}
      <SectionCard id="invoices" title="7. Invoices (Facturas)">
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
        </SubSection>
      </SectionCard>

      {/* ─── 8. EXPENSES ─── */}
      <SectionCard id="expenses" title="8. Expenses (Gastos)">
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

      {/* ─── 9. FINANCIAL ─── */}
      <SectionCard id="financial" title="9. Financial (Financiero)">
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

        <SubSection title="Meta de Ingresos">
          <P>Definí una meta con <B>"Set Goal"</B>. Seguí el progreso con la barra visual y <B>"Edit Goal"</B> para ajustar.</P>
        </SubSection>
      </SectionCard>

      {/* ─── 10. FISCAL ─── */}
      <SectionCard id="fiscal" title="10. Fiscal (Impuestos)">
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
            <li><B>Work Type</B> — ABN, TFN o ambos</li>
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

      {/* ─── 11. VISA SHIELD ─── */}
      <SectionCard id="visa-shield" title="11. Visa Shield (Control de Horas)">
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

      {/* ─── 12. HUSTLE SCORE ─── */}
      <SectionCard id="hustle-score" title="12. Hustle Score (Gamificación)">
        <P>Menú lateral → <B>"Hustle"</B>.</P>

        <SubSection title="Cómo ganar XP">
          <SimpleTable
            headers={["Acción", "XP", "Observación"]}
            rows={[
              ["Crear job", "5 XP", "—"],
              ["Completar job", "20 XP", "—"],
              ["Crear invoice", "50 XP", "2x si Golden Hour"],
              ["Golden Hour", "100 XP", "Invoice en hasta 60min después de completar job"],
              ["Invoice pagada (a tiempo)", "100 XP", "—"],
              ["Invoice pagada (atrasada)", "80 XP", "—"],
              ["Registrar gasto", "100 XP", "120 XP si es deducible"],
              ["Referral (exitoso)", "500 XP", "Referencia convertida"],
              ["Streak 3 días", "+5 XP", "Bonus acumulativo"],
              ["Streak 7 días", "+10 XP", "Bonus acumulativo"],
              ["Streak 14 días", "+30 XP", "Bonus acumulativo"],
            ]}
          />
        </SubSection>

        <SubSection title="Tiers (Niveles por Semestre Fiscal)">
          <P>El progreso se mide por <B>semestre fiscal australiano</B>: S1 (Jul–Dic) y S2 (Ene–Jun). Al final del semestre, tu tier se reevalúa.</P>
          <SimpleTable
            headers={["Tier", "Asistencia", "XP Semestral", "Color", "Tema"]}
            rows={[
              ["Starter", "< 50%", "0 XP", "Teal", "Por defecto"],
              ["Hustler", "50%+", "300 XP", "Azul Royal", "Tonos azules"],
              ["Pro", "75%+", "700 XP", "Violeta", "Tonos violetas"],
              ["Legend", "90%+", "1.500 XP", "Dorado", "Fondo oscuro + dorado"],
            ]}
          />
        </SubSection>

        <SubSection title="Defensa de Tier">
          <BulletList>
            <li>Al final del semestre: si no alcanzaste la meta de XP de tu tier actual, <B>bajás 1 tier</B></li>
            <li>Si superaste la meta del siguiente tier, <B>subís automáticamente</B></li>
            <li>Starter se mantiene siempre (no se pierde)</li>
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

      {/* ─── 13. GOOGLE CALENDAR ─── */}
      <SectionCard id="google-calendar" title="13. Google Calendar">
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
            <li>En la pantalla de <B>Jobs</B>, tocá el ícono de <B>Sync</B></li>
            <li>Un modal muestra los eventos encontrados. Ozly filtra usando palabras clave inteligentes (reconoce: shift, cleaning, bond clean, turno, trabalho, etc.)</li>
            <li>Seleccioná cuáles importar con checkboxes</li>
            <li>Tocá <B>"Review"</B> → configurá contractor, business y tarifa para cada item</li>
            <li>Tocá <B>"Import"</B></li>
          </StepList>
        </SubSection>

        <SubSection title="Desconectar">
          <P>Settings → <B>"Disconnect"</B> (botón rojo). Los jobs ya importados se mantienen.</P>
        </SubSection>
      </SectionCard>

      {/* ─── 14. PERFIL ─── */}
      <SectionCard id="perfil" title="14. Perfil">
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
            <li><B>Dirección</B> — Completa (calle, depto, suburb, state, postcode)</li>
            <li><B>Teléfono</B> — formato: +61 400 000 000</li>
            <li><B>Email</B> — solo lectura</li>
            <li><B>País de Origen</B> — para referencia</li>
            <li><B>Código de Referral</B> — generado automáticamente, compartible</li>
          </BulletList>
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

      {/* ─── 15. CONFIGURAÇÕES ─── */}
      <SectionCard id="settings" title="15. Configuración (Settings)">
        <P>Menú lateral → <B>"Settings"</B>.</P>

        <SubSection title="General">
          <BulletList>
            <li><B>Edit Profile</B> → va al Perfil</li>
            <li><B>Theme</B> — Personalized (cambia con el nivel Hustle), Light, Dark, System</li>
            <li><B>Juice (Efectos)</B> — Toggle on/off (vibraciones, animaciones, sonidos)</li>
            <li><B>Week Start Day</B> — Lunes a Domingo</li>
            <li><B>Invoice Messages</B> — Templates editables para envío y recordatorio. Placeholders: {"{name}"}, {"{number}"}, {"{amount}"}, {"{date}"}</li>
          </BulletList>
        </SubSection>

        <SubSection title="Idioma">
          <P>Português / English / Español</P>
        </SubSection>

        <SubSection title="Notificaciones">
          <P>Toggle individual para cada tipo de notificación:</P>
          <BulletList>
            <li><B>Morning Briefing</B> — Resumen diario a las 7h</li>
            <li><B>End of Shift</B> — Recordatorio post-job</li>
            <li><B>Expense Reminder</B> — Miércoles al mediodía</li>
            <li><B>Friday Sweeper</B> — Resumen semanal</li>
            <li><B>Weekly Summary</B> — Estadísticas los domingos</li>
          </BulletList>
        </SubSection>

        <SubSection title="Integraciones">
          <P>Google Calendar — mirá la sección 13.</P>
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

      {/* ─── 16. ASSINATURA PRO ─── */}
      <SectionCard id="assinatura-pro" title="16. Suscripción Pro">
        <P>Settings → <B>"Upgrade to Pro"</B> o tocá cualquier item que requiera Pro.</P>

        <SubSection title="Planes Disponibles">
          <SimpleTable
            headers={["Plan", "Precio", "Incluye"]}
            rows={[
              ["TFN ($9/mes)", "Para contractors individuales", "Shifts, Gastos OCR, Visa Shield, Calendar Sync, Impuestos, Contractors"],
              ["ABN ($15/mes)", "Para negocios con ABN", "Todo de TFN + Invoices PDF, Comparación de Horas, Múltiples Negocios"],
              ["MAX ($19/mes)", "TFN + ABN combinados", "Acceso completo a todos los recursos + alternar modo TFN ↔ ABN"],
            ]}
          />
          <BulletList>
            <li><B>14 días de trial gratis</B> en todos los planes</li>
            <li>Opciones: <B>Annual</B> (recomendado) y <B>Monthly</B></li>
            <li>Los precios pueden variar por región (administrados vía RevenueCat)</li>
          </BulletList>
        </SubSection>

        <SubSection title="Acciones">
          <SimpleTable
            headers={["Acción", "Qué hace"]}
            rows={[
              ["Subscribe", "Inicia compra nativa (App Store / Google Play)"],
              ["Restore Purchases", "Recupera suscripción anterior"],
              ["Terms / Privacy", "Abre enlaces"],
              ["X (cerrar)", "Vuelve sin suscribirse"],
            ]}
          />
        </SubSection>
      </SectionCard>

      {/* ─── 17. MODO OFFLINE ─── */}
      <SectionCard id="modo-offline" title="17. Modo Offline y Sincronización">
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

      {/* ─── 18. INDICAÇÃO ─── */}
      <SectionCard id="indicacao" title="18. Referencia (Referral)">
        <StepList>
          <li>En el Dashboard, encontrá el card verde <B>"Ganá 1 Mes Gratis"</B></li>
          <li>Tocá el card</li>
          <li>Se abre la bandeja de compartir con un mensaje preformateado</li>
          <li>Enviá por WhatsApp, SMS, Email, Telegram o cualquier app</li>
        </StepList>
        <InfoBox>El mensaje está en el idioma de la app (PT, EN o ES).</InfoBox>
      </SectionCard>

      {/* ─── 19. NOTIFICAÇÕES ─── */}
      <SectionCard id="notificacoes" title="19. Notificaciones Automáticas">
        <P>Ozly envía notificaciones inteligentes locales:</P>
        <SimpleTable
          headers={["Notificación", "Cuándo", "Qué muestra"]}
          rows={[
            ["Morning Briefing", "Todos los días a las 7:00", "Jobs del día + invoices vencidas"],
            ["End of Shift", "15min después de terminar el job", "Completá y facturá este job"],
            ["Expense Reminder", "Miércoles a las 12:00", "Registrá tus recibos de la semana"],
            ["Friday Sweeper", "Viernes a las 16:00", "Resumen de la semana"],
            ["Weekly Summary", "Domingos a las 18:00", "Estadísticas de la semana"],
          ]}
        />
        <P>Al tocar: navega a la pantalla correspondiente. Botones: "Complete", "Snooze 1h", "Mark Paid".</P>
      </SectionCard>

      {/* ─── 20. SEGURANÇA ─── */}
      <SectionCard id="seguranca" title="20. Seguridad y Privacidad">
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

      {/* ─── 21. CAMINHOS ALTERNATIVOS ─── */}
      <SectionCard id="caminhos-alternativos" title="21. Todos los Caminos Alternativos">
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

        <SubSection title="Crear Gasto (2 caminos)">
          <StepList>
            <li>Expenses → FAB "Add Expense"</li>
            <li>Dashboard → Deductible Expenses → "New Expense"</li>
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
        </SubSection>
      </SectionCard>

      {/* ─── 22. FAQ ─── */}
      <SectionCard id="faq" title="22. Preguntas Frecuentes (FAQ)">
        <SubSection title="Cuenta">
          <div className="space-y-2">
            <FaqItem q="¿Puedo usarlo sin ABN?" a="¡Sí! El ABN es opcional en el registro. Completalo cuando vayas a crear tu primera invoice." />
            <FaqItem q="¿Puedo tener varios ABNs?" a="¡Sí! Agregá todos los ABNs que quieras en tu Perfil. Usá el selector en el menú lateral para alternar entre ellos." />
            <FaqItem q="¿Puedo cambiar mi tipo de visa después?" a="Sí. Profile → Visa Type. Los cálculos fiscales y de Medicare se recalculan automáticamente." />
            <FaqItem q="Olvidé mi contraseña, ¿y ahora?" a='Pantalla de Login → "Forgot Password?" → ingresá el email → te llega un enlace de reset por email.' />
          </div>
        </SubSection>

        <SubSection title="Jobs">
          <div className="space-y-2">
            <FaqItem q="¿Y si trabajo sin invoice (pago en efectivo)?" a='Marcá "Skip Invoice" al crear el job. Cuenta en las horas (Visa Shield) pero no aparece en "To Invoice".' />
            <FaqItem q="¿Puedo adjuntar comprobante de pago?" a='Sí. En los detalles del job → "Add Receipt" → cámara o galería.' />
            <FaqItem q='¿Qué es el "Golden Hour"?' a="Si creás una invoice dentro de los 60 minutos después de completar un job, ganás 2x XP (100 en vez de 50)." />
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
            <FaqItem q="¿Cuál es la diferencia entre TFN, ABN y MAX?" a="TFN ($9/mes): para contractors individuales — shifts, gastos, impuestos, Visa Shield. ABN ($15/mes): todo de TFN + invoices PDF, múltiples negocios, comparación de horas. MAX ($19/mes): TFN + ABN combinados con cambio de modo." />
            <FaqItem q="¿El trial es gratis de verdad?" a="¡Sí! 14 días de acceso completo sin cobro. Cancelá en cualquier momento a través de la App Store o Google Play antes de que termine el trial." />
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
