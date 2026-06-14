/**
 * Ozly for Business — Org Portal user guide (English).
 * Maps every process in the portal (app.ozly.au) and what to do in each.
 * Content verified against org-portal/src (routes/components) — only documents
 * what actually ships today. Helper components are injected by Guide.jsx.
 */
export default function BusinessGuideContentEn({ SectionCard, SubSection, StepList, BulletList, Tip, InfoBox, SimpleTable, P, B, FaqItem }) {
  return (
    <>
      {/* ─── 1. WHAT IT IS ─── */}
      <SectionCard id="overview" title="1. What Ozly for Business Is">
        <P>Ozly for Business is the <B>web portal at app.ozly.au</B> for cleaning companies and agencies. It gives you one place to receive the invoices the ABN holders you work with send you, see who you cover, mark invoices paid, and export them to your bank or your accountant.</P>
        <InfoBox><B>The golden rule:</B> in Ozly, <B>you never create an invoice</B>. Each ABN holder issues their own invoice from the Ozly mobile app and sends it to your organisation. The portal is where you <B>receive, track and pay</B> — everyone stays independent under their own ABN.</InfoBox>
        <SubSection title="What you can do here">
          <BulletList>
            <li>Invite the ABN holders you work with into your workspace</li>
            <li>Cover their Ozly plan so they bill you for free (optional)</li>
            <li>Receive their invoices in your Inbox, with delivery status</li>
            <li>Mark invoices paid and export to Xero, CSV or an ABA bank file</li>
            <li>See a dashboard, BAS/P&amp;L reports and an activity log</li>
          </BulletList>
        </SubSection>
        <Tip>The portal is desktop-first (made for an owner/admin at a computer). The ABN holders never need the portal — they live in the mobile app.</Tip>
      </SectionCard>

      {/* ─── 2. CREATE WORKSPACE ─── */}
      <SectionCard id="workspace" title="2. Create Your Workspace">
        <SubSection title="Sign up">
          <StepList>
            <li>Go to <B>app.ozly.au</B> → <B>Sign up</B>.</li>
            <li>Enter your work email — we send a <B>magic link</B> (no password to remember). Open it to log in.</li>
            <li>Name your organisation and add your <B>ABN</B>.</li>
          </StepList>
        </SubSection>
        <SubSection title="Onboarding & your Inbox email">
          <P>After sign-up you get a short onboarding and a printable onboarding guide (handy to share with your team). The one setting to do early is your <B>Inbox email</B> in Settings — that&rsquo;s the address the ABN holders&rsquo; invoices are emailed to, so it must be one you check.</P>
          <Tip>Press <B>⌘K</B> (Ctrl+K) anywhere in the portal for a search/command palette — the fastest way to jump to any screen or invoice.</Tip>
        </SubSection>
      </SectionCard>

      {/* ─── 3. DASHBOARD ─── */}
      <SectionCard id="dashboard" title="3. Dashboard">
        <P>Your home screen. It summarises money in and out for the selected period.</P>
        <SimpleTable
          headers={["Card", "Shows"]}
          rows={[
            ["Outstanding", "Total still owed to the ABN holders (unpaid)"],
            ["Overdue", "Of that, what&rsquo;s past due"],
            ["Paid (this period)", "What you&rsquo;ve marked paid in the range"],
            ["Active members", "ABN holders currently in your workspace"],
          ]}
        />
        <P>Below the cards you get a <B>revenue trend</B> chart over time and a <B>status donut</B> (paid / sent / overdue / draft). Use the <B>period filter</B> at the top to change the range.</P>
      </SectionCard>

      {/* ─── 4. MEMBERS ─── */}
      <SectionCard id="members" title="4. Members — Invite ABN Holders">
        <P>&ldquo;Members&rdquo; are the independent ABN holders you&rsquo;ve invited into your workspace. Inviting someone lets the invoices they issue <B>to you</B> land in your portal.</P>
        <SubSection title="Invite someone">
          <StepList>
            <li>Side menu → <B>Members</B> → <B>Invite member</B>.</li>
            <li>Enter their email or mobile. Ozly sends them an <B>invite</B>.</li>
            <li>They accept <B>in the Ozly app</B> — then their invoices to you show up automatically and they count as an <B>Active member</B>.</li>
          </StepList>
          <P>Two KPI cards at the top show <B>Active members</B> and <B>Pending invites</B>. A pending card warns you if the invite couldn&rsquo;t be delivered, so you can resend.</P>
        </SubSection>
        <SubSection title="How each member is billed">
          <P>Each member card carries a small <B>billing badge</B> showing how their Ozly access is paid for:</P>
          <SimpleTable
            headers={["Badge", "Meaning"]}
            rows={[
              ["Company-covered", "You pay for their ABN access (see next section)"],
              ["➕ ABN top-up", "You cover them and they added a $5/mo top-up to also bill others"],
              ["Self-paid", "They pay their own Ozly plan"],
              ["Needs ABN cover", "Not covered and not paying — they can&rsquo;t issue ABN invoices yet"],
            ]}
          />
        </SubSection>
      </SectionCard>

      {/* ─── 5. COVER / SPONSORSHIP ─── */}
      <SectionCard id="cover" title="5. Cover an ABN Holder&rsquo;s Plan (optional)">
        <P>The differentiator: once you subscribe (see Billing), you can <B>cover</B> an ABN holder&rsquo;s Ozly ABN access — they then bill <B>your company</B> for free, with nothing to pay themselves.</P>
        <SubSection title="How it works">
          <StepList>
            <li>You hold a paid subscription with enough seats.</li>
            <li>On a member&rsquo;s card, switch on <B>Cover this member</B>. The badge flips to <B>Company-covered</B>.</li>
            <li>Switch it off any time with <B>Stop covering</B> — the seat frees up.</li>
          </StepList>
        </SubSection>
        <InfoBox>A covered ABN holder can add a <B>$5/month top-up</B> in the app (you&rsquo;ll see the <B>➕ ABN top-up</B> badge) so they can also invoice clients outside your organisation, while you still cover the base ABN access.</InfoBox>
        <Tip>Your plan tier is driven by how many people you cover — Ozly moves you up/down a tier automatically as that count crosses a band (see Billing).</Tip>
      </SectionCard>

      {/* ─── 6. INBOX ─── */}
      <SectionCard id="inbox" title="6. Inbox — Invoices You Receive">
        <P>Every invoice an ABN holder sends to your org lands here, newest first.</P>
        <SubSection title="How an invoice arrives">
          <P>The ABN holder, in the Ozly app, creates an invoice, picks your company and sends it to your org. It appears in your Inbox and is emailed to your Inbox address.</P>
        </SubSection>
        <SubSection title="Delivery status">
          <P>Each row shows whether the email reached your Inbox address. Filter by status:</P>
          <SimpleTable
            headers={["Status", "Meaning"]}
            rows={[
              ["Delivered", "The email reached your Inbox address"],
              ["Sending", "In progress — check back shortly"],
              ["Not delivered", "Bounced — fix your Inbox email in Settings"],
              ["Failed", "Send failed — the ABN holder can resend from their app"],
            ]}
          />
          <P>You can search, filter by date, and <B>export the inbox list to CSV</B>.</P>
        </SubSection>
      </SectionCard>

      {/* ─── 7. INVOICES ─── */}
      <SectionCard id="invoices" title="7. Invoices — Track, Pay & Export">
        <P>The full list of everything received, with filters and bulk actions.</P>
        <SubSection title="Find & mark paid">
          <StepList>
            <li>Filter by <B>member</B>, <B>status</B> (paid / sent / overdue) and <B>period</B>; search by amount, number or text.</li>
            <li>Open an invoice and tap <B>Mark paid</B> once you&rsquo;ve paid it — the ABN holder is notified, keeping both records in sync.</li>
          </StepList>
        </SubSection>
        <SubSection title="Export (the Export ▾ menu)">
          <SimpleTable
            headers={["Export", "What it&rsquo;s for", "How"]}
            rows={[
              ["For Xero", "Import as Bills in Xero", "Export ▾ → For Xero (respects your active filters)"],
              ["As CSV", "Open in a spreadsheet", "Export ▾ → As CSV"],
              ["ABA bank file", "Pay your members in one bank batch", "Select rows → pick unpaid invoices → Generate ABA file → upload to your bank"],
            ]}
          />
          <InfoBox>You never issue the invoice — the ABN holder is the legal issuer. &ldquo;Mark paid&rdquo; and the exports are your records and your way to pay.</InfoBox>
        </SubSection>
      </SectionCard>

      {/* ─── 8. WORK ─── */}
      <SectionCard id="work" title="8. Work — Jobs from Your Members">
        <P>A read-mostly view of the jobs the ABN holders created in the app that relate to your organisation. Each row shows the job, who issued it, dates, location and value. KPIs at the top total the <B>value, hours, job count and completed</B> for the period — handy to cross-check work done against what was invoiced. If a job has a proposed change, its status reflects that.</P>
      </SectionCard>

      {/* ─── 9. BILLING ─── */}
      <SectionCard id="billing" title="9. Billing — Plans & Seats">
        <P>Your subscription to Ozly (you → Ozly), separate from anything the ABN holders pay. Tiers scale by how many seats (people you cover) you have:</P>
        <SimpleTable
          headers={["Tier", "Seats", "Per seat / mo*"]}
          rows={[
            ["Crew", "1–5", "$14.99"],
            ["Squad", "6–15", "$12.99"],
            ["Fleet", "16–30", "$9.99"],
            ["Operation", "31–100", "$7.99"],
            ["Custom", "101+", "Talk to us"],
          ]}
        />
        <P>* Indicative monthly. <B>Annual ≈ 2 months free.</B> A <B>14-day free trial</B> is available to new orgs.</P>
        <SubSection title="What to do here">
          <StepList>
            <li><B>Add payment / start trial</B> — opens Stripe Checkout (card via Stripe).</li>
            <li><B>Manage subscription</B> — opens the Stripe Customer Portal (update card, tax IDs, see invoices).</li>
            <li><B>Seats auto-scale</B> — as you cover more/fewer people, Ozly moves you to the matching tier.</li>
            <li><B>Downgrade</B> — uses an in-app flow (it asks for a reason and confirms the change).</li>
          </StepList>
        </SubSection>
      </SectionCard>

      {/* ─── 10. INTEGRATIONS ─── */}
      <SectionCard id="integrations" title="10. Integrations">
        <P>Settings → <B>Integrations</B>. Today Ozly keeps this deliberately small — only shipped, working connections appear:</P>
        <BulletList>
          <li><B>CSV upload</B> — bring data in via a spreadsheet.</li>
          <li><B>Calendar sync</B> — lives in <B>Settings</B> (its own section), to sync jobs with your calendar.</li>
        </BulletList>
        <InfoBox>There are <B>no accounting or job-source integrations</B> (Xero/MYOB/ServiceM8) to connect here yet — they were removed rather than shown as empty &ldquo;coming soon&rdquo; cards. To get data into Xero today, use the <B>Export → For Xero</B> on the Invoices screen (section 7).</InfoBox>
      </SectionCard>

      {/* ─── 11. REPORTS ─── */}
      <SectionCard id="reports" title="11. Reports">
        <P>Side menu → <B>Reports</B>. Numbers for reconciliation and tax time.</P>
        <BulletList>
          <li><B>BAS — quarterly</B> — Australian fiscal year (Jul→Jun); the columns map directly to the ATO portal fields. Exports to CSV.</li>
          <li><B>Money in &amp; out (P&amp;L)</B> — a profit-and-loss summary; default range is the current fiscal year, adjustable to drill down.</li>
          <li><B>Exports &amp; integrations</B> — a quick guide to the Xero / CSV / ABA exports (which live on the Invoices screen).</li>
        </BulletList>
      </SectionCard>

      {/* ─── 12. SETTINGS ─── */}
      <SectionCard id="settings" title="12. Settings">
        <BulletList>
          <li><B>Organisation</B> — name, ABN, default hourly rate and billing period.</li>
          <li><B>Inbox email</B> — where ABN holders&rsquo; invoices are delivered (keep it current — wrong/blocked addresses show as &ldquo;Not delivered&rdquo; in the Inbox).</li>
          <li><B>Notifications</B> — choose what you get emailed / pushed about.</li>
          <li><B>Calendar feeds</B> — connect a calendar to sync jobs.</li>
        </BulletList>
        <Tip>Remember <B>⌘K</B> — the command palette searches your invoices and jumps to any screen or action instantly.</Tip>
      </SectionCard>

      {/* ─── 13. FAQ ─── */}
      <SectionCard id="faq" title="13. Frequently Asked Questions">
        <div className="space-y-2">
          <FaqItem q="Do I create invoices in the portal?" a="No. Each ABN holder issues their own invoice in the Ozly app and sends it to you — you receive, track and pay. They are the legal issuer; you stay a record-keeper, not an employer." />
          <FaqItem q="Does covering someone make them my employee?" a="No. Covering only pays for their Ozly ABN access. They remain independent under their own ABN. Your Fair Work, super, payroll-tax and workers&rsquo;-comp obligations are unchanged — Ozly helps you document, not avoid, them." />
          <FaqItem q="How do I get invoices into my accounting software?" a="On the Invoices screen, use Export ▾ → For Xero (imports as Bills in Xero) or As CSV for a spreadsheet. There is no MYOB export yet — use CSV for other software." />
          <FaqItem q="How do I actually pay everyone?" a="Mark invoices paid as you pay them, or Select rows on the Invoices screen, pick the unpaid ones, Generate an ABA file, and upload it to your bank to pay the batch at once." />
          <FaqItem q="An invoice shows &lsquo;Not delivered&rsquo; in the Inbox." a="The email bounced — your Inbox email is wrong or blocked. Fix it in Settings, then the ABN holder can resend from their app." />
          <FaqItem q="Is there a free trial?" a="Yes — 14 days for new organisations. After that your plan auto-renews unless you cancel before it ends, and your tier follows how many people you cover." />
          <FaqItem q="Can I connect ServiceM8 / Xero / MYOB?" a="Not as live integrations yet. Today the portal ships CSV upload and calendar sync; for Xero, use the Export → For Xero on Invoices. We&rsquo;d rather ship working exports than empty &lsquo;coming soon&rsquo; buttons." />
        </div>
      </SectionCard>
    </>
  );
}
