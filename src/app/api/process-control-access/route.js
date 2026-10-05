import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

const COOKIE_NAME = "annvi_process_control";
const TOKEN_MESSAGE = "annvi-process-control-access-v1";

function configuredPassword() {
  return String(process.env.PROCESS_CONTROL_PASSWORD || "");
}

function expectedToken(password) {
  return createHmac("sha256", password).update(TOKEN_MESSAGE).digest("hex");
}

function tokenMatches(token, password) {
  if (!token || !password) return false;
  const expected = expectedToken(password);
  const a = Buffer.from(String(token));
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request) {
  const password = configuredPassword();
  if (!password) {
    return NextResponse.json(
      { ok: false, error: "Process Control password is not configured on the server." },
      { status: 500 }
    );
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const granted = tokenMatches(token, password);
  return NextResponse.json({ ok: granted }, { status: granted ? 200 : 401 });
}

export async function POST(request) {
  const password = configuredPassword();
  if (!password) {
    return NextResponse.json(
      { ok: false, error: "Process Control password is not configured on the server." },
      { status: 500 }
    );
  }

  const body = await request.json().catch(() => ({}));
  if (String(body?.password || "") !== password) {
    return NextResponse.json({ ok: false, error: "Incorrect password." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, expectedToken(password), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 30,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
