/**
 * Users — paginated list with multi-filter, bulk actions and CSV export.
 *
 * Default tela in /users (replaces the old search-only screen).
 *
 *  - URL persists filters + sort + page so links are bookmarkable.
 *  - Stat ribbon counts the filtered set (so the chips match the table).
 *  - Status / plan badges are coloured (BRIEFING § 11.3 redesign).
 *  - Bulk-select via checkbox column → BulkActionsBar (grant promo / CSV).
 *  - "Conceder em massa" calls admin_bulk_grant_promo (capped 100/req).
 *
 * Backend: admin_list_users(p_filters jsonb, p_sort, p_limit, p_offset).
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { callRpc, RpcError } from '@/lib/rpc';
import { track } from '@/lib/posthog';
import { Avatar } from '@/components/Avatar';
import { Spinner } from '@/components/Spinner';
import { AlertTriangleIcon } from '@/components/Icons';
import { useToast } from '@/components/Toast';
import { FiltersBar } from './FiltersBar';
import { StatRibbon } from './StatRibbon';
import { BulkActionsBar } from './BulkActionsBar';
import { PlanBadge, RoleBadge, StatusBadge } from './badges';
import {
  EMPTY_FILTERS,
  filtersToRpc,
  filtersToSearchParams,
  searchParamsToFilters,
  type SortKey,
  type UserFilters,
  type UserListResponse,
  type UserListRow,
  type UserPlan,
  type UserStatus,
} from './types';

const PAGE_SIZE = 50;

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

function formatRelative(iso: string | null): string {
  if (!iso) return 'nunca';
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return '—';
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'agora';
  if (m < 60) return `há ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `há ${d}d`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `há ${mo}mo`;
  return `há ${Math.floor(mo / 12)}a`;
}

function csvEscape(v: string | number | boolean | null | undefined): string {
  const s = v === null || v === undefined ? '' : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function rowsToCsv(rows: UserListRow[]): string {
  const head = [
    'id',
    'full_name',
    'email_masked',
    'role',
    'plan',
    'status',
    'is_active',
    'monthly_price_aud',
    'signup_date',
    'last_seen_at',
    'last_seen_country',
    'last_seen_platform',
    'last_seen_app_version',
    'state',
    'is_banned',
    'is_deleted',
  ];
  const body = rows.map((r) =>
    [
      r.id,
      r.full_name ?? '',
      r.email_masked,
      r.role,
      r.plan,
      r.status,
      r.is_active,
      r.monthly_price_aud ?? '',
      r.signup_date,
      r.last_seen_at ?? '',
      r.last_seen_country ?? '',
      r.last_seen_platform ?? '',
      r.last_seen_app_version ?? '',
      r.state ?? '',
      r.is_banned,
      r.is_deleted,
    ]
      .map(csvEscape)
      .join(','),
  );
  return [head.join(','), ...body].join('\n');
}

function downloadCsv(name: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function UserListPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sp, setSp] = useSearchParams();

  const initial = useMemo(() => searchParamsToFilters(sp), [sp]);
  const [filters, setFilters] = useState<UserFilters>(initial.filters);
  const [sort, setSort] = useState<SortKey>(initial.sort);
  const [page, setPage] = useState<number>(Math.max(0, Number(sp.get('page') ?? '0')));

  const [data, setData] = useState<UserListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Debounce the query so typing doesn't fire one RPC per keystroke.
  const [debouncedQuery, setDebouncedQuery] = useState(filters.query);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(filters.query), 300);
    return () => clearTimeout(t);
  }, [filters.query]);

  // Persist to URL whenever filters/sort/page change. Also reset page when
  // the filter set itself changes (so we don't land on an empty page).
  useEffect(() => {
    const next = filtersToSearchParams(
      { ...filters, query: debouncedQuery },
      sort,
    );
    if (page > 0) next.set('page', String(page));
    setSp(next, { replace: true });
  }, [filters, sort, page, debouncedQuery, setSp]);

  // Whenever any filter changes, drop the page back to 0. We watch the *string*
  // of the filter object so we don't depend on referential identity.
  const filterKey = useMemo(
    () => JSON.stringify({ ...filters, query: debouncedQuery }),
    [filters, debouncedQuery],
  );
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  useEffect(() => {
    if (filterKey !== lastFilterKey) {
      setPage(0);
      setLastFilterKey(filterKey);
    }
  }, [filterKey, lastFilterKey]);

  // Fetch on every relevant change.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const filtersRpc = filtersToRpc({ ...filters, query: debouncedQuery });
    track('admin_user_list', {
      filters: Object.keys(filtersRpc),
      sort,
      page,
    });

    callRpc<UserListResponse>('admin_list_users', {
      p_filters: filtersRpc,
      p_sort: sort,
      p_limit: PAGE_SIZE,
      p_offset: page * PAGE_SIZE,
    })
      .then((d) => {
        if (cancelled) return;
        setData(d);
        // Drop selections that are no longer on the visible page.
        setSelected((prev) => {
          const ids = new Set(d.rows.map((r) => r.id));
          const next = new Set<string>();
          prev.forEach((id) => {
            if (ids.has(id)) next.add(id);
          });
          return next;
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg =
          err instanceof RpcError ? err.message : 'Falha ao listar usuários.';
        setError(msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filters, debouncedQuery, sort, page]);

  const rows = data?.rows ?? [];
  const totalFiltered = data?.total_filtered ?? 0;
  const totalUnfiltered = data?.total_unfiltered ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const allOnPageSelected =
    rows.length > 0 && rows.every((r) => selected.has(r.id));

  const toggleAllOnPage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        rows.forEach((r) => next.delete(r.id));
      } else {
        rows.forEach((r) => next.add(r.id));
      }
      return next;
    });
  };

  const toggleStatus = (s: UserStatus) => {
    const has = filters.statuses.includes(s);
    setFilters({
      ...filters,
      statuses: has
        ? filters.statuses.filter((x) => x !== s)
        : [...filters.statuses, s],
    });
  };
  const togglePlan = (p: UserPlan) => {
    const has = filters.plans.includes(p);
    setFilters({
      ...filters,
      plans: has ? filters.plans.filter((x) => x !== p) : [...filters.plans, p],
    });
  };

  const exportFiltered = async () => {
    if (totalFiltered > 10_000) {
      toast({
        title: 'Resultado muito grande',
        description: 'Refine os filtros — export limitado a 10k linhas.',
        variant: 'error',
      });
      return;
    }
    setLoading(true);
    try {
      const filtersRpc = filtersToRpc({ ...filters, query: debouncedQuery });
      const out: UserListRow[] = [];
      const PAGE = 200;
      for (let off = 0; off < totalFiltered && out.length < 10_000; off += PAGE) {
        const chunk = await callRpc<UserListResponse>('admin_list_users', {
          p_filters: filtersRpc,
          p_sort: sort,
          p_limit: PAGE,
          p_offset: off,
        });
        out.push(...chunk.rows);
      }
      downloadCsv(`users-${new Date().toISOString().slice(0, 10)}.csv`, rowsToCsv(out));
      toast({
        title: `Exportado ${out.length.toLocaleString()} usuários`,
        variant: 'success',
      });
    } catch (err) {
      const msg = err instanceof RpcError ? err.message : 'Falha ao exportar.';
      toast({ title: 'Export falhou', description: msg, variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const exportSelected = () => {
    const slice = rows.filter((r) => selected.has(r.id));
    if (slice.length === 0) return;
    downloadCsv(
      `users-selected-${new Date().toISOString().slice(0, 10)}.csv`,
      rowsToCsv(slice),
    );
  };

  return (
    <section className="space-y-3">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-navy-700">Users</h1>
          <p className="text-sm text-navy-400">
            Lista completa com filtros, ações em massa e export. Clique numa linha
            pra abrir o perfil 360.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <SortPicker value={sort} onChange={setSort} />
          <button
            type="button"
            onClick={() => {
              void exportFiltered();
            }}
            disabled={loading || totalFiltered === 0}
            className="inline-flex items-center gap-1.5 rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs font-medium text-navy-600 transition-colors hover:border-brand-300 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ⬇ Exportar CSV
          </button>
        </div>
      </header>

      <FiltersBar
        filters={filters}
        onChange={(next) => setFilters(next)}
        loading={loading}
      />

      {data && (
        <StatRibbon
          totalUnfiltered={totalUnfiltered}
          totalFiltered={totalFiltered}
          stats={data.stats}
          filters={filters}
          onToggleStatus={toggleStatus}
          onTogglePlan={togglePlan}
        />
      )}

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
        >
          <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">
            <div className="font-medium">Falha</div>
            <div className="text-xs">{error}</div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-navy-100 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-navy-100 text-sm">
          <thead className="bg-navy-50 text-left text-[11px] font-medium uppercase tracking-wide text-navy-400">
            <tr>
              <th scope="col" className="w-10 px-3 py-2.5">
                <input
                  type="checkbox"
                  aria-label="Selecionar todos da página"
                  checked={allOnPageSelected}
                  onChange={toggleAllOnPage}
                  className="h-3.5 w-3.5 cursor-pointer accent-brand-500"
                />
              </th>
              <th scope="col" className="px-3 py-2.5">User</th>
              <th scope="col" className="px-3 py-2.5">Email</th>
              <th scope="col" className="px-3 py-2.5">Plano</th>
              <th scope="col" className="px-3 py-2.5">Status</th>
              <th scope="col" className="px-3 py-2.5">Role</th>
              <th scope="col" className="px-3 py-2.5">MRR</th>
              <th scope="col" className="px-3 py-2.5">Signup</th>
              <th scope="col" className="px-3 py-2.5">Últ. uso</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-50 bg-white">
            {loading && rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center">
                  <Spinner size="md" label="Carregando" />
                </td>
              </tr>
            )}

            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-sm text-navy-400">
                  Nenhum usuário bate com os filtros.
                </td>
              </tr>
            )}

            {rows.map((row) => {
              const isSel = selected.has(row.id);
              return (
                <tr
                  key={row.id}
                  className={[
                    'transition-colors',
                    isSel ? 'bg-brand-50/60' : 'hover:bg-navy-50',
                    row.is_banned ? 'opacity-70' : '',
                  ].join(' ')}
                >
                  <td className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      aria-label={`Selecionar ${row.full_name ?? row.id}`}
                      checked={isSel}
                      onChange={(e) => {
                        const next = new Set(selected);
                        if (e.target.checked) next.add(row.id);
                        else next.delete(row.id);
                        setSelected(next);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="h-3.5 w-3.5 cursor-pointer accent-brand-500"
                    />
                  </td>
                  <td
                    className="cursor-pointer px-3 py-2.5"
                    onClick={() => navigate(`/users/${row.id}`)}
                  >
                    <div className="flex items-center gap-2.5">
                      <Avatar userId={row.id} name={row.full_name} size="sm" />
                      <div className="flex flex-col leading-tight">
                        <span className="font-medium text-navy-700">
                          {row.full_name ?? '—'}
                        </span>
                        {(row.is_banned || row.is_deleted) && (
                          <span className="text-[10px] font-medium uppercase tracking-wide text-rose-600">
                            {row.is_banned ? 'banido' : 'deletado'}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td
                    className="cursor-pointer px-3 py-2.5 font-mono text-xs text-navy-600"
                    onClick={() => navigate(`/users/${row.id}`)}
                  >
                    {row.email_masked}
                  </td>
                  <td
                    className="cursor-pointer px-3 py-2.5"
                    onClick={() => navigate(`/users/${row.id}`)}
                  >
                    <PlanBadge plan={row.plan} />
                  </td>
                  <td
                    className="cursor-pointer px-3 py-2.5"
                    onClick={() => navigate(`/users/${row.id}`)}
                  >
                    <StatusBadge status={row.status} />
                  </td>
                  <td
                    className="cursor-pointer px-3 py-2.5"
                    onClick={() => navigate(`/users/${row.id}`)}
                  >
                    <RoleBadge role={row.role} />
                  </td>
                  <td
                    className="cursor-pointer px-3 py-2.5 font-mono text-xs text-navy-600"
                    onClick={() => navigate(`/users/${row.id}`)}
                  >
                    {row.monthly_price_aud != null
                      ? `$${row.monthly_price_aud.toFixed(2)}`
                      : '—'}
                  </td>
                  <td
                    className="cursor-pointer px-3 py-2.5 text-navy-500"
                    onClick={() => navigate(`/users/${row.id}`)}
                  >
                    {formatDate(row.signup_date)}
                  </td>
                  <td
                    className="cursor-pointer px-3 py-2.5 text-navy-500"
                    onClick={() => navigate(`/users/${row.id}`)}
                  >
                    {formatRelative(row.last_seen_at)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalFiltered > PAGE_SIZE && (
        <div className="flex items-center justify-between text-xs text-navy-500">
          <span>
            Página <strong className="text-navy-700">{page + 1}</strong> de{' '}
            <strong className="text-navy-700">{totalPages}</strong>
            <span className="ml-2 text-navy-300">
              ({(page * PAGE_SIZE + 1).toLocaleString()}–
              {Math.min((page + 1) * PAGE_SIZE, totalFiltered).toLocaleString()} de{' '}
              {totalFiltered.toLocaleString()})
            </span>
          </span>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
              className="rounded-md border border-navy-100 bg-white px-3 py-1.5 font-medium hover:border-brand-300 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ← Anterior
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1 || loading}
              className="rounded-md border border-navy-100 bg-white px-3 py-1.5 font-medium hover:border-brand-300 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Próxima →
            </button>
          </div>
        </div>
      )}

      {/* Bulk actions — sticky at bottom while ≥1 selected */}
      <BulkActionsBar
        selected={selected}
        rowsOnPage={rows}
        onClear={() => setSelected(new Set())}
        onExportSelected={exportSelected}
      />

      {/* Helper for first-time users */}
      {!error && rows.length === 0 && !loading && Object.keys(filters).length > 0 && (
        <button
          type="button"
          onClick={() => setFilters(EMPTY_FILTERS)}
          className="text-xs text-brand-700 underline"
        >
          Limpar todos os filtros
        </button>
      )}
    </section>
  );
}

function SortPicker({
  value,
  onChange,
}: {
  value: SortKey;
  onChange: (v: SortKey) => void;
}) {
  return (
    <label className="inline-flex items-center gap-1.5 rounded-md border border-navy-100 bg-white px-2 py-1.5 text-xs font-medium text-navy-600">
      <span className="text-navy-400">Ordenar:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortKey)}
        className="cursor-pointer bg-transparent pr-2 focus:outline-none"
      >
        <option value="signup_desc">Signup ↓</option>
        <option value="signup_asc">Signup ↑</option>
        <option value="last_seen_desc">Últ. uso ↓</option>
        <option value="last_seen_asc">Últ. uso ↑</option>
        <option value="mrr_desc">MRR ↓</option>
      </select>
    </label>
  );
}
