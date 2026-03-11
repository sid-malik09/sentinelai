import { NextRequest, NextResponse } from "next/server";

/**
 * Verifies that a cron request is authorized.
 * In production, Vercel sends a Bearer token matching CRON_SECRET.
 * In development, we allow unauthenticated requests.
 */
export function verifyCronAuth(request: NextRequest): NextResponse | null {
  // Allow unauthenticated in development
  if (process.env.NODE_ENV === "development") return null;

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
