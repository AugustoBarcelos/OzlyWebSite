/**
 * Ozly for Business — Org Portal user guide (English).
 * Maps every process in the portal (app.ozly.au) and what to do in each.
 * Helper components are injected by Guide.jsx (same set as the app guide).
 */
export default function BusinessGuideContentEn({ SectionCard, SubSection, StepList, BulletList, Tip, InfoBox, SimpleTable, P, B, FaqItem }) {
  return (
    <>
      {/* ─── 1. WHAT IT IS ─── */}
      <SectionCard id="overview" title="1. What Ozly for Business Is">
        <P>Ozly for Business is the <B>web portal at app.ozly.au</B> for cleaning companies and agencies. It gives you one place to receive the invoices the ABN holders you work with send you, see who you cover, mark invoices paid, and export them to your bank or accountant.</P>
        <InfoBox><B>The golden rule:</B> in Ozly, <B>you never create an invoice</B>. Each ABN holder issues their own invoice from the Ozly mobile app and sends it to your organisation. The portal is where you <B>receive, track and pay</B> — everyone stays independent under their own ABN.</InfoBox>
        <SubSection title="What you can do here">
          <BulletList>
            <li>Invite the ABN holders you work with into your workspace</li>
            <li>Cover their Ozly plan so they bill you for free (optional)</li>
            <li>Receive their invoices in your Inbox, with delivery status</li>
            <li>Mark invoices paid and export to ABA (bank) or Xero/MYOB</li>
            <li>See dashboards, reports and an activity log</li>
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
            <li>Name your organisation (your company/trading name) and confirm your <B>ABN</B>.</li>
          </StepList>
        </SubSection>
        <SubSection title="Onboarding">
          <P>The first time you land, a short <B>onboarding</B> walks you through the essentials: your billing email (where invoices are sent), inviting your first ABN holder, and your billing plan. You can skip and do any of it later from the menu.</P>
          <Tip>Set your <B>billing email</B> early (Settings) — it&rsquo;s the inbox the ABN holders&rsquo; invoices are emailed to, so it must be one you check.</Tip>
        </SubSection>
      </SectionCard>

      {/* ─── 3. DASHBOARD ─── */}
      <SectionCard id="dashboard" title="3. Dashboard">
        <P>Your home screen. It summarises money in and out for the selected period.</P>
        <SimpleTable
          headers={["Card", "Shows"]}
          rows={[
            ["Invoices received", "How many invoices ABN holders sent you, and the total"],
            ["Paid / Overdue", "What you&rsquo;ve marked paid vs what&rsquo;s still owing"],
            ["Who&rsquo;s billed", "The most-overdue ABN holders, so you know who to pay next"],
            ["Trend & status", "A line chart over time + a paid/pending/overdue donut"],
          ]}
        />
        <Tip>Use the <B>period filter</B> (top of the dashboard) to switch between this week, fortnight, month or a custom range.</Tip>
      </SectionCard>

      {/* ─── 4. MEMBERS ─── */}
      <SectionCard id="members" title="4. Members — Invite ABN Holders">
        <P>&ldquo;Members&rdquo; are the independent ABN holders you&rsquo;ve invited into your workspace. Inviting someone lets the invoices they issue <B>to you</B> land in your portal.</P>
        <SubSection title="Invite someone">
          <StepList>
            <li>Side menu → <B>Members</B> → <B>Invite member</B>.</li>
            <li>Enter their name + mobile or email. Ozly sends them an <B>invite link</B>.</li>
            <li>They tap it in the Ozly app and accept — they appear as <B>Active</B>.</li>
          </StepList>
        </SubSection>
        <SubSection title="Member statuses & compliance">
          <SimpleTable
            headers={["Badge", "Meaning"]}
            rows={[
              ["Active", "Accepted — their invoices to you appear in your Inbox"],
              ["Pending", "Invited, not accepted yet"],
              ["Declined", "They declined the invite"],
              ["ABN / Insurance", "Compliance badges — shows if they&rsquo;ve provided a valid ABN and insurance on file"],
            ]}
          />
          <P>You can <B>suspend / reactivate</B> a member, and remove someone who no longer works with you.</P>
        </SubSection>
        <InfoBox>Inviting a member does <B>not</B> create an employment relationship and does <B>not</B> automatically cover their plan — covering is a separate, optional step (next section).</InfoBox>
      </SectionCard>

      {/* ─── 5. COVER / SPONSORSHIP ─── */}
      <SectionCard id="cover" title="5. Cover an ABN Holder&rsquo;s Plan (optional)">
        <P>This is the differentiator. If you subscribe (next section), you can <B>cover</B> an ABN holder&rsquo;s Ozly ABN access — they then bill <B>your company</B> for free, with nothing to pay themselves.</P>
        <SubSection title="How it works">
          <StepList>
            <li>You hold a paid subscription with enough seats.</li>
            <li>On a member&rsquo;s card, turn on <B>Cover this person</B>.</li>
            <li>They get a push: <B>&ldquo;[Your company] now covers your ABN — you don&rsquo;t need to pay.&rdquo;</B></li>
            <li>Their Ozly invoicing is set to your organisation while you cover them.</li>
          </StepList>
        </SubSection>
        <SubSection title="Important rules">
          <BulletList>
            <li><B>One sponsor per person.</B> If someone is already covered by another company, you&rsquo;ll see &ldquo;Already covered by [Company]&rdquo; — only one org covers a person at a time.</li>
            <li><B>They can still bill others.</B> A covered ABN holder can add a <B>$5/month personal top-up</B> in the app to also invoice clients outside your org.</li>
            <li><B>7-day grace on cancel.</B> If you stop covering (or cancel your plan), they get a 7-day window + a heads-up to keep access by paying themselves.</li>
          </BulletList>
        </SubSection>
        <Tip>Cover is per-seat: the number of people you cover should match your plan&rsquo;s seat count. Ozly auto-adjusts your tier as your seat count crosses a band (see Billing).</Tip>
      </SectionCard>

      {/* ─── 6. INBOX ─── */}
      <SectionCard id="inbox" title="6. Inbox — Invoices You Receive">
        <P>Every invoice an ABN holder sends to your org lands here first.</P>
        <SubSection title="How an invoice arrives">
          <P>The ABN holder, in the Ozly app, creates an invoice, picks your company as the bill-to, toggles <B>&ldquo;Send to org&rdquo;</B> and sends. It hits your Inbox instantly, you get an email at your billing address, and admins get a push.</P>
        </SubSection>
        <SubSection title="Delivery status">
          <P>Open <B>Inbox → Deliveries</B> to see whether each send reached your billing inbox:</P>
          <SimpleTable
            headers={["Status", "Meaning"]}
            rows={[
              ["Delivered", "The email reached your billing inbox"],
              ["Queued", "Sending — check back shortly"],
              ["Bounced", "Wrong/blocked inbox — fix your billing email in Settings"],
              ["Failed", "Send failed — the ABN holder can retry from their app"],
            ]}
          />
        </SubSection>
        <Tip>New invoices show as <B>New</B> until you open them, then <B>Seen</B> — so nothing slips through.</Tip>
      </SectionCard>

      {/* ─── 7. INVOICES ─── */}
      <SectionCard id="invoices" title="7. Invoices — Track, Pay & Export">
        <P>The full list of everything received, with filters and bulk actions.</P>
        <SubSection title="Find & filter">
          <BulletList>
            <li>Filter by <B>member</B>, <B>status</B> (paid / pending / overdue) and <B>period</B>.</li>
            <li>Search by amount, number or description.</li>
          </BulletList>
        </SubSection>
        <SubSection title="Mark paid">
          <StepList>
            <li>Open an invoice (or bulk-select several).</li>
            <li>Tap <B>Mark paid</B> once you&rsquo;ve actually paid it.</li>
            <li>The ABN holder gets a push: <B>&ldquo;[Company] marked invoice #… paid.&rdquo;</B> — keeping both your records in sync.</li>
          </StepList>
        </SubSection>
        <SubSection title="Export to pay / for your accountant">
          <BulletList>
            <li><B>ABA file</B> — bulk-select invoices → export a bank batch (ABA) you upload to your bank to pay everyone at once.</li>
            <li><B>Xero / MYOB CSV</B> — export for your accounting software.</li>
          </BulletList>
          <InfoBox>You never issue the invoice — editing is minimal and audit-logged. The ABN holder is the legal issuer; &ldquo;mark paid&rdquo; is your record of payment.</InfoBox>
        </SubSection>
      </SectionCard>

      {/* ─── 8. WORK ─── */}
      <SectionCard id="work" title="8. Work — Job History">
        <P>A read-only history of the jobs the ABN holders created in the app that relate to your organisation. Useful to cross-check what was done against what was invoiced. (Some plans let you offer work to members — when enabled, it also shows here.)</P>
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
            <li><B>Seats auto-scale</B> — as you cover more/fewer people, Ozly moves you to the matching tier automatically.</li>
            <li><B>Downgrade / cancel</B> — uses an in-app flow (with a reason); covered ABN holders get the 7-day grace.</li>
          </StepList>
        </SubSection>
        <Tip>The seat-count banner flags any drift between seats you pay for and people you cover — keep them aligned to avoid surprises.</Tip>
      </SectionCard>

      {/* ─── 10. INTEGRATIONS ─── */}
      <SectionCard id="integrations" title="10. Integrations">
        <P>Settings → <B>Integrations</B>. Connect Ozly to the tools you already use.</P>
        <SimpleTable
          headers={["Integration", "What it does", "Status"]}
          rows={[
            ["Stripe", "Card billing for your subscription", "Live"],
            ["Xero / MYOB", "Push received invoices to accounting", "Export (CSV) today; live sync coming"],
            ["Job sources (ServiceM8, Tradify…)", "Pull jobs from your scheduling tool", "Coming soon"],
          ]}
        />
        <Tip>If an integration shows &ldquo;Coming soon&rdquo;, use the CSV/ABA export in the meantime — it covers the same need.</Tip>
      </SectionCard>

      {/* ─── 11. REPORTS & ACTIVITY ─── */}
      <SectionCard id="reports" title="11. Reports & Activity">
        <SubSection title="Reports">
          <P>Side menu → <B>Reports</B>. Totals and breakdowns over a period — billed vs paid, by member, for reconciliation and tax time.</P>
        </SubSection>
        <SubSection title="Activity log">
          <P>Side menu → <B>Activity</B>. An audit timeline of what happened in your workspace (invites, covers, payments, edits) — useful for accountability and disputes.</P>
        </SubSection>
      </SectionCard>

      {/* ─── 12. SETTINGS ─── */}
      <SectionCard id="settings" title="12. Settings">
        <BulletList>
          <li><B>Organisation profile</B> — name, ABN, logo.</li>
          <li><B>Billing email</B> — where ABN holders&rsquo; invoices are delivered (keep it current — bounces happen if it&rsquo;s wrong).</li>
          <li><B>Notification preferences</B> — what you get emailed/pushed about.</li>
          <li><B>Theme</B> — light/dark.</li>
        </BulletList>
        <Tip>Tip: the whole portal has a <B>⌘K command palette</B> — press it to jump to any screen or action fast.</Tip>
      </SectionCard>

      {/* ─── 13. FAQ ─── */}
      <SectionCard id="faq" title="13. Frequently Asked Questions">
        <div className="space-y-2">
          <FaqItem q="Do I create invoices in the portal?" a="No. Each ABN holder issues their own invoice in the Ozly app and sends it to you — you receive, track and pay. They are the legal issuer; you stay a record-keeper, not an employer." />
          <FaqItem q="Does covering someone make them my employee?" a="No. Covering only pays for their Ozly ABN access. They remain independent under their own ABN. Your Fair Work, super, payroll-tax and workers&rsquo;-comp obligations are unchanged — Ozly helps you document, not avoid, them." />
          <FaqItem q="Someone is &lsquo;already covered by another company&rsquo; — why?" a="Only one organisation can cover a person&rsquo;s Ozly access at a time (single-sponsor). They can switch sponsors from the app; the previous org keeps a 7-day grace." />
          <FaqItem q="What happens to covered people if I cancel?" a="They get a 7-day grace window plus a notification, so they can keep access by subscribing themselves before it lapses." />
          <FaqItem q="How do I actually pay everyone?" a="Mark invoices paid as you pay them, or bulk-select and export an ABA file to upload to your bank to pay the batch at once." />
          <FaqItem q="An invoice shows &lsquo;Bounced&rsquo; in Deliveries." a="Your billing email is wrong or blocked. Fix it in Settings, then the ABN holder can re-send from their app." />
          <FaqItem q="Is there a free trial?" a="Yes — 14 days for new organisations. After that your plan auto-renews unless you cancel before it ends." />
        </div>
      </SectionCard>
    </>
  );
}
