import NextAuth from "next-auth";
import { authOptions } from "@/lib/authOptions";

// Create the handler with NextAuth
const handler = NextAuth(authOptions);

// App Router requires you to export HTTP methods
export { handler as GET, handler as POST };
