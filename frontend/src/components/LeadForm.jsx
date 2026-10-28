import React, { useRef, useState } from 'react';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Check,
  ArrowRight,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Building2,
  Handshake,
  AlertCircle,
  IndianRupee,
  Clock3,
  Users,
  ChevronDown,
  MessageCircle,
  Send,
  BadgeCheck,
} from 'lucide-react';
import { submitLead } from '../services/api';

/* ============================================================
   VyomAcre — Partner / Invest (lead capture)  ·  v2
   ------------------------------------------------------------
   Standalone build — runs on its own backend, no other project files needed.
   Colours deliberately match the rest of VyomAcre: #050A08 page,
   #0A1410 cards, #1C2A22 borders, #00E585 accent — same family as the
   landing page and dashboards, so it never feels like a foreign page.

   Performance notes (this page must feel instant):
   - No framer-motion, no backdrop-blur, no big blur() blobs.
     Only cheap compositor properties: opacity + transform.
   - No height animations — the funding block simply mounts.
   - Transitions are colour/border/transform only (200ms).
   ============================================================ */

// Business WhatsApp number (digits only, with country code).
// Shows as a "Say hello on WhatsApp" button on the thank-you screen and as a
// direct contact link on the form. Set to '' to hide both.
const SUPPORT_WHATSAPP = '917355782574';
const SUPPORT_WHATSAPP_DISPLAY = '+91 73557 82574';

// Public link to the live platform, so a visitor can go look at the product
// before/after filling the form. (The Vercel *dashboard* link needs a login,
// so it can't be used here — this is the deployed site itself.)
const PROJECT_URL = 'https://devdoots-vyom-acre-nine.vercel.app';

const ROLES = [
  { key: 'investor', label: 'Investor / Funder', icon: TrendingUp },
  { key: 'owner', label: 'Property owner', icon: Building2 },
  { key: 'company', label: 'Company / Brand', icon: Handshake },
  { key: 'student', label: 'Student / Community', icon: Users },
  { key: 'other', label: 'Something else', icon: Sparkles },
];

const RANGES = [
  { key: 'under_50k', label: 'Under ₹50,000' },
  { key: '50k_2l', label: '₹50,000 – ₹2 lakh' },
  { key: '2l_10l', label: '₹2 – 10 lakh' },
  { key: '10l_50l', label: '₹10 – 50 lakh' },
  { key: '50l_plus', label: '₹50 lakh +' },
  { key: 'undecided', label: 'Not decided yet' },
];

const CITIES = [
  'Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Ahmedabad', 'Chennai',
  'Kolkata', 'Pune', 'Jaipur', 'Surat', 'Lucknow', 'Kanpur', 'Nagpur',
  'Indore', 'Bhopal', 'Patna', 'Vadodara', 'Coimbatore', 'Noida',
  'Gurugram', 'Varanasi', 'Ranchi', 'Chandigarh', 'Kochi', 'Guwahati',
];

const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

const inputBase =
  'w-full rounded-xl border bg-[#071009] py-3 pl-11 pr-3.5 text-[15px] text-[#F4F8F5] outline-none transition-colors duration-200 placeholder:text-[#55655A]';

function fieldClass(hasError) {
  return (
    inputBase +
    (hasError
      ? ' border-red-400/50 focus:border-red-400/70'
      : ' border-[#1C2A22] hover:border-[#2A3D32] focus:border-[#00E585]/70')
  );
}

function Field({ id, label, icon: Icon, error, hint, optional, children }) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em] text-[#93A096]"
      >
        <span>
          {label}
          {optional && (
            <span className="ml-1.5 normal-case tracking-normal text-[#55655A]">optional</span>
          )}
        </span>
      </label>
      <div className="relative">
        {Icon && (
          <Icon
            size={16}
            className={
              'pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 ' +
              (error ? 'text-red-400/70' : 'text-[#55655A]')
            }
          />
        )}
        {children}
      </div>
      {error && (
        <p role="alert" className="mt-1.5 flex items-center gap-1.5 text-[12px] text-red-300">
          <AlertCircle size={12} /> {error}
        </p>
      )}
      {hint && !error && <p className="mt-1.5 text-[12px] text-[#55655A]">{hint}</p>}
    </div>
  );
}

function Benefit({ icon: Icon, title, text }) {
  return (
    <div className="flex gap-3.5">
      <div className="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-xl border border-[#1C2A22] bg-[#0A1410] text-[#00E585]">
        <Icon size={16} />
      </div>
      <div>
        <p className="vy-head text-[15px] font-semibold text-[#F4F8F5]">{title}</p>
        <p className="mt-0.5 text-[13.5px] leading-relaxed text-[#93A096]">{text}</p>
      </div>
    </div>
  );
}

/* One-shot confetti burst for the thank-you screen — 10 static divs with a
   single CSS animation each. Runs once, then never repaints. */
function Burst() {
  const dots = [
    { x: -46, y: -34, c: '#00E585', d: 0 },
    { x: 40, y: -40, c: '#00E585', d: 40 },
    { x: -58, y: 6, c: '#00E585', d: 90 },
    { x: 56, y: 10, c: '#00E585', d: 20 },
    { x: -30, y: 42, c: '#00E585', d: 130 },
    { x: 34, y: 44, c: '#00E585', d: 70 },
    { x: 0, y: -50, c: '#00E585', d: 110 },
    { x: 62, y: -14, c: '#00E585', d: 150 },
    { x: -64, y: -12, c: '#00E585', d: 60 },
    { x: 12, y: 52, c: '#00E585', d: 100 },
  ];
  return (
    <div className="pointer-events-none absolute left-7 top-7 h-0 w-0" aria-hidden="true">
      {dots.map((dot, i) => (
        <span
          key={i}
          className="vy-burst absolute h-1.5 w-1.5 rounded-full"
          style={{
            background: dot.c,
            animationDelay: `${dot.d}ms`,
            '--bx': `${dot.x}px`,
            '--by': `${dot.y}px`,
          }}
        />
      ))}
    </div>
  );
}

const LeadForm = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    interest_type: 'investor',
    wants_to_invest: true,
    investment_range: 'undecided',
    message: '',
    consent: false,
    website: '', // honeypot — humans never see it
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [submitted, setSubmitted] = useState(null);
  const cardRef = useRef(null);

  const set = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const roleLabel =
    ROLES.find((r) => r.key === form.interest_type)?.label || 'Something else';
  const rangeLabel = RANGES.find((r) => r.key === form.investment_range)?.label || '—';

  const validate = () => {
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Please enter your full name.';
    if (!EMAIL_RE.test(form.email.trim())) next.email = 'That email doesn’t look right.';

    const digits = form.phone.replace(/\D/g, '');
    const normalised = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
    if (normalised.length < 10) next.phone = 'Please enter a 10-digit mobile number.';

    if (form.city.trim().length < 2) next.city = 'Which city are you based in?';
    if (form.message.trim().length > 0 && form.message.trim().length < 10) {
      next.message = 'Add a little more detail (at least 10 characters).';
    }
    if (!form.consent) {
      next.consent = 'Please tick the box to confirm you are sharing your details yourself.';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validate()) {
      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    setSubmitting(true);
    const payload = {
      ...form,
      name: form.name.trim(),
      email: form.email.trim(),
      city: form.city.trim(),
      message: form.message.trim() || null,
      consent_given: form.consent,
      investment_range: form.wants_to_invest ? form.investment_range : null,
      source: 'partner_page',
    };

    try {
      const result = await submitLead(payload);
      setSubmitted({
        id: result?.data?.id || '',
        emailSent: Boolean(result?.data?.acknowledgement_sent),
        summary: {
          name: payload.name,
          city: payload.city,
          email: payload.email,
          phone: payload.phone,
          role: roleLabel,
          funding: payload.wants_to_invest ? rangeLabel : 'Not right now',
        },
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setServerError(
        err?.response?.data?.message ||
          'Something went wrong on our side. Please try again in a moment.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmitted(null);
    setForm({
      name: '',
      email: '',
      phone: '',
      city: '',
      interest_type: 'investor',
      wants_to_invest: true,
      investment_range: 'undecided',
      message: '',
      consent: false,
      website: '',
    });
    setErrors({});
    setServerError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const refCode = submitted?.id ? submitted.id.slice(0, 8).toUpperCase() : '';
  const firstName = submitted?.summary?.name?.split(' ')[0] || '';

  const whatsappHref = SUPPORT_WHATSAPP
    ? `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(
        `Hi VyomAcre team, I just filled your partner form${refCode ? ` (ref #${refCode})` : ''}.`
      )}`
    : '';

  return (
    <div className="vy-body relative min-h-screen overflow-hidden bg-[#050A08]">
      <style>{`
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');
.vy-head { font-family: 'Space Grotesk', 'Inter', system-ui, sans-serif; letter-spacing: -0.015em; }
.vy-body { font-family: 'Inter', system-ui, sans-serif; }

/* page glow — one cheap radial gradient, no blur filter */
.vy-aura {
  background:
    radial-gradient(760px 420px at 12% -8%, rgba(0,229,133,0.16), transparent 62%),
    radial-gradient(700px 460px at 92% 6%, rgba(0,229,133,0.10), transparent 60%);
}
.vy-grid {
  background-image:
    linear-gradient(rgba(28,42,34,0.55) 1px, transparent 1px),
    linear-gradient(90deg, rgba(28,42,34,0.55) 1px, transparent 1px);
  background-size: 72px 72px;
  mask-image: radial-gradient(ellipse 80% 55% at 50% 0%, #000 25%, transparent 78%);
  -webkit-mask-image: radial-gradient(ellipse 80% 55% at 50% 0%, #000 25%, transparent 78%);
}
@keyframes vyRise { from { opacity: 0; transform: translate3d(0, 14px, 0); } to { opacity: 1; transform: translate3d(0, 0, 0); } }
.vy-rise { animation: vyRise 380ms cubic-bezier(0.22, 0.61, 0.36, 1) both; }
@keyframes vyBurst {
  from { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
  to { opacity: 0; transform: translate3d(var(--bx), var(--by), 0) scale(0.4); }
}
.vy-burst { animation: vyBurst 900ms cubic-bezier(0.22, 0.61, 0.36, 1) both; }
@media (prefers-reduced-motion: reduce) {
  .vy-rise, .vy-burst { animation: none; }
}
`}</style>

      {/* ---------- background (two static layers, no blur) ---------- */}
      <div className="vy-aura pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="vy-grid pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />

      <div className="relative mx-auto w-full max-w-6xl px-5 pb-20 pt-10 sm:px-8 lg:pt-16">
        {submitted ? (
          /* ==================== THANK YOU ==================== */
          <div className="vy-rise mx-auto max-w-2xl">
            <div className="relative overflow-hidden rounded-3xl border border-[#2A3D32] bg-[#0A1410] p-7 shadow-[0_30px_80px_rgba(0,0,0,0.55)] sm:p-10">
              <div className="vy-aura pointer-events-none absolute inset-0 opacity-70" aria-hidden="true" />

              <div className="relative">
                <div className="relative inline-flex">
                  <Burst />
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#00E585] to-[#2BF39B] text-[#04140C] shadow-[0_10px_30px_rgba(0,229,133,0.28)]">
                    <Check size={26} strokeWidth={3} />
                  </div>
                </div>

                <h1 className="vy-head mt-6 text-3xl font-bold leading-tight text-[#F4F8F5] sm:text-4xl">
                  You’re on the list{firstName ? `, ${firstName}` : ''}.
                </h1>
                <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[#A9B7AD]">
                  Your details are saved safely and a real person from Team Devdoots will
                  reach out within 48 hours. Here’s exactly what we noted — so nothing feels
                  vague later.
                </p>

                {/* ---- what we noted ---- */}
                <div className="mt-7 rounded-2xl border border-[#1C2A22] bg-[#071009] p-4 sm:p-5">
                  <p className="mb-3 text-[10.5px] font-bold uppercase tracking-[0.18em] text-[#00E585]">
                    Your submission
                  </p>
                  <div className="grid gap-3 text-[13.5px] sm:grid-cols-2">
                    <p className="flex items-center gap-2 text-[#C9D6CC]">
                      <User size={13} className="text-[#55655A]" /> {submitted.summary.name}
                    </p>
                    <p className="flex items-center gap-2 text-[#C9D6CC]">
                      <MapPin size={13} className="text-[#55655A]" /> {submitted.summary.city}
                    </p>
                    <p className="flex items-center gap-2 text-[#C9D6CC]">
                      <Handshake size={13} className="text-[#55655A]" /> {submitted.summary.role}
                    </p>
                    <p className="flex items-center gap-2 text-[#C9D6CC]">
                      <IndianRupee size={13} className="text-[#55655A]" /> {submitted.summary.funding}
                    </p>
                    <p className="flex items-center gap-2 text-[#C9D6CC]">
                      <Phone size={13} className="text-[#55655A]" /> {submitted.summary.phone}
                    </p>
                    <p className="flex min-w-0 items-center gap-2 text-[#C9D6CC]">
                      <Mail size={13} className="flex-none text-[#55655A]" />
                      <span className="truncate">{submitted.summary.email}</span>
                    </p>
                  </div>
                  {refCode && (
                    <p className="mt-4 flex items-center gap-2 border-t border-[#1C2A22] pt-3 text-[12px] text-[#7E8D83]">
                      <BadgeCheck size={13} className="text-[#00E585]" />
                      Reference&nbsp;
                      <span className="vy-head font-semibold text-[#00E585]">#{refCode}</span>
                      <span className="text-[#55655A]">· quote it if you message us first</span>
                    </p>
                  )}
                </div>

                {/* ---- honest email line ---- */}
                <p className="mt-4 flex items-start gap-2 text-[12.5px] leading-relaxed text-[#93A096]">
                  <Send size={13} className="mt-0.5 flex-none text-[#00E585]" />
                  {submitted.emailSent
                    ? `A confirmation is on its way to ${submitted.summary.email}.`
                    : 'Your details are stored — we’ll contact you on the number and email you shared.'}
                </p>

                {/* ---- next 48 hours ---- */}
                <div className="mt-7 border-t border-[#1C2A22] pt-6">
                  <p className="mb-4 text-[10.5px] font-bold uppercase tracking-[0.18em] text-[#00E585]">
                    Next 48 hours
                  </p>
                  <div className="space-y-4">
                    {[
                      { icon: Clock3, title: 'Today', text: 'Your details reach our desk and get matched to the right conversation.' },
                      { icon: Phone, title: 'Within 48 hours', text: 'A call or WhatsApp from the team — a quick chat, no sales script.' },
                      { icon: Handshake, title: 'In writing', text: 'Numbers, documents and timeline sent to your email. You decide the pace.' },
                    ].map((step, i) => (
                      <div key={step.title} className="flex gap-3.5">
                        <div className="flex h-8 w-8 flex-none items-center justify-center rounded-lg border border-[#1C2A22] bg-[#071009] text-[#00E585]">
                          <step.icon size={14} />
                        </div>
                        <div>
                          <p className="text-[14px] font-semibold text-[#F4F8F5]">
                            {i + 1}. {step.title}
                          </p>
                          <p className="text-[13px] leading-relaxed text-[#93A096]">{step.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ---- actions ---- */}
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  {whatsappHref ? (
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#00E585] to-[#2BF39B] px-5 py-3 text-[14px] font-bold text-[#04140C] transition-transform duration-200 hover:-translate-y-0.5"
                    >
                      <MessageCircle size={15} /> Say hello on WhatsApp
                    </a>
                  ) : (
                    <a
                      href="/"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#00E585] to-[#2BF39B] px-5 py-3 text-[14px] font-bold text-[#04140C] transition-transform duration-200 hover:-translate-y-0.5"
                    >
                      <ArrowLeft size={15} /> Back to home
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={resetForm}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#1C2A22] bg-[#071009] px-5 py-3 text-[14px] font-semibold text-[#C9D6CC] transition-colors duration-200 hover:border-[#2A3D32] hover:text-white"
                  >
                    Refer someone else <ArrowRight size={15} />
                  </button>
                </div>

                <a
                  href={PROJECT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex items-center gap-2 text-[12.5px] font-semibold text-[#7CF0C4] transition-colors duration-200 hover:text-white"
                >
                  While you wait — explore the live platform <ArrowRight size={13} />
                </a>
              </div>
            </div>
          </div>
        ) : (
          /* ==================== FORM ==================== */
          <div className="vy-rise grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14">
            {/* ---------- left: the pitch ---------- */}
            <div className="lg:sticky lg:top-28 lg:self-start">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#00E585]/30 bg-[#00E585]/10 px-3.5 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00E585]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7CF0C4]">
                  Partnership &amp; investment
                </span>
              </div>

              <h1 className="vy-head mt-5 text-4xl font-bold leading-[1.06] tracking-tight text-[#F4F8F5] sm:text-5xl">
                Put your money — or your rooftop —{' '}
                <span className="bg-gradient-to-r from-[#00E585] to-[#7CF0C4] bg-clip-text text-transparent">
                  behind real space.
                </span>
              </h1>

              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-[#93A096]">
                VyomAcre turns verified Indian rooftops into leasable space for companies.
                Tell us who you are and what you want to do — investing, listing a property,
                or just exploring. We’ll come back with specifics, not brochures.
              </p>

              <div className="mt-8 hidden space-y-5 lg:block">
                <Benefit
                  icon={TrendingUp}
                  title="Fund the pilot, not a promise"
                  text="Every roof is satellite-verified before it goes live, so capital follows real square feet."
                />
                <Benefit
                  icon={Building2}
                  title="Owners earn from empty space"
                  text="A rooftop earning ₹0 today can carry a lease, a solar setup or a telecom node."
                />
                <Benefit
                  icon={ShieldCheck}
                  title="No spam, no cold calls"
                  text="Your details go to one team, used only to talk about VyomAcre."
                />
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[#1C2A22] pt-6 text-[12.5px] text-[#7E8D83] lg:mt-8">
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 size={13} className="text-[#00E585]" /> Replies in ~48 hours
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-[#00E585]" /> Stored securely
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles size={13} className="text-[#00E585]" /> Built by Team Devdoots
                </span>
              </div>

              <a
                href={PROJECT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-2 rounded-xl border border-[#1C2A22] bg-[#0A1410] px-4 py-2.5 text-[12.5px] font-semibold text-[#7CF0C4] transition-colors duration-200 hover:border-[#00E585]/50 hover:text-white"
              >
                See the live platform <ArrowRight size={14} />
              </a>

              {SUPPORT_WHATSAPP && (
                <a
                  href={`https://wa.me/${SUPPORT_WHATSAPP}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex w-fit items-center gap-2 text-[12.5px] font-medium text-[#93A096] transition-colors duration-200 hover:text-[#00E585]"
                >
                  <MessageCircle size={14} className="text-[#00E585]" />
                  WhatsApp: {SUPPORT_WHATSAPP_DISPLAY}
                </a>
              )}
            </div>

            {/* ---------- right: the form card ---------- */}
            <div
              ref={cardRef}
              className="relative scroll-mt-28 rounded-3xl border border-[#2A3D32] bg-[#0A1410] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.5)] sm:p-8"
            >
              <div className="pointer-events-none absolute inset-x-12 -top-px h-px bg-gradient-to-r from-transparent via-[#00E585]/60 to-transparent" />

              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="vy-head text-[22px] font-bold text-[#F4F8F5]">Tell us about you</h2>
                  <p className="mt-1 text-[13px] text-[#93A096]">Six fields, under two minutes.</p>
                </div>
                <span className="hidden rounded-lg border border-[#1C2A22] bg-[#071009] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7E8D83] sm:block">
                  Free
                </span>
              </div>

              <form onSubmit={handleSubmit} noValidate className="mt-7 space-y-7">
                {/* ---- section 1 ---- */}
                <div>
                  <p className="mb-3 text-[10.5px] font-bold uppercase tracking-[0.18em] text-[#00E585]">
                    01 — About you
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Field id="lead-name" label="Full name" icon={User} error={errors.name}>
                        <input
                          id="lead-name"
                          type="text"
                          autoComplete="name"
                          placeholder="Riya Sharma"
                          value={form.name}
                          onChange={(e) => set('name', e.target.value)}
                          aria-invalid={Boolean(errors.name)}
                          className={fieldClass(errors.name)}
                        />
                      </Field>
                    </div>

                    <Field id="lead-email" label="Email" icon={Mail} error={errors.email}>
                      <input
                        id="lead-email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@company.com"
                        value={form.email}
                        onChange={(e) => set('email', e.target.value)}
                        aria-invalid={Boolean(errors.email)}
                        className={fieldClass(errors.email)}
                      />
                    </Field>

                    <Field id="lead-phone" label="Phone / WhatsApp" icon={Phone} error={errors.phone}>
                      <input
                        id="lead-phone"
                        type="tel"
                        autoComplete="tel"
                        inputMode="numeric"
                        placeholder="98765 43210"
                        value={form.phone}
                        onChange={(e) => set('phone', e.target.value)}
                        aria-invalid={Boolean(errors.phone)}
                        className={fieldClass(errors.phone)}
                      />
                    </Field>

                    <div className="sm:col-span-2">
                      <Field id="lead-city" label="City" icon={MapPin} error={errors.city}>
                        <input
                          id="lead-city"
                          type="text"
                          list="vyom-cities"
                          autoComplete="address-level2"
                          placeholder="Start typing — e.g. Pune"
                          value={form.city}
                          onChange={(e) => set('city', e.target.value)}
                          aria-invalid={Boolean(errors.city)}
                          className={fieldClass(errors.city)}
                        />
                        <datalist id="vyom-cities">
                          {CITIES.map((c) => (
                            <option key={c} value={c} />
                          ))}
                        </datalist>
                      </Field>
                    </div>
                  </div>
                </div>

                {/* ---- section 2 ---- */}
                <div className="border-t border-[#1C2A22] pt-6">
                  <p className="mb-3 text-[10.5px] font-bold uppercase tracking-[0.18em] text-[#00E585]">
                    02 — Your interest
                  </p>

                  <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#93A096]">
                    I’m here as
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {ROLES.map((role) => {
                      const active = form.interest_type === role.key;
                      return (
                        <button
                          key={role.key}
                          type="button"
                          onClick={() => set('interest_type', role.key)}
                          aria-pressed={active}
                          className={
                            'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[12.5px] font-medium transition-colors duration-200 ' +
                            (active
                              ? 'border-[#00E585]/60 bg-[#00E585]/12 text-[#00E585]'
                              : 'border-[#1C2A22] bg-[#071009] text-[#A9B7AD] hover:border-[#2A3D32] hover:text-[#F4F8F5]')
                          }
                        >
                          <role.icon size={13} />
                          {role.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* funding intent */}
                  <div className="mt-5 rounded-2xl border border-[#1C2A22] bg-[#071009] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-[13.5px] font-semibold text-[#F4F8F5]">
                          Interested in funding VyomAcre?
                        </p>
                        <p className="mt-0.5 text-[12px] text-[#7E8D83]">
                          Even a small cheque helps us verify more roofs.
                        </p>
                      </div>
                      <div
                        role="group"
                        aria-label="Interested in funding VyomAcre"
                        className="flex rounded-xl border border-[#1C2A22] bg-[#050A08] p-1"
                      >
                        {[
                          { v: true, label: 'Yes' },
                          { v: false, label: 'Not now' },
                        ].map((opt) => {
                          const active = form.wants_to_invest === opt.v;
                          return (
                            <button
                              key={String(opt.v)}
                              type="button"
                              onClick={() => set('wants_to_invest', opt.v)}
                              aria-pressed={active}
                              className={
                                'rounded-lg px-4 py-1.5 text-[12.5px] font-semibold transition-colors duration-200 ' +
                                (active
                                  ? 'bg-gradient-to-br from-[#00E585] to-[#2BF39B] text-[#04140C]'
                                  : 'text-[#93A096] hover:text-[#F4F8F5]')
                              }
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {form.wants_to_invest && (
                      <div className="pt-4">
                        <Field
                          id="lead-range"
                          label="Rough range you have in mind"
                          icon={IndianRupee}
                          optional
                          hint="An estimate is fine — nothing is committed by submitting."
                        >
                          <select
                            id="lead-range"
                            value={form.investment_range}
                            onChange={(e) => set('investment_range', e.target.value)}
                            className={fieldClass(false) + ' cursor-pointer appearance-none pr-10'}
                          >
                            {RANGES.map((r) => (
                              <option key={r.key} value={r.key} className="bg-[#071009]">
                                {r.label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            size={15}
                            className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#55655A]"
                          />
                        </Field>
                      </div>
                    )}
                  </div>

                  <div className="mt-4">
                    <Field
                      id="lead-message"
                      label="Anything we should know?"
                      error={errors.message}
                      optional
                    >
                      <textarea
                        id="lead-message"
                        rows={4}
                        maxLength={2000}
                        placeholder="Tell us what you're looking for — the space, the budget, the timeline, or just a hello."
                        value={form.message}
                        onChange={(e) => set('message', e.target.value)}
                        aria-invalid={Boolean(errors.message)}
                        className={fieldClass(errors.message) + ' resize-none px-3.5 pt-3 leading-relaxed'}
                      />
                    </Field>
                    <div className="mt-1 flex justify-end text-[11px] text-[#55655A]">
                      {form.message.length}/2000
                    </div>
                  </div>
                </div>

                {/* honeypot — hidden from humans */}
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  value={form.website}
                  onChange={(e) => set('website', e.target.value)}
                  className="pointer-events-none absolute h-0 w-0 opacity-0"
                />

                {serverError && (
                  <div
                    role="alert"
                    className="flex items-start gap-2.5 rounded-xl border border-red-400/30 bg-red-400/10 px-3.5 py-3 text-[13px] text-red-200"
                  >
                    <AlertCircle size={15} className="mt-0.5 flex-none" />
                    <span>{serverError}</span>
                  </div>
                )}

                {/* ---- voluntary consent ---- */}
                <div>
                  <label
                    htmlFor="lead-consent"
                    className={
                      'flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors duration-200 ' +
                      (errors.consent
                        ? 'border-red-400/50 bg-red-400/[0.06]'
                        : form.consent
                          ? 'border-[#00E585]/45 bg-[#00E585]/[0.06]'
                          : 'border-[#1C2A22] bg-[#071009] hover:border-[#2A3D32]')
                    }
                  >
                    <input
                      id="lead-consent"
                      type="checkbox"
                      checked={form.consent}
                      onChange={(e) => set('consent', e.target.checked)}
                      aria-invalid={Boolean(errors.consent)}
                      className="sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className={
                        'mt-0.5 flex h-[18px] w-[18px] flex-none items-center justify-center rounded-[6px] border transition-colors duration-200 ' +
                        (form.consent
                          ? 'border-[#00E585] bg-gradient-to-br from-[#00E585] to-[#2BF39B] text-[#04140C]'
                          : errors.consent
                            ? 'border-red-400/70'
                            : 'border-[#2A3D32] bg-[#050A08]')
                      }
                    >
                      {form.consent && <Check size={12} strokeWidth={3.5} />}
                    </span>
                    <span className="text-[12.5px] leading-relaxed text-[#A9B7AD]">
                      I’m sharing my <strong className="font-semibold text-[#F4F8F5]">name, email and phone number on my own accord</strong>,
                      and I’m okay with the VyomAcre team contacting me about this.
                      <span className="mt-1 block text-[11.5px] text-[#7E8D83]">
                        No third parties, no spam. You can ask us to delete it anytime.
                      </span>
                    </span>
                  </label>
                  {errors.consent && (
                    <p role="alert" className="mt-1.5 flex items-center gap-1.5 text-[12px] text-red-300">
                      <AlertCircle size={12} /> {errors.consent}
                    </p>
                  )}
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#00E585] to-[#2BF39B] px-6 py-3.5 text-[14.5px] font-bold text-[#04140C] shadow-[0_10px_30px_rgba(0,229,133,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(0,229,133,0.28)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Sending…
                      </>
                    ) : (
                      <>
                        Send my details
                        <ArrowRight
                          size={16}
                          className="transition-transform duration-200 group-hover:translate-x-1"
                        />
                      </>
                    )}
                  </button>

                  <p className="mt-3 flex items-start justify-center gap-1.5 text-center text-[11.5px] leading-relaxed text-[#55655A]">
                    <ShieldCheck size={12} className="mt-0.5 flex-none text-[#00E585]/80" />
                    <span>
                      Used only to contact you about VyomAcre. No spam, no sharing with third
                      parties.
                    </span>
                  </p>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeadForm;
