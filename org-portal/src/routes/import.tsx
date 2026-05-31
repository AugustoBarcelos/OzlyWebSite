// AI-assisted job import.
//
// Flow: upload a CSV/XLSX exported from another rostering platform → parse it
// client-side → send the raw rows to the `import-map` Edge Function (which asks
// Claude to map arbitrary columns into structured job offers) → match the
// member hints to real accepted members → preview / edit / deselect rows →
// bulk-create via the org_offer_work RPC.
//
// Graceful degradation: if the AI step fails or isn't configured, we drop into
// a manual column-mapping UI (pick which spreadsheet column feeds each target
// field), so the import still works with zero AI.
//
// Both CSV and Excel (.xlsx/.xls) are supported: Excel is parsed via SheetJS
// (`xlsx`), CSV via our own dependency-free parser in src/lib/csv.ts. Both end
// up as a string[][] matrix fed through rowsToObjects().

import { useCallback, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { useOrg } from '@/lib/org';
import { useToast } from '@/components/Toast';
import { Spinner } from '@/components/Spinner';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { BriefcaseIcon } from '@/components/Icons';
import { friendlyError } from '@/lib/errors';
import { parseCsv, rowsToObjects } from '@/lib/csv';
import * as XLSX from 'xlsx';
import type { OrgMembership } from '@/lib/types';

const MAX_ROWS = 200;

// Mirrors the import-map Edge Function output shape.
interface MappedRow {
  member_hint: string | null;
  title: string | null;
  start: string | null;
  end: string | null;
  location: string | null;
  notes: string | null;
  hourly_rate: number | null;
}

interface MemberOption {
  user_id: string;
  name: string;
  email: string;
  label: string;
}

// A preview row the admin edits before creating. `userId` is the resolved
// member (empty until matched/picked); the rest are editable strings.
interface DraftRow {
  id: number;
  selected: boolean;
  userId: string;
  title: string;
  start: string; // datetime-local value (yyyy-MM-ddTHH:mm) or ''
  end: string;
  location: string;
  notes: string;
  hourlyRate: string; // free text → parsed on submit
  memberHint: string | null;
  matched: boolean; // true when we auto-matched the hint to a member
  result?: 'ok' | 'error';
  resultMsg?: string;
}

type Stage = 'upload' | 'mapping' | 'preview';

// ── date helpers ──────────────────────────────────────────────────────────
function isoToLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Best-effort parse of an arbitrary date string the manual path may produce.
// Tries native Date first, then DD/MM/YYYY (Australian) numeric forms.
function looseToLocalInput(raw: string): string {
  if (!raw) return '';
  const native = new Date(raw);
  if (!Number.isNaN(native.getTime())) return isoToLocalInput(native.toISOString());
  const m = raw.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})(?:[ T](\d{1,2}):(\d{2}))?/);
  if (m) {
    const d = m[1] ?? '', mo = m[2] ?? '', y = m[3] ?? '', hh = m[4] ?? '0', mm = m[5] ?? '0';
    const year = y.length === 2 ? 2000 + Number(y) : Number(y);
    const dt = new Date(year, Number(mo) - 1, Number(d), Number(hh), Number(mm));
    if (!Number.isNaN(dt.getTime())) return isoToLocalInput(dt.toISOString());
  }
  return '';
}

// ── member matching ─────────────────────────────────────────────────────────
function norm(s: string): string {
  return s.trim().toLowerCase();
}

// Confident match: exact email, then exact name, then substring on name.
function matchMember(hint: string | null, members: MemberOption[]): string {
  if (!hint) return '';
  const h = norm(hint);
  const byEmail = members.find((m) => norm(m.email) === h);
  if (byEmail) return byEmail.user_id;
  const byName = members.find((m) => norm(m.name) === h);
  if (byName) return byName.user_id;
  const partial = members.filter((m) => m.name && (norm(m.name).includes(h) || h.includes(norm(m.name))));
  if (partial.length === 1 && partial[0]) return partial[0].user_id;
  return '';
}

const FIELD =
  'mt-1 w-full rounded-md border border-navy-100 bg-white px-2.5 py-1.5 text-sm text-navy-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100';
const CELL_INPUT =
  'w-full rounded-md border border-navy-100 bg-white px-2 py-1 text-sm text-navy-700 focus:border-brand-500 focus:outline-none';

// Target fields for the manual fallback mapping.
const TARGET_FIELDS = [
  { key: 'member_hint', label: 'Member (name/email)' },
  { key: 'title', label: 'Title' },
  { key: 'start', label: 'Start' },
  { key: 'end', label: 'End' },
  { key: 'location', label: 'Location' },
  { key: 'notes', label: 'Notes' },
  { key: 'hourly_rate', label: 'Hourly rate' },
] as const;
type TargetKey = (typeof TARGET_FIELDS)[number]['key'];

export function ImportPage() {
  const { currentOrg } = useOrg();
  const { notify } = useToast();
  const orgId = currentOrg?.id ?? null;

  const [members, setMembers] = useState<MemberOption[]>([]);
  const [stage, setStage] = useState<Stage>('upload');
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState('');

  // Parsed spreadsheet.
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);

  // Manual mapping state: target field → chosen header (or '').
  const [colMap, setColMap] = useState<Record<TargetKey, string>>({
    member_hint: '', title: '', start: '', end: '', location: '', notes: '', hourly_rate: '',
  });

  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [creating, setCreating] = useState(false);
  const [summary, setSummary] = useState<{ ok: number; failed: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Members are loaded lazily on first file upload (one query per org).
  const loadMembers = useCallback(async (): Promise<MemberOption[]> => {
    if (!orgId) return [];
    const { data: mem } = await supabase
      .from('org_memberships')
      .select('user_id')
      .eq('org_id', orgId)
      .eq('status', 'accepted');
    const ids = (mem ?? []).map((m) => (m as OrgMembership).user_id);
    if (ids.length === 0) return [];
    const { data: profs } = await supabase.from('profiles').select('id, full_name, email').in('id', ids);
    const opts = (profs ?? []).map((p) => {
      const r = p as { id: string; full_name: string | null; email: string };
      const name = r.full_name?.trim() ?? '';
      return { user_id: r.id, name, email: r.email ?? '', label: name || r.email };
    });
    setMembers(opts);
    return opts;
  }, [orgId]);

  // ── file upload + parse ────────────────────────────────────────────────────
  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSummary(null);
    const lower = file.name.toLowerCase();
    const isExcel = lower.endsWith('.xlsx') || lower.endsWith('.xls');
    if (!isExcel && !lower.endsWith('.csv')) {
      notify('Unsupported file type. Upload a .csv or .xlsx file.', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setBusy(true);
    setFileName(file.name);
    try {
      let matrix: string[][];
      if (isExcel) {
        // Read the first sheet as an array-of-arrays of strings (raw:false so
        // dates/numbers come through formatted, not as serial numbers).
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        const firstSheet = wb.SheetNames[0] ? wb.Sheets[wb.SheetNames[0]] : undefined;
        matrix = firstSheet
          ? (XLSX.utils.sheet_to_json(firstSheet, { header: 1, raw: false, defval: '' }) as unknown[][]).map(
              (row) => row.map((cell) => (cell == null ? '' : String(cell))),
            )
          : [];
      } else {
        matrix = parseCsv(await file.text());
      }
      const { headers: hdrs, rows } = rowsToObjects(matrix);
      if (rows.length === 0) {
        notify('That file had no data rows.', 'error');
        setBusy(false);
        return;
      }
      setHeaders(hdrs);
      setRawRows(rows);
      const mem = await loadMembers();
      // Try the AI mapping first; fall back to manual on any failure.
      await runAiMapping(rows, mem);
    } catch (err) {
      notify(friendlyError(err, 'Could not read that file.'), 'error');
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  // ── AI mapping via the import-map Edge Function ──────────────────────────────
  async function runAiMapping(rows: Record<string, string>[], mem: MemberOption[]) {
    const capped = rows.slice(0, MAX_ROWS);
    if (rows.length > MAX_ROWS) {
      console.warn(`[import] truncating ${rows.length} rows to first ${MAX_ROWS} for AI mapping`);
    }
    const { data, error } = await supabase.functions.invoke('import-map', {
      body: { rows: capped, headers },
    });
    const mapped: MappedRow[] | null =
      !error && data && (data as { ok?: boolean }).ok ? (data as { mapped: MappedRow[] }).mapped : null;
    if (!mapped) {
      // Surface why, then fall back to manual mapping.
      const msg =
        (data as { error?: string } | null)?.error ??
        friendlyError(error, 'AI mapping unavailable.');
      notify(`${msg} You can map columns manually instead.`, 'info');
      autoGuessColumns();
      setStage('mapping');
      return;
    }
    if ((data as { truncated?: boolean }).truncated) {
      notify(`Only the first ${MAX_ROWS} rows were mapped. Split larger files and import again.`, 'info');
    }
    setDrafts(mappedToDrafts(mapped, mem));
    setStage('preview');
  }

  function mappedToDrafts(mapped: MappedRow[], mem: MemberOption[]): DraftRow[] {
    return mapped.map((m, i) => {
      const userId = matchMember(m.member_hint, mem);
      return {
        id: i,
        selected: true,
        userId,
        title: m.title ?? '',
        start: isoToLocalInput(m.start),
        end: isoToLocalInput(m.end),
        location: m.location ?? '',
        notes: m.notes ?? '',
        hourlyRate: m.hourly_rate != null ? String(m.hourly_rate) : '',
        memberHint: m.member_hint,
        matched: !!userId,
      };
    });
  }

  // ── manual mapping fallback ──────────────────────────────────────────────────
  // Heuristic header guesses so the dropdowns start somewhere sensible.
  function autoGuessColumns() {
    const guess: Record<TargetKey, string> = {
      member_hint: '', title: '', start: '', end: '', location: '', notes: '', hourly_rate: '',
    };
    const pick = (...needles: string[]) =>
      headers.find((h) => needles.some((n) => h.toLowerCase().includes(n))) ?? '';
    guess.member_hint = pick('email', 'worker', 'staff', 'name', 'employee', 'contractor');
    guess.title = pick('title', 'job', 'task', 'service', 'description', 'work');
    guess.start = pick('start', 'from', 'begin', 'date');
    guess.end = pick('end', 'to', 'finish');
    guess.location = pick('location', 'address', 'site', 'suburb', 'place');
    guess.notes = pick('note', 'remark', 'comment', 'brief');
    guess.hourly_rate = pick('rate', 'hourly', 'pay', 'price');
    setColMap(guess);
  }

  function applyManualMapping() {
    const mapped: MappedRow[] = rawRows.slice(0, MAX_ROWS).map((row) => {
      const val = (k: TargetKey): string => (colMap[k] ? (row[colMap[k]] ?? '') : '');
      const rateRaw = val('hourly_rate').replace(/[^0-9.\-]/g, '');
      const rate = rateRaw ? Number(rateRaw) : NaN;
      return {
        member_hint: val('member_hint') || null,
        title: val('title') || null,
        start: looseToLocalInput(val('start')) || null,
        end: looseToLocalInput(val('end')) || null,
        location: val('location') || null,
        notes: val('notes') || null,
        hourly_rate: Number.isFinite(rate) ? rate : null,
      };
    });
    // looseToLocalInput already returns a datetime-local value, not ISO — adapt.
    const drafts: DraftRow[] = mapped.map((m, i) => {
      const userId = matchMember(m.member_hint, members);
      return {
        id: i,
        selected: true,
        userId,
        title: m.title ?? '',
        start: m.start ?? '',
        end: m.end ?? '',
        location: m.location ?? '',
        notes: m.notes ?? '',
        hourlyRate: m.hourly_rate != null ? String(m.hourly_rate) : '',
        memberHint: m.member_hint,
        matched: !!userId,
      };
    });
    setDrafts(drafts);
    setStage('preview');
  }

  // ── preview editing ──────────────────────────────────────────────────────────
  function patchDraft(id: number, patch: Partial<DraftRow>) {
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }

  const selectedValid = useMemo(
    () =>
      drafts.filter(
        (d) => d.selected && d.userId && d.title.trim() && d.start && d.end && new Date(d.end) > new Date(d.start),
      ),
    [drafts],
  );

  const selectedCount = drafts.filter((d) => d.selected).length;

  // ── bulk create via org_offer_work ──────────────────────────────────────────
  async function createJobs() {
    if (!orgId || selectedValid.length === 0) return;
    setCreating(true);
    setSummary(null);
    let ok = 0;
    let failed = 0;
    // Sequential — keeps RLS/RPC load gentle and lets us report per-row status.
    for (const d of drafts) {
      if (!d.selected) continue;
      const valid = d.userId && d.title.trim() && d.start && d.end && new Date(d.end) > new Date(d.start);
      if (!valid) {
        failed += 1;
        patchDraft(d.id, { result: 'error', resultMsg: 'Missing member, title or valid start/end' });
        continue;
      }
      const rateNum = d.hourlyRate.trim() ? Number(d.hourlyRate.replace(/[^0-9.\-]/g, '')) : null;
      const { error } = await supabase.rpc('org_offer_work', {
        p_org_id: orgId,
        p_member: d.userId,
        p_title: d.title.trim(),
        p_start: new Date(d.start).toISOString(),
        p_end: new Date(d.end).toISOString(),
        p_location: d.location.trim() || null,
        p_notes: d.notes.trim() || null,
        p_hourly_rate: rateNum != null && Number.isFinite(rateNum) ? rateNum : null,
      });
      if (error) {
        failed += 1;
        patchDraft(d.id, { result: 'error', resultMsg: friendlyError(error) });
      } else {
        ok += 1;
        patchDraft(d.id, { result: 'ok' });
      }
    }
    setCreating(false);
    setSummary({ ok, failed });
    if (ok > 0 && failed === 0) notify(`Offered ${ok} job${ok === 1 ? '' : 's'}`, 'success');
    else if (ok > 0) notify(`Offered ${ok}, ${failed} failed — see the rows below`, 'info');
    else notify('No jobs were created — check the errors below', 'error');
  }

  function reset() {
    setStage('upload');
    setHeaders([]);
    setRawRows([]);
    setDrafts([]);
    setSummary(null);
    setFileName('');
  }

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      <PageHeader
        kicker="Operations"
        title="Import work"
        subtitle="Upload a roster exported from another platform — we map the columns into job offers for you to review."
        action={
          stage !== 'upload' ? (
            <button
              onClick={reset}
              className="shrink-0 rounded-lg px-4 py-2 text-sm font-medium text-navy-600 ring-1 ring-navy-100 hover:bg-navy-50"
            >
              Start over
            </button>
          ) : undefined
        }
      />

      {!orgId ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : stage === 'upload' ? (
        <UploadCard busy={busy} fileName={fileName} onFile={onFile} fileInputRef={fileInputRef} membersEmpty={members.length === 0 && rawRows.length > 0} />
      ) : stage === 'mapping' ? (
        <ManualMapping
          headers={headers}
          rowCount={rawRows.length}
          colMap={colMap}
          setColMap={setColMap}
          onApply={applyManualMapping}
          onBack={reset}
        />
      ) : (
        <PreviewTable
          drafts={drafts}
          members={members}
          creating={creating}
          summary={summary}
          selectedCount={selectedCount}
          validCount={selectedValid.length}
          patchDraft={patchDraft}
          onCreate={createJobs}
          onManual={() => { autoGuessColumns(); setStage('mapping'); }}
        />
      )}
    </div>
  );
}

function UploadCard(props: {
  busy: boolean;
  fileName: string;
  onFile: (e: ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  membersEmpty: boolean;
}) {
  const { busy, fileName, onFile, fileInputRef, membersEmpty } = props;
  return (
    <div className="ozly-card p-8">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <BriefcaseIcon />
        </div>
        <h2 className="text-base font-semibold text-navy-800">Upload a roster file</h2>
        <p className="mt-1 text-sm text-navy-500">
          Accepts <span className="font-medium">.csv</span> and{' '}
          <span className="font-medium">.xlsx</span>. We send the rows to our AI to map columns —
          messy headers and date formats are fine.
        </p>
        {membersEmpty && (
          <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
            No members have accepted an invite yet — you can map the file, but jobs can only be
            offered to accepted members.
          </p>
        )}
        <label className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500">
          {busy && <Spinner size="sm" label="Reading" />}
          {busy ? 'Reading…' : fileName ? 'Choose another file' : 'Choose file'}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls,text/csv"
            onChange={onFile}
            disabled={busy}
            className="hidden"
          />
        </label>
        {fileName && !busy && <div className="mt-2 text-xs text-navy-400">{fileName}</div>}
      </div>
    </div>
  );
}

function ManualMapping(props: {
  headers: string[];
  rowCount: number;
  colMap: Record<TargetKey, string>;
  setColMap: React.Dispatch<React.SetStateAction<Record<TargetKey, string>>>;
  onApply: () => void;
  onBack: () => void;
}) {
  const { headers, rowCount, colMap, setColMap, onApply, onBack } = props;
  return (
    <div className="ozly-card p-6">
      <h2 className="text-base font-semibold text-navy-800">Map your columns</h2>
      <p className="mt-1 text-sm text-navy-500">
        Tell us which spreadsheet column feeds each field. {rowCount} row{rowCount === 1 ? '' : 's'} found.
        Leave a field blank to skip it.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {TARGET_FIELDS.map((f) => (
          <label key={f.key} className="block text-xs font-medium text-navy-600">
            {f.label}
            <select
              value={colMap[f.key]}
              onChange={(e) => setColMap((prev) => ({ ...prev, [f.key]: e.target.value }))}
              className={FIELD}
            >
              <option value="">— none —</option>
              {headers.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onBack} className="rounded-md px-3 py-2 text-sm font-medium text-navy-500 hover:bg-navy-50">
          Back
        </button>
        <button
          onClick={onApply}
          disabled={!colMap.member_hint && !colMap.title}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:bg-brand-300"
        >
          Preview rows
        </button>
      </div>
    </div>
  );
}

function PreviewTable(props: {
  drafts: DraftRow[];
  members: MemberOption[];
  creating: boolean;
  summary: { ok: number; failed: number } | null;
  selectedCount: number;
  validCount: number;
  patchDraft: (id: number, patch: Partial<DraftRow>) => void;
  onCreate: () => void;
  onManual: () => void;
}) {
  const { drafts, members, creating, summary, selectedCount, validCount, patchDraft, onCreate, onManual } = props;

  if (drafts.length === 0) {
    return (
      <EmptyState
        icon={<BriefcaseIcon />}
        title="Nothing to import"
        description="No rows were produced from that file. Try the manual column mapping."
        action={
          <button onClick={onManual} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500">
            Map columns manually
          </button>
        }
      />
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-navy-500">
          {selectedCount} selected · <span className="text-navy-700">{validCount} ready to offer</span>
          {selectedCount > validCount && (
            <span className="text-amber-600"> · {selectedCount - validCount} need a member or valid start/end</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onManual} className="rounded-md px-3 py-1.5 text-xs font-medium text-navy-600 ring-1 ring-navy-100 hover:bg-navy-50">
            Map columns manually
          </button>
          <button
            onClick={onCreate}
            disabled={creating || validCount === 0}
            className="flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:bg-brand-300"
          >
            {creating && <Spinner size="sm" label="Creating" />}
            {creating ? 'Creating…' : `Create ${validCount} job${validCount === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>

      {summary && (
        <div className="mb-3 rounded-lg border border-navy-100 bg-white px-4 py-2 text-sm">
          <span className="font-medium text-brand-700">{summary.ok} offered</span>
          {summary.failed > 0 && <span className="text-rose-700"> · {summary.failed} failed</span>}
        </div>
      )}

      <div className="ozly-card overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-navy-50 text-left text-xs text-navy-400">
              <th className="px-3 py-2 w-8"></th>
              <th className="px-3 py-2">Member</th>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Start</th>
              <th className="px-3 py-2">End</th>
              <th className="px-3 py-2">Location</th>
              <th className="px-3 py-2">Rate /h</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {drafts.map((d) => {
              const rowValid = d.userId && d.title.trim() && d.start && d.end && new Date(d.end) > new Date(d.start);
              return (
                <tr
                  key={d.id}
                  className={`border-b border-navy-50 last:border-0 ${d.selected ? '' : 'opacity-40'} ${
                    d.result === 'error' ? 'bg-rose-50/40' : d.result === 'ok' ? 'bg-brand-50/30' : ''
                  }`}
                >
                  <td className="px-3 py-2 align-top">
                    <input
                      type="checkbox"
                      checked={d.selected}
                      onChange={(e) => patchDraft(d.id, { selected: e.target.checked })}
                      className="mt-1 h-3.5 w-3.5 rounded border-navy-200 text-brand-600 focus:ring-brand-200"
                    />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <select
                      value={d.userId}
                      onChange={(e) => patchDraft(d.id, { userId: e.target.value })}
                      className={`${CELL_INPUT} ${!d.userId ? 'border-amber-300' : ''}`}
                    >
                      <option value="">— pick member —</option>
                      {members.map((m) => (
                        <option key={m.user_id} value={m.user_id}>{m.label}</option>
                      ))}
                    </select>
                    {d.memberHint && !d.matched && (
                      <div className="mt-0.5 text-[10px] text-amber-600" title="No confident match — pick the member">
                        from “{d.memberHint}”
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <input value={d.title} onChange={(e) => patchDraft(d.id, { title: e.target.value })} className={CELL_INPUT} />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <input type="datetime-local" value={d.start} onChange={(e) => patchDraft(d.id, { start: e.target.value })} className={`${CELL_INPUT} ${!d.start ? 'border-amber-300' : ''}`} />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <input type="datetime-local" value={d.end} onChange={(e) => patchDraft(d.id, { end: e.target.value })} className={`${CELL_INPUT} ${d.start && d.end && new Date(d.end) <= new Date(d.start) ? 'border-rose-300' : ''}`} />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <input value={d.location} onChange={(e) => patchDraft(d.id, { location: e.target.value })} className={CELL_INPUT} />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <input value={d.hourlyRate} onChange={(e) => patchDraft(d.id, { hourlyRate: e.target.value })} inputMode="decimal" className={`${CELL_INPUT} w-20`} />
                  </td>
                  <td className="px-3 py-2 align-top text-xs">
                    {d.result === 'ok' && <span className="text-brand-700">✓ offered</span>}
                    {d.result === 'error' && <span className="text-rose-700" title={d.resultMsg}>✕ {d.resultMsg}</span>}
                    {!d.result && !rowValid && d.selected && <span className="text-amber-600">incomplete</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
