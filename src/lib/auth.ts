import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(getDb()),
  providers: [
    // GitHub OAuth — needs GITHUB_ID and GITHUB_SECRET env vars
    GitHub,
    // Google OAuth — needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env vars
    Google,
    // Demo credentials provider for development/testing
    Credentials({
      name: "Demo Login",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "demo@sentinelai.app" },
      },
      async authorize(credentials) {
        if (process.env.NODE_ENV === "production") {
          return null; // Disabled in production
        }

        const email = credentials?.email as string;
        if (!email) return null;

        const db = getDb();
        const existing = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (existing.length > 0) {
          return {
            id: existing[0].id,
            email: existing[0].email,
            name: existing[0].name,
          };
        }

        // Auto-create user in dev
        const [newUser] = await db
          .insert(users)
          .values({ email, name: email.split("@")[0] })
          .returning();

        return {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth: session, request }) {
      const isLoggedIn = !!session?.user;
      const isOnLogin = request.nextUrl.pathname.startsWith("/login");

      if (isOnLogin) {
        // Redirect logged-in users away from login page
        if (isLoggedIn) return Response.redirect(new URL("/", request.url));
        return true;
      }

      // Protect all other routes
      return isLoggedIn;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
