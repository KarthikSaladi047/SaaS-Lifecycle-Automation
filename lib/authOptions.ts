import GoogleProvider from "next-auth/providers/google";
import type { NextAuthOptions } from "next-auth";
import jwt from "jsonwebtoken";
import { GoogleIdToken } from "@/app/types/pcd";

export const authOptions: NextAuthOptions = {
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
    async signIn({ account }) {
      const allowedDomain = "platform9.com";

      if (account?.id_token) {
        const decoded = jwt.decode(account.id_token) as GoogleIdToken;
        const userEmail = decoded?.email;
        if (userEmail && userEmail.endsWith(`@${allowedDomain}`)) {
          return true;
        }
      }
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
    maxAge: 60 * 60,
    updateAge: 0,
  },
  secret: process.env.NEXTAUTH_SECRET,
};
