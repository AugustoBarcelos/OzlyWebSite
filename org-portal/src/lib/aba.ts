// ABA (Australian Bankers Association) batch payment file generator.
//
// Format reference: AusPayNet "Cemtex" standard. 120 chars per line, ASCII,
// CRLF line endings. Used by every AU bank for batch credit transfers.
//
// File structure:
//   Record 0 (descriptive)   — header, one per file
//   Record 1 (detail)        — one per payment
//   Record 7 (totals)        — footer, one per file
//
// Total file must net to zero (credits − debits = 0). For pure outbound
// payouts that means the "indicator" is "C" (credit) and we balance via the
// running totals only.

export interface AbaPaymentRow {
  /** Destination BSB — 6 digits, format "123-456". */
  bsb: string;
  /** Destination account number — up to 9 digits, no dashes. */
  accountNumber: string;
  /** Account holder name shown on the receiver's statement (max 32 chars). */
  accountName: string;
  /** Amount in dollars (we convert to cents). Must be positive. */
  amountAud: number;
  /** Reference shown on receiver's statement (max 18 chars). */
  lodgementReference: string;
}

export interface AbaFileOptions {
  /** Sender BSB and account (the org's). 6+9 digits. */
  senderBsb: string;
  senderAccount: string;
  senderName: string;        // max 26 chars
  /** User-supplied financial-institution code (3 chars, e.g. "ANZ", "CBA", "WBC", "NAB"). */
  bankCode: string;
  /** Free-text description appearing on bank reports (max 12 chars). */
  description: string;
  /** Date for processing (YYYY-MM-DD). Defaults to today. */
  processingDate?: string;
}

function padRight(s: string, len: number): string {
  return (s ?? '').slice(0, len).padEnd(len, ' ');
}
function padLeft(s: string, len: number): string {
  return (s ?? '').slice(0, len).padStart(len, '0');
}
function normaliseBsb(bsb: string): string {
  // Accept "123456" or "123-456" → return "123-456" (with dash).
  const digits = bsb.replace(/\D/g, '');
  if (digits.length !== 6) return '000-000';
  return `${digits.slice(0, 3)}-${digits.slice(3)}`;
}
function cents(amount: number): number {
  return Math.round(amount * 100);
}
function ddmmyy(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(2);
  return `${dd}${mm}${yy}`;
}

function descriptiveRecord(opts: AbaFileOptions): string {
  // Type 0 record — 120 chars
  const proc = opts.processingDate ?? new Date().toISOString().slice(0, 10);
  return (
    '0' +                            // record type
    '                  ' +           // 18 blanks (reel sequence — leave empty)
    '01' +                           // reel sequence number
    padRight(opts.bankCode, 3) +     // bank code (eg ANZ)
    '       ' +                      // 7 blanks
    padRight(opts.senderName, 26) +  // user name
    '000000' +                       // user ID (NOT user APCS — use 6 zeroes when unknown)
    padRight(opts.description, 12) + // description
    ddmmyy(proc) +                   // processing date DDMMYY
    padRight('', 40)                 // 40 blanks
  );
}

function detailRecord(p: AbaPaymentRow): string {
  return (
    '1' +
    normaliseBsb(p.bsb) +                                     // 7 chars (123-456)
    padLeft(p.accountNumber.replace(/\D/g, ''), 9) +          // 9 chars
    ' ' +                                                     // indicator (blank = normal)
    '50' +                                                    // transaction code 50 = General Credit
    padLeft(String(cents(p.amountAud)), 10) +                 // amount in cents
    padRight(p.accountName, 32) +                             // account title
    padRight(p.lodgementReference, 18) +                      // lodgement reference
    '000-000' +                                               // trace BSB — placeholder
    '000000000' +                                             // trace account — placeholder
    padRight('Ozly', 16) +                                    // remitter (sender name on receiver's statement)
    padLeft('0', 8)                                           // withholding tax amount (0)
  );
}

function totalRecord(payments: AbaPaymentRow[]): string {
  const totalCents = payments.reduce((sum, p) => sum + cents(p.amountAud), 0);
  // For a credit-only file, net total == credit total == debit total (banks
  // expect the totals to balance to 0; the convention is to repeat the net).
  return (
    '7' +
    '999-999' +                              // BSB filler 999-999
    padRight('', 12) +                       // 12 blanks
    padLeft(String(totalCents), 10) +        // net total cents
    padLeft(String(totalCents), 10) +        // credit total cents
    padLeft(String(totalCents), 10) +        // debit total cents
    padRight('', 24) +                       // 24 blanks
    padLeft(String(payments.length), 6) +    // count of detail records
    padRight('', 40)                         // 40 blanks
  );
}

export function generateAbaFile(opts: AbaFileOptions, payments: AbaPaymentRow[]): string {
  const lines: string[] = [
    descriptiveRecord(opts),
    ...payments.map(detailRecord),
    totalRecord(payments),
  ];
  // ABA spec mandates CRLF.
  return lines.join('\r\n') + '\r\n';
}

export function downloadAbaFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=us-ascii' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
