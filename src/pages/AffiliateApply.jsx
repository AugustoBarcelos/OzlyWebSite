import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { useI18n } from "../i18n";

// /affiliates/apply — public form for prospective affiliates.
// Submits to the public-apply-affiliate edge function. Server-side validates,
// rate-limits, inserts as status='pending' into affiliates table, and sends
// confirmation emails via Resend.

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const FIELDS = ["name", "email", "phone", "code", "audience", "notes"];

function normaliseCode(raw) {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 32);
}

export default function AffiliateApply() {
  const { t } = useI18n();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    code: "",
    audience: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null); // null | "ok" | "already-approved"
  const [errors, setErrors] = useState([]); // [{ field?, message }]
  const [touched, setTouched] = useState({});

  function update(field, value) {
    if (field === "code") value = normaliseCode(value);
    setForm((prev) => ({ ...prev, [field]: value }));
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  function fieldError(field) {
    return errors.find((e) => e.field === field)?.message ?? null;
  }

  const generalError = errors.find((e) => !e.field)?.message ?? null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!SUPABASE_URL) {
      setErrors([{ message: t("affiliateApply.configMissing") }]);
      return;
    }
    setSubmitting(true);
    setErrors([]);
    setDone(null);

    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/public-apply-affiliate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            email: form.email,
            phone: form.phone || null,
            code: form.code,
            audience: form.audience || null,
            notes: form.notes || null,
          }),
        }
      );
      const body = await res.json().catch(() => ({}));

      if (res.ok && body.ok) {
        setDone(body.already_approved ? "already-approved" : "ok");
        if (!body.already_approved) {
          setForm({
            name: "",
            email: "",
            phone: "",
            code: "",
            audience: "",
            notes: "",
          });
          setTouched({});
        }
      } else if (body.errors && Array.isArray(body.errors)) {
        setErrors(body.errors);
      } else {
        setErrors([{ message: t("affiliateApply.genericError") }]);
      }
    } catch (err) {
      setErrors([{ message: t("affiliateApply.networkError") }]);
    } finally {
      setSubmitting(false);
    }
  }

  if (done === "ok") {
    return (
      <ResultLayout
        icon={<CheckCircle2 size={56} className="text-emerald-500" />}
        title={t("affiliateApply.successTitle")}
        body={t("affiliateApply.successBody")}
      />
    );
  }
  if (done === "already-approved") {
    return (
      <ResultLayout
        icon={<CheckCircle2 size={56} className="text-emerald-500" />}
        title={t("affiliateApply.alreadyApprovedTitle")}
        body={t("affiliateApply.alreadyApprovedBody")}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-lime-50">
      <div className="mx-auto max-w-2xl px-5 py-10">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm font-medium text-navy-600 hover:text-teal-600"
        >
          <ArrowLeft size={16} /> {t("affiliateApply.back")}
        </Link>

        <header className="mt-6">
          <h1 className="text-3xl font-bold text-navy-700">
            {t("affiliateApply.title")}
          </h1>
          <p className="mt-2 text-base text-navy-500">
            {t("affiliateApply.subtitle")}
          </p>
        </header>

        {generalError && (
          <div className="mt-6 flex items-start gap-3 rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            <AlertCircle size={20} className="mt-0.5 shrink-0" />
            <span>{generalError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
          <Field
            label={t("affiliateApply.nameLabel")}
            hint={t("affiliateApply.nameHint")}
            error={touched.name ? fieldError("name") : null}
          >
            <input
              type="text"
              required
              minLength={2}
              maxLength={100}
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              autoComplete="name"
              className={inputCls(fieldError("name"))}
            />
          </Field>

          <Field
            label={t("affiliateApply.emailLabel")}
            hint={t("affiliateApply.emailHint")}
            error={touched.email ? fieldError("email") : null}
          >
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              autoComplete="email"
              className={inputCls(fieldError("email"))}
            />
          </Field>

          <Field
            label={t("affiliateApply.phoneLabel")}
            hint={t("affiliateApply.phoneHint")}
            error={touched.phone ? fieldError("phone") : null}
          >
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              autoComplete="tel"
              className={inputCls(fieldError("phone"))}
            />
          </Field>

          <Field
            label={t("affiliateApply.codeLabel")}
            hint={t("affiliateApply.codeHint")}
            error={touched.code ? fieldError("code") : null}
          >
            <input
              type="text"
              required
              minLength={3}
              maxLength={32}
              value={form.code}
              onChange={(e) => update("code", e.target.value)}
              placeholder="meunome"
              className={`${inputCls(fieldError("code"))} font-mono lowercase`}
            />
          </Field>

          <Field
            label={t("affiliateApply.audienceLabel")}
            hint={t("affiliateApply.audienceHint")}
            error={touched.audience ? fieldError("audience") : null}
          >
            <textarea
              rows={3}
              maxLength={500}
              value={form.audience}
              onChange={(e) => update("audience", e.target.value)}
              className={inputCls(fieldError("audience"))}
            />
          </Field>

          <Field
            label={t("affiliateApply.notesLabel")}
            hint={t("affiliateApply.notesHint")}
            error={touched.notes ? fieldError("notes") : null}
          >
            <textarea
              rows={3}
              maxLength={500}
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              className={inputCls(fieldError("notes"))}
            />
          </Field>

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-teal-600 px-6 py-3 text-base font-semibold text-white shadow-md transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? t("affiliateApply.submitting")
                : t("affiliateApply.submit")}
            </button>
            <p className="mt-3 text-xs text-navy-400">
              {t("affiliateApply.privacyNote")}
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, hint, error, children }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-navy-700">{label}</span>
      {hint && <span className="mt-0.5 block text-xs text-navy-400">{hint}</span>}
      <div className="mt-1.5">{children}</div>
      {error && (
        <span className="mt-1 block text-xs font-medium text-rose-600">{error}</span>
      )}
    </label>
  );
}

function inputCls(hasError) {
  return `w-full rounded-md border bg-white px-3 py-2 text-sm text-navy-700 shadow-sm transition-colors focus:border-teal-500 focus:ring-2 focus:ring-teal-100 ${
    hasError ? "border-rose-300" : "border-navy-200"
  }`;
}

function ResultLayout({ icon, title, body }) {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-lime-50">
      <div className="mx-auto max-w-xl px-5 py-20 text-center">
        <div className="flex justify-center">{icon}</div>
        <h1 className="mt-6 text-2xl font-bold text-navy-700">{title}</h1>
        <p className="mt-3 text-base text-navy-500">{body}</p>
        <Link
          to="/"
          className="mt-8 inline-flex items-center gap-1 text-sm font-medium text-teal-600 hover:text-teal-700"
        >
          <ArrowLeft size={16} /> {t("affiliateApply.back")}
        </Link>
      </div>
    </div>
  );
}
