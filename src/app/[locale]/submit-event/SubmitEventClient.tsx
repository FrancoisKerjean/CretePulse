"use client";

import { useState, useRef } from "react";
import { CalendarDays, MapPin, Clock, Mail, FileText, Send, CheckCircle, AlertCircle } from "lucide-react";

type FormState = "idle" | "submitting" | "success" | "error";

interface FormValues {
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  email: string;
  website: string; // honeypot — hidden from real users
}

const INITIAL: FormValues = {
  title: "",
  date: "",
  time: "",
  location: "",
  description: "",
  email: "",
  website: "",
};

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-text">
        {label}
        {required && <span className="text-terra ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-text placeholder:text-text-light outline-none focus:border-aegean focus:ring-2 focus:ring-aegean/20 transition-colors";

export function SubmitEventClient() {
  const [values, setValues] = useState<FormValues>(INITIAL);
  const [state, setState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const formRef = useRef<HTMLFormElement>(null);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/submit-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: values.title,
          date: values.date,
          time: values.time || undefined,
          location: values.location,
          description: values.description || undefined,
          email: values.email || undefined,
          website: values.website, // honeypot
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setErrorMsg(data.error ?? "Submission failed. Please try again.");
        setState("error");
        return;
      }

      setState("success");
      setValues(INITIAL);
    } catch {
      setErrorMsg("Network error. Please check your connection.");
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <main className="min-h-screen bg-surface flex items-center justify-center px-4">
        <div className="bg-white border border-border rounded-2xl p-10 max-w-md w-full text-center shadow-sm">
          <div className="flex justify-center mb-5">
            <div className="bg-aegean-faint rounded-full p-4">
              <CheckCircle className="size-8 text-aegean" />
            </div>
          </div>
          <h1 className="text-2xl font-semibold text-text mb-3">
            Event submitted!
          </h1>
          <p className="text-text-muted leading-relaxed mb-7">
            Thank you. Our team will review your event and publish it shortly.
            Events typically appear within 24 hours.
          </p>
          <button
            onClick={() => setState("idle")}
            className="inline-flex items-center justify-center px-6 py-2.5 bg-aegean text-white font-medium rounded-lg hover:bg-aegean-light transition-colors"
          >
            Submit another event
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface py-16 px-4">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-terra-faint text-terra text-xs font-semibold px-3 py-1 rounded-full mb-4 uppercase tracking-wide">
            <CalendarDays className="size-3.5" />
            Community
          </div>
          <h1 className="text-3xl font-semibold text-text mb-2">
            Submit an event
          </h1>
          <p className="text-text-muted leading-relaxed">
            Know about a festival, market, concert or village celebration in
            Crete? Share it with the community. All submissions are reviewed
            before publishing.
          </p>
        </div>

        {/* Form */}
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="bg-white border border-border rounded-2xl p-7 shadow-sm flex flex-col gap-5"
          noValidate
        >
          {/* Honeypot — hidden from humans, bots fill it */}
          <div className="hidden" aria-hidden="true">
            <input
              type="text"
              name="website"
              value={values.website}
              onChange={handleChange}
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          <Field label="Event title" required>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-light pointer-events-none" />
              <input
                type="text"
                name="title"
                value={values.title}
                onChange={handleChange}
                placeholder="e.g. Siteia Sultana Grape Festival"
                required
                maxLength={200}
                className={`${inputClass} pl-10`}
              />
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Date" required>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-light pointer-events-none" />
                <input
                  type="date"
                  name="date"
                  value={values.date}
                  onChange={handleChange}
                  required
                  className={`${inputClass} pl-10`}
                />
              </div>
            </Field>

            <Field label="Time (optional)">
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-light pointer-events-none" />
                <input
                  type="time"
                  name="time"
                  value={values.time}
                  onChange={handleChange}
                  className={`${inputClass} pl-10`}
                />
              </div>
            </Field>
          </div>

          <Field label="Location" required>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-light pointer-events-none" />
              <input
                type="text"
                name="location"
                value={values.location}
                onChange={handleChange}
                placeholder="e.g. Agios Nikolaos town square"
                required
                maxLength={200}
                className={`${inputClass} pl-10`}
              />
            </div>
          </Field>

          <Field label="Description (optional)">
            <textarea
              name="description"
              value={values.description}
              onChange={handleChange}
              placeholder="What happens at this event? Who is it for?"
              rows={4}
              maxLength={2000}
              className={`${inputClass} resize-none`}
            />
            {values.description.length > 0 && (
              <span className="text-xs text-text-light text-right">
                {values.description.length}/2000
              </span>
            )}
          </Field>

          <Field label="Your email (optional)">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-light pointer-events-none" />
              <input
                type="email"
                name="email"
                value={values.email}
                onChange={handleChange}
                placeholder="we may contact you for details"
                className={`${inputClass} pl-10`}
              />
            </div>
          </Field>

          {/* Error banner */}
          {state === "error" && (
            <div className="flex items-start gap-2.5 bg-terra-faint border border-terra/20 text-terra rounded-lg px-4 py-3 text-sm">
              <AlertCircle className="size-4 mt-0.5 shrink-0" />
              {errorMsg}
            </div>
          )}

          {/* Note */}
          <p className="text-xs text-text-light leading-relaxed">
            By submitting, you confirm this event takes place in Crete and the
            information is accurate to the best of your knowledge.
          </p>

          <button
            type="submit"
            disabled={state === "submitting"}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-aegean text-white font-medium rounded-lg hover:bg-aegean-light transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {state === "submitting" ? (
              <>
                <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="size-4" />
                Submit event
              </>
            )}
          </button>
        </form>

        {/* Footer note */}
        <p className="mt-5 text-center text-xs text-text-light">
          Events are reviewed by the Crete Direct team before appearing on the site.
        </p>
      </div>
    </main>
  );
}
