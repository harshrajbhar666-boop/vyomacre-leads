import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Lock, Mail, Phone, MapPin, Download, Search, RefreshCw, LogOut, Users,
  TrendingUp, Clock, Check, X, Loader2, AlertCircle, IndianRupee, Building2,
  Handshake, GraduationCap, Sparkles, MessageSquare,
} from 'lucide-react';
import {
  loginAdmin, logoutAdmin, isLoggedIn, getLeads, getLeadStats,
  updateLeadStatus, downloadLeadsCsv,
} from '../services/api';

/* ============================================================
   Admin — login + lead inbox
   /admin par khulta hai. Token localStorage me rehta hai.
   ============================================================ */

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'converted', label: 'Converted' },
  { key: 'closed', label: 'Closed' },
];

const STATUS_STYLES = {
  new: 'border-[#00E585]/30 bg-[#00E585]/10 text-[#00E585]',
  contacted: 'border-sky-400/30 bg-sky-400/10 text-sky-300',
  qualified: 'border-violet-400/30 bg-violet-400/10 text-violet-300',
  converted: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  closed: 'border-[#2A3D32] bg-[#0F1A14] text-[#7E8D83]',
};

const TYPE_META = {
  investor: { label: 'Investor', icon: TrendingUp },
  owner: { label: 'Owner', icon: Building2 },
  company: { label: 'Company', icon: Handshake },
  student: { label: 'Student', icon: GraduationCap },
  other: { label: 'Other', icon: Sparkles },
};

const RANGE_LABELS = {
  under_50k: 'Under ₹50k',
  '50k_2l': '₹50k – ₹2L',
  '2l_10l': '₹2L – ₹10L',
  '10l_50l': '₹10L – ₹50L',
  '50l_plus': '₹50L +',
  undecided: 'Not decided',
};

const NEXT = [
  { key: 'contacted', label: 'Contacted' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'converted', label: 'Converted' },
  { key: 'closed', label: 'Close' },
];

const fmtDate = (iso) => {
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return '—';
  }
};

const prettyPhone = (p) => (String(p || '').length === 10 ? `+91 ${p.slice(0, 5)} ${p.slice(5)}` : p);

const input =
  'w-full rounded-xl border border-[#1C2A22] bg-[#071009] py-3 pl-10 pr-3 text-[14px] text-[#F4F8F5] outline-none transition-colors placeholder:text-[#55655A] focus:border-[#00E585]/60';

function Login({ onDone }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await loginAdmin(email.trim(), password);
      onDone();
    } catch (err) {
      setError(err?.response?.data?.message || 'Login failed. Check email and password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050A08] px-5">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-3xl border border-[#1C2A22] bg-[#0A1410] p-7 shadow-[0_30px_80px_rgba(0,0,0,0.6)]"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#00E585]/12 text-[#00E585]">
          <Lock size={18} />
        </div>
        <h1 className="vy-head mt-5 text-2xl font-bold text-[#F4F8F5]">Admin login</h1>
        <p className="mt-1 text-[13px] text-[#93A096]">Leads dekhne ke liye sign in karo.</p>

        <div className="mt-6 space-y-3">
          <div className="relative">
            <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#55655A]" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@vyomacre.com"
              autoComplete="username"
              className={input}
            />
          </div>
          <div className="relative">
            <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#55655A]" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete="current-password"
              className={input}
            />
          </div>
        </div>

        {error && (
          <p className="mt-3 flex items-start gap-2 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-[12.5px] text-red-200">
            <AlertCircle size={13} className="mt-0.5 flex-none" /> {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#00E585] px-5 py-3 text-[14px] font-bold text-[#04140C] transition-colors hover:bg-[#2BF39B] disabled:opacity-60"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : null}
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}

function StatTile({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-[#1C2A22] bg-[#0A1410] p-4">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#93A096]/80">
        <Icon size={12} /> {label}
      </div>
      <div className="vy-head mt-2 text-2xl font-semibold text-[#F4F8F5]">{value ?? '—'}</div>
    </div>
  );
}

export default function AdminApp() {
  const [authed, setAuthed] = useState(isLoggedIn());
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [investingOnly, setInvestingOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    if (!authed) return;
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (investingOnly) params.wants_to_invest = true;
      if (query) params.q = query;
      const [list, st] = await Promise.all([getLeads(params), getLeadStats()]);
      setLeads(Array.isArray(list?.data) ? list.data : []);
      setStats(st?.data || null);
    } catch (err) {
      if (err?.response?.status === 401) {
        logoutAdmin();
        setAuthed(false);
      } else {
        setError(err?.response?.data?.message || 'Could not load leads.');
      }
    } finally {
      setLoading(false);
    }
  }, [authed, statusFilter, investingOnly, query]);

  useEffect(() => {
    load();
  }, [load]);

  const changeStatus = async (id, status) => {
    setBusyId(id);
    try {
      await updateLeadStatus(id, status);
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
      const st = await getLeadStats();
      setStats(st?.data || null);
    } catch {
      setError('Could not update this lead.');
    } finally {
      setBusyId('');
    }
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      await downloadLeadsCsv();
    } catch {
      setError('CSV export failed.');
    } finally {
      setExporting(false);
    }
  };

  if (!authed) return <Login onDone={() => setAuthed(true)} />;

  return (
    <div className="min-h-screen bg-[#050A08] px-4 pb-20 pt-8 text-[#F4F8F5] sm:px-6">
      <style>{`
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');
.vy-head { font-family: 'Space Grotesk', 'Inter', system-ui, sans-serif; letter-spacing: -0.015em; }
`}</style>

      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-[#00E585]">
              Admin · Lead pipeline
            </p>
            <h1 className="vy-head mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              People interested in VyomAcre
            </h1>
            <p className="mt-1.5 text-[13.5px] text-[#93A096]">
              Every submission from the Partner / Invest form.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-[#1C2A22] bg-[#0A1410] px-3.5 py-2.5 text-[12.5px] font-semibold text-[#C9D6CC] hover:border-[#00E585]/40 hover:text-[#00E585] disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button
              onClick={exportCsv}
              disabled={exporting || leads.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-[#00E585] px-3.5 py-2.5 text-[12.5px] font-bold text-[#04140C] hover:bg-[#2BF39B] disabled:opacity-50"
            >
              {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Export CSV
            </button>
            <button
              onClick={() => {
                logoutAdmin();
                setAuthed(false);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-[#1C2A22] bg-[#0A1410] px-3.5 py-2.5 text-[12.5px] font-semibold text-[#93A096] hover:text-[#F4F8F5]"
            >
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile icon={Users} label="Total leads" value={stats?.total ?? 0} />
          <StatTile icon={Sparkles} label="Not contacted" value={stats?.new ?? 0} />
          <StatTile icon={TrendingUp} label="Funding interest" value={stats?.investing ?? 0} />
          <StatTile icon={Clock} label="Last 7 days" value={stats?.last_7_days ?? 0} />
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1.5 rounded-xl border border-[#1C2A22] bg-[#0A1410] p-1">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={
                  'rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors ' +
                  (statusFilter === f.key ? 'bg-[#00E585] text-[#04140C]' : 'text-[#93A096] hover:text-[#EDF3EF]')
                }
              >
                {f.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setInvestingOnly((v) => !v)}
            className={
              'rounded-xl border px-3 py-2 text-[12px] font-semibold transition-colors ' +
              (investingOnly
                ? 'border-[#F5B841]/50 bg-[#F5B841]/10 text-[#F5B841]'
                : 'border-[#1C2A22] bg-[#0A1410] text-[#93A096] hover:text-[#EDF3EF]')
            }
          >
            Funding interest only
          </button>

          <div className="relative ml-auto w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#55655A]" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, phone, city"
              className="w-full rounded-xl border border-[#1C2A22] bg-[#0A1410] py-2.5 pl-9 pr-3 text-[12.5px] text-[#F4F8F5] outline-none placeholder:text-[#55655A] focus:border-[#00E585]/50"
            />
          </div>
        </div>

        {error && (
          <p className="mt-3 flex items-start gap-2 rounded-xl border border-red-400/30 bg-red-400/10 px-3.5 py-3 text-[13px] text-red-200">
            <AlertCircle size={15} className="mt-0.5 flex-none" /> {error}
          </p>
        )}

        <div className="mt-4 space-y-3">
          {loading && [0, 1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl border border-[#1C2A22] bg-[#0A1410]" />
          ))}

          {!loading && leads.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[#1C2A22] bg-[#0A1410]/60 px-6 py-14 text-center">
              <Users size={22} className="mx-auto text-[#2A3D32]" />
              <p className="vy-head mt-3 text-[16px] font-semibold text-[#C9D6CC]">No leads yet</p>
              <p className="mt-1 text-[13px] text-[#7E8D83]">Form ka link share karo, submissions yahan aayengi.</p>
            </div>
          )}

          {!loading && leads.map((lead) => {
            const meta = TYPE_META[lead.interest_type] || TYPE_META.other;
            const badge = STATUS_STYLES[lead.status] || STATUS_STYLES.new;
            return (
              <article key={lead.id} className="rounded-2xl border border-[#1C2A22] bg-[#0A1410] p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl border border-[#1C2A22] bg-[#071009] text-[#00E585]">
                      <meta.icon size={16} />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="vy-head text-base font-semibold text-[#F4F8F5]">{lead.name}</h3>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] ${badge}`}>
                          {lead.status}
                        </span>
                        {lead.wants_to_invest && (
                          <span className="rounded-full border border-[#F5B841]/30 bg-[#F5B841]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#F5B841]">
                            Funding
                          </span>
                        )}
                      </div>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-[#93A096]">
                        <span className="inline-flex items-center gap-1.5"><MapPin size={12} /> {lead.city}</span>
                        <span className="inline-flex items-center gap-1.5"><meta.icon size={12} /> {meta.label}</span>
                        {lead.wants_to_invest && lead.investment_range && (
                          <span className="inline-flex items-center gap-1.5 text-[#F5B841]">
                            <IndianRupee size={12} /> {RANGE_LABELS[lead.investment_range] || lead.investment_range}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1.5"><Clock size={12} /> {fmtDate(lead.created_at)}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={`mailto:${lead.email}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#1C2A22] bg-[#071009] px-2.5 py-1.5 text-[11.5px] font-medium text-[#C9D6CC] hover:border-[#00E585]/40 hover:text-[#00E585]"
                    >
                      <Mail size={12} /> Email
                    </a>
                    <a
                      href={`tel:+91${lead.phone}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#1C2A22] bg-[#071009] px-2.5 py-1.5 text-[11.5px] font-medium text-[#C9D6CC] hover:border-[#00E585]/40 hover:text-[#00E585]"
                    >
                      <Phone size={12} /> Call
                    </a>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 border-t border-[#1C2A22] pt-4 text-[12.5px] text-[#A9B7AD] sm:grid-cols-2">
                  <p className="inline-flex items-center gap-2"><Mail size={12} className="text-[#55655A]" /><span className="truncate">{lead.email}</span></p>
                  <p className="inline-flex items-center gap-2"><Phone size={12} className="text-[#55655A]" />{prettyPhone(lead.phone)}</p>
                </div>

                {lead.message && (
                  <div className="mt-3 rounded-xl border border-[#1C2A22] bg-[#071009] p-3">
                    <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#55655A]">
                      <MessageSquare size={11} /> Their message
                    </p>
                    <p className="whitespace-pre-line text-[13px] leading-relaxed text-[#C9D6CC]">{lead.message}</p>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#55655A]">Move to</span>
                  {NEXT.filter((a) => a.key !== lead.status).map((a) => (
                    <button
                      key={a.key}
                      disabled={busyId === lead.id}
                      onClick={() => changeStatus(lead.id, a.key)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#1C2A22] bg-[#071009] px-2.5 py-1.5 text-[11.5px] font-medium text-[#93A096] hover:border-[#00E585]/40 hover:text-[#00E585] disabled:opacity-50"
                    >
                      {a.key === 'closed' ? <X size={11} /> : <Check size={11} />} {a.label}
                    </button>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
