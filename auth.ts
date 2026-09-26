import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { getDatabase } from "@/lib/db";
import { findAuthorizedUser } from "@/lib/access-lookup";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 8,
  },
  pages: {
    signIn: "/",
    error: "/acesso-negado",
  },
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return false;

      const email = profile?.email;
      if (typeof email !== "string" || profile?.email_verified !== true) {
        return false;
      }

      const user = await findAuthorizedUser(email);
      if (user?.active) return true;

      const sql = getDatabase();
      await sql`
        INSERT INTO access_attempts (email, reason)
        VALUES (${email.toLowerCase()}, 'not_authorized')
      `;

      return false;
    },
  },
});