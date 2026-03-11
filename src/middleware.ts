export { auth as middleware } from "@/lib/auth";

export const config = {
  // Protect page routes only — exclude ALL API routes, login, and static assets.
  // API routes are either public or use their own auth (cron uses CRON_SECRET).
  matcher: [
    "/((?!api|login|_next/static|_next/image|favicon.ico).*)",
  ],
};
