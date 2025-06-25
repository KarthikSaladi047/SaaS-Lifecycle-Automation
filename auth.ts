import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import type { NextAuthOptions } from "next-auth";

export const config = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/auth",
  },
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string | undefined;
      session.user.id = token.sub;
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 60,
    updateAge: 0,
  },
  secret: process.env.NEXTAUTH_SECRET,
} satisfies NextAuthOptions;

export const { handlers, auth, signIn, signOut } = NextAuth(config);
