import { NextResponse } from "next/server";

export async function GET(request) {
  const granted = request.cookies.get("annvi_process_control")?.value === "granted";
  return NextResponse.json({ ok: granted }, { status: granted ? 200 : 401 });
}

export async function POST(request) {
  const configuredPassword = process.env.PROCESS_CONTROL_PASSWORD;
  if (!configuredPassword) return NextResponse.json({ ok: false, error: "Process Control password is not configured on the server." }, { status: 500 });
  const body = await request.json().catch(() => ({}));
  if (String(body?.password || "") !== configuredPassword) return NextResponse.json({ ok: false, error: "Incorrect password." }, { status: 401 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set("annvi_process_control", "granted", { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 30 });
  return response;
}
