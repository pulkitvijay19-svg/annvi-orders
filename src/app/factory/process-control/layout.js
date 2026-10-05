import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_NAME = "annvi_process_control";
const TOKEN_MESSAGE = "annvi-process-control-access-v1";

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

export default async function ProcessControlLayout({ children }) {
  const password = String(process.env.PROCESS_CONTROL_PASSWORD || "");
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!password || !tokenMatches(token, password)) {
    redirect("/?manufacturingCorrection=locked");
  }

  return children;
}
