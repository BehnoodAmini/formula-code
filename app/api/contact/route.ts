import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";
import { readJson, writeJson, rateLimit } from "@/server/storage";

interface Message {
  name: string;
  email: string;
  message: string;
  date: string;
}

const FILE = "messages.json";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const resend = new Resend(process.env.RESEND_API_KEY);
const CONTACT_TO = process.env.CONTACT_TO_EMAIL;

/**
 * Stores messages in server/data/messages.json (durable even if the email
 * leg below fails), then forwards a copy via Resend using the shared
 * onboarding@resend.dev sender — no verified domain needed since this only
 * ever sends to the site owner's own inbox.
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(`contact:${ip}`, 5, 60_000)) {
    return NextResponse.json({ ok: false, error: "Too many messages — try again in a minute." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const { name, email, message, fax } = (body ?? {}) as Record<string, unknown>;

  // honeypot: real users never fill this — pretend success for bots
  if (typeof fax === "string" && fax.length > 0) {
    return NextResponse.json({ ok: true });
  }

  const errors: Record<string, string> = {};
  if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 80) {
    errors.name = "Name should be 2–80 characters.";
  }
  if (typeof email !== "string" || !EMAIL_RE.test(email.trim()) || email.length > 200) {
    errors.email = "That email doesn't look right.";
  }
  if (typeof message !== "string" || message.trim().length < 10 || message.trim().length > 4000) {
    errors.message = "Message should be 10–4000 characters.";
  }
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ ok: false, errors }, { status: 422 });
  }

  const entry: Message = {
    name: (name as string).trim(),
    email: (email as string).trim(),
    message: (message as string).trim(),
    date: new Date().toISOString(),
  };

  const all = await readJson<Message[]>(FILE, []);
  all.push(entry);
  await writeJson(FILE, all);

  if (process.env.RESEND_API_KEY && CONTACT_TO) {
    const { error } = await resend.emails.send({
      from: "Formula Code <onboarding@resend.dev>",
      to: [CONTACT_TO],
      subject: `New message from ${entry.name}`,
      text: entry.message,
      replyTo: entry.email,
    });
    if (error) console.error("Resend send failed:", error);
  }

  return NextResponse.json({ ok: true });
}
