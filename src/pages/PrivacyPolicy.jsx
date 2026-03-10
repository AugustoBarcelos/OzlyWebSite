import { useEffect } from "react";
import { useI18n } from "../i18n";

export default function PrivacyPolicy() {
  const { t } = useI18n();
  const p = t.privacy;
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="bg-[#F8FAFC] min-h-screen pt-28 pb-20">
      <div className="mx-auto max-w-3xl px-6">
        <h1 className="text-3xl font-bold text-navy-500 mb-1">Ozly &mdash; {p.title}</h1>
        <p className="text-sm text-slate-500 mb-8">{p.effectiveDate} &nbsp;|&nbsp; {p.lastUpdated}</p>

        <div className="bg-brand-50 border-l-4 border-brand-500 rounded-r-lg p-5 mb-8">
          <p className="text-sm text-navy-500"><strong>{p.summaryLabel}</strong> {p.summary}</p>
        </div>

        <Section title={p.s1}>
          <p>Ozly (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) is operated by Ozly Pty Ltd (ABN to be confirmed), based in Australia. This Privacy Policy explains how we collect, use, disclose, and protect your personal information when you use the Ozly mobile application (the &ldquo;App&rdquo;) available on the Apple App Store and Google Play Store.</p>
          <p>We are committed to complying with the <strong>Australian Privacy Act 1988 (Cth)</strong> and the <strong>Australian Privacy Principles (APPs)</strong>, as well as the privacy requirements of Apple and Google.</p>
          <p>For any privacy-related enquiry, please contact us at: <strong>privacy@ozly.com.au</strong></p>
        </Section>

        <Section title={p.s2}>
          <h3 className="text-lg font-semibold text-navy-500 mt-6 mb-2">2.1 Account &amp; Profile Information</h3>
          <p>When you create an account, we collect:</p>
          <ul>
            <li><strong>Email address</strong> &mdash; provided directly or via Google/Apple Sign-In.</li>
            <li><strong>Full name</strong> &mdash; provided by you or retrieved from your Google/Apple account.</li>
            <li><strong>Phone number</strong> (optional) &mdash; if you choose to add it to your profile.</li>
            <li><strong>Postal address, postal code, and country</strong> (optional) &mdash; for business invoicing.</li>
            <li><strong>Profile photo</strong> (optional) &mdash; uploaded to our secure cloud storage.</li>
          </ul>

          <h3 className="text-lg font-semibold text-navy-500 mt-6 mb-2">2.2 Authentication Data</h3>
          <p>We support three sign-in methods:</p>
          <ul>
            <li><strong>Email &amp; Password</strong> &mdash; your password is hashed by Supabase Auth and is never stored in plain text.</li>
            <li><strong>Sign in with Google</strong> &mdash; we receive your email address and display name via OAuth 2.0. We request access to your Google Calendar if you choose to enable calendar sync.</li>
            <li><strong>Sign in with Apple</strong> &mdash; we receive your email address and full name (if you choose to share them). Authentication uses PKCE with a cryptographic nonce for security.</li>
          </ul>

          <h3 className="text-lg font-semibold text-navy-500 mt-6 mb-2">2.3 Business &amp; Financial Data</h3>
          <p>If you use the App for ABN-mode (business) features, you may provide:</p>
          <ul>
            <li>Australian Business Number (ABN) and company name.</li>
            <li>Business category (e.g., cleaning, gardening, construction).</li>
            <li>Default hourly rate.</li>
            <li>Banking details: BSB, account number, and/or PayID &mdash; used solely for displaying on invoices you generate.</li>
          </ul>

          <h3 className="text-lg font-semibold text-navy-500 mt-6 mb-2">2.4 Work &amp; Expense Records</h3>
          <p>As part of core App functionality, you create and store:</p>
          <ul>
            <li><strong>Jobs:</strong> title, dates, times, hourly rate, location (text only, not GPS), status, and notes.</li>
            <li><strong>Contractors/Clients:</strong> name, email, phone, ABN, address, notes, and default rate.</li>
            <li><strong>Invoices:</strong> invoice numbers, line items, dates, amounts, tax calculations.</li>
            <li><strong>Work hours:</strong> date and hours worked per job.</li>
            <li><strong>Expenses:</strong> amount, claimable amount, category, merchant name, description, date, and receipt photo.</li>
          </ul>

          <h3 className="text-lg font-semibold text-navy-500 mt-6 mb-2">2.5 Receipt Images &amp; OCR Processing</h3>
          <p>When you scan a receipt:</p>
          <ul>
            <li>The image is captured via your device camera or selected from your photo library.</li>
            <li><strong>Primary processing:</strong> The image is sent to <strong>Google Gemini</strong> (Google&apos;s generative AI service) for analysis. The image is transmitted as base64-encoded data to extract merchant name, date, amounts, line items, and tax-deductibility classification. Google processes this data under their <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>.</li>
            <li><strong>Fallback processing:</strong> If the primary service is unavailable, <strong>Google ML Kit Text Recognition</strong> processes the image entirely on your device &mdash; no data leaves your phone.</li>
            <li>Receipt images are uploaded to our secure cloud storage (Supabase Storage) with sanitised filenames (timestamp + random identifier) so you can access them across devices.</li>
          </ul>

          <h3 className="text-lg font-semibold text-navy-500 mt-6 mb-2">2.6 Google Calendar Data</h3>
          <p>If you enable Google Calendar integration, we request:</p>
          <ul>
            <li><strong>Read access</strong> to your calendar events (to detect scheduling conflicts).</li>
            <li><strong>Write access</strong> to create, update, or delete calendar events corresponding to your jobs.</li>
          </ul>
          <p>Calendar data is used exclusively to synchronise your Ozly jobs with your Google Calendar. We store only the Google Event ID on each job record; we do not store your broader calendar data.</p>

          <h3 className="text-lg font-semibold text-navy-500 mt-6 mb-2">2.7 Contacts Data</h3>
          <p>If you grant permission, we may access your device contacts to help you quickly populate contractor or client details (name, email, phone). Contact data is read on demand and is <strong>not</strong> uploaded to our servers or stored beyond what you choose to save as a contractor record.</p>

          <h3 className="text-lg font-semibold text-navy-500 mt-6 mb-2">2.8 Device Permissions</h3>
          <div className="overflow-x-auto my-4">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-navy-50">
                  <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-navy-500">Permission</th>
                  <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-navy-500">Platform</th>
                  <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-navy-500">Purpose</th>
                </tr>
              </thead>
              <tbody className="text-slate-600">
                <tr><td className="border border-slate-200 px-3 py-2">Camera</td><td className="border border-slate-200 px-3 py-2">iOS, Android</td><td className="border border-slate-200 px-3 py-2">Scan receipts and documents for expense tracking.</td></tr>
                <tr><td className="border border-slate-200 px-3 py-2">Photo Library / Gallery</td><td className="border border-slate-200 px-3 py-2">iOS, Android</td><td className="border border-slate-200 px-3 py-2">Select existing receipt photos; save generated invoices.</td></tr>
                <tr><td className="border border-slate-200 px-3 py-2">Contacts</td><td className="border border-slate-200 px-3 py-2">iOS, Android</td><td className="border border-slate-200 px-3 py-2">Quickly import client/contractor details.</td></tr>
                <tr><td className="border border-slate-200 px-3 py-2">Calendar</td><td className="border border-slate-200 px-3 py-2">iOS, Android</td><td className="border border-slate-200 px-3 py-2">Sync jobs with your device/Google Calendar.</td></tr>
                <tr><td className="border border-slate-200 px-3 py-2">Notifications</td><td className="border border-slate-200 px-3 py-2">iOS, Android</td><td className="border border-slate-200 px-3 py-2">Deliver local reminders (morning briefing, shift end, expense reminders). We do <strong>not</strong> use push notification services.</td></tr>
                <tr><td className="border border-slate-200 px-3 py-2">Internet</td><td className="border border-slate-200 px-3 py-2">Android</td><td className="border border-slate-200 px-3 py-2">Sync data with cloud backend and authenticate.</td></tr>
              </tbody>
            </table>
          </div>
          <p>All permissions are requested at the point of use and can be revoked at any time via your device settings.</p>

          <h3 className="text-lg font-semibold text-navy-500 mt-6 mb-2">2.9 Usage Analytics</h3>
          <p>We collect anonymised usage events (e.g., &ldquo;job_created&rdquo;, &ldquo;invoice_sent&rdquo;, &ldquo;screen_view&rdquo;) to improve the App. These events are stored in our own database (Supabase) &mdash; <strong>not</strong> sent to any third-party analytics provider such as Google Analytics or Firebase.</p>
          <p>Sensitive fields are automatically stripped from all analytics events. The following data is <strong>never</strong> included in analytics: passwords, tokens, secrets, Tax File Numbers (TFN), BSB numbers, account numbers, credit card details, CVV codes, access tokens, refresh tokens, or API keys.</p>

          <h3 className="text-lg font-semibold text-navy-500 mt-6 mb-2">2.10 Information We Do NOT Collect</h3>
          <ul>
            <li>GPS or precise geolocation data.</li>
            <li>Tax File Numbers (TFN).</li>
            <li>Credit card or payment card details (subscriptions are processed entirely by Apple/Google via RevenueCat).</li>
            <li>Biometric data.</li>
            <li>Data from other apps on your device.</li>
          </ul>
        </Section>

        <Section title={p.s3}>
          <h3 className="text-lg font-semibold text-navy-500 mt-6 mb-2">3.1 On-Device (Offline-First Architecture)</h3>
          <p>Your financial and work data is stored locally on your device using an encrypted SQLite database. We use <strong>SQLCipher</strong> (AES-256 encryption) to encrypt the local database at rest. This means your data remains accessible even without an internet connection and is protected if your device is lost or stolen.</p>

          <h3 className="text-lg font-semibold text-navy-500 mt-6 mb-2">3.2 Cloud Backup (Supabase)</h3>
          <p>When you are online, your data is synchronised with <strong>Supabase</strong>, a cloud backend hosted on secure infrastructure. Supabase provides:</p>
          <ul>
            <li>Row-Level Security (RLS) &mdash; ensuring you can only access your own data.</li>
            <li>Encrypted connections (TLS) for all data in transit.</li>
            <li>Authentication tokens stored in your device&apos;s secure storage (iOS Keychain / Android Keystore).</li>
          </ul>

          <h3 className="text-lg font-semibold text-navy-500 mt-6 mb-2">3.3 File Storage</h3>
          <p>Uploaded files (receipt images, profile avatars) are stored in Supabase Storage with access restricted to the authenticated user who uploaded them.</p>
        </Section>

        <Section title={p.s4}>
          <p>We use your personal information to:</p>
          <ul>
            <li>Provide and operate the App&apos;s core features (job tracking, invoicing, expense management).</li>
            <li>Authenticate your identity and maintain your account security.</li>
            <li>Synchronise your data across devices.</li>
            <li>Process receipt images for expense data extraction.</li>
            <li>Manage your subscription entitlements.</li>
            <li>Send local on-device notifications and reminders.</li>
            <li>Improve the App based on anonymised usage patterns.</li>
            <li>Respond to support requests.</li>
          </ul>
        </Section>

        <Section title={p.s5}>
          <p>We share your data with the following third-party processors, solely as required to deliver our services:</p>
          <div className="overflow-x-auto my-4">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-navy-50">
                  <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-navy-500">Provider</th>
                  <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-navy-500">Purpose</th>
                  <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-navy-500">Data Shared</th>
                  <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-navy-500">Privacy Policy</th>
                </tr>
              </thead>
              <tbody className="text-slate-600">
                <tr>
                  <td className="border border-slate-200 px-3 py-2 font-medium">Supabase</td>
                  <td className="border border-slate-200 px-3 py-2">Authentication, database, file storage</td>
                  <td className="border border-slate-200 px-3 py-2">Account data, work records, uploaded files</td>
                  <td className="border border-slate-200 px-3 py-2"><a href="https://supabase.com/privacy" target="_blank" rel="noreferrer">supabase.com/privacy</a></td>
                </tr>
                <tr>
                  <td className="border border-slate-200 px-3 py-2 font-medium">RevenueCat</td>
                  <td className="border border-slate-200 px-3 py-2">Subscription and entitlement management</td>
                  <td className="border border-slate-200 px-3 py-2">User ID, subscription status</td>
                  <td className="border border-slate-200 px-3 py-2"><a href="https://www.revenuecat.com/privacy" target="_blank" rel="noreferrer">revenuecat.com/privacy</a></td>
                </tr>
                <tr>
                  <td className="border border-slate-200 px-3 py-2 font-medium">Google (Sign-In &amp; Calendar)</td>
                  <td className="border border-slate-200 px-3 py-2">OAuth authentication, calendar sync</td>
                  <td className="border border-slate-200 px-3 py-2">Email, name, calendar events</td>
                  <td className="border border-slate-200 px-3 py-2"><a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">policies.google.com/privacy</a></td>
                </tr>
                <tr>
                  <td className="border border-slate-200 px-3 py-2 font-medium">Google Gemini</td>
                  <td className="border border-slate-200 px-3 py-2">Receipt image analysis (OCR)</td>
                  <td className="border border-slate-200 px-3 py-2">Receipt images (base64-encoded)</td>
                  <td className="border border-slate-200 px-3 py-2"><a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">policies.google.com/privacy</a></td>
                </tr>
                <tr>
                  <td className="border border-slate-200 px-3 py-2 font-medium">Google ML Kit</td>
                  <td className="border border-slate-200 px-3 py-2">On-device text recognition (fallback)</td>
                  <td className="border border-slate-200 px-3 py-2">None (processed locally)</td>
                  <td className="border border-slate-200 px-3 py-2">N/A &mdash; no data transmitted</td>
                </tr>
                <tr>
                  <td className="border border-slate-200 px-3 py-2 font-medium">Apple</td>
                  <td className="border border-slate-200 px-3 py-2">Sign in with Apple, App Store subscriptions</td>
                  <td className="border border-slate-200 px-3 py-2">Email, name (as shared by user)</td>
                  <td className="border border-slate-200 px-3 py-2"><a href="https://www.apple.com/legal/privacy/" target="_blank" rel="noreferrer">apple.com/legal/privacy</a></td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>We do <strong>not</strong> sell, rent, or trade your personal information to any third party for marketing or advertising purposes.</p>
        </Section>

        <Section title={p.s6}>
          <p>We retain your data for as long as your account is active. If you delete your account, all associated data is permanently removed (see Section 9 below).</p>
          <p>Anonymised analytics data may be retained for up to 24 months after account deletion for the purpose of improving our services.</p>
        </Section>

        <Section title={p.s7}>
          <p>We implement the following security measures:</p>
          <ul>
            <li><strong>Encryption at rest:</strong> Local database encrypted with SQLCipher (AES-256).</li>
            <li><strong>Encryption in transit:</strong> All network communication uses TLS/HTTPS.</li>
            <li><strong>Secure token storage:</strong> Authentication tokens stored in iOS Keychain or Android Keystore.</li>
            <li><strong>Row-Level Security:</strong> Supabase enforces strict data isolation per user.</li>
            <li><strong>Input validation:</strong> All form fields enforce maximum length limits to prevent abuse.</li>
            <li><strong>Sanitised file names:</strong> Uploaded files use timestamp-based names to prevent injection attacks.</li>
            <li><strong>Analytics sanitisation:</strong> Sensitive fields are automatically stripped from all logged events.</li>
          </ul>
        </Section>

        <Section title={p.s8}>
          <p>Under the Privacy Act 1988 and the Australian Privacy Principles, you have the right to:</p>
          <ul>
            <li><strong>Access</strong> the personal information we hold about you.</li>
            <li><strong>Correct</strong> inaccurate or outdated information (you can do this directly in the App&apos;s Profile screen).</li>
            <li><strong>Request deletion</strong> of your personal information (see Section 9).</li>
            <li><strong>Withdraw consent</strong> for optional data processing (e.g., revoke camera or contacts access via device settings).</li>
            <li><strong>Complain</strong> to the <a href="https://www.oaic.gov.au/" target="_blank" rel="noreferrer">Office of the Australian Information Commissioner (OAIC)</a> if you believe your privacy has been breached.</li>
          </ul>
        </Section>

        <div id="data-deletion" className="bg-red-50 border-l-4 border-red-500 rounded-r-lg p-5 my-8">
          <h2 className="text-xl font-bold text-navy-500 mb-3">{p.s9}</h2>
          <p className="text-sm text-slate-700 mb-3"><strong>You may request complete deletion of your account and all associated data at any time.</strong></p>

          <h3 className="text-base font-semibold text-navy-500 mt-4 mb-2">How to Delete Your Account:</h3>
          <ol className="list-decimal pl-5 text-sm text-slate-700 space-y-1 mb-4">
            <li>Open the Ozly App.</li>
            <li>Navigate to <strong>Settings</strong>.</li>
            <li>Tap <strong>&ldquo;Delete Account&rdquo;</strong>.</li>
            <li>Confirm by typing <strong>&ldquo;DELETE&rdquo;</strong> when prompted.</li>
          </ol>

          <h3 className="text-base font-semibold text-navy-500 mt-4 mb-2">What Happens When You Delete:</h3>
          <p className="text-sm text-slate-700 mb-2">The following data is <strong>permanently and irreversibly</strong> deleted from our servers:</p>
          <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1 mb-3">
            <li>Your user profile and authentication credentials.</li>
            <li>All work hours, jobs, and associated calendar links.</li>
            <li>All invoices and invoice line items.</li>
            <li>All expenses and uploaded receipt images.</li>
            <li>All contractor/client records.</li>
            <li>All business records (ABN, banking details).</li>
            <li>All analytics events associated with your account.</li>
          </ul>
          <p className="text-sm text-slate-700 mb-3"><strong>This action cannot be undone.</strong> Local data on your device is also cleared upon sign-out.</p>
          <p className="text-sm text-slate-700 mb-3">If you are unable to access the App, you may request account deletion by emailing <strong>privacy@ozly.com.au</strong> from the email address associated with your account. We will process your request within 30 days.</p>

          <h3 className="text-base font-semibold text-navy-500 mt-4 mb-2">Subscription Cancellation:</h3>
          <p className="text-sm text-slate-700">Deleting your Ozly account does <strong>not</strong> automatically cancel your App Store or Google Play subscription. You must cancel your subscription separately through your device&apos;s subscription settings to avoid further charges.</p>
        </div>

        <Section title={p.s10}>
          <p>Your data may be processed on servers located outside Australia (e.g., Supabase infrastructure, Google Cloud services). Where this occurs, we ensure that appropriate safeguards are in place in accordance with APP 8 (cross-border disclosure of personal information).</p>
        </Section>

        <Section title={p.s11}>
          <p>The App is not directed to children under the age of 16. We do not knowingly collect personal information from children. If we become aware that a child under 16 has provided us with personal information, we will take steps to delete such information promptly.</p>
        </Section>

        <Section title={p.s12}>
          <p>We may update this Privacy Policy from time to time. We will notify you of material changes by:</p>
          <ul>
            <li>Posting the updated policy on our website with a revised &ldquo;Last Updated&rdquo; date.</li>
            <li>Displaying a notice within the App.</li>
          </ul>
          <p>Your continued use of the App after any changes constitutes acceptance of the updated Privacy Policy.</p>
        </Section>

        <Section title={p.s13}>
          <p>If you have any questions, concerns, or requests regarding this Privacy Policy or your personal data, please contact us:</p>
          <ul>
            <li><strong>Email:</strong> <a href="mailto:privacy@ozly.com.au">privacy@ozly.com.au</a></li>
            <li><strong>Website:</strong> <a href="https://ozly.com.au" target="_blank" rel="noreferrer">ozly.com.au</a></li>
          </ul>
          <p>If you are not satisfied with our response, you may lodge a complaint with the <strong>Office of the Australian Information Commissioner (OAIC)</strong> at <a href="https://www.oaic.gov.au/" target="_blank" rel="noreferrer">www.oaic.gov.au</a>.</p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold text-navy-500 border-b border-slate-200 pb-2 mb-4">{title}</h2>
      <div className="prose-sm text-slate-600 space-y-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_a]:text-brand-500 [&_a]:underline [&_a:hover]:text-brand-600 [&_strong]:text-slate-700">
        {children}
      </div>
    </section>
  );
}
