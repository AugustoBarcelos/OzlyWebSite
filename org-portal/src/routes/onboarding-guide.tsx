// /print/onboarding — print-ready onboarding guide for a new org admin.
// The page renders as a 6-page A4 brochure: cover → flow → 4-step setup →
// portal tour → mobile sub view → FAQ. A "Save as PDF" button at the top
// (hidden in print) triggers the browser's print dialog so the admin gets
// a clean PDF to share with their team.
//
// Mock "screens" are stylized HTML — not real screenshots. Keeps the bundle
// light and the guide editable without needing image pipelines.

import { useOrg } from '@/lib/org';

// ─── Print styles ──────────────────────────────────────────────────────────
// Scoped to this page only via the `.onboarding-print` wrapper so we don't
// affect the rest of the app. Each `.page` becomes one A4 sheet.
const PRINT_CSS = `
.onboarding-print {
  --ink: #14242f;
  --ink-soft: #607387;
  --ink-mute: #9fb0bf;
  --brand: #2bbb97;
  --brand-dark: #1d8a6e;
  --lime: #9dd760;
  --sand: #c9a43c;
  --rose: #e11d48;
  --paper: #ffffff;
  --paper-warm: #fbfaf3;
  --hairline: rgba(20, 36, 47, 0.08);
  --hairline-strong: rgba(20, 36, 47, 0.18);
  background: #eef1f4;
  color: var(--ink);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  font-feature-settings: 'cv11', 'ss01', 'tnum';
  min-height: 100vh;
  padding: 24px 12px 80px;
}
.onboarding-print .page {
  width: 210mm;
  min-height: 297mm;
  margin: 0 auto 16px;
  background: var(--paper);
  border-radius: 6px;
  box-shadow: 0 12px 36px -16px rgba(20, 36, 47, 0.25);
  padding: 22mm 20mm;
  position: relative;
  break-after: page;
  page-break-after: always;
}
.onboarding-print .page:last-child {
  break-after: auto;
  page-break-after: auto;
}
.onboarding-print h1, .onboarding-print h2, .onboarding-print h3 {
  font-family: 'Montserrat', 'Inter', sans-serif;
  letter-spacing: -0.018em;
  color: var(--ink);
  margin: 0;
}
.onboarding-print h1 { font-size: 38px; font-weight: 800; line-height: 1.05; }
.onboarding-print h2 { font-size: 22px; font-weight: 800; line-height: 1.15; }
.onboarding-print h3 { font-size: 14.5px; font-weight: 700; line-height: 1.25; }
.onboarding-print .kicker {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--brand-dark);
}
.onboarding-print .body { font-size: 12.5px; line-height: 1.55; color: var(--ink-soft); }
.onboarding-print .tiny { font-size: 10px; color: var(--ink-mute); }
.onboarding-print .meta { font-size: 9px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-mute); }

/* Mockup helpers — they render mini versions of real screens */
.onboarding-print .mockup {
  border: 1px solid var(--hairline);
  border-radius: 10px;
  background: var(--paper);
  overflow: hidden;
}
.onboarding-print .mockup-bar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 8px;
  background: linear-gradient(180deg, var(--paper-warm) 0%, var(--paper) 100%);
  border-bottom: 1px solid var(--hairline);
}
.onboarding-print .mockup-bar .dot { width: 6px; height: 6px; border-radius: 999px; background: rgba(20, 36, 47, 0.15); }
.onboarding-print .mockup-body { padding: 10px 12px; }

.onboarding-print .pill {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 8px; font-size: 9.5px; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase;
  border-radius: 999px;
}
.onboarding-print .pill-brand { background: rgba(43, 187, 151, 0.14); color: var(--brand-dark); }
.onboarding-print .pill-rose  { background: rgba(225, 29, 72, 0.12); color: var(--rose); }
.onboarding-print .pill-lime  { background: rgba(157, 215, 96, 0.18); color: #4a6e1f; }
.onboarding-print .pill-sand  { background: rgba(201, 164, 60, 0.16); color: #8a6f1d; }

.onboarding-print .toolbar { display: flex; gap: 12px; justify-content: center; margin-bottom: 18px; }
.onboarding-print .btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 10px 18px; border-radius: 10px; font-weight: 700; font-size: 13px;
  cursor: pointer; border: none;
}
.onboarding-print .btn-primary {
  background: linear-gradient(180deg, var(--brand) 0%, var(--brand-dark) 100%);
  color: #fff;
  box-shadow: 0 4px 12px -4px rgba(43, 187, 151, 0.4);
}
.onboarding-print .btn-secondary {
  background: #fff; color: var(--ink); border: 1px solid var(--hairline-strong);
}

/* Cover wordmark + accent shapes */
.onboarding-print .wordmark-large {
  display: inline-flex; align-items: center; gap: 12px;
}
.onboarding-print .wordmark-mark-lg {
  width: 56px; height: 56px; border-radius: 16px;
  background: linear-gradient(135deg, var(--brand) 0%, var(--lime) 100%);
  display: flex; align-items: center; justify-content: center;
  font-family: 'Montserrat', sans-serif; font-weight: 800; font-size: 26px; color: #fff;
  box-shadow: 0 8px 20px -6px rgba(43, 187, 151, 0.5);
}
.onboarding-print .step-number {
  width: 32px; height: 32px; border-radius: 999px;
  background: linear-gradient(135deg, var(--brand) 0%, var(--lime) 100%);
  color: #fff; font-family: 'Montserrat', sans-serif; font-weight: 800; font-size: 14px;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 10px -4px rgba(43, 187, 151, 0.45);
}

/* Flow diagram arrows */
.onboarding-print .arrow-down {
  width: 2px; height: 22px; background: var(--brand);
  margin: 4px auto; position: relative;
}
.onboarding-print .arrow-down::after {
  content: ''; position: absolute; bottom: -1px; left: -4px;
  border: 5px solid transparent; border-top-color: var(--brand);
}

/* Phone mockup — fixed proportion */
.onboarding-print .phone {
  width: 130px;
  border: 6px solid #0e1a23;
  border-radius: 22px;
  background: #fff;
  overflow: hidden;
  box-shadow: 0 10px 24px -10px rgba(14, 26, 35, 0.3);
}
.onboarding-print .phone-notch {
  height: 14px;
  background: #0e1a23;
  position: relative;
}
.onboarding-print .phone-notch::after {
  content: ''; position: absolute; left: 50%; top: 4px;
  width: 36px; height: 6px; background: #000;
  border-radius: 999px; transform: translateX(-50%);
}
.onboarding-print .phone-screen { padding: 8px; font-size: 9px; line-height: 1.35; }

@media print {
  @page { size: A4; margin: 0; }
  html, body { background: #fff !important; }
  .onboarding-print { padding: 0; background: #fff; }
  .onboarding-print .page {
    box-shadow: none;
    margin: 0;
    border-radius: 0;
    page-break-after: always;
  }
  .onboarding-print .no-print { display: none !important; }
}
`;

// ─── Small reusable mockups ─────────────────────────────────────────────────
function MiniDashboard() {
  return (
    <div className="mockup" style={{ fontSize: 9 }}>
      <div className="mockup-bar">
        <span className="dot" /><span className="dot" /><span className="dot" />
        <span style={{ marginLeft: 8, fontSize: 9, color: 'var(--ink-mute)' }}>portal.ozly.au/dashboard</span>
      </div>
      <div className="mockup-body" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f4faf7 100%)' }}>
        <div className="kicker" style={{ fontSize: 7 }}>Dashboard</div>
        <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 13, marginTop: 2 }}>Good morning, Augusto</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 4, marginTop: 8 }}>
          {[
            { l: 'Outstanding', v: '$12,430', t: 'rgba(96,115,135,0.10)' },
            { l: 'Overdue',     v: '$1,820',  t: 'rgba(225,29,72,0.10)' },
            { l: 'Paid',        v: '$4,650',  t: 'rgba(43,187,151,0.10)' },
            { l: 'Subs',        v: '23',      t: 'rgba(157,215,96,0.18)' },
          ].map((k) => (
            <div key={k.l} style={{ padding: 5, background: k.t, borderRadius: 4 }}>
              <div style={{ fontSize: 6, color: 'var(--ink-mute)', textTransform: 'uppercase', fontWeight: 700 }}>{k.l}</div>
              <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 10, marginTop: 1 }}>{k.v}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginTop: 6 }}>
          <div style={{ padding: 6, background: '#fff', border: '1px solid var(--hairline)', borderRadius: 4, height: 36 }}>
            <div style={{ fontSize: 7, fontWeight: 700 }}>Revenue 30d</div>
            <svg viewBox="0 0 60 18" width="100%" height={20} style={{ marginTop: 2 }}>
              <path d="M0,14 C8,10 12,12 18,7 S30,12 36,5 S48,14 60,8" fill="none" stroke="var(--brand)" strokeWidth="1.4" />
            </svg>
          </div>
          <div style={{ padding: 6, background: '#fff', border: '1px solid var(--hairline)', borderRadius: 4, height: 36, display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ position: 'relative', width: 22, height: 22, borderRadius: 999, background: 'conic-gradient(var(--brand) 0% 65%, var(--lime) 65% 85%, var(--rose) 85% 95%, var(--ink-mute) 95% 100%)' }}>
              <div style={{ position: 'absolute', inset: 5, background: '#fff', borderRadius: 999 }} />
            </div>
            <div>
              <div style={{ fontSize: 7, fontWeight: 700 }}>Invoice status</div>
              <div style={{ fontSize: 6, color: 'var(--ink-mute)' }}>Paid 65%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniIntegrations() {
  return (
    <div className="mockup">
      <div className="mockup-bar">
        <span className="dot" /><span className="dot" /><span className="dot" />
        <span style={{ marginLeft: 8, fontSize: 9, color: 'var(--ink-mute)' }}>portal.ozly.au/settings/integrations</span>
      </div>
      <div className="mockup-body">
        <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 13 }}>Integrations</div>
        <div style={{ fontSize: 10, color: 'var(--ink-mute)', marginTop: 2 }}>Job sources · Pull scheduled work in</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginTop: 8 }}>
          {[
            { m: 'S8', n: 'ServiceM8',     tone: '#ff6c00', toneEnd: '#c44d00', state: 'Connected' },
            { m: 'T',  n: 'Tradify',       tone: '#1e88e5', toneEnd: '#1565c0', state: 'Available' },
            { m: 'G',  n: 'Google Cal',    tone: '#4285f4', toneEnd: '#1a73e8', state: 'Available' },
          ].map((i) => (
            <div key={i.m} style={{ padding: 6, border: '1px solid var(--hairline)', borderRadius: 6, background: '#fff' }}>
              <div style={{
                width: 22, height: 22, borderRadius: 6, color: '#fff',
                background: `linear-gradient(135deg, ${i.tone}, ${i.toneEnd})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Montserrat', fontWeight: 800, fontSize: 10,
              }}>{i.m}</div>
              <div style={{ fontSize: 9, fontWeight: 700, marginTop: 4 }}>{i.n}</div>
              <div style={{
                fontSize: 7, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                color: i.state === 'Connected' ? 'var(--brand-dark)' : 'var(--ink-mute)',
                marginTop: 2,
              }}>{i.state}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniMembers() {
  return (
    <div className="mockup">
      <div className="mockup-bar">
        <span className="dot" /><span className="dot" /><span className="dot" />
        <span style={{ marginLeft: 8, fontSize: 9, color: 'var(--ink-mute)' }}>portal.ozly.au/members</span>
      </div>
      <div className="mockup-body">
        <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 13 }}>Members</div>
        <div style={{ fontSize: 10, color: 'var(--ink-mute)', marginTop: 2 }}>3 of 5 seats</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
          {[
            { n: 'Maria Santos',  init: 'MS', tone: 'linear-gradient(135deg,#2bbb97,#1d8a6e)' },
            { n: 'João Pereira',  init: 'JP', tone: 'linear-gradient(135deg,#9dd760,#6fa83d)' },
            { n: 'Akira Tanaka',  init: 'AT', tone: 'linear-gradient(135deg,#5b8def,#2d5fb8)' },
          ].map((m) => (
            <div key={m.init} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: 4, border: '1px solid var(--hairline)', borderRadius: 4 }}>
              <div style={{
                width: 18, height: 18, borderRadius: 999, background: m.tone, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700,
              }}>{m.init}</div>
              <div style={{ fontSize: 9, fontWeight: 600, flex: 1 }}>{m.n}</div>
              <span className="pill pill-brand" style={{ fontSize: 7 }}>Accepted</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniInvoices() {
  return (
    <div className="mockup">
      <div className="mockup-bar">
        <span className="dot" /><span className="dot" /><span className="dot" />
        <span style={{ marginLeft: 8, fontSize: 9, color: 'var(--ink-mute)' }}>portal.ozly.au/invoices</span>
      </div>
      <div className="mockup-body">
        <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 13 }}>Invoices</div>
        <div style={{ marginTop: 8, fontSize: 9 }}>
          {[
            { sub: 'Maria Santos',  amt: '$1,820', state: 'Paid',    cls: 'pill-brand' },
            { sub: 'João Pereira',  amt: '$1,650', state: 'Sent',    cls: 'pill-lime' },
            { sub: 'Akira Tanaka',  amt: '$1,420', state: 'Overdue', cls: 'pill-rose' },
          ].map((i, idx) => (
            <div key={idx} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '5px 6px',
              borderBottom: '1px solid var(--hairline)',
            }}>
              <div style={{ flex: 1, fontWeight: 600 }}>{i.sub}</div>
              <div style={{ fontFamily: 'Montserrat', fontWeight: 700 }}>{i.amt}</div>
              <span className={`pill ${i.cls}`} style={{ fontSize: 7 }}>{i.state}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Phone screen variants ─────────────────────────────────────────────────
function PhoneScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="phone">
      <div className="phone-notch" />
      <div className="phone-screen">{children}</div>
    </div>
  );
}

function PhoneJobOffer() {
  return (
    <PhoneScreen>
      <div style={{ background: 'linear-gradient(135deg, #2bbb97, #1d8a6e)', color: '#fff', padding: 8, borderRadius: 6, marginBottom: 6 }}>
        <div style={{ fontSize: 8, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.8 }}>New offer</div>
        <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 11, marginTop: 2 }}>Office clean — Surry Hills</div>
        <div style={{ fontSize: 8, marginTop: 4, opacity: 0.9 }}>Tue 14:00 · 4h · $220</div>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        <button style={{ flex: 1, padding: 6, fontSize: 9, fontWeight: 700, background: '#2bbb97', color: '#fff', border: 'none', borderRadius: 4 }}>
          Accept
        </button>
        <button style={{ flex: 1, padding: 6, fontSize: 9, fontWeight: 700, background: '#fff', color: '#607387', border: '1px solid var(--hairline)', borderRadius: 4 }}>
          Decline
        </button>
      </div>
    </PhoneScreen>
  );
}

function PhoneJobActive() {
  return (
    <PhoneScreen>
      <div style={{ padding: 6, background: '#f4faf7', border: '1px solid rgba(43,187,151,0.3)', borderRadius: 4, marginBottom: 6 }}>
        <div style={{ fontSize: 8, fontWeight: 700, color: 'var(--brand-dark)' }}>In progress</div>
        <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 10, marginTop: 2 }}>Office clean</div>
        <div style={{ fontSize: 8, color: 'var(--ink-mute)' }}>Surry Hills</div>
      </div>
      <div style={{ padding: 6, background: '#fff', border: '1px solid var(--hairline)', borderRadius: 4, marginBottom: 6, fontSize: 8 }}>
        Hours worked: <strong>3h 45m</strong>
      </div>
      <button style={{ width: '100%', padding: 8, fontSize: 10, fontWeight: 800, background: 'linear-gradient(180deg,#2bbb97,#1d8a6e)', color: '#fff', border: 'none', borderRadius: 6 }}>
        I'm done ✓
      </button>
    </PhoneScreen>
  );
}

function PhoneInvoiceReview() {
  return (
    <PhoneScreen>
      <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 10 }}>Invoice ready</div>
      <div style={{ fontSize: 8, color: 'var(--ink-mute)', marginBottom: 6 }}>For Augusto Co</div>
      <div style={{ padding: 5, background: '#fbfaf3', border: '1px solid var(--hairline)', borderRadius: 4, fontSize: 8, lineHeight: 1.5 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>4h × $55</span><span>$220</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ink-mute)' }}><span>GST 10%</span><span>$20</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--hairline)', marginTop: 3, paddingTop: 3, fontWeight: 800 }}><span>Total</span><span>$240</span></div>
      </div>
      <button style={{ width: '100%', marginTop: 6, padding: 8, fontSize: 10, fontWeight: 800, background: 'linear-gradient(180deg,#2bbb97,#1d8a6e)', color: '#fff', border: 'none', borderRadius: 6 }}>
        Send to Augusto Co →
      </button>
    </PhoneScreen>
  );
}

function PhoneCelebrate() {
  return (
    <PhoneScreen>
      <div style={{ textAlign: 'center', padding: 8 }}>
        <div style={{ fontSize: 28, marginBottom: 4 }}>🎉</div>
        <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 11 }}>Cha-ching!</div>
        <div style={{ fontSize: 8, color: 'var(--ink-mute)', marginTop: 3 }}>Augusto Co got your invoice. You'll get a push when it's paid.</div>
      </div>
    </PhoneScreen>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────
export function OnboardingGuidePage() {
  const { currentOrg } = useOrg();
  const orgName = currentOrg?.name ?? 'your organisation';

  return (
    <div className="onboarding-print">
      <style>{PRINT_CSS}</style>

      <div className="toolbar no-print">
        <button className="btn btn-primary" onClick={() => window.print()}>
          📄 Save as PDF / Print
        </button>
        <a className="btn btn-secondary" href="/dashboard">← Back to portal</a>
      </div>

      {/* ────────── PAGE 1 — COVER ────────── */}
      <section className="page" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div className="wordmark-large">
            <div className="wordmark-mark-lg">O</div>
            <div>
              <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em' }}>
                oz<span style={{ color: 'var(--brand)' }}>·</span>ly
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--brand-dark)' }}>
                For Organisations
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="kicker" style={{ marginBottom: 8 }}>Onboarding guide</div>
          <h1 style={{ fontSize: 52, lineHeight: 1.02 }}>
            Stop chasing<br />
            sub<span style={{ color: 'var(--brand)' }}>·</span>contractor<br />
            invoices on WhatsApp.
          </h1>
          <p className="body" style={{ marginTop: 18, maxWidth: 460, fontSize: 14 }}>
            Welcome to Ozly. This 4-minute guide walks <strong>{orgName}</strong> through
            the setup, the day-to-day flow, and what your sub-contractors will see on their phone.
          </p>
          <div style={{ marginTop: 32, display: 'flex', gap: 18, alignItems: 'flex-end' }}>
            <div>
              <div className="meta">Read time</div>
              <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 22 }}>~4 min</div>
            </div>
            <div>
              <div className="meta">Setup time</div>
              <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 22 }}>~10 min</div>
            </div>
            <div>
              <div className="meta">Daily admin time after</div>
              <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 22, color: 'var(--brand-dark)' }}>~3 min</div>
            </div>
          </div>
        </div>

        <div className="tiny" style={{ borderTop: '1px solid var(--hairline)', paddingTop: 12, display: 'flex', justifyContent: 'space-between' }}>
          <span>Ozly · ozly.au</span>
          <span>Print and share with your team</span>
        </div>
      </section>

      {/* ────────── PAGE 2 — FLOW DIAGRAM ────────── */}
      <section className="page">
        <div className="kicker">How it works</div>
        <h2 style={{ marginTop: 4, marginBottom: 6 }}>You configure once. They tap. Money flows.</h2>
        <p className="body" style={{ marginBottom: 22 }}>
          Once you sync Ozly with the scheduling tool your business already uses, every step below
          is automatic — you click <strong>Offer</strong> and <strong>Paid</strong>; your sub taps
          <strong> Accept</strong>, <strong>Complete</strong>, and <strong>Send</strong>. That's it.
        </p>

        <div style={{ maxWidth: 540, margin: '0 auto' }}>
          {[
            { who: 'Your scheduling tool', what: 'ServiceM8 / Tradify / Google Calendar — wherever you book jobs today.',     who_cls: 'pill-sand' },
            { who: 'Ozly portal (web)',     what: 'Jobs auto-flow into your Work inbox. You click Offer to a sub.',          who_cls: 'pill-brand' },
            { who: "Sub's phone (Ozly app)", what: 'They get a push, tap Accept — job lands on their calendar.',              who_cls: 'pill-lime' },
            { who: "Sub's phone (Ozly app)", what: 'They show up, work, tap "I\'m done". Invoice auto-fills with their ABN.', who_cls: 'pill-lime' },
            { who: "Sub's phone (Ozly app)", what: 'They review, tap Send → invoice lands in your Inbox in seconds.',         who_cls: 'pill-lime' },
            { who: 'Ozly portal (web)',     what: 'You click Mark paid → flows to Xero / MYOB as a Bill, ready for batch payment.', who_cls: 'pill-brand' },
          ].map((step, i, arr) => (
            <div key={i}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: 14, background: 'var(--paper-warm)',
                border: '1px solid var(--hairline)', borderRadius: 12,
              }}>
                <div className="step-number">{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <span className={`pill ${step.who_cls}`}>{step.who}</span>
                  <div className="body" style={{ marginTop: 4, color: 'var(--ink)' }}>{step.what}</div>
                </div>
              </div>
              {i < arr.length - 1 && <div className="arrow-down" />}
            </div>
          ))}
        </div>

        <div style={{
          marginTop: 20, padding: 14, background: 'rgba(43, 187, 151, 0.08)',
          border: '1px solid rgba(43, 187, 151, 0.22)', borderRadius: 10,
        }}>
          <div className="kicker">The maths</div>
          <p className="body" style={{ marginTop: 4, color: 'var(--ink)' }}>
            <strong>3 taps for the sub</strong> (Accept, Done, Send). <strong>2 clicks for you</strong>
            (Offer, Mark paid). Everything else — invoice generation, ABN compliance, GST split,
            Xero export — happens behind the scenes.
          </p>
        </div>
      </section>

      {/* ────────── PAGE 3 — YOUR 4-STEP SETUP ────────── */}
      <section className="page">
        <div className="kicker">Setup</div>
        <h2 style={{ marginTop: 4, marginBottom: 6 }}>4 steps · ~10 minutes</h2>
        <p className="body" style={{ marginBottom: 18 }}>
          Do these once. After that, your day-to-day is on the next page.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
          {[
            {
              title: 'Connect your job source',
              detail: 'Open Settings → Integrations. Pick ServiceM8, Tradify, Google Calendar, or any tool you use today. Authorise once. From now on every scheduled job auto-flows into Ozly.',
              mock: <MiniIntegrations />,
            },
            {
              title: 'Invite your sub-contractors',
              detail: 'Members → Invite. Drop their email or phone, pick a role. They get a 1-tap install link for the Ozly app, accept the invitation, and they\'re ready to receive work.',
              mock: <MiniMembers />,
            },
            {
              title: 'Offer your first job',
              detail: 'Work → click any incoming job → Offer to → pick a sub. They get a push notification within seconds. If they accept, the job goes on their schedule.',
              mock: null,
            },
            {
              title: 'Watch invoices flow in',
              detail: 'When the sub finishes and sends, the invoice appears in Inbox. Open it, click Mark as paid after the bank transfer, and Ozly pushes it to your accounting tool. Done.',
              mock: <MiniInvoices />,
            },
          ].map((step, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 14,
              padding: 12, border: '1px solid var(--hairline)', borderRadius: 12,
              background: 'var(--paper)',
            }}>
              <div className="step-number" style={{ flexShrink: 0 }}>{i + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontSize: 14, marginBottom: 4 }}>{step.title}</h3>
                <p className="body" style={{ fontSize: 11.5 }}>{step.detail}</p>
              </div>
              {step.mock && <div style={{ width: 200, flexShrink: 0 }}>{step.mock}</div>}
            </div>
          ))}
        </div>
      </section>

      {/* ────────── PAGE 4 — PORTAL TOUR ────────── */}
      <section className="page">
        <div className="kicker">Portal · what you'll do daily</div>
        <h2 style={{ marginTop: 4, marginBottom: 6 }}>3 minutes a morning</h2>
        <p className="body" style={{ marginBottom: 18 }}>
          The portal puts the few decisions that need a human in front of you. Everything else runs
          in the background.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <h3 style={{ marginBottom: 6 }}>📊 Dashboard</h3>
            <p className="body" style={{ marginBottom: 8 }}>
              Open the portal — first screen. Outstanding, overdue, paid, active subs, revenue trend,
              status mix. Click any number to drill in.
            </p>
            <MiniDashboard />
          </div>
          <div>
            <h3 style={{ marginBottom: 6 }}>📄 Invoices &amp; Inbox</h3>
            <p className="body" style={{ marginBottom: 8 }}>
              All invoices from your subs land here. Mark paid one at a time or in bulk. Export CSV
              or Xero-formatted bills.
            </p>
            <MiniInvoices />
          </div>
          <div>
            <h3 style={{ marginBottom: 6 }}>💼 Work</h3>
            <p className="body" style={{ marginBottom: 8 }}>
              Every job pulled in from your scheduling tool. Filter, select multiple, offer to subs
              individually or as a group.
            </p>
            <div className="mockup">
              <div className="mockup-bar">
                <span className="dot" /><span className="dot" /><span className="dot" />
                <span style={{ marginLeft: 8, fontSize: 9, color: 'var(--ink-mute)' }}>portal.ozly.au/work</span>
              </div>
              <div className="mockup-body">
                <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 13 }}>Work</div>
                <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                  <div style={{ padding: 4, background: 'rgba(43,187,151,0.10)', borderRadius: 4, fontSize: 8, flex: 1 }}>
                    <div style={{ fontWeight: 700 }}>Total value</div>
                    <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 11 }}>$8,640</div>
                  </div>
                  <div style={{ padding: 4, background: 'rgba(157,215,96,0.18)', borderRadius: 4, fontSize: 8, flex: 1 }}>
                    <div style={{ fontWeight: 700 }}>Hours</div>
                    <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 11 }}>148h</div>
                  </div>
                </div>
                <div style={{ marginTop: 6 }}>
                  {['Surry Hills office', 'Bondi end-of-lease', 'CBD weekly'].map((t) => (
                    <div key={t} style={{ display: 'flex', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid var(--hairline)', fontSize: 9 }}>
                      <span style={{ flex: 1 }}>{t}</span>
                      <span className="pill pill-brand" style={{ fontSize: 7 }}>Confirmed</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div>
            <h3 style={{ marginBottom: 6 }}>👥 Members &amp; Billing</h3>
            <p className="body" style={{ marginBottom: 8 }}>
              Manage your team, see seat utilisation, switch plans (Crew · Squad · Fleet · Operation).
            </p>
            <MiniMembers />
          </div>
        </div>
      </section>

      {/* ────────── PAGE 5 — MOBILE APP (SUB VIEW) ────────── */}
      <section className="page">
        <div className="kicker">Mobile · what your sub-contractors see</div>
        <h2 style={{ marginTop: 4, marginBottom: 6 }}>Their job, on their phone</h2>
        <p className="body" style={{ marginBottom: 24 }}>
          Your sub-contractors download the Ozly app. From offer to payment, the whole flow is push
          notifications and big-thumb buttons. No filling forms. No re-typing.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
          {[
            { phone: <PhoneJobOffer />,      step: 1, title: 'Get a job offer',     detail: 'Push notification when you Offer work in the portal.' },
            { phone: <PhoneJobActive />,     step: 2, title: 'Tap to start + done',  detail: 'They see only their accepted jobs. Hours auto-track.' },
            { phone: <PhoneInvoiceReview />, step: 3, title: 'Auto-filled invoice', detail: 'Hours × rate × GST, with their ABN. They just review.' },
            { phone: <PhoneCelebrate />,     step: 4, title: 'Tap Send',             detail: "Cha-ching. Arrives in your Inbox in seconds." },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div className="step-number" style={{ marginBottom: 8 }}>{s.step}</div>
              {s.phone}
              <div style={{ marginTop: 10, fontFamily: 'Montserrat', fontWeight: 800, fontSize: 11 }}>{s.title}</div>
              <p className="body" style={{ marginTop: 3, fontSize: 10.5 }}>{s.detail}</p>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: 24, padding: 14, background: 'rgba(157, 215, 96, 0.12)',
          border: '1px solid rgba(157, 215, 96, 0.32)', borderRadius: 10,
        }}>
          <div className="kicker" style={{ color: '#4a6e1f' }}>What else is in the app</div>
          <ul className="body" style={{ marginTop: 6, color: 'var(--ink)', paddingLeft: 18 }}>
            <li><strong>Visa Shield</strong> — for subs on student/WHV visas, tracks weekly hours so they don't breach.</li>
            <li><strong>Receipt OCR</strong> — snap a receipt, expense is logged for end-of-year tax.</li>
            <li><strong>Hustle Score &amp; Golden Hour</strong> — invoice within 60 min of finishing for double XP. Gamification that makes them faster.</li>
            <li><strong>ATO tax brackets</strong> baked in — they always know their net.</li>
          </ul>
        </div>
      </section>

      {/* ────────── PAGE 6 — FAQ ────────── */}
      <section className="page">
        <div className="kicker">FAQ</div>
        <h2 style={{ marginTop: 4, marginBottom: 12 }}>The questions every new admin asks</h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
          {[
            {
              q: 'Is it really automatic?',
              a: 'Once a job source is connected, yes. The sub-contractor accepts, works, and sends with 3 taps; you mark paid with 1 click. The job → invoice → bill chain is fully wired.',
            },
            {
              q: 'Can I edit an invoice before it\'s sent?',
              a: 'No — by ATO compliance, the sub-contractor is the issuer of their ABN invoice. They edit on their side. You can decline (which sends them a note to fix and resend) or mark paid.',
            },
            {
              q: 'What if a sub doesn\'t have an ABN yet?',
              a: 'They get a "Needs ABN cover" tag in your portal. You can subsidise their plan (org_subsidy) so they bill ABN-compliantly to YOU only, or ask them to subscribe themselves.',
            },
            {
              q: 'How does the GST split work?',
              a: 'If the sub is GST-registered, the invoice has a 10% GST line. If not, no GST. Ozly checks the ABN registration via ABR before generating.',
            },
            {
              q: 'Where do I see what my accountant needs?',
              a: 'Reports → BAS quarterly export gives you the exact CSV the BAS submission needs. P&L summaries also live there.',
            },
            {
              q: 'Can I disconnect an integration?',
              a: 'Anytime — Settings → Integrations → click the connected one → Disconnect. Your data stays put on the other side, Ozly just stops pushing/pulling.',
            },
            {
              q: 'What does it cost?',
              a: 'Tier-based per-seat: Crew $12.99 (1-5), Squad $10.99 (6-15), Fleet $8.99 (16-30), Operation $6.99 (31-100). 100+ is Custom — talk to sales. 17% off annual.',
            },
            {
              q: 'Is my data safe?',
              a: 'Row-level security on every table (no admin sees another org\'s data). All Australian. Backed up nightly. Independent security audit each quarter.',
            },
          ].map((f, i) => (
            <div key={i} style={{
              borderLeft: '3px solid var(--brand)',
              paddingLeft: 12,
            }}>
              <h3 style={{ fontSize: 13 }}>{f.q}</h3>
              <p className="body" style={{ marginTop: 4 }}>{f.a}</p>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: 28, padding: 18, background: 'linear-gradient(135deg, #14242f 0%, #08121a 100%)',
          color: '#fff', borderRadius: 12,
        }}>
          <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#9dd760' }}>
            Need help?
          </div>
          <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 18, marginTop: 4 }}>
            We're a small team. We reply fast.
          </div>
          <p style={{ marginTop: 6, fontSize: 12, opacity: 0.85, maxWidth: 460 }}>
            Email <strong>support@ozly.au</strong> · or hit the chat bubble in-app. Average response time under
            2 hours during AEST business hours. Onboarding call available for Operation tier and above.
          </p>
        </div>
      </section>
    </div>
  );
}
