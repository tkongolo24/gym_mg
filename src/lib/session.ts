import { getIronSession, IronSession } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  isLoggedIn: boolean;
  email?: string;
}

if (!process.env.SESSION_SECRET) {
  throw new Error("Missing env var: SESSION_SECRET");
}
if (!process.env.DATABASE_URL) {
  throw new Error("Missing env var: DATABASE_URL");
}

const sessionOptions = {
  password: process.env.SESSION_SECRET,
  cookieName: "gymos_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export async function requireAuth(): Promise<SessionData> {
  const session = await getSession();
  if (!session.isLoggedIn) {
    throw new Error("Unauthorized");
  }
  return session;
}
