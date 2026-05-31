// Demo data for the /dashboard route when the org is freshly created and has
// no real transactional data yet. Reuses the same name palette as the demo
// timeline in activity.tsx so the whole product reads as one coherent "preview
// org" until the real data flows in.
//
// All timestamps are anchored to render-time so the demo never goes stale.
// The numbers are tuned to look like a real ~25-seat cleaning company doing
// ~$15k/mo in sub-contractor invoices.

export interface DashboardKpi {
  outstanding: number;   // AUD
  overdue: number;       // AUD
  paidPeriod: number;    // AUD
  activeSubs: number;
}

export interface DashboardKpiTrend {
  outstanding: number[]; // 14 days, oldest → newest
  overdue: number[];
  paid: number[];
  active: number[];
}

export interface DashboardKpiDelta {
  outstanding: { direction: 'up' | 'down' | 'flat'; pct: number };
  overdue:     { direction: 'up' | 'down' | 'flat'; pct: number };
  paid:        { direction: 'up' | 'down' | 'flat'; pct: number };
  active:      { direction: 'up' | 'down' | 'flat'; abs: number };
}

export interface RevenuePoint {
  date: string;   // YYYY-MM-DD
  paid: number;   // AUD that day
}

export interface StatusMix {
  paid: number;
  sent: number;
  overdue: number;
  draft: number;
}

export interface TopSub {
  id: string;
  name: string;
  email: string;
  totalPaid: number;
  jobsDone: number;
}

export interface UpcomingJob {
  id: string;
  title: string;
  subName: string;
  subEmail: string;
  startsAt: string;     // ISO
  durationHours: number;
  value: number;        // AUD
}

export const MOCK_KPIS: DashboardKpi = {
  outstanding: 12_430.0,
  overdue:      1_820.0,
  paidPeriod:   4_650.0,
  activeSubs:        23,
};

export const MOCK_KPI_DELTAS: DashboardKpiDelta = {
  outstanding: { direction: 'up',   pct: 5.2 },
  overdue:     { direction: 'down', pct: 12.1 },
  paid:        { direction: 'up',   pct: 8.4 },
  active:      { direction: 'up',   abs: 2 },
};

// 14 plausible-looking values, monotonic-ish. Higher = bigger movement.
export const MOCK_KPI_TRENDS: DashboardKpiTrend = {
  outstanding: [9100, 9400, 9800, 10200, 10500, 10900, 11100, 11400, 11700, 11900, 12100, 12200, 12350, 12430],
  overdue:     [2400, 2350, 2280, 2200, 2150, 2080, 2020, 1980, 1940, 1900, 1880, 1850, 1830, 1820],
  paid:        [2800, 2900, 3050, 3200, 3300, 3450, 3600, 3750, 3900, 4050, 4200, 4350, 4500, 4650],
  active:      [  18,   19,   19,   20,   20,   21,   21,   22,   22,   22,   22,   22,   23,   23],
};

/**
 * N-day revenue trend ending today. Light volatility, weekend dips.
 * `days` lets the dashboard period filter resize the line without
 * regenerating the mock shape — 7/30/90/etc all share the same DNA.
 */
export function buildMockRevenueTrend(days: number = 30): RevenuePoint[] {
  const safeDays = Math.max(1, Math.min(days, 365));
  const out: RevenuePoint[] = [];
  const today = new Date();
  // Base values per weekday (Mon=1..Sun=0). Weekends quieter.
  const byDow = [180, 720, 680, 740, 820, 880, 410]; // Sun..Sat
  for (let i = safeDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const base = byDow[d.getDay()]!;
    // Deterministic ripple so the line has character but doesn't flicker
    // between renders. The (i * 37) % 13 pattern keeps the same shape per day.
    const ripple = ((i * 37) % 13) * 14 - 80;
    const value = Math.max(0, base + ripple);
    out.push({ date: d.toISOString().slice(0, 10), paid: value });
  }
  return out;
}

/**
 * Scale the headline KPIs / status mix proportionally to a date range.
 * The default mocks are tuned for ~30 days; this just shrinks/expands them
 * for shorter/longer windows so the dashboard "feels" responsive when the
 * user switches periods.
 */
export function scaleByDays<T extends Record<string, number>>(base: T, days: number): T {
  const factor = Math.max(1, days) / 30;
  const out = {} as Record<string, number>;
  for (const k of Object.keys(base)) {
    out[k] = Math.round(base[k]! * factor);
  }
  return out as T;
}

export const MOCK_STATUS_MIX: StatusMix = {
  paid: 18_640,
  sent:  6_120,
  overdue: 1_820,
  draft:    340,
};

export const MOCK_TOP_SUBS: TopSub[] = [
  { id: 'm1', name: 'Maria Santos',  email: 'maria.santos@example.com',  totalPaid: 1_820, jobsDone: 14 },
  { id: 'm2', name: 'João Pereira',  email: 'joao.pereira@example.com',  totalPaid: 1_650, jobsDone: 12 },
  { id: 'm3', name: 'Akira Tanaka',  email: 'akira.tanaka@example.com',  totalPaid: 1_420, jobsDone: 11 },
  { id: 'm4', name: 'Lucas Ribeiro', email: 'lucas.ribeiro@example.com', totalPaid: 1_180, jobsDone:  9 },
  { id: 'm5', name: 'Sofia Costa',   email: 'sofia.costa@example.com',   totalPaid:   980, jobsDone:  8 },
];

export function buildMockUpcomingJobs(): UpcomingJob[] {
  const now = Date.now();
  const inHours = (h: number) => new Date(now + h * 60 * 60 * 1000).toISOString();
  return [
    { id: 'j1', title: 'Office clean — Surry Hills', subName: 'João Pereira',  subEmail: 'joao.pereira@example.com',  startsAt: inHours(4),  durationHours: 4, value: 220 },
    { id: 'j2', title: 'End-of-lease — Bondi',       subName: 'Maria Santos',  subEmail: 'maria.santos@example.com',  startsAt: inHours(22), durationHours: 6, value: 380 },
    { id: 'j3', title: 'Weekly office — CBD',        subName: 'Akira Tanaka',  subEmail: 'akira.tanaka@example.com',  startsAt: inHours(50), durationHours: 3, value: 165 },
    { id: 'j4', title: 'Carpet shampoo — Parramatta', subName: 'Lucas Ribeiro', subEmail: 'lucas.ribeiro@example.com', startsAt: inHours(74), durationHours: 4, value: 240 },
    { id: 'j5', title: 'Strata common areas',         subName: 'Sofia Costa',   subEmail: 'sofia.costa@example.com',  startsAt: inHours(118), durationHours: 5, value: 290 },
  ];
}
