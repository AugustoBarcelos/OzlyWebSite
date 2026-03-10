import { useEffect } from "react";

export default function TermsOfUse() {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="bg-[#F8FAFC] min-h-screen pt-28 pb-20">
      <div className="mx-auto max-w-3xl px-6">
        <h1 className="text-3xl font-bold text-navy-500 mb-1">Ozly &mdash; Terms of Use (EULA)</h1>
        <p className="text-sm text-slate-500 mb-8">Effective Date: 10 March 2026 &nbsp;|&nbsp; Last Updated: 10 March 2026</p>

        <div className="bg-brand-50 border-l-4 border-brand-500 rounded-r-lg p-5 mb-8">
          <p className="text-sm text-navy-500"><strong>Important:</strong> By downloading, installing, or using the Ozly application, you agree to be bound by these Terms of Use. If you do not agree to these terms, do not use the App.</p>
        </div>

        <Section title="1. Agreement &amp; Definitions">
          <p>These Terms of Use (&ldquo;Terms&rdquo;, &ldquo;EULA&rdquo;) constitute a legally binding agreement between you (&ldquo;User&rdquo;, &ldquo;you&rdquo;, &ldquo;your&rdquo;) and Ozly Pty Ltd (&ldquo;Ozly&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;), governing your use of the Ozly mobile application (&ldquo;App&rdquo;) and related services.</p>
          <p>Key definitions:</p>
          <ul>
            <li><strong>&ldquo;App&rdquo;</strong> means the Ozly mobile application available on the Apple App Store and Google Play Store.</li>
            <li><strong>&ldquo;Service&rdquo;</strong> means all features, functionality, and content provided through the App.</li>
            <li><strong>&ldquo;Subscription&rdquo;</strong> means a paid, auto-renewable subscription plan that grants access to premium features.</li>
            <li><strong>&ldquo;Content&rdquo;</strong> means any data, text, images, or other materials you create, upload, or store through the App.</li>
          </ul>
        </Section>

        <Section title="2. Eligibility">
          <p>You must be at least 16 years of age to use the App. By using the App, you represent and warrant that you meet this age requirement and have the legal capacity to enter into these Terms.</p>
        </Section>

        <Section title="3. Account Registration &amp; Security">
          <ol>
            <li>You may register using your email address and password, Google Sign-In, or Sign in with Apple.</li>
            <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
            <li>You agree to provide accurate, current, and complete information during registration and to update such information as necessary.</li>
            <li>You must notify us immediately at <a href="mailto:support@ozly.com.au">support@ozly.com.au</a> if you suspect unauthorised access to your account.</li>
            <li>We reserve the right to suspend or terminate accounts that violate these Terms or are used for fraudulent purposes.</li>
          </ol>
        </Section>

        <Section title="4. Description of the Service">
          <p>Ozly is a workforce-management and financial-tracking application designed for Australian contractors and small businesses. The App provides:</p>
          <ul>
            <li>Job scheduling and time tracking.</li>
            <li>Invoice generation and management.</li>
            <li>Expense tracking with receipt scanning (OCR).</li>
            <li>Contractor and client management.</li>
            <li>Google Calendar integration for job synchronisation.</li>
            <li>Offline-first data storage with encrypted cloud backup.</li>
          </ul>
        </Section>

        <div className="bg-amber-50 border-l-4 border-amber-500 rounded-r-lg p-5 my-8">
          <h2 className="text-xl font-bold text-navy-500 mb-3">5. Subscriptions &amp; Payment Terms</h2>

          <h3 className="text-base font-semibold text-navy-500 mt-4 mb-2">5.1 Subscription Plans</h3>
          <p className="text-sm text-slate-700 mb-3">Ozly offers the following subscription tiers, managed through <strong>RevenueCat</strong> and processed by the Apple App Store or Google Play Store:</p>
          <div className="overflow-x-auto my-3">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-amber-100/50">
                  <th className="border border-amber-200 px-3 py-2 text-left font-semibold text-navy-500">Plan</th>
                  <th className="border border-amber-200 px-3 py-2 text-left font-semibold text-navy-500">Description</th>
                </tr>
              </thead>
              <tbody className="text-slate-700">
                <tr><td className="border border-amber-200 px-3 py-2 font-medium">TFN Access</td><td className="border border-amber-200 px-3 py-2">Features designed for individual contractors operating under a Tax File Number.</td></tr>
                <tr><td className="border border-amber-200 px-3 py-2 font-medium">ABN Access</td><td className="border border-amber-200 px-3 py-2">Features designed for contractors and businesses operating under an Australian Business Number.</td></tr>
                <tr><td className="border border-amber-200 px-3 py-2 font-medium">Max Mode</td><td className="border border-amber-200 px-3 py-2">Full access to both TFN and ABN features for users who hold both entitlements.</td></tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm text-slate-700 mb-3">A <strong>14-day free trial</strong> may be offered to new users. At the end of the trial period, your subscription will automatically convert to a paid subscription unless you cancel before the trial ends.</p>

          <h3 className="text-base font-semibold text-navy-500 mt-4 mb-2">5.2 Auto-Renewable Subscription Terms</h3>
          <p className="text-sm text-slate-700 mb-2"><strong>Please read the following carefully, as required by Apple and Google:</strong></p>
          <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1 mb-3">
            <li>Payment is charged to your <strong>Apple ID account</strong> or <strong>Google Play account</strong> at confirmation of purchase.</li>
            <li>Your subscription <strong>automatically renews</strong> unless you cancel at least <strong>24 hours before the end of the current billing period</strong>.</li>
            <li>Your account will be charged for renewal within <strong>24 hours prior to the end of the current period</strong>, at the same price as the original subscription.</li>
            <li>You can manage and cancel your subscription at any time through your device settings:
              <ul className="list-disc pl-5 mt-1 space-y-1">
                <li><strong>iOS:</strong> Settings &gt; [your name] &gt; Subscriptions &gt; Ozly.</li>
                <li><strong>Android:</strong> Google Play Store &gt; Menu &gt; Subscriptions &gt; Ozly.</li>
              </ul>
            </li>
            <li>Any unused portion of a free trial period is forfeited when you purchase a subscription.</li>
            <li>Subscription prices may change. We will notify you of any price changes, and you will have the opportunity to cancel before the new price takes effect.</li>
          </ul>

          <h3 className="text-base font-semibold text-navy-500 mt-4 mb-2">5.3 Refunds</h3>
          <p className="text-sm text-slate-700 mb-2">All subscription purchases are processed by Apple or Google. Refund requests must be directed to:</p>
          <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
            <li><strong>Apple:</strong> <a href="https://reportaproblem.apple.com/" target="_blank" rel="noreferrer" className="text-brand-500 underline hover:text-brand-600">reportaproblem.apple.com</a></li>
            <li><strong>Google:</strong> <a href="https://support.google.com/googleplay/answer/2479637" target="_blank" rel="noreferrer" className="text-brand-500 underline hover:text-brand-600">Google Play Help Centre</a></li>
          </ul>
          <p className="text-sm text-slate-700 mt-2">We do not have the ability to process refunds directly, as all billing is handled by the respective app stores.</p>
        </div>

        <Section title="6. Free Features &amp; Trial">
          <p>Certain features of the App may be available without a subscription. We reserve the right to modify which features are included in free and paid tiers at any time, with reasonable notice to users.</p>
        </Section>

        <Section title="7. User Content &amp; Data Ownership">
          <ol>
            <li><strong>Your Data, Your Property:</strong> You retain full ownership of all Content you create or upload through the App, including but not limited to jobs, invoices, expenses, receipt images, and business records.</li>
            <li><strong>Licence to Us:</strong> By using the App, you grant us a limited, non-exclusive licence to store, process, and display your Content solely for the purpose of providing the Service to you.</li>
            <li><strong>Data Portability:</strong> You may export your data at any time through the App&apos;s export features (where available).</li>
            <li><strong>Prohibited Content:</strong> You agree not to upload or store content that is illegal, fraudulent, defamatory, or infringes on the rights of others.</li>
          </ol>
        </Section>

        <Section title="8. Acceptable Use">
          <p>You agree <strong>not</strong> to:</p>
          <ul>
            <li>Use the App for any unlawful purpose or to facilitate tax fraud or evasion.</li>
            <li>Attempt to reverse-engineer, decompile, disassemble, or otherwise derive the source code of the App.</li>
            <li>Interfere with, disrupt, or place an unreasonable burden on our servers or infrastructure.</li>
            <li>Circumvent, disable, or tamper with any security features of the App.</li>
            <li>Use automated scripts, bots, or scrapers to access the App.</li>
            <li>Create multiple accounts for fraudulent purposes or to abuse free trial offers.</li>
            <li>Impersonate another person or misrepresent your affiliation with any entity.</li>
            <li>Share your account credentials with third parties.</li>
          </ul>
        </Section>

        <Section title="9. Intellectual Property">
          <ol>
            <li>The App, including its design, code, features, graphics, logos, and trademarks, is the exclusive property of Ozly Pty Ltd and is protected by Australian and international intellectual property laws.</li>
            <li>These Terms grant you a limited, non-exclusive, non-transferable, revocable licence to use the App for personal or business purposes in accordance with these Terms.</li>
            <li>You may not copy, modify, distribute, sell, or lease any part of the App or its content without our prior written consent.</li>
          </ol>
        </Section>

        <Section title="10. Third-Party Services">
          <p>The App integrates with the following third-party services. Your use of these services is subject to their respective terms:</p>
          <ul>
            <li><strong>Supabase</strong> &mdash; Cloud backend and authentication (<a href="https://supabase.com/terms" target="_blank" rel="noreferrer">Terms</a>).</li>
            <li><strong>RevenueCat</strong> &mdash; Subscription management (<a href="https://www.revenuecat.com/terms" target="_blank" rel="noreferrer">Terms</a>).</li>
            <li><strong>Google Services</strong> &mdash; Sign-In, Calendar, Gemini AI (<a href="https://policies.google.com/terms" target="_blank" rel="noreferrer">Terms</a>).</li>
            <li><strong>Apple Services</strong> &mdash; Sign in with Apple, App Store (<a href="https://www.apple.com/legal/internet-services/itunes/" target="_blank" rel="noreferrer">Terms</a>).</li>
          </ul>
          <p>We are not responsible for the availability, accuracy, or practices of any third-party service. Your interaction with third-party services is at your own risk.</p>
        </Section>

        <div className="bg-amber-50 border-l-4 border-amber-500 rounded-r-lg p-5 my-8">
          <h2 className="text-xl font-bold text-navy-500 mb-3">11. Disclaimer of Warranties</h2>
          <p className="text-sm text-slate-700 mb-2"><strong>THE APP IS PROVIDED ON AN &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; BASIS.</strong> TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, WE DISCLAIM ALL WARRANTIES, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING BUT NOT LIMITED TO:</p>
          <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
            <li>WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.</li>
            <li>ANY WARRANTY THAT THE APP WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE.</li>
            <li>ANY WARRANTY REGARDING THE ACCURACY OR RELIABILITY OF OCR/RECEIPT SCANNING RESULTS.</li>
          </ul>
        </div>

        <div className="bg-amber-50 border-l-4 border-amber-500 rounded-r-lg p-5 my-8">
          <h2 className="text-xl font-bold text-navy-500 mb-3">12. Financial &amp; Tax Disclaimer</h2>
          <p className="text-sm text-slate-700 mb-2"><strong>Ozly is a record-keeping and productivity tool. It does NOT provide financial, tax, legal, or accounting advice.</strong></p>
          <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
            <li>The expense categorisation and tax-deductibility suggestions generated by the OCR/AI features are <strong>indicative only</strong> and may be inaccurate.</li>
            <li>You are solely responsible for the accuracy of your financial records, tax returns, and compliance with the Australian Taxation Office (ATO) requirements.</li>
            <li>Invoices generated by the App are created based on information you provide. We do not verify the accuracy or legal validity of such invoices.</li>
            <li>You should consult a qualified tax professional or accountant before relying on any data from the App for tax purposes.</li>
          </ul>
        </div>

        <Section title="13. Limitation of Liability">
          <p>To the maximum extent permitted by Australian law (including the Australian Consumer Law):</p>
          <ol>
            <li>Our total aggregate liability to you for any claims arising out of or related to these Terms or the App shall not exceed the total amount you have paid to us for the App in the <strong>12 months</strong> preceding the claim.</li>
            <li>We shall not be liable for any <strong>indirect, incidental, special, consequential, or punitive damages</strong>, including but not limited to loss of profits, data, business opportunities, or goodwill.</li>
            <li>We shall not be liable for any loss or damage resulting from:
              <ul>
                <li>Inaccuracies in OCR/receipt scanning results.</li>
                <li>Errors in expense categorisation or tax-deductibility suggestions.</li>
                <li>Data loss due to device failure, where local data was not synced to the cloud.</li>
                <li>Service interruptions caused by third-party providers.</li>
                <li>Unauthorised access to your account resulting from your failure to maintain credential security.</li>
              </ul>
            </li>
          </ol>
          <p><strong>Nothing in these Terms excludes, restricts, or modifies any consumer guarantee, right, or remedy conferred by the Australian Consumer Law (Schedule 2 of the Competition and Consumer Act 2010) that cannot be excluded, restricted, or modified by agreement.</strong></p>
        </Section>

        <Section title="14. Indemnification">
          <p>You agree to indemnify, defend, and hold harmless Ozly Pty Ltd, its officers, directors, employees, and agents from and against any claims, damages, losses, liabilities, costs, and expenses (including reasonable legal fees) arising out of or related to:</p>
          <ul>
            <li>Your use of the App in violation of these Terms.</li>
            <li>Your violation of any applicable law or regulation.</li>
            <li>Any Content you upload, create, or share through the App.</li>
            <li>Your use of the App&apos;s financial data for tax filings or legal proceedings.</li>
          </ul>
        </Section>

        <Section title="15. Account Termination">
          <ol>
            <li><strong>By You:</strong> You may terminate your account at any time by deleting your account through Settings &gt; Delete Account. See our <a href="/privacy-policy#data-deletion">Privacy Policy &mdash; Data Deletion</a> for details on what data is removed.</li>
            <li><strong>By Us:</strong> We may suspend or terminate your account if you violate these Terms, engage in fraudulent activity, or if required by law. We will provide reasonable notice where practicable.</li>
            <li><strong>Effect of Termination:</strong> Upon termination, your licence to use the App is immediately revoked. Any active subscriptions must be cancelled separately through your app store. Data deletion follows the process described in our Privacy Policy.</li>
          </ol>
        </Section>

        <Section title="16. Modifications to the Service">
          <p>We reserve the right to modify, suspend, or discontinue any part of the App at any time, with or without notice. We will make reasonable efforts to notify users of material changes. We shall not be liable for any modification, suspension, or discontinuation of the Service.</p>
        </Section>

        <Section title="17. Changes to These Terms">
          <p>We may revise these Terms from time to time. Material changes will be communicated by:</p>
          <ul>
            <li>Posting the updated Terms on our website with a new &ldquo;Last Updated&rdquo; date.</li>
            <li>Displaying a notice within the App.</li>
          </ul>
          <p>Your continued use of the App after updated Terms are published constitutes your acceptance. If you do not agree to the revised Terms, you must stop using the App and delete your account.</p>
        </Section>

        <Section title="18. Governing Law &amp; Dispute Resolution">
          <ol>
            <li>These Terms are governed by the laws of the <strong>Commonwealth of Australia</strong> and the <strong>State of New South Wales</strong>.</li>
            <li>Any dispute arising out of or in connection with these Terms shall first be attempted to be resolved through good-faith negotiation between the parties.</li>
            <li>If negotiation fails, the dispute shall be submitted to mediation under the rules of the Australian Disputes Centre (ADC).</li>
            <li>If mediation is unsuccessful, the dispute may be brought before the courts of New South Wales, Australia, and you consent to the exclusive jurisdiction of those courts.</li>
            <li>Nothing in this clause limits your right to bring proceedings in any court or tribunal as permitted by Australian Consumer Law.</li>
          </ol>
        </Section>

        <Section title="19. Severability">
          <p>If any provision of these Terms is found to be invalid, illegal, or unenforceable by a court of competent jurisdiction, the remaining provisions shall continue in full force and effect.</p>
        </Section>

        <Section title="20. Entire Agreement">
          <p>These Terms, together with our <a href="/privacy-policy">Privacy Policy</a>, constitute the entire agreement between you and Ozly regarding your use of the App and supersede all prior agreements, representations, and understandings.</p>
        </Section>

        <Section title="21. Apple-Specific Terms (for iOS Users)">
          <p>The following additional terms apply if you downloaded the App from the Apple App Store:</p>
          <ol>
            <li>These Terms are between you and Ozly Pty Ltd only, and <strong>not</strong> with Apple Inc. (&ldquo;Apple&rdquo;). Ozly, not Apple, is solely responsible for the App and its content.</li>
            <li>Apple has no obligation to provide maintenance or support services for the App.</li>
            <li>In the event of any failure of the App to conform to any applicable warranty, you may notify Apple, and Apple will refund the purchase price (if any). Apple has no other warranty obligation with respect to the App.</li>
            <li>Apple is not responsible for addressing any claims relating to the App, including product liability claims, regulatory compliance, or intellectual property infringement.</li>
            <li>Apple and its subsidiaries are third-party beneficiaries of these Terms and, upon your acceptance, Apple will have the right to enforce these Terms against you.</li>
            <li>You represent that you are not located in a country subject to a U.S. Government embargo or designated as a &ldquo;terrorist supporting&rdquo; country, and you are not listed on any U.S. Government prohibited or restricted parties list.</li>
          </ol>
        </Section>

        <Section title="22. Contact Us">
          <p>If you have any questions about these Terms, please contact us:</p>
          <ul>
            <li><strong>Email:</strong> <a href="mailto:support@ozly.com.au">support@ozly.com.au</a></li>
            <li><strong>Website:</strong> <a href="https://ozly.com.au" target="_blank" rel="noreferrer">ozly.com.au</a></li>
          </ul>
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
