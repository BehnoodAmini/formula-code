"use client";

import { useRef, useState } from "react";
import { useSectionSpy } from "@/lib/hooks";
import { SITE } from "@/lib/siteConfig";
import styles from "./Contact.module.css";

type Phase = "idle" | "sending" | "sent" | "failed";

export default function Contact() {
  const section = useRef<HTMLElement>(null);
  useSectionSpy("contact", section);

  const [phase, setPhase] = useState<Phase>("idle");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [topError, setTopError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    // client-side pass first — mirror of the server rules
    const errors: Record<string, string> = {};
    if (String(data.name ?? "").trim().length < 2) errors.name = "Name should be at least 2 characters.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(data.email ?? ""))) errors.email = "That email doesn't look right.";
    if (String(data.message ?? "").trim().length < 10) errors.message = "Give me at least 10 characters to work with.";
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setPhase("sending");
    setTopError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        if (json.errors) setFieldErrors(json.errors);
        setTopError(json.error ?? "The pit wall didn't copy. Check the fields and retry.");
        setPhase("failed");
        return;
      }
      setPhase("sent");
    } catch {
      setTopError("Radio failure — network unreachable. Try again.");
      setPhase("failed");
    }
  }

  return (
    <section id="contact" ref={section} className={styles.section} aria-label="Contact">
      <div className={styles.inner}>
        <div>
          <p className="eyebrow">SECTION 05 — BOX BOX</p>
          <h2 className="sectionTitle">Open the Radio</h2>
          <p className={styles.lede}>
            Have a seat to fill, a gnarly performance problem, or a product that needs to
            ship? Send a message — it lands directly with me, not a CRM.
          </p>
          <p className={styles.radio}>
            RESPONSE TIME <b>&lt; 24H</b> · TIMEZONE <b>{SITE.location.toUpperCase()}</b>
            <br />
            OR EMAIL DIRECT: <b>{SITE.email}</b>
          </p>
        </div>

        {phase === "sent" ? (
          <div className={`${styles.form} ${styles.success}`} role="status">
            <div className={styles.successFlag} aria-hidden="true" />
            <h3 className={styles.successTitle}>Message received — box box.</h3>
            <p className={styles.successBody}>
              Your message is on my pit wall. Expect a reply within a day. In the
              meantime, the garage downstairs is open for another lap.
            </p>
          </div>
        ) : (
          <form className={styles.form} onSubmit={onSubmit} noValidate>
            {topError && (
              <p className={styles.formError} role="alert">
                {topError}
              </p>
            )}
            <div className={styles.field}>
              <label className={styles.label} htmlFor="c-name">
                NAME / TEAM
              </label>
              <input id="c-name" name="name" className={styles.input} autoComplete="name" required />
              <span className={styles.error}>{fieldErrors.name ?? ""}</span>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="c-email">
                EMAIL
              </label>
              <input
                id="c-email"
                name="email"
                type="email"
                className={styles.input}
                autoComplete="email"
                required
              />
              <span className={styles.error}>{fieldErrors.email ?? ""}</span>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="c-message">
                MESSAGE
              </label>
              <textarea id="c-message" name="message" className={styles.textarea} required />
              <span className={styles.error}>{fieldErrors.message ?? ""}</span>
            </div>
            {/* honeypot — hidden from real users, tempting for bots */}
            <div className={styles.honeypot} aria-hidden="true">
              <label htmlFor="c-fax">Fax</label>
              <input id="c-fax" name="fax" tabIndex={-1} autoComplete="off" />
            </div>
            <button type="submit" className={styles.send} disabled={phase === "sending"}>
              {phase === "sending" ? "TRANSMITTING…" : "SEND IT"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
