import GoogleProvider from "next-auth/providers/google";
import type { NextAuthOptions } from "next-auth";
import jwt from "jsonwebtoken";

interface GoogleIdToken {
  email?: string;
  email_verified?: boolean;
  hd?: string;
  name?: string;
  picture?: string;
  sub?: string;
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        url: "https://accounts.google.com/o/oauth2/v2/auth",
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile",
          hd: "platform9.com",
        },
      },
    }),
  ],
  pages: {
    signIn: "/auth",
  },
  callbacks: {
    async signIn({ account }) {
      const allowedDomain = "platform9.com";

      if (account?.id_token) {
        const decoded = jwt.decode(account.id_token) as GoogleIdToken;
        const userEmail = decoded?.email;
        console.log("🔍 signIn decoded email:", userEmail);

        if (userEmail && userEmail.endsWith(`@${allowedDomain}`)) {
          return true;
        }
      }

      console.warn("❌ Rejected login attempt");
      return false;
    },

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
};
