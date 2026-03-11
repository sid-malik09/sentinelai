export { auth as middleware } from "@/lib/auth";

export const config = {
  // Protect all routes except login, api/auth, static files, and api/cron
  matcher: [
    "/((?!login|api/auth|api/cron|_next/static|_next/image|favicon.ico).*)",
  ],
};
