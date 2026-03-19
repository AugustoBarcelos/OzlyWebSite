export default function GuideContentEn({ SectionCard, SubSection, StepList, BulletList, Tip, InfoBox, SimpleTable, P, B, FaqItem }) {
  return (
    <>
      {/* ─── 1. PRIMEIROS PASSOS ─── */}
      <SectionCard id="primeiros-passos" title="1. Getting Started (Login & Sign Up)">
        <SubSection title="Create account with Email">
          <StepList>
            <li>Open Ozly</li>
            <li>Tap <B>"Sign Up"</B> on the Login/Sign Up selector (top corner)</li>
            <li>Enter your <B>Email</B> — the field validates the format automatically</li>
            <li>Create a <B>Password</B> — as you type, you'll see:
              <BulletList>
                <li><B>Password strength bar</B> (red = weak, orange = fair, yellow = good, green = strong)</li>
                <li><B>Requirement chips</B> that turn green: <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">6+ chars</code>, <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">A-Z</code>, <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">0-9</code>, <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">!@#</code></li>
              </BulletList>
            </li>
            <li>Enter <B>Confirm Password</B> — green check = match, red X = mismatch</li>
            <li>Tap <B>"Sign Up"</B> (big green button)</li>
            <li>Done! You'll be directed to the Setup screen</li>
          </StepList>
        </SubSection>

        <SubSection title="Create account with Google">
          <StepList>
            <li>Open Ozly</li>
            <li>Tap <B>"Continue with Google"</B> (button with Google logo)</li>
            <li>Select your Google account in the system popup</li>
            <li>Authorize access</li>
            <li>Done! Redirected to Setup (or Dashboard if you already have a profile)</li>
          </StepList>
        </SubSection>

        <SubSection title="Log In (already have an account)">
          <StepList>
            <li>Keep <B>"Login"</B> selected in the selector</li>
            <li>Enter <B>Email</B> and <B>Password</B></li>
            <li>Tap <B>"Login"</B></li>
            <li>Or tap <B>"Continue with Google"</B> for quick login</li>
          </StepList>
        </SubSection>

        <SubSection title="Forgot my Password">
          <StepList>
            <li>On the Login screen, tap <B>"Forgot Password?"</B> (blue text on the right)</li>
            <li>A dialog appears asking for your email</li>
            <li>Enter the email and tap <B>"Reset"</B></li>
            <li>Check your inbox (and spam folder)</li>
            <li>Click the link received to create a new password</li>
          </StepList>
        </SubSection>

        <Tip>Tap the <B>eye icon</B> next to the password field to toggle between showing and hiding the text.</Tip>
      </SectionCard>

      {/* ─── 2. SETUP ─── */}
      <SectionCard id="setup" title="2. Initial Setup">
        <P>After creating your account, the Setup only asks for the essentials to get you started.</P>

        <SubSection title="Required Fields">
          <StepList>
            <li><B>Profile Photo</B> (optional but recommended) — Tap the circular avatar. Options: Camera, Gallery, or Remove.</li>
            <li><B>Full Name</B> (required) — How it will appear on invoices. Maximum 100 characters.</li>
            <li><B>Postal Code</B> (optional) — 4 digits (e.g., 2000 for Sydney).</li>
            <li><B>Visa Type</B> (required) — Tap one of the 4 cards:
              <BulletList>
                <li><B>Work Visa</B> — Exempt from Medicare Levy</li>
                <li><B>Student Visa</B> — Exempt from Medicare, 48h/fortnight limit</li>
                <li><B>Permanent Resident</B> — Pays Medicare 2%</li>
                <li><B>Citizen</B> — Pays Medicare 2%</li>
              </BulletList>
            </li>
            <li><B>Hourly Rate</B> (required) — Default value: $45.00. Change to your actual rate.</li>
          </StepList>
        </SubSection>

        <SubSection title="Optional Fields (Expandable Section)">
          <P>Tap the <B>"Business Details (Optional)"</B> bar to expand:</P>
          <BulletList>
            <li><B>ABN</B> — 11 digits (validated if filled in)</li>
            <li><B>ABN Category</B> — dropdown (Cleaning, Gardening, Construction, etc.)</li>
            <li><B>Company Name</B> — business name</li>
            <li><B>BSB</B> — 6 digits in 000-000 format</li>
            <li><B>Account Number</B> — bank account number</li>
            <li><B>PayID</B> — email, phone, or ABN</li>
          </BulletList>
          <Tip>Skip these fields for now. When you create your first invoice, Ozly will prompt you to complete this information with a direct button to your Profile.</Tip>
        </SubSection>

        <SubSection title="Finalize">
          <P>Tap <B>"Get Started"</B> (big green button). Ozly saves everything and takes you to the Dashboard.</P>
        </SubSection>
      </SectionCard>

      {/* ─── 3. DASHBOARD ─── */}
      <SectionCard id="dashboard" title="3. Dashboard — Main Screen">
        <P>The Dashboard is Ozly's control center. Everything you need on one screen.</P>

        <SubSection title="Top Bar (App Bar)">
          <SimpleTable
            headers={["Position", "Icon", "Action"]}
            rows={[
              ["Left", "Hamburger Menu", "Opens the side menu (Drawer)"],
              ["Center", "Ozly Logo", "Visual only"],
              ["—", "Sync (cloud)", "Appears when offline/error. Tap to force sync"],
              ["—", "Calendar (badge)", "Goes to Jobs with Google Calendar sync"],
              ["—", "Bell (badge)", "Opens Notification Center"],
              ["Right", "Export", "Copies Dashboard summary"],
            ]}
          />
        </SubSection>

        <SubSection title="Dashboard Cards">
          <P><B>Pending Jobs</B> — Up to 3 completed jobs without an invoice. Buttons: Complete (green) and Cancel (red).</P>
          <P><B>Setup/Invite Card</B> — Appears if your profile is incomplete.</P>
          <P><B>GST Alert</B> — Appears if projected annual revenue {">"} $75,000.</P>
          <P><B>Period Selector</B> — Weekly / Fortnightly / Monthly. Calendar icon for custom date range.</P>
          <P><B>Forecast</B> — Revenue projection. Tap to see a modal with 4 filters: Scheduled (purple), To Invoice (orange), To Receive (yellow), Received (green).</P>
          <P><B>Invoice Cards</B> — "To Invoice" (orange): jobs ready to be billed. "Overdue" (red): overdue invoices.</P>
          <P><B>Next Shift</B> — Next job with countdown. Tap to Complete, Cancel, Edit, or open Google Maps.</P>
          <P><B>Deductible Expenses</B> — Estimated tax savings. "View All" for breakdown, "New Expense" to add.</P>
          <P><B>Referral</B> — Green card "Earn 1 Free Month". Tap to share.</P>
        </SubSection>

        <Tip>Pull the screen down (pull-to-refresh) to force a full sync.</Tip>
      </SectionCard>

      {/* ─── 4. MENU LATERAL ─── */}
      <SectionCard id="menu-lateral" title="4. Side Menu (Drawer)">
        <P>Access by swiping from left to right or tapping the hamburger menu.</P>

        <SubSection title="Navigation">
          <SimpleTable
            headers={["Item", "Goes to", "Note"]}
            rows={[
              ["Contractors", "Contractors Screen", "—"],
              ["Jobs", "Jobs Screen", "—"],
              ["Financial", "Financial Screen", "—"],
              ["Fiscal", "Fiscal Screen", "Requires Pro"],
              ["Expenses", "Expenses Screen", "Requires Pro"],
              ["Visa Shield", "Hours Monitor", "Requires Pro + work/student visa"],
              ["Hustle", "Gamification (XP)", "—"],
              ["Settings", "Settings", "—"],
            ]}
          />
          <InfoBox>Items marked "Requires Pro" open the Paywall screen if you are not a subscriber.</InfoBox>
        </SubSection>

        <SubSection title="Other options">
          <BulletList>
            <li><B>Avatar / Name</B> — Tap to go to Profile</li>
            <li><B>ABN Selector</B> — Switch the active ABN or select "All"</li>
            <li><B>Hustle Score</B> — XP, level, progress bar</li>
            <li><B>Logout</B> — Confirmation before signing out</li>
            <li><B>Last Sync</B> — Timestamp in the footer</li>
          </BulletList>
        </SubSection>
      </SectionCard>

      {/* ─── 5. JOBS ─── */}
      <SectionCard id="jobs" title="5. Jobs">
        <SubSection title="How to get there">
          <SimpleTable
            headers={["Path", "How"]}
            rows={[
              ["Side menu", 'Drawer → "Jobs"'],
              ["Dashboard", 'Card "Pending Jobs" → "View All"'],
              ["Dashboard", 'Card "Next Shift" → "View All"'],
              ["Dashboard", "Calendar icon in the App Bar"],
            ]}
          />
        </SubSection>

        <SubSection title="Views">
          <BulletList>
            <li><B>List</B> — All jobs with filters and text search</li>
            <li><B>Calendar</B> — Monthly/weekly view of jobs on the calendar</li>
          </BulletList>
          <P><B>Available filters:</B> Status (confirmed, pending, completed, cancelled), Period (today, tomorrow, in N days, overdue), and Business/ABN.</P>
        </SubSection>

        <SubSection title="Create a new Job">
          <P>Tap the <B>"+ New Job"</B> (floating) button or <B>"Add Job"</B> on the Dashboard.</P>
          <StepList>
            <li><B>Title</B> — service name (required, max 200 chars)</li>
            <li><B>Date</B> — tap the calendar</li>
            <li><B>Start Time</B> and <B>End Time</B></li>
            <li><B>Contractor</B> — dropdown (auto-fills hourly rate)</li>
            <li><B>Business/ABN</B> — dropdown</li>
            <li><B>Hourly Rate</B> — auto-filled, editable</li>
            <li><B>Location</B> — address (max 300 chars)</li>
            <li><B>Notes</B> — extra information (max 1000 chars)</li>
            <li><B>Skip Invoice</B> — checkbox if no invoice is needed</li>
            <li>Tap <B>"Save"</B></li>
          </StepList>
        </SubSection>

        <SubSection title="Interact with a Job">
          <SimpleTable
            headers={["Action", "What it does"]}
            rows={[
              ["Complete", "Marks as complete + logs hours"],
              ["Cancel", "Cancels with confirmation"],
              ["Edit", "Opens the edit form"],
              ["Reschedule", "Changes date/time"],
              ["Create Invoice", "Creates an invoice with this job"],
              ["Add Receipt", "Opens camera/gallery for a receipt"],
              ["Maps", "Opens Google Maps with directions"],
              ["Delete", "Permanently removes"],
            ]}
          />
          <P>Swipe the job to the left to delete. An "In Progress" indicator appears during the job's scheduled time.</P>
        </SubSection>

        <SubSection title="Mark Job as Complete (3 paths)">
          <BulletList>
            <li>Jobs screen → Tap the job → "Complete"</li>
            <li>Dashboard → "Pending Jobs" card → green button (check)</li>
            <li>Dashboard → "Next Shift" card → Tap → "Complete Job"</li>
          </BulletList>
          <InfoBox>After completing, the system automatically logs hours, starts the Golden Hour timer (60 min to create an invoice = 2x XP), and offers "Generate Invoice".</InfoBox>
        </SubSection>
      </SectionCard>

      {/* ─── 6. CONTRACTORS ─── */}
      <SectionCard id="contractors" title="6. Contractors">
        <P>Side menu → <B>"Contractors"</B>. Two tabs: <B>Agencies</B> and <B>Direct Clients</B>.</P>

        <SubSection title="Create new Contractor">
          <P>Button <B>"+ Add Contractor"</B> or during Job/Invoice creation → <B>"New Client"</B>.</P>
          <StepList>
            <li><B>Type</B>: "Agency" or "Direct Client"</li>
            <li><B>"Import from Contacts"</B> — fills in data from your phone</li>
            <li><B>Name</B> (required), <B>Email</B>, <B>Phone</B>, <B>ABN</B>, <B>Address</B>, <B>Hourly Rate</B> (default), <B>Notes</B></li>
            <li>Tap <B>"Save"</B></li>
          </StepList>
        </SubSection>

        <SubSection title="Available actions">
          <SimpleTable
            headers={["Action", "What it does"]}
            rows={[
              ["Call", "Calls the number"],
              ["WhatsApp", "Opens WhatsApp to the number"],
              ["SMS", "Opens SMS"],
              ["Email", "Opens email app"],
              ["Create Invoice", "Creates an invoice for this contractor"],
              ["Create Job", "Creates a job for this contractor"],
              ["Edit", "Edits details"],
              ["Delete", "Removes with confirmation"],
            ]}
          />
        </SubSection>
      </SectionCard>

      {/* ─── 7. INVOICES ─── */}
      <SectionCard id="invoices" title="7. Invoices">
        <SubSection title="6 paths to create an Invoice">
          <SimpleTable
            headers={["#", "Path", "Pre-filled data"]}
            rows={[
              ["1", 'Financial → "+" button', "Blank"],
              ["2", "Financial → floating FAB", "Blank"],
              ["3", 'Dashboard → "To Invoice" → select jobs', "Contractor + Jobs"],
              ["4", 'Dashboard → Next Shift → Complete → "Generate Invoice"', "Completed job"],
              ["5", 'Dashboard → Forecast → "To Invoice" → tap the job', "Selected job"],
              ["6", 'Contractors → tap → "Create Invoice"', "Selected contractor"],
            ]}
          />
        </SubSection>

        <SubSection title="Step by step">
          <StepList>
            <li><B>Incomplete data warning</B> — If ABN/bank details are empty, a dialog appears with "Complete Profile" or "Later" options.</li>
            <li><B>Select Contractor</B> — Dropdown. "New Client" to create one on the spot.</li>
            <li><B>Select Business/ABN</B> — Dropdown. "New ABN" to create one on the spot.</li>
            <li><B>Invoice Number</B> — Auto-generated (INV-0001, INV-0002...). Editable.</li>
            <li><B>Dates</B> — Issue date (default: today) and Due date (default: 14 days).</li>
            <li><B>Select Jobs</B> — List of completed jobs with checkboxes.</li>
            <li><B>Manual Item</B> — Tap "Manual Item". Fill in description, hours, rate. Option to <B>save as template</B> to reuse in future invoices.</li>
            <li><B>GST</B> — Toggle to include/exclude 10%. Automatic warning if revenue {">"} $75k.</li>
            <li><B>Notes</B> — Terms and conditions.</li>
            <li><B>Summary</B> — Subtotal, GST, Total in real time.</li>
            <li><B>Create</B> — Tap "Create Invoice". Generates PDF + shows XP earned + Golden Hour if applicable.</li>
          </StepList>
        </SubSection>

        <SubSection title="Sending (after creation)">
          <SimpleTable
            headers={["Option", "Action"]}
            rows={[
              ["WhatsApp (green)", "Opens WhatsApp with template + PDF"],
              ["Email (blue)", "Email with pre-filled subject and body"],
              ["SMS (indigo)", "Sends message with link/PDF via SMS"],
              ["Share PDF (purple)", "System share sheet"],
              ["Download PDF (teal)", "Saves to Downloads folder"],
              ["Print (gray)", "Prints via native system printer"],
              ["Close", "Closes without sending (saves as draft)"],
            ]}
          />
        </SubSection>
      </SectionCard>

      {/* ─── 8. EXPENSES ─── */}
      <SectionCard id="expenses" title="8. Expenses">
        <SubSection title="Add an Expense">
          <StepList>
            <li><B>Take a Receipt Photo</B> — Camera or Gallery. OCR extracts the amount, date, and name automatically.</li>
            <li><B>Select Business/ABN</B></li>
            <li><B>Fill in Fields</B> — Merchant Name, Date, Total Amount, Category (Fuel, Tools, Uniform, Phone, Insurance, Vehicle, Office, Training, Other), Description.</li>
            <li><B>Deductible Items</B> — Expand the section and check the applicable items. The Claimable Amount recalculates automatically.</li>
            <li><B>Save</B> — Tap "Save". Earns XP.</li>
          </StepList>
        </SubSection>

        <SubSection title="Deductible Items by Category">
          <SimpleTable
            headers={["Category", "Items"]}
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

        <SubSection title="Filters and Export">
          <BulletList>
            <li><B>Category</B>: filter by type</li>
            <li><B>Period</B>: All time / This month / Last month / Fiscal year</li>
            <li><B>"Only Deductible"</B>: shows only expenses with a deductible amount</li>
            <li><B>Export</B>: Export icon → selection mode → "Share Selected" as CSV</li>
          </BulletList>
        </SubSection>
      </SectionCard>

      {/* ─── 9. FINANCIAL ─── */}
      <SectionCard id="financial" title="9. Financial">
        <P>Side menu → <B>"Financial"</B>.</P>

        <SubSection title="Summary Cards">
          <SimpleTable
            headers={["Card", "Tap → Shows"]}
            rows={[
              ["This Period", "Invoices for the current period"],
              ["Pending", "Invoices awaiting payment"],
              ["Received", "Paid invoices"],
              ["Overdue", "Overdue invoices"],
            ]}
          />
        </SubSection>

        <SubSection title="Invoice Actions">
          <SimpleTable
            headers={["Action", "What it does"]}
            rows={[
              ["Delete", "Permanently removes"],
              ["Edit", "Reopens for editing"],
              ["Export", "Generates PDF or Excel"],
              ["Mark as Paid", "Changes status + animation"],
              ["Share", "Generates PDF and shares"],
              ["WhatsApp/SMS/Email", "Sends a reminder"],
            ]}
          />
        </SubSection>

        <SubSection title="Revenue Goal">
          <P>Set a goal with <B>"Set Goal"</B>. Track your progress with a visual bar and <B>"Edit Goal"</B> to adjust.</P>
        </SubSection>
      </SectionCard>

      {/* ─── 10. FISCAL ─── */}
      <SectionCard id="fiscal" title="10. Fiscal (Taxes)">
        <P>Side menu → <B>"Fiscal"</B> (requires Pro).</P>

        <SubSection title="Tax Tables (ATO 2024-26)">
          <P><B>Tax Residents:</B></P>
          <SimpleTable
            headers={["Bracket", "Rate"]}
            rows={[
              ["$0 – $18,200", "0% (tax-free)"],
              ["$18,201 – $45,000", "16%"],
              ["$45,001 – $135,000", "30%"],
              ["$135,001 – $190,000", "37%"],
              ["$190,001+", "45%"],
            ]}
          />
          <P><B>Non-Residents:</B> 30% from the first dollar.</P>
          <P><B>Working Holiday (417/462):</B> Flat 15% up to $45k, then marginal rates.</P>
        </SubSection>

        <SubSection title="Tax Settings">
          <BulletList>
            <li><B>Visa Type</B> — Recalculates tax table and Medicare</li>
            <li><B>Tax Resident</B> — Toggle. Impact: $18,200 tax-free threshold vs 30% from $1</li>
            <li><B>Medicare Levy</B> — 2% on taxable income (residents/PR only, not WHM)</li>
            <li><B>GST</B> — Manual toggle or automatic alert if revenue {">"} $75k</li>
            <li><B>Work Type</B> — ABN, TFN, or both</li>
          </BulletList>
        </SubSection>

        <SubSection title="Medicare Levy — Details">
          <BulletList>
            <li>Income below <B>$27,222</B>: exempt</li>
            <li>Income between <B>$27,222 and $34,028</B>: phase-in (10% x difference)</li>
            <li>Income above <B>$34,028</B>: full 2%</li>
            <li><B>Working Holiday Makers</B>: exempt from Medicare Levy</li>
          </BulletList>
        </SubSection>

        <SubSection title="Tax Savings Card">
          <P>6 milestone badges: $100, $200, $500, $1,000, $2,000, $5,000. Tap any badge to see a fun equivalence.</P>
        </SubSection>

        <SubSection title="Tax Estimate">
          <P>Shows: Total Income → Deductions → Taxable Income → Tax → Medicare → Total. "i" button for detailed breakdown by bracket.</P>
        </SubSection>

        <SubSection title="Other Income and Credits">
          <P>Tap <B>"+"</B> to add extra income or taxes already paid.</P>
          <BulletList>
            <li><B>Type:</B> Income or Tax Paid (tax already withheld)</li>
            <li><B>Frequency:</B> weekly, fortnightly, monthly, or X times per week</li>
            <li>Can be <B>full fiscal year</B> or <B>pro-rata</B></li>
            <li>Values are automatically annualized for calculation</li>
          </BulletList>
        </SubSection>

        <SubSection title="ABN Hours Comparison (Pro)">
          <P>Compare your hours worked with other professionals in the same ABN category across Australia.</P>
          <BulletList>
            <li><B>Period:</B> 4, 8, or 12 weeks</li>
            <li><B>Filter by State:</B> compare within your Australian state</li>
            <li><B>Statistics:</B> average, median, minimum, and maximum of the group</li>
            <li><B>Percentile ranking:</B> see where you stand in the group</li>
          </BulletList>
        </SubSection>

        <InfoBox>Estimates only. Based on ATO 2024-26 tax tables. Consult a registered tax agent.</InfoBox>
      </SectionCard>

      {/* ─── 11. VISA SHIELD ─── */}
      <SectionCard id="visa-shield" title="11. Visa Shield (Hours Control)">
        <P>Side menu → <B>"Visa Shield"</B> (Pro, work/student visa only).</P>

        <SubSection title="Main Screen">
          <BulletList>
            <li>Hours worked highlighted: <B>"Xh / 48h"</B></li>
            <li>Progress bar: Green {"<"} 40h (safe), Orange 40-47h (warning), Red {">="} 47h (danger)</li>
            <li>STOP! alert (red, {">="} 47h) or WARNING! (orange, 40-47h)</li>
          </BulletList>
        </SubSection>

        <SubSection title="Detail and Manual Addition">
          <P>List of each record with job title, date, and hours. Edit and delete buttons on each item.</P>
          <P>Tap the floating <B>"+"</B> to add hours manually: Job, Date, Hours.</P>
          <P>Button <B>"Export Report"</B> copies CSV to clipboard.</P>
        </SubSection>

        <InfoBox>Visa Shield adds up hours from ALL your ABNs automatically. The fortnight is rolling — always the last 14 consecutive days.</InfoBox>
      </SectionCard>

      {/* ─── 12. HUSTLE SCORE ─── */}
      <SectionCard id="hustle-score" title="12. Hustle Score (Gamification)">
        <P>Side menu → <B>"Hustle"</B>.</P>

        <SubSection title="How to earn XP">
          <SimpleTable
            headers={["Action", "XP", "Note"]}
            rows={[
              ["Create job", "5 XP", "—"],
              ["Complete job", "20 XP", "—"],
              ["Create invoice", "50 XP", "2x if Golden Hour"],
              ["Golden Hour", "100 XP", "Invoice within 60 min after completing a job"],
              ["Invoice paid (on time)", "100 XP", "—"],
              ["Invoice paid (late)", "80 XP", "—"],
              ["Log expense", "100 XP", "120 XP if deductible"],
              ["Referral (successful)", "500 XP", "Converted referral"],
              ["3-day streak", "+5 XP", "Cumulative bonus"],
              ["7-day streak", "+10 XP", "Cumulative bonus"],
              ["14-day streak", "+30 XP", "Cumulative bonus"],
            ]}
          />
        </SubSection>

        <SubSection title="Tiers (Levels per Fiscal Semester)">
          <P>Progress is measured by <B>Australian fiscal semester</B>: S1 (Jul–Dec) and S2 (Jan–Jun). At the end of the semester, your tier is re-evaluated.</P>
          <SimpleTable
            headers={["Tier", "Attendance", "Semester XP", "Color", "Theme"]}
            rows={[
              ["Starter", "< 50%", "0 XP", "Teal", "Default"],
              ["Hustler", "50%+", "300 XP", "Royal Blue", "Blue tones"],
              ["Pro", "75%+", "700 XP", "Violet", "Purple tones"],
              ["Legend", "90%+", "1,500 XP", "Gold", "Dark background + gold"],
            ]}
          />
        </SubSection>

        <SubSection title="Tier Defense">
          <BulletList>
            <li>At the end of the semester: if you didn't reach the XP goal for your current tier, you <B>drop 1 tier</B></li>
            <li>If you exceeded the goal for the next tier, you <B>move up automatically</B></li>
            <li>Starter is always maintained (you can't lose it)</li>
          </BulletList>
        </SubSection>

        <SubSection title="Tax Savings Milestones">
          <P>When you reach savings milestones with deductible expenses, badges appear:</P>
          <SimpleTable
            headers={["Amount", "Equivalence"]}
            rows={[
              ["$100", "A week's groceries"],
              ["$200", "A nice dinner out"],
              ["$500", "A weekend getaway"],
              ["$1,000", "A month of phone/internet"],
              ["$2,000", "A return flight to Bali"],
              ["$5,000", "A car down payment"],
            ]}
          />
        </SubSection>

        <SubSection title="Expandable Cards">
          <BulletList>
            <li><B>Attendance</B> — Monthly grid with active/inactive days + percentage</li>
            <li><B>XP Breakdown</B> — Breakdown by action + Golden Hour</li>
            <li><B>All Tiers</B> — List of all levels with requirements</li>
            <li><B>Streak</B> — Consecutive days of use (max 14, then resets)</li>
          </BulletList>
        </SubSection>

        <InfoBox>If you go 3+ days without using the app, a "You're getting rusty!" overlay appears with a motivational message. Any action (opening the app, completing a job, creating an invoice) clears the overlay.</InfoBox>
      </SectionCard>

      {/* ─── 13. GOOGLE CALENDAR ─── */}
      <SectionCard id="google-calendar" title="13. Google Calendar">
        <SubSection title="Connect">
          <StepList>
            <li>Go to <B>Settings → Integrations</B></li>
            <li>Tap <B>"Connect"</B> (green button)</li>
            <li>Log in to Google and authorize</li>
            <li>Status changes to "Connected" (green badge)</li>
          </StepList>
        </SubSection>

        <SubSection title="Import Shifts">
          <StepList>
            <li>On the <B>Jobs</B> screen, tap the <B>Sync</B> icon</li>
            <li>A modal shows found events. Ozly filters using smart keywords (recognizes: shift, cleaning, bond clean, turno, trabalho, etc.)</li>
            <li>Select which ones to import with checkboxes</li>
            <li>Tap <B>"Review"</B> → configure contractor, business, and rate for each item</li>
            <li>Tap <B>"Import"</B></li>
          </StepList>
        </SubSection>

        <SubSection title="Disconnect">
          <P>Settings → <B>"Disconnect"</B> (red button). Previously imported jobs remain.</P>
        </SubSection>
      </SectionCard>

      {/* ─── 14. PERFIL ─── */}
      <SectionCard id="perfil" title="14. Profile">
        <SubSection title="How to get there">
          <BulletList>
            <li>Side menu → Tap the avatar or name</li>
            <li>Settings → "Edit Profile"</li>
          </BulletList>
        </SubSection>

        <SubSection title="Personal Information">
          <BulletList>
            <li><B>Avatar</B> — Camera / Gallery / Delete</li>
            <li><B>Name</B> — max 100 chars</li>
            <li><B>Address</B> — Full (street, apt, suburb, state, postcode)</li>
            <li><B>Phone</B> — format: +61 400 000 000</li>
            <li><B>Email</B> — read-only</li>
            <li><B>Country of Origin</B> — for reference</li>
            <li><B>Referral Code</B> — auto-generated, shareable</li>
          </BulletList>
        </SubSection>

        <SubSection title="Manage Businesses/ABNs">
          <P>List of ABNs with name, number, and category. Tap to edit:</P>
          <BulletList>
            <li><B>ABN</B> — 11 digits (validated)</li>
            <li><B>Company Name</B> — business name</li>
            <li><B>Category</B> — Cleaning, Gardening, Construction, Hospitality, Delivery, IT, Trades, Healthcare, Education, Retail, Other</li>
            <li><B>Hourly Rate</B> — default rate for jobs under this business</li>
            <li><B>BSB</B> — 6 digits (format XXX-XXX)</li>
            <li><B>Account Number</B> — bank account</li>
            <li><B>PayID</B> — email, phone, or ABN for instant payments</li>
          </BulletList>
          <P>Button <B>"+"</B> to add a new business. Use the <B>ABN selector</B> in the side menu to switch between businesses.</P>
        </SubSection>
      </SectionCard>

      {/* ─── 15. CONFIGURAÇÕES ─── */}
      <SectionCard id="settings" title="15. Settings">
        <P>Side menu → <B>"Settings"</B>.</P>

        <SubSection title="General">
          <BulletList>
            <li><B>Edit Profile</B> → goes to Profile</li>
            <li><B>Theme</B> — Personalized (changes with Hustle level), Light, Dark, System</li>
            <li><B>Juice (Effects)</B> — Toggle on/off (vibrations, animations, sounds)</li>
            <li><B>Week Start Day</B> — Monday to Sunday</li>
            <li><B>Invoice Messages</B> — Editable templates for sending and reminders. Placeholders: {"{name}"}, {"{number}"}, {"{amount}"}, {"{date}"}</li>
          </BulletList>
        </SubSection>

        <SubSection title="Language">
          <P>Português / English / Español</P>
        </SubSection>

        <SubSection title="Notifications">
          <P>Individual toggle for each notification type:</P>
          <BulletList>
            <li><B>Morning Briefing</B> — Daily summary at 7 AM</li>
            <li><B>End of Shift</B> — Post-job reminder</li>
            <li><B>Expense Reminder</B> — Wednesdays at noon</li>
            <li><B>Friday Sweeper</B> — Weekly summary</li>
            <li><B>Weekly Summary</B> — Stats on Sundays</li>
          </BulletList>
        </SubSection>

        <SubSection title="Integrations">
          <P>Google Calendar — see section 13.</P>
        </SubSection>

        <SubSection title="Help">
          <P><B>"Help Us Improve"</B> — Dialog with Country, How you found Ozly, Feedback.</P>
        </SubSection>

        <SubSection title="Account">
          <BulletList>
            <li><B>Subscription</B> — Pro (gold badge) or Starter (Upgrade button)</li>
            <li><B>Privacy Policy</B> and <B>Terms of Use</B> — external links</li>
            <li><B>Delete Account</B> (red) — Double confirmation. Deletes ALL data permanently.</li>
          </BulletList>
        </SubSection>
      </SectionCard>

      {/* ─── 16. ASSINATURA PRO ─── */}
      <SectionCard id="assinatura-pro" title="16. Pro Subscription">
        <P>Settings → <B>"Upgrade to Pro"</B> or tap any item that requires Pro.</P>

        <SubSection title="Available Plans">
          <SimpleTable
            headers={["Plan", "Price", "Includes"]}
            rows={[
              ["TFN ($9/mo)", "For individual contractors", "Shifts, OCR Expenses, Visa Shield, Calendar Sync, Taxes, Contractors"],
              ["ABN ($15/mo)", "For businesses with ABN", "Everything in TFN + PDF Invoices, Hours Comparison, Multiple Businesses"],
              ["MAX ($19/mo)", "TFN + ABN combined", "Full access to all features + switch between TFN ↔ ABN mode"],
            ]}
          />
          <BulletList>
            <li><B>14-day free trial</B> on all plans</li>
            <li>Options: <B>Annual</B> (recommended) and <B>Monthly</B></li>
            <li>Prices may vary by region (managed via RevenueCat)</li>
          </BulletList>
        </SubSection>

        <SubSection title="Actions">
          <SimpleTable
            headers={["Action", "What it does"]}
            rows={[
              ["Subscribe", "Starts native purchase (App Store / Google Play)"],
              ["Restore Purchases", "Recovers a previous subscription"],
              ["Terms / Privacy", "Opens links"],
              ["X (close)", "Returns without subscribing"],
            ]}
          />
        </SubSection>
      </SectionCard>

      {/* ─── 17. MODO OFFLINE ─── */}
      <SectionCard id="modo-offline" title="17. Offline Mode and Sync">
        <P>Ozly is <B>offline-first</B> — all data is stored on your phone in an encrypted database (SQLCipher).</P>

        <SimpleTable
          headers={["Situation", "Behavior"]}
          rows={[
            ["With internet", "Syncs every 90s (active) or 5 min (idle)"],
            ["Without internet", 'Shows "Offline" in the App Bar. Everything works locally'],
            ["Reconnection", "Immediate automatic sync"],
            ["Pull-to-refresh", "Forces full manual sync"],
          ]}
        />

        <SubSection title="Sync Queue">
          <BulletList>
            <li>Offline operations are queued</li>
            <li>On reconnection: queue is processed automatically</li>
            <li>Up to 10 retries per operation with exponential backoff</li>
            <li>Every 6 hours: full reconciliation</li>
          </BulletList>
        </SubSection>

        <SubSection title="Visual Indicators">
          <BulletList>
            <li>Crossed-out cloud = offline</li>
            <li>Sync with issue = error</li>
            <li>"You're offline" banner on list screens</li>
            <li>"Last sync" timestamp in the side menu</li>
          </BulletList>
        </SubSection>
      </SectionCard>

      {/* ─── 18. INDICAÇÃO ─── */}
      <SectionCard id="indicacao" title="18. Referral">
        <StepList>
          <li>On the Dashboard, find the green <B>"Earn 1 Free Month"</B> card</li>
          <li>Tap the card</li>
          <li>The share sheet opens with a pre-formatted message</li>
          <li>Send via WhatsApp, SMS, Email, Telegram, or any app</li>
        </StepList>
        <InfoBox>The message is in the app's language (PT, EN, or ES).</InfoBox>
      </SectionCard>

      {/* ─── 19. NOTIFICAÇÕES ─── */}
      <SectionCard id="notificacoes" title="19. Automatic Notifications">
        <P>Ozly sends smart local notifications:</P>
        <SimpleTable
          headers={["Notification", "When", "What it shows"]}
          rows={[
            ["Morning Briefing", "Every day at 7:00 AM", "Today's jobs + overdue invoices"],
            ["End of Shift", "15 min after job ends", "Complete and invoice this job"],
            ["Expense Reminder", "Wednesdays at 12:00 PM", "Log your receipts from the week"],
            ["Friday Sweeper", "Fridays at 4:00 PM", "Weekly summary"],
            ["Weekly Summary", "Sundays at 6:00 PM", "Weekly stats"],
          ]}
        />
        <P>On tap: navigates to the relevant screen. Buttons: "Complete", "Snooze 1h", "Mark Paid".</P>
      </SectionCard>

      {/* ─── 20. SEGURANÇA ─── */}
      <SectionCard id="seguranca" title="20. Security and Privacy">
        <SimpleTable
          headers={["Layer", "Protection"]}
          rows={[
            ["Local database", "Encrypted with SQLCipher"],
            ["Tokens", "Stored in SecureStorage"],
            ["Server", "Row-Level Security — you only see your data"],
            ["Photos", "Signed URLs that expire in 1 hour"],
            ["Uploads", "Filenames with timestamps"],
            ["Forms", "maxLength on all fields"],
            ["Logs", "Never record TFN, BSB, passwords, tokens"],
            ["Errors", "Generic messages shown to the user"],
          ]}
        />
        <SubSection title="Data Deletion">
          <P>Settings → Delete Account → double confirmation. Removes: profile, businesses, jobs, invoices, expenses, contractors, hours, events. LGPD/GDPR compliant.</P>
        </SubSection>
      </SectionCard>

      {/* ─── 21. CAMINHOS ALTERNATIVOS ─── */}
      <SectionCard id="caminhos-alternativos" title="21. All Alternative Paths">
        <SubSection title="Create Invoice (6 paths)">
          <StepList>
            <li>Financial → "+" or FAB</li>
            <li>Dashboard → "To Invoice" → select jobs → "Generate Invoice"</li>
            <li>Dashboard → Next Shift → Complete → "Generate Invoice"</li>
            <li>Dashboard → Forecast → "To Invoice" → tap the job</li>
            <li>Contractors → tap → "Create Invoice"</li>
            <li>Financial → tap the invoice → "Edit"</li>
          </StepList>
        </SubSection>

        <SubSection title="Create Job (3 paths)">
          <StepList>
            <li>Jobs → FAB "+ New Job"</li>
            <li>Dashboard → Next Shift → "Add Job"</li>
            <li>Contractors → tap → "Create Job"</li>
          </StepList>
        </SubSection>

        <SubSection title="Create Expense (2 paths)">
          <StepList>
            <li>Expenses → FAB "Add Expense"</li>
            <li>Dashboard → Deductible Expenses → "New Expense"</li>
          </StepList>
        </SubSection>

        <SubSection title="Create Contractor (3 paths)">
          <StepList>
            <li>Contractors → FAB "+ Add Contractor"</li>
            <li>Create Invoice → dropdown → "New Client"</li>
            <li>Create Job → dropdown → "New Client"</li>
          </StepList>
        </SubSection>

        <SubSection title="Create Business/ABN (3 paths)">
          <StepList>
            <li>Profile → Businesses section → "+"</li>
            <li>Create Invoice → business dropdown → "New ABN"</li>
            <li>Add Expense → "Add Business"</li>
          </StepList>
        </SubSection>

        <SubSection title="Access Profile (3 paths)">
          <StepList>
            <li>Drawer → tap the avatar</li>
            <li>Drawer → tap the name</li>
            <li>Settings → "Edit Profile"</li>
          </StepList>
        </SubSection>

        <SubSection title="Mark Invoice as Paid (3 paths)">
          <StepList>
            <li>Financial → tap the invoice → "Mark as Paid"</li>
            <li>Dashboard → Notifications → tap the invoice → "Mark as Paid"</li>
            <li>Dashboard → "Overdue" → notifications → "Mark as Paid"</li>
          </StepList>
        </SubSection>
      </SectionCard>

      {/* ─── 22. FAQ ─── */}
      <SectionCard id="faq" title="22. Frequently Asked Questions (FAQ)">
        <SubSection title="Account">
          <div className="space-y-2">
            <FaqItem q="Can I use it without an ABN?" a="Yes! ABN is optional during sign-up. Complete it when you create your first invoice." />
            <FaqItem q="Can I have multiple ABNs?" a="Yes! Add as many ABNs as you want in your Profile. Use the selector in the side menu to switch between them." />
            <FaqItem q="Can I change my visa type later?" a="Yes. Profile → Visa Type. Tax and Medicare calculations are automatically recalculated." />
            <FaqItem q="I forgot my password, what now?" a='Login screen → "Forgot Password?" → enter email → a reset link arrives by email.' />
          </div>
        </SubSection>

        <SubSection title="Jobs">
          <div className="space-y-2">
            <FaqItem q="What if I work without an invoice (cash payment)?" a='Check "Skip Invoice" when creating the job. It counts toward hours (Visa Shield) but won&#39;t appear in "To Invoice".' />
            <FaqItem q="Can I attach a payment receipt?" a='Yes. In the job details → "Add Receipt" → camera or gallery.' />
            <FaqItem q='What is the "Golden Hour"?' a="If you create an invoice within 60 minutes of completing a job, you earn 2x XP (100 instead of 50)." />
          </div>
        </SubSection>

        <SubSection title="Invoices">
          <div className="space-y-2">
            <FaqItem q="Is the invoice number automatic?" a="Yes (INV-0001, INV-0002...). But you can customize it by tapping the field." />
            <FaqItem q="Does the invoice serve as an official Tax Invoice?" a="Yes, as long as it contains ABN, date, description, amount, and GST (if registered). Ozly's PDF includes everything." />
            <FaqItem q="Do I need to register for GST?" a="If your annual revenue exceeds $75,000. Ozly automatically warns you with a Dashboard alert." />
            <FaqItem q="Can I send an invoice via WhatsApp?" a='Yes. After creating → choose "WhatsApp" → the PDF is sent directly in the chat.' />
          </div>
        </SubSection>

        <SubSection title="Expenses">
          <div className="space-y-2">
            <FaqItem q="Does OCR always work?" a="It works best with clear receipts. If it fails, fill in manually. Ozly warns you when confidence is low." />
            <FaqItem q="How much can I deduct?" a="It depends on how many items in the category are work-related. E.g., if 2 out of 3 items apply, 66% of the amount is deducted." />
            <FaqItem q="Do I need to keep the receipts?" a="The ATO requires keeping records for 5 years. The photo in Ozly counts as a digital record." />
          </div>
        </SubSection>

        <SubSection title="Fiscal">
          <div className="space-y-2">
            <FaqItem q="Do the calculations replace an accountant?" a="No. These are estimates based on ATO 2024-26 tax tables. Use the exported report as a basis for your accountant." />
            <FaqItem q='What is "Tax Resident"?' a="If you've been in Australia 183+ days in the fiscal year. Residents have a $18,200 tax-free threshold." />
          </div>
        </SubSection>

        <SubSection title="Visa Shield">
          <div className="space-y-2">
            <FaqItem q="Is the 48h limit per employer or total?" a="Total. Visa Shield adds up hours from ALL your ABNs/businesses." />
            <FaqItem q="Is the fortnight fixed?" a="Rolling — always the last 14 consecutive days." />
          </div>
        </SubSection>

        <SubSection title="Hustle Score">
          <div className="space-y-2">
            <FaqItem q="How does tier defense work?" a="At each fiscal semester (Jul-Dec / Jan-Jun), your tier is re-evaluated. If you don't reach the XP goal for your current tier, you drop one level. If you exceed the goal for the next tier, you move up automatically." />
            <FaqItem q="What happens if I go days without using it?" a="After 3+ days without opening the app, a 'You're getting rusty!' overlay appears with a motivational message. Any action clears the overlay." />
            <FaqItem q="What is the Golden Hour?" a="If you create an invoice within 60 minutes of completing a job, you earn 2x XP (100 instead of 50). A timer appears on the job completion screen." />
          </div>
        </SubSection>

        <SubSection title="Referral">
          <div className="space-y-2">
            <FaqItem q="How does the referral work?" a="Share your referral link from the Dashboard or Profile. When someone signs up through your link, you earn 500 XP." />
          </div>
        </SubSection>

        <SubSection title="Subscription">
          <div className="space-y-2">
            <FaqItem q="What's the difference between TFN, ABN, and MAX?" a="TFN ($9/mo): for individual contractors — shifts, expenses, taxes, Visa Shield. ABN ($15/mo): everything in TFN + PDF invoices, multiple businesses, hours comparison. MAX ($19/mo): TFN + ABN combined with mode switching." />
            <FaqItem q="Is the trial really free?" a="Yes! 14 days of full access with no charge. Cancel anytime through the App Store or Google Play before the trial ends." />
          </div>
        </SubSection>

        <SubSection title="Offline">
          <div className="space-y-2">
            <FaqItem q="Does it work without internet?" a="100%. Create, edit, view everything offline. Syncs automatically when you have a connection." />
            <FaqItem q="What if I edit the same thing offline on two phones?" a="Ozly uses timestamp-based resolution — the most recent version wins. For critical conflicts, a manual resolution screen appears." />
          </div>
        </SubSection>
      </SectionCard>
    </>
  );
}
